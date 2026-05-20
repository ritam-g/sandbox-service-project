/**
 * PURPOSE:
 * Preserve the legacy tool entrypoint while delegating to the modular filesystem tool stack.
 * WHY THIS EXISTS:
 * Existing imports can keep using `agent.tool.js` during the architecture migration.
 * WHEN TO USE:
 * Import this file only for backward compatibility or temporary transition support.
 * SCALABILITY BENEFIT:
 * New code can depend on the structured tool tree while old code continues to work.
 * FUTURE EXTENSION:
 * Remove this shim once all consumers move to `src/tools/filesystem/index.js`.
 *
 * Scalability note: compatibility shims reduce migration risk.
 * Security note: the public tool contract remains the same as the modular implementation.
 * Performance note: re-export shims add negligible runtime cost.
 */
export * from "../tools/filesystem/index.js";
