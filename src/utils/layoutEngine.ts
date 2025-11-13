import type { TaskNode } from '../store/graphStore';
import type { Edge } from 'reactflow';

const LEVEL_SPACING = 220;
const NODE_SPACING = 100;
const MIN_NODE_WIDTH = 120;
const MAX_NODE_WIDTH = 300;
const PADDING = 32; // 16px left + 16px right padding
const CHAR_WIDTH = 8; // Approximate character width

interface LayoutConfig {
  levelSpacing?: number;
  nodeSpacing?: number;
}

/**
 * Estimate the width of a node based on its text content
 */
function estimateNodeWidth(node: TaskNode): number {
  const text = node.data.label || '';
  const lines = text.split('\n');
  const longestLine = Math.max(...lines.map(line => line.length));
  
  // Add space for checkbox if it's a leaf node
  const checkboxWidth = 28; // 20px checkbox + 8px gap
  
  // Calculate estimated width based on character count
  const textWidth = longestLine * CHAR_WIDTH;
  const estimatedWidth = textWidth + PADDING + checkboxWidth;
  
  // Clamp between min and max
  return Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, estimatedWidth));
}

/**
 * Calculate the total width needed for a node and all its descendants
 */
function calculateSubtreeWidth(
  nodeId: string,
  nodes: TaskNode[],
  edges: Edge[],
  nodeSpacing: number
): number {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return MIN_NODE_WIDTH;

  const children = edges
    .filter(e => e.source === nodeId)
    .map(e => e.target)
    .map(id => nodes.find(n => n.id === id))
    .filter(Boolean) as TaskNode[];

  if (children.length === 0) {
    // Leaf node - use estimated width based on text
    return estimateNodeWidth(node);
  }

  // Calculate total width needed for all children and their subtrees
  const childrenWidths = children.map(child => 
    calculateSubtreeWidth(child.id, nodes, edges, nodeSpacing)
  );
  
  const totalChildrenWidth = childrenWidths.reduce((sum, w) => sum + w, 0) + 
    (children.length - 1) * nodeSpacing;

  // Parent node should be at least as wide as its own text, or as wide as its children
  const nodeWidth = estimateNodeWidth(node);
  return Math.max(nodeWidth, totalChildrenWidth);
}

/**
 * Position a node and its descendants recursively
 */
function positionSubtree(
  nodeId: string,
  centerX: number,
  y: number,
  nodes: TaskNode[],
  edges: Edge[],
  positioned: Map<string, TaskNode>,
  levelSpacing: number,
  nodeSpacing: number
): void {
  const node = nodes.find(n => n.id === nodeId);
  if (!node || positioned.has(nodeId)) return;

  // Position this node at the given center
  positioned.set(nodeId, { ...node, position: { x: centerX, y } });

  // Get children
  const children = edges
    .filter(e => e.source === nodeId)
    .map(e => e.target)
    .map(id => nodes.find(n => n.id === id))
    .filter(Boolean) as TaskNode[];

  if (children.length === 0) return;

  // Sort children by slot
  children.sort((a, b) => a.data.slot - b.data.slot);

  // Calculate width for each child subtree
  const childWidths = children.map(child => 
    calculateSubtreeWidth(child.id, nodes, edges, nodeSpacing)
  );

  // Calculate total width needed
  const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + 
    (children.length - 1) * nodeSpacing;

  // Start positioning children from left to right
  let currentX = centerX - totalWidth / 2;

  children.forEach((child, i) => {
    const childWidth = childWidths[i];
    const childCenterX = currentX + childWidth / 2;
    
    positionSubtree(
      child.id,
      childCenterX,
      y + levelSpacing,
      nodes,
      edges,
      positioned,
      levelSpacing,
      nodeSpacing
    );

    currentX += childWidth + nodeSpacing;
  });
}

/**
 * Calculate positions for all nodes based on hierarchy
 */
export function calculateLayout(
  nodes: TaskNode[],
  edges: Edge[],
  config: LayoutConfig = {}
): TaskNode[] {
  const levelSpacing = config.levelSpacing ?? LEVEL_SPACING;
  const nodeSpacing = config.nodeSpacing ?? NODE_SPACING;

  const positioned = new Map<string, TaskNode>();

  // Find root nodes (level 0, no incoming edges)
  const rootNodes = nodes
    .filter(n => n.data.level === 0)
    .sort((a, b) => a.data.slot - b.data.slot);

  if (rootNodes.length === 0) {
    return nodes;
  }

  // Calculate width for each root subtree
  const rootWidths = rootNodes.map(root => 
    calculateSubtreeWidth(root.id, nodes, edges, nodeSpacing)
  );

  // Calculate total width needed for all roots
  const totalWidth = rootWidths.reduce((sum, w) => sum + w, 0) + 
    (rootNodes.length - 1) * nodeSpacing * 2; // Extra spacing between root trees

  // Position each root and its subtree
  let currentX = -totalWidth / 2;

  rootNodes.forEach((root, i) => {
    const rootWidth = rootWidths[i];
    const rootCenterX = currentX + rootWidth / 2;
    
    positionSubtree(
      root.id,
      rootCenterX,
      0,
      nodes,
      edges,
      positioned,
      levelSpacing,
      nodeSpacing
    );

    currentX += rootWidth + nodeSpacing * 2;
  });

  // Return all positioned nodes (preserve any unpositioned nodes with original position)
  return nodes.map(node => positioned.get(node.id) || node);
}

/**
 * Find the slot index at a given x position for nodes at a specific level
 */
export function getSlotAtPosition(
  x: number,
  level: number,
  nodes: TaskNode[]
): number {
  const nodesAtLevel = nodes.filter(n => n.data.level === level);
  nodesAtLevel.sort((a, b) => a.data.slot - b.data.slot);

  if (nodesAtLevel.length === 0) return 0;

  // Find closest slot based on current positions
  let closestSlot = 0;
  let minDistance = Infinity;

  for (let i = 0; i < nodesAtLevel.length; i++) {
    const node = nodesAtLevel[i];
    const distance = Math.abs(x - node.position.x);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestSlot = node.data.slot;
    }
  }

  return closestSlot;
}

/**
 * Get all descendant node IDs recursively
 */
export function getDescendantIds(nodeId: string, edges: Edge[]): string[] {
  const children = edges.filter(e => e.source === nodeId).map(e => e.target);
  return [...children, ...children.flatMap(childId => getDescendantIds(childId, edges))];
}
