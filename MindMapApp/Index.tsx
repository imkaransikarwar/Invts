import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// === TYPE DEFINITIONS ===

export type MindMapNode = {
    id: string;
    text: string;
    children: MindMapNode[];
    // Layout properties, will be calculated
    x: number;
    y: number;
    width: number;
    height: number;
    subtreeHeight?: number; // Internal property for layout calculation
};

export type MindMapResult = {
    root: MindMapNode;
    viewBox: { x: number; y: number; width: number; height: number };
};

// === LAYOUT CONSTANTS & ALGORITHM ===

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const HORIZONTAL_SPACING = 80;
const VERTICAL_SPACING = 30;
const PADDING = 20;

const calculateLayout = (node: MindMapNode): MindMapNode => {
    // Post-order traversal to calculate subtree heights
    const calculateSubtreeHeight = (n: MindMapNode) => {
        if (n.children.length === 0) {
            n.subtreeHeight = NODE_HEIGHT;
            return;
        }
        n.children.forEach(calculateSubtreeHeight);
        n.subtreeHeight = n.children.reduce((sum, child) => sum + (child.subtreeHeight || 0), 0) + (n.children.length - 1) * VERTICAL_SPACING;
    };

    // Pre-order traversal to assign coordinates
    const assignCoordinates = (n: MindMapNode, x: number, y: number) => {
        n.x = x;
        n.y = y;
        n.width = NODE_WIDTH;
        n.height = NODE_HEIGHT;

        if (n.children.length > 0) {
            const childrenTotalHeight = n.subtreeHeight || 0;
            let currentY = y - childrenTotalHeight / 2;

            n.children.forEach(child => {
                const childSubtreeHeight = child.subtreeHeight || NODE_HEIGHT;
                const childY = currentY + childSubtreeHeight / 2;
                assignCoordinates(child, x + NODE_WIDTH + HORIZONTAL_SPACING, childY);
                currentY += childSubtreeHeight + VERTICAL_SPACING;
            });
        }
    };

    const newRoot = JSON.parse(JSON.stringify(node)); // Deep copy to avoid mutation
    calculateSubtreeHeight(newRoot);
    assignCoordinates(newRoot, 0, 0);
    return newRoot;
};

// === COMPONENTS ===

const Connector: React.FC<{ from: MindMapNode, to: MindMapNode }> = React.memo(({ from, to }) => {
    const startX = from.x + from.width;
    const startY = from.y;
    const endX = to.x;
    const endY = to.y;

    const c1X = startX + HORIZONTAL_SPACING / 2;
    const c1Y = startY;
    const c2X = endX - HORIZONTAL_SPACING / 2;
    const c2Y = endY;

    const pathData = `M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}`;
    return <path d={pathData} stroke="var(--text-tertiary)" strokeWidth="2" fill="none" />;
});


const NodeComponent: React.FC<{
    node: MindMapNode;
    isSelected: boolean;
    isEditing: boolean;
    onSelect: (id: string) => void;
    onDoubleClick: (id: string) => void;
    onTextChange: (id: string, text: string) => void;
    onFinishEditing: () => void;
}> = React.memo(({ node, isSelected, isEditing, onSelect, onDoubleClick, onTextChange, onFinishEditing }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    
    return (
        <g 
            transform={`translate(${node.x - node.width / 2}, ${node.y - node.height / 2})`}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => onDoubleClick(node.id)}
            style={{ cursor: 'pointer' }}
        >
            <rect
                width={node.width}
                height={node.height}
                rx="8"
                fill="var(--surface)"
                stroke={isSelected ? 'var(--primary)' : 'var(--border)'}
                strokeWidth="2"
            />
            {isEditing ? (
                 <foreignObject x={5} y={5} width={node.width - 10} height={node.height - 10}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={node.text}
                        onChange={(e) => onTextChange(node.id, e.target.value)}
                        onBlur={onFinishEditing}
                        onKeyDown={(e) => { if (e.key === 'Enter') onFinishEditing(); }}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            textAlign: 'center',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                </foreignObject>
            ) : (
                <text
                    x={node.width / 2}
                    y={node.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--text-primary)"
                    style={{ pointerEvents: 'none', userSelect: 'none', fontSize: '0.95rem' }}
                >
                    {node.text}
                </text>
            )}
        </g>
    );
});


export const MindMapApp: React.FC<{
    onSave: (result: MindMapResult) => void;
    initialData?: MindMapResult | null;
}> = ({ onSave, initialData }) => {
    const defaultRoot: MindMapNode = {
        id: 'root', text: 'Central Topic', children: [],
        x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT
    };
    const defaultViewBox = { x: -300, y: -300, width: 600, height: 600 };

    const [root, setRoot] = useState<MindMapNode>(initialData?.root || defaultRoot);
    const [viewBox, setViewBox] = useState(initialData?.viewBox || defaultViewBox);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (initialData) {
            setRoot(initialData.root);
            setViewBox(initialData.viewBox);
            setSelectedNodeId('root');
        }
    }, [initialData]);
    
    const findNodeAndParent = (id: string, node: MindMapNode, parent: MindMapNode | null): { node: MindMapNode | null, parent: MindMapNode | null } => {
        if (node.id === id) return { node, parent };
        for (const child of node.children) {
            const found = findNodeAndParent(id, child, node);
            if (found.node) return found;
        }
        return { node: null, parent: null };
    };

    const updateNodeRecursively = (targetId: string, updateFn: (node: MindMapNode) => void, currentNode: MindMapNode): MindMapNode => {
        if (currentNode.id === targetId) {
            updateFn(currentNode);
            return { ...currentNode };
        }
        return {
            ...currentNode,
            children: currentNode.children.map(child => updateNodeRecursively(targetId, updateFn, child))
        };
    };

    const handleAddChild = () => {
        if (!selectedNodeId) return;
        const newId = `node-${Date.now()}`;
        setRoot(prevRoot => updateNodeRecursively(selectedNodeId, (node) => {
            node.children.push({
                id: newId, text: 'New Idea', children: [],
                x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT
            });
        }, prevRoot));
        setSelectedNodeId(newId);
        setEditingNodeId(newId);
    };

    const handleDeleteNode = () => {
        if (!selectedNodeId || selectedNodeId === 'root') return;
        const newRoot = JSON.parse(JSON.stringify(root)); // Deep copy
        const { parent } = findNodeAndParent(selectedNodeId, newRoot, null);
        if (parent) {
            parent.children = parent.children.filter(child => child.id !== selectedNodeId);
            setRoot(newRoot);
            setSelectedNodeId(parent.id);
        }
    };

    const handleTextChange = (id: string, text: string) => {
        setRoot(prevRoot => updateNodeRecursively(id, (node) => {
            node.text = text;
        }, prevRoot));
    };

    const handleZoom = (factor: number) => {
        setViewBox(v => ({
            x: v.x + v.width * (1 - factor) / 2,
            y: v.y + v.height * (1 - factor) / 2,
            width: v.width * factor,
            height: v.height * factor,
        }));
    };

    const handlePanStart = (e: React.MouseEvent) => {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePanMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        const dx = (e.clientX - panStartRef.current.x) * (viewBox.width / window.innerWidth);
        const dy = (e.clientY - panStartRef.current.y) * (viewBox.height / window.innerHeight);
        setViewBox(v => ({ ...v, x: v.x - dx, y: v.y - dy }));
        panStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePanEnd = () => setIsPanning(false);

    const laidOutRoot = useMemo(() => calculateLayout(root), [root]);
    const { allNodes, allConnectors } = useMemo(() => {
        const nodes: MindMapNode[] = [];
        const connectors: { from: MindMapNode, to: MindMapNode }[] = [];
        const traverse = (node: MindMapNode) => {
            nodes.push(node);
            node.children.forEach(child => {
                connectors.push({ from: node, to: child });
                traverse(child);
            });
        };
        traverse(laidOutRoot);
        return { allNodes: nodes, allConnectors: connectors };
    }, [laidOutRoot]);

    return (
        <div className="mindmap-container">
            <div className="mindmap-toolbar">
                <button onClick={() => onSave({ root, viewBox })} title="Save Mind Map"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg></button>
                <div className="toolbar-divider"></div>
                <button onClick={handleAddChild} disabled={!selectedNodeId} title="Add Child Node"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10h.01"/><path d="M3.5 10H10c.83 0 1.5.67 1.5 1.5v0c0 .83-.67 1.5-1.5 1.5H6"/><path d="M20.5 14H14c-.83 0-1.5-.67-1.5-1.5v0c0-.83.67-1.5 1.5-1.5h2.5"/></svg></button>
                <button onClick={handleDeleteNode} disabled={!selectedNodeId || selectedNodeId === 'root'} title="Delete Node"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                <div className="toolbar-divider"></div>
                <button onClick={() => handleZoom(1.25)} title="Zoom In"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>
                <button onClick={() => handleZoom(0.8)} title="Zoom Out"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg></button>
            </div>
            <svg
                className="mindmap-canvas"
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                onWheel={(e) => { e.preventDefault(); handleZoom(e.deltaY > 0 ? 1.1 : 0.9); }}
            >
                <g>
                    {allConnectors.map((c, i) => <Connector key={`${c.from.id}-${c.to.id}`} from={c.from} to={c.to} />)}
                    {allNodes.map(node => (
                        <NodeComponent
                            key={node.id}
                            node={node}
                            isSelected={selectedNodeId === node.id}
                            isEditing={editingNodeId === node.id}
                            onSelect={setSelectedNodeId}
                            onDoubleClick={setEditingNodeId}
                            onTextChange={handleTextChange}
                            onFinishEditing={() => setEditingNodeId(null)}
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
};