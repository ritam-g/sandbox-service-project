import * as z from "zod"
import { tool } from "langchain"
import axios from "axios"

/**
 * @description Builds a query string for one or more file-system paths.
 * @param {string|string[]|undefined} path Workspace-relative path input
 * @returns {string} Encoded query string fragment
 */
function buildPathQuery(path) {
    if (Array.isArray(path)) {
        const params = new URLSearchParams()

        for (const segment of path) {
            const value = String(segment ?? "").trim()

            if (value) {
                params.append("path", value)
            }
        }

        return params.toString()
    }

    const value = String(path ?? "").trim()

    return value ? `path=${encodeURIComponent(value)}` : ""
}

/**
 * @description Calls the workspace file service with a path query.
 * @param {string} endpoint File-service endpoint
 * @param {string|string[]|undefined} path Workspace-relative path input
 * @returns {Promise<string>} Serialized service response
 */
async function fetchWorkspaceFiles(endpoint, path) {
    const query = buildPathQuery(path)
    const url = query ? `${endpoint}?${query}` : endpoint
    const response = await axios.get(url)

    return JSON.stringify(response.data)
}

/**  
 * @description Reads files from the filesystem.
 * @params {string|string[]} path Workspace-relative path or paths
 * @returns {Object} File contents
 * @throws {Error} If file not found
 */
export const readFilses = tool(
    async ({ path }) => {
        try {
            return await fetchWorkspaceFiles("https://shiny-space-capybara-wrp6pw9gwgj6hg5gr-4000.app.github.dev/read", path)
        } catch (error) {
            console.log('====================================');
            console.log(error);
            console.log('====================================');

            return error
        }
    },
    {
        name: "Read Files",
        description: "Reads one or more files from the filesystem.",
        schema: z.object({
            path: z.union([z.string(), z.array(z.string())]).describe("Workspace-relative path or paths").optional()
        })
    }
)
export const seeAllFIles = tool(
    async ({ path }) => {
        try {
            return await fetchWorkspaceFiles("https://shiny-space-capybara-wrp6pw9gwgj6hg5gr-4000.app.github.dev/files", path)
        } catch (error) {
            console.log('====================================');
            console.log(error);
            console.log('====================================');

            return error
        }
    },
    {
        name: "List Files",
        description: "Lists files and directories from the filesystem.",
        schema: z.object({
            path: z.union([z.string(), z.array(z.string())]).describe("Workspace-relative path or paths").optional()
        })
    }
)
