import React, { useState, useEffect } from 'react';
import { 
    Folder, 
    FolderOpen, 
    File, 
    FileCode, 
    Trash2, 
    Plus, 
    Loader2, 
    ChevronDown, 
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { API_CONFIG } from '../config/runtime';

export default function FileExplorer({ activeFile, onSelectFile, refreshTrigger }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState({ "src": true }); // src expanded by default
    const [showCreateInput, setShowCreateInput] = useState(null); // { parentPath, type: 'file' | 'folder' }
    const [newItemName, setNewItemName] = useState("");

    // Load file tree
    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_CONFIG.AGENT}/list-files`, { mode: 'cors' });
            const data = await res.json();
            if (data.status === "success") {
                setFiles(data.files);
            } else {
                setError(data.message || "Failed to load files");
            }
        } catch (err) {
            setError("Could not connect to agent filesystem");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [refreshTrigger]);

    // Parse flat array of paths into hierarchical structure
    const buildTree = (filePaths) => {
        const root = { name: "Root", type: "directory", path: "", children: {} };
        
        filePaths.forEach(filePath => {
            const parts = filePath.split('/');
            let current = root;
            
            parts.forEach((part, index) => {
                const currentPath = parts.slice(0, index + 1).join('/');
                const isLast = index === parts.length - 1;
                
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        path: currentPath,
                        type: isLast ? 'file' : 'directory',
                        children: {}
                    };
                }
                current = current.children[part];
            });
        });
        
        return root;
    };

    // Toggle folder expansion
    const toggleFolder = (path) => {
        setExpandedFolders(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    // Create a new file or directory
    const handleCreateItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        const parentPath = showCreateInput.parentPath;
        const fullPath = parentPath ? `${parentPath}/${newItemName.trim()}` : newItemName.trim();
        const type = showCreateInput.type;

        try {
            if (type === 'file') {
                const res = await fetch(`${API_CONFIG.AGENT}/create-files`, {
                    method: 'POST',
                    mode: 'cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        files: [{ file: fullPath, content: "" }]
                    })
                });
                const data = await res.json();
                if (data.status === "success") {
                    fetchFiles();
                    onSelectFile(fullPath); // Open newly created file
                } else {
                    alert(data.message || "Error creating file");
                }
            } else {
                // Directories are implicitly created in this API upon file creation, 
                // but let's write a placeholder blank file in the directory to materialize it.
                const placeholderPath = `${fullPath}/.keep`;
                const res = await fetch(`${API_CONFIG.AGENT}/create-files`, {
                    method: 'POST',
                    mode: 'cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        files: [{ file: placeholderPath, content: "" }]
                    })
                });
                const data = await res.json();
                if (data.status === "success") {
                    fetchFiles();
                    setExpandedFolders(prev => ({ ...prev, [fullPath]: true }));
                } else {
                    alert(data.message || "Error creating folder");
                }
            }
        } catch (err) {
            alert("Connection error while creating item.");
        } finally {
            setShowCreateInput(null);
            setNewItemName("");
        }
    };

    // Delete a file
    const handleDeleteFile = async (path, e) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete ${path}?`)) return;

        try {
            const res = await fetch(`${API_CONFIG.AGENT}/delete-files`, {
                method: 'DELETE',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: [path]
                })
            });
            const data = await res.json();
            if (data.status === "success") {
                fetchFiles();
            } else {
                alert("Failed to delete: " + data.message);
            }
        } catch (err) {
            alert("Connection error while deleting file.");
        }
    };

    // Render folder tree node recursively
    const renderNode = (node) => {
        const sortedChildren = Object.values(node.children).sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return (
            <div key={node.path || "root-node"} className="pl-3">
                {sortedChildren.map(child => {
                    const isDir = child.type === 'directory';
                    const isExpanded = expandedFolders[child.path];
                    const isActive = activeFile === child.path;

                    // Exclude helper/hidden directory keep files from showing
                    if (child.name === '.keep') return null;

                    return (
                        <div key={child.path} className="select-none">
                            {/* Tree row */}
                            <div 
                                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-200 ${
                                    isActive 
                                        ? 'bg-indigo-600/30 text-indigo-200 border-l-2 border-indigo-500' 
                                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                                }`}
                                onClick={() => {
                                    if (isDir) {
                                        toggleFolder(child.path);
                                    } else {
                                        onSelectFile(child.path);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    {isDir ? (
                                        <>
                                            {isExpanded ? <ChevronDown size={14} className="text-zinc-500 flex-shrink-0" /> : <ChevronRight size={14} className="text-zinc-500 flex-shrink-0" />}
                                            {isExpanded ? <FolderOpen size={16} className="text-amber-400 flex-shrink-0" /> : <Folder size={16} className="text-amber-400 flex-shrink-0" />}
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-3.5 flex-shrink-0" /> {/* Spacer instead of arrow */}
                                            {child.name.endsWith('.jsx') || child.name.endsWith('.js') || child.name.endsWith('.html') ? (
                                                <FileCode size={16} className="text-sky-400 flex-shrink-0" />
                                            ) : (
                                                <File size={16} className="text-zinc-400 flex-shrink-0" />
                                            )}
                                        </>
                                    )}
                                    <span className="truncate">{child.name}</span>
                                </div>

                                {/* Hover actions */}
                                <div className="hidden group-hover:flex items-center gap-1">
                                    {isDir && (
                                        <>
                                            <button 
                                                title="New File"
                                                className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-700/50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowCreateInput({ parentPath: child.path, type: 'file' });
                                                }}
                                            >
                                                <Plus size={13} />
                                            </button>
                                            <button 
                                                title="New Folder"
                                                className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-700/50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowCreateInput({ parentPath: child.path, type: 'folder' });
                                                }}
                                            >
                                                <Folder size={13} />
                                            </button>
                                        </>
                                    )}
                                    {!isDir && (
                                        <button 
                                            title="Delete File"
                                            className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-700/50"
                                            onClick={(e) => handleDeleteFile(child.path, e)}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Create input box inline */}
                            {showCreateInput && showCreateInput.parentPath === child.path && (
                                <form onSubmit={handleCreateItem} className="pl-6 pr-2 py-1 flex items-center gap-1 bg-zinc-800/40 rounded-lg">
                                    {showCreateInput.type === 'file' ? <File size={12} className="text-zinc-500" /> : <Folder size={12} className="text-amber-500" />}
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder={showCreateInput.type === 'file' ? 'filename.jsx' : 'folder name'}
                                        className="w-full bg-transparent border-none text-xs text-zinc-200 outline-none p-0"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onBlur={() => setShowCreateInput(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') setShowCreateInput(null);
                                        }}
                                    />
                                </form>
                            )}

                            {/* Render directory children recursively */}
                            {isDir && isExpanded && renderNode(child)}
                        </div>
                    );
                })}
            </div>
        );
    };

    const fileTree = buildTree(files);

    return (
        <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-zinc-300 select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="font-semibold text-xs tracking-wider uppercase text-zinc-400">Workspace Files</span>
                <div className="flex items-center gap-1">
                    <button 
                        title="New Root File"
                        className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                        onClick={() => setShowCreateInput({ parentPath: "", type: 'file' })}
                    >
                        <Plus size={14} />
                    </button>
                    <button 
                        title="New Root Folder"
                        className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                        onClick={() => setShowCreateInput({ parentPath: "", type: 'folder' })}
                    >
                        <Folder size={14} />
                    </button>
                    <button 
                        title="Refresh File Explorer"
                        className={`p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 ${loading ? 'animate-spin' : ''}`}
                        onClick={fetchFiles}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
                {loading && files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-500">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="text-xs">Loading tree...</span>
                    </div>
                ) : error ? (
                    <div className="p-4 text-xs text-red-400 bg-red-950/20 rounded-lg m-2 border border-red-900/30">
                        {error}
                        <button className="block mt-2 underline text-indigo-400" onClick={fetchFiles}>Retry</button>
                    </div>
                ) : (
                    <div>
                        {/* Root level create input */}
                        {showCreateInput && showCreateInput.parentPath === "" && (
                            <form onSubmit={handleCreateItem} className="flex items-center gap-1.5 px-3 py-1.5 m-1 bg-zinc-800/70 rounded-lg border border-zinc-700/50">
                                {showCreateInput.type === 'file' ? <File size={13} className="text-zinc-400" /> : <Folder size={13} className="text-amber-400" />}
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder={showCreateInput.type === 'file' ? 'filename.js' : 'folder_name'}
                                    className="w-full bg-transparent border-none text-xs text-zinc-200 outline-none p-0 font-medium"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onBlur={() => setShowCreateInput(null)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') setShowCreateInput(null);
                                    }}
                                />
                            </form>
                        )}
                        
                        {renderNode(fileTree)}
                    </div>
                )}
            </div>
        </div>
    );
}
