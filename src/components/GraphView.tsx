import { useCallback, useEffect, useState, useRef, type FC } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeDragHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import EditableNode from './EditableNode';
import { useGraphStore } from '../store/graphStore';
import { colors } from '../theme/colors';
import { PINBOARD_HEIGHT } from './Pinboard';
import type { TaskNode } from '../store/graphStore';

// Custom Controls component that adds smooth animation to fit view button
const CustomControls: FC = () => {
  const { fitView } = useReactFlow();
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let fitViewButton: HTMLButtonElement | null = null;

    const findAndOverrideFitViewButton = () => {
      const controlsElement = controlsRef.current;
      if (!controlsElement) {
        timeoutId = setTimeout(findAndOverrideFitViewButton, 50);
        return;
      }

      // Find all buttons - fit view is typically the 3rd button (index 2)
      const buttons = controlsElement.querySelectorAll('button');
      if (buttons.length > 2) {
        fitViewButton = buttons[2] as HTMLButtonElement;
      }
      
      if (!fitViewButton) {
        timeoutId = setTimeout(findAndOverrideFitViewButton, 50);
        return;
      }

      // Override the click handler to use smooth animation
      const handleFitViewClick = (e: MouseEvent) => {
        e.stopPropagation();
        fitView({ padding: 0.2, duration: 500 });
      };

      fitViewButton.addEventListener('click', handleFitViewClick, true);

      return () => {
        fitViewButton?.removeEventListener('click', handleFitViewClick, true);
      };
    };

    const cleanup = findAndOverrideFitViewButton();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      cleanup?.();
    };
  }, [fitView]);

  return <div ref={controlsRef}><Controls /></div>;
};

// Move nodeTypes outside component to prevent recreation
const nodeTypes = { editableNode: EditableNode };

const GraphView: FC = () => {
  const { fitView } = useReactFlow();
  const { nodes: storeNodes, edges: storeEdges, setNodes: setStoreNodes, setEdges: setStoreEdges, deleteNode, setDragging, isAutoFormatting, editingNodeId, saveStateSnapshot } = useGraphStore();
  
  // CRITICAL: Use React Flow's optimized hooks for smooth rendering
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  
  // Track if we're currently dragging to prevent store sync during drag
  const isDraggingRef = useRef(false);
  const skipSyncRef = useRef(false);
  
  // Sync React Flow state with Zustand store when store updates
  // Also set draggable: false for the node being edited
  useEffect(() => {
    if (!skipSyncRef.current) {
      const nodesWithDraggable = storeNodes.map(node => ({
        ...node,
        draggable: editingNodeId === node.id ? false : undefined, // Disable dragging for editing node
      }));
      setNodes(nodesWithDraggable);
    }
    skipSyncRef.current = false;
  }, [storeNodes, setNodes, editingNodeId]);
  
  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);
  
  // CRITICAL: Track dragged node and initial positions for absolute positioning
  const [draggedNode, setDraggedNode] = useState<{ 
    id: string; 
    initialPosition: { x: number; y: number };
    initialChildPositions: Map<string, { x: number; y: number }>;
  } | null>(null);
  
  // Deletion confirmation modal state
  const [deletionModal, setDeletionModal] = useState<{
    nodeId: string;
    nodeLabel: string;
    childCount: number;
  } | null>(null);
  
  // PERFORMANCE FIX: Removed continuous store sync during drag
  // Store sync now only happens on drag stop (see onNodeDragStop)
  // This prevents the useEffect from running 60+ times per second during drag
  
  // Efficient descendant finder - memoized BFS
  const getDescendants = useCallback((nodeId: string): string[] => {
    const descendants = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = edges
        .filter(edge => edge.source === currentId)
        .map(edge => edge.target);
      
      children.forEach(childId => {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      });
    }
    
    return Array.from(descendants);
  }, [edges]);

  // Only fit view on initial mount, not on every change
  useEffect(() => {
    if (storeNodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 400, includeHiddenNodes: false });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected node on Backspace or Delete
      if (event.key === 'Backspace' || event.key === 'Delete') {
        // Check if we're editing a node (textarea is focused)
        const isEditingNode = document.activeElement?.tagName === 'TEXTAREA';
        
        // Only handle deletion if we're NOT editing
        if (!isEditingNode) {
          const selectedNode = nodes.find(n => n.selected);
          if (selectedNode) {
            // Prevent default browser behavior (going back in history)
            event.preventDefault();
            event.stopPropagation();
            
            // Count descendants (children) for the confirmation modal
            const descendants = getDescendants(selectedNode.id);
            const childCount = descendants.length - 1; // Exclude the node itself
            
            // Defer modal state update to avoid React warning about updating during render
            setTimeout(() => {
              setDeletionModal({
                nodeId: selectedNode.id,
                nodeLabel: selectedNode.data.label,
                childCount: childCount,
              });
            }, 0);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [nodes, getDescendants]);

  // CRITICAL: onNodeDragStart - capture initial positions of parent and all children
  const onNodeDragStart: NodeDragHandler = useCallback((_event, node) => {
    // Prevent dragging if this node is being edited (double check)
    if (editingNodeId === node.id || node.draggable === false) {
      return;
    }
    
    isDraggingRef.current = true;
    setDragging(true); // PERFORMANCE: Set global dragging state to disable expensive operations
    // Save state snapshot before drag starts for undo/redo
    saveStateSnapshot();
    // Disable auto-formatting transitions if active (user started dragging during auto-format)
    if (isAutoFormatting) {
      useGraphStore.getState().setAutoFormatting(false);
    }
    
    // Get all descendants
    const descendants = getDescendants(node.id);
    
    // Store initial positions of parent and all children
    const initialChildPositions = new Map<string, { x: number; y: number }>();
    descendants.forEach(childId => {
      const childNode = nodes.find(n => n.id === childId);
      if (childNode) {
        initialChildPositions.set(childId, { 
          x: childNode.position.x, 
          y: childNode.position.y 
        });
      }
    });
    
      setDraggedNode({ 
      id: node.id, 
      initialPosition: { x: node.position.x, y: node.position.y },
      initialChildPositions
    });
    }, [nodes, getDescendants, setDragging, saveStateSnapshot, isAutoFormatting, editingNodeId]);

  // CRITICAL: onNodeDrag - Use absolute positioning based on initial positions
  // This prevents accumulation errors from incremental updates
  const onNodeDrag: NodeDragHandler = useCallback((_event, node) => {
    if (!draggedNode || draggedNode.id !== node.id) return;

    // Calculate total movement from initial position (ABSOLUTE, not incremental)
    const totalDeltaX = node.position.x - draggedNode.initialPosition.x;
    const totalDeltaY = node.position.y - draggedNode.initialPosition.y;

    // Only update if there are children to move
    if (draggedNode.initialChildPositions.size > 0) {
      setNodes((nds) =>
        nds.map((n) => {
          // Only update descendants using their initial positions
          const initialPos = draggedNode.initialChildPositions.get(n.id);
          if (initialPos) {
            return {
              ...n,
              position: {
                x: initialPos.x + totalDeltaX, // Absolute position from initial
                y: initialPos.y + totalDeltaY,
              },
            };
          }
          return n; // Return unchanged node (no new object creation)
        })
      );
    }
  }, [draggedNode, setNodes]);
  
  // Wrap onNodesChange - React Flow handles everything natively
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Let React Flow's optimized onNodesChange handle the update
      // This updates the nodes state, which will trigger the useEffect to sync to Zustand
      onNodesChange(changes);
    },
    [onNodesChange]
  );
  
  // Sync to store when drag stops - PERFORMANCE FIX: Only sync once after drag completes
  const onNodeDragStop: NodeDragHandler = useCallback(() => {
    isDraggingRef.current = false;
    setDragging(false); // PERFORMANCE: Clear global dragging state
    // Sync to Zustand store ONCE after drag completes (not during drag)
    skipSyncRef.current = true; // Prevent sync loop
    setStoreNodes(nodes as TaskNode[]);
    // Note: State snapshot was saved on drag start, not here
    setDraggedNode(null);
  }, [nodes, setStoreNodes, setDragging]);

  // Wrap onEdgesChange to sync to Zustand store
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // Let React Flow's optimized onEdgesChange handle the update
      onEdgesChange(changes);
      
      // Sync to Zustand store
      setEdges((currentEdges) => {
        setStoreEdges(currentEdges);
        return currentEdges;
      });
    },
    [onEdgesChange, setEdges, setStoreEdges]
  );

  return (
    <div 
      style={{ width: '100%', height: `calc(100vh - 64px - ${PINBOARD_HEIGHT}px)`, backgroundColor: colors.neutral.gray50 }}
      className={isAutoFormatting ? 'auto-formatting' : ''}
    >
      <style>
        {`
          /* Custom cursor using SVG files from public folder */
          .react-flow__node {
            cursor: url('/open_cursor_drag.svg') 12 12, grab !important;
            will-change: transform; /* PERFORMANCE: Hint browser to optimize for transforms during drag */
          }
          .react-flow__node:active,
          .react-flow__node.dragging {
            cursor: url('/closed_cursor_drag.svg') 12 12, grabbing !important;
          }
          
          /* Smooth transitions ONLY during auto-format (not during drag) */
          .auto-formatting .react-flow__node {
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                        left 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                        top 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .auto-formatting .react-flow__edge-path {
            transition: d 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .auto-formatting .react-flow__edge path {
            transition: d 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .auto-formatting .react-flow__edgemarker path {
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
        `}
      </style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeDragThreshold={5}
        panOnDrag={editingNodeId === null ? [1, 2] : false} // Disable panning when any node is being edited
        fitView
        fitViewOptions={{ padding: 0.2, duration: 500 }} // 500ms smooth animation for fit view
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: { 
            stroke: colors.edge, 
            strokeWidth: 2.5,
            strokeLinecap: 'round',
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color={colors.edge} 
          gap={16} 
          size={1}
        />
        <CustomControls />
        <MiniMap
          nodeColor={() => colors.secondary.blue}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-white !border-2 !border-gray-200"
        />
      </ReactFlow>
      
      {/* Deletion Confirmation Modal */}
      {deletionModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setDeletionModal(null)}
        >
          <div 
            style={{
              backgroundColor: colors.neutral.white,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: colors.neutral.gray900,
              marginBottom: '16px',
              marginTop: 0,
            }}>
              Delete Node?
            </h2>
            
            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: colors.neutral.gray700,
              marginBottom: '24px',
            }}>
              Are you sure you want to delete <strong>"{deletionModal.nodeLabel}"</strong>?
              {deletionModal.childCount > 0 && (
                <>
                  <br /><br />
                  All {deletionModal.childCount} {deletionModal.childCount === 1 ? 'child' : 'children'} of this node will also be removed.
                </>
              )}
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setDeletionModal(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.neutral.gray100,
                  color: colors.neutral.gray700,
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray200}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray100}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const nodeIdToDelete = deletionModal.nodeId;
                  setDeletionModal(null);
                  // Defer deletion to avoid React warning about updating during render
                  // Also ensure sync happens by clearing skipSyncRef
                  skipSyncRef.current = false;
                  setTimeout(() => {
                    deleteNode(nodeIdToDelete);
                  }, 0);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.error}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;

