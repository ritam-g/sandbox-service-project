/**
 * PURPOSE:
 * Provide a single import surface for filesystem tool factories.
 * WHY THIS EXISTS:
 * Agents and tool definitions should not depend on implementation file names.
 * WHEN TO USE:
 * Import these factories when declaring filesystem tools.
 * SCALABILITY BENEFIT:
 * The factory layer stays easy to extend as new abstractions are introduced.
 * FUTURE EXTENSION:
 * Add policy wrappers, telemetry wrappers, or rate-limit helpers here later.
 *
 * Scalability note: factories should stay one layer above transport and one layer below tool registration.
 * Security note: policy enforcement can be centralized here without touching route modules.
 * Performance note: keeping factory imports shallow reduces cognitive overhead, not runtime cost.
 */
export * from "./filesystemTool.factory.js";
export * from "./queryTool.factory.js";
export * from "./mutationTool.factory.js";
