import { memo, useState, useCallback, useEffect, useRef } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { useGraphStore } from '../store/graphStore';

function EditableNode({ id, data, selected }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { updateNode, setNodeDraggable, setIsAnyNodeEditing } = useGraphStore();

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setNodeDraggable(id, false); // Deaktiviere Dragging im Edit-Modus
    setIsAnyNodeEditing(true); // Signalisiere, dass ein Node editiert wird
  }, [id, setNodeDraggable, setIsAnyNodeEditing]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setNodeDraggable(id, true); // Aktiviere Dragging wieder
    setIsAnyNodeEditing(false); // Signalisiere, dass kein Node mehr editiert wird
    if (label.trim() !== data.label) {
      updateNode(id, { label: label.trim() || 'Neuer Node' });
    }
  }, [id, label, data.label, updateNode, setNodeDraggable, setIsAnyNodeEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setLabel(data.label || '');
        setIsEditing(false);
        setNodeDraggable(id, true); // Aktiviere Dragging wieder
        setIsAnyNodeEditing(false); // Signalisiere, dass kein Node mehr editiert wird
      }
    },
    [data.label, id, setNodeDraggable, setIsAnyNodeEditing]
  );

  const { isAnyNodeEditing } = useGraphStore();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Auto-resize textarea to fit content
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  // Reagiere auf externes Beenden des Edit-Modus
  useEffect(() => {
    if (!isAnyNodeEditing && isEditing) {
      // Edit-Modus wurde von außen beendet, blur das textarea
      inputRef.current?.blur();
    }
  }, [isAnyNodeEditing, isEditing]);

  useEffect(() => {
    setLabel(data.label || '');
  }, [data.label]);

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`px-3 py-2 ${isEditing ? 'no-pan' : ''}`}
      style={{
        minWidth: '120px',
        maxWidth: '300px',
      }}
    >
      <Handle type="target" position={Position.Top} />

      {isEditing ? (
        <textarea
          ref={inputRef}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            // Auto-resize on change
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-none outline-none resize-none text-sm font-medium text-gray-800 overflow-hidden no-pan"
          style={{
            minHeight: '20px',
            fontFamily: 'inherit',
            lineHeight: '1.5',
          }}
        />
      ) : (
        <div className="text-sm font-medium text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
          {label || 'Neuer Node'}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(EditableNode);

