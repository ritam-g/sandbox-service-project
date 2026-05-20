/**
 * PURPOSE:
 * Own all filesystem transport concerns, including URL construction and HTTP execution.
 * WHY THIS EXISTS:
 * Request logic should be isolated from schema validation and tool registration.
 * WHEN TO USE:
 * Use this module whenever a filesystem route needs a real network call.
 * SCALABILITY BENEFIT:
 * Transport behavior can evolve independently for retries, auth, caching, or observability.
 * FUTURE EXTENSION:
 * Add retry policies, auth headers, structured logging, or tracing here later.
 *
 * Scalability note: transport is the correct layer for retries and network resilience.
 * Security note: auth tokens and service credentials should be injected here, not in tool files.
 * Performance note: a single HTTP client layer is easier to tune and monitor.
 */
import axios from "axios";
import { buildPathQuery } from "../utils/index.js";

/**
 * PURPOSE:
 * Define the filesystem service base URL with an environment override and a safe fallback.
 * WHY THIS EXISTS:
 * The agent must target the correct filesystem service in every environment.
 * WHEN TO USE:
 * Read this constant from transport code only.
 * SCALABILITY BENEFIT:
 * Environment-driven routing supports local, preview, and production deployments.
 * FUTURE EXTENSION:
 * Move this into a config provider or secret manager when multi-environment routing grows.
 */
export const FILE_SERVICE_BASE_URL =
    process.env.FILE_SERVICE_BASE_URL ||
    "https://shiny-space-capybara-wrp6pw9gwgj6hg5gr-4000.app.github.dev";

/**
 * PURPOSE:
 * Build a fully qualified URL for a filesystem route.
 * WHY THIS EXISTS:
 * Route path composition should be deterministic and shared across every tool.
 * WHEN TO USE:
 * Use this before making GET or POST requests to the filesystem service.
 * INPUTS:
 * - relative route path
 * - optional query payload
 * OUTPUTS:
 * - fully resolved request URL
 * ARCHITECTURAL PURPOSE:
 * Keep base URL handling and query serialization in the transport layer.
 *
 * @param {string} routePath Route path on the file service.
 * @param {Object} [query={}] Query payload.
 * @returns {string} Fully qualified request URL.
 */
export function buildUrl(routePath, query = {}) {
    const url = new URL(routePath, FILE_SERVICE_BASE_URL);
    const queryString = buildPathQuery(query.path);

    if (queryString) {
        url.search = queryString;
    }

    return url.toString();
}

/**
 * PURPOSE:
 * Execute a filesystem HTTP request and always return a serialized JSON payload.
 * WHY THIS EXISTS:
 * LangChain tool loops must receive structured text even when the remote service fails.
 * WHEN TO USE:
 * Use this as the final transport wrapper for all filesystem reads and writes.
 * INPUTS:
 * - HTTP method
 * - route path
 * - optional query payload
 * - optional request body
 * OUTPUTS:
 * - JSON string representing either the service response or a safe error object
 * ARCHITECTURAL PURPOSE:
 * Prevent transport failures from crashing the agent loop.
 *
 * @param {Object} request Request configuration.
 * @param {"get"|"post"} request.method HTTP method.
 * @param {string} request.routePath Service route path.
 * @param {Object} [request.query] Query payload.
 * @param {Object} [request.data] Request body.
 * @returns {Promise<string>} Serialized response data.
 */
export async function safeRequest({ method, routePath, query, data }) {
    try {
        const response = await axios.request({
            method,
            url: buildUrl(routePath, query),
            data,
            validateStatus: () => true
        });

        return JSON.stringify(response.data ?? null);
    } catch (error) {
        return JSON.stringify({
            error: error?.message || "Filesystem request failed",
            route: routePath
        });
    }
}
