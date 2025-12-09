export enum ShapeType {
  TREE = 'TREE',
  HEART = 'HEART',
  STAR = 'STAR',
  SPHERE = 'SPHERE', // Acts as "Fireworks" base
  FLOWER = 'FLOWER'
}

export interface GestureState {
  isOpen: boolean;      // Palm open vs Fist
  openness: number;     // 0.0 (closed) to 1.0 (open)
  rotationX: number;    // Hand X position to control rotation
  pinchDistance: number; // For zoom
  isPinching: boolean;
  handDetected: boolean;
}

export interface ParticleConfig {
  color: string;
  size: number;
}