/**
 * PURPOSE:
 * Group all query-side filesystem tools behind one import surface.
 * WHY THIS EXISTS:
 * Query tools are read-only capabilities and should be easy to import as a bundle.
 * WHEN TO USE:
 * Import this barrel from agent orchestration code or compatibility shims.
 * SCALABILITY BENEFIT:
 * New query tools can be registered without changing the consumer API.
 * FUTURE EXTENSION:
 * Add query-level tool sets, namespaces, or feature flags here later.
 *
 * Scalability note: query tools are a separate capability class from mutation tools.
 * Security note: read-only tool grouping simplifies policy review.
 * Performance note: grouped exports do not increase runtime overhead.
 */
import { readWorkspaceFiles } from "./readWorkspaceFiles.tool.js";
import { listWorkspaceEntries } from "./listWorkspaceEntries.tool.js";
import { listWorkspaceTree } from "./listWorkspaceTree.tool.js";
import { readFilesAlias } from "./readFilesAlias.tool.js";

export {
    readWorkspaceFiles,
    listWorkspaceEntries,
    listWorkspaceTree,
    readFilesAlias
};
