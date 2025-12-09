import * as THREE from 'three';
import { PARTICLE_COUNT } from '../constants';

// Helper to get a point on a sphere
const randomOnSphere = () => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 4 + Math.random(); 
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
};

export const generateTreePoints = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * Math.PI * 20; // Spirals
    const radius = t * 3.5; // Cone shape
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5;
    const y = -3 + (1 - t) * 7; // Height
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};

export const generateHeartPoints = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Parametric heart
    const t = Math.random() * Math.PI * 2;
    const r = Math.random(); // volume
    // Heart shape logic
    // x = 16sin^3(t)
    // y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t)
    const scale = 0.25;
    const x = 16 * Math.pow(Math.sin(t), 3) * scale * (0.8 + r * 0.2);
    const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale * (0.8 + r * 0.2);
    const z = (Math.random() - 0.5) * 2; // Thickness

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
};

export const generateSpherePoints = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = randomOnSphere();
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }
  return positions;
};

export const generateStarPoints = (count: number): Float32Array => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        // Simple star approximation: 5 points
        const rBase = 3;
        // Modulate radius for star shape
        const spike = Math.abs(Math.sin(theta * 2.5)); // 5 spikes
        const r = rBase + spike * 2.5; 
        
        const x = r * Math.cos(theta) * Math.random();
        const y = r * Math.sin(theta) * Math.random();
        const z = (Math.random() - 0.5) * 1.5;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    return positions;
}

export const generateFlowerPoints = (count: number): Float32Array => {
    const positions = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
        // Rose curve-ish
        const k = 4; // petals
        const theta = Math.random() * Math.PI * 2;
        const rMax = 4;
        const r = rMax * Math.cos(k * theta) * Math.random();
        
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = Math.sin(r) * 1.5 + (Math.random() - 0.5);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    return positions;
}
