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

async function testing() {
    const result = await agent.invoke({
        messages: [
            {
                "role": "user",
                "content": "create a noraml landing page for bike write code in jsx file onely  and remove .html code write prperly way like in ract we do  "
            }
        ]
    })
    console.log(result)
}

testing()

export default agent