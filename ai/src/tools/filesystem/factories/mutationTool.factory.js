/**
 * PURPOSE:
 * Create POST-style filesystem tools with normalized mutation payloads.
 * WHY THIS EXISTS:
 * Write and create routes share mutation semantics that should stay centralized.
 * WHEN TO USE:
 * Use this for file writes, file creation, and directory creation.
 * SCALABILITY BENEFIT:
 * Mutation behavior remains consistent as new write-capable routes are added.
 * FUTURE EXTENSION:
 * Add audit metadata, auth headers, or retry hooks in one place later.
 *
 * Scalability note: separating mutation tools prevents accidental write-path drift.
 * Security note: mutation tooling is the correct place to enforce future auth and policy checks.
 * Performance note: one mutation factory keeps write behavior predictable and easy to tune.
 */
import { workspaceMutationSchema } from "../schemas/index.js";
import { normalizeMutationPayload } from "../utils/index.js";
import { safeRequest } from "../services/index.js";
import { createFilesystemTool } from "./filesystemTool.factory.js";

/**
 * PURPOSE:
 * Build a POST filesystem tool from route metadata.
 * WHY THIS EXISTS:
 * Write-capable routes need a single reusable creation path to avoid duplicated logic.
 * WHEN TO USE:
 * Use this for writes, creates, and any future mutation-style route.
 * INPUTS:
 * - tool metadata
 * - route path
 * - optional fixed resource type
 * - optional schema override
 * OUTPUTS:
 * - configured LangChain tool instance
 * ARCHITECTURAL PURPOSE:
 * Keep mutation route semantics separate from read-only route semantics.
 *
 * @param {Object} options Tool options.
 * @param {string} options.name LangChain tool name.
 * @param {string} options.description Tool description.
 * @param {string} options.routePath Service route path.
 * @param {"file"|"directory"|null} [options.fixedType=null] Fixed resource type for create tools.
 * @param {import("zod").ZodTypeAny} [options.schema=workspaceMutationSchema] Input schema.
 * @returns {ReturnType<typeof createFilesystemTool>} LangChain tool instance.
 */
export function createMutationTool({
    name,
    description,
    routePath,
    fixedType = null,
    schema = workspaceMutationSchema
}) {
    return createFilesystemTool({
        name,
        description,
        schema,
        run: async input => safeRequest({
            method: "post",
            routePath,
            data: normalizeMutationPayload(input, fixedType)
        })
    });
}
