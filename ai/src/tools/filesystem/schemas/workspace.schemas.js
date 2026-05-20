/**
 * PURPOSE:
 * Centralize workspace path and payload schemas for all filesystem tools.
 * WHY THIS EXISTS:
 * Validation should be owned by a dedicated layer so transport and agent logic stay simple.
 * WHEN TO USE:
 * Import these schemas whenever a tool needs to validate workspace-relative paths or mutation payloads.
 * SCALABILITY BENEFIT:
 * New routes can reuse the same schema contracts without duplicating validation logic.
 * FUTURE EXTENSION:
 * Add multi-workspace rules, path whitelists, or stricter route-specific schemas here.
 *
 * Scalability note: schema changes should stay isolated from request execution.
 * Security note: validate malformed input before any remote filesystem call.
 * Performance note: rejecting bad shapes early avoids unnecessary network round trips.
 */
import * as z from "zod";

/**
 * PURPOSE:
 * Provide a stable error message when a mutation tool receives more than one path.
 * WHY THIS EXISTS:
 * Mutation routes must target a single filesystem entry to avoid ambiguous writes.
 * WHEN TO USE:
 * Import this constant in normalization code that enforces single-path mutation behavior.
 * SCALABILITY BENEFIT:
 * Shared error text keeps logs and agent reasoning consistent across mutation tools.
 * FUTURE EXTENSION:
 * Replace this with route-specific error detail if new mutation types are introduced.
 */
export const MUTATION_PATH_ERROR = "Mutation tools accept exactly one path";

/**
 * PURPOSE:
 * Validate a single workspace-relative path or a list of paths.
 * WHY THIS EXISTS:
 * Every filesystem route depends on the same canonical path shape.
 * WHEN TO USE:
 * Use this for query and mutation schemas that accept either one path or many paths.
 * SCALABILITY BENEFIT:
 * One schema definition can serve all current and future path-aware tools.
 * FUTURE EXTENSION:
 * Add refinements for absolute-path rejection, tenancy rules, or workspace scoping.
 */
export const workspacePathSchema = z.union([z.string(), z.array(z.string())]);

/**
 * PURPOSE:
 * Represent an optional workspace path used by list-style query tools.
 * WHY THIS EXISTS:
 * Some discovery routes support no path at all, while others accept one or many.
 * WHEN TO USE:
 * Use this for optional path-based listing and discovery tools.
 * SCALABILITY BENEFIT:
 * Lets route contracts stay consistent while remaining flexible.
 * FUTURE EXTENSION:
 * Add `.min(1)` semantics or route-specific constraints if required later.
 */
export const workspaceOptionalPathSchema = workspacePathSchema.optional();

/**
 * PURPOSE:
 * Validate read routes that require at least one path.
 * WHY THIS EXISTS:
 * Read operations need an explicit target so the agent cannot issue ambiguous reads.
 * WHEN TO USE:
 * Use this for tools that must read one or more files directly.
 * SCALABILITY BENEFIT:
 * Keeps the read contract explicit as the toolset expands.
 * FUTURE EXTENSION:
 * Add route-level constraints for binary reads or content-type specific paths.
 */
export const workspaceReadSchema = z.object({
    path: workspacePathSchema.describe("Workspace-relative path or paths")
});

/**
 * PURPOSE:
 * Validate listing and discovery routes where the path is optional.
 * WHY THIS EXISTS:
 * Directory exploration may start from a root listing or from a specific subtree.
 * WHEN TO USE:
 * Use this for folder discovery and optional listing routes.
 * SCALABILITY BENEFIT:
 * Supports both broad and targeted filesystem discovery without separate schemas.
 * FUTURE EXTENSION:
 * Add pagination or depth controls when directory trees become large.
 */
export const workspaceQuerySchema = z.object({
    path: workspaceOptionalPathSchema.describe("Workspace-relative path or paths")
});

/**
 * PURPOSE:
 * Validate write and create routes that need content, overwrite, and optional type metadata.
 * WHY THIS EXISTS:
 * Mutation routes must carry enough information to create or update filesystem state safely.
 * WHEN TO USE:
 * Use this for file writes and resource creation.
 * SCALABILITY BENEFIT:
 * Shared mutation validation keeps all write-capable routes consistent.
 * FUTURE EXTENSION:
 * Add checksum, ownership, or audit metadata fields without touching transport code.
 */
export const workspaceMutationSchema = z.object({
    path: workspacePathSchema.describe("Workspace-relative path or paths"),
    content: z.string().default(""),
    overwrite: z.boolean().default(false),
    type: z.enum(["file", "directory"]).optional().describe("Resource type")
});
