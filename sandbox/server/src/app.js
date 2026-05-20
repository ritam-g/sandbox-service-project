/**
 * Sandbox Service - Pod Orchestration API.
 * Handles pod and service lifecycle for sandbox preview environments.
 * Exposes /api/sandbox/start endpoint for creating new sandboxes.
 */

import express from 'express';
import morgan from 'morgan';

import { createPod, waitForPodReady } from './kubernetes/pod.js';
import { createSandboxServices } from './kubernetes/service.js';

import { v7 as uuid } from 'uuid';

const app = express();

app.use(morgan('dev'));

/**
 * @route GET /api/sandbox/health
 * @description Readiness/liveness probe for orchestration service.
 */
app.get('/api/sandbox/health', (req, res) => {
    res.json({
        status: 'ok'
    });
});

/**
 * @route POST /api/sandbox/start
 * @description Creates new sandbox pod with preview + agent containers.
 * Returns sandboxId, pod name, service names, and preview URL.
 * Blocks until pod is Ready (both containers passed probes).
 */
app.post('/api/sandbox/start', async (req, res) => {

    try {

        /**
         * Step 1: Generate unique sandbox identifier.
         * UUID v7 for sortable, collision-free naming.
         */
        const sandboxId = uuid();

        /**
         * Step 2: Create pod with init container + sidecars.
         * Pod transitions to Pending, actual startup is async.
         */
        const podName = await createPod(sandboxId);

        /**
         * Step 3: Create preview + agent services in parallel.
         * Services create endpoints when pod becomes Ready.
         */
        await createSandboxServices(sandboxId);

        /**
         * Step 4: Wait for pod readiness.
         * Blocks until startup probes pass, then readiness probes pass.
         * Timeout: 120s (Vite bundling can take time).
         */
        await waitForPodReady(podName);

        /**
         * Step 5: Return connection info to client.
         * Client opens browser to previewUrl.
         */
        return res.status(200).json({
            message: 'Sandbox started',
            sandboxId,
            podName,
            previewService: `sandbox-service-${sandboxId}`,
            agentService: `agent-service-${sandboxId}`,
            previewUrl: `/preview/${sandboxId}/`
        });

    } catch (error) {

        /**
         * Error handling.
         * Logs full error, returns generic message to client.
         */
        console.error(error);

        return res.status(500).json({
            error: error.message
        });
    }
});

export default app;
