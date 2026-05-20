import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";

const app = express();

const WORKING_DIR = "/workspace";

app.use(morgan("dev"));

app.use(express.json({
    limit: "10mb"
}));

app.use(express.urlencoded({
    extended: true
}));

/**
 * @description
 * Prevents path traversal attacks.
 * Example:
 * ../../etc/passwd
 */
function resolveSafePath(filePath = "") {
    const normalizedPath = path.normalize(filePath);
    const absolutePath = path.join(WORKING_DIR, normalizedPath);

    if (!absolutePath.startsWith(WORKING_DIR)) {
        throw new Error("Invalid file path");
    }

    return absolutePath;
}

/**
 * @route GET /
 * @description Health check route.
 */
app.get("/", (req, res) => {
    return res.status(200).json({
        status: "success",
        message: "Sandbox agent running"
    });
});

/**
 * @route GET /list-files
 * @description
 * Lists all files recursively from workspace.
 * Excludes heavy folders.
 *
 * Example:
 * /list-files
 */
app.get("/list-files", async (req, res) => {

    async function listFiles(dir, baseDir) {

        const entries = await fs.promises.readdir(dir, {
            withFileTypes: true
        });

        const files = [];

        for (const entry of entries) {

            const fullPath = path.join(dir, entry.name);

            const relativePath = path.relative(
                baseDir,
                fullPath
            );

            /**
             * Skip heavy folders.
             */
            if (
                entry.isDirectory() &&
                [
                    "node_modules",
                    ".git",
                    "dist",
                    "build",
                    ".next"
                ].includes(entry.name)
            ) {
                continue;
            }

            if (entry.isDirectory()) {

                const nestedFiles = await listFiles(
                    fullPath,
                    baseDir
                );

                files.push(...nestedFiles);

            } else {

                files.push(relativePath);
            }
        }

        return files;
    }

    try {

        const files = await listFiles(
            WORKING_DIR,
            WORKING_DIR
        );

        return res.status(200).json({
            status: "success",
            files
        });

    } catch (error) {

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

/**
 * @route GET /read-files
 * @description
 * Reads multiple files.
 *
 * Example:
 * /read-files?files=src/App.jsx,src/main.jsx
 */
app.get("/read-files", async (req, res) => {

    const files = req.query.files;

    if (!files) {
        return res.status(400).json({
            status: "error",
            message: "No files provided"
        });
    }

    const fileList = files
        .split(",")
        .map(file => file.trim())
        .filter(Boolean);

    try {

        const results = await Promise.all(
            fileList.map(async file => {

                try {

                    const filePath = resolveSafePath(file);

                    const content =
                        await fs.promises.readFile(
                            filePath,
                            "utf-8"
                        );

                    return {
                        file,
                        content
                    };

                } catch (error) {

                    return {
                        file,
                        error: error.message
                    };
                }
            })
        );

        return res.status(200).json({
            status: "success",
            results
        });

    } catch (error) {

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

/**
 * @route PATCH /update-files
 * @description
 * Updates existing files.
 *
 * Body:
 * {
 *   "updates": [
 *      {
 *          "file": "src/App.jsx",
 *          "content": "new code"
 *      }
 *   ]
 * }
 */
app.patch("/update-files", async (req, res) => {

    const updates = req.body.updates;

    if (!updates || !Array.isArray(updates)) {

        return res.status(400).json({
            status: "error",
            message: "Invalid updates payload"
        });
    }

    try {

        const results = await Promise.all(
            updates.map(async update => {

                const {
                    file,
                    content
                } = update;

                try {

                    const filePath =
                        resolveSafePath(file);

                    await fs.promises.mkdir(
                        path.dirname(filePath),
                        {
                            recursive: true
                        }
                    );

                    await fs.promises.writeFile(
                        filePath,
                        content,
                        "utf-8"
                    );

                    return {
                        file,
                        status: "updated"
                    };

                } catch (error) {

                    return {
                        file,
                        error: error.message
                    };
                }
            })
        );

        return res.status(200).json({
            status: "success",
            results
        });

    } catch (error) {

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

/**
 * @route POST /create-files
 * @description
 * Creates new files.
 *
 * Body:
 * {
 *   "files": [
 *      {
 *          "file": "src/test.js",
 *          "content": "console.log('hello')"
 *      }
 *   ]
 * }
 */
app.post("/create-files", async (req, res) => {

    const files = req.body.files;

    if (!files || !Array.isArray(files)) {

        return res.status(400).json({
            status: "error",
            message: "Invalid files payload"
        });
    }

    try {

        const results = await Promise.all(
            files.map(async fileObject => {

                const {
                    file,
                    content
                } = fileObject;

                try {

                    const filePath =
                        resolveSafePath(file);

                    await fs.promises.mkdir(
                        path.dirname(filePath),
                        {
                            recursive: true
                        }
                    );

                    /**
                     * Prevent overwrite.
                     */
                    await fs.promises.writeFile(
                        filePath,
                        content,
                        {
                            encoding: "utf-8",
                            flag: "wx"
                        }
                    );

                    return {
                        file,
                        status: "created"
                    };

                } catch (error) {

                    return {
                        file,
                        error: error.message
                    };
                }
            })
        );

        return res.status(200).json({
            status: "success",
            results
        });

    } catch (error) {

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

export default app;