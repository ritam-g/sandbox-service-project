/**
 * PURPOSE:
 * Preserve the legacy agent entrypoint while delegating to the new modular agent stack.
 * WHY THIS EXISTS:
 * Existing imports can keep using `code.agent.js` while the implementation moves to a scalable layout.
 * WHEN TO USE:
 * Import this file from older runtime or test code that still expects the legacy module path.
 * SCALABILITY BENEFIT:
 * The implementation can evolve without forcing consumers to change immediately.
 * FUTURE EXTENSION:
 * Deprecate this shim later once all call sites switch to the new agent module.
 *
 * Scalability note: compatibility shims are useful during architecture migrations.
 * Security note: the shim exposes only the same public contract as the new agent stack.
 * Performance note: re-exports add no meaningful runtime overhead.
 */
export { SYSTEM_PROMPT } from "./systemPrompt.js";
export { agent, createFilesystemAgent } from "./filesystem.agent.js";
export { createFilesystemModel } from "./filesystem.model.js";
