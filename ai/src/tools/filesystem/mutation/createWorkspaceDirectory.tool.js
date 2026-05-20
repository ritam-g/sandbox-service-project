/**
 * PURPOSE:
 * Define the directory-creation tool for workspace structure.
 * WHY THIS EXISTS:
 * Directory creation has different semantics than file writes and should remain explicit.
 * WHEN TO USE:
 * Use this when the agent needs to create a folder hierarchy.
 * SCALABILITY BENEFIT:
 * Directory creation can evolve independently from file creation.
 * FUTURE EXTENSION:
 * Add recursive mkdir behavior, policy checks, or path guards here later.
 *
 * Scalability note: directory tools should remain separate from file tools.
 * Security note: folder creation is the right place for workspace boundary enforcement later.
 * Performance note: explicit directory creation avoids guessing behavior in the agent loop.
 */
import { createMutationTool } from "../factories/index.js";

/**
 * PURPOSE:
 * Create a workspace directory.
 * WHY THIS EXISTS:
 * The agent needs a dedicated route for folder creation instead of overloading file creation.
 * WHEN TO USE:
 * Use this when a directory must exist before files can be created inside it.
 * ARCHITECTURAL PURPOSE:
 * Keep directory lifecycle management explicit and maintainable.
 */
export const createWorkspaceDirectory = createMutationTool({
    name: "create_workspace_directory",
    description: "Create a workspace directory.",
    routePath: "/create",
    fixedType: "directory"
});
