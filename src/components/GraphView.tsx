import { useCallback } from 'react';
import { ReactFlow, Controls, Background, BackgroundVariant, MarkerType } from 'reactflow';
import type { Connection } from 'reactflow';
import { addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphStore } from '../store/graphStore';

export default function GraphView() {
  const { nodes, edges, onNodesChange, onEdgesChange, setEdges } = useGraphStore();

  const onConnect = useCallback(
    (params: Connection) => setEdges(addEdge(params, edges)),
    [edges, setEdges]
  );

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Controls className="bg-white rounded-lg shadow-lg" />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d1d5db" />
      </ReactFlow>
    </div>
  );
}

