import { type FC } from 'react';
import { useGraphStore } from '../store/graphStore';
import { colors } from '../theme/colors';
import type { TaskNode } from '../store/graphStore';

const Pinboard: FC = () => {
  const { nodes, edges, pinnedNodeIds, toggleNodeCompleted, unpinNode } = useGraphStore();

  const pinnedNodes = pinnedNodeIds
    .map(id => nodes.find(n => n.id === id))
    .filter((node): node is TaskNode => node !== undefined);

  // Helper function to find parent node
  const getParentNode = (nodeId: string) => {
    const parentEdge = edges.find(edge => edge.target === nodeId);
    if (parentEdge) {
      return nodes.find(n => n.id === parentEdge.source);
    }
    return null;
  };

  if (pinnedNodes.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        backgroundColor: colors.neutral.gray50,
        borderTop: `2px solid ${colors.neutral.gray200}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.neutral.gray400,
        fontSize: '14px',
        zIndex: 1000,
      }}>
        Pin leaf nodes to add them to your pinboard
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '120px',
      backgroundColor: colors.neutral.white,
      borderTop: `2px solid ${colors.neutral.gray200}`,
      overflowX: 'auto',
      overflowY: 'hidden',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        height: '100%',
      }}>
        {pinnedNodes.map(node => (
          <div
            key={node.id}
            style={{
              minWidth: '200px',
              maxWidth: '300px',
              height: '88px',
              backgroundColor: colors.neutral.white,
              border: `2px solid ${colors.neutral.gray200}`,
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
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
        ))}
      </div>
    </div>
  );
};

export default Pinboard;

