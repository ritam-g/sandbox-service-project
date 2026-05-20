/**
 * Kubernetes service factory.
 * Creates ClusterIP services for pod traffic routing.
 * One service for preview (port 80→5173).
 * One service for agent API (port 3000→3000).
 */

import { k8sCoreV1Api } from "./config.js";

const namespace = "default";

/**
 * @description Returns Kubernetes labels for service selector.
 * Used to route traffic to specific sandbox pod.
 */
function sandboxLabels(sandboxId) {
    return {
        app: "sandbox-instance",
        sandboxId
    };
}

/**
 * @description Builds Kubernetes Service manifest.
 * ClusterIP service routes traffic to pod endpoints.
 */
function createServiceManifest({ name, sandboxId, ports }) {
    return {
        metadata: {
            name,
            labels: sandboxLabels(sandboxId)
        },
        spec: {
            selector: sandboxLabels(sandboxId),
            ports,
            type: "ClusterIP"
        }
    };
}

/**
 * @description Creates ClusterIP service for Vite preview.
 * Routes traffic from service:80 to pod:5173.
 * @param {string} sandboxId Sandbox UUID
 * @returns {Promise<Object>} Kubernetes Service object
 */
export async function createPreviewService(sandboxId) {
    const serviceManifest = createServiceManifest({
        name: `sandbox-service-${sandboxId}`,
        sandboxId,
        ports: [
            {
                port: 80,
                targetPort: 5173,
                protocol: "TCP",
                name: "preview-http"
            }
        ]
    });

    return k8sCoreV1Api.createNamespacedService({
        namespace,
        body: serviceManifest
    });
}

/**
 * @description Creates ClusterIP service for agent filesystem API.
 * Routes traffic from service:3000 to pod:3000.
 * @param {string} sandboxId Sandbox UUID
 * @returns {Promise<Object>} Kubernetes Service object
 */
export async function createAgentService(sandboxId) {
    const serviceManifest = createServiceManifest({
        name: `agent-service-${sandboxId}`,
        sandboxId,
        ports: [
            {
                port: 3000,
                targetPort: 3000,
                protocol: "TCP",
                name: "agent-http"
            }
        ]
    });

    return k8sCoreV1Api.createNamespacedService({
        namespace,
        body: serviceManifest
    });
}

/**
 * @description Creates both services in parallel.
 * Preview and agent services for sandbox pod.
 * @param {string} sandboxId Sandbox UUID
 * @returns {Promise<Object>} Objects with previewService and agentService
 */
export async function createSandboxServices(sandboxId) {
    const [previewService, agentService] = await Promise.all([
        createPreviewService(sandboxId),
        createAgentService(sandboxId)
    ]);

    return {
        previewService,
        agentService
    };
}
