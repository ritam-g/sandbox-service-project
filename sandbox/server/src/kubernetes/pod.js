/**
 * Sandbox pod orchestration layer.
 * Creates preview + agent containers with shared workspace volume.
 * Monitors pod readiness before returning to client.
 */

import { k8sCoreV1Api } from "./config.js";

const namespace = "default";

/**
 * @description Returns Kubernetes labels for sandbox pod discovery.
 * Used by services to find pods via label selector.
 */
function sandboxLabels(sandboxId) {
    return {
        app: "sandbox-instance",
        sandboxId
    };
}

/**
 * @description Creates Kubernetes pod for sandbox instance.
 * @param {string} sandboxId Unique sandbox identifier
 * @returns {Promise<string>} Pod name (sandbox-pod-{id})
 */
export async function createPod(sandboxId) {
    const podName = `sandbox-pod-${sandboxId}`;

    const podManifest = createSandboxPodManifest(sandboxId, podName);

    await k8sCoreV1Api.createNamespacedPod({
        namespace,
        body: podManifest
    });

    return podName;
}

/**
 * @description Builds complete pod manifest with init container + sidecars.
 * Init container copies template files to shared volume.
 * Vite container runs on :5173, agent container on :3000.
 * @param {string} sandboxId Sandbox UUID
 * @param {string} [podName] Pod name
 * @returns {Object} Kubernetes pod manifest
 */
export function createSandboxPodManifest(sandboxId, podName = `sandbox-pod-${sandboxId}`) {
    return {
        metadata: {
            name: podName,
            labels: sandboxLabels(sandboxId)
        },
        spec: {
            volumes: [
                {
                    name: "workspace-volume",
                    emptyDir: {}
                }
            ],
            initContainers: [
                {
                    name: "copy-template",
                    image: "template:latest",
                    imagePullPolicy: "Never",
                    command: ["sh", "-ec"],
                    args: [`
set -eu
mkdir -p /workspace/src /workspace/public
cp -r /app/src/. /workspace/src/
cp /app/index.html /workspace/index.html
cp /app/vite.config.js /workspace/vite.config.js
if [ -d /app/public ]; then
    cp -r /app/public/. /workspace/public/ 2>/dev/null || true
fi
                    `],
                    volumeMounts: [
                        {
                            name: "workspace-volume",
                            mountPath: "/workspace"
                        }
                    ]
                }
            ],
            containers: [
                {
                    name: "sandbox-preview",
                    image: "template:latest",
                    imagePullPolicy: "Never",
                    workingDir: "/app",
                    command: ["npm"],
                    args: ["run", "dev", "--", "--host", "0.0.0.0"],
                    env: [
                        {
                            name: "VITE_BASE",
                            value: `/preview/${sandboxId}/`
                        },
                        {
                            name: "CHOKIDAR_USEPOLLING",
                            value: "true"
                        },
                        {
                            name: "CHOKIDAR_INTERVAL",
                            value: "100"
                        }
                    ],
                    ports: [
                        {
                            containerPort: 5173,
                            name: "preview-http"
                        }
                    ],
                    startupProbe: {
                        httpGet: {
                            path: `/preview/${sandboxId}/`,
                            port: "preview-http"
                        },
                        failureThreshold: 30,
                        periodSeconds: 2,
                        timeoutSeconds: 2
                    },
                    readinessProbe: {
                        httpGet: {
                            path: `/preview/${sandboxId}/`,
                            port: "preview-http"
                        },
                        failureThreshold: 3,
                        periodSeconds: 2,
                        timeoutSeconds: 2
                    },
                    resources: {
                        limits: {
                            memory: "256Mi",
                            cpu: "250m"
                        },
                        requests: {
                            memory: "128Mi",
                            cpu: "100m"
                        }
                    },
                    volumeMounts: [
                        {
                            name: "workspace-volume",
                            mountPath: "/app/index.html",
                            subPath: "index.html"
                        },
                        {
                            name: "workspace-volume",
                            mountPath: "/app/vite.config.js",
                            subPath: "vite.config.js"
                        },
                        {
                            name: "workspace-volume",
                            mountPath: "/app/src",
                            subPath: "src"
                        },
                        {
                            name: "workspace-volume",
                            mountPath: "/app/public",
                            subPath: "public"
                        }
                    ]
                },
                {
                    name: "agent",
                    image: "agent:latest",
                    imagePullPolicy: "Never",
                    workingDir: "/workspace",
                    command: ["node"],
                    args: ["/app/server.js"],
                    env: [
                        {
                            name: "WORKSPACE_DIR",
                            value: "/workspace"
                        }
                    ],
                    ports: [
                        {
                            containerPort: 3000,
                            name: "agent-http"
                        }
                    ],
                    startupProbe: {
                        httpGet: {
                            path: "/",
                            port: "agent-http"
                        },
                        failureThreshold: 30,
                        periodSeconds: 2,
                        timeoutSeconds: 2
                    },
                    readinessProbe: {
                        httpGet: {
                            path: "/",
                            port: "agent-http"
                        },
                        failureThreshold: 3,
                        periodSeconds: 2,
                        timeoutSeconds: 2
                    },
                    resources: {
                        limits: {
                            memory: "256Mi",
                            cpu: "250m"
                        },
                        requests: {
                            memory: "128Mi",
                            cpu: "100m"
                        }
                    },
                    volumeMounts: [
                        {
                            name: "workspace-volume",
                            mountPath: "/workspace"
                        }
                    ]
                }
            ]
        }
    };
}

/**
 * @description Polls pod status until Ready condition is True.
 * Detects init container failures and pod phase failures.
 * @param {string} podName Pod to monitor
 * @param {number} [timeoutMs=120000] Max wait time (milliseconds)
 * @throws {Error} If pod fails or timeout exceeded
 */
export async function waitForPodReady(podName, timeoutMs = 120000) {
    const startedAt = Date.now();

    while (true) {
        /**
         * Read complete pod status from API.
         * Includes phase, conditions, container statuses.
         */
        const pod = await k8sCoreV1Api.readNamespacedPodStatus({
            name: podName,
            namespace
        });

        /**
         * Failure detection: Pod phase.
         * "Failed" means pod exceeded retry policy.
         */
        if (pod.status?.phase === "Failed") {
            throw new Error(`Sandbox pod ${podName} failed to start`);
        }

        /**
         * Failure detection: Init container.
         * Non-zero exit code indicates template copy failed.
         */
        const failedInitContainer = pod.status?.initContainerStatuses?.find(status => (
            status.state?.terminated && status.state.terminated.exitCode !== 0
        ));

        if (failedInitContainer) {
            throw new Error(`Init container ${failedInitContainer.name} failed for ${podName}`);
        }

        /**
         * Success detection: Ready condition.
         * Pod is ready when both containers passed readiness probes.
         */
        const readyCondition = pod.status?.conditions?.find(
            condition => condition.type === "Ready"
        );

        if (readyCondition?.status === "True") {
            break;
        }

        if (Date.now() - startedAt > timeoutMs) {
            throw new Error(`Timed out waiting for sandbox pod ${podName} to become ready`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
