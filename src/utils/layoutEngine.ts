import type { TaskNode } from '../store/graphStore';
import type { Edge } from 'reactflow';

const LEVEL_SPACING = 340; // Horizontal spacing between levels (left to right) - increased for better separation
const NODE_SPACING = 20; // Vertical spacing between sibling nodes (top to bottom) - reduced for tighter vertical grouping

interface LayoutConfig {
  levelSpacing?: number;
  nodeSpacing?: number;
  preserveRootPosition?: boolean; // If true, preserve the current position of root nodes
  preserveRootXOnly?: boolean; // If true, only preserve X position (horizontal), allow Y to adjust for spacing
  originalNodes?: TaskNode[]; // Original nodes before layout (needed for preserveRootPosition)
  preserveRootId?: string | null; // Specific root node ID to preserve (if null, preserve all roots)
  useOriginalPositions?: boolean; // If true, use original node positions as reference for children positioning
  preserveParentId?: string | null; // Specific parent node ID to preserve (when adding a child, preserve the parent's position)
}

/**
 * Calculate the total height needed for a node and all its descendants
 * (height = vertical space for siblings in horizontal layout)
 */
function calculateSubtreeHeight(
  nodeId: string,
  nodes: TaskNode[],
  edges: Edge[],
  nodeSpacing: number
): number {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return 100; // Default node height

  const children = edges
    .filter(e => e.source === nodeId)
    .map(e => e.target)
    .map(id => nodes.find(n => n.id === id))
    .filter(Boolean) as TaskNode[];

  if (children.length === 0) {
    // Leaf node - use estimated height based on text (approximate)
    const text = node.data.label || '';
    const lines = text.split('\n');
    const lineHeight = 24; // Approximate line height
    const minHeight = 60; // Minimum node height
    return Math.max(minHeight, lines.length * lineHeight + 40);
  }

  // Calculate total height needed for all children and their subtrees
  const childrenHeights = children.map(child => 
    calculateSubtreeHeight(child.id, nodes, edges, nodeSpacing)
  );
  
  const totalChildrenHeight = childrenHeights.reduce((sum, h) => sum + h, 0) + 
    (children.length - 1) * nodeSpacing;

  // Parent node should be at least as tall as its own content, or as tall as its children
  const text = node.data.label || '';
  const lines = text.split('\n');
  const lineHeight = 24;
  const nodeHeight = Math.max(60, lines.length * lineHeight + 40);
  return Math.max(nodeHeight, totalChildrenHeight);
}

/**
 * Position a node and its descendants recursively (horizontal layout: left to right)
 */
function positionSubtree(
  nodeId: string,
  x: number,
  centerY: number,
  nodes: TaskNode[],
  edges: Edge[],
  positioned: Map<string, TaskNode>,
  levelSpacing: number,
  nodeSpacing: number,
  originalNodes?: TaskNode[],
  useOriginalPositions?: boolean
): void {
  const node = nodes.find(n => n.id === nodeId);
  if (!node || positioned.has(nodeId)) return;

  // Position this node at the given position
  positioned.set(nodeId, { ...node, position: { x, y: centerY } });

  // Get children
  const children = edges
    .filter(e => e.source === nodeId)
    .map(e => e.target)
    .map(id => nodes.find(n => n.id === id))
    .filter(Boolean) as TaskNode[];

  if (children.length === 0) return;

  // Sort children by slot
  children.sort((a, b) => a.data.slot - b.data.slot);

  // Calculate height for each child subtree (vertical space for siblings)
  const childHeights = children.map(child => 
    calculateSubtreeHeight(child.id, nodes, edges, nodeSpacing)
  );

  // Calculate total height needed
  const totalHeight = childHeights.reduce((sum, h) => sum + h, 0) + 
    (children.length - 1) * nodeSpacing;

  // Start positioning children from top to bottom (vertically)
  let currentY = centerY - totalHeight / 2;

  // Always use the parent's current X position (x parameter) plus standard levelSpacing
  // This ensures children are always positioned at the standard distance, regardless of where parent moved
  // useOriginalPositions only affects root starting positions, not spacing between levels
  children.forEach((child, i) => {
    const childHeight = childHeights[i];
    const childCenterY = currentY + childHeight / 2;
    
    // Position children to the right of parent using standard levelSpacing
    // Always use x (parent's current position in layout) + levelSpacing, not original position
    positionSubtree(
      child.id,
      x + levelSpacing,
      childCenterY,
      nodes,
      edges,
      positioned,
      levelSpacing,
      nodeSpacing,
      originalNodes,
      useOriginalPositions
    );

    currentY += childHeight + nodeSpacing;
  });
}

/**
 * Calculate positions for all nodes based on hierarchy (horizontal layout: left to right)
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

  // Calculate height for each root subtree (vertical space for siblings)
  const rootHeights = rootNodes.map(root => 
    calculateSubtreeHeight(root.id, nodes, edges, nodeSpacing)
  );

  // Calculate total height needed for all roots
  const totalHeight = rootHeights.reduce((sum, h) => sum + h, 0) + 
    (rootNodes.length - 1) * nodeSpacing * 2; // Extra spacing between root trees

  // Position each root and its subtree (vertically stacked, starting from top)
  // Always calculate Y positions from scratch to allow vertical spacing adjustments
  // X positions will be preserved later if needed
  let currentY = -totalHeight / 2;

  rootNodes.forEach((root, i) => {
    const rootHeight = rootHeights[i];
    const rootCenterY = currentY + rootHeight / 2;
    
    // Determine starting X position for root
    // If preserving positions and using original positions, use the root's original X
    let rootX = 0;
    if (config.useOriginalPositions && config.originalNodes) {
      const originalRoot = config.originalNodes.find(n => n.id === root.id);
      if (originalRoot) {
        rootX = originalRoot.position.x;
      }
    }
    
    // Root nodes start at rootX (0 for auto layout, original X if preserving)
    // Y position is always calculated from scratch to allow vertical spacing
    positionSubtree(
      root.id,
      rootX,
      rootCenterY,
      nodes,
      edges,
      positioned,
      levelSpacing,
      nodeSpacing,
      config.originalNodes,
      config.useOriginalPositions
    );

    // Always advance currentY to stack roots vertically
    currentY += rootHeight + nodeSpacing * 2;
  });

  // Calculate layout positions
  const layoutedNodes = nodes.map(node => positioned.get(node.id) || node);

  // If preserveRootPosition is enabled and we have original nodes, apply offset
  if (config.preserveRootPosition && config.originalNodes && rootNodes.length > 0) {
    // Determine which root nodes to preserve
    // Only preserve roots that existed in the original nodes (exclude newly added roots)
    const originalRootIds = new Set(config.originalNodes.filter(n => n.data.level === 0).map(n => n.id));
    const rootsToPreserve = config.preserveRootId
      ? rootNodes.filter(root => root.id === config.preserveRootId && originalRootIds.has(root.id))
      : rootNodes.filter(root => originalRootIds.has(root.id)); // Only preserve existing roots, not new ones
    
    if (rootsToPreserve.length > 0) {
      // Calculate offsets for each root to preserve
      const rootOffsets = new Map<string, { offsetX: number; offsetY: number }>();
      
      rootsToPreserve.forEach(root => {
        const originalRoot = config.originalNodes!.find(n => n.id === root.id);
        const layoutedRoot = layoutedNodes.find(n => n.id === root.id);
        
        if (originalRoot && layoutedRoot) {
          rootOffsets.set(root.id, {
            offsetX: originalRoot.position.x - layoutedRoot.position.x,
            // If preserveRootXOnly is true, allow Y to adjust for vertical spacing (offsetY = 0)
            // If false, preserve full position including Y
            // This allows roots to move vertically to avoid overlap when other roots grow
            offsetY: config.preserveRootXOnly ? 0 : originalRoot.position.y - layoutedRoot.position.y,
          });
        }
      });
      
      // If we have offsets to apply, we need to apply them per root subtree
      if (rootOffsets.size > 0) {
        // Get all descendant IDs for each root that needs offset
        const rootSubtrees = new Map<string, Set<string>>();
        
        rootsToPreserve.forEach(root => {
          if (rootOffsets.has(root.id)) {
            const descendants = new Set([root.id, ...getDescendantIds(root.id, edges)]);
            rootSubtrees.set(root.id, descendants);
          }
        });
        
        // Also need to handle new nodes that aren't in originalNodes but are children of preserved nodes
        // Find all nodes that are children of nodes in preserved subtrees
        const originalNodeIds = new Set(config.originalNodes!.map(n => n.id));
        const newNodes = layoutedNodes.filter(n => !originalNodeIds.has(n.id));
        
        // For each new node, find its parent and add it to the appropriate subtree
        newNodes.forEach(newNode => {
          const parentEdge = edges.find(e => e.target === newNode.id);
          if (parentEdge) {
            // Find which root subtree the parent belongs to
            for (const [, descendants] of rootSubtrees.entries()) {
              if (descendants.has(parentEdge.source)) {
                descendants.add(newNode.id);
                break;
              }
            }
          }
        });
        
        // Apply offset to each node based on which root subtree it belongs to
        let resultNodes = layoutedNodes.map(node => {
          // Find which root subtree this node belongs to
          for (const [rootId, descendants] of rootSubtrees.entries()) {
            if (descendants.has(node.id)) {
              const offset = rootOffsets.get(rootId)!;
              return {
                ...node,
                position: {
                  x: node.position.x + offset.offsetX,
                  y: node.position.y + offset.offsetY,
                },
              };
            }
          }
          // If node doesn't belong to any preserved root subtree, return as-is
          return node;
        });
        
        // If we need to preserve a specific parent node's position (when adding a child)
        // Always preserve the parent's exact position (both X and Y) so it doesn't snap back
        if (config.preserveParentId && config.originalNodes) {
          const parentNode = resultNodes.find(n => n.id === config.preserveParentId);
          const originalParent = config.originalNodes.find(n => n.id === config.preserveParentId);
          
          if (parentNode && originalParent) {
            // Calculate offset to preserve parent's exact position
            const parentOffsetX = originalParent.position.x - parentNode.position.x;
            const parentOffsetY = originalParent.position.y - parentNode.position.y;
            
            // Get all descendants of the parent (including the parent itself)
            const parentDescendants = new Set([config.preserveParentId, ...getDescendantIds(config.preserveParentId, edges)]);
            
            // Apply offset to parent and all its descendants to preserve parent's position
            resultNodes = resultNodes.map(node => {
              if (parentDescendants.has(node.id)) {
                return {
                  ...node,
                  position: {
                    x: node.position.x + parentOffsetX,
                    y: node.position.y + parentOffsetY,
                  },
                };
              }
              return node;
            });
          }
        }
        
        return resultNodes;
      }
    }
  }
  
  // Handle preserveParentId even if preserveRootPosition is not enabled
  if (config.preserveParentId && config.originalNodes) {
    const parentNode = layoutedNodes.find(n => n.id === config.preserveParentId);
    const originalParent = config.originalNodes.find(n => n.id === config.preserveParentId);
    
    if (parentNode && originalParent) {
      // Calculate offset to preserve parent's position
      const parentOffsetX = originalParent.position.x - parentNode.position.x;
      const parentOffsetY = originalParent.position.y - parentNode.position.y;
      
      // Get all descendants of the parent (including the parent itself)
      const parentDescendants = new Set([config.preserveParentId, ...getDescendantIds(config.preserveParentId, edges)]);
      
      // Apply offset to parent and all its descendants
      return layoutedNodes.map(node => {
        if (parentDescendants.has(node.id)) {
          return {
            ...node,
            position: {
              x: node.position.x + parentOffsetX,
              y: node.position.y + parentOffsetY,
            },
          };
        }
        return node;
      });
    }
  }

  // Return all positioned nodes (preserve any unpositioned nodes with original position)
  return layoutedNodes;
}

/**
 * Find the slot index at a given y position for nodes at a specific level
 * (In horizontal layout, siblings are stacked vertically, so we use Y position)
 */
export function getSlotAtPosition(
  y: number,
  level: number,
  nodes: TaskNode[]
): number {
  const nodesAtLevel = nodes.filter(n => n.data.level === level);
  nodesAtLevel.sort((a, b) => a.data.slot - b.data.slot);

  if (nodesAtLevel.length === 0) return 0;

  // Find closest slot based on current Y positions (vertical stacking)
  let closestSlot = 0;
  let minDistance = Infinity;

  for (let i = 0; i < nodesAtLevel.length; i++) {
    const node = nodesAtLevel[i];
    const distance = Math.abs(y - node.position.y);
    
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

/**
 * Find the root ancestor (level 0 node) of a given node
 * Returns the node ID of the root ancestor, or null if not found
 */
export function findRootAncestor(nodeId: string, nodes: TaskNode[], edges: Edge[]): string | null {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  
  // If this is already a root node, return it
  if (node.data.level === 0) {
    return nodeId;
  }
  
  // Find the parent node
  const incomingEdge = edges.find(e => e.target === nodeId);
  if (!incomingEdge) return null;
  
  // Recursively find the root ancestor
  return findRootAncestor(incomingEdge.source, nodes, edges);
}
