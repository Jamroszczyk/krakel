import { create } from 'zustand';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { getHierarchicalLayout } from '../utils/layoutEngine';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  isAnyNodeEditing: boolean;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: any) => void;
  setNodeDraggable: (nodeId: string, draggable: boolean) => void;
  setIsAnyNodeEditing: (isEditing: boolean) => void;
  loadGraph: (data: { nodes: Node[]; edges: Edge[] }) => void;
  resetGraph: () => void;
  applyAutoLayout: () => Promise<void>;
}

// Initial example nodes (vertical layout)
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    data: { label: '📋 Hauptaufgabe: Krakel App' },
    position: { x: 250, y: 50 },
  },
  {
    id: '2',
    type: 'default',
    data: { label: '✅ ReactFlow integrieren' },
    position: { x: 100, y: 180 },
  },
  {
    id: '3',
    type: 'default',
    data: { label: '🎨 UI Design erstellen' },
    position: { x: 400, y: 180 },
  },
  {
    id: '4',
    type: 'default',
    data: { label: '💾 State Management' },
    position: { x: 100, y: 310 },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'default',
    animated: false,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' },
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'default',
    animated: false,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    type: 'default',
    animated: false,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' },
  },
];

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  isAnyNodeEditing: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setIsAnyNodeEditing: (isEditing) => set({ isAnyNodeEditing: isEditing }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  updateNode: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  setNodeDraggable: (nodeId, draggable) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, draggable } : node
      ),
    });
  },

  loadGraph: (data) => {
    set({ nodes: data.nodes, edges: data.edges });
  },

  resetGraph: () => {
    set({ nodes: initialNodes, edges: initialEdges });
  },

  applyAutoLayout: async () => {
    const { nodes, edges } = get();
    const layouted = await getHierarchicalLayout(nodes, edges);
    set({ nodes: layouted.nodes, edges: layouted.edges });
  },
}));

