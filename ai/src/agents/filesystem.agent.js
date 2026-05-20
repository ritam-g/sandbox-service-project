/**
 * PURPOSE:
 * Assemble the production filesystem agent from the model, prompt, and tool registry.
 * WHY THIS EXISTS:
 * The orchestration layer should be a thin composition layer with no business logic.
 * WHEN TO USE:
 * Use this as the runtime entrypoint for filesystem agent creation.
 * SCALABILITY BENEFIT:
 * Multiple agents can reuse the same tools while swapping prompts or models.
 * FUTURE EXTENSION:
 * Add agent variants for planning, editing, review, or distributed coordination here later.
 *
 * Scalability note: the orchestration layer should only compose lower layers.
 * Security note: this is the right place to decide which tools are exposed to the model.
 * Performance note: agent composition should remain a lightweight startup step.
 */
import { createAgent } from "langchain";
import { filesystemTools } from "../tools/filesystem/index.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { createFilesystemModel } from "./filesystem.model.js";

/**
 * PURPOSE:
 * Build a configured filesystem agent instance.
 * WHY THIS EXISTS:
 * Agent creation should be reusable for production runtime and future test harnesses.
 * WHEN TO USE:
 * Use this when wiring the filesystem tools into LangChain.
 * INPUTS:
 * - optional model override
 * - optional tool override
 * OUTPUTS:
 * - LangChain agent instance
 * ARCHITECTURAL PURPOSE:
 * Keep orchestration composition separate from the tool and transport layers.
 *
 * @param {Object} [options={}] Agent overrides.
 * @param {ReturnType<typeof createFilesystemModel>} [options.model] Optional custom model instance.
 * @param {Array} [options.tools] Optional custom tool array.
 * @returns {ReturnType<typeof createAgent>} LangChain agent instance.
 */
export function createFilesystemAgent({
    model = createFilesystemModel(),
    tools = filesystemTools
} = {}) {
    return createAgent({
        model,
        tools
    });
}

/**
 * PURPOSE:
 * Export the default production agent instance when credentials are present.
 * WHY THIS EXISTS:
 * Module imports should stay safe even in environments that have not configured the API key yet.
 * WHEN TO USE:
 * Import this in runtime code that needs the standard filesystem agent.
 * ARCHITECTURAL PURPOSE:
 * Provide a ready-to-use agent while still allowing the factory to be reused.
 */
export const agent = process.env.MISTRALAI_API_KEY ? createFilesystemAgent() : null;

/**
 * PURPOSE:
 * Re-export the operational prompt for convenience within agent consumers.
 * WHY THIS EXISTS:
 * Runtime callers often need both the agent and the system prompt together.
 * WHEN TO USE:
 * Import this alongside the agent when building conversations.
 * ARCHITECTURAL PURPOSE:
 * Keep agent composition and prompt reuse in the same layer.
 */
export { SYSTEM_PROMPT };
