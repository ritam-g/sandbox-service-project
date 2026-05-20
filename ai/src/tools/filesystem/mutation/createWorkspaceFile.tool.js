/**
 * PURPOSE:
 * Define the file-creation tool for new workspace files.
 * WHY THIS EXISTS:
 * New file creation is distinct from file updates and should have explicit semantics.
 * WHEN TO USE:
 * Use this when the agent needs to create a brand new file.
 * SCALABILITY BENEFIT:
 * File creation remains isolated from update semantics and can evolve independently.
 * FUTURE EXTENSION:
 * Add naming policy, template selection, or approval logic here later.
 *
 * Scalability note: creation tools should not be mixed with write tools.
 * Security note: creation is the right layer for enforcing file-path policies.
 * Performance note: explicit creation semantics reduce ambiguity in the agent loop.
 */
import { createMutationTool } from "../factories/index.js";

/**
 * PURPOSE:
 * Create a workspace file.
 * WHY THIS EXISTS:
 * The agent needs a dedicated path for brand-new files so it does not overwrite existing ones accidentally.
 * WHEN TO USE:
 * Use this when the target file does not already exist.
 * ARCHITECTURAL PURPOSE:
 * Separate creation semantics from editing semantics.
 */
export const createWorkspaceFile = createMutationTool({
    name: "create_workspace_file",
    description: "Create a workspace file.",
    routePath: "/create",
    fixedType: "file"
});
