import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createWhiteboardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f6f0df';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#252321';
  context.font = 'bold 48px Arial';
  CONFIG.whiteboardBio.forEach((line, index) => {
    context.fillText(line, 58, 130 + index * 108);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
