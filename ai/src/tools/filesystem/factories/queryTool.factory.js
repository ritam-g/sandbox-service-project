/**
 * PURPOSE:
 * Create GET-style filesystem tools with normalized query payloads.
 * WHY THIS EXISTS:
 * Read and list routes share a common execution pattern that should not be duplicated.
 * WHEN TO USE:
 * Use this for read-only or discovery routes that call the filesystem service with GET.
 * SCALABILITY BENEFIT:
 * Query tools stay consistent as new read/list routes are added.
 * FUTURE EXTENSION:
 * Add query-specific caching or observability without changing tool definitions.
 *
 * Scalability note: separating query tools from mutation tools improves clarity and safety.
 * Security note: read-only routes can be treated differently from write-capable routes later.
 * Performance note: GET tools can be optimized independently if caching is introduced.
 */
import { workspaceQuerySchema } from "../schemas/index.js";
import { normalizeQueryPayload } from "../utils/index.js";
import { safeRequest } from "../services/index.js";
import { createFilesystemTool } from "./filesystemTool.factory.js";

/**
 * PURPOSE:
 * Build a GET filesystem tool from route metadata.
 * WHY THIS EXISTS:
 * Route definitions should stay declarative while execution details live in shared factories.
 * WHEN TO USE:
 * Use this for listing, browsing, and read-only workspace routes.
 * INPUTS:
 * - tool metadata
 * - route path
 * - optional schema override
 * OUTPUTS:
 * - configured LangChain tool instance
 * ARCHITECTURAL PURPOSE:
 * Preserve a clean boundary between declarative tool registration and executable transport logic.
 *
 * @param {Object} options Tool options.
 * @param {string} options.name LangChain tool name.
 * @param {string} options.description Tool description.
 * @param {string} options.routePath Service route path.
 * @param {import("zod").ZodTypeAny} [options.schema=workspaceQuerySchema] Input schema.
 * @returns {ReturnType<typeof createFilesystemTool>} LangChain tool instance.
 */
export function createQueryTool({ name, description, routePath, schema = workspaceQuerySchema }) {
    return createFilesystemTool({
        name,
        description,
        schema,
        run: async input => safeRequest({
            method: "get",
            routePath,
            query: normalizeQueryPayload(input)
        })
    });
}
