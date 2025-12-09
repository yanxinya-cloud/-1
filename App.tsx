import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { initializeHandLandmarker, detectHands } from './services/gestureService';
import ParticleSystem from './components/ParticleSystem';
import { ShapeType, GestureState } from './types';
import { SHAPE_LABELS, COLORS } from './constants';

const App: React.FC = () => {
  // Application State
  const [activeShape, setActiveShape] = useState<ShapeType>(ShapeType.TREE);
  const [particleColor, setParticleColor] = useState<string>(COLORS.MATTE_GREEN);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Gesture State (Ref for performance, passed to Canvas)
  // We use a Ref for the 3D loop to avoid re-rendering the whole React tree on every frame
  // But we might need some state for UI feedback.
  const [debugGesture, setDebugGesture] = useState<string>('No Hand');
  
  // The "real" state used by the 3D loop
  const gestureRef = useRef<GestureState>({
    isOpen: false,
    openness: 0,
    rotationX: 0.5,
    pinchDistance: 0,
    isPinching: false,
    handDetected: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>();

  // Initialize MediaPipe
  useEffect(() => {
    const init = async () => {
      const success = await initializeHandLandmarker();
      if (success) {
        setLoading(false);
        startCamera();
      } else {
        alert("Failed to load hand tracking. Please check connection.");
      }
    };
    init();

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, []);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadeddata = predictWebcam;
      }
    }
  };

  const predictWebcam = () => {
    if (!videoRef.current) return;
    
    const results = detectHands(videoRef.current);
    
    if (results && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      // 1. Calculate Openness (Average distance of tips from wrist)
      const wrist = landmarks[0];
      const tips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
      let avgDist = 0;
      
      tips.forEach(idx => {
        const dx = landmarks[idx].x - wrist.x;
        const dy = landmarks[idx].y - wrist.y;
        avgDist += Math.sqrt(dx*dx + dy*dy);
      });
      avgDist /= 5;

      // Normalize: roughly 0.2 is fist, 0.5 is open
      const opennessRaw = (avgDist - 0.2) / (0.4 - 0.2); 
      const openness = Math.min(Math.max(opennessRaw, 0), 1);
      
      // 2. Rotation (Hand X position)
      const rotationX = 1.0 - landmarks[9].x; // Middle finger knuckle X, inverted for mirror effect
      
      // 3. Pinch (Thumb tip to Index tip)
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const pinchDist = Math.sqrt(
          Math.pow(thumbTip.x - indexTip.x, 2) + 
          Math.pow(thumbTip.y - indexTip.y, 2)
      );
      const isPinching = pinchDist < 0.05;

      // Update Ref
      gestureRef.current = {
        isOpen: openness > 0.6,
        openness,
        rotationX,
        pinchDistance: pinchDist,
        isPinching,
        handDetected: true
      };

      setDebugGesture(
        `${openness > 0.6 ? 'OPEN ✋' : 'CLOSED ✊'} | Rot: ${rotationX.toFixed(2)} | ${isPinching ? 'PINCH 🤏' : ''}`
      );

    } else {
      gestureRef.current.handDetected = false;
      gestureRef.current.openness = Math.max(0, gestureRef.current.openness - 0.05); // Decay
      setDebugGesture('No Hand Detected');
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      
      {/* Hidden Video for CV */}
      <video 
        ref={videoRef} 
        className="absolute top-0 left-0 opacity-0 pointer-events-none w-px h-px" 
        playsInline 
        muted 
      />

      {/* Loading Screen */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-gold">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
          <p className="text-xl font-light text-yellow-100 font-['Cinzel']">Initializing Christmas Magic...</p>
        </div>
      )}

      {/* UI Overlay */}
      <div className={`absolute top-0 left-0 h-full w-80 bg-black/40 backdrop-blur-md border-r border-white/10 z-40 transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2 font-['Cinzel']">
            Magic Tree
          </h1>
          <p className="text-xs text-gray-300 mb-8 uppercase tracking-widest">
            Gesture Controlled Particles
          </p>

          <div className="space-y-6 flex-1">
            
            {/* Shapes */}
            <div>
              <label className="text-xs text-gray-400 font-bold mb-3 block uppercase">Select Shape</label>
              <div className="space-y-2">
                {Object.values(ShapeType).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => setActiveShape(shape)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-300 border ${
                      activeShape === shape 
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                        : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {SHAPE_LABELS[shape]}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="text-xs text-gray-400 font-bold mb-3 block uppercase">Particle Color</label>
              <input 
                type="color" 
                value={particleColor}
                onChange={(e) => setParticleColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer bg-transparent border border-gray-600"
              />
            </div>

            {/* Debug Info */}
            <div className="mt-auto p-4 bg-black/60 rounded-lg border border-white/5">
              <label className="text-[10px] text-gray-500 font-bold mb-1 block uppercase">Gesture Status</label>
              <p className="text-green-400 font-mono text-sm">{debugGesture}</p>
            </div>
            
            <div className="text-[10px] text-gray-500 leading-relaxed">
              <p>✊ Fist to Close Tree</p>
              <p>✋ Open Hand to Explode</p>
              <p>👋 Move Hand X to Rotate</p>
            </div>

          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="absolute top-6 left-6 z-50 p-2 text-white/50 hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Fullscreen Button */}
      <button 
        onClick={toggleFullscreen}
        className="absolute top-6 right-6 z-40 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur text-white transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
      
      {/* 3D Scene */}
      <div className="w-full h-full">
        <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
          <color attach="background" args={['#020508']} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#ffaa00" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffaa" />

          {/* Main Content */}
          <ParticleSystem 
            shape={activeShape} 
            gesture={gestureRef.current} // Note: This ref is mutated, but loop reads it directly.
            customColor={particleColor} 
          />

          <EffectComposer>
            <Bloom 
              luminanceThreshold={0.2} 
              luminanceSmoothing={0.9} 
              height={300} 
              intensity={1.5} 
            />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            enableRotate={true} // Allow manual override
            autoRotate={false}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default App;