import * as z from "zod"
import { tool } from "langchain"
import axios from "axios"

const FILE_SERVICE_BASE_URL = process.env.FILE_SERVICE_BASE_URL || "https://shiny-space-capybara-wrp6pw9gwgj6hg5gr-4000.app.github.dev"
const MUTATION_PATH_ERROR = "Mutation tools accept exactly one path"

/**
 * @description Shared path input schema for filesystem tools.
 * Supports strings and arrays of strings.
 * Example inputs:
 * - "src/App.jsx"
 * - ["src/App.jsx", "vite.config.js"]
 * - path=src&path=vite.config.js
 * - path[]=src
 */
const workspacePathSchema = z.union([z.string(), z.array(z.string())])

const workspaceOptionalPathSchema = workspacePathSchema.optional()

/**
 * @description Shared read schema for routes that require at least one path.
 * Accepts a single path or multiple paths.
 */
const workspaceReadSchema = z.object({
    path: workspacePathSchema.describe("Workspace-relative path or paths")
})

/**
 * @description Shared query schema for filesystem listing and read routes.
 * Accepts a single path or multiple paths.
 */
const workspaceQuerySchema = z.object({
    path: workspaceOptionalPathSchema.describe("Workspace-relative path or paths")
})

/**
 * @description Shared mutation schema for filesystem write and create routes.
 * Accepts a single workspace path and optional file metadata.
 */
const workspaceMutationSchema = z.object({
    path: workspacePathSchema.describe("Workspace-relative path or paths"),
    content: z.string().default(""),
    overwrite: z.boolean().default(false),
    type: z.enum(["file", "directory"]).optional().describe("Resource type")
})

/**
 * @description Normalizes raw path input into an array of path segments.
 * @param {string|string[]|Object|undefined} pathInput Raw path value or query object
 * @returns {string[]} Normalized path list
 */
function normalizePathInput(pathInput) {
    const rawValues = []

    const collect = value => {
        if (value === undefined || value === null) {
            return
        }

        if (Array.isArray(value)) {
            rawValues.push(...value)
            return
        }

        rawValues.push(value)
    }

    if (pathInput && typeof pathInput === "object" && !Array.isArray(pathInput)) {
        collect(pathInput.path)
        collect(pathInput["path[]"])
    } else {
        collect(pathInput)
    }

    return rawValues
        .flatMap(value => String(value).split(","))
        .map(segment => segment.trim())
        .filter(Boolean)
}

/**
 * @description Builds a repeated `path` query string from normalized path input.
 * @param {string|string[]|Object|undefined} pathInput Raw path value or query object
 * @returns {string} Encoded query string fragment
 */
function buildPathQuery(pathInput) {
    const paths = normalizePathInput(pathInput)
    const params = new URLSearchParams()

    for (const segment of paths) {
        params.append("path", segment)
    }

    return params.toString()
}

/**
 * @description Builds a request URL for the filesystem service.
 * @param {string} routePath Route path on the file service
 * @param {Object} [query={}] Query payload
 * @returns {string} Fully qualified request URL
 */
function buildUrl(routePath, query = {}) {
    const url = new URL(routePath, FILE_SERVICE_BASE_URL)
    const queryString = buildPathQuery(query.path)

    if (queryString) {
        url.search = queryString
    }

    return url.toString()
}

/**
 * @description Normalizes query payloads for listing and read routes.
 * @param {Object} payload Parsed tool input
 * @returns {{path: string[]}} Normalized query payload
 */
function normalizeQueryPayload(payload = {}) {
    return {
        path: normalizePathInput(payload.path)
    }
}

/**
 * @description Normalizes mutation payloads for write and create routes.
 * @param {Object} payload Parsed tool input
 * @param {"file"|"directory"|null} [fixedType=null] Fixed resource type when required
 * @returns {Object} Normalized request body
 * @throws {Error} When the mutation contains multiple paths or mismatched type
 */
function normalizeMutationPayload(payload = {}, fixedType = null) {
    const {
        path,
        content = "",
        overwrite = false,
        type
    } = workspaceMutationSchema.parse(payload)
    const paths = normalizePathInput(path)

    if (paths.length === 0) {
        throw new Error("Missing path")
    }

    if (paths.length > 1) {
        throw new Error(MUTATION_PATH_ERROR)
    }

    if (fixedType && type && type !== fixedType) {
        throw new Error(`Type must be ${fixedType}`)
    }

    const body = {
        path: paths[0],
        content,
        overwrite
    }

    if (fixedType) {
        body.type = fixedType
    } else if (type) {
        body.type = type
    }

    return body
}

/**
 * @description Executes an HTTP request against the filesystem service.
 * Returns the response body as serialized JSON.
 * @param {Object} request Request configuration
 * @param {"get"|"post"} request.method HTTP method
 * @param {string} request.routePath Service route path
 * @param {Object} [request.query] Query payload
 * @param {Object} [request.data] Request body
 * @returns {Promise<string>} Serialized response data
 */
async function safeRequest({ method, routePath, query, data }) {
    try {
        const response = await axios.request({
            method,
            url: buildUrl(routePath, query),
            data,
            validateStatus: () => true
        })

        return JSON.stringify(response.data ?? null)
    } catch (error) {
        return JSON.stringify({
            error: error?.message || "Filesystem request failed",
            route: routePath
        })
    }
}

/**
 * @description Creates a LangChain tool for a filesystem route.
 * @param {Object} options Tool options
 * @param {string} options.name LangChain tool name
 * @param {string} options.description Tool description
 * @param {z.ZodTypeAny} options.schema Input schema
 * @param {(input: Object) => Promise<string>} options.run Request runner
 * @returns {ReturnType<typeof tool>} LangChain tool instance
 */
function createFilesystemTool({ name, description, schema, run }) {
    return tool(
        async rawInput => {
            try {
                const parsedInput = schema.parse(rawInput ?? {})
                return await run(parsedInput)
            } catch (error) {
                return JSON.stringify({
                    error: error?.message || "Invalid filesystem tool input",
                    tool: name
                })
            }
        },
        {
            name,
            description,
            schema
        }
    )
}

/**
 * @description Creates a GET filesystem tool.
 * @param {Object} options Tool options
 * @param {string} options.name LangChain tool name
 * @param {string} options.description Tool description
 * @param {string} options.routePath Service route path
 * @param {z.ZodTypeAny} [options.schema=workspaceQuerySchema] Input schema
 * @returns {ReturnType<typeof tool>} LangChain tool instance
 */
function createQueryTool({ name, description, routePath, schema = workspaceQuerySchema }) {
    return createFilesystemTool({
        name,
        description,
        schema,
        run: async input => safeRequest({
            method: "get",
            routePath,
            query: normalizeQueryPayload(input)
        })
    })
}

/**
 * @description Creates a POST filesystem tool.
 * @param {Object} options Tool options
 * @param {string} options.name LangChain tool name
 * @param {string} options.description Tool description
 * @param {string} options.routePath Service route path
 * @param {"file"|"directory"|null} [options.fixedType=null] Fixed resource type for create tools
 * @param {z.ZodTypeAny} [options.schema=workspaceMutationSchema] Input schema
 * @returns {ReturnType<typeof tool>} LangChain tool instance
 */
function createMutationTool({
    name,
    description,
    routePath,
    fixedType = null,
    schema = workspaceMutationSchema
}) {
    return createFilesystemTool({
        name,
        description,
        schema,
        run: async input => safeRequest({
            method: "post",
            routePath,
            data: normalizeMutationPayload(input, fixedType)
        })
    })
}

export const readWorkspaceFiles = createQueryTool({
    name: "read_workspace_files",
    description: "Read one or more files from the workspace.",
    routePath: "/read",
    schema: workspaceReadSchema
})

export const listWorkspaceEntries = createQueryTool({
    name: "list_workspace_entries",
    description: "List entries for one or more workspace paths.",
    routePath: "/files"
})

export const listWorkspaceTree = createQueryTool({
    name: "list_workspace_tree",
    description: "Recursively list the workspace tree.",
    routePath: "/list-files"
})

export const writeWorkspaceFile = createMutationTool({
    name: "write_workspace_file",
    description: "Write content to a workspace file.",
    routePath: "/write"
})

export const createWorkspaceFile = createMutationTool({
    name: "create_workspace_file",
    description: "Create a workspace file.",
    routePath: "/create",
    fixedType: "file"
})

export const createWorkspaceDirectory = createMutationTool({
    name: "create_workspace_directory",
    description: "Create a workspace directory.",
    routePath: "/create",
    fixedType: "directory"
})

export const readFilesAlias = createQueryTool({
    name: "read_workspace_files_alias",
    description: "Alias for listing workspace entries.",
    routePath: "/read-files"
})

export const readFilses = readWorkspaceFiles
export const seeAllFIles = listWorkspaceEntries
