import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from 'reactflow';

const elk = new ELK();

export interface LayoutOptions {
  direction?: 'DOWN' | 'RIGHT'; // DOWN = vertical (top to bottom), RIGHT = horizontal
  spacing?: number;
  nodeSpacing?: number;
}

export const getLayoutedElements = async (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  const { direction = 'DOWN', spacing = 80, nodeSpacing = 120 } = options;

  // Build ELK graph structure
  const elkNodes = nodes.map((node) => ({
    id: node.id,
    width: node.width ?? 180,
    height: node.height ?? 60,
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(spacing),
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.padding': '[top=50,left=50,bottom=50,right=50]',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const layoutedGraph = await elk.layout(elkGraph);

    // Apply the layout to nodes
    const layoutedNodes = nodes.map((node) => {
      const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
      if (layoutedNode) {
        return {
          ...node,
          position: {
            x: layoutedNode.x ?? node.position.x,
            y: layoutedNode.y ?? node.position.y,
          },
        };
      }
      return node;
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error('Error calculating layout:', error);
    return { nodes, edges };
  }
};

// Helper function to calculate layout for hierarchical structure
export const getHierarchicalLayout = async (
  nodes: Node[],
  edges: Edge[]
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  return getLayoutedElements(nodes, edges, {
    direction: 'DOWN', // Vertical: Top to Bottom
    spacing: 100,
    nodeSpacing: 150,
  });
};

