/**
 * PURPOSE:
 * Encapsulate Mistral model configuration for the filesystem agent.
 * WHY THIS EXISTS:
 * Model configuration should be separate from prompt text and tool registration.
 * WHEN TO USE:
 * Use this when creating a filesystem-focused ChatMistralAI instance.
 * SCALABILITY BENEFIT:
 * Multiple agents can share the same model factory with different toolsets or prompts.
 * FUTURE EXTENSION:
 * Add model routing, temperature profiles, or provider fallbacks here later.
 *
 * Scalability note: keeping model config in its own layer makes future provider swaps easier.
 * Security note: API keys should flow in through environment variables, not hardcoded values.
 * Performance note: centralized model config makes tuning and experimentation straightforward.
 */
import { ChatMistralAI } from "@langchain/mistralai";

/**
 * PURPOSE:
 * Build a configured ChatMistralAI client for filesystem orchestration.
 * WHY THIS EXISTS:
 * Model creation should be reusable and easy to override for testing or future agents.
 * WHEN TO USE:
 * Use this when constructing the production filesystem agent or a test double.
 * INPUTS:
 * - optional model name
 * - optional API key override
 * - optional temperature override
 * OUTPUTS:
 * - configured ChatMistralAI instance
 * ARCHITECTURAL PURPOSE:
 * Keep model creation decoupled from prompt and tool wiring.
 *
 * @param {Object} [options={}] Model overrides.
 * @param {string} [options.model="mistral-large-latest"] Mistral model name.
 * @param {string} [options.apiKey=process.env.MISTRALAI_API_KEY] API key for Mistral.
 * @param {number} [options.temperature=0.7] Sampling temperature.
 * @returns {ChatMistralAI} Configured ChatMistralAI client.
 */
export function createFilesystemModel({
    model = "mistral-large-latest",
    apiKey = process.env.MISTRALAI_API_KEY,
    temperature = 0.7
} = {}) {
    return new ChatMistralAI({
        model,
        apiKey,
        temperature
    });
}
