import { create } from 'zustand';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { getHierarchicalLayout } from '../utils/layoutEngine';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: any) => void;
  loadGraph: (data: { nodes: Node[]; edges: Edge[] }) => void;
  resetGraph: () => void;
  applyAutoLayout: () => Promise<void>;
}

// Initial example nodes (vertical layout)
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    data: { label: '📋 Hauptaufgabe: ToDo Graph App' },
    position: { x: 250, y: 50 },
    style: {
      background: '#fff',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '12px',
      fontSize: '14px',
      fontWeight: 600,
    },
  },
  {
    id: '2',
    data: { label: '✅ ReactFlow integrieren' },
    position: { x: 100, y: 180 },
    style: {
      background: '#fff',
      border: '2px solid #10b981',
      borderRadius: '12px',
      padding: '10px',
      fontSize: '13px',
    },
  },
  {
    id: '3',
    data: { label: '🎨 UI Design erstellen' },
    position: { x: 400, y: 180 },
    style: {
      background: '#fff',
      border: '2px solid #8b5cf6',
      borderRadius: '12px',
      padding: '10px',
      fontSize: '13px',
    },
  },
  {
    id: '4',
    data: { label: '💾 State Management' },
    position: { x: 100, y: 310 },
    style: {
      background: '#fff',
      border: '2px solid #f59e0b',
      borderRadius: '12px',
      padding: '10px',
      fontSize: '13px',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' },
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' },
  },
];

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

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

