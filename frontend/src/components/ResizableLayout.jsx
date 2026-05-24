import React, { useState, useCallback, useRef } from 'react';

export default function ResizableLayout({
    sidebar,
    editor,
    preview,
    terminal,
    aiChat,
    showAiChat
}) {
    const [sidebarWidth, setSidebarWidth] = useState(240);
    const [rightPanelWidth, setRightPanelWidth] = useState(480);
    const [previewHeight, setPreviewHeight] = useState(400); // vertical split height for preview

    const containerRef = useRef(null);

    // Sidebar Resize Dragging (Horizontal)
    const handleSidebarResize = useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        
        const startWidth = sidebarWidth;
        const startX = mouseDownEvent.clientX;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = Math.min(Math.max(180, startWidth + deltaX), 400);
            setSidebarWidth(newWidth);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [sidebarWidth]);

    // Right Panel Resize Dragging (Horizontal)
    const handleRightPanelResize = useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();

        const startWidth = rightPanelWidth;
        const startX = mouseDownEvent.clientX;

        const onMouseMove = (moveEvent) => {
            const deltaX = startX - moveEvent.clientX; // drag left to increase width
            const newWidth = Math.min(Math.max(300, startWidth + deltaX), 800);
            setRightPanelWidth(newWidth);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [rightPanelWidth]);

    // Preview / Terminal Split Dragging (Vertical)
    const handleVerticalResize = useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();

        const startHeight = previewHeight;
        const startY = mouseDownEvent.clientY;

        const onMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.min(Math.max(150, startHeight + deltaY), 700);
            setPreviewHeight(newHeight);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [previewHeight]);

    return (
        <div ref={containerRef} className="flex-1 flex overflow-hidden w-full h-full relative select-none">
            {/* 1. File Explorer Sidebar */}
            <div style={{ width: `${sidebarWidth}px` }} className="flex-shrink-0 h-full overflow-hidden">
                {sidebar}
            </div>

            {/* Drag Divider Sidebar-Editor */}
            <div 
                className="w-1 hover:w-1.5 bg-transparent hover:bg-indigo-500/50 cursor-col-resize flex-shrink-0 transition-all duration-150 h-full border-r border-zinc-900"
                onMouseDown={handleSidebarResize}
            />

            {/* 2. Monaco Editor (takes remaining center space) */}
            <div className="flex-1 min-w-0 h-full overflow-hidden">
                {editor}
            </div>

            {/* Drag Divider Editor-RightPanel */}
            <div 
                className="w-1 hover:w-1.5 bg-transparent hover:bg-indigo-500/50 cursor-col-resize flex-shrink-0 transition-all duration-150 h-full border-l border-zinc-900"
                onMouseDown={handleRightPanelResize}
            />

            {/* 3. Live Preview & Terminal Vertically Stacked Right Panel */}
            <div style={{ width: `${rightPanelWidth}px` }} className="flex-shrink-0 h-full flex flex-col bg-zinc-950 overflow-hidden">
                {/* Preview Frame */}
                <div style={{ height: `${previewHeight}px` }} className="flex-shrink-0 w-full overflow-hidden">
                    {preview}
                </div>

                {/* Vertical Drag Divider */}
                <div 
                    className="h-1 hover:h-1.5 bg-transparent hover:bg-indigo-500/50 cursor-row-resize flex-shrink-0 transition-all duration-150 w-full border-b border-zinc-900"
                    onMouseDown={handleVerticalResize}
                />

                {/* Terminal Shell */}
                <div className="flex-1 min-h-0 w-full overflow-hidden">
                    {terminal}
                </div>
            </div>

            {/* 4. Collapsible drawer AI Chat Copilot (far right) */}
            {showAiChat && (
                <>
                    {/* Visual Border */}
                    <div className="w-[1px] bg-zinc-900 flex-shrink-0 h-full" />
                    <div className="w-[360px] flex-shrink-0 h-full overflow-hidden bg-zinc-900">
                        {aiChat}
                    </div>
                </>
            )}
        </div>
    );
}
