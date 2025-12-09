import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, PARTICLE_COUNT } from '../constants';
import { ShapeType, GestureState } from '../types';
import { 
  generateTreePoints, 
  generateHeartPoints, 
  generateSpherePoints,
  generateStarPoints,
  generateFlowerPoints
} from '../services/geometry';

interface ParticleSystemProps {
  shape: ShapeType;
  gesture: GestureState;
  customColor: string;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ shape, gesture, customColor }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Geometry Buffers
  const { currentPositions, targetPositions, colors, sizes } = useMemo(() => {
    const current = new Float32Array(PARTICLE_COUNT * 3);
    const target = new Float32Array(PARTICLE_COUNT * 3);
    const cols = new Float32Array(PARTICLE_COUNT * 3);
    const szs = new Float32Array(PARTICLE_COUNT);

    const initialTree = generateTreePoints(PARTICLE_COUNT);
    
    // Initialize Colors & Sizes (Photo cloud effect)
    const c1 = new THREE.Color(COLORS.MATTE_GREEN);
    const c2 = new THREE.Color(COLORS.GOLD);
    const c3 = new THREE.Color(COLORS.CHRISTMAS_RED);
    const tempColor = new THREE.Color();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      current[i * 3] = initialTree[i * 3];
      current[i * 3 + 1] = initialTree[i * 3 + 1];
      current[i * 3 + 2] = initialTree[i * 3 + 2];
      
      // Target init to same
      target[i * 3] = initialTree[i * 3];
      target[i * 3 + 1] = initialTree[i * 3 + 1];
      target[i * 3 + 2] = initialTree[i * 3 + 2];

      // Random color mix
      const r = Math.random();
      if (r < 0.6) tempColor.copy(c1); // Mostly green
      else if (r < 0.8) tempColor.copy(c2); // Some gold
      else tempColor.copy(c3); // Some red

      cols[i * 3] = tempColor.r;
      cols[i * 3 + 1] = tempColor.g;
      cols[i * 3 + 2] = tempColor.b;

      // Sizes: Random mix of small dust and larger "photos"
      szs[i] = Math.random() < 0.1 ? 0.4 : 0.15; 
    }

    return { 
      currentPositions: current, 
      targetPositions: target, 
      colors: cols,
      sizes: szs 
    };
  }, []);

  // Recalculate Target when Shape changes
  useEffect(() => {
    let newPos: Float32Array;
    switch (shape) {
      case ShapeType.HEART: newPos = generateHeartPoints(PARTICLE_COUNT); break;
      case ShapeType.STAR: newPos = generateStarPoints(PARTICLE_COUNT); break;
      case ShapeType.SPHERE: newPos = generateSpherePoints(PARTICLE_COUNT); break;
      case ShapeType.FLOWER: newPos = generateFlowerPoints(PARTICLE_COUNT); break;
      case ShapeType.TREE: 
      default:
        newPos = generateTreePoints(PARTICLE_COUNT); break;
    }
    
    // Copy new positions to targetPositions buffer
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      targetPositions[i] = newPos[i];
    }
  }, [shape, targetPositions]);

  // Update Colors dynamically if customColor changes
  useEffect(() => {
    if (!pointsRef.current) return;
    const attr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;
    const baseColor = new THREE.Color(customColor);
    const gold = new THREE.Color(COLORS.GOLD);
    
    for(let i=0; i<PARTICLE_COUNT; i++) {
        // Keep some variety, but tint towards custom color
        if (Math.random() > 0.3) {
            attr.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
        } else {
            attr.setXYZ(i, gold.r, gold.g, gold.b);
        }
    }
    attr.needsUpdate = true;
  }, [customColor]);


  // Animation Loop
  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    
    // 1. Gesture Influence: "Explosion/Spread" factor
    // If hand is OPEN (gesture.openness -> 1), particles scatter outwards from their target.
    // If hand is CLOSED (gesture.openness -> 0), particles move tightly to target.
    
    const spreadFactor = gesture.openness * 3.0; // Multiplier for scatter distance
    const lerpSpeed = 3.0 * delta; // Smooth transition speed

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // Base target position from shape
      let tx = targetPositions[ix];
      let ty = targetPositions[iy];
      let tz = targetPositions[iz];

      // Apply Explosion/Spread based on gesture
      if (spreadFactor > 0.1) {
        // Add noise/direction away from center
        tx += tx * spreadFactor + (Math.random() - 0.5) * spreadFactor;
        ty += ty * spreadFactor + (Math.random() - 0.5) * spreadFactor;
        tz += tz * spreadFactor + (Math.random() - 0.5) * spreadFactor;
      }

      // Interpolate current position to target
      currentPositions[ix] += (tx - currentPositions[ix]) * lerpSpeed;
      currentPositions[iy] += (ty - currentPositions[iy]) * lerpSpeed;
      currentPositions[iz] += (tz - currentPositions[iz]) * lerpSpeed;

      // Apply slight drift/twinkle for "living" feel
      const time = state.clock.elapsedTime;
      currentPositions[iy] += Math.sin(time + ix) * 0.01;
    }

    // Update geometry
    positions.array.set(currentPositions);
    positions.needsUpdate = true;

    // Rotation based on hand X
    // Map hand X (0-1) to rotation speed
    // Neutral is 0.5. < 0.5 rotate left, > 0.5 rotate right
    if (gesture.handDetected) {
        const rotationForce = (gesture.rotationX - 0.5) * 2; // -1 to 1
        pointsRef.current.rotation.y += rotationForce * delta * 2;
    } else {
        // Auto rotate slowly if no hand
        pointsRef.current.rotation.y += 0.1 * delta;
    }
  });

  // Load a simple sprite texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
        // Radial gradient for soft glow
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        context.fillStyle = gradient;
        context.fillRect(0,0,32,32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={currentPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15} // Base size, attribute will override if vertexColors is true? No, needs shader or size attribute support in specialized material.
        // Standard PointsMaterial doesn't support per-vertex size easily without shader modification. 
        // For simplicity, we stick to uniform size or sizeAttenuation.
        // To support per-vertex size, we'd need ShaderMaterial. 
        // Let's rely on standard map and just let them be uniform size but twinkling.
        // Actually, let's just use a uniform size that looks good.
        vertexColors
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default ParticleSystem;