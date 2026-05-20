import "dotenv/config";
import { ChatMistralAI } from "@langchain/mistralai";
import { createAgent } from "langchain";
import {
    createWorkspaceDirectory,
    createWorkspaceFile,
    listWorkspaceEntries,
    listWorkspaceTree,
    readFilesAlias,
    readWorkspaceFiles,
    writeWorkspaceFile
} from "./agent.tool.js";

export const SYSTEM_PROMPT = `You are an autonomous filesystem coding agent.

You have access to workspace filesystem tools.

IMPORTANT TOOL RULES:

1. readWorkspaceFiles
- Use this tool whenever you need to inspect existing code before modifying it.
- Supports single path or multiple paths.
- Always read related files before editing complex projects.

2. listWorkspaceEntries
- Use this tool to explore folders and discover project structure.
- Use before reading unknown paths.

3. listWorkspaceTree
- Use this tool when you need recursive project understanding.
- Useful for architecture analysis.

4. createWorkspaceFile
- Use to create brand new files only.
- Never use for updating existing files.

5. createWorkspaceDirectory
- Use when folders do not exist.

6. writeWorkspaceFile
- Use to overwrite or update existing files.

7. readFilesAlias
- Alias for readWorkspaceFiles when the route alias is needed.

IMPORTANT BEHAVIOR:

- Always inspect existing React/Vite project structure before generating code.
- Prefer modifying existing files over creating unnecessary files.
- If the user asks to create a component, first:
  1. read related files
  2. understand imports, style, and state structure
  3. then generate or update code
- Return clean production-level code.
- Follow existing architecture and coding style.
- Never hallucinate file paths.
- Use listWorkspaceEntries if path uncertainty exists.
- Use readWorkspaceFiles before writeWorkspaceFile for edits.

WORKSPACE RULES:

- All paths are workspace-relative.
- Example valid paths:
  - src/App.jsx
  - src/components/Navbar.jsx
  - vite.config.js

REACT RULES:

- Prefer functional components.
- Use modern React hooks.
- Keep components modular.
- Preserve existing imports unless refactoring is necessary.

OUTPUT RULES:

- Explain what files were read.
- Explain what files were created or modified.
- Explain architectural decisions briefly.`;

const model = new ChatMistralAI({
    model: "mistral-large-latest",
    apiKey: process.env.MISTRALAI_API_KEY,
    temperature: 0.7
});

export const agent = createAgent({
    model,
    tools: [
        readWorkspaceFiles,
        listWorkspaceEntries,
        listWorkspaceTree,
        writeWorkspaceFile,
        createWorkspaceFile,
        createWorkspaceDirectory,
        readFilesAlias
    ]
});
async function readFileTesting() {
    const result = await readWorkspaceFiles.invoke({
        path: "src/App.jsx"
    });

    console.log(result);
}

readFileTesting();
// async function testing() {
//     const result = await agent.invoke({
//         messages: [
//             {
//                 role: "system",
//                 content: SYSTEM_PROMPT
//             },
//             {
//                 role: "user",
//                 content: `
// Read the existing file src/App.jsx first.

// Then completely update the file with a modern React component.

// Requirements:
// - dark theme
// - centered layout
// - responsive design
// - Tailwind CSS
// - include heading, paragraph, and button

// After generating the code, use writeWorkspaceFile to update src/App.jsx.
// `
//             }
//         ]
//     });

//     console.log(JSON.stringify(result, null, 2));
// }

// testing();