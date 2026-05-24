import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { Server } from "socket.io"
import http from "http";
import pty from "node-pty";
import os from "os";
import cors from "cors";
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});
const WORKING_DIR = "/workspace";

app.use(morgan("dev"));

app.use(express.json({
    limit: "10mb"
}));

app.use(express.urlencoded({
    extended: true
}));
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://supreme-potato-pj4v4xgpxwpvc6p4-5173.app.github.dev',
    'https://supreme-potato-pj4v4xgpxwpvc6p4-5174.app.github.dev'
]

app.use(cors({
    origin: function(origin, callback) {

        // allow non-browser requests
        if (!origin) return callback(null, true)

        if (allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With'
    ]
}))

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

const shell = os.platform() === "win32"
    ? "powershell.exe"
    : "bash";

io.on("connection", (socket) => {

    console.log("client connected");

    const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: WORKING_DIR,
        env: process.env
    });

    /**
     * Send terminal output back to frontend
     */
    ptyProcess.onData((data) => {

        console.log("OUTPUT:", JSON.stringify(data));

        socket.emit("terminal-output", data);
    });

    /**
     * Receive terminal input from frontend
     */
    socket.on("terminal-input", (data) => {

        console.log("INPUT:", JSON.stringify(data));

        /**
         * VERY IMPORTANT
         * \r executes the command
         */
        ptyProcess.write(data + "\r");
    });

    /**
     * PTY exit handler
     */
    ptyProcess.onExit(({ exitCode }) => {

        console.log(`PTY exited: ${exitCode}`);
    });

    /**
     * Socket disconnect cleanup
     */
    socket.on("disconnect", () => {

        console.log("client disconnected");

        try {

            ptyProcess.kill();

        } catch (err) {

            console.log(err.message);
        }
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

/**  
 * @route DELETE /delete-files
 * @description
 * Deletes files.
 *
 * Body:
 * {
 *   "files": [
 *      "src/test.js"
 *   ]
 * }
 */
app.delete("/delete-files", async (req, res) => {

    const files = req.body.files;

    if (!files || !Array.isArray(files)) {

        return res.status(400).json({
            status: "error",
            message: "Invalid files payload"
        });
    }

    try {

        const results = await Promise.all(
            files.map(async file => {

                try {

                    const filePath =
                        resolveSafePath(file);

                    await fs.promises.unlink(filePath);

                    return {
                        file,
                        status: "deleted"
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

    }
    catch (error) {

        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});
export default httpServer;