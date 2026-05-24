import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { FileCode, Save, RefreshCw, X, AlertCircle } from 'lucide-react';
import { API_CONFIG } from '../config/runtime';

export default function CodeEditor({ 
    openTabs, 
    activeTab, 
    onSelectTab, 
    onCloseTab,
    onFileSaved
}) {
    const [fileContents, setFileContents] = useState({}); // original loaded contents: { path: content }
    const [draftContents, setDraftContents] = useState({}); // modified draft contents: { path: content }
    const [loadingFiles, setLoadingFiles] = useState({});
    const [savingFiles, setSavingFiles] = useState({});
    const editorRef = useRef(null);

    // Get Monaco language based on file extension
    const getLanguage = (filePath) => {
        if (!filePath) return 'javascript';
        const ext = filePath.split('.').pop().toLowerCase();
        switch (ext) {
            case 'jsx': return 'javascript';
            case 'js': return 'javascript';
            case 'json': return 'json';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'ts': return 'typescript';
            case 'tsx': return 'typescript';
            case 'md': return 'markdown';
            default: return 'plaintext';
        }
    };

    // Load file content when a tab is opened
    const loadFileContent = async (filePath) => {
        if (fileContents[filePath] !== undefined || loadingFiles[filePath]) return;

        setLoadingFiles(prev => ({ ...prev, [filePath]: true }));
        try {
            const res = await fetch(`${API_CONFIG.AGENT}/read-files?files=${encodeURIComponent(filePath)}`, {
                mode: 'cors'
            });
            const data = await res.json();
            if (data.status === "success" && data.results && data.results[0]) {
                const content = data.results[0].content || "";
                setFileContents(prev => ({ ...prev, [filePath]: content }));
                setDraftContents(prev => ({ ...prev, [filePath]: content }));
            }
        } catch (err) {
            console.error("Failed to load file content", err);
        } finally {
            setLoadingFiles(prev => ({ ...prev, [filePath]: false }));
        }
    };

    useEffect(() => {
        if (activeTab) {
            loadFileContent(activeTab);
        }
    }, [activeTab]);

    // Handle Editor mount
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;

        // Custom keyboard shortcut for Save (Ctrl+S)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            handleSaveActiveFile();
        });
    };

    // Handle editor text change
    const handleEditorChange = (value) => {
        if (activeTab) {
            setDraftContents(prev => ({
                ...prev,
                [activeTab]: value
            }));
        }
    };

    // Save the current active file
    const handleSaveActiveFile = async () => {
        if (!activeTab || savingFiles[activeTab]) return;

        const original = fileContents[activeTab];
        const draft = draftContents[activeTab];

        // Only save if there are changes
        if (original === draft) return;

        setSavingFiles(prev => ({ ...prev, [activeTab]: true }));
        try {
            const res = await fetch(`${API_CONFIG.AGENT}/update-files`, {
                method: 'PATCH',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    updates: [{ file: activeTab, content: draft }]
                })
            });
            const data = await res.json();
            if (data.status === "success") {
                // Update original content to match draft
                setFileContents(prev => ({ ...prev, [activeTab]: draft }));
                if (onFileSaved) {
                    onFileSaved(activeTab);
                }
            } else {
                alert("Failed to save file: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            alert("Network error: Could not save file");
        } finally {
            setSavingFiles(prev => ({ ...prev, [activeTab]: false }));
        }
    };

    // Check if active file is dirty (unsaved changes)
    const isDirty = (filePath) => {
        return fileContents[filePath] !== draftContents[filePath] && draftContents[filePath] !== undefined;
    };

    const activeContent = draftContents[activeTab] !== undefined ? draftContents[activeTab] : "";

    return (
        <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-900 text-zinc-300">
            {/* Tabs List */}
            <div className="flex items-center bg-[#0c0c0e] border-b border-zinc-900 overflow-x-auto custom-scrollbar select-none">
                {openTabs.map(filePath => {
                    const tabName = filePath.split('/').pop();
                    const isActive = filePath === activeTab;
                    const hasChanges = isDirty(filePath);
                    const isLoading = loadingFiles[filePath];

                    return (
                        <div 
                            key={filePath}
                            className={`group flex items-center gap-2 px-4 py-2 text-xs border-r border-zinc-900 cursor-pointer transition-all duration-200 ${
                                isActive 
                                    ? 'bg-zinc-900 text-zinc-100 border-t-2 border-indigo-500 font-medium' 
                                    : 'text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300'
                            }`}
                            onClick={() => onSelectTab(filePath)}
                        >
                            <FileCode size={13} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
                            <span>{tabName}</span>

                            {/* Dirty Indicator / Close Button */}
                            <div className="flex items-center justify-center w-4 h-4 ml-1">
                                {isLoading ? (
                                    <RefreshCw size={10} className="animate-spin text-zinc-500" />
                                ) : hasChanges ? (
                                    <span 
                                        className="w-2 h-2 rounded-full bg-indigo-400 block group-hover:hidden" 
                                        title="Unsaved changes"
                                    />
                                ) : null}
                                
                                <button
                                    className={`p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 ${
                                        hasChanges ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                                    } transition-opacity duration-150`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCloseTab(filePath);
                                    }}
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {openTabs.length === 0 && (
                    <div className="flex items-center px-4 py-2 text-zinc-600 text-xs italic">
                        No files open
                    </div>
                )}
            </div>

            {/* Breadcrumb / Action Bar */}
            {activeTab && (
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/30 border-b border-zinc-900 select-none">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                        <span>workspace</span>
                        {activeTab.split('/').map((part, idx) => (
                            <React.Fragment key={idx}>
                                <span>/</span>
                                <span className={idx === activeTab.split('/').length - 1 ? 'text-zinc-400' : ''}>
                                    {part}
                                </span>
                            </React.Fragment>
                        ))}
                        {isDirty(activeTab) && (
                            <span className="ml-2 text-indigo-400 font-semibold text-[10px] uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                Unsaved
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {isDirty(activeTab) && (
                            <button
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition-all duration-200 ${
                                    savingFiles[activeTab] ? 'opacity-80' : ''
                                }`}
                                disabled={savingFiles[activeTab]}
                                onClick={handleSaveActiveFile}
                            >
                                {savingFiles[activeTab] ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                    <Save size={12} />
                                )}
                                <span>Save</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Editor Workspace */}
            <div className="flex-1 min-h-0 relative">
                {activeTab ? (
                    loadingFiles[activeTab] ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-10 gap-2">
                            <RefreshCw size={24} className="animate-spin text-indigo-500" />
                            <span className="text-sm text-zinc-500">Loading {activeTab.split('/').pop()}...</span>
                        </div>
                    ) : (
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={getLanguage(activeTab)}
                            value={activeContent}
                            onChange={handleEditorChange}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: true },
                                fontSize: 13,
                                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace",
                                lineNumbers: "on",
                                roundedSelection: false,
                                scrollBeyondLastLine: false,
                                readOnly: false,
                                automaticLayout: true,
                                padding: { top: 12, bottom: 12 },
                                tabSize: 4,
                                fontLigatures: true,
                                cursorBlinking: "smooth",
                                cursorSmoothCaretAnimation: "on",
                                wordWrap: "on"
                            }}
                        />
                    )
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-3 select-none">
                        <FileCode size={48} className="text-zinc-800" />
                        <div className="text-center">
                            <p className="text-sm font-medium text-zinc-500">Welcome to your Cloud IDE Workspace</p>
                            <p className="text-xs text-zinc-600 mt-1">Select a file from the explorer or create a new one to begin editing</p>
                            <p className="text-xs text-indigo-500/50 mt-4 font-mono">Press Ctrl+S inside the editor to save changes</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
