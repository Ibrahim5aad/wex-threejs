import * as THREE from 'three';
import { WexBIMLoader } from './WexBIMLoader.js';

// Create a scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

camera.position.set(0, 2, 10); // Move camera slightly above and back

// Load WexBIM model
const loader = new WexBIMLoader();
loader.load(
  './Files/FourWalls1.wexbim',
  (loadedScene) => {
    // ✅ Ensure the model is centered
    const bbox = new THREE.Box3().setFromObject(loadedScene);
    const center = bbox.getCenter(new THREE.Vector3());
    loadedScene.position.sub(center);

    console.log(loadedScene)
    scene.add(loadedScene);
    const size = bbox.getSize(new THREE.Vector3()).length();
    camera.position.z = size * 2;
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  },
  (progress) => {
    console.log(`Progress: ${(progress.loaded / progress.total) * 100}%`);
  },
  (error) => {
    console.error('Error loading WexBIM file:', error);
  }
);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
