import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Node, Edge } from 'reactflow';
import { colors } from '../theme/colors';

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
  addNode: (parentId?: string, level?: 0 | 1 | 2) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  toggleNodeCompleted: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  swapNodeSlots: (nodeId: string, targetSlot: number) => void;
  pinNode: (nodeId: string) => void;
  unpinNode: (nodeId: string) => void;
  saveToJSON: () => string;
  loadFromJSON: (json: string) => void;
  setNodes: (nodes: TaskNode[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  pinnedNodeIds: [],

  addNode: (parentId, level = 0) => {
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

    set({ nodes: newNodes, edges: newEdges });
  },

  updateNodeLabel: (nodeId, label) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node
      ),
    });
  },

  toggleNodeCompleted: (nodeId) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, completed: !node.data.completed } }
          : node
      ),
    });
  },

  deleteNode: (nodeId) => {
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
    const nodes = get().nodes;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const level = node.data.level;
    const currentSlot = node.data.slot;
    if (currentSlot === targetSlot) return;

    // Only swap slots at the same level (not descendants)
    // The layout engine will automatically reposition children relative to parents
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

  pinNode: (nodeId) => {
    const pinnedNodeIds = get().pinnedNodeIds;
    if (!pinnedNodeIds.includes(nodeId)) {
      set({ pinnedNodeIds: [...pinnedNodeIds, nodeId] });
    }
  },

  unpinNode: (nodeId) => {
    set({ pinnedNodeIds: get().pinnedNodeIds.filter(id => id !== nodeId) });
  },

  saveToJSON: () => {
    const { nodes, edges, pinnedNodeIds } = get();
    return JSON.stringify({ nodes, edges, pinnedNodeIds }, null, 2);
  },

  loadFromJSON: (json) => {
    try {
      const { nodes, edges, pinnedNodeIds = [] } = JSON.parse(json);
      set({ nodes, edges, pinnedNodeIds });
    } catch (error) {
      console.error('Failed to load JSON:', error);
    }
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));

