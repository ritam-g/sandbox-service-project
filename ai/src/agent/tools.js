import { tool } from 'langchain'
import axios from 'axios'
import * as z from 'zod'



/**  
 * @route GET /list-files
 * @description
 * Lists all files recursively from workspace.
 * Excludes heavy folders.
 * 
 */
export const listFiles = tool(
    async function ({ path = [] }, config) {
        const writer=config?.writer
        const agentUrl =
            `https://supreme-potato-pj4v4xgpxwpvc6p4-4000.app.github.dev`;

        writer(`Listing files in path: ${path.join(", ") || "root"}`)

        const response = await axios.get(`${agentUrl}/list-files`)


        writer(`Retrieved file list: ${JSON.stringify(response.data)}`)

        return JSON.stringify(response.data)
    },
    {
        description: "List files in a directory",
        schema: z.object({

        }),
        name: "listFiles", // tool name
    }
)
/**  
 * @route GET /read-files
 * @description
 * Reads multiple files.
 * 
 * Example:
 * /read-files?files=src/App.jsx,src/main.jsx
 */
export const readFiles = tool(
    async function ({ files = ["src/App.jsx", "vite.config.js"] }, config) {
        const writer=config?.writer
        const agentUrl =
            `https://supreme-potato-pj4v4xgpxwpvc6p4-4000.app.github.dev`;

        writer(`Reading files: ${files.join(", ")}`)
        const response = await axios.get(`${agentUrl}/read-files?files=${files.join(",")}`)
        writer(`Retrieved file contents: ${JSON.stringify(response.data)}`)

        return JSON.stringify(response.data)
    },
    {
        description: "read files in a directory",
        schema: z.object({
            files: z.array(z.string()).describe("List of files to read"),
        }),
        name: "readFiles", // tool name
    }
)

/**  
 * @route GET /update-files
 * @description
 * Updates multiple files.
 * 
 * Example:
 * /update-files?files=src/App.jsx,src/main.jsx
 */
export const updateFiles = tool(
    async function ({
        updates = [
            // {
            //     "file": "src/App.jsx",
            //     "content": "new app code"
            // },
            // {
            //     "file": "src/main.jsx",
            //     "content": "console.log('hello bro')"
            // }
        ]

    }, config) {
        const writer=config?.writer
        const agentUrl =
            `https://supreme-potato-pj4v4xgpxwpvc6p4-4000.app.github.dev`;

        writer(`Updating files: ${updates.map(u => u.file).join(", ")}`)

        const response = await axios.patch(`${agentUrl}/update-files`, {
            updates
        })
        writer(`Updated files: ${JSON.stringify(response.data)}`);

        return JSON.stringify(response.data)
    },
    {
        description: "update files in a directory",
        schema: z.object({
            updates: z.array(z.object({
                file: z.string(),
                content: z.string(),
            })).describe("List of files to update"),
        }),
        name: "updateFiles", // tool name
    }
)

/**  
 * @route GET /delete-files
 * @description
 * Deletes multiple files.
 * 
 * Example:
 * /delete-files?files=src/App.jsx,src/main.jsx
 */
export const deleteFiles = tool(
    async function ({ files = ["src/App.jsx", "src/main.jsx"] }, config) {
        const writer=config?.writer
        const agentUrl =
            `https://supreme-potato-pj4v4xgpxwpvc6p4-4000.app.github.dev`;
        writer(`Deleting files: ${files.join(", ")}`)

        const response = await axios.delete(`${agentUrl}/delete-files?files=${files.join(",")}`)
        console.log('====================================');
        writer(response.data,` deleted files: ${files.join(", ")}`);
        console.log('====================================');

        return JSON.stringify(response.data)
    },
    {
        description: "delete files in a directory",
        schema: z.object({
            files: z.array(z.string()).describe("List of files to delete"),
        }),
        name: "deleteFiles", // tool name
    }
)
