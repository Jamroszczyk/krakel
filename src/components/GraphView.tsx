import { useCallback, useEffect, useState, useRef, useMemo, type FC } from 'react';
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
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

// Create a context or store for drag-over state that nodes can access
// For now, we'll use a module-level variable that's updated via refs
let globalDragOverNodeId: string | null = null;
let globalDraggedNodeId: string | null = null;

// Stable nodeTypes - defined outside component to prevent recreation warnings
const createNodeTypes = () => ({
  editableNode: (props: any) => (
    <EditableNode 
      {...props} 
      isDragOver={globalDragOverNodeId === props.id} 
      isBeingDragged={globalDraggedNodeId === props.id} 
    />
  )
});

const nodeTypes = createNodeTypes();

const GraphView: FC = () => {
  const { fitView, screenToFlowPosition, getNodes } = useReactFlow();
  const { nodes: storeNodes, edges: storeEdges, setNodes: setStoreNodes, setEdges: setStoreEdges, deleteNodes, addNode, setDragging, isAutoFormatting, editingNodeId, saveStateSnapshot, nodeToCure, setNodeToCure, moveNode, canMoveNode } = useGraphStore();
  
  // CRITICAL: Use React Flow's optimized hooks for smooth rendering
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  
  // Track if we're currently dragging to prevent store sync during drag
  const isDraggingRef = useRef(false);
  const skipSyncRef = useRef(false);
  const skipEdgesSyncRef = useRef(false);
  
  // Track drag-over state for drop target highlighting
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  
  // Update global variables when state changes (for nodeTypes access)
  useEffect(() => {
    globalDragOverNodeId = dragOverNodeId;
    globalDraggedNodeId = draggedNodeId;
    // Force re-render of nodes by updating a dummy state or using React Flow's update mechanism
    // Actually, we need to trigger a re-render. Let's use a key or force update.
    // For now, the nodes will re-render when dragOverNodeId/draggedNodeId change via normal React flow
  }, [dragOverNodeId, draggedNodeId]);
  
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
  
  // Sync store edges to React Flow edges
  useEffect(() => {
    if (!skipEdgesSyncRef.current) {
      skipEdgesSyncRef.current = true; // Prevent reverse sync
      setEdges(storeEdges);
      // Reset after a tick to allow future syncs
      setTimeout(() => {
        skipEdgesSyncRef.current = false;
      }, 0);
    }
  }, [storeEdges, setEdges]);
  
  // Sync React Flow edges to Zustand store (after React Flow updates)
  useEffect(() => {
    if (!skipEdgesSyncRef.current) {
      skipEdgesSyncRef.current = true; // Prevent reverse sync
      setStoreEdges(edges);
      // Reset after a tick to allow future syncs
      setTimeout(() => {
        skipEdgesSyncRef.current = false;
      }, 0);
    }
  }, [edges, setStoreEdges]);
  
  // CRITICAL: Track dragged node and initial positions for absolute positioning
  const [draggedNode, setDraggedNode] = useState<{ 
    id: string; 
    initialPosition: { x: number; y: number };
    initialChildPositions: Map<string, { x: number; y: number }>;
  } | null>(null);
  
  // Deletion confirmation modal state
  const [deletionModal, setDeletionModal] = useState<{
    nodeIds: string[];
    nodeLabels: string[];
    totalChildCount: number;
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
      // Check if we're editing a node (textarea is focused)
      const isEditingNode = document.activeElement?.tagName === 'TEXTAREA';
      
      // Delete selected node on Backspace or Delete
      if (event.key === 'Backspace' || event.key === 'Delete') {
        // Only handle deletion if we're NOT editing
        if (!isEditingNode) {
          const selectedNodes = nodes.filter(n => n.selected);
          if (selectedNodes.length > 0) {
            // Prevent default browser behavior (going back in history)
            event.preventDefault();
            event.stopPropagation();
            
            // Collect all descendants of all selected nodes
            const allDescendants = new Set<string>();
            selectedNodes.forEach(node => {
              const descendants = getDescendants(node.id);
              descendants.forEach(id => allDescendants.add(id));
            });
            
            // Count total children (descendants excluding the selected nodes themselves)
            const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
            const totalChildCount = Array.from(allDescendants).filter(id => !selectedNodeIds.has(id)).length;
            
            // Defer modal state update to avoid React warning about updating during render
            setTimeout(() => {
              setDeletionModal({
                nodeIds: selectedNodes.map(n => n.id),
                nodeLabels: selectedNodes.map(n => n.data.label),
                totalChildCount: totalChildCount,
              });
            }, 0);
          }
        }
      }
      
      // Create child node on Enter (only if node is selected but not editing)
      if (event.key === 'Enter' && !event.shiftKey) {
        // Only handle if we're NOT editing (Enter should work normally in textarea)
        if (!isEditingNode) {
          const selectedNodes = nodes.filter(n => n.selected);
          // Only create child if exactly one node is selected
          if (selectedNodes.length === 1) {
            const selectedNode = selectedNodes[0];
            // Only create child if node can have children (level < 2)
            if (selectedNode.data.level < 2) {
              event.preventDefault();
              event.stopPropagation();
              const childLevel = (selectedNode.data.level + 1) as 1 | 2;
              addNode(selectedNode.id, childLevel);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [nodes, getDescendants, addNode]);

  // CRITICAL: onNodeDragStart - capture initial positions of parent and all children
  const onNodeDragStart: NodeDragHandler = useCallback((_event, node) => {
    // Prevent dragging if this node is being edited (double check)
    if (editingNodeId === node.id || node.draggable === false) {
      return;
    }
    
    isDraggingRef.current = true;
    setDragging(true); // PERFORMANCE: Set global dragging state to disable expensive operations
    setDraggedNodeId(node.id); // Track which node is being dragged
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
    
    // Check if dragging over another node (for drop target highlighting)
    // Use React Flow's coordinate conversion to find node at cursor position
    try {
      const flowPosition = screenToFlowPosition({
        x: _event.clientX,
        y: _event.clientY,
      });
      
      // Get all nodes from React Flow
      const allNodes = getNodes();
      
      // Find node at this position
      const targetNode = allNodes.find(n => {
        if (n.id === node.id) return false; // Don't check self
        
        // Approximate node bounds (adjust based on your actual node size)
        const nodeWidth = 200;
        const nodeHeight = 60;
        
        return (
          flowPosition.x >= n.position.x &&
          flowPosition.x <= n.position.x + nodeWidth &&
          flowPosition.y >= n.position.y &&
          flowPosition.y <= n.position.y + nodeHeight
        );
      });
      
      if (targetNode) {
        const canMove = canMoveNode(node.id, targetNode.id);
        console.log('Drag over check:', { dragged: node.id, target: targetNode.id, canMove, flowPos: flowPosition, targetPos: targetNode.position });
        if (canMove && dragOverNodeId !== targetNode.id) {
          setDragOverNodeId(targetNode.id);
        } else if (!canMove && dragOverNodeId !== null) {
          setDragOverNodeId(null);
        }
      } else {
        if (dragOverNodeId !== null) {
          setDragOverNodeId(null);
        }
      }
    } catch (e) {
      console.error('Error in drag-over detection:', e);
      if (dragOverNodeId !== null) {
        setDragOverNodeId(null);
      }
    }
  }, [draggedNode, setNodes, canMoveNode, dragOverNodeId, screenToFlowPosition, getNodes]);
  
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
  const onNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
    isDraggingRef.current = false;
    
    // Check if dropped on a valid target node
    // Use global variables to get latest values (they're updated in useEffect)
    const currentDragOver = globalDragOverNodeId;
    const currentDragged = globalDraggedNodeId;
    
    console.log('Drag stop:', { 
      currentDragged, 
      currentDragOver, 
      draggedNodeId,
      dragOverNodeId,
      canMove: currentDragOver && currentDragged ? canMoveNode(currentDragged, currentDragOver) : false 
    });
    
    if (currentDragOver && currentDragged && canMoveNode(currentDragged, currentDragOver)) {
      console.log('Moving node', currentDragged, 'to parent', currentDragOver);
      // Move the node to the new parent
      moveNode(currentDragged, currentDragOver);
      setDragOverNodeId(null);
      setDraggedNodeId(null);
      setDraggedNode(null);
      setDragging(false);
      return; // Don't sync positions, moveNode handles layout
    }
    
    // Reset drag-over state
    setDragOverNodeId(null);
    setDraggedNodeId(null);
    setDragging(false); // PERFORMANCE: Clear global dragging state
    // Sync to Zustand store ONCE after drag completes (not during drag)
    skipSyncRef.current = true; // Prevent sync loop
    setStoreNodes(nodes as TaskNode[]);
    // Note: State snapshot was saved on drag start, not here
    setDraggedNode(null);
  }, [nodes, setStoreNodes, setDragging, dragOverNodeId, draggedNodeId, canMoveNode, moveNode]);

  // WORKAROUND: When a node needs to be "cured", directly call the drag handlers AND update through React Flow
  // This triggers the exact same code path as a manual drag, including edge recalculation
  // Must be defined AFTER the drag handlers are defined
  useEffect(() => {
    if (nodeToCure) {
      // Reduced delay for faster animation - just enough for React Flow to register the node
      setTimeout(() => {
        const nodeToMove = nodes.find(n => n.id === nodeToCure);
        if (nodeToMove) {
          // Create a fake event object (React Flow handlers expect an event)
          const fakeEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
          } as React.MouseEvent;
          
          // Call onNodeDragStart to initialize drag state (exactly like manual drag)
          onNodeDragStart(fakeEvent as any, nodeToMove, nodes);
          
          // Move immediately (no extra frame delay) - move the node exactly 1px to the right
          const movedNode = {
            ...nodeToMove,
            position: { x: nodeToMove.position.x + 1, y: nodeToMove.position.y },
          };
          
          // CRITICAL: Update through React Flow's setNodes to trigger edge recalculation
          // This is what happens during a real drag - React Flow updates the node and recalculates edges
          const updatedNodes = nodes.map((n) =>
            n.id === nodeToCure
              ? movedNode
              : n
          );
          setNodes(updatedNodes);
          
          // Also call onNodeDrag to handle descendant movement (if any)
          onNodeDrag(fakeEvent as any, movedNode, updatedNodes);
          
          // Finish the drag immediately (no extra frame delay)
          onNodeDragStop(fakeEvent as any, movedNode, updatedNodes);
          
          // Clear the cure flag immediately
          setNodeToCure(null);
        } else {
          // If node not found, clear flag anyway to prevent infinite loop
          setNodeToCure(null);
        }
      }, 30); // Reduced delay for faster animation
    }
  }, [nodeToCure, nodes, onNodeDragStart, onNodeDrag, onNodeDragStop, setNodes, setNodeToCure]);

  // Wrap onEdgesChange - store sync happens in useEffect
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // Let React Flow's optimized onEdgesChange handle the update
      // The useEffect watching 'edges' will sync to Zustand store
      onEdgesChange(changes);
    },
    [onEdgesChange]
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
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px', paddingBottom: '16px' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.neutral.gray900,
                marginBottom: '16px',
                marginTop: 0,
              }}>
                {deletionModal.nodeIds.length === 1 ? 'Delete Node?' : `Delete ${deletionModal.nodeIds.length} Nodes?`}
              </h2>
              
              <div style={{
                fontSize: '16px',
                lineHeight: '1.6',
                color: colors.neutral.gray700,
              }}>
                {deletionModal.nodeIds.length === 1 ? (
                  <p style={{ margin: 0 }}>
                    Are you sure you want to delete <strong>"{deletionModal.nodeLabels[0]}"</strong>?
                    {deletionModal.totalChildCount > 0 && (
                      <>
                        <br /><br />
                        All {deletionModal.totalChildCount} {deletionModal.totalChildCount === 1 ? 'child' : 'children'} of this node will also be removed.
                      </>
                    )}
                  </p>
                ) : (
                  <>
                    <p style={{ margin: 0, marginBottom: '16px' }}>
                      Are you sure you want to delete <strong>{deletionModal.nodeIds.length} nodes</strong>?
                      {deletionModal.totalChildCount > 0 && (
                        <>
                          <br /><br />
                          All {deletionModal.totalChildCount} {deletionModal.totalChildCount === 1 ? 'child' : 'children'} of these nodes will also be removed.
                        </>
                      )}
                    </p>
                    <div style={{ fontSize: '14px', color: colors.neutral.gray600, marginTop: '8px' }}>
                      Nodes to delete:
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Scrollable list area */}
            {deletionModal.nodeIds.length > 1 && (
              <div style={{
                overflowY: 'auto',
                maxHeight: '300px',
                paddingLeft: '32px',
                paddingRight: '32px',
                paddingBottom: '16px',
              }}>
                <ul style={{ 
                  marginTop: '8px', 
                  paddingLeft: '20px',
                  marginBottom: 0,
                }}>
                  {deletionModal.nodeLabels.map((label, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{label}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              padding: '32px',
              paddingTop: '16px',
              borderTop: '1px solid ' + colors.neutral.gray200,
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
                  const nodeIdsToDelete = deletionModal.nodeIds;
                  setDeletionModal(null);
                  // Defer deletion to avoid React warning about updating during render
                  // Also ensure sync happens by clearing skipSyncRef
                  skipSyncRef.current = false;
                  setTimeout(() => {
                    deleteNodes(nodeIdsToDelete);
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

