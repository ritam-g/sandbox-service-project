/**
 * PURPOSE:
 * Normalize tool payloads into request-ready query and mutation objects.
 * WHY THIS EXISTS:
 * Payload shaping belongs between validation and transport so both layers stay focused.
 * WHEN TO USE:
 * Use these helpers after Zod parsing but before the HTTP request is built.
 * SCALABILITY BENEFIT:
 * Shared payload normalization keeps new routes consistent with existing ones.
 * FUTURE EXTENSION:
 * Add request metadata, workspace tenancy fields, or audit headers here later.
 *
 * Scalability note: payload normalization should not know how the request is sent.
 * Security note: strict payload shaping prevents ambiguous writes.
 * Performance note: pre-shaped payloads simplify the transport layer.
 */
import { MUTATION_PATH_ERROR, workspaceMutationSchema } from "../schemas/index.js";
import { normalizePathInput } from "./path.utils.js";

/**
 * PURPOSE:
 * Convert parsed query tool input into the canonical query payload shape.
 * WHY THIS EXISTS:
 * Query routes should receive one normalized object regardless of how input was written.
 * WHEN TO USE:
 * Use this for read and list tools before calling the transport layer.
 * INPUTS:
 * - parsed tool input
 * OUTPUTS:
 * - object with a normalized `path` array
 * ARCHITECTURAL PURPOSE:
 * Keep query payload preparation separate from validation and HTTP transport.
 *
 * @param {Object} [payload={}] Parsed query tool input.
 * @returns {{path: string[]}} Normalized query payload.
 */
export function normalizeQueryPayload(payload = {}) {
    return {
        path: normalizePathInput(payload.path)
    };
}

/**
 * PURPOSE:
 * Convert parsed mutation input into a safe, request-ready body.
 * WHY THIS EXISTS:
 * Mutation routes need a single target path and controlled metadata before writing.
 * WHEN TO USE:
 * Use this for file writes, file creation, and directory creation.
 * INPUTS:
 * - parsed tool input
 * - optional fixed resource type
 * OUTPUTS:
 * - normalized mutation body ready for POST transport
 * ARCHITECTURAL PURPOSE:
 * Enforce write semantics before any network call is attempted.
 *
 * @param {Object} [payload={}] Parsed mutation tool input.
 * @param {"file"|"directory"|null} [fixedType=null] Optional fixed resource type.
 * @returns {Object} Normalized request body.
 * @throws {Error} If the mutation is missing a path, has multiple paths, or violates the fixed type.
 */
export function normalizeMutationPayload(payload = {}, fixedType = null) {
    const {
        path,
        content = "",
        overwrite = false,
        type
    } = workspaceMutationSchema.parse(payload);
    const paths = normalizePathInput(path);

    if (paths.length === 0) {
        throw new Error("Missing path");
    }

    if (paths.length > 1) {
        throw new Error(MUTATION_PATH_ERROR);
    }

    if (fixedType && type && type !== fixedType) {
        throw new Error(`Type must be ${fixedType}`);
    }

    const body = {
        path: paths[0],
        content,
        overwrite
    };

    if (fixedType) {
        body.type = fixedType;
    } else if (type) {
        body.type = type;
    }

    return body;
}
