import { type FC, useState, useEffect, useRef } from 'react';
import { colors } from '../theme/colors';

const Timer: FC = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [originalTotalSeconds, setOriginalTotalSeconds] = useState(25 * 60); // Store original time
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const intervalRef = useRef<number | null>(null);
  
  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const timerRef = useRef<HTMLDivElement>(null);

  // Initialize position to center-bottom on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight - 260, // 120px pinboard + 140px default position
      });
    }
  }, []);

  const totalSeconds = minutes * 60 + seconds;

  // Initialize timeLeft and original time when component mounts
  useEffect(() => {
    setTimeLeft(totalSeconds);
    setOriginalTotalSeconds(totalSeconds);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Play completion sound or show notification here
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    if (totalSeconds > 0) {
      setIsRunning(true);
      setIsEditing(false);
      // Set original time when starting for the first time
      if (timeLeft === totalSeconds) {
        setOriginalTotalSeconds(totalSeconds);
      }
    }
  };

  const handlePause = () => {
    // Just pause - don't reset anything
    setIsRunning(false);
  };

  const handleResume = () => {
    // Resume from current timeLeft
    if (timeLeft > 0) {
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(originalTotalSeconds);
    // Set minutes and seconds back to original
    setMinutes(Math.floor(originalTotalSeconds / 60));
    setSeconds(originalTotalSeconds % 60);
  };

  const handleEdit = () => {
    // Don't activate edit mode if we just finished dragging
    if (!isRunning && !hasDragged) {
      setIsEditing(true);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(60, Math.max(0, parseInt(e.target.value) || 0));
    setMinutes(value);
    const newTotal = value * 60 + seconds;
    // Reset when time is changed
    setTimeLeft(newTotal);
    setOriginalTotalSeconds(newTotal);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
    setSeconds(value);
    const newTotal = minutes * 60 + value;
    // Reset when time is changed
    setTimeLeft(newTotal);
    setOriginalTotalSeconds(newTotal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on buttons or inputs
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    
    setIsDragging(true);
    setHasDragged(false); // Reset drag flag
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setHasDragged(true); // Mark that we've moved during this drag
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Reset hasDragged after a short delay to allow click handlers to check it
      setTimeout(() => setHasDragged(false), 100);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // No useEffect needed - we'll use a backdrop approach instead

  const progress = originalTotalSeconds > 0 ? timeLeft / originalTotalSeconds : 0;
  const displayMinutes = Math.floor(timeLeft / 60);
  const displaySeconds = timeLeft % 60;

  // Calculate circle properties
  const radius = 80; // Increased from 70
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <>
      {/* Invisible backdrop when editing - clicking it closes edit mode */}
      {isEditing && (
        <div
          onClick={() => setIsEditing(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            cursor: 'default',
          }}
        />
      )}

      <div
        ref={timerRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1001,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
      {/* Timer Circle */}
      <div
        style={{
          width: '210px',
          height: '210px',
          backgroundColor: colors.neutral.white,
          borderRadius: '50%',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `3px solid ${colors.neutral.gray200}`,
          position: 'relative',
        }}
      >
      {/* Circular Progress */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: 'rotate(-90deg)',
        }}
        viewBox="0 0 210 210"
      >
        {/* Background circle */}
        <circle
          cx="105"
          cy="105"
          r={radius}
          fill="none"
          stroke={colors.neutral.gray100}
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx="105"
          cy="105"
          r={radius}
          fill="none"
          stroke={colors.primary.main}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: isRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease-out',
          }}
        />
      </svg>

        {/* Content */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
        {/* Time Display / Input */}
        {isEditing ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <input
              type="number"
              value={minutes}
              onChange={handleMinutesChange}
              onKeyDown={handleKeyDown}
              min="0"
              max="60"
              style={{
                width: '55px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.neutral.gray800,
                textAlign: 'center',
                border: `2px solid ${colors.primary.main}`,
                borderRadius: '8px',
                padding: '8px 4px',
                outline: 'none',
              }}
            />
            <span
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.neutral.gray800,
              }}
            >
              :
            </span>
            <input
              type="number"
              value={seconds.toString().padStart(2, '0')}
              onChange={handleSecondsChange}
              onKeyDown={handleKeyDown}
              min="0"
              max="59"
              style={{
                width: '55px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.neutral.gray800,
                textAlign: 'center',
                border: `2px solid ${colors.primary.main}`,
                borderRadius: '8px',
                padding: '8px 4px',
                outline: 'none',
              }}
            />
          </div>
        ) : (
          <div
            onClick={handleEdit}
            style={{
              fontSize: '40px',
              fontWeight: 'bold',
              color: colors.neutral.gray800,
              cursor: isRunning ? 'default' : 'pointer',
              userSelect: 'none',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayMinutes.toString().padStart(2, '0')}:{displaySeconds.toString().padStart(2, '0')}
          </div>
        )}
        </div>
      </div>

      {/* Controls - Below Circle */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {isRunning ? (
          <button
            onClick={handlePause}
            style={{
              padding: '10px 24px',
              backgroundColor: colors.primary.light,
              color: colors.neutral.white,
              border: 'none',
              borderRadius: '24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary.main)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.primary.light)}
          >
            Pause
          </button>
        ) : (
          <>
            <button
              onClick={timeLeft === originalTotalSeconds ? handleStart : handleResume}
              disabled={totalSeconds === 0 || timeLeft === 0}
              style={{
                padding: '10px 24px',
                backgroundColor: (totalSeconds === 0 || timeLeft === 0) ? colors.neutral.gray400 : colors.primary.light,
                color: colors.neutral.white,
                border: 'none',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (totalSeconds === 0 || timeLeft === 0) ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              onMouseEnter={(e) => {
                if (totalSeconds > 0 && timeLeft > 0) {
                  e.currentTarget.style.backgroundColor = colors.primary.main;
                }
              }}
              onMouseLeave={(e) => {
                if (totalSeconds > 0 && timeLeft > 0) {
                  e.currentTarget.style.backgroundColor = colors.primary.light;
                }
              }}
            >
              {timeLeft === originalTotalSeconds ? 'Start' : 'Resume'}
            </button>
            {timeLeft !== originalTotalSeconds && timeLeft > 0 && (
              <button
                onClick={handleReset}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.neutral.gray100,
                  color: colors.neutral.gray700,
                  border: 'none',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.neutral.gray200)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.neutral.gray100)}
              >
                Reset
              </button>
            )}
          </>
        )}
      </div>
      </div>
    </>
  );
};

export default Timer;

