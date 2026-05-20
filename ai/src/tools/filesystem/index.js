/**
 * PURPOSE:
 * Expose the full filesystem tool architecture through one stable entrypoint.
 * WHY THIS EXISTS:
 * Agents should depend on one barrel instead of many low-level implementation files.
 * WHEN TO USE:
 * Import this module from AI orchestration code and compatibility shims.
 * SCALABILITY BENEFIT:
 * The filesystem layer can evolve internally without changing consumer imports.
 * FUTURE EXTENSION:
 * Add feature flags, telemetry wrappers, or route registries here later.
 *
 * Scalability note: this is the public dependency boundary for filesystem tools.
 * Security note: future auth, rate limiting, and audit behavior should be inserted below this layer.
 * Performance note: barrel modules keep import shape clean without increasing runtime work.
 */
import { readWorkspaceFiles, listWorkspaceEntries, listWorkspaceTree, readFilesAlias } from "./query/index.js";
import { writeWorkspaceFile, createWorkspaceFile, createWorkspaceDirectory } from "./mutation/index.js";

export * from "./schemas/index.js";
export * from "./utils/index.js";
export * from "./services/index.js";
export * from "./factories/index.js";
export * from "./query/index.js";
export * from "./mutation/index.js";

/**
 * PURPOSE:
 * Provide a canonical ordered list of every filesystem tool.
 * WHY THIS EXISTS:
 * Agent creation should consume a single list instead of assembling tools manually.
 * WHEN TO USE:
 * Use this when wiring the filesystem capability set into an AI agent.
 * SCALABILITY BENEFIT:
 * Adding a new tool only requires updating this registry.
 * FUTURE EXTENSION:
 * Split tools into capability groups, feature flags, or workspace-scoped registries later.
 */
export const filesystemQueryTools = [
    readWorkspaceFiles,
    listWorkspaceEntries,
    listWorkspaceTree,
    readFilesAlias
];

/**
 * PURPOSE:
 * Provide a canonical ordered list of all mutation tools.
 * WHY THIS EXISTS:
 * Write-capable tools should be grouped separately from read-only tools for clarity.
 * WHEN TO USE:
 * Use this when an agent needs the mutation surface only.
 * SCALABILITY BENEFIT:
 * Capability grouping makes future policy enforcement easier.
 * FUTURE EXTENSION:
 * Add granular permissions or approval states per mutation tool later.
 */
export const filesystemMutationTools = [
    writeWorkspaceFile,
    createWorkspaceFile,
    createWorkspaceDirectory
];

/**
 * PURPOSE:
 * Provide the full filesystem tool registry in execution order.
 * WHY THIS EXISTS:
 * The agent should receive one authoritative tool array.
 * WHEN TO USE:
 * Use this from model orchestration code.
 * SCALABILITY BENEFIT:
 * Tool registration stays centralized and easy to review.
 * FUTURE EXTENSION:
 * Add capability-specific registries or workspace-specific tool bundles later.
 */
export const filesystemTools = [
    ...filesystemQueryTools,
    ...filesystemMutationTools
];
