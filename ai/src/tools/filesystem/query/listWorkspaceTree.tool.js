/**
 * PURPOSE:
 * Define the recursive workspace tree listing tool.
 * WHY THIS EXISTS:
 * Recursive listing gives the agent a broad structural understanding of the workspace.
 * WHEN TO USE:
 * Use this for architecture analysis, initial onboarding, or deep discovery.
 * SCALABILITY BENEFIT:
 * Recursive inspection stays isolated from regular file reads and writes.
 * FUTURE EXTENSION:
 * Add depth limits, filters, or cached tree snapshots here later.
 *
 * Scalability note: recursive discovery should remain distinct from point reads.
 * Security note: broad listing should still be read-only and policy-aware.
 * Performance note: recursive calls are more expensive, so isolating them helps future optimization.
 */
import { createQueryTool } from "../factories/index.js";

/**
 * PURPOSE:
 * Recursively list the workspace tree.
 * WHY THIS EXISTS:
 * The agent needs a full structural overview before making architecture-level changes.
 * WHEN TO USE:
 * Use this for deep repository discovery or project mapping.
 * ARCHITECTURAL PURPOSE:
 * Provide a dedicated recursive discovery tool instead of overloading simpler list routes.
 */
export const listWorkspaceTree = createQueryTool({
    name: "list_workspace_tree",
    description: "Recursively list the workspace tree.",
    routePath: "/list-files"
});
