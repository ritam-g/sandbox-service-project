/**
 * Agent Service - Workspace Filesystem API.
 * Runs as sidecar in sandbox pod.
 * Provides REST API for file operations on shared workspace volume.
 * Mounted at /workspace, shared with Vite container via subpath mounts.
 */

import express from "express";
import morgan from "morgan";
import fs from "node:fs/promises";
import path from "node:path";

const app = express();
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/workspace";
const WORKSPACE_ROOT = path.resolve(WORKSPACE_DIR);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

/**
 * @description Normalizes and validates file paths.
 * Prevents path traversal attacks (../ escapes).
 * All paths must stay inside /workspace.
 * @param {string} requestedPath Path from request (can be absolute or relative)
 * @returns {string} Absolute path inside /workspace
 * @throws {Error} If path escapes workspace or is absolute
 */
function resolveWorkspacePath(requestedPath = ".") {
    const rawPath = String(requestedPath || ".").replaceAll("\\", "/");
    const targetPath = path.isAbsolute(rawPath)
        ? path.normalize(rawPath)
        : path.resolve(WORKSPACE_ROOT, rawPath);
    const relativePath = path.relative(WORKSPACE_ROOT, targetPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        const error = new Error("Path must stay inside /workspace");
        error.statusCode = 400;
        throw error;
    }

    return targetPath;
}

/**
 * @description Converts absolute path to workspace-relative path.
 * Used for response payloads (expose relative paths only).
 * @param {string} absolutePath Absolute file path
 * @returns {string} Relative path from /workspace (forward slashes)
 */
function toWorkspacePath(absolutePath) {
    const relativePath = path.relative(WORKSPACE_ROOT, absolutePath);

    if (!relativePath) {
        return ".";
    }

    return relativePath.split(path.sep).join("/");
}

/**
 * @description Marks errors as 404 if file/directory not found (ENOENT).
 * @param {Error} error File system error
 * @param {string} message Custom message for not-found errors
 * @returns {Error} Error with statusCode set
 */
function markMissingPath(error, message) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
        error.statusCode = 404;
        error.message = message;
    }

    return error;
}

/**
 * @description Normalizes query path input into a flat array.
 * Supports strings, arrays, repeated params, and comma-separated values.
 * @param {string|string[]|Object|undefined} queryValue Query input or request query object
 * @returns {string[]} Normalized path segments
 */
function normalizeQueryPaths(queryValue) {
    const rawValues = [];

    const collect = value => {
        if (value === undefined || value === null) {
            return;
        }

        if (Array.isArray(value)) {
            rawValues.push(...value);
            return;
        }

        rawValues.push(value);
    };

    if (queryValue && typeof queryValue === "object" && !Array.isArray(queryValue)) {
        collect(queryValue.path);
        collect(queryValue["path[]"]);
    } else {
        collect(queryValue);
    }

    return rawValues
        .flatMap(value => String(value).split(","))
        .map(segment => segment.trim())
        .filter(Boolean);
}

/**
 * @description Reads metadata for a workspace path without following symlink directories.
 * @param {string} absolutePath Absolute path inside the workspace
 * @param {string} [entryName] Display name for the entry
 * @returns {Promise<Object|null>} Entry metadata with directory flag or null if missing
 */
async function readPathMetadata(absolutePath, entryName) {
    let stats;

    try {
        stats = await fs.lstat(absolutePath);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return null;
        }

        throw error;
    }

    const isDirectory = stats.isDirectory();

    return {
        node: {
            name: entryName ?? (toWorkspacePath(absolutePath) === "." ? "." : path.basename(absolutePath)),
            path: toWorkspacePath(absolutePath),
            type: isDirectory ? "directory" : "file",
            size: stats.size,
            updatedAt: stats.mtime.toISOString()
        },
        isDirectory
    };
}

/**
 * @description Builds file/directory entry metadata.
 * Used in directory listings.
 * @param {string} parentPath Parent directory path
 * @param {fs.Dirent} entry File system entry
 * @returns {Promise<Object|null>} Entry metadata or null if missing
 */
async function describeEntry(parentPath, entry) {
    const absolutePath = path.join(parentPath, entry.name);
    const metadata = await readPathMetadata(absolutePath, entry.name);

    return metadata?.node ?? null;
}

/**
 * @description Recursively builds a file tree for a workspace path.
 * Skips paths that disappear during traversal.
 * @param {string} targetPath Absolute path inside the workspace
 * @param {Array<Object>} [errors=[]] Accumulates skipped path errors
 * @returns {Promise<Object|null>} File tree node or null if missing
 */
async function buildFileTree(targetPath, errors = []) {
    const metadata = await readPathMetadata(targetPath);

    if (!metadata) {
        errors.push({
            path: toWorkspacePath(targetPath),
            error: "Path not found",
            statusCode: 404
        });

        return null;
    }

    if (!metadata.isDirectory) {
        return metadata.node;
    }

    let entries;

    try {
        entries = await fs.readdir(targetPath, { withFileTypes: true });
    } catch (error) {
        if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
            errors.push({
                path: toWorkspacePath(targetPath),
                error: "Directory not found",
                statusCode: 404
            });

            return null;
        }

        throw error;
    }

    const children = [];

    for (const entry of entries) {
        const childPath = path.join(targetPath, entry.name);

        try {
            const childNode = await buildFileTree(childPath, errors);

            if (childNode) {
                children.push(childNode);
            }
        } catch (error) {
            errors.push({
                path: toWorkspacePath(childPath),
                error: error.message,
                statusCode: error.statusCode || 500
            });
        }
    }

    return {
        ...metadata.node,
        children
    };
}

/**
 * @description Reads a workspace file and returns file content.
 * @param {string} targetPath Absolute path inside the workspace
 * @returns {Promise<Object>} File result payload
 * @throws {Error} If the path is missing or not a file
 */
async function readWorkspaceFile(targetPath) {
    const metadata = await readPathMetadata(targetPath);

    if (!metadata) {
        const error = new Error("File not found");
        error.statusCode = 404;
        throw error;
    }

    if (metadata.isDirectory) {
        const error = new Error("Path must be a file");
        error.statusCode = 400;
        throw error;
    }

    let content;

    try {
        content = await fs.readFile(targetPath, "utf8");
    } catch (error) {
        if (error?.code === "EISDIR") {
            const pathError = new Error("Path must be a file");
            pathError.statusCode = 400;
            throw pathError;
        }

        throw markMissingPath(error, "File not found");
    }

    return {
        path: metadata.node.path,
        content
    };
}

/**
 * @description Recursively lists every top-level entry in the workspace.
 * @param {Array<Object>} [errors=[]] Accumulates skipped path errors
 * @returns {Promise<Array<Object>>} Nested file tree for the workspace root
 */
async function listWorkspaceFiles(errors = []) {
    let entries;

    try {
        entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
    } catch (error) {
        throw markMissingPath(error, "Directory not found");
    }

    const files = [];
    const results = await Promise.all(entries.map(async entry => {
        const absolutePath = path.join(WORKSPACE_ROOT, entry.name);

        try {
            return await buildFileTree(absolutePath, errors);
        } catch (error) {
            errors.push({
                path: toWorkspacePath(absolutePath),
                error: error.message,
                statusCode: error.statusCode || 500
            });

            return null;
        }
    }));

    for (const file of results) {
        if (file) {
            files.push(file);
        }
    }

    return files;
}

/**
 * @description Resolves one or more workspace paths into structured results.
 * @param {string|string[]|Object|undefined} requestedQuery Query input from request
 * @param {(absolutePath: string, errors: Array<Object>) => Promise<Object|null>} loadEntry Path loader
 * @param {Object} [options] Collector options
 * @param {boolean} [options.defaultToRoot=false] Uses the workspace root listing when no path is provided
 * @param {(errors: Array<Object>) => Promise<Array<Object>>} [options.rootLoader] Loader for empty queries
 * @param {string} [options.missingPathMessage="Missing path query parameter"] Error message for empty read queries
 * @returns {Promise<{results: Array<Object>, errors: Array<Object>}>} Structured query response
 */
async function collectWorkspacePaths(requestedQuery, loadEntry, options = {}) {
    const {
        defaultToRoot = false,
        rootLoader = null,
        missingPathMessage = "Missing path query parameter"
    } = options;
    const requestedPaths = normalizeQueryPaths(requestedQuery);
    const errors = [];
    const results = [];
    const seenPaths = new Set();

    if (requestedPaths.length === 0) {
        if (defaultToRoot && rootLoader) {
            return {
                results: await rootLoader(errors),
                errors
            };
        }

        return {
            results,
            errors: [{
                path: ".",
                error: missingPathMessage,
                statusCode: 400
            }]
        };
    }

    for (const requestedPath of requestedPaths) {
        try {
            const absolutePath = resolveWorkspacePath(requestedPath);
            const entry = await loadEntry(absolutePath, errors);

            if (entry && !seenPaths.has(entry.path)) {
                seenPaths.add(entry.path);
                results.push(entry);
            }
        } catch (error) {
            errors.push({
                path: requestedPath,
                error: error.message,
                statusCode: error.statusCode || 500
            });
        }
    }

    return {
        results,
        errors
    };
}

/**
 * @description Returns the recursive workspace tree response.
 * @param {string|string[]|Object|undefined} requestedQuery Query input from request
 * @returns {Promise<Object>} Files array and skipped errors
 */
async function listWorkspaceTree(requestedQuery) {
    return listFiles(requestedQuery);
}

/**
 * @description Sends standardized error response.
 * Logs error, responds with appropriate status code.
 * @param {Error} error Error object (may have statusCode property)
 * @param {Object} res Express response object
 */
function handleError(error, res) {
    console.error(error);

    return res.status(error.statusCode || 500).json({
        error: error.message
    });
}

/**
 * @description Lists one or more workspace paths.
 * Supports comma-separated files and recursive directory trees.
 * @param {Object} requestedQuery Workspace query object
 * @returns {Promise<Object>} Object with files and skipped path errors
 */
async function listFiles(requestedQuery) {
    const { results, errors } = await collectWorkspacePaths(
        requestedQuery,
        async (absolutePath, workspaceErrors) => buildFileTree(absolutePath, workspaceErrors),
        {
            defaultToRoot: true,
            rootLoader: async workspaceErrors => listWorkspaceFiles(workspaceErrors)
        }
    );

    return {
        files: results,
        errors
    };
}

/**
 * @description Reads one or more workspace files.
 * @param {Object} requestedQuery Workspace query object
 * @returns {Promise<Object>} Object with results and skipped path errors
 */
async function readFiles(requestedQuery) {
    const { results, errors } = await collectWorkspacePaths(
        requestedQuery,
        async (absolutePath) => readWorkspaceFile(absolutePath),
        {
            missingPathMessage: "Missing path query parameter"
        }
    );

    return {
        results,
        errors
    };
}

/**
 * @description Chooses the HTTP status code for a multi-path response.
 * @param {Array<Object>} items Successful response items
 * @param {Array<Object>} errors Skipped path errors
 * @returns {number} HTTP status code
 */
function getMultiPathStatusCode(items, errors) {
    if (items.length > 0 || errors.length === 0) {
        return 200;
    }

    if (errors.some(error => error.statusCode === 400)) {
        return 400;
    }

    if (errors.some(error => error.statusCode === 404)) {
        return 404;
    }

    return errors[0]?.statusCode || 500;
}

/**
 * @route GET /
 * @description Readiness/liveness probe and info endpoint.
 * Returns workspace directory configured for this agent.
 */
app.get("/", (req, res) => {
    return res.status(200).json({
        status: "ok",
        workspace: WORKSPACE_DIR
    });
});

/**
 * @route GET /files
 * @description Lists one or more workspace paths.
 * @query {string|string[]} path Comma-separated, repeated, or array-style workspace paths (defaults to root)
 * @returns {Object} Recursive file trees with skipped path errors
 */
app.get("/files", async (req, res) => {
    try {
        const result = await listFiles(req.query);

        return res.status(getMultiPathStatusCode(result.files, result.errors)).json(result);
    } catch (error) {
        return handleError(error, res);
    }
});

/**
 * @route GET /read
 * @description Reads file content as UTF-8 text.
 * @query {string|string[]} path Workspace-relative file path or paths
 * @returns {Object} File results and skipped path errors
 */
app.get("/read", async (req, res) => {
    try {
        const result = await readFiles(req.query);

        return res.status(getMultiPathStatusCode(result.results, result.errors)).json(result);
    } catch (error) {
        return handleError(error, res);
    }
});

/**
 * @route POST /write
 * @description Writes file content, creating parents if needed.
 * Overwrites existing files.
 * @body {string} path Workspace-relative file path
 * @body {string} content File content
 * @returns {Object} Written file path
 */
app.post("/write", async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const { path: requestedPath, content = "" } = body;

        if (!requestedPath) {
            return res.status(400).json({ error: "Missing path in request body" });
        }

        const filePath = resolveWorkspacePath(requestedPath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, String(content), "utf8");

        return res.status(200).json({
            message: "File written",
            path: toWorkspacePath(filePath)
        });
    } catch (error) {
        return handleError(error, res);
    }
});

/**
 * @route POST /create
 * @description Creates file or directory.
 * @body {string} path Workspace-relative path
 * @body {string} [type="file"] "file" or "directory"
 * @body {string} [content=""] File content (for files)
 * @body {boolean} [overwrite=false] Overwrite existing file
 * @returns {Object} Created resource path
 * @throws {Error} 409 if file exists and overwrite=false
 */
app.post("/create", async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const {
            path: requestedPath,
            type = "file",
            content = "",
            overwrite = false
        } = body;

        if (!requestedPath) {
            return res.status(400).json({ error: "Missing path in request body" });
        }

        if (!["file", "directory"].includes(type)) {
            return res.status(400).json({ error: "Type must be file or directory" });
        }

        const targetPath = resolveWorkspacePath(requestedPath);

        if (type === "directory") {
            await fs.mkdir(targetPath, { recursive: true });
        } else {
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.writeFile(targetPath, String(content), {
                encoding: "utf8",
                flag: overwrite ? "w" : "wx"
            });
        }

        return res.status(201).json({
            message: `${type === "directory" ? "Directory" : "File"} created`,
            path: toWorkspacePath(targetPath)
        });
    } catch (error) {
        if (error.code === "EEXIST") {
            error.statusCode = 409;
            error.message = "Path already exists";
        }

        return handleError(error, res);
    }
});

/**
 * @route GET /read-files
 * @description Alias for /files endpoint.
 * @query {string|string[]} path Workspace-relative path or paths
 */
app.get("/read-files", async (req, res) => {
    try {
        const result = await listFiles(req.query);

        return res.status(getMultiPathStatusCode(result.files, result.errors)).json(result);
    } catch (error) {
        return handleError(error, res);
    }
});

/**  
 * @description Recursively returns the workspace tree and supports optional path filters.
 */
app.get("/list-files", async (req, res) => {
    try {
        const result = await listWorkspaceTree(req.query);

        return res.status(getMultiPathStatusCode(result.files, result.errors)).json(result);
    } catch (error) {
        return handleError(error, res);
    }
});
export default app;
