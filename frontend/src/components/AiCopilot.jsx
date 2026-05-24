import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, User, CheckCircle2, Play, ChevronRight, Info } from 'lucide-react';
import { API_CONFIG } from '../config/runtime';

export default function AiCopilot({ activeSandboxId, onFileModified }) {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Hi! I am your AI Copilot. I have direct access to your sandbox workspace. Tell me what you'd like to build, edit, or fix, and I will write the code for you in real-time!",
            steps: []
        }
    ]);
    const [currentSteps, setCurrentSteps] = useState([]);
    const [currentStreamedText, setCurrentStreamedText] = useState("");
    const messagesEndRef = useRef(null);

    const templates = [
        { title: "Retro Snake Game", prompt: "Create a retro snake game in src/App.jsx. Use simple CSS classes for grid layout and add a score tracker, restart button, and styling." },
        { title: "Counter Component", prompt: "Create a beautiful responsive Counter component in src/App.jsx with increment, decrement, reset buttons, and colorful status glows." },
        { title: "Dark Mode Toggle", prompt: "Update src/App.jsx to support a clean dark/light mode toggle with smooth Tailwind background transitions and elegant icons." },
        { title: "Tic-Tac-Toe Game", prompt: "Create an interactive Tic-Tac-Toe game in src/App.jsx. Include win state checks, high score persistent trackers, and neat grid visual animations." }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentStreamedText, currentSteps]);

    const handleSendPrompt = async (e, textToSend) => {
        if (e) e.preventDefault();
        const messageText = textToSend || prompt;
        if (!messageText.trim() || loading) return;

        setPrompt("");
        setLoading(true);
        setCurrentSteps([]);
        setCurrentStreamedText("");

        // Add user message to chat
        setMessages(prev => [...prev, { role: "user", content: messageText }]);

        try {
            const response = await fetch(`${API_CONFIG.AI}/api/ai/agent/invoke`, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageText,
                    sandboxID: activeSandboxId || ""
                })
            });

            if (!response.body) {
                throw new Error("No readable stream returned from AI service");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let partialBuffer = "";

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunkText = decoder.decode(value, { stream: !done });
                    partialBuffer += chunkText;

                    // Parse Server-Sent Events (data: <JSON>)
                    const lines = partialBuffer.split("\n");
                    partialBuffer = lines.pop() || ""; // Keep incomplete line in buffer

                    for (const line of lines) {
                        const cleanLine = line.trim();
                        if (cleanLine.startsWith("data: ")) {
                            try {
                                const rawData = cleanLine.substring(6);
                                const parsed = JSON.parse(rawData);

                                // 1. Check for finished stream
                                if (parsed.done) {
                                    done = true;
                                    break;
                                }

                                // 2. Handle connection status
                                if (parsed.status === "connected") {
                                    setCurrentSteps(prev => [...prev, "Connected to AI agent..."]);
                                    continue;
                                }

                                // 3. Handle specific logs or steps
                                if (parsed.step) {
                                    setCurrentSteps(prev => [...prev, parsed.step]);
                                    continue;
                                }

                                // 4. Check for tool execution status or custom logs
                                // If the stream has a writer output (standard logs like "Reading files...", etc.)
                                if (typeof parsed === 'string' && (parsed.includes("Listing") || parsed.includes("Reading") || parsed.includes("Updating") || parsed.includes("Updated"))) {
                                    setCurrentSteps(prev => [...prev, parsed]);
                                    continue;
                                }

                                // 5. Check if the parsed object is a Langgraph chunk containing assistant message updates
                                // LangGraph outputs chunk with key like "agent" or "tools" or "messages"
                                const assistantMsg = parsed.messages?.[0] || parsed.agent?.messages?.[0];
                                if (assistantMsg && assistantMsg.content) {
                                    setCurrentStreamedText(prev => prev + assistantMsg.content);
                                } else if (parsed.content) {
                                    // Sometime chunk is direct object with content
                                    setCurrentStreamedText(prev => prev + parsed.content);
                                } else if (typeof parsed === 'string') {
                                    // Sometime raw string chunk
                                    setCurrentStreamedText(prev => prev + parsed);
                                }
                            } catch (err) {
                                // Ignore json parsing errors for non-json lines
                            }
                        }
                    }
                }
            }

            // Once finished, finalize assistant message
            setMessages(prev => {
                const finalContent = currentStreamedText.trim() || "Changes implemented successfully. Please check the live preview to verify!";
                return [...prev, {
                    role: "assistant",
                    content: finalContent,
                    steps: currentSteps
                }];
            });
            setCurrentStreamedText("");
            setCurrentSteps([]);

            // Trigger parent callback to reload active files and filetree
            if (onFileModified) {
                onFileModified();
            }

        } catch (err) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `⚠️ Failed to complete AI request: ${err.message}. Please check if the AI service is online.`,
                steps: []
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800 text-zinc-300">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900 select-none">
                <Sparkles size={16} className="text-indigo-400" />
                <span className="font-semibold text-xs tracking-wider uppercase text-zinc-400">AI Coding Copilot</span>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex gap-3 text-sm ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {/* Avatar */}
                        {msg.role !== 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <Bot size={16} className="text-indigo-400" />
                            </div>
                        )}

                        {/* Content box */}
                        <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                            msg.role === 'user'
                                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                                : 'bg-zinc-800/50 border border-zinc-800/80 text-zinc-300'
                        }`}>
                            {/* Render intermediate agent steps if assistant message */}
                            {msg.steps && msg.steps.length > 0 && (
                                <div className="mb-2.5 space-y-1 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60 font-mono text-[11px] text-zinc-500 select-none">
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-1.5">
                                        <Info size={10} />
                                        <span>Agent Operations</span>
                                    </div>
                                    {msg.steps.map((step, sIdx) => (
                                        <div key={sIdx} className="flex items-center gap-1.5">
                                            <CheckCircle2 size={12} className="text-indigo-400 flex-shrink-0" />
                                            <span className="truncate">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Render message body text */}
                            <div className="whitespace-pre-wrap leading-relaxed break-words font-sans">
                                {msg.content}
                            </div>
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                                <User size={16} className="text-zinc-400" />
                            </div>
                        )}
                    </div>
                ))}

                {/* Streaming Assistant text container */}
                {(currentStreamedText || currentSteps.length > 0) && (
                    <div className="flex gap-3 text-sm justify-start">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <Bot size={16} className="text-indigo-400" />
                        </div>
                        
                        <div className="max-w-[85%] rounded-xl px-4 py-3 bg-zinc-800/50 border border-zinc-800/80 text-zinc-300">
                            {/* Stream Steps */}
                            {currentSteps.length > 0 && (
                                <div className="mb-2.5 space-y-1 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60 font-mono text-[11px] text-zinc-500 select-none">
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold flex items-center gap-1.5 mb-1.5">
                                        <Loader2 size={10} className="animate-spin text-indigo-400" />
                                        <span>Running Workspace Tools...</span>
                                    </div>
                                    {currentSteps.map((step, sIdx) => (
                                        <div key={sIdx} className="flex items-center gap-1.5">
                                            <CheckCircle2 size={12} className="text-indigo-400 flex-shrink-0" />
                                            <span className="truncate">{step}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Stream Text content */}
                            <div className="whitespace-pre-wrap leading-relaxed break-words font-sans">
                                {currentStreamedText || (
                                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs py-1">
                                        <Loader2 className="animate-spin" size={14} />
                                        <span>Agent preparing edits...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick templates panel (shows when not loading) */}
            {!loading && messages.length <= 1 && (
                <div className="px-4 py-2 bg-zinc-950/30 border-t border-zinc-800 select-none">
                    <span className="text-[10px] uppercase font-semibold text-zinc-600 tracking-wider">Quick Suggestions</span>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {templates.map((tpl, tIdx) => (
                            <button
                                key={tIdx}
                                className="flex items-center justify-between text-left p-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-xs border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                                onClick={(e) => handleSendPrompt(e, tpl.prompt)}
                            >
                                <span className="font-medium truncate mr-1">{tpl.title}</span>
                                <ChevronRight size={12} className="flex-shrink-0 text-zinc-600" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input area */}
            <form onSubmit={handleSendPrompt} className="p-3 border-t border-zinc-800 bg-zinc-900 flex gap-2">
                <input 
                    type="text" 
                    placeholder={loading ? "AI is processing changes..." : "Ask Copilot to build something..."}
                    className="flex-1 bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loading}
                />
                <button 
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-600/10"
                    disabled={loading || !prompt.trim()}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </form>
        </div>
    );
}
