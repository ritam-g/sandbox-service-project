/**
 * PURPOSE:
 * Define the directory listing tool for workspace discovery.
 * WHY THIS EXISTS:
 * The agent needs a lightweight way to discover structure before reading files.
 * WHEN TO USE:
 * Use this when path uncertainty exists or the agent needs a folder-level view.
 * SCALABILITY BENEFIT:
 * Directory discovery remains declarative and reusable across agents.
 * FUTURE EXTENSION:
 * Add pagination or filtered listing support here later.
 *
 * Scalability note: discovery tools should remain read-only and low coupling.
 * Security note: listings help the agent reduce guesswork before modifying files.
 * Performance note: listing is cheaper than recursive reads when structure is unknown.
 */
import { createQueryTool } from "../factories/index.js";

/**
 * PURPOSE:
 * List entries for one or more workspace paths.
 * WHY THIS EXISTS:
 * The agent needs a way to inspect folder contents without reading every file.
 * WHEN TO USE:
 * Use this for targeted folder discovery and workspace exploration.
 * ARCHITECTURAL PURPOSE:
 * Provide a focused folder discovery entrypoint for the agent.
 */
export const listWorkspaceEntries = createQueryTool({
    name: "list_workspace_entries",
    description: "List entries for one or more workspace paths.",
    routePath: "/files"
});
