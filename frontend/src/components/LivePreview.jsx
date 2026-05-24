import React, { useState, useRef, useEffect } from 'react';
import { 
    Play, 
    RefreshCw, 
    ExternalLink, 
    Monitor, 
    Tablet, 
    Smartphone, 
    ShieldAlert,
    Loader2
} from 'lucide-react';

const PREVIEW_HOST = "https://supreme-potato-pj4v4xgpxwpvc6p4-5173.app.github.dev";

export default function LivePreview({ activeSandboxId, isSandboxRunning, onStartSandbox }) {
    const [viewMode, setViewMode] = useState("desktop"); // desktop, tablet, mobile
    const [iframeKey, setIframeKey] = useState(0); // to force refresh iframe
    const [loading, setLoading] = useState(false);
    const iframeRef = useRef(null);

    const getPreviewUrl = () => {
        if (!activeSandboxId) return "";
        return `${PREVIEW_HOST}/preview/${activeSandboxId}/`;
    };

    const handleRefresh = () => {
        setLoading(true);
        setIframeKey(prev => prev + 1);
    };

    const handleOpenExternal = () => {
        const url = getPreviewUrl();
        if (url) {
            window.open(url, '_blank');
        }
    };

    const getFrameWidthClass = () => {
        if (viewMode === 'mobile') return 'w-[375px] max-w-full h-[667px] border border-zinc-800 rounded-3xl shadow-2xl bg-zinc-950';
        if (viewMode === 'tablet') return 'w-[768px] max-w-full h-[1024px] border border-zinc-800 rounded-2xl shadow-xl bg-zinc-950';
        return 'w-full h-full';
    };

    useEffect(() => {
        if (isSandboxRunning) {
            setLoading(true);
        }
    }, [isSandboxRunning, iframeKey]);

    const handleIframeLoaded = () => {
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-300">
            {/* Header / Address Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#09090b] border-b border-zinc-900 select-none">
                {/* Responsive View Mode Selector */}
                <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800/80">
                    <button 
                        title="Desktop View"
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                        onClick={() => setViewMode('desktop')}
                    >
                        <Monitor size={13} />
                    </button>
                    <button 
                        title="Tablet View"
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'tablet' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                        onClick={() => setViewMode('tablet')}
                    >
                        <Tablet size={13} />
                    </button>
                    <button 
                        title="Mobile View"
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                        onClick={() => setViewMode('mobile')}
                    >
                        <Smartphone size={13} />
                    </button>
                </div>

                {/* Fake Address Bar */}
                {isSandboxRunning && activeSandboxId && (
                    <div className="flex-1 max-w-lg mx-4 flex items-center gap-1.5 bg-zinc-950 border border-zinc-800/80 px-3 py-1 rounded-lg font-mono text-[10px] text-zinc-500 overflow-hidden select-text">
                        <span className="text-emerald-500 font-bold select-none">GET</span>
                        <span className="truncate">{getPreviewUrl()}</span>
                    </div>
                )}

                {/* Frame Controls */}
                <div className="flex items-center gap-1.5">
                    {isSandboxRunning && activeSandboxId && (
                        <>
                            <button 
                                title="Refresh Preview"
                                className={`p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded transition-colors ${loading ? 'animate-spin' : ''}`}
                                onClick={handleRefresh}
                            >
                                <RefreshCw size={13} />
                            </button>
                            <button 
                                title="Open in New Tab"
                                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded transition-colors"
                                onClick={handleOpenExternal}
                            >
                                <ExternalLink size={13} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Preview Frame Container */}
            <div className="flex-1 bg-zinc-900/10 p-4 flex justify-center items-center overflow-auto min-h-0 relative">
                {isSandboxRunning && activeSandboxId ? (
                    <div className={`transition-all duration-300 relative ${getFrameWidthClass()}`}>
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-10 gap-2">
                                <Loader2 className="animate-spin text-indigo-500" size={24} />
                                <span className="text-sm text-zinc-500 font-medium">Bundling Preview...</span>
                            </div>
                        )}
                        <iframe 
                            key={iframeKey}
                            ref={iframeRef}
                            src={getPreviewUrl()} 
                            className="w-full h-full border-none bg-white"
                            onLoad={handleIframeLoaded}
                            title="Sandbox Preview"
                            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-500 max-w-sm text-center gap-4 select-none p-6 glass-panel rounded-2xl border-zinc-800">
                        <Play size={40} className="text-zinc-700 animate-pulse" />
                        <div>
                            <p className="text-sm font-semibold text-zinc-400">Live Preview is Inactive</p>
                            <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                                {activeSandboxId 
                                    ? "Your sandbox session exists, but preview server has not completed startup probes."
                                    : "Start a Kubernetes sandbox session to enable dynamic Vite-React live previewing."
                                }
                            </p>
                        </div>
                        {!activeSandboxId && onStartSandbox && (
                            <button 
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                                onClick={onStartSandbox}
                            >
                                <Play size={12} fill="white" />
                                <span>Start Dev Sandbox</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
