import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | null = null;
let runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';

export const initializeHandLandmarker = async () => {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: runningMode,
      numHands: 1
    });
    return true;
  } catch (e) {
    console.error("Failed to load MediaPipe:", e);
    return false;
  }
};

export const detectHands = (video: HTMLVideoElement) => {
  if (!handLandmarker) return null;
  
  // Need to ensure video has dimensions
  if(video.videoWidth === 0 || video.videoHeight === 0) return null;

  let startTimeMs = performance.now();
  const result = handLandmarker.detectForVideo(video, startTimeMs);
  return result;
};
