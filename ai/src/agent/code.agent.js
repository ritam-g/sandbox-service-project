import "dotenv/config";
import { ChatMistralAI } from "@langchain/mistralai"
import { updateFiles, readFiles, listFiles } from "./tools.js";
import { createAgent } from "langchain";

const model = new ChatMistralAI({
    model: "mistral-large-latest",
    apiKey: process.env.MISTRALAI_API_KEY,
    "temperature": 0.7,
})



const agent = createAgent({
    model,
    tools: [
        updateFiles,
        readFiles,
        listFiles,
    ]
})



export default agent