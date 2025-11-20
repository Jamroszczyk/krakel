import { memo, useState, useRef, useEffect, useMemo, useCallback, type FC } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useGraphStore } from '../store/graphStore';
import { colors } from '../theme/colors';

interface EditableNodeProps extends NodeProps {
  isDragOver?: boolean;
  isBeingDragged?: boolean;
}

const EditableNode: FC<EditableNodeProps> = ({ id, data, selected, isDragOver = false, isBeingDragged = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(data.label);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const updateNodeLabel = useGraphStore(state => state.updateNodeLabel);
  const toggleNodeCompleted = useGraphStore(state => state.toggleNodeCompleted);
  const addNode = useGraphStore(state => state.addNode);
  const pinNode = useGraphStore(state => state.pinNode);
  const deselectAllNodes = useGraphStore(state => state.deselectAllNodes);
  const setEditingNodeId = useGraphStore(state => state.setEditingNodeId);
  
  // PERFORMANCE FIX: Use selectors to minimize re-renders
  const pinnedNodeIds = useGraphStore(state => state.pinnedNodeIds);
  const isDragging = useGraphStore(state => state.isDragging); // PERFORMANCE: Check if dragging to skip expensive operations
  
  // Only subscribe to edges structure (not positions) - edges don't change during drag
  const edges = useGraphStore(state => state.edges);
  
  // Memoize hasChildren check - only depends on edges, which don't change during drag
  const hasChildren = useMemo(() => {
    return edges.some(edge => edge.source === id);
  }, [edges, id]);
  
  // PERFORMANCE FIX: Only subscribe to completion status of descendant leaf nodes, not entire nodes array
  // Returns a serialized string that only changes when completion status changes (not positions)
  // PERFORMANCE: Skip expensive calculation during drag - use cached value or 0
  const completionSelector = useCallback(
    (state: ReturnType<typeof useGraphStore.getState>) => {
      // PERFORMANCE: Skip expensive calculation during drag
      if (state.isDragging || !hasChildren) return '';
      
      // Get all descendant IDs using BFS
      const descendants = new Set<string>();
      const queue = [id];
      
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = state.edges
          .filter(edge => edge.source === currentId)
          .map(edge => edge.target);
        
        children.forEach(childId => {
          if (!descendants.has(childId)) {
            descendants.add(childId);
            queue.push(childId);
          }
        });
      }
      
      // Extract only completion status of leaf descendants (sorted for consistent hash)
      const leafCompletions: Array<[string, boolean]> = [];
      descendants.forEach(descendantId => {
        const node = state.nodes.find(n => n.id === descendantId);
        if (node) {
          // Only store leaf nodes' completion status (they're the ones that matter for progress)
          const nodeHasChildren = state.edges.some(e => e.source === descendantId);
          if (!nodeHasChildren) {
            leafCompletions.push([descendantId, node.data.completed ?? false]);
          }
        }
      });
      
      // Sort by ID for consistent hash, then serialize
      leafCompletions.sort((a, b) => a[0].localeCompare(b[0]));
      return JSON.stringify(leafCompletions);
    },
    [id, hasChildren]
  );
  
  // Zustand will use shallow equality for strings (which compares by value)
  const descendantCompletionHash = useGraphStore(completionSelector);
  
  // PERFORMANCE: Cache progress value to avoid recalculation during drag
  const progressRef = useRef<number>(0);
  
  // Calculate progress from the completion hash
  // PERFORMANCE: Use cached progress during drag to avoid recalculation
  const progress = useMemo(() => {
    // PERFORMANCE: Skip calculation during drag - use cached value
    if (isDragging) {
      return progressRef.current; // Return cached value during drag
    }
    
    if (!hasChildren || !descendantCompletionHash) {
      progressRef.current = 0;
      return 0;
    }
    
    try {
      const leafCompletions: Array<[string, boolean]> = JSON.parse(descendantCompletionHash);
      if (leafCompletions.length === 0) {
        progressRef.current = 0;
        return 0;
      }
      
      const completedCount = leafCompletions.filter(([, completed]) => completed).length;
      const calculatedProgress = completedCount / leafCompletions.length;
      progressRef.current = calculatedProgress; // Cache the value
      return calculatedProgress;
    } catch {
      progressRef.current = 0;
      return 0;
    }
  }, [hasChildren, descendantCompletionHash, isDragging]);
  
  // Check if this node is pinned
  const isPinned = pinnedNodeIds.includes(id);

  useEffect(() => {
    setLocalLabel(data.label);
  }, [data.label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Position cursor at the end of the text instead of selecting all
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditingNodeId(id); // Notify store that this node is being edited
  };

  const handleBlur = () => {
    setIsEditing(false);
    setEditingNodeId(null); // Clear editing state
    updateNodeLabel(id, localLabel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalLabel(data.label);
      setIsEditing(false);
      setEditingNodeId(null); // Clear editing state
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // If editing, prevent all mouse events from propagating to prevent dragging
    if (isEditing) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const childLevel = (data.level + 1) as 1 | 2;
    addNode(id, childLevel);
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeCompleted(id);
  };

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    pinNode(id);
  };

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    // Prevent drag from starting when clicking buttons
    e.stopPropagation();
  };

  // Node is completed if it's a parent with 100% progress OR a leaf node that's checked
  const isCompleted = (hasChildren && progress === 1) || (!hasChildren && data.completed);

  const nodeStyle: React.CSSProperties = {
    padding: !hasChildren ? '12px 32px 12px 16px' : '12px 16px', // Extra padding right for leaf nodes (for pin button)
    borderRadius: '12px',
    boxShadow: selected ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    outline: isEditing ? `2px solid ${colors.secondary.blue}` : 'none',
    minWidth: '120px',
    maxWidth: '300px',
    transition: 'all 0.3s ease-out',
    backgroundColor: isCompleted ? colors.primary.lighter : colors.neutral.white,
  };

  const canHaveChildren = data.level < 2;
  
  // For progress border animation and celebration
  const [animatedProgress, setAnimatedProgress] = useState(() => {
    // Initialize progress: 1 for completed leaf nodes, otherwise use calculated progress
    return (!hasChildren && data.completed) ? 1 : progress;
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevProgress, setPrevProgress] = useState(progress);
  const [prevCompleted, setPrevCompleted] = useState(data.completed);
  
  useEffect(() => {
    // Only update animated progress for parent nodes (hasChildren)
    if (hasChildren) {
      setAnimatedProgress(progress);
      
      // Trigger celebration when parent node reaches 100%
      if (progress === 1 && prevProgress < 1) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 1000);
      }
      setPrevProgress(progress);
    }
  }, [progress, prevProgress, hasChildren]);

  // Trigger celebration when leaf node is checked
  useEffect(() => {
    if (!hasChildren && data.completed && !prevCompleted) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1000);
      // Animate progress from 0 to 1 for leaf nodes
      setAnimatedProgress(1);
    } else if (!hasChildren && !data.completed) {
      // Reset progress when unchecked
      setAnimatedProgress(0);
    }
    setPrevCompleted(data.completed);
  }, [data.completed, prevCompleted, hasChildren]);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Celebration Particles - FIREWORK BURST 🎆 */}
      {showCelebration && (
        <>
          {[...Array(32)].map((_, i) => {
            const size = 4 + Math.random() * 3; // 4-7px random size
            const duration = 0.5 + Math.random() * 0.2; // 0.5-0.7s
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: '50%',
                  backgroundColor: colors.primary.main,
                  pointerEvents: 'none',
                  animation: `particle-${i} ${duration}s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                  opacity: 0,
                  boxShadow: `0 0 ${size * 2}px ${colors.primary.main}`,
                }}
              />
            );
          })}
          <style>
            {[...Array(32)].map((_, i) => {
              const angle = (i * 360) / 32;
              const distance = 80 + Math.random() * 40; // 80-120px
              const rotation = Math.random() * 360; // Random rotation
              return `
                @keyframes particle-${i} {
                  0% {
                    transform: translate(-50%, -50%) translate(0, 0) scale(1.2) rotate(0deg);
                    opacity: 1;
                  }
                  70% {
                    opacity: 1;
                  }
                  100% {
                    transform: translate(-50%, -50%) translate(${Math.cos(angle * Math.PI / 180) * distance}px, ${Math.sin(angle * Math.PI / 180) * distance}px) scale(0) rotate(${rotation}deg);
                    opacity: 0;
                  }
                }
              `;
            }).join('')}
          </style>
        </>
      )}

      {/* Selection outline overlay for parent nodes */}
      {selected && hasChildren && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: '-4px',
            right: '-4px',
            bottom: '-4px',
            border: `2px solid ${colors.secondary.blue}`,
            borderRadius: '16px',
            pointerEvents: 'none',
            zIndex: 5,
            opacity: 1,
            animation: 'fadeIn 0.2s ease-out',
          }}
        />
      )}

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}
      </style>

      <div
        style={{
          ...nodeStyle,
          position: 'relative',
          border: isDragOver 
            ? `3px solid ${colors.secondary.blue}`
            : hasChildren || (!hasChildren && data.completed)
            ? `3px solid ${colors.neutral.gray200}`
            : selected ? `2px solid ${colors.secondary.blue}` : `2px solid ${colors.neutral.gray200}`,
          boxShadow: isDragOver ? `0 0 20px ${colors.secondary.blue}40` : undefined,
          transition: isDragOver ? 'all 0.2s ease' : undefined,
          opacity: isBeingDragged ? 0.6 : 1,
        }}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          // Prevent drag when editing
          if (isEditing) {
            e.stopPropagation();
          }
        }}
      >
      {/* Invisible handles for edges - required by ReactFlow */}
      {/* Target handle on left (incoming edges from parent) */}
      {/* Always render the handle, even for root nodes, so edges can be created */}
      {/* Hide it visually for root nodes (level 0) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="target" 
        style={{ 
          opacity: data.level > 0 ? 0 : 0, // Always invisible, but always exists
          pointerEvents: 'none',
        }} 
      />

      {/* Pin button for leaf nodes */}
      {!hasChildren && !isPinned && (
        <button
          onClick={handlePinToggle}
          onMouseDown={handleButtonMouseDown}
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: isHovered ? colors.neutral.gray100 : 'transparent',
            color: colors.neutral.gray500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            opacity: isHovered ? 1 : 0,
            transition: 'all 0.2s',
            zIndex: 5,
          }}
          title="Pin to pinboard"
        >
          📌
        </button>
      )}
      
      {/* Pinned indicator */}
      {isPinned && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
          title="Pinned to pinboard"
        >
          📌
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Checkbox for leaf nodes */}
        {!hasChildren && (
          <button
            onClick={handleToggleComplete}
            onMouseDown={handleButtonMouseDown}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: `2px solid ${colors.neutral.gray400}`,
              backgroundColor: data.completed ? colors.secondary.blue : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            {data.completed && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 6L5 9L10 3"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}

        {isEditing ? (
          <textarea
            ref={inputRef}
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onFocus={() => {
              // Deselect any selected nodes when focusing on text input
              deselectAllNodes();
              // Ensure editing state is set (in case textarea regains focus)
              setEditingNodeId(id);
            }}
            onMouseDown={(e) => {
              // Stop propagation to prevent node drag from starting
              e.stopPropagation();
            }}
            onMouseMove={(e) => {
              // Stop propagation to prevent any drag behavior
              e.stopPropagation();
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              outline: 'none',
              resize: 'none',
              fontWeight: '500',
              color: colors.neutral.gray800,
              border: 'none',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              minHeight: '1.5rem',
            }}
            rows={Math.max(1, localLabel.split('\n').length)}
          />
        ) : (
          <div style={{ 
            fontWeight: '500', 
            color: colors.neutral.gray800, 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            textDecoration: data.completed ? 'line-through' : 'none',
            opacity: data.completed ? 0.6 : 1,
          }}>
            {localLabel}
          </div>
        )}
      </div>

        {/* Invisible handles for edges - required by ReactFlow */}
        {/* Source handle on right (outgoing edges to children) */}
        {data.level < 2 && (
          <Handle 
            type="source" 
            position={Position.Right} 
            style={{ 
              opacity: 0,
              pointerEvents: 'none',
            }} 
          />
        )}
      </div>

      {/* SVG Progress Border Overlay - for parent nodes and completed leaf nodes */}
      {(hasChildren || (!hasChildren && data.completed)) && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
            opacity: animatedProgress > 0 ? 1 : 0,
            transition: 'opacity 0.2s ease-out',
          }}
          preserveAspectRatio="none"
        >
          {/* Progress border (green) */}
          <rect
            x="1.5"
            y="1.5"
            width="calc(100% - 3px)"
            height="calc(100% - 3px)"
            rx="12"
            ry="12"
            fill="none"
            stroke={colors.secondary.green}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - animatedProgress)}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
            pathLength="1000"
          />
        </svg>
      )}

      {/* Add Child Button - positioned on the right side for horizontal layout */}
      {canHaveChildren && (
        <button
          onClick={handleAddChild}
          onMouseDown={handleButtonMouseDown}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: `2px solid ${colors.neutral.gray200}`,
            backgroundColor: colors.neutral.white,
            color: colors.secondary.blue,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s ease-out, background-color 0.2s',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.secondary.blue;
            e.currentTarget.style.color = colors.neutral.white;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.neutral.white;
            e.currentTarget.style.color = colors.secondary.blue;
          }}
        >
          <span style={{ display: 'inline-block', transform: 'translateY(1px)' }}>+</span>
        </button>
      )}
    </div>
  );
};

// Memoize with custom comparison to prevent unnecessary re-renders
// Only re-render if id, data, or selected actually change
export default memo(EditableNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.level === nextProps.data.level &&
    prevProps.data.slot === nextProps.data.slot &&
    prevProps.data.completed === nextProps.data.completed
  );
});

