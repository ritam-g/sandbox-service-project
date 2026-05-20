/**
 * PURPOSE:
 * Expose the transport layer through a single stable import surface.
 * WHY THIS EXISTS:
 * Tool factories and agents should not import transport internals directly.
 * WHEN TO USE:
 * Import this barrel from factory and orchestration layers.
 * SCALABILITY BENEFIT:
 * Future auth, retry, and telemetry changes can stay behind one module boundary.
 * FUTURE EXTENSION:
 * Add transport clients, headers, or observability wrappers here.
 *
 * Scalability note: transport should remain a single dependency edge.
 * Security note: future auth and secrets handling should stay behind this boundary.
 * Performance note: shared transport imports keep runtime overhead minimal.
 */
export * from "./filesystem.service.js";
