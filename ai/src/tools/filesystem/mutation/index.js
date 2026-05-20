/**
 * PURPOSE:
 * Group all mutation-side filesystem tools behind one import surface.
 * WHY THIS EXISTS:
 * Mutation tools are write-capable and should be easy to import as a bundle.
 * WHEN TO USE:
 * Import this barrel from agent orchestration code or compatibility shims.
 * SCALABILITY BENEFIT:
 * New mutation tools can be registered without changing consumer imports.
 * FUTURE EXTENSION:
 * Add mutation-specific tool sets, policies, or feature flags here later.
 *
 * Scalability note: mutation tools should stay isolated from query tools.
 * Security note: this grouping makes write-capable access easy to audit.
 * Performance note: grouped exports do not add runtime cost.
 */
import { writeWorkspaceFile } from "./writeWorkspaceFile.tool.js";
import { createWorkspaceFile } from "./createWorkspaceFile.tool.js";
import { createWorkspaceDirectory } from "./createWorkspaceDirectory.tool.js";

export {
    writeWorkspaceFile,
    createWorkspaceFile,
    createWorkspaceDirectory
};
