import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Node, Edge } from 'reactflow';
import { colors } from '../theme/colors';
import { calculateLayout } from '../utils/layoutEngine';

export interface TaskNode extends Node {
  data: {
    label: string;
    level: 0 | 1 | 2;
    slot: number;
    completed?: boolean;
  };
}

interface GraphState {
  nodes: TaskNode[];
  edges: Edge[];
  pinnedNodeIds: string[];
  batchTitle: string;
  isDragging: boolean; // PERFORMANCE: Track dragging state to disable expensive operations
  isAutoFormatting: boolean; // Track auto-formatting state to enable smooth transitions
  editingNodeId: string | null; // Track which node is currently being edited (to disable dragging/panning)
  nodeToCure: string | null; // Node ID that needs to be "cured" by simulating a drag (for edge animation fix)
  undoStack: string[]; // Array of JSON state snapshots (max 5)
  redoStack: string[]; // Array of JSON state snapshots (max 5)
  addNode: (parentId?: string, level?: 0 | 1 | 2) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  toggleNodeCompleted: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void; // Delete multiple nodes at once
  swapNodeSlots: (nodeId: string, targetSlot: number) => void;
  applyAutoLayout: () => void;
  pinNode: (nodeId: string) => void;
  unpinNode: (nodeId: string) => void;
  unpinAll: () => void;
  reorderPinnedNodes: (fromIndex: number, toIndex: number) => void;
  toggleAllPinnedCompleted: () => void;
  setBatchTitle: (title: string) => void;
  setDragging: (isDragging: boolean) => void;
  setAutoFormatting: (isAutoFormatting: boolean) => void;
  setEditingNodeId: (nodeId: string | null) => void; // Set which node is being edited
  setNodeToCure: (nodeId: string | null) => void; // Set which node needs to be cured
  deselectAllNodes: () => void; // Deselect all nodes
  saveStateSnapshot: () => void; // Save current state to undo stack
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToJSON: () => string;
  loadFromJSON: (json: string) => void;
  setNodes: (nodes: TaskNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  moveNode: (nodeId: string, newParentId: string) => void; // Move node and all children to new parent
  canMoveNode: (nodeId: string, targetParentId: string) => boolean; // Check if move is valid
}

// Create initial demo structure
const createInitialGraph = () => {
  // Root node
  const rootNode: TaskNode = {
    id: 'root-1',
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: { label: 'Root Task', level: 0, slot: 0 },
  };

  // Child nodes (Level 1)
  const subtask1: TaskNode = {
    id: 'subtask-1',
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: { label: 'Subtask 1', level: 1, slot: 0 },
  };

  const subtask2: TaskNode = {
    id: 'subtask-2',
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: { label: 'Subtask 2', level: 1, slot: 1 },
  };

  // Leaf nodes for Subtask 1 (Level 2)
  const todo1_1: TaskNode = {
    id: 'todo-1-1',
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: { label: 'Todo 1', level: 2, slot: 0, completed: false },
  };

  const todo1_2: TaskNode = {
    id: 'todo-1-2',
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: { label: 'Todo 2', level: 2, slot: 1, completed: false },
  };

  // Leaf nodes for Subtask 2 (Level 2)
  const todo2_1: TaskNode = {
    id: 'todo-2-1',
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: { label: 'Todo 1', level: 2, slot: 2, completed: false },
  };

  const todo2_2: TaskNode = {
    id: 'todo-2-2',
    type: 'editableNode',
    position: { x: 0, y: 0 },
    data: { label: 'Todo 2', level: 2, slot: 3, completed: false },
  };

  const initialNodes = [rootNode, subtask1, subtask2, todo1_1, todo1_2, todo2_1, todo2_2];

  const initialEdges: Edge[] = [
    {
      id: 'edge-root-subtask1',
      source: 'root-1',
      target: 'subtask-1',
      type: 'default',
      animated: false,
      style: { stroke: colors.edge, strokeWidth: 2.5 },
    },
    {
      id: 'edge-root-subtask2',
      source: 'root-1',
      target: 'subtask-2',
      type: 'default',
      animated: false,
      style: { stroke: colors.edge, strokeWidth: 2.5 },
    },
    {
      id: 'edge-subtask1-todo1',
      source: 'subtask-1',
      target: 'todo-1-1',
      type: 'default',
      animated: false,
      style: { stroke: colors.edge, strokeWidth: 2.5 },
    },
    {
      id: 'edge-subtask1-todo2',
      source: 'subtask-1',
      target: 'todo-1-2',
      type: 'default',
      animated: false,
      style: { stroke: colors.edge, strokeWidth: 2.5 },
    },
    {
      id: 'edge-subtask2-todo1',
      source: 'subtask-2',
      target: 'todo-2-1',
      type: 'default',
      animated: false,
      style: { stroke: colors.edge, strokeWidth: 2.5 },
    },
    {
      id: 'edge-subtask2-todo2',
      source: 'subtask-2',
      target: 'todo-2-2',
      type: 'default',
      animated: false,
      style: { stroke: colors.edge, strokeWidth: 2.5 },
    },
  ];

  return { nodes: initialNodes, edges: initialEdges };
};

const { nodes: initialNodes, edges: initialEdges } = createInitialGraph();
// Apply initial layout
const layoutedInitialNodes = calculateLayout(initialNodes, initialEdges);

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: layoutedInitialNodes,
  edges: initialEdges,
  pinnedNodeIds: [],
  batchTitle: 'Current Batch',
  isDragging: false,
  isAutoFormatting: false,
  editingNodeId: null,
  nodeToCure: null,
  undoStack: [],
  redoStack: [],
  
  setDragging: (isDragging) => set({ isDragging }),
  setAutoFormatting: (isAutoFormatting) => set({ isAutoFormatting }),
  setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
  setNodeToCure: (nodeId) => set({ nodeToCure: nodeId }),
  
  // Save current state to undo stack (max 5 steps)
  saveStateSnapshot: () => {
    const state = get();
    const snapshot = JSON.stringify({
      nodes: state.nodes,
      edges: state.edges,
      pinnedNodeIds: state.pinnedNodeIds,
      batchTitle: state.batchTitle,
    });
    
    const undoStack = [...state.undoStack, snapshot];
    // Keep only last 5 steps
    if (undoStack.length > 5) {
      undoStack.shift();
    }
    
    set({ 
      undoStack,
      redoStack: [], // Clear redo stack when new action is performed
    });
  },
  
  // Undo: restore previous state
  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    
    // Save current state to redo stack
    const currentSnapshot = JSON.stringify({
      nodes: state.nodes,
      edges: state.edges,
      pinnedNodeIds: state.pinnedNodeIds,
      batchTitle: state.batchTitle,
    });
    
    const redoStack = [...state.redoStack, currentSnapshot];
    if (redoStack.length > 5) {
      redoStack.shift();
    }
    
    // Restore previous state
    const previousSnapshot = state.undoStack[state.undoStack.length - 1];
    const previousState = JSON.parse(previousSnapshot);
    const undoStack = state.undoStack.slice(0, -1);
    
    set({
      nodes: previousState.nodes,
      edges: previousState.edges,
      pinnedNodeIds: previousState.pinnedNodeIds || [],
      batchTitle: previousState.batchTitle || 'Current Batch',
      undoStack,
      redoStack,
    });
  },
  
  // Redo: restore next state
  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    
    // Save current state to undo stack
    const currentSnapshot = JSON.stringify({
      nodes: state.nodes,
      edges: state.edges,
      pinnedNodeIds: state.pinnedNodeIds,
      batchTitle: state.batchTitle,
    });
    
    const undoStack = [...state.undoStack, currentSnapshot];
    if (undoStack.length > 5) {
      undoStack.shift();
    }
    
    // Restore next state
    const nextSnapshot = state.redoStack[state.redoStack.length - 1];
    const nextState = JSON.parse(nextSnapshot);
    const redoStack = state.redoStack.slice(0, -1);
    
    set({
      nodes: nextState.nodes,
      edges: nextState.edges,
      pinnedNodeIds: nextState.pinnedNodeIds || [],
      batchTitle: nextState.batchTitle || 'Current Batch',
      undoStack,
      redoStack,
    });
  },
  
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  addNode: (parentId, level = 0) => {
    get().saveStateSnapshot(); // Save state before action
    const nodes = get().nodes;
    const edges = get().edges;
    const pinnedNodeIds = get().pinnedNodeIds;
    const nodesAtLevel = nodes.filter(n => n.data.level === level);
    const newSlot = nodesAtLevel.length;
    
    // Check if parent is pinned - if so, unpin it with confirmation
    if (parentId && pinnedNodeIds.includes(parentId)) {
      const parentNode = nodes.find(n => n.id === parentId);
      if (parentNode) {
        const confirmMessage = `"${parentNode.data.label}" wird aus dem Pinboard entfernt, da es jetzt Child-Nodes hat und keine Leaf-Node mehr ist.`;
        alert(confirmMessage);
        set({ pinnedNodeIds: pinnedNodeIds.filter(id => id !== parentId) });
      }
    }
    
    // New node will be positioned by the layout engine
    // The layout engine will use the parent's current position as reference when useOriginalPositions is true
    const newNode: TaskNode = {
      id: nanoid(),
      type: 'editableNode',
      position: { x: 0, y: 0 }, // Temporary position, will be set by layout engine
      data: { label: 'New Task', level, slot: newSlot },
    };

    const newNodes = [...nodes, newNode];
    let newEdges = [...edges];

    if (parentId) {
      newEdges.push({
        id: nanoid(),
        source: parentId,
        target: newNode.id,
        type: 'default',
        animated: false,
        style: {
          stroke: colors.edge,
          strokeWidth: 2.5,
        },
      });
    }

    // First, update slots based on current Y positions to respect manual reordering (same as applyAutoLayout)
    // Group nodes by level
    const nodesByLevel: { [level: number]: TaskNode[] } = {};
    newNodes.forEach(node => {
      const nodeLevel = node.data.level;
      if (!nodesByLevel[nodeLevel]) {
        nodesByLevel[nodeLevel] = [];
      }
      nodesByLevel[nodeLevel].push(node);
    });
    
    // For each level, sort by Y position and update slots (siblings are stacked vertically in horizontal layout)
    // IMPORTANT: New nodes should always be placed at the bottom (highest slot)
    const nodesWithUpdatedSlots = newNodes.map(node => {
      const nodesAtLevel = nodesByLevel[node.data.level];
      // Separate existing nodes from the new node
      const existingNodes = nodesAtLevel.filter(n => n.id !== newNode.id);
      const isNewNode = node.id === newNode.id;
      
      if (isNewNode) {
        // New node always gets the highest slot (bottom position)
        return {
          ...node,
          data: {
            ...node.data,
            slot: nodesAtLevel.length - 1, // Highest slot = bottom position
          },
        };
      } else {
        // Existing nodes: sort by current Y position (top to bottom for siblings)
        const sortedByPosition = [...existingNodes].sort((a, b) => a.position.y - b.position.y);
        // Find this node's updated slot based on its position
        const updatedSlot = sortedByPosition.findIndex(n => n.id === node.id);
        
        return {
          ...node,
          data: {
            ...node.data,
            slot: updatedSlot >= 0 ? updatedSlot : node.data.slot,
          },
        };
      }
    });

    // Apply auto layout after adding node so it appears in the correct position
    // Preserve X position of roots, allow Y to adjust for vertical spacing (so roots can move to avoid overlap)
    // When adding a child, preserveParentId ensures the parent's exact position (X and Y) is maintained
    // Use original positions as reference so children are positioned relative to parent's current position
    // Only Auto Format (Shift+A) will reposition all roots into the auto layout
    const layoutedNodes = calculateLayout(nodesWithUpdatedSlots, newEdges, {
      preserveRootPosition: true,
      preserveRootXOnly: true, // Preserve X only, allow Y to adjust for vertical spacing
      originalNodes: nodes, // Pass original nodes to calculate offset
      preserveRootId: null, // null = preserve all root positions
      useOriginalPositions: true, // Use original positions as reference for children positioning
      preserveParentId: parentId || null, // Preserve the parent's position when adding a child
    });
    
    // Enable smooth transitions for adding new node (same as auto-format)
    set({ isAutoFormatting: true, nodes: layoutedNodes, edges: newEdges });
    
    // WORKAROUND: Signal GraphView to "cure" this node by simulating a drag
    // GraphView will use React Flow's setNodes directly (like a real drag) to trigger edge recalculation
    setTimeout(() => {
      set({ nodeToCure: newNode.id });
    }, 10); // Reduced delay for faster animation
    
    // Disable auto-formatting state after animation completes (400ms for smooth transition)
    setTimeout(() => {
      set({ isAutoFormatting: false });
    }, 400);
  },

  updateNodeLabel: (nodeId, label) => {
    get().saveStateSnapshot(); // Save state before action
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node
      ),
    });
  },

  toggleNodeCompleted: (nodeId) => {
    get().saveStateSnapshot(); // Save state before action
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, completed: !node.data.completed } }
          : node
      ),
    });
  },

  deleteNode: (nodeId) => {
    get().deleteNodes([nodeId]);
  },

  deleteNodes: (nodeIds) => {
    get().saveStateSnapshot(); // Save state before action
    const nodes = get().nodes;
    const edges = get().edges;

    const findDescendants = (id: string): string[] => {
      const children = edges.filter(e => e.source === id).map(e => e.target);
      return [id, ...children.flatMap(findDescendants)];
    };

    // Collect all nodes to delete (including descendants of each selected node)
    const allNodesToDelete = new Set<string>();
    nodeIds.forEach(nodeId => {
      const descendants = findDescendants(nodeId);
      descendants.forEach(id => allNodesToDelete.add(id));
    });

    set({
      nodes: nodes.filter(n => !allNodesToDelete.has(n.id)),
      edges: edges.filter(e => 
        !allNodesToDelete.has(e.source) && 
        !allNodesToDelete.has(e.target)
      ),
    });
  },

  swapNodeSlots: (nodeId, targetSlot) => {
    get().saveStateSnapshot(); // Save state before action
    const nodes = get().nodes;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const level = node.data.level;
    const currentSlot = node.data.slot;
    if (currentSlot === targetSlot) return;

    const targetNode = nodes.find(
      n => n.data.level === level && n.data.slot === targetSlot && n.id !== nodeId
    );

    const updatedNodes = nodes.map(n => {
      if (n.id === nodeId) {
        return { ...n, data: { ...n.data, slot: targetSlot } };
      }
      if (targetNode && n.id === targetNode.id) {
        return { ...n, data: { ...n.data, slot: currentSlot } };
      }
      return n;
    });

    set({ nodes: updatedNodes });
  },

  applyAutoLayout: () => {
    get().saveStateSnapshot(); // Save state before action
    const { nodes, edges } = get();
    
    // First, update slots based on current X positions to respect manual reordering
    // Group nodes by level
    const nodesByLevel: { [level: number]: TaskNode[] } = {};
    nodes.forEach(node => {
      const level = node.data.level;
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(node);
    });
    
    // For each level, sort by Y position and update slots (siblings are stacked vertically in horizontal layout)
    const nodesWithUpdatedSlots = nodes.map(node => {
      const nodesAtLevel = nodesByLevel[node.data.level];
      // Sort by current Y position (top to bottom for siblings)
      const sortedByPosition = [...nodesAtLevel].sort((a, b) => a.position.y - b.position.y);
      // Find this node's new slot based on its position
      const newSlot = sortedByPosition.findIndex(n => n.id === node.id);
      
      return {
        ...node,
        data: {
          ...node.data,
          slot: newSlot >= 0 ? newSlot : node.data.slot,
        },
      };
    });
    
    // Now apply the layout with updated slots
    const layoutedNodes = calculateLayout(nodesWithUpdatedSlots, edges);
    
    // Enable smooth transitions for auto-format
    set({ isAutoFormatting: true, nodes: layoutedNodes });
    
    // Disable auto-formatting state after animation completes (400ms for smooth transition)
    setTimeout(() => {
      set({ isAutoFormatting: false });
    }, 400);
  },

  pinNode: (nodeId) => {
    get().saveStateSnapshot(); // Save state before action
    const pinnedNodeIds = get().pinnedNodeIds;
    if (!pinnedNodeIds.includes(nodeId)) {
      set({ pinnedNodeIds: [...pinnedNodeIds, nodeId] });
    }
  },

  unpinNode: (nodeId) => {
    get().saveStateSnapshot(); // Save state before action
    set({ pinnedNodeIds: get().pinnedNodeIds.filter(id => id !== nodeId) });
  },

  unpinAll: () => {
    get().saveStateSnapshot(); // Save state before action
    set({ pinnedNodeIds: [] });
  },

  reorderPinnedNodes: (fromIndex, toIndex) => {
    get().saveStateSnapshot(); // Save state before action
    const pinnedNodeIds = [...get().pinnedNodeIds];
    const [movedId] = pinnedNodeIds.splice(fromIndex, 1);
    pinnedNodeIds.splice(toIndex, 0, movedId);
    set({ pinnedNodeIds });
  },

  toggleAllPinnedCompleted: () => {
    get().saveStateSnapshot(); // Save state before action
    const { nodes, pinnedNodeIds } = get();
    const pinnedNodes = nodes.filter(n => pinnedNodeIds.includes(n.id));
    
    // If all are completed, uncomplete all. Otherwise, complete all.
    const allCompleted = pinnedNodes.every(n => n.data.completed);
    
    set({
      nodes: nodes.map(node =>
        pinnedNodeIds.includes(node.id)
          ? { ...node, data: { ...node.data, completed: !allCompleted } }
          : node
      ),
    });
  },

  setBatchTitle: (title) => {
    get().saveStateSnapshot(); // Save state before action
    set({ batchTitle: title });
  },

  deselectAllNodes: () => {
    // Deselect all nodes without creating undo snapshot (this is a UI action, not a data change)
    set({
      nodes: get().nodes.map(node => ({ ...node, selected: false })),
    });
  },

  saveToJSON: () => {
    const { nodes, edges, pinnedNodeIds, batchTitle } = get();
    return JSON.stringify({ nodes, edges, pinnedNodeIds, batchTitle }, null, 2);
  },

  loadFromJSON: (json) => {
    try {
      const { nodes, edges, pinnedNodeIds = [], batchTitle = 'Current Batch' } = JSON.parse(json);
      // Clear undo/redo stacks when loading from JSON
      set({ nodes, edges, pinnedNodeIds, batchTitle, undoStack: [], redoStack: [] });
      // Automatically apply auto-layout after loading to format the nodes
      // Use setTimeout to ensure state is fully updated before applying layout
      setTimeout(() => {
        get().applyAutoLayout();
      }, 0);
    } catch (error) {
      console.error('Failed to load JSON:', error);
    }
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // Check if moving a node to a target parent is valid
  canMoveNode: (nodeId, targetParentId) => {
    const { nodes, edges } = get();
    const node = nodes.find(n => n.id === nodeId);
    const targetParent = nodes.find(n => n.id === targetParentId);
    
    if (!node || !targetParent) return false;
    
    // Get all descendants of the node being moved
    const getDescendants = (id: string): string[] => {
      const children = edges.filter(e => e.source === id).map(e => e.target);
      const allDescendants = [...children];
      children.forEach(childId => {
        allDescendants.push(...getDescendants(childId));
      });
      return allDescendants;
    };
    
    const descendants = getDescendants(nodeId);
    
    // Check if target is a descendant (can't move node into its own subtree)
    if (descendants.includes(targetParentId) || nodeId === targetParentId) {
      return false;
    }
    
    // Calculate what the new levels would be
    const targetLevel = targetParent.data.level;
    const levelDiff = targetLevel - node.data.level;
    
    // Check if move would violate 3-layer rule
    const allNodesToMove = [node, ...descendants.map(id => nodes.find(n => n.id === id)!).filter(Boolean)];
    for (const nodeToMove of allNodesToMove) {
      const newLevel = (nodeToMove.data.level + levelDiff + 1) as 0 | 1 | 2;
      
      // Check if new level is valid (0, 1, or 2)
      if (newLevel < 0 || newLevel > 2) {
        return false;
      }
      
      // If this node has children, check if they would exceed level 2
      const nodeChildren = edges.filter(e => e.source === nodeToMove.id).map(e => e.target);
      for (const childId of nodeChildren) {
        const child = nodes.find(n => n.id === childId);
        if (child) {
          const childNewLevel = (child.data.level + levelDiff + 1) as 0 | 1 | 2;
          if (childNewLevel < 0 || childNewLevel > 2) {
            return false;
          }
        }
      }
    }
    
    // General rule: can move if it doesn't violate the 3-layer rule (0, 1, 2)
    // The 3-layer check above already validated that all nodes would be within bounds
    // So we just need to check if the move makes sense hierarchically
    
    const hasChildren = edges.some(e => e.source === nodeId);
    
    // Normal case: target should be 1 level higher in hierarchy (1 level lower number)
    // L1 (level 1) can move to Root (level 0): targetLevel (0) === nodeLevel (1) - 1
    // L2 (level 2) can move to L1 (level 1): targetLevel (1) === nodeLevel (2) - 1
    if (targetLevel === node.data.level - 1) {
      return true;
    }
    
    // Special case: L1 → L1 (L1 becomes L2, which is valid)
    if (node.data.level === 1 && targetLevel === 1) {
      return true;
    }
    
    // Special case: Root → Root (Root becomes L1, children become L2)
    // Only allowed if root has at most 1 layer of children (so children are max level 1)
    if (node.data.level === 0 && targetLevel === 0) {
      // Check if all children are level 1 or less (no grandchildren)
      const children = edges.filter(e => e.source === nodeId).map(e => e.target);
      const allChildrenAreLevel1OrLess = children.every(childId => {
        const child = nodes.find(n => n.id === childId);
        return child && child.data.level <= 1;
      });
      return allChildrenAreLevel1OrLess;
    }
    
    // Special case: Root (level 0) with no children can move to L1 (becomes L2)
    if (node.data.level === 0 && !hasChildren && targetLevel === 1) {
      return true;
    }
    
    // Special case: L2 can move to Root (becomes L1)
    if (node.data.level === 2 && targetLevel === 0) {
      return true;
    }
    
    return false;
  },

  // Move a node and all its children to a new parent
  moveNode: (nodeId, newParentId) => {
    get().saveStateSnapshot();
    const { nodes, edges } = get();
    
    const node = nodes.find(n => n.id === nodeId);
    const newParent = nodes.find(n => n.id === newParentId);
    
    if (!node || !newParent) return;
    
    // Get all descendants of the node being moved
    const getDescendants = (id: string): string[] => {
      const children = edges.filter(e => e.source === id).map(e => e.target);
      const allDescendants = [...children];
      children.forEach(childId => {
        allDescendants.push(...getDescendants(childId));
      });
      return allDescendants;
    };
    
    const descendants = getDescendants(nodeId);
    const allNodeIdsToMove = [nodeId, ...descendants];
    
    // Calculate level difference
    const targetLevel = newParent.data.level;
    const levelDiff = targetLevel - node.data.level;
    
    // Remove old edges (from old parent to this node)
    const newEdges = edges.filter(e => e.target !== nodeId);
    
    // Update levels for moved node and all descendants FIRST
    // This is critical: nodes need to be updated with their new levels BEFORE edges are created
    // because React Flow needs to render the nodes with their new handles (target handle appears when level > 0)
    const updatedNodes = nodes.map(n => {
      if (allNodeIdsToMove.includes(n.id)) {
        const newLevel = Math.max(0, Math.min(2, n.data.level + levelDiff + 1)) as 0 | 1 | 2;
        return {
          ...n,
          data: {
            ...n.data,
            level: newLevel,
          },
        };
      }
      return n;
    });
    
    // Always create the edge - the handle always exists now (even for root nodes, it's just hidden)
    const movedNode = updatedNodes.find(n => n.id === nodeId);
    if (movedNode && movedNode.data.level > 0) {
      // Create the edge with explicit target handle ID
      newEdges.push({
        id: nanoid(),
        source: newParentId,
        target: nodeId,
        targetHandle: 'target', // Explicit handle ID
        type: 'default',
        animated: false,
        style: {
          stroke: colors.edge,
          strokeWidth: 2.5,
        },
      });
    }
    
    // Set the moved node's slot to be at the end (bottom) of the new parent's children
    // Get all children of the new parent (excluding the moved node and its descendants)
    const newParentChildren = newEdges
      .filter(e => e.source === newParentId && e.target !== nodeId)
      .map(e => e.target)
      .filter(id => !allNodeIdsToMove.includes(id)); // Exclude moved node and its descendants
    
    // Find the maximum slot among existing children of the new parent
    const existingChildrenSlots = newParentChildren
      .map(id => updatedNodes.find(n => n.id === id)?.data.slot ?? -1)
      .filter(slot => slot >= 0);
    
    const maxSlot = existingChildrenSlots.length > 0 
      ? Math.max(...existingChildrenSlots) 
      : -1;
    
    // Set the moved node's slot to be at the end (maxSlot + 1)
    const nodesWithUpdatedSlots = updatedNodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            slot: maxSlot + 1, // Always append at the end
          },
        };
      }
      return n;
    });
    
    // Apply layout first - the layout engine will calculate positions based on hierarchy
    // Don't preserve parent position - let layout engine recalculate everything
    // This ensures siblings make space for the moved node with its children
    const layoutedNodes = calculateLayout(nodesWithUpdatedSlots, newEdges, {
      preserveRootPosition: true,
      preserveRootXOnly: true,
      originalNodes: nodes,
      preserveRootId: null,
      useOriginalPositions: true,
      // Don't use preserveParentId - let the layout engine recalculate all positions
      // This ensures siblings adjust when a node with children is moved
    });
    
    // Set nodes and edges together - handles always exist now
    set({ 
      isAutoFormatting: true, 
      nodes: layoutedNodes, 
      edges: newEdges 
    });
    
    setTimeout(() => {
      set({ isAutoFormatting: false });
    }, 400);
  },
}));

