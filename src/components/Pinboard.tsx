import { type FC, useState, useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';
import { colors } from '../theme/colors';
import type { TaskNode } from '../store/graphStore';

const PINBOARD_HEIGHT = 180; // Increased from 120px

const Pinboard: FC = () => {
  const { 
    nodes, 
    edges, 
    pinnedNodeIds, 
    batchTitle,
    toggleNodeCompleted, 
    unpinNode,
    unpinAll,
    reorderPinnedNodes,
    toggleAllPinnedCompleted,
    setBatchTitle,
  } = useGraphStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localBatchTitle, setLocalBatchTitle] = useState(batchTitle);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  // Sync local title with store title when it changes externally
  useEffect(() => {
    setLocalBatchTitle(batchTitle);
  }, [batchTitle]);

  // Custom cursor styles
  const cursorStyle = draggedIndex !== null 
    ? `url('/closed_cursor_drag.svg') 12 12, grabbing`
    : `url('/open_cursor_drag.svg') 12 12, grab`;

  const pinnedNodes = pinnedNodeIds
    .map(id => nodes.find(n => n.id === id))
    .filter((node): node is TaskNode => node !== undefined);

  // Calculate display order during drag (creates space for dragged item)
  const orderedNodes = (() => {
    if (draggedIndex === null || hoverIndex === null) {
      return pinnedNodes;
    }

    // Create a copy and reorder
    const items = [...pinnedNodes];
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(hoverIndex, 0, draggedItem);
    return items;
  })();

  // Helper function to find parent node
  const getParentNode = (nodeId: string) => {
    const parentEdge = edges.find(edge => edge.target === nodeId);
    if (parentEdge) {
      return nodes.find(n => n.id === parentEdge.source);
    }
    return null;
  };

  // Check if all pinned nodes are completed
  const allCompleted = pinnedNodes.length > 0 && pinnedNodes.every(n => n.data.completed);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setHoverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setHoverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && hoverIndex !== null && draggedIndex !== hoverIndex) {
      reorderPinnedNodes(draggedIndex, hoverIndex);
    }
    setDraggedIndex(null);
    setHoverIndex(null);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: `${PINBOARD_HEIGHT}px`,
      backgroundColor: colors.neutral.white,
      borderTop: `2px solid ${colors.neutral.gray200}`,
      overflowX: 'auto',
      overflowY: 'hidden',
      zIndex: 1000,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {pinnedNodes.length === 0 ? (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.neutral.gray400,
          fontSize: '14px',
        }}>
          Pin leaf nodes to add them to your pinboard
        </div>
      ) : (
        <>
          {/* Batch Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '8px',
            borderBottom: `1px solid ${colors.neutral.gray200}`,
          }}>
            {/* Check All Checkbox */}
            <button
              onClick={toggleAllPinnedCompleted}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: `2px solid ${colors.neutral.gray400}`,
                backgroundColor: allCompleted ? colors.secondary.blue : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {allCompleted && (
                <svg
                  width="14"
                  height="14"
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

            {/* Batch Title */}
            {isEditingTitle ? (
              <input
                type="text"
                value={localBatchTitle}
                onChange={(e) => setLocalBatchTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  // Only save to store (and create undo snapshot) when editing is done
                  if (localBatchTitle !== batchTitle) {
                    setBatchTitle(localBatchTitle);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    // Only save to store (and create undo snapshot) when editing is done
                    if (localBatchTitle !== batchTitle) {
                      setBatchTitle(localBatchTitle);
                    }
                  }
                  if (e.key === 'Escape') {
                    // Cancel editing and revert to original value
                    setLocalBatchTitle(batchTitle);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                style={{
                  flex: 1,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.neutral.gray800,
                  border: `2px solid ${colors.primary.main}`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  outline: 'none',
                }}
              />
            ) : (
              <h3
                onClick={() => {
                  setLocalBatchTitle(batchTitle); // Initialize local state when starting to edit
                  setIsEditingTitle(true);
                }}
                style={{
                  flex: 1,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.neutral.gray800,
                  margin: 0,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.neutral.gray100)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {batchTitle}
              </h3>
            )}

            {/* Clear All Button */}
            <button
              onClick={unpinAll}
              style={{
                padding: '6px 16px',
                backgroundColor: colors.neutral.gray100,
                color: colors.neutral.gray700,
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.neutral.gray200)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.neutral.gray100)}
            >
              Clear All
            </button>
          </div>

          {/* Pinned Todos */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
          }}>
            {orderedNodes.map((node, index) => {
              // Find the original index of this node
              const originalIndex = pinnedNodes.findIndex(n => n.id === node.id);
              const isDragging = draggedIndex === originalIndex;
              
              return (
                <div
                  key={node.id}
                  data-pinboard-item
                  draggable
                  onDragStart={() => handleDragStart(originalIndex)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    minWidth: '200px',
                    maxWidth: '300px',
                    height: '88px',
                    backgroundColor: colors.neutral.white,
                    border: `2px solid ${colors.neutral.gray200}`,
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    cursor: cursorStyle,
                    opacity: isDragging ? 0.5 : 1,
                    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s ease-out',
                  }}
                >
                {/* Remove button */}
                <button
                  onClick={() => unpinNode(node.id)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#fee2e2',
                    color: colors.error,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 10,
                  }}
                >
                  ×
                </button>

                {/* Checkbox and label */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                  <button
                    onClick={() => toggleNodeCompleted(node.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${colors.neutral.gray400}`,
                      backgroundColor: node.data.completed ? colors.secondary.blue : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                      marginTop: '2px',
                    }}
                  >
                    {node.data.completed && (
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

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontWeight: '500',
                      color: colors.neutral.gray800,
                      fontSize: '14px',
                      textDecoration: node.data.completed ? 'line-through' : 'none',
                      opacity: node.data.completed ? 0.6 : 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                      marginBottom: '4px',
                    }}>
                      {node.data.label}
                    </div>
                    
                    {/* Parent info */}
                    {(() => {
                      const parentNode = getParentNode(node.id);
                      if (parentNode) {
                        return (
                          <div style={{
                            fontSize: '11px',
                            color: colors.neutral.gray500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            Parent: {parentNode.data.label}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export { PINBOARD_HEIGHT };
export default Pinboard;
