/**
 * PURPOSE:
 * Normalize path input into a deterministic structure and serialize repeated query parameters.
 * WHY THIS EXISTS:
 * Path handling is a reusable concern that should not live inside HTTP request code.
 * WHEN TO USE:
 * Use these helpers whenever tool input may contain strings, arrays, comma-separated values, or path[] semantics.
 * SCALABILITY BENEFIT:
 * Centralized path handling prevents subtle drift as more routes are added.
 * FUTURE EXTENSION:
 * Extend these helpers for workspace tenancy prefixes, permission-aware paths, or path sanitization policies.
 *
 * Scalability note: normalization should be isolated from transport and tool creation.
 * Security note: canonicalization reduces the chance of malformed or unexpected path shapes.
 * Performance note: deterministic parsing reduces downstream branching and retry cost.
 */

/**
 * PURPOSE:
 * Convert raw path input into a clean array of path strings.
 * WHY THIS EXISTS:
 * Different callers may supply one path, many paths, comma-separated paths, or query-object shapes.
 * WHEN TO USE:
 * Use this before building query strings or mutation payloads.
 * INPUTS:
 * - string
 * - string[]
 * - object with `path` or `path[]`
 * - undefined
 * OUTPUTS:
 * - string[] of trimmed, non-empty path values
 * ARCHITECTURAL PURPOSE:
 * Create one canonical path representation that every filesystem tool can rely on.
 *
 * @param {string|string[]|Object|undefined} pathInput Raw path value or query object.
 * @returns {string[]} Normalized list of workspace-relative paths.
 */
export function normalizePathInput(pathInput) {
    const rawValues = [];

    if (pathInput && typeof pathInput === "object" && !Array.isArray(pathInput)) {
        if (pathInput.path !== undefined && pathInput.path !== null) {
            if (Array.isArray(pathInput.path)) {
                rawValues.push(...pathInput.path);
            } else {
                rawValues.push(pathInput.path);
            }
        }

        if (pathInput["path[]"] !== undefined && pathInput["path[]"] !== null) {
            if (Array.isArray(pathInput["path[]"])) {
                rawValues.push(...pathInput["path[]"]);
            } else {
                rawValues.push(pathInput["path[]"]);
            }
        }
    } else if (pathInput !== undefined && pathInput !== null) {
        if (Array.isArray(pathInput)) {
            rawValues.push(...pathInput);
        } else {
            rawValues.push(pathInput);
        }
    }

    return rawValues
        .flatMap(value => String(value).split(","))
        .map(segment => segment.trim())
        .filter(Boolean);
}

/**
 * PURPOSE:
 * Serialize normalized path input into repeated query parameters.
 * WHY THIS EXISTS:
 * The filesystem service expects multi-path queries to be represented as repeated `path` parameters.
 * WHEN TO USE:
 * Use this for GET routes that forward path filters to the file service.
 * INPUTS:
 * - raw path-like data in any supported input shape
 * OUTPUTS:
 * - encoded query-string fragment or an empty string
 * ARCHITECTURAL PURPOSE:
 * Keep query-string generation deterministic and route-agnostic.
 *
 * @param {string|string[]|Object|undefined} pathInput Raw path value or query object.
 * @returns {string} Encoded query-string fragment.
 */
export function buildPathQuery(pathInput) {
    const paths = normalizePathInput(pathInput);
    const params = new URLSearchParams();

    for (const segment of paths) {
        params.append("path", segment);
    }

    return params.toString();
}
