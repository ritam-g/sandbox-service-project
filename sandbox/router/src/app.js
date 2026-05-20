/**
 * Router Service - Stateful preview proxy.
 * Routes /preview/* requests to correct sandbox pod.
 * Maintains proxy cache per sandboxId.
 * Supports WebSocket for Vite HMR hot reload.
 */

import express from "express";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

/**
 * Proxy cache: sandboxId → proxy middleware.
 * Avoids recreating proxies for repeated requests.
 */
const previewProxies = new Map();

/**
 * Kubernetes DNS-subdomain validation.
 * Lowercase, hyphens, max 63 chars.
 */
const sandboxIdPattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

app.use(morgan("dev"));

/**
 * @route GET /api/status/healthz
 * @description Liveness probe endpoint.
 */
app.get("/api/status/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

/**
 * @route GET /api/status/readyz
 * @description Readiness probe endpoint.
 */
app.get("/api/status/readyz", (req, res) => {
    res.status(200).json({ status: "ready" });
});

/**
 * @description Validates sandboxId format and length.
 * Prevents DNS name injection and path traversal.
 * @param {string} sandboxId Sandbox identifier
 * @returns {boolean} Valid if matches Kubernetes rules
 */
function isValidSandboxId(sandboxId) {
    return sandboxId.length <= 63 && sandboxIdPattern.test(sandboxId);
}

/**
 * @description Extracts sandboxId from /preview/{sandboxId}/* URL.
 * Validates format using Kubernetes DNS rules.
 * @param {string} url Request URL
 * @returns {string|null} SandboxId if valid, null otherwise
 */
function getSandboxIdFromPreviewUrl(url) {
    const { pathname } = new URL(url, "http://router.local");
    const [, previewPrefix, sandboxId] = pathname.split("/");

    if (previewPrefix !== "preview" || !sandboxId || !isValidSandboxId(sandboxId)) {
        return null;
    }

    return sandboxId;
}

/**
 * @description Gets or creates proxy middleware for sandbox.
 * Caches proxies to avoid recreation overhead.
 * Target: http://sandbox-service-{sandboxId}:80/preview/{sandboxId}
 * @param {string} sandboxId Sandbox identifier
 * @returns {Function} Express proxy middleware
 */
function getPreviewProxy(sandboxId) {
    if (!previewProxies.has(sandboxId)) {
        const target = `http://sandbox-service-${sandboxId}:80/preview/${sandboxId}`;

        previewProxies.set(sandboxId, createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
            xfwd: true,
            on: {
                error(error, req, res) {
                    /**
                     * Proxy error handler.
                     * Pod unreachable, timeout, connection closed.
                     * Respond with 502 Bad Gateway.
                     */
                    console.error("preview proxy error:", error.message);

                    if (res?.writeHead && !res.headersSent) {
                        res.writeHead(502, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            error: "preview proxy error",
                            message: error.message
                        }));
                    }
                }
            }
        }));
    }

    return previewProxies.get(sandboxId);
}

/**
 * @description Handles WebSocket upgrade for Vite HMR hot reload.
 * Validates sandboxId and delegates to proxy middleware.
 * @param {http.IncomingMessage} req Upgrade request
 * @param {net.Socket} socket Raw socket connection
 * @param {Buffer} head First data chunk
 */
export function handlePreviewUpgrade(req, socket, head) {
    const sandboxId = getSandboxIdFromPreviewUrl(req.url);

    if (!sandboxId) {
        socket.destroy();
        return;
    }

    getPreviewProxy(sandboxId).upgrade(req, socket, head);
}

/**
 * @route GET /preview/:sandboxId/*
 * @description Routes preview traffic through proxy to pod.
 * Validates sandboxId, redirects to trailing slash, proxies request.
 */
app.use("/preview/:sandboxId", (req, res, next) => {
    const { sandboxId } = req.params;

    /**
     * Validate sandboxId format.
     * Reject invalid IDs immediately.
     */
    if (!isValidSandboxId(sandboxId)) {
        return res.status(400).json({ error: "Invalid sandbox id" });
    }

    /**
     * Redirect to trailing slash.
     * Ensures Vite gets expected path format.
     */
    if (req.originalUrl === `/preview/${sandboxId}`) {
        return res.redirect(308, `/preview/${sandboxId}/`);
    }

    /**
     * Route through proxy to sandbox pod.
     */
    return getPreviewProxy(sandboxId)(req, res, next);
});

export default app;
