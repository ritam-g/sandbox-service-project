/**
 * PURPOSE:
 * Define the primary file-write tool for workspace updates.
 * WHY THIS EXISTS:
 * Updating files is a core mutation capability and should be isolated from read logic.
 * WHEN TO USE:
 * Use this when the agent needs to update or overwrite an existing file.
 * SCALABILITY BENEFIT:
 * Write behavior stays declarative and easy to extend later.
 * FUTURE EXTENSION:
 * Add diff-aware writes, audit metadata, or approval gates here later.
 *
 * Scalability note: mutation modules should stay separate from read-only modules.
 * Security note: writes are the correct place to add policy and auth enforcement later.
 * Performance note: a thin tool wrapper keeps write latency predictable.
 */
import { createMutationTool } from "../factories/index.js";

/**
 * PURPOSE:
 * Write content to a workspace file.
 * WHY THIS EXISTS:
 * The agent must be able to update existing source files after reading them.
 * WHEN TO USE:
 * Use this for edits, replacements, and file overwrite operations.
 * ARCHITECTURAL PURPOSE:
 * Provide a single stable entrypoint for file updates.
 */
export const writeWorkspaceFile = createMutationTool({
    name: "write_workspace_file",
    description: "Write content to a workspace file.",
    routePath: "/write"
});
