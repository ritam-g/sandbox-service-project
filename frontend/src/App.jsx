import React, { useState, useEffect } from 'react';
import { 
    Play, 
    Sparkles, 
    Terminal as TermIcon, 
    Layers, 
    Globe, 
    FolderTree, 
    Cpu, 
    RefreshCw, 
    Sidebar,
    Layers2,
    CheckCircle,
    Info,
    HelpCircle
} from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import AiCopilot from './components/AiCopilot';
import LivePreview from './components/LivePreview';

const ORCHESTRATOR_API = "https://supreme-potato-pj4v4xgpxwpvc6p4-3000.app.github.dev";

export default function App() {
    // Persistent state via LocalStorage
    const [activeSandboxId, setActiveSandboxId] = useState(() => {
        return localStorage.getItem('sandbox_id') || "";
    });
    const [isSandboxRunning, setIsSandboxRunning] = useState(() => {
        return localStorage.getItem('sandbox_running') === 'true';
    });

    const [openTabs, setOpenTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [startingSandbox, setStartingSandbox] = useState(false);
    const [sandboxStatusMessage, setSandboxStatusMessage] = useState("");
    const [showAiChat, setShowAiChat] = useState(true); // Collapsible copilot chat
    const [activeRightTab, setActiveRightTab] = useState("preview"); // preview, terminal

    // Status message array for starting up
    const loadingStages = [
        "Initializing Kubernetes namespace routing...",
        "Requesting ephemeral sandbox Pod resources...",
        "Spinning up Vite + React frontend containers...",
        "Mounting agent sidecar filesystem volume...",
        "Configuring internal networking proxies...",
        "Executing Vite preview dev-server build..."
    ];

    // Persist sandbox session
    useEffect(() => {
        if (activeSandboxId) {
            localStorage.setItem('sandbox_id', activeSandboxId);
            localStorage.setItem('sandbox_running', String(isSandboxRunning));
        } else {
            localStorage.removeItem('sandbox_id');
            localStorage.removeItem('sandbox_running');
        }
    }, [activeSandboxId, isSandboxRunning]);

    // Handle startup probes
    const handleStartSandbox = async () => {
        if (startingSandbox) return;
        setStartingSandbox(true);
        setSandboxStatusMessage(loadingStages[0]);

        // Cycle through mock pipeline steps for delightful loading visuals
        let stageIdx = 0;
        const stageInterval = setInterval(() => {
            if (stageIdx < loadingStages.length - 1) {
                stageIdx++;
                setSandboxStatusMessage(loadingStages[stageIdx]);
            }
        }, 3000);

        try {
            const res = await fetch(`${ORCHESTRATOR_API}/api/sandbox/start`, {
                method: 'POST'
            });
            const data = await res.json();
            
            if (data.sandboxId) {
                setActiveSandboxId(data.sandboxId);
                setIsSandboxRunning(true);
                setRefreshTrigger(prev => prev + 1);
            } else {
                alert("Failed to allocate sandbox pod: " + (data.error || "Unknown response"));
            }
        } catch (err) {
            alert("Error connecting to orchestration api. Ensure codespaces port 3000 is forwarded.");
        } finally {
            clearInterval(stageInterval);
            setStartingSandbox(false);
            setSandboxStatusMessage("");
        }
    };

    // Terminate sandbox session locally
    const handleResetSandbox = () => {
        if (confirm("Disconnect from current sandbox workspace? All ephemeral pod files will remain but your browser cache will reset.")) {
            setActiveSandboxId("");
            setIsSandboxRunning(false);
            setOpenTabs([]);
            setActiveTab(null);
            localStorage.clear();
        }
    };

    // Open a file tab in editor
    const handleSelectFile = (filePath) => {
        if (!openTabs.includes(filePath)) {
            setOpenTabs(prev => [...prev, filePath]);
        }
        setActiveTab(filePath);
    };

    // Close a file tab in editor
    const handleCloseTab = (filePath) => {
        const remaining = openTabs.filter(t => t !== filePath);
        setOpenTabs(remaining);
        
        if (activeTab === filePath) {
            if (remaining.length > 0) {
                setActiveTab(remaining[remaining.length - 1]);
            } else {
                setActiveTab(null);
            }
        }
    };

    // Refetch files on modifications
    const handleFileModified = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans">
            
            {/* 1. Header Navigation Control Bar */}
            <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 shadow-md select-none z-20">
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
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Kubernetes Ephemeral IDE Workspace</p>
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
                                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 hover:text-zinc-100 border border-zinc-700/50 rounded-lg text-xs font-medium transition-all"
                                onClick={handleResetSandbox}
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            className="relative overflow-hidden px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 group"
                            onClick={handleStartSandbox}
                            disabled={startingSandbox}
                        >
                            {startingSandbox ? (
                                <>
                                    <RefreshCw className="animate-spin" size={13} />
                                    <span>Creating Sandbox Pod...</span>
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
                        onClick={() => setShowAiChat(!showAiChat)}
                    >
                        <Sparkles size={14} />
                    </button>
                </div>
            </header>

            {/* 2. Main Body IDE Grid */}
            <main className="flex-1 flex overflow-hidden relative">
                
                {/* Master dynamic overlay for starting pods */}
                {startingSandbox && (
                    <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 select-none animate-fade-in">
                        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                            <Cpu className="text-indigo-400 w-8 h-8 animate-pulse" />
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                        </div>
                        <div className="text-center max-w-sm">
                            <h3 className="text-lg font-bold text-zinc-100 tracking-wide">Orchestrating Sandbox</h3>
                            <p className="text-xs text-indigo-400 font-mono mt-1.5 h-6 animate-pulse">{sandboxStatusMessage}</p>
                            <p className="text-[10px] text-zinc-500 mt-6 leading-relaxed bg-zinc-900 border border-zinc-850 p-3 rounded-lg flex items-start gap-2">
                                <Info size={14} className="text-zinc-400 flex-shrink-0 mt-0.5" />
                                <span>Starting containers inside our GitHub Codespace Kubernetes Cluster. This may take up to 30 seconds for complete resource binding.</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* COLUMN 1: File Explorer Tree */}
                <div className="w-[250px] flex-shrink-0 h-full border-r border-zinc-900 z-10">
                    <FileExplorer 
                        activeFile={activeTab}
                        onSelectFile={handleSelectFile}
                        refreshTrigger={refreshTrigger}
                    />
                </div>

                {/* COLUMN 2: Multi-tab Code Editor */}
                <div className="flex-1 min-w-0 h-full">
                    <CodeEditor 
                        openTabs={openTabs}
                        activeTab={activeTab}
                        onSelectTab={handleSelectFile}
                        onCloseTab={handleCloseTab}
                        onFileSaved={handleFileModified}
                    />
                </div>

                {/* COLUMN 3: Preview Panel & Terminal Split Frame */}
                <div className="w-[480px] flex-shrink-0 h-full border-l border-zinc-900 flex flex-col bg-zinc-950">
                    
                    {/* Tab Navigation header for Preview / Terminal */}
                    <div className="flex items-center justify-between px-3 bg-[#0a0a0c] border-b border-zinc-900 select-none">
                        <div className="flex gap-1.5">
                            <button
                                className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 ${
                                    activeRightTab === 'preview' 
                                        ? 'border-indigo-500 text-zinc-100' 
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                                onClick={() => setActiveRightTab('preview')}
                            >
                                <Globe size={12} />
                                <span>Live Preview</span>
                            </button>
                            <button
                                className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 ${
                                    activeRightTab === 'terminal' 
                                        ? 'border-indigo-500 text-zinc-100' 
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                                onClick={() => setActiveRightTab('terminal')}
                            >
                                <TermIcon size={12} />
                                <span>Workspace Shell</span>
                            </button>
                        </div>
                    </div>

                    {/* Split content frames */}
                    <div className="flex-1 min-h-0 relative">
                        <div className={`absolute inset-0 ${activeRightTab === 'preview' ? 'block' : 'hidden'}`}>
                            <LivePreview 
                                activeSandboxId={activeSandboxId}
                                isSandboxRunning={isSandboxRunning}
                                onStartSandbox={handleStartSandbox}
                            />
                        </div>
                        <div className={`absolute inset-0 ${activeRightTab === 'terminal' ? 'block' : 'hidden'}`}>
                            <Terminal 
                                activeSandboxId={activeSandboxId}
                            />
                        </div>
                    </div>
                </div>

                {/* COLUMN 4: Collapsible drawer AI Chat Copilot */}
                {showAiChat && (
                    <div className="w-[380px] flex-shrink-0 h-full border-l border-zinc-900 bg-zinc-900 animate-slide-in">
                        <AiCopilot 
                            activeSandboxId={activeSandboxId}
                            onFileModified={handleFileModified}
                        />
                    </div>
                )}

            </main>
        </div>
    );
}