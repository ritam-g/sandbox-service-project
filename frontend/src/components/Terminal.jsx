import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal as TermIcon, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import 'xterm/css/xterm.css';
import { API_CONFIG } from '../config/runtime';

export default function Terminal({ activeSandboxId }) {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);

    const initTerminal = () => {
        if (!terminalRef.current) return;
        if (xtermRef.current) return; // Already initialized

        setConnecting(true);

        // Initialize XTerm
        const term = new XTerm({
            theme: {
                background: '#09090b', // zinc-950
                foreground: '#e4e4e7', // zinc-200
                cursor: '#818cf8',     // indigo-400
                black: '#18181b',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#eab308',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#fafafa'
            },
            cursorBlink: true,
            fontSize: 12,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            rows: 24
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome message
        term.writeln("\x1b[1;35m🚀 Welcome to the Cloud IDE Live Terminal!\x1b[0m");
        term.writeln("\x1b[90mConnecting to agent websocket session...\x1b[0m");

        // Socket.IO connection
        const socket = io(API_CONFIG.AGENT, {
            transports: ['websocket']
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            setConnecting(false);
            term.writeln("\r\x1b[1;32m🟢 Terminal connected to container workspace!\x1b[0m\r\n");
            
            // Trigger return to load prompt
            socket.emit('terminal-input', "");
        });

        socket.on('disconnect', () => {
            setConnected(false);
            term.writeln("\r\n\x1b[1;31m🔴 Terminal disconnected from workspace.\x1b[0m");
        });

        socket.on('connect_error', () => {
            setConnecting(false);
            setConnected(false);
            term.writeln("\r\n\x1b[1;31m⚠️ Websocket connection error. Retrying...\x1b[0m");
        });

        // PTY stream output -> XTerm renderer
        socket.on('terminal-output', (data) => {
            term.write(data);
        });
    };

    useEffect(() => {
        initTerminal();

        // Fit terminal on resize
        const handleResize = () => {
            if (fitAddonRef.current) {
                try {
                    fitAddonRef.current.fit();
                } catch (e) {
                    console.log("Terminal resize fit ignored");
                }
            }
        };

        window.addEventListener('resize', handleResize);

        // Keep a periodic check to keep container terminal active or fit
        const fitInterval = setInterval(handleResize, 1500);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(fitInterval);
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (xtermRef.current) {
                xtermRef.current.dispose();
                xtermRef.current = null;
            }
        };
    }, [activeSandboxId]);

    // Reconnect terminal session
    const handleReconnect = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        if (xtermRef.current) {
            xtermRef.current.dispose();
            xtermRef.current = null;
        }
        initTerminal();
    };

    // Buffer key events for line-oriented PTY execution
    useEffect(() => {
        if (!xtermRef.current || !socketRef.current) return;

        let inputBuffer = "";

        const disposable = xtermRef.current.onData((data) => {
            if (!socketRef.current || !socketRef.current.connected) return;

            // Handle carriage return or enter
            if (data === '\r' || data === '\n') {
                // Send the line buffer to the socket server (which appends \r and executes it)
                socketRef.current.emit('terminal-input', inputBuffer);
                xtermRef.current.write('\r\n');
                inputBuffer = "";
            } 
            // Handle Backspace (ASCII value 127 or 8)
            else if (data === '\u007f' || data === '\b') {
                if (inputBuffer.length > 0) {
                    inputBuffer = inputBuffer.slice(0, -1);
                    xtermRef.current.write('\b \b'); // Move cursor back, erase, move cursor back
                }
            } 
            // Handle arrow keys or special ANSI escape codes (usually start with \u001b)
            else if (data.startsWith('\u001b')) {
                // Let's send arrow keys directly to see if PTY handles it, 
                // but standard raw characters we buffer.
                // For simplicity, buffer alphanumeric and common symbols.
                // If it is an escape code, we can bypass buffer or ignore to prevent weird inputs.
            } 
            // Standard printable characters
            else {
                inputBuffer += data;
                xtermRef.current.write(data);
            }
        });

        return () => {
            disposable.dispose();
        };
    }, [connected]);

    return (
        <div className="flex flex-col h-full bg-zinc-950 text-zinc-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#09090b] border-b border-zinc-900 select-none">
                <div className="flex items-center gap-2">
                    <TermIcon size={14} className="text-zinc-400" />
                    <span className="font-semibold text-xs tracking-wider uppercase text-zinc-400">Terminal Shell</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        {connected ? (
                            <>
                                <Wifi size={12} className="text-emerald-500" />
                                <span className="text-emerald-500/80 font-medium">Online</span>
                            </>
                        ) : connecting ? (
                            <>
                                <RefreshCw size={12} className="animate-spin text-indigo-400" />
                                <span className="text-indigo-400/80">Connecting...</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={12} className="text-red-500" />
                                <span className="text-red-500/80 font-medium">Offline</span>
                            </>
                        )}
                    </div>
                    <button 
                        title="Reset Shell Session"
                        onClick={handleReconnect}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            {/* Terminal Workspace Container */}
            <div className="flex-1 bg-zinc-950 p-2 min-h-0 relative overflow-hidden">
                <div 
                    ref={terminalRef} 
                    className="w-full h-full custom-scrollbar"
                />
            </div>
        </div>
    );
}
