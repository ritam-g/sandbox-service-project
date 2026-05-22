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
        const sandboxURL =
            `http://sandbox-service-${config.context.sandboxID}:3000`;
        console.log('====================================');
        console.log('listFiles');
        console.log('====================================');
        const response = await axios.get(`${sandboxURL}/list-files`)
        console.log('====================================');
        console.log(response.data);
        console.log('====================================');
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
        const sandboxURL =
            `http://sandbox-service-${config.context.sandboxID}:3000`;
        console.log('====================================');
        console.log('readFiles');
        console.log('====================================');

        const response = await axios.get(`${sandboxURL}/read-files?files=${files.join(",")}`)
        console.log('====================================');
        console.log(response.data);


        console.log('====================================');

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
        const sandboxURL =
            `http://sandbox-service-${config.context.sandboxID}:3000`;
        console.log('====================================');
        console.log('udateFiles');
        console.log('====================================');

        const response = await axios.patch(`${sandboxURL}/update-files`, {
            updates
        })
        console.log('====================================');
        console.log(response.data);
        console.log('====================================');

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
        const sandboxURL =
            `http://sandbox-service-${config.context.sandboxID}:3000`;
        console.log('====================================');
        console.log('deleteFiles');
        console.log('====================================');

        const response = await axios.delete(`${sandboxURL}/delete-files?files=${files.join(",")}`)
        console.log('====================================');
        console.log(response.data);
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
