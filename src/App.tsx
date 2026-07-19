import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Sparkles, Info, Play, Pause, RefreshCw, Layers, ShieldAlert, MonitorPlay, Zap, CheckCircle2 } from 'lucide-react';
import XRayShader from './components/XRayShader';
import AboutModal from './components/AboutModal';
import SohamAvatar from './components/SohamAvatar';
import { TrackerMode } from './types';

// Standard connections for a 21-point hand skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17]                                // Palm base closure
];

export default function App() {
  // State variables
  const [modelLoading, setModelLoading] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trackerMode, setTrackerMode] = useState<TrackerMode>('particle');
  const [detectedHandsCount, setDetectedHandsCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
  const [isTestingMode, setIsTestingMode] = useState(false);

  // Refs for video, canvases, and MediaPipe objects
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const streamRef = useRef<MediaStream | null>(null);
  const fpsIntervalRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const gestureActiveRef = useRef<boolean>(false);

  // Quad Corners state [BL, BR, TL, TR] in [0, 1] WebGL coordinates
  const [corners, setCorners] = useState<number[][]>([
    [0.2, 0.2], // BL
    [0.8, 0.2], // BR
    [0.2, 0.8], // TL
    [0.8, 0.8], // TR
  ]);

  // Handle aspect-ratio constrained resizing
  const updateLayout = useCallback(() => {
    if (!containerRef.current) return;
    const parentWidth = containerRef.current.clientWidth;
    const parentHeight = containerRef.current.clientHeight;
    
    // Constrain to 16:9 aspect ratio
    const targetAspect = 16 / 9;
    const parentAspect = parentWidth / parentHeight;
    
    let w = parentWidth;
    let h = parentHeight;

    if (parentAspect > targetAspect) {
      w = parentHeight * targetAspect;
    } else {
      h = parentWidth / targetAspect;
    }

    setDimensions({ width: w, height: h });
  }, []);

  useEffect(() => {
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [updateLayout]);

  // Start the Webcam
  const startCamera = async () => {
    setCameraLoading(true);
    setErrorMessage(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Bind to both visible and hidden video elements
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = stream;
        hiddenVideoRef.current.onloadedmetadata = () => {
          hiddenVideoRef.current?.play();
          setCameraLoading(false);
        };
      }

      if (backgroundVideoRef.current) {
        backgroundVideoRef.current.srcObject = stream;
        backgroundVideoRef.current.onloadedmetadata = () => {
          backgroundVideoRef.current?.play();
        };
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setErrorMessage("Could not access the webcam. Please ensure camera permissions are enabled.");
      setCameraLoading(false);
    }
  };

  // Stop the Webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null;
    }
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    async function loadMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        landmarkerRef.current = landmarker;
        setModelLoading(false);
      } catch (err) {
        console.error("MediaPipe failed to load:", err);
        setErrorMessage("Failed to load hand landmarker models. Checking connectivity...");
        setModelLoading(false);
      }
    }

    loadMediaPipe();
    startCamera();

    return () => {
      stopCamera();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Frame Loop for Hand Tracking and Drawing
  useEffect(() => {
    const runTracking = () => {
      const video = hiddenVideoRef.current;
      const landmarker = landmarkerRef.current;
      const canvas = canvas2DRef.current;

      if (!video || video.paused || video.ended || !isCameraActive) {
        // Run test/simulation mode when camera is offline or no hands present
        updateFallbacks();
        requestRef.current = requestAnimationFrame(runTracking);
        return;
      }

      const timestamp = performance.now();
      
      // Compute Live FPS
      frameCountRef.current++;
      if (timestamp > fpsIntervalRef.current + 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (timestamp - fpsIntervalRef.current)));
        frameCountRef.current = 0;
        fpsIntervalRef.current = timestamp;
      }

      // Detect hand only if the video frame is new
      if (video.currentTime !== lastVideoTimeRef.current && landmarker) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarker.detectForVideo(video, timestamp);

        // Canvas 2D context setup
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Standard draw styling
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(0, 255, 200, 0.5)";
          ctx.lineWidth = 2.5;

          if (result.landmarks && result.landmarks.length > 0) {
            setDetectedHandsCount(result.landmarks.length);
            
            // Draw Hand Skeleton
            result.landmarks.forEach((handLandmarks) => {
              // Draw connections
              HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
                const start = handLandmarks[startIdx];
                const end = handLandmarks[endIdx];
                if (start && end) {
                  ctx.beginPath();
                  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
                  // Mirroring is handled by the scale-x-[-1] on the canvas element, so use raw coordinates
                  ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
                  ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
                  ctx.stroke();
                }
              });

              // Draw Joints
              handLandmarks.forEach((landmark) => {
                ctx.beginPath();
                ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 4, 0, 2 * Math.PI);
                ctx.fillStyle = trackerMode === 'xray' ? "#ff007f" : "#00ffcc";
                ctx.fill();
              });
            });

            // Hand Pinch and Quad corners logic
            // Parse hands data
            const hands = result.landmarks.map((landmarks) => {
              const indexTip = landmarks[8];
              const thumbTip = landmarks[4];
              const thumbBase = landmarks[2];
              const wrist = landmarks[0];
              const pinkyBase = landmarks[17];
              const pinkyTip = landmarks[20];

              // Calculate pinch distance in 3D normalized coordinates
              const pinchDist = Math.sqrt(
                Math.pow(indexTip.x - thumbTip.x, 2) +
                Math.pow(indexTip.y - thumbTip.y, 2) +
                Math.pow(indexTip.z - thumbTip.z, 2)
              );

              const isPinching = pinchDist < 0.20;

              return {
                landmarks,
                isPinching,
                indexTip,
                thumbTip,
                thumbBase,
                wrist,
                pinkyBase,
                pinkyTip,
                pinchPoint: {
                  x: (indexTip.x + thumbTip.x) / 2,
                  y: (indexTip.y + thumbTip.y) / 2,
                }
              };
            });

            // Determine if the toggle gesture is triggered (fingers coming together / pinching)
            let isTriggered = false;
            if (hands.length >= 2) {
              const sorted = [...hands].sort((a, b) => (1.0 - a.wrist.x) - (1.0 - b.wrist.x));
              const leftHand = sorted[0];
              const rightHand = sorted[1];

              // 1. Both hands pinching
              const bothPinching = leftHand.isPinching && rightHand.isPinching;

              // 2. Index tips of both hands coming very close to each other
              const indexDist = Math.sqrt(
                Math.pow(leftHand.indexTip.x - rightHand.indexTip.x, 2) +
                Math.pow(leftHand.indexTip.y - rightHand.indexTip.y, 2) +
                Math.pow(leftHand.indexTip.z - rightHand.indexTip.z, 2)
              );
              const indexTouching = indexDist < 0.12;

              isTriggered = bothPinching || indexTouching;
            } else if (hands.length === 1) {
              // 3. Single hand pinching
              isTriggered = hands[0].isPinching;
            }

            // Leading-edge detection to toggle trackerMode
            if (isTriggered) {
              if (!gestureActiveRef.current) {
                setTrackerMode((prev) => (prev === 'xray' ? 'particle' : 'xray'));
                gestureActiveRef.current = true;
              }
            } else {
              gestureActiveRef.current = false;
            }

            // Dual-Hand mode logic
            if (hands.length >= 2) {
              const sorted = [...hands].sort((a, b) => (1.0 - a.wrist.x) - (1.0 - b.wrist.x));
              const leftHand = sorted[0];
              const rightHand = sorted[1];

              // Stretches between each hand's index-tip and thumb-bottom (unified for both xray and particle modes)
              setCorners([
                [1.0 - leftHand.thumbBase.x, 1.0 - leftHand.thumbBase.y],  // BL
                [1.0 - rightHand.thumbBase.x, 1.0 - rightHand.thumbBase.y], // BR
                [1.0 - leftHand.indexTip.x, 1.0 - leftHand.indexTip.y],    // TL
                [1.0 - rightHand.indexTip.x, 1.0 - rightHand.indexTip.y],   // TR
              ]);
            } else {
              // Single-Hand fallback: stretches around the single active hand splay
              const singleHand = hands[0];
              
              setCorners([
                [1.0 - singleHand.thumbBase.x, 1.0 - singleHand.thumbBase.y], // BL
                [1.0 - singleHand.pinkyBase.x, 1.0 - singleHand.pinkyBase.y], // BR
                [1.0 - singleHand.indexTip.x, 1.0 - singleHand.indexTip.y],   // TL
                [1.0 - singleHand.pinkyTip.x, 1.0 - singleHand.pinkyTip.y],   // TR
              ]);
            }
          } else {
            setDetectedHandsCount(0);
          }
        }
      }

      requestRef.current = requestAnimationFrame(runTracking);
    };

    // Simulated breathing box fallback if no hands are visible or camera is loading
    const updateFallbacks = () => {
      const time = performance.now() * 0.0015;
      const breathingScale = 0.2 + Math.sin(time) * 0.02;
      const xOffset = Math.sin(time * 0.5) * 0.15;
      const yOffset = Math.cos(time * 0.5) * 0.08;

      setCorners([
        [0.5 - breathingScale + xOffset, 0.5 - breathingScale + yOffset], // BL
        [0.5 + breathingScale + xOffset, 0.5 - breathingScale + yOffset], // BR
        [0.5 - breathingScale + xOffset, 0.5 + breathingScale + yOffset], // TL
        [0.5 + breathingScale + xOffset, 0.5 + breathingScale + yOffset], // TR
      ]);
    };

    requestRef.current = requestAnimationFrame(runTracking);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isCameraActive, trackerMode]);

  // Convert WebGL coordinates [0, 1] bottom-up to HTML SVG absolute pixel coordinates
  const getHtmlCoords = (pt: number[]) => {
    const x = pt[0] * dimensions.width;
    // WebGL y goes from 0 (bottom) to 1 (top). SVG y goes from 0 (top) to H (bottom).
    const y = (1 - pt[1]) * dimensions.height;
    return [x, y];
  };

  const cBL = getHtmlCoords(corners[0]);
  const cBR = getHtmlCoords(corners[1]);
  const cTL = getHtmlCoords(corners[2]);
  const cTR = getHtmlCoords(corners[3]);

  // SVG corner connecting lines path
  const svgPath = `M ${cTL[0]} ${cTL[1]} L ${cTR[0]} ${cTR[1]} L ${cBR[0]} ${cBR[1]} L ${cBL[0]} ${cBL[1]} Z`;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none font-sans flex items-center justify-center">
      {/* Absolute Header with Cyberpunk HUD details */}
      <header className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          <SohamAvatar className="w-10 h-10" />
          <div>
            <h1 className="font-display font-bold text-lg md:text-xl text-white tracking-widest uppercase flex items-center gap-1.5">
              <span>X-Ray Hand Tracker</span>
              <span className="text-[10px] bg-accent/20 text-accent font-mono px-1.5 py-0.5 rounded border border-accent/40 animate-pulse">
                v1.1.0-PRO
              </span>
            </h1>
            <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase mt-0.5">
              WASM-Vision & WebGL Spatial Shading Engine
            </p>
          </div>
        </div>

        {/* Statuses and HUD Panel */}
        <div className="flex flex-wrap items-center gap-3 md:gap-5">
          {/* Active Mode */}
          <div className="flex items-center gap-2 bg-black/40 border border-border/80 px-3 py-1.5 rounded-lg font-mono text-xs">
            <span className="text-muted-foreground uppercase">Mode:</span>
            <span className={`font-bold uppercase tracking-widest ${trackerMode === 'xray' ? 'text-accent' : 'text-primary'}`}>
              {trackerMode === 'xray' ? '☢️ X-Ray' : '✨ Particle'}
            </span>
          </div>

          {/* Hands Detected */}
          <div className="flex items-center gap-2 bg-black/40 border border-border/80 px-3 py-1.5 rounded-lg font-mono text-xs">
            <span className="text-muted-foreground uppercase">Tracking:</span>
            <span className="text-white font-bold">
              {detectedHandsCount > 0 ? `${detectedHandsCount} HANDS` : 'SEARCHING...'}
            </span>
            <span className={`w-2 h-2 rounded-full ${detectedHandsCount > 0 ? 'bg-primary animate-ping' : 'bg-yellow-500 animate-pulse'}`} />
          </div>

          {/* FPS indicator */}
          <div className="flex items-center gap-2 bg-black/40 border border-border/80 px-3 py-1.5 rounded-lg font-mono text-xs">
            <span className="text-muted-foreground uppercase">FPS:</span>
            <span className="text-white font-bold">{fps || '--'}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => isCameraActive ? stopCamera() : startCamera()}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isCameraActive 
                  ? 'bg-red-500/15 border-red-500/55 hover:bg-red-500/25 text-red-400' 
                  : 'bg-primary/15 border-primary/55 hover:bg-primary/25 text-primary'
              }`}
              title={isCameraActive ? "Deactivate Camera" : "Activate Camera"}
              id="camera-toggle-btn"
            >
              {isCameraActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border hover:bg-muted/90 text-foreground transition-all cursor-pointer font-mono text-xs uppercase font-medium tracking-wider"
              id="about-toggle-btn"
            >
              <Info className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>About</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container constrained to 16:9 and centered */}
      <div 
        ref={containerRef}
        className="relative shadow-2xl overflow-hidden bg-black/90 scanline-overlay flex items-center justify-center transition-all duration-300"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
        id="camera-stage-container"
      >
        {/* Mirrored background video feed */}
        <video
          ref={backgroundVideoRef}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 scale-x-[-1]"
          style={{ opacity: isCameraActive ? (detectedHandsCount > 0 ? 0.35 : 0.85) : 0 }}
          muted
          playsInline
        />

        {/* Hidden camera tracker source video */}
        <video
          ref={hiddenVideoRef}
          className="absolute pointer-events-none opacity-0"
          style={{ width: 1, height: 1 }}
          muted
          playsInline
        />

        {/* WebGL Three.js Live shader effect layer */}
        <XRayShader
          videoElement={hiddenVideoRef.current}
          corners={corners}
          mode={trackerMode}
          resolution={[dimensions.width, dimensions.height]}
          visible={isCameraActive && detectedHandsCount > 0}
        />

        {/* 2D Landmark Overlay Canvas */}
        <canvas
          ref={canvas2DRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20 scale-x-[-1]"
        />

        {/* SVG Border HUD around quadrilateral corners */}
        {detectedHandsCount > 0 && (
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Glowing polygon connecting lines */}
            <path
              d={svgPath}
              fill="none"
              stroke={trackerMode === 'xray' ? 'oklch(0.65 0.22 330)' : 'oklch(0.65 0.25 140)'}
              strokeWidth="1.5"
              strokeDasharray="6 4"
              className="transition-colors duration-300"
              style={{
                filter: `drop-shadow(0 0 8px ${trackerMode === 'xray' ? 'oklch(0.65 0.22 330)' : 'oklch(0.65 0.25 140)'})`
              }}
            />

            {/* SVG Corner Marker target boxes */}
            {[cBL, cBR, cTL, cTR].map((corner, idx) => {
              const size = 12;
              const isXRay = trackerMode === 'xray';
              return (
                <g key={idx} className="transition-transform duration-100">
                  {/* Outward target corners */}
                  <rect
                    x={corner[0] - size / 2}
                    y={corner[1] - size / 2}
                    width={size}
                    height={size}
                    fill="none"
                    stroke={isXRay ? 'oklch(0.65 0.22 330)' : 'oklch(0.65 0.25 140)'}
                    strokeWidth="2"
                    className="transition-colors duration-300"
                  />
                  {/* Inner target dot */}
                  <circle
                    cx={corner[0]}
                    cy={corner[1]}
                    r="2"
                    fill={isXRay ? 'oklch(0.65 0.22 330)' : 'oklch(0.65 0.25 140)'}
                    className="animate-pulse"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Loading Overlay */}
        {(modelLoading || (cameraLoading && isCameraActive)) && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-6" />
            <div className="space-y-2 max-w-sm">
              <h3 className="font-display font-bold text-white text-lg tracking-wider uppercase flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                Booting Spatial AI Engine...
              </h3>
              <p className="text-muted-foreground font-mono text-xs leading-relaxed uppercase">
                {modelLoading 
                  ? "Retrieving MediaPipe models & loading GPU delegate WASM..." 
                  : "Requesting camera stream access (1280x720 video)..."}
              </p>
            </div>
          </div>
        )}

        {/* Instructions Panel overlayed on screen bottom */}
        <div className="absolute bottom-4 left-4 right-4 z-40 bg-black/70 backdrop-blur-md border border-border/80 p-3 md:p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-auto max-w-3xl mx-auto">
          <div className="flex items-start gap-2.5">
            <Zap className={`w-5 h-5 shrink-0 ${trackerMode === 'xray' ? 'text-accent animate-bounce' : 'text-primary'}`} />
            <div>
              <p className="text-white text-xs font-bold leading-tight uppercase tracking-wide">
                Gesture Interactions & Control
              </p>
              <p className="text-muted-foreground text-[10px] md:text-xs leading-relaxed mt-0.5">
                {detectedHandsCount === 0 
                  ? "Show your hands to the webcam. Splay fingers to track, or wait for the auto-breathing test box."
                  : detectedHandsCount === 1 
                    ? "Single Hand detected. Show both hands to unlock dual-hand particle stretch."
                    : "Two Hands detected. Pinch (touch thumb to index tip) on BOTH hands to trigger X-RAY scan!"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`text-[10px] font-mono uppercase px-2 py-1 rounded border ${
              trackerMode === 'xray' 
                ? 'bg-accent/10 border-accent/40 text-accent' 
                : 'bg-primary/10 border-primary/40 text-primary'
            }`}>
              {trackerMode === 'xray' ? '☢️ X-Ray active' : '✨ Particle active'}
            </div>
          </div>
        </div>

        {/* Camera Error Message Overlay */}
        {errorMessage && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
            <h3 className="font-display font-bold text-white text-lg uppercase tracking-wider mb-2">Camera Connection Lost</h3>
            <p className="text-muted-foreground text-xs font-mono max-w-sm mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex gap-3">
              <button
                onClick={startCamera}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Connection</span>
              </button>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setIsCameraActive(false);
                }}
                className="px-5 py-2.5 bg-muted text-foreground font-mono text-xs uppercase tracking-wider rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
              >
                Simulated Demo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile/About Dialog */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
