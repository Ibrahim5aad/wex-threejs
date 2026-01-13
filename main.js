import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WexBIMLoader } from './WexBIMLoader.js';

// Create a scene, camera, and renderer
const scene = new THREE.Scene();

// Add axes helper
const axesHelper = new THREE.AxesHelper(1);
scene.add(axesHelper);

// Add a grid helper to visualize the 3D space
let gridHelper = new THREE.GridHelper(10000, 10);
scene.add(gridHelper);

// Define a target point without creating a reference cube
const targetPoint = new THREE.Vector3(-4285.83, 2783.33, 4000);

// Renderer optimizations
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: 'high-performance',
  precision: 'highp', // Higher precision for more stable rendering
  stencil: false,     // Disable stencil for better performance
  depth: true,
  logarithmicDepthBuffer: true, // Better z-fighting prevention
  alpha: false        // Disable alpha for better performance
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xeeeeee); // Light gray background for better contrast
renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio); // Cap at 2x for balance
renderer.shadowMap.enabled = false; // Disable shadows for performance
renderer.outputEncoding = THREE.sRGBEncoding; // Use sRGB encoding for more accurate colors
renderer.gammaFactor = 2.2; // Standard gamma correction
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better contrast and color reproduction
renderer.toneMappingExposure = 1.0; // Standard exposure
document.body.appendChild(renderer.domElement);

// Add a point light near the target point for local illumination
let pointLight = new THREE.PointLight(0xffffff, 1, 20000);

// Performance monitoring
let stats;
let lastTime = 0;
let frameCount = 0;
let fps = 0;

// Global variable to track the current model path
let currentModelPath = './Files/SampleHouse.wexbim';

// Initialize performance monitoring
function initPerformanceMonitoring() {
  // Update FPS counter that's already in the HTML
  setInterval(() => {
    const fpsEl = document.getElementById('fps-counter');
    if (fpsEl) {
      fpsEl.textContent = `FPS: ${fps.toFixed(1)}`;
    }
  }, 500);
}

// Apply render quality
function applyRenderQuality(quality) {
  switch (quality) {
    case 'high':
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      break;
    case 'medium':
      renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1.5 : 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ReinhardToneMapping; // Simpler tone mapping
      break;
    case 'low':
      renderer.setPixelRatio(1);
      renderer.outputEncoding = THREE.LinearEncoding; // Faster but less accurate
      renderer.toneMapping = THREE.NoToneMapping; // Disable tone mapping
      break;
  }
}

// Initialize camera and controls
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(targetPoint.x + 5000, targetPoint.y + 5000, targetPoint.z + 5000);
camera.lookAt(targetPoint);

// Add OrbitControls with optimized settings
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.2;  // Increased for smoother rotation
controls.rotateSpeed = 0.4;    // Reduced for smoother control
controls.panSpeed = 0.6;       // Reduced for smoother control
controls.zoomSpeed = 0.8;      // Reduced for smoother control
controls.screenSpacePanning = false;
controls.target.copy(targetPoint);
controls.maxDistance = 100000; // Limit zoom out
controls.minDistance = 10;     // Limit zoom in
controls.update();

// Create frustum for culling
const frustum = new THREE.Frustum();

// Variables for tracking camera movement
const lastCameraPosition = new THREE.Vector3();
const lastCameraQuaternion = new THREE.Quaternion();
let cameraIsMoving = false;
let cameraMovementTimer = null;
const CAMERA_MOVEMENT_THRESHOLD = 0.001; // Small threshold to detect real movement

// Update frustum for culling objects outside view
function updateFrustum() {
  camera.updateMatrixWorld();
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  
  // Create a slightly expanded frustum
  frustum.setFromProjectionMatrix(projScreenMatrix);
}

// Optimized animation loop with throttling for smoother navigation
function animate(time) {
  // Calculate FPS
  frameCount++;
  if (time - lastTime >= 1000) {
    fps = frameCount * 1000 / (time - lastTime);
    frameCount = 0;
    lastTime = time;
  }
  
  // Update controls
  controls.update();
  
  // Check if camera is moving
  const positionDelta = camera.position.distanceTo(lastCameraPosition);
  const rotationDelta = 1 - camera.quaternion.dot(lastCameraQuaternion); // Quaternion dot product gives similarity
  
  if (positionDelta > CAMERA_MOVEMENT_THRESHOLD || rotationDelta > CAMERA_MOVEMENT_THRESHOLD) {
    // Camera is moving
    cameraIsMoving = true;
    
    // Update position and rotation tracking
    lastCameraPosition.copy(camera.position);
    lastCameraQuaternion.copy(camera.quaternion);
    
    // Clear any existing timers
    if (cameraMovementTimer) {
      clearTimeout(cameraMovementTimer);
    }
    
    // Set timer to mark camera as stopped after 300ms of no movement
    cameraMovementTimer = setTimeout(() => {
      cameraIsMoving = false;
      // Update frustum immediately when camera stops
      updateFrustum();
    }, 300);
  }
  
  // Only do frustum culling when the camera is stationary
  if (!cameraIsMoving) {
    // Update frustum for culling
    updateFrustum();
    
    // Apply frustum culling to objects
    scene.traverse(object => {
      if (object.isMesh && object.geometry.boundingSphere) {
        // Add margin to bounding sphere for stability
        const boundingSphere = object.geometry.boundingSphere.clone();
        boundingSphere.radius *= 1.2; // 20% margin
        boundingSphere.applyMatrix4(object.matrixWorld);
        
        // Set visibility based on frustum
        object.visible = frustum.intersectsSphere(boundingSphere);
      }
    });
  } else {
    // During camera movement, make all objects visible to prevent popping
    scene.traverse(object => {
      if (object.isMesh && !object.visible) {
        object.visible = true;
      }
    });
  }
  
  // Render scene
  renderer.render(scene, camera);
}

// Use more efficient animation loop
renderer.setAnimationLoop(animate);

// Add window resize handler with throttling for better performance
let resizeTimeout;
window.addEventListener('resize', () => {
  // Clear previous timeout
  clearTimeout(resizeTimeout);
  
  // Set a timeout to avoid multiple rapid resizes
  resizeTimeout = setTimeout(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, 100);
});

// Add lighting to the scene for better shading with normals
function setupLighting() {
  // Clear any existing lights
  scene.children.forEach(child => {
    if (child instanceof THREE.Light) {
      scene.remove(child);
    }
  });
  
  // Add ambient light for base illumination - slightly darker to improve contrast
  const ambientLight = new THREE.AmbientLight(0x555555, 0.4);
  scene.add(ambientLight);
  
  // Add directional lights from different angles for better shading of flat surfaces
  // Main key light from top-right front
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(1, 2, 1).normalize();
  scene.add(keyLight);
  
  // Fill light from left side
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-2, 1, 0.5).normalize();
  scene.add(fillLight);
  
  // Rim light from behind to highlight edges
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
  rimLight.position.set(0.5, 0.2, -1).normalize();
  scene.add(rimLight);
  
  // Bottom fill light (subtle)
  const bottomLight = new THREE.DirectionalLight(0xccccff, 0.3);
  bottomLight.position.set(0, -1, 0.2).normalize();
  scene.add(bottomLight);
  
  // Add a point light that follows the camera for better frontal illumination
  pointLight = new THREE.PointLight(0xffffff, 0.3, 20000);
  camera.add(pointLight);
  scene.add(camera); // Required for camera-attached lights
}

// Add a helper to visualize the point light
const pointLightHelper = new THREE.PointLightHelper(pointLight, 200);
scene.add(pointLightHelper);

// Add debug controls for testing
const debugSettings = {
  showAxes: true,
  showGrid: true,
  showLightHelpers: true,
  useColorDebug: true
};

// Function to toggle debug elements
function updateDebugVisibility() {
  axesHelper.visible = debugSettings.showAxes;
  gridHelper.visible = debugSettings.showGrid;
  pointLightHelper.visible = debugSettings.showLightHelpers;
}

// Update event listeners to work with the new side menu with collapsible panels
function setupEventListeners() {
  // Setup panel collapsing functionality
  const panelHeaders = document.querySelectorAll('.panel h3');
  panelHeaders.forEach(header => {
    // Set initial state - all panels expanded by default
    const contentId = header.getAttribute('data-panel');
    const content = document.getElementById(contentId);
    
    // Ensure proper initial setup
    if (content) {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
    
    // Add click event to toggle panel
    header.addEventListener('click', () => {
      const contentId = header.getAttribute('data-panel');
      const content = document.getElementById(contentId);
      const toggleIcon = header.querySelector('.toggle-icon');
      
      if (content) {
        // Check if the panel is currently collapsed
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
          // Expand panel
          content.classList.remove('collapsed');
          content.style.maxHeight = content.scrollHeight + 'px';
          if (toggleIcon) toggleIcon.classList.remove('collapsed');
        } else {
          // Collapse panel
          content.classList.add('collapsed');
          content.style.maxHeight = '0';
          if (toggleIcon) toggleIcon.classList.add('collapsed');
        }
      }
    });
  });

  // Settings panel button
  const applySettingsBtn = document.getElementById('apply-settings');
  if (applySettingsBtn) {
    applySettingsBtn.addEventListener('click', applySettings);
  }
  
  // Toggle buttons in info panel
  const toggleWireframeBtn = document.getElementById('toggleWireframe');
  if (toggleWireframeBtn) {
    toggleWireframeBtn.addEventListener('click', toggleWireframe);
  }
  
  const toggleEdgesBtn = document.getElementById('toggleEdges');
  if (toggleEdgesBtn) {
    toggleEdgesBtn.addEventListener('click', toggleEdges);
  }
  
  // Setup file input change handler
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.name.toLowerCase().endsWith('.wexbim')) {
        handleFileLoad(file);
      } else {
        alert('Please select a valid .wexbim file');
      }
      // Reset the input so the same file can be selected again
      fileInput.value = '';
    });
  }
  
  // Setup built-in model links
  const builtInModelLinks = document.querySelectorAll('.built-in-model');
  builtInModelLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const modelPath = link.getAttribute('data-model');
      if (modelPath) {
        tryLoadModel(modelPath);
      }
    });
  });
  
  // Setup drag and drop handlers for the drop zone
  const dropZone = document.getElementById('file-drop-zone');
  if (dropZone) {
    // Drag over event - prevent default and add highlight class
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('highlight');
    });
    
    // Drag leave event - remove highlight class
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('highlight');
    });
    
    // Drop event - process the dropped file
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('highlight');
      
      const file = e.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith('.wexbim')) {
        handleFileLoad(file);
      } else {
        alert('Please drop a valid .wexbim file');
      }
    });
  }
  
  window.performanceSettings = {
    frustumCulling: document.getElementById('toggle-frustum-culling')?.checked || true,
    showEdges: false,
    renderQuality: document.getElementById('render-quality')?.value || 'medium'
  };
}

function handleFileLoad(file) {
  const fileURL = URL.createObjectURL(file);
  addToRecentFiles(file.name, fileURL);
  tryLoadModel(fileURL);
}

// Add a file to the recent files list
function addToRecentFiles(name, path) {
  let recentFiles = JSON.parse(localStorage.getItem('wexbim-recent-files') || '[]');
  
  recentFiles.unshift({
    name: name,
    path: path,
    timestamp: Date.now()
  });
  
  recentFiles = recentFiles.slice(0, 10);
  localStorage.setItem('wexbim-recent-files', JSON.stringify(recentFiles));
  updateRecentFilesUI();
}

// Update the recent files UI
function updateRecentFilesUI() {
  let recentFiles = JSON.parse(localStorage.getItem('wexbim-recent-files') || '[]');
  const recentFilesSection = document.getElementById('recent-files-section');
  if (!recentFilesSection) return;
  if (recentFiles.length === 0) {
    recentFilesSection.style.display = 'none';
    return;
  }
  
  recentFilesSection.style.display = 'block';
  
  while (recentFilesSection.childElementCount > 1) {
    recentFilesSection.removeChild(recentFilesSection.lastChild);
  }
  
  recentFiles.slice(0, 5).forEach(fileInfo => {
    const fileItem = document.createElement('a');
    fileItem.className = 'recent-file';
    fileItem.textContent = fileInfo.name;
    fileItem.title = fileInfo.name;
    fileItem.href = '#';
    fileItem.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (fileInfo.path.startsWith('./Files/')) {
        tryLoadModel(fileInfo.path);
      } else {
        alert('Only built-in models can be loaded from the recent list. Please upload the file again.');
      }
    });
    
    recentFilesSection.appendChild(fileItem);
  });
  
  // Update the panel content max-height since we added new content
  const fileChooserContent = document.getElementById('file-chooser-content');
  if (fileChooserContent && !fileChooserContent.classList.contains('collapsed')) {
    fileChooserContent.style.maxHeight = fileChooserContent.scrollHeight + 'px';
  }
}

// Function to try loading a model
function tryLoadModel(path) {
  console.log(`Attempting to load model from: ${path}`);
  
  // Store the current model path
  currentModelPath = path;
  
  // Add to recent files if it's a predefined file
  if (path.startsWith('./Files/')) {
    addToRecentFiles(path.split('/').pop(), path);
  }
  
  // Add loading indicator - create dynamically as this is temporary
  const loadingEl = document.createElement('div');
  loadingEl.id = 'loading-indicator';
  loadingEl.innerHTML = `
    <div>Loading ${path.split('/').pop()}</div>
    <div id="loading-progress">Initializing...</div>
  `;
  document.body.appendChild(loadingEl);
  
  // Function to update loading progress
  const updateProgress = (message) => {
    const progressEl = document.getElementById('loading-progress');
    if (progressEl) {
      progressEl.textContent = message;
    }
  };
  
  // Clear previous models first (except helpers)
  scene.children.forEach(child => {
    if (child !== axesHelper && 
        child !== gridHelper && 
        !(child instanceof THREE.Light) &&
        child !== camera) { // Keep camera for attached lights
      console.log("Removing previous object:", child);
      scene.remove(child);
    }
  });
  
  const loader = new WexBIMLoader();
  
  // Set edge display based on current settings
  if (window.performanceSettings && window.performanceSettings.showEdges !== undefined) {
    // Set the edge display option
  }
  
  // Setup proper lighting for the scene
  setupLighting();
  
  // Load the model with progress updates
  loader.load(
    path,
    (loadedSceneOrPromise) => {
      if (loadedSceneOrPromise instanceof Promise) {
        updateProgress("Processing model data...");
        loadedSceneOrPromise.then(loadedScene => {
          updateProgress("Finalizing model...");
          handleLoadedScene(loadedScene, path);
          const loadingIndicator = document.getElementById('loading-indicator');
          if (loadingIndicator) {
            document.body.removeChild(loadingIndicator);
          }
        });
      } else {
        handleLoadedScene(loadedSceneOrPromise, path);
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
          document.body.removeChild(loadingIndicator);
        }
      }
    },
    (progress) => {
      const percent = (progress.loaded / progress.total) * 100;
      updateProgress(`Loading: ${percent.toFixed(1)}%`);
      console.log(`Progress (${path}): ${percent.toFixed(1)}%`);
    },
    (error) => {
      console.error(`Error loading WexBIM file (${path}):`, error);
      updateProgress(`Error: ${error.message}`);
      setTimeout(() => {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
          document.body.removeChild(loadingIndicator);
        }
      }, 3000);
      
      if (path.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(path), 5000);
      }
    }
  );
}

// Handle loaded scene processing
function handleLoadedScene(loadedScene, path) {
  console.log(`Model ${path} loaded successfully!`, loadedScene);
  console.log(`Model contains children: ${loadedScene.children.length}`);
  
  if (loadedScene.children.length === 0) {
    console.warn(`Model ${path} was loaded but contains no objects!`);
    return;
  }
  
  // Log the loaded scene's children for debugging
  loadedScene.children.forEach((child, index) => {
    console.log(`Child ${index}:`, child);
    if (child.isMesh) {
      console.log(`  - Mesh has geometry:`, !!child.geometry);
      console.log(`  - Geometry has vertices:`, child.geometry?.attributes?.position?.count || 0);
      console.log(`  - Bounding sphere:`, child.geometry?.boundingSphere);
    }
  });
  
  // Calculate bounding box
  const bbox = new THREE.Box3().setFromObject(loadedScene);
  console.log('Raw bounding box:', bbox);
  console.log('Min:', bbox.min.x, bbox.min.y, bbox.min.z);
  console.log('Max:', bbox.max.x, bbox.max.y, bbox.max.z);
  
  if (bbox.isEmpty() || 
      isNaN(bbox.min.x) || isNaN(bbox.min.y) || isNaN(bbox.min.z) ||
      isNaN(bbox.max.x) || isNaN(bbox.max.y) || isNaN(bbox.max.z)) {
    console.warn(`Model ${path} bounding box is empty or contains NaN values!`);
    
    // Try to compute a valid bounding box from all meshes manually
    let validBBox = new THREE.Box3();
    let foundValidGeometry = false;
    
    loadedScene.traverse(object => {
      if (object.isMesh && object.geometry) {
        console.log(`Checking mesh for valid geometry:`, object);
        
        // Force compute bounding box if not already computed
        if (!object.geometry.boundingBox) {
          object.geometry.computeBoundingBox();
        }
        
        if (object.geometry.boundingBox) {
          console.log(`  - Bounding box before transform:`, object.geometry.boundingBox);
          
          // Check if the bounding box has valid numbers
          const bbox = object.geometry.boundingBox;
          if (isNaN(bbox.min.x) || isNaN(bbox.min.y) || isNaN(bbox.min.z) ||
              isNaN(bbox.max.x) || isNaN(bbox.max.y) || isNaN(bbox.max.z)) {
            console.warn(`  - Invalid bounding box with NaN values, skipping this mesh`);
            return;
          }
          
          // Check if the geometry has positions
          if (!object.geometry.attributes.position) {
            console.warn(`  - Geometry has no position attribute, skipping this mesh`);
            return;
          }
          
          // Create a new valid box for this object
          const localBBox = new THREE.Box3();
          
          // Create the bounding box directly from the position buffer for more reliability
          const positions = object.geometry.attributes.position.array;
          const itemSize = object.geometry.attributes.position.itemSize;
          const count = object.geometry.attributes.position.count;
          
          // Validate we have enough positions
          if (count === 0 || positions.length === 0) {
            console.warn(`  - Geometry has empty position buffer, skipping this mesh`);
            return;
          }
          
          console.log(`  - Processing ${count} vertices`);
          
          // Process first point specially to initialize the box
          const startVec = new THREE.Vector3(
            positions[0], 
            positions[1], 
            positions[2]
          );
          
          // Skip if the first point has NaN values
          if (isNaN(startVec.x) || isNaN(startVec.y) || isNaN(startVec.z)) {
            console.warn(`  - First vertex has NaN values, skipping this mesh`);
            return;
          }
          
          startVec.applyMatrix4(object.matrixWorld);
          localBBox.min.copy(startVec);
          localBBox.max.copy(startVec);
          
          for (let i = 1; i < count; i++) {
            const index = i * itemSize;
            const x = positions[index];
            const y = positions[index + 1];
            const z = positions[index + 2];
            
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
              continue;
            }
            
            const vertexWorldPos = new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld);
            localBBox.expandByPoint(vertexWorldPos);
          }
          
          if (isNaN(localBBox.min.x) || isNaN(localBBox.min.y) || isNaN(localBBox.min.z) ||
              isNaN(localBBox.max.x) || isNaN(localBBox.max.y) || isNaN(localBBox.max.z) ||
              localBBox.isEmpty()) {
            return;
          }
          
          if (!foundValidGeometry) {
            validBBox.copy(localBBox);
            foundValidGeometry = true;
          } else {
            validBBox.union(localBBox);
          }
        }
      }
    });
    
    if (foundValidGeometry) {
      console.log('Computed valid bounding box manually:', validBBox);
      
      // Final validation on the merged box
      if (isNaN(validBBox.min.x) || isNaN(validBBox.min.y) || isNaN(validBBox.min.z) ||
          isNaN(validBBox.max.x) || isNaN(validBBox.max.y) || isNaN(validBBox.max.z)) {
        console.warn('Computed bounding box still has NaN values, using extreme fallback method');
        validBBox = computeExtremeFallbackBBox(loadedScene);
      }
      
      bbox.copy(validBBox);
    } else {
      console.warn('No valid geometry found for bounding box, using extreme fallback method');
      bbox.copy(computeExtremeFallbackBBox(loadedScene));
    }
  }
  
  const center = bbox.getCenter(new THREE.Vector3());
  console.log(`Model ${path} center:`, center);
  
  scene.add(loadedScene);
  console.log(`Model ${path} added to scene`);
  
  const size = bbox.getSize(new THREE.Vector3());
  console.log(`Model ${path} size:`, size);
  console.log(`Model ${path} size length:`, size.length());
  
  // Position grid at the bottom of the bounding box
  const gridY = bbox.min.y;
  gridHelper.position.set(center.x, gridY, center.z);
  
  // Update grid size to match the model's footprint
  const gridSize = Math.max(size.x, size.z) * 1.5;
  scene.remove(gridHelper);
  
  // Calculate divisions to ensure at least a 9x9 grid (minimum 10 lines)
  const minDivisions = 10;
  const calculatedDivisions = Math.round(gridSize / 1000);
  const divisions = Math.max(minDivisions, calculatedDivisions);
  
  // Create new grid with proper divisions
  gridHelper = new THREE.GridHelper(gridSize, divisions);
  gridHelper.position.set(center.x, gridY, center.z);
  scene.add(gridHelper);
  
  // Position camera to look at the center of the model
  const distance = size.length() * 1.5;
  const direction = new THREE.Vector3(1, 0.5, 1).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  camera.lookAt(center);
  
  // Update orbit controls to target the center
  controls.target.copy(center);
  controls.update();
  
  // Update the help text with model info
  updateHelpText(path, center, size);
}

// Update help text with model information
function updateHelpText(modelPath, center, size) {
  // Handle NaN values in center and size
  const safeCenter = {
    x: isNaN(center.x) ? 0 : center.x,
    y: isNaN(center.y) ? 0 : center.y,
    z: isNaN(center.z) ? 0 : center.z
  };
  
  const safeSize = {
    x: isNaN(size.x) ? 0 : size.x,
    y: isNaN(size.y) ? 0 : size.y,
    z: isNaN(size.z) ? 0 : size.z
  };

  // Update the model info in the info panel
  const infoPanel = document.getElementById('info-panel');
  if (infoPanel) {
    // Find and update the content of specific paragraphs
    const paragraphs = infoPanel.getElementsByTagName('p');
    if (paragraphs.length >= 3) {
      // Get just the filename part
      const fileName = modelPath.split('/').pop();
      paragraphs[0].textContent = `Model: ${fileName}`;
      paragraphs[1].textContent = `Center: (${safeCenter.x.toFixed(2)}, ${safeCenter.y.toFixed(2)}, ${safeCenter.z.toFixed(2)})`;
      paragraphs[2].textContent = `Size: (${safeSize.x.toFixed(2)}, ${safeSize.y.toFixed(2)}, ${safeSize.z.toFixed(2)})`;
    }
  }
}

// Toggle wireframe on all meshes
function toggleWireframe() {
  scene.traverse(child => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => {
          mat.wireframe = !mat.wireframe;
        });
      } else {
        child.material.wireframe = !child.material.wireframe;
      }
    }
  });
}

// Toggle edge visibility on all meshes - now it reloads the model with updated settings
function toggleEdges() {
  // Update the settings
  if (window.performanceSettings) {
    window.performanceSettings.showEdges = !window.performanceSettings.showEdges;
    
    // Reload the current model to apply the edge settings
    console.log(`Reloading model with edges ${window.performanceSettings.showEdges ? 'enabled' : 'disabled'}`);
    tryLoadModel(currentModelPath);
  }
}

// Apply performance settings
function applySettings() {
  // Get current settings from UI
  const cullingEnabled = document.getElementById('toggle-frustum-culling').checked;
  const renderQuality = document.getElementById('render-quality').value;
  
  // Apply frustum culling setting
  window.performanceSettings = {
    ...window.performanceSettings,
    frustumCulling: cullingEnabled,
    renderQuality: renderQuality
  };
  
  // Apply render quality
  switch(renderQuality) {
    case 'high':
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      break;
    case 'medium':
      renderer.setPixelRatio(window.devicePixelRatio > 1 ? 1.5 : 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ReinhardToneMapping; // Simpler tone mapping
      break;
    case 'low':
      renderer.setPixelRatio(1);
      renderer.outputEncoding = THREE.LinearEncoding; // Faster but less accurate
      renderer.toneMapping = THREE.NoToneMapping; // Disable tone mapping
      break;
  }
  
  console.log('Applied settings:', window.performanceSettings);
}

// Add keyboard shortcuts
function setupKeyboardShortcuts() {
  // Remove any previous event listener to avoid duplicates
  window.removeEventListener('keydown', handleKeyDown);
  
  // Add the event listener
  window.addEventListener('keydown', handleKeyDown);
  
  // Log setup completion
  console.log('Keyboard shortcuts initialized. Use P, F, E, C, L keys for controls.');
}

// Handle keyboard events
function handleKeyDown(event) {
  // Log the key press for debugging
  console.log('Key pressed:', event.key);
  
  switch(event.key.toLowerCase()) {
    case 'p': // Toggle settings panel
      // Find and click the settings panel header
      const settingsHeader = document.querySelector('#settings-panel h3');
      if (settingsHeader) {
        settingsHeader.click();
        console.log('Settings panel toggled');
      }
      break;
    
    case 'i': // Toggle info panel
      const infoHeader = document.querySelector('#info-panel h3');
      if (infoHeader) {
        infoHeader.click();
        console.log('Info panel toggled');
      }
      break;
      
    case 'm': // Toggle models panel
      const fileChooserHeader = document.querySelector('#file-chooser-panel h3');
      if (fileChooserHeader) {
        fileChooserHeader.click();
        console.log('Models panel toggled');
      }
      break;
    
    case 'f': // Toggle wireframe
      toggleWireframe();
      break;
      
    case 'e': // Toggle edges
      toggleEdges();
      console.log('Edges toggled');
      break;
    
    case 'c': // Toggle frustum culling
      const cullingCheckbox = document.getElementById('toggle-frustum-culling');
      if (cullingCheckbox) {
        cullingCheckbox.checked = !cullingCheckbox.checked;
        applySettings();
        console.log('Frustum culling toggled:', cullingCheckbox.checked);
      }
      break;
    
    case 'l': // Cycle quality (low -> medium -> high -> low)
      const qualitySelect = document.getElementById('render-quality');
      if (qualitySelect) {
        const options = qualitySelect.options;
        let currentIndex = 0;
        
        for (let i = 0; i < options.length; i++) {
          if (options[i].selected) {
            currentIndex = i;
            break;
          }
        }
        
        const nextIndex = (currentIndex + 1) % options.length;
        options[currentIndex].selected = false;
        options[nextIndex].selected = true;
        
        applySettings();
        console.log('Render quality changed to:', options[nextIndex].value);
      }
      break;
  }
}

// Initialize everything after the DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  // Setup lighting
  setupLighting();
  
  // Setup event listeners for HTML elements
  setupEventListeners();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Initialize performance monitoring
  initPerformanceMonitoring();
  
  // Load initial recent files list
  updateRecentFilesUI();
  
  // Load the initial model
  tryLoadModel('./Files/SampleHouse.wexbim');
});

// Extreme fallback - compute a bounding box by scanning all vertices in all geometries
function computeExtremeFallbackBBox(scene) {
  console.log('Using extreme fallback method to compute bounding box');
  
  // Start with default values
  const bbox = new THREE.Box3(
    new THREE.Vector3(-1000, -1000, -1000),
    new THREE.Vector3(1000, 1000, 1000)
  );
  
  // Try to find any valid geometry in the scene
  let anyValidPoint = false;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  scene.traverse(object => {
    if (object.isMesh && object.geometry && object.geometry.attributes && object.geometry.attributes.position) {
      const positions = object.geometry.attributes.position.array;
      const itemSize = object.geometry.attributes.position.itemSize;
      const count = object.geometry.attributes.position.count;
      
      // Process all vertices and find the min/max directly
      for (let i = 0; i < count; i++) {
        const index = i * itemSize;
        let x = positions[index];
        let y = positions[index + 1];
        let z = positions[index + 2];
        
        // Skip NaN values
        if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
        
        // Transform to world coordinates
        const worldPos = new THREE.Vector3(x, y, z).applyMatrix4(object.matrixWorld);
        x = worldPos.x;
        y = worldPos.y;
        z = worldPos.z;
        
        // Skip NaN values after transformation
        if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
        
        // Update min/max
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
        anyValidPoint = true;
      }
    }
  });
  
  // If we found any valid points, use them for the bbox
  if (anyValidPoint) {
    console.log('Found valid points for extreme fallback bbox:');
    console.log(`  Min: (${minX}, ${minY}, ${minZ})`);
    console.log(`  Max: (${maxX}, ${maxY}, ${maxZ})`);
    bbox.set(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ)
    );
  } else {
    console.warn('No valid points found anywhere, using default box');
  }
  
  return bbox;
}
