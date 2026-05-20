/**
 * PURPOSE:
 * Define the primary read tool for workspace file inspection.
 * WHY THIS EXISTS:
 * Read access is the most common filesystem capability and deserves its own declarative module.
 * WHEN TO USE:
 * Import this tool when the agent needs to inspect one or more workspace files.
 * SCALABILITY BENEFIT:
 * Tool metadata stays isolated from execution and validation code.
 * FUTURE EXTENSION:
 * Add read-variant metadata or route-specific observability here later.
 *
 * Scalability note: keep declarative tool registration separate from implementation details.
 * Security note: read tools are a distinct capability class from mutation tools.
 * Performance note: read tools should remain thin wrappers over shared factories.
 */
import { workspaceReadSchema } from "../schemas/index.js";
import { createQueryTool } from "../factories/index.js";

/**
 * PURPOSE:
 * Read one or more files from the workspace.
 * WHY THIS EXISTS:
 * The agent must inspect existing code before making modifications.
 * WHEN TO USE:
 * Use this tool whenever the model needs to understand file contents.
 * ARCHITECTURAL PURPOSE:
 * Provide a stable, named entrypoint for the agent's read-before-write workflow.
 */
export const readWorkspaceFiles = createQueryTool({
    name: "read_workspace_files",
    description: "Read one or more files from the workspace.",
    routePath: "/read",
    schema: workspaceReadSchema
});
