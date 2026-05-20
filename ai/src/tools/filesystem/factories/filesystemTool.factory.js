/**
 * PURPOSE:
 * Create a reusable LangChain tool wrapper for filesystem operations.
 * WHY THIS EXISTS:
 * Tool creation should be centralized so validation and error handling stay consistent.
 * WHEN TO USE:
 * Use this as the base factory for all filesystem query and mutation tools.
 * SCALABILITY BENEFIT:
 * New tools only need route-specific config instead of bespoke wrapper code.
 * FUTURE EXTENSION:
 * Add telemetry hooks, tracing, or policy checks in one place later.
 *
 * Scalability note: factories eliminate duplicate tool boilerplate.
 * Security note: one wrapper can enforce consistent input validation and failure shaping.
 * Performance note: one tool wrapper keeps execution logic predictable and lightweight.
 */
import { tool } from "langchain";

/**
 * PURPOSE:
 * Validate, execute, and safely serialize a filesystem tool call.
 * WHY THIS EXISTS:
 * The LangChain wrapper should not need to know route-specific transport details.
 * WHEN TO USE:
 * Use this internally when creating any filesystem tool instance.
 * INPUTS:
 * - raw tool input
 * - schema
 * - runner function
 * OUTPUTS:
 * - serialized JSON string
 * ARCHITECTURAL PURPOSE:
 * Keep the generic tool shell separate from route-specific business behavior.
 *
 * @param {Object} params Invocation parameters.
 * @param {string} params.name LangChain tool name.
 * @param {string} params.description Tool description.
 * @param {import("zod").ZodTypeAny} params.schema Input schema.
 * @param {(input: Object) => Promise<string>} params.run Request runner.
 * @returns {ReturnType<typeof tool>} LangChain tool instance.
 */
export function createFilesystemTool({ name, description, schema, run }) {
    return tool(
        async rawInput => {
            try {
                const parsedInput = schema.parse(rawInput ?? {});
                return await run(parsedInput);
            } catch (error) {
                return JSON.stringify({
                    error: error?.message || "Invalid filesystem tool input",
                    tool: name
                });
            }
        },
        {
            name,
            description,
            schema
        }
    );
}
