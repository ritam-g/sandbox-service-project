import React from 'react';
import { Layers, Play, RefreshCw, Sparkles } from 'lucide-react';

export default function Topbar({
    activeSandboxId,
    isSandboxRunning,
    startingSandbox,
    onStartSandbox,
    onResetSandbox,
    showAiChat,
    onToggleAiChat
}) {
    return (
        <header className="flex items-center justify-between px-6 py-3 bg-[#0a0a0c] border-b border-zinc-900 shadow-md select-none z-20 h-14">
            <div className="flex items-center gap-3">
                {/* Glowing Logo */}
                <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg shadow-lg shadow-indigo-600/30">
                    <Layers className="text-white w-4 h-4" />
                    <span className="absolute -inset-0.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-30 blur pulse-glow"></span>
                </div>
                <div>
                    <h1 className="font-bold text-sm tracking-wide text-zinc-100 flex items-center gap-1.5">
                        Antigravity <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">Sandbox</span>
                    </h1>
                    <p className="text-[10px] text-zinc-500 font-mono">Kubernetes Ephemeral IDE Workspace</p>
                </div>
            </div>

            {/* Session controllers */}
            <div className="flex items-center gap-3">
                {activeSandboxId ? (
                    <div className="flex items-center gap-3">
                        {/* Running session badge */}
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800/80 rounded-full pl-3 pr-4 py-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow"></span>
                            <span className="text-xs font-mono font-medium text-zinc-400">
                                sandbox: <span className="text-zinc-200 select-all font-semibold">{activeSandboxId.substring(0, 8)}...</span>
                            </span>
                        </div>
                        
                        <button
                            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-850 rounded-lg text-xs font-medium transition-all"
                            onClick={onResetSandbox}
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <button
                        className="relative overflow-hidden px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 group"
                        onClick={onStartSandbox}
                        disabled={startingSandbox}
                    >
                        {startingSandbox ? (
                            <>
                                <RefreshCw className="animate-spin" size={13} />
                                <span>Allocating Pod...</span>
                            </>
                        ) : (
                            <>
                                <Play size={11} fill="white" className="group-hover:scale-110 transition-transform" />
                                <span>Allocate Dev Sandbox</span>
                            </>
                        )}
                    </button>
                )}

                {/* Collapsible Copilot Chat Controller */}
                <button
                    title="Toggle AI Chat Panel"
                    className={`p-2 rounded-lg border transition-all ${
                        showAiChat 
                            ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' 
                            : 'bg-zinc-800 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={onToggleAiChat}
                >
                    <Sparkles size={14} />
                </button>
            </div>
        </header>
    );
}
