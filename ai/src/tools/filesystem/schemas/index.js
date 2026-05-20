/**
 * PURPOSE:
 * Provide a single import surface for filesystem schemas.
 * WHY THIS EXISTS:
 * Consumers should not need to know individual schema file names.
 * WHEN TO USE:
 * Import this barrel from utilities, factories, and tool definitions.
 * SCALABILITY BENEFIT:
 * New schemas can be added without changing the public import shape.
 * FUTURE EXTENSION:
 * Expand this index with route-specific schema groups or tenancy-aware schema sets.
 *
 * Scalability note: barrel files keep dependency direction stable.
 * Security note: schema ownership stays centralized and reviewable.
 * Performance note: re-export-only modules do not add runtime cost.
 */
export * from "./workspace.schemas.js";
