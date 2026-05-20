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
    if (error?.code === "ENOENT") {
        error.statusCode = 404;
        error.message = message;
    }

    return error;
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
    let stats;

    try {
        stats = await fs.stat(absolutePath);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return null;
        }

        throw error;
    }

    return {
        name: entry.name,
        path: toWorkspacePath(absolutePath),
        type: entry.isDirectory() ? "directory" : "file",
        size: stats.size,
        updatedAt: stats.mtime.toISOString()
    };
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
 * @description Lists files and directories in given path.
 * Includes metadata: name, path, type, size, modified time.
 * @param {string} requestedPath Directory path (can be relative)
 * @returns {Promise<Object>} Object with path and files array
 * @throws {Error} If directory not found
 */
async function listFiles(requestedPath) {
    const directoryPath = resolveWorkspacePath(requestedPath);

    let entries;

    try {
        entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
        throw markMissingPath(error, "Directory not found");
    }

    const files = await Promise.all(entries.map(entry => describeEntry(directoryPath, entry)));

    return {
        path: toWorkspacePath(directoryPath),
        files: files.filter(Boolean)
    };
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
 * @description Lists files and directories at given path.
 * @query {string} path Workspace-relative path (defaults to root)
 * @returns {Object} Directory contents with metadata
 */
app.get("/files", async (req, res) => {
    try {
        return res.status(200).json(await listFiles(req.query.path));
    } catch (error) {
        return handleError(error, res);
    }
});

/**
 * @route GET /read
 * @description Reads file content as UTF-8 text.
 * @query {string} path Workspace-relative file path
 * @returns {Object} File path and content
 */
app.get("/read", async (req, res) => {
    try {
        if (!req.query.path) {
            return res.status(400).json({ error: "Missing path query parameter" });
        }

        const filePath = resolveWorkspacePath(req.query.path);
        let content;

        try {
            content = await fs.readFile(filePath, "utf8");
        } catch (error) {
            throw markMissingPath(error, "File not found");
        }

        return res.status(200).json({
            path: toWorkspacePath(filePath),
            content
        });
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
 * @query {string} path Workspace-relative path
 */
app.get("/read-files", async (req, res) => {
    try {
        return res.status(200).json(await listFiles(req.query.path));
    } catch (error) {
        return handleError(error, res);
    }
});

export default app;
