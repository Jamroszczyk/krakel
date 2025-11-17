import { type FC, useState, useRef, useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';
import { colors } from '../theme/colors';

const Topbar: FC = () => {
  const { addNode, saveToJSON, loadFromJSON, applyAutoLayout, undo, redo, canUndo, canRedo } = useGraphStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isImpressumOpen, setIsImpressumOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAddRootNode = () => {
    addNode(undefined, 0);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleSave = () => {
    const json = saveToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krakel-graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = event.target?.result as string;
          loadFromJSON(json);
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setIsMenuOpen(false);
  };

  const handleImpressum = () => {
    setIsImpressumOpen(true);
    setIsMenuOpen(false);
  };

  // Handle keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're editing a node (textarea is focused)
      const isEditingNode = document.activeElement?.tagName === 'TEXTAREA';
      
      // Only handle shortcuts if we're NOT editing
      if (!isEditingNode) {
        // Undo: Ctrl+Z (or Cmd+Z on Mac)
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          if (canUndo()) {
            undo();
          }
        }
        
        // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
        if (
          ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
          ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey)
        ) {
          event.preventDefault();
          if (canRedo()) {
            redo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      backgroundColor: colors.neutral.white,
      borderBottom: `2px solid ${colors.neutral.gray200}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      {/* Left: Logo + App Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img 
          src="/octopus_logo.svg" 
          alt="Krakel Logo" 
          style={{ 
            width: '36px', 
            height: '36px',
          }} 
        />
        <h1 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: colors.neutral.gray900,
          margin: 0,
        }}>
          Krakel
        </h1>
      </div>

      {/* Center: Buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Undo Button */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          style={{
            padding: '10px 20px',
            backgroundColor: canUndo() ? colors.neutral.gray100 : colors.neutral.gray50,
            color: canUndo() ? colors.neutral.gray700 : colors.neutral.gray400,
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '14px',
            cursor: canUndo() ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (canUndo()) {
              e.currentTarget.style.backgroundColor = colors.neutral.gray200;
            }
          }}
          onMouseLeave={(e) => {
            if (canUndo()) {
              e.currentTarget.style.backgroundColor = colors.neutral.gray100;
            }
          }}
          title="Undo (Ctrl+Z)"
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Undo
        </button>

        {/* Redo Button */}
        <button
          onClick={redo}
          disabled={!canRedo()}
          style={{
            padding: '10px 20px',
            backgroundColor: canRedo() ? colors.neutral.gray100 : colors.neutral.gray50,
            color: canRedo() ? colors.neutral.gray700 : colors.neutral.gray400,
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '14px',
            cursor: canRedo() ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            if (canRedo()) {
              e.currentTarget.style.backgroundColor = colors.neutral.gray200;
            }
          }}
          onMouseLeave={(e) => {
            if (canRedo()) {
              e.currentTarget.style.backgroundColor = colors.neutral.gray100;
            }
          }}
          title="Redo (Ctrl+Y)"
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
          Redo
        </button>

        <button
          onClick={handleAddRootNode}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.primary.light,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary.main}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary.light}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Root Task
        </button>

        <button
          onClick={applyAutoLayout}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.neutral.gray100,
            color: colors.neutral.gray700,
            border: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray200}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray100}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 12h16M4 19h16" />
          </svg>
          Auto Format
        </button>
      </div>

      {/* Right: Burger Menu */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray100}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.neutral.gray700} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            backgroundColor: colors.neutral.white,
            border: `2px solid ${colors.neutral.gray200}`,
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            minWidth: '200px',
            overflow: 'hidden',
            zIndex: 2000,
          }}>
            <button
              onClick={handleSave}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.neutral.gray800,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray50}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save JSON
            </button>

            <button
              onClick={handleLoad}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.neutral.gray800,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray50}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Load JSON
            </button>

            <div style={{ height: '1px', backgroundColor: colors.neutral.gray200, margin: '4px 0' }} />

            <button
              onClick={handleImpressum}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.neutral.gray800,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray50}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Impressum
            </button>
          </div>
        )}
      </div>

      {/* Impressum Modal */}
      {isImpressumOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsImpressumOpen(false)}
        >
          <div 
            style={{
              backgroundColor: colors.neutral.white,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsImpressumOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: colors.neutral.gray100,
                color: colors.neutral.gray700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray200}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.neutral.gray100}
            >
              ×
            </button>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: colors.neutral.gray900,
              marginBottom: '24px',
              marginTop: 0,
            }}>
              Impressum
            </h2>

            <div style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: colors.neutral.gray700,
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: colors.neutral.gray900 }}>
                Betreiber
              </p>
              <p style={{ margin: '0 0 16px 0' }}>
                Consulting & Code
              </p>

              <p style={{ margin: '0 0 4px 0' }}>
                Behringstraße
              </p>
              <p style={{ margin: '0 0 16px 0' }}>
                22763 Hamburg
              </p>

              <a 
                href="mailto:code.consult.digital@gmail.com"
                style={{
                  color: colors.primary.main,
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                code.consult.digital@gmail.com
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Topbar;

