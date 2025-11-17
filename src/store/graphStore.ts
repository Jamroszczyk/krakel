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
  undoStack: string[]; // Array of JSON state snapshots (max 5)
  redoStack: string[]; // Array of JSON state snapshots (max 5)
  addNode: (parentId?: string, level?: 0 | 1 | 2) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  toggleNodeCompleted: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
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
  saveStateSnapshot: () => void; // Save current state to undo stack
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToJSON: () => string;
  loadFromJSON: (json: string) => void;
  setNodes: (nodes: TaskNode[]) => void;
  setEdges: (edges: Edge[]) => void;
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
  undoStack: [],
  redoStack: [],
  
  setDragging: (isDragging) => set({ isDragging }),
  setAutoFormatting: (isAutoFormatting) => set({ isAutoFormatting }),
  
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
    
    const newNode: TaskNode = {
      id: nanoid(),
      type: 'editableNode',
      position: { x: 0, y: 0 },
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

    // Apply auto layout after adding node so it appears in the correct position
    const layoutedNodes = calculateLayout(newNodes, newEdges);
    set({ nodes: layoutedNodes, edges: newEdges });
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
    get().saveStateSnapshot(); // Save state before action
    const nodes = get().nodes;
    const edges = get().edges;

    const findDescendants = (id: string): string[] => {
      const children = edges.filter(e => e.source === id).map(e => e.target);
      return [id, ...children.flatMap(findDescendants)];
    };

    const nodesToDelete = findDescendants(nodeId);

    set({
      nodes: nodes.filter(n => !nodesToDelete.includes(n.id)),
      edges: edges.filter(e => 
        !nodesToDelete.includes(e.source) && 
        !nodesToDelete.includes(e.target)
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
    
    // For each level, sort by X position and update slots
    const nodesWithUpdatedSlots = nodes.map(node => {
      const nodesAtLevel = nodesByLevel[node.data.level];
      // Sort by current X position (left to right)
      const sortedByPosition = [...nodesAtLevel].sort((a, b) => a.position.x - b.position.x);
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

  saveToJSON: () => {
    const { nodes, edges, pinnedNodeIds, batchTitle } = get();
    return JSON.stringify({ nodes, edges, pinnedNodeIds, batchTitle }, null, 2);
  },

  loadFromJSON: (json) => {
    try {
      const { nodes, edges, pinnedNodeIds = [], batchTitle = 'Current Batch' } = JSON.parse(json);
      // Clear undo/redo stacks when loading from JSON
      set({ nodes, edges, pinnedNodeIds, batchTitle, undoStack: [], redoStack: [] });
    } catch (error) {
      console.error('Failed to load JSON:', error);
    }
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));

