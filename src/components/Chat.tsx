import { type FC, useState, useRef, useEffect, useCallback } from 'react';
import { colors } from '../theme/colors';
import { PINBOARD_HEIGHT } from './Pinboard';
import { useGraphStore } from '../store/graphStore';

// Animated Checkbox Component for Success State
const AnimatedCheckbox: FC = () => {
  return (
    <div
      style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: colors.secondary.blue,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        animation: 'checkmarkScale 0.5s ease-out',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.neutral.white}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: 'checkmarkDraw 0.5s ease-out 0.2s both',
        }}
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </div>
  );
};

// Swimming Octopus Animation Component
const SwimmingOctopus: FC = () => {
  return (
    <div
      style={{
        width: '120px',
        height: '120px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 144 144"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: 'swim 2s ease-in-out infinite',
        }}
      >
        <defs>
          <linearGradient id="octopusGradient" x1="72.0155" y1="9.00049" x2="72.0155" y2="135.316" gradientUnits="userSpaceOnUse">
            <stop stopColor={colors.primary.main} />
            <stop offset="1" stopColor={colors.secondary.blue} />
          </linearGradient>
        </defs>
        <path
          d="M14.5323 42.8148C16.8978 19.315 37.3117 6.81497 69.0323 9.31482C103.719 12.0484 132.032 37.521 132.032 72.3148C132.032 82.1743 129.767 91.5052 125.73 99.8148L125.715 99.8051C123.517 104.336 120.773 108.62 117.513 112.548C108.129 123.855 95.0877 131.527 80.6456 134.236C66.2035 136.944 51.2682 134.519 38.4249 127.38C27.1744 121.127 18.1485 111.601 12.504 100.128C11.1761 97.4292 12.5871 94.2593 15.3907 93.1693C18.1943 92.0797 21.3258 93.486 22.7023 96.1605C27.3925 105.274 34.689 112.84 43.7179 117.859C54.3404 123.763 66.6929 125.769 78.6378 123.529C90.5826 121.288 101.369 114.943 109.13 105.591C112.171 101.927 114.67 97.8902 116.588 93.6058C118.188 87.9775 114.103 86.835 112.333 90.5902C111 93.7491 109.319 96.7701 107.307 99.5931C101.631 107.557 93.6129 113.552 84.3693 116.743C75.1255 119.934 65.116 120.161 55.7364 117.395C48.1276 115.151 41.2402 111.027 35.6905 105.441C33.5437 103.28 33.9854 99.7858 36.3829 97.9066C38.7805 96.0276 42.2221 96.4855 44.4454 98.5677C48.5221 102.386 53.4519 105.22 58.8575 106.814C66.0356 108.931 73.6955 108.757 80.7696 106.315C87.8436 103.873 93.98 99.285 98.3234 93.1908C100.39 90.2914 102 87.1191 103.122 83.7845C104.19 76.8484 99.2089 77.7299 97.9542 80.2816C97.7529 81.0125 97.5242 81.7375 97.2667 82.4545C95.2613 88.0387 91.645 92.9031 86.8751 96.432C82.1052 99.961 76.3955 101.996 70.4689 102.281C66.4553 102.473 62.4636 101.857 58.7257 100.49C55.7626 99.4055 54.8973 95.8367 56.5226 93.1322C58.1479 90.4277 61.6648 89.654 64.7345 90.3842C66.4233 90.7859 68.1692 90.9516 69.922 90.8676C73.5912 90.6916 77.1261 89.4313 80.0792 87.2465C83.0322 85.0617 85.2712 82.0503 86.5128 78.5931C87.1059 76.9416 87.4586 75.2231 87.5685 73.4906C87.5873 73.1943 87.6198 72.898 87.6661 72.6039L87.3107 72.3148C77.3107 78.9997 69.0319 81.9554 56.8107 82.5004C27.4123 83.8111 12.3683 64.3147 14.5323 42.8148ZM110.811 56.0004C108.878 56.0006 107.311 57.5675 107.311 59.5004C107.311 61.4331 108.878 63.0001 110.811 63.0004C112.744 63.0004 114.311 61.4332 114.311 59.5004C114.311 57.5674 112.744 56.0004 110.811 56.0004Z"
          fill="url(#octopusGradient)"
        />
      </svg>
    </div>
  );
};

// Morphing Sphere Component that reacts to audio
const MorphingSphere: FC<{ isRecording: boolean; audioLevel: number; onClick: () => void }> = ({ isRecording, audioLevel, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 50;
    const points = 12;

    const draw = () => {
      // Very slow movement when not recording, subtle wobble when recording
      timeRef.current += isRecording ? 0.01 : 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate wobble/extend based on audio level (not spinning)
      const audioWobble = isRecording ? audioLevel * 12 : 0; // Extend based on voice
      const baseWobble = isRecording ? 3 : 2; // Subtle base wobble
      
      // Create gradient - more vibrant when recording
      const currentRadius = baseRadius + audioWobble;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentRadius + 10);
      gradient.addColorStop(0, colors.primary.main);
      gradient.addColorStop(0.5, colors.secondary.blue);
      gradient.addColorStop(1, colors.primary.light);

      // Draw morphing blob - wobble/extend instead of spinning
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        // Wobble effect: extend in direction based on angle and audio, not spinning
        const wobbleX = Math.sin(timeRef.current * 0.5 + angle) * baseWobble;
        const wobbleY = Math.cos(timeRef.current * 0.7 + angle) * baseWobble;
        // Extend outward based on audio level
        const audioExtend = Math.sin(angle * 2 + timeRef.current) * audioWobble;
        
        const radius = currentRadius + wobbleX + wobbleY + audioExtend;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = gradient;
      
      // Add glow effect - stronger when recording
      ctx.shadowBlur = isRecording ? (10 + audioLevel * 20) : 8;
      ctx.shadowColor = colors.primary.main;
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={180}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    />
  );
};

const Chat: FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [language, setLanguage] = useState<'en-US' | 'de-DE'>('en-US');
  const [audioLevel, setAudioLevel] = useState(0); // For audio visualization
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const loadFromJSON = useGraphStore(state => state.loadFromJSON);
  
  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  
  // LLM API URL - use Vite proxy to avoid CORS issues, can be overridden with env var
  const LLM_API_URL = import.meta.env.VITE_LLM_API_URL || '/api/lmstudio';

  // Initialize Speech Recognition
  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = true;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = language; // Use selected language

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update input with both interim and final results
      setInput((prev) => {
        // Remove previous interim results marker
        const baseText = prev.replace(/\s*\[listening\.\.\.\]\s*$/, '').trim();
        // Add final transcript and interim if exists
        const newText = baseText + (baseText ? ' ' : '') + finalTranscript + (interimTranscript ? ' [listening...]' : '');
        return newText;
      });
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognitionInstance.onend = () => {
      setIsRecording(false);
      // Clean up interim results marker
      setInput((prev) => prev.replace(/\s*\[listening\.\.\.\]\s*$/, ''));
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [language]); // Recreate recognition when language changes

  // Update recognition language when it changes (if recognition exists and not recording)
  useEffect(() => {
    if (recognition && !isRecording) {
      recognition.lang = language;
    }
  }, [language, recognition, isRecording]);

  // Initialize position to top-right on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const TOPBAR_HEIGHT = 64;
      const margin = 20;
      const chatWidth = isMinimized ? 200 : 400;
      
      setPosition({
        x: window.innerWidth - chatWidth / 2 - margin,
        y: TOPBAR_HEIGHT + (isMinimized ? 40 : 300) / 2 + margin,
      });
    }
  }, []);

  // Constrain position within viewport bounds
  const constrainPosition = useCallback((pos: { x: number; y: number }) => {
    const chatWidth = isMinimized ? 200 : 400;
    const chatHeight = isMinimized ? 40 : 500;
    const margin = 20;
    const TOPBAR_HEIGHT = 64;
    
    const minX = chatWidth / 2 + margin;
    const maxX = window.innerWidth - chatWidth / 2 - margin;
    const minY = TOPBAR_HEIGHT + chatHeight / 2 + margin;
    const maxY = window.innerHeight - PINBOARD_HEIGHT - chatHeight / 2 - margin;
    
    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, [isMinimized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prevPos) => constrainPosition(prevPos));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [constrainPosition]);

  // Adjust position when toggling minimize state
  useEffect(() => {
    setPosition((prevPos) => constrainPosition(prevPos));
  }, [isMinimized, constrainPosition]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking on buttons or inputs
    if (
      (e.target as HTMLElement).tagName === 'BUTTON' ||
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'TEXTAREA'
    ) {
      return;
    }
    
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setHasDragged(true);
        const newPos = {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        };
        setPosition(constrainPosition(newPos));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
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
  }, [isDragging, dragStart, constrainPosition]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isRecording) return;

    // Stop recording if active
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }

    const userInput = input.trim().replace(/\s*\[listening\.\.\.\]\s*$/, '');
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Prepare the request body - only send the current user message
      const requestBody = {
        model: 'qwen/qwen3-vl-8b',
        messages: [
          {
            role: 'user',
            content: userInput,
          },
        ],
        stream: false,
      };

      const response = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseContent = data.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response content received from LLM');
      }

      // Extract JSON from the response content
      // The LLM returns JSON as a string in the content field
      let jsonString = responseContent.trim();
      
      // Remove markdown code blocks if present
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      // Parse the simplified JSON and reconstruct the full format
      try {
        const simplifiedData = JSON.parse(jsonString);
        
        // Reconstruct nodes with all required properties
        const fullNodes = simplifiedData.nodes.map((node: { id: string; label: string; level: 0 | 1 | 2; slot: number }) => ({
          id: node.id,
          type: 'editableNode',
          position: { x: 0, y: 0 }, // Will be set by layout engine
          data: {
            label: node.label,
            level: node.level,
            slot: node.slot,
          },
          selected: false,
        }));

        // Create a map of node IDs to their levels for validation
        const nodeLevelMap = new Map<string, number>();
        fullNodes.forEach((node: { id: string; data: { level: number } }) => {
          nodeLevelMap.set(node.id, node.data.level);
        });

        // Reconstruct edges with all required properties and validate them
        const fullEdges = simplifiedData.edges
          .map((edge: { id: string; source: string; target: string }) => {
            const sourceLevel = nodeLevelMap.get(edge.source);
            const targetLevel = nodeLevelMap.get(edge.target);
            
            // Validate edge: source must exist and have level < 2 (can have children)
            // target must exist and have level > 0 (can have parent)
            if (sourceLevel === undefined || targetLevel === undefined) {
              console.warn(`Skipping edge ${edge.id}: source or target node not found`);
              return null;
            }
            
            if (sourceLevel >= 2) {
              console.warn(`Skipping edge ${edge.id}: source node (level ${sourceLevel}) cannot have children`);
              return null;
            }
            
            if (targetLevel <= 0) {
              console.warn(`Skipping edge ${edge.id}: target node (level ${targetLevel}) cannot have parent`);
              return null;
            }
            
            // Validate level progression: should be level -> level+1
            if (targetLevel !== sourceLevel + 1) {
              console.warn(`Skipping edge ${edge.id}: invalid level progression (${sourceLevel} -> ${targetLevel})`);
              return null;
            }
            
            return {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              type: 'default',
              animated: false,
              style: {
                stroke: '#94a3b8',
                strokeWidth: 2.5,
              },
            };
          })
          .filter((edge: { id: string; source: string; target: string; type: string; animated: boolean; style: { stroke: string; strokeWidth: number } } | null): edge is NonNullable<typeof edge> => edge !== null);

        // Create the full JSON structure
        const fullGraphData = {
          nodes: fullNodes,
          edges: fullEdges,
          pinnedNodeIds: [], // Always empty for new graphs
          batchTitle: 'Current Batch', // Default batch title
        };

        // Convert to JSON string and load
        const fullJsonString = JSON.stringify(fullGraphData);
        loadFromJSON(fullJsonString);
        
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000); // Show for 3 seconds
        // Success - the graph will be updated automatically
      } catch (parseError) {
        console.error('Failed to parse or reconstruct JSON from LLM response:', parseError);
        console.error('Response content:', jsonString);
        throw new Error('Failed to parse the graph structure. Please check the LLM response format.');
      }
    } catch (error) {
      console.error('Error calling LLM API:', error);
      setError(error instanceof Error ? error.message : 'Failed to create your to-do graph');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Audio visualization using Web Audio API
  useEffect(() => {
    if (isRecording && analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        // Normalize to 0-1 range (roughly)
        const normalizedLevel = Math.min(average / 128, 1);
        setAudioLevel(normalizedLevel);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAudioLevel(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, analyser]);

  // Cleanup audio resources
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream, audioContext]);

  const toggleRecording = async () => {
    if (!recognition) {
      setError('Speech recognition not available in this browser');
      return;
    }

    if (isRecording) {
      // Stop recording
      recognition.stop();
      setIsRecording(false);
      
      // Stop audio stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      if (microphone) {
        microphone.disconnect();
        setMicrophone(null);
      }
      if (analyser) {
        analyser.disconnect();
        setAnalyser(null);
      }
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
        setAudioContext(null);
      }
      setAudioLevel(0);
    } else {
      // Start recording
      setError(null);
      
      try {
        // Get microphone access and set up audio visualization
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setStream(mediaStream);
        
        // Create audio context for visualization
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        setAudioContext(ctx);
        
        const source = ctx.createMediaStreamSource(mediaStream);
        setMicrophone(source);
        
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;
        source.connect(analyserNode);
        setAnalyser(analyserNode);
        
        // Start speech recognition
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        setError('Failed to access microphone. Please allow microphone permissions.');
      }
    }
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div
        ref={chatRef}
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!hasDragged) {
            setIsMinimized(false);
          }
        }}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          cursor: isDragging ? 'grabbing' : 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            backgroundColor: colors.neutral.white,
            borderRadius: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: `2px solid ${colors.secondary.blue}`,
            minWidth: '160px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: colors.secondary.blue,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.neutral.gray800,
            }}
          >
             AI Brain Dump
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chatRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '420px',
          minHeight: '500px',
          maxHeight: '600px',
          backgroundColor: colors.neutral.white,
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          border: `2px solid ${colors.neutral.gray200}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: `1px solid ${colors.neutral.gray200}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.secondary.blue,
            color: colors.neutral.white,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>AI Brain Dump</div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en-US' | 'de-DE')}
              disabled={isRecording}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: `1px solid ${colors.neutral.white}40`,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: colors.neutral.white,
                fontSize: '12px',
                fontWeight: '600',
                cursor: isRecording ? 'not-allowed' : 'pointer',
                outline: 'none',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRecording) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
            >
              <option value="en-US" style={{ backgroundColor: colors.secondary.blue, color: colors.neutral.white }}>EN</option>
              <option value="de-DE" style={{ backgroundColor: colors.secondary.blue, color: colors.neutral.white }}>DE</option>
            </select>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: `2px solid ${colors.neutral.white}`,
              backgroundColor: 'transparent',
              color: colors.neutral.white,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Minimize"
          >
            −
          </button>
        </div>

         {/* Content Area */}
         <div
           style={{
             flex: 1,
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'flex-start',
             padding: '30px 20px 20px 20px',
             textAlign: 'center',
             overflowY: 'auto',
             minHeight: 0, // Allow flex shrinking
           }}
         >
           {isLoading ? (
             <div
               style={{
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 gap: '24px',
                 minHeight: '280px', // Reserve same space as main content
                 justifyContent: 'center',
               }}
             >
               {/* Swimming Octopus animation */}
               <SwimmingOctopus />
               <div
                 style={{
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '8px',
                 }}
               >
                 <div
                   style={{
                     fontSize: '18px',
                     fontWeight: '600',
                     color: colors.neutral.gray800,
                   }}
                 >
                   Creating your to-do graph...
                 </div>
                 <div
                   style={{
                     fontSize: '14px',
                     color: colors.neutral.gray500,
                   }}
                 >
                   This might take some time
                 </div>
                 </div>
               </div>
           ) : showSuccess ? (
             <div
               style={{
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 gap: '24px',
                 minHeight: '280px', // Reserve same space as main content
                 justifyContent: 'center',
               }}
             >
               {/* Animated Checkbox */}
               <AnimatedCheckbox />
               <div
                 style={{
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '8px',
                 }}
               >
                 <div
                   style={{
                     fontSize: '18px',
                     fontWeight: '600',
                     color: colors.neutral.gray800,
                   }}
                 >
                   Graph created successfully!
                 </div>
                 <div
                   style={{
                     fontSize: '14px',
                     color: colors.neutral.gray500,
                   }}
                 >
                   Your to-do graph is ready
                 </div>
               </div>
             </div>
           ) : error ? (
             <div
               style={{
                 display: 'flex',
                 flexDirection: 'column',
                 gap: '12px',
                 color: colors.error,
                 fontSize: '14px',
                 maxWidth: '300px',
               }}
             >
               <div style={{ fontWeight: '600' }}>Error</div>
               <div>{error}</div>
             </div>
           ) : (
             <>
               {/* Container with fixed height to prevent movement */}
               <div
                 style={{
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   justifyContent: 'center',
                   minHeight: '280px', // Reserve space for sphere + recording text + instruction text
                   gap: '12px',
                 }}
               >
                 {/* Morphing Sphere - Clickable */}
                 <div
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     width: '180px',
                     height: '180px',
                   }}
                 >
                   <MorphingSphere 
                     isRecording={isRecording} 
                     audioLevel={audioLevel}
                     onClick={isLoading ? () => {} : toggleRecording}
                   />
                 </div>

                 {/* Recording Status - always reserve space */}
                 <div
                   style={{
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     gap: '8px',
                     height: '32px', // Fixed height to prevent movement
                     opacity: isRecording ? 1 : 0,
                     transition: 'opacity 0.2s ease',
                     overflow: 'hidden',
                   }}
                 >
                   <div
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '8px',
                       fontSize: '16px',
                       fontWeight: '600',
                       color: colors.error,
                     }}
                   >
                     <div
                       style={{
                         width: '12px',
                         height: '12px',
                         borderRadius: '50%',
                         backgroundColor: colors.error,
                         animation: 'pulse 1.5s ease-in-out infinite',
                       }}
                     />
                     <span>Recording...</span>
                   </div>
                 </div>

                 {/* Instruction text - always reserve space */}
                 <div
                   style={{
                     fontSize: '14px',
                     color: colors.neutral.gray500,
                     maxWidth: '300px',
                     textAlign: 'center',
                     height: '40px', // Fixed height to prevent movement
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     opacity: (!isRecording && !input.trim()) ? 1 : 0,
                     transition: 'opacity 0.2s ease',
                   }}
                 >
                   Click the button and tell us what you have to do. Or start typing below.
                 </div>
               </div>
             </>
           )}
         </div>

         {/* Transcribed Text Area */}
         <div
           style={{
             padding: '16px',
             borderTop: `1px solid ${colors.neutral.gray200}`,
             display: 'flex',
             flexDirection: 'column',
             gap: '12px',
           }}
         >
           <textarea
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder={isRecording ? "Your speech will appear here..." : "Or type your thoughts here..."}
             disabled={isLoading}
             style={{
               width: '100%',
               padding: '12px 16px',
               borderRadius: '12px',
               border: `2px solid ${colors.neutral.gray200}`,
               fontSize: '14px',
               fontFamily: 'inherit',
               resize: 'none',
               minHeight: '80px',
               maxHeight: '150px',
               outline: 'none',
               color: colors.neutral.gray800,
               backgroundColor: colors.neutral.white,
               lineHeight: '1.5',
             }}
             onFocus={(e) => {
               e.currentTarget.style.borderColor = colors.secondary.blue;
               e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary.blue}20`;
             }}
             onBlur={(e) => {
               e.currentTarget.style.borderColor = colors.neutral.gray200;
               e.currentTarget.style.boxShadow = 'none';
             }}
           />
           <button
             onClick={handleSend}
             disabled={!input.trim() || isLoading || isRecording}
             style={{
               padding: '12px 24px',
               backgroundColor:
                 !input.trim() || isLoading || isRecording
                   ? colors.neutral.gray200
                   : colors.secondary.blue,
               color: colors.neutral.white,
               border: 'none',
               borderRadius: '10px',
               fontSize: '15px',
               fontWeight: '600',
               cursor:
                 !input.trim() || isLoading || isRecording ? 'not-allowed' : 'pointer',
               transition: 'all 0.2s',
               boxShadow: !input.trim() || isLoading || isRecording 
                 ? 'none' 
                 : '0 4px 12px rgba(0, 0, 0, 0.15)',
             }}
             onMouseEnter={(e) => {
               if (input.trim() && !isLoading && !isRecording) {
                 e.currentTarget.style.backgroundColor = colors.primary.main;
                 e.currentTarget.style.transform = 'translateY(-1px)';
                 e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
               }
             }}
             onMouseLeave={(e) => {
               if (input.trim() && !isLoading && !isRecording) {
                 e.currentTarget.style.backgroundColor = colors.secondary.blue;
                 e.currentTarget.style.transform = 'translateY(0)';
                 e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
               }
             }}
           >
             Create Graph
           </button>
         </div>
      </div>
    </div>
  );
};

export default Chat;

