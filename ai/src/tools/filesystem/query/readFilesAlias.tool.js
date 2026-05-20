/**
 * PURPOSE:
 * Expose an alias read tool for service-side route compatibility.
 * WHY THIS EXISTS:
 * Some filesystem deployments expose alternate route names that should map to the same behavior.
 * WHEN TO USE:
 * Use this only when a route alias is required by the filesystem service contract.
 * SCALABILITY BENEFIT:
 * Alias support stays declarative and does not fork the transport logic.
 * FUTURE EXTENSION:
 * Add more compatibility aliases here if service routes evolve.
 *
 * Scalability note: aliases should never duplicate execution code.
 * Security note: alias routes must share the same validation and transport path as the primary tool.
 * Performance note: aliasing at the tool layer adds no meaningful runtime cost.
 */
import { createQueryTool } from "../factories/index.js";

/**
 * PURPOSE:
 * Provide a route alias for file-read style access.
 * WHY THIS EXISTS:
 * The filesystem service may expose compatibility routes that the agent must still understand.
 * WHEN TO USE:
 * Use this when the alias route is part of the service contract.
 * ARCHITECTURAL PURPOSE:
 * Keep compatibility routes explicit instead of hiding them in transport code.
 */
export const readFilesAlias = createQueryTool({
    name: "read_workspace_files_alias",
    description: "Alias for listing workspace entries.",
    routePath: "/read-files"
});
