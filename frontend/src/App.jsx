import React, { useState, useEffect } from 'react';
import { Cpu, Info } from 'lucide-react';
import Topbar from './components/Topbar';
import ResizableLayout from './components/ResizableLayout';
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
    const [showAiChat, setShowAiChat] = useState(true);

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

        // Cycle through stage steps for delightful loading visuals
        let stageIdx = 0;
        const stageInterval = setInterval(() => {
            if (stageIdx < loadingStages.length - 1) {
                stageIdx++;
                setSandboxStatusMessage(loadingStages[stageIdx]);
            }
        }, 3000);

        try {
            const res = await fetch(`${ORCHESTRATOR_API}/api/sandbox/start`, {
                method: 'POST',
                mode: "cors"
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
            {/* Top Navigation Control Bar Component */}
            <Topbar 
                activeSandboxId={activeSandboxId}
                isSandboxRunning={isSandboxRunning}
                startingSandbox={startingSandbox}
                onStartSandbox={handleStartSandbox}
                onResetSandbox={handleResetSandbox}
                showAiChat={showAiChat}
                onToggleAiChat={() => setShowAiChat(!showAiChat)}
            />

            {/* Main Body Resizable IDE Panel Grid Layout */}
            <div className="flex-1 flex overflow-hidden relative w-full h-full">
                
                {/* Master overlay for starting pods */}
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

                <ResizableLayout 
                    sidebar={
                        <FileExplorer 
                            activeFile={activeTab}
                            onSelectFile={handleSelectFile}
                            refreshTrigger={refreshTrigger}
                        />
                    }
                    editor={
                        <CodeEditor 
                            openTabs={openTabs}
                            activeTab={activeTab}
                            onSelectTab={handleSelectFile}
                            onCloseTab={handleCloseTab}
                            onFileSaved={handleFileModified}
                        />
                    }
                    preview={
                        <LivePreview 
                            activeSandboxId={activeSandboxId}
                            isSandboxRunning={isSandboxRunning}
                            onStartSandbox={handleStartSandbox}
                        />
                    }
                    terminal={
                        <Terminal 
                            activeSandboxId={activeSandboxId}
                        />
                    }
                    aiChat={
                        <AiCopilot 
                            activeSandboxId={activeSandboxId}
                            onFileModified={handleFileModified}
                        />
                    }
                    showAiChat={showAiChat}
                />
            </div>
        </div>
    );
}