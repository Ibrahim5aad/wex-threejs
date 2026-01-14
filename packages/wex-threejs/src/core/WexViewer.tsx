import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// @ts-ignore - JS file without types
import { WexBIMLoader } from '../loaders/wexbim/wexBimLoader.js';
import { DEFAULT_VIEWER_SETTINGS } from '../types';
import type {
  WexViewerProps,
  WexViewerRef,
  LoadedModel,
  ViewerSettings,
  LoadProgress,
} from '../types';

// Default highlight colors (can be customized via props)
const DEFAULT_SELECTION_COLOR = '#2196F3';  // Blue for selection
const DEFAULT_HOVER_COLOR = '#4CAF50';      // Green for hover

/**
 * WexViewer - A React component for viewing WexBIM 3D building models
 * 
 * Similar to Xbim.WexBlazor's XbimViewerComponent but for React/Three.js
 */
export const WexViewer = forwardRef<WexViewerRef, WexViewerProps>((props, ref) => {
  const {
    id = `wex-viewer-${Math.random().toString(36).substr(2, 9)}`,
    width = '100%',
    height = '100%',
    backgroundColor,
    selectionColor = DEFAULT_SELECTION_COLOR,
    hoverColor = DEFAULT_HOVER_COLOR,
    modelUrl,
    settings: settingsOverride,
    style,
    className,
    children,
    onViewerReady,
    onModelLoaded,
    onProgress,
    onError,
    onPick,
    onHover,
    onDoubleClick,
  } = props;

  // Memoize colors as THREE.Color objects
  const highlightColor = useMemo(() => new THREE.Color(selectionColor), [selectionColor]);
  const hoverHighlightColor = useMemo(() => new THREE.Color(hoverColor), [hoverColor]);

  // Refs for Three.js objects
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  // Refs for selection state (to avoid stale closures)
  const selectedMeshesRef = useRef<Set<THREE.Mesh>>(new Set());
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  const originalMaterialsRef = useRef<WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>>(new WeakMap());
  
  // X-ray mode state
  const xrayMaterialsRef = useRef<WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>>(new WeakMap());
  const isXRayModeRef = useRef<boolean>(false);

  // State
  const [models, setModels] = useState<Map<string, LoadedModel>>(new Map());
  const [settings, setSettings] = useState<ViewerSettings>({
    ...DEFAULT_VIEWER_SETTINGS,
    ...settingsOverride,
    backgroundColor: backgroundColor || DEFAULT_VIEWER_SETTINGS.backgroundColor,
  });
  const [, setSelectedMeshes] = useState<Set<THREE.Mesh>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Loader instance
  const loaderRef = useRef<InstanceType<typeof WexBIMLoader>>(new WexBIMLoader());

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settings.backgroundColor);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      settings.cameraFov,
      container.clientWidth / container.clientHeight,
      settings.cameraNear,
      settings.cameraFar
    );
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Renderer with logarithmic depth buffer to prevent z-fighting on large models
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    if (settings.enableShadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = settings.enableDamping;
    controls.dampingFactor = settings.dampingFactor;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, settings.ambientLightIntensity);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, settings.directionalLightIntensity);
    dirLight1.position.set(10, 20, 10);
    if (settings.enableShadows) {
      dirLight1.castShadow = true;
    }
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, settings.directionalLightIntensity * 0.5);
    dirLight2.position.set(-10, 10, 5);
    scene.add(dirLight2);

    // Grid
    if (settings.showGrid) {
      const grid = new THREE.GridHelper(100, 100, '#6e6e6e', '#4a4a4a');
      grid.name = 'grid';
      scene.add(grid);
    }

    // Axes
    if (settings.showAxes) {
      const axes = new THREE.AxesHelper(5);
      axes.name = 'axes';
      scene.add(axes);
    }

    // Helper functions for highlighting
    const storeOriginalMaterial = (mesh: THREE.Mesh) => {
      if (!originalMaterialsRef.current.has(mesh)) {
        originalMaterialsRef.current.set(mesh, mesh.material);
      }
    };

    const restoreOriginalMaterial = (mesh: THREE.Mesh) => {
      const original = originalMaterialsRef.current.get(mesh);
      if (original) {
        mesh.material = original;
      }
    };

    const createHighlightedMaterial = (originalMaterial: THREE.Material, color: THREE.Color): THREE.Material => {
      if (originalMaterial instanceof THREE.MeshStandardMaterial || 
          originalMaterial instanceof THREE.MeshPhongMaterial ||
          originalMaterial instanceof THREE.MeshLambertMaterial) {
        const cloned = originalMaterial.clone();
        cloned.emissive = color;
        cloned.emissiveIntensity = 0.5;
        return cloned;
      }
      // Fallback for other material types
      return new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.8 
      });
    };

    const applyHighlight = (mesh: THREE.Mesh, color: THREE.Color) => {
      storeOriginalMaterial(mesh);
      const originalMat = originalMaterialsRef.current.get(mesh);
      if (originalMat) {
        if (Array.isArray(originalMat)) {
          mesh.material = originalMat.map(m => createHighlightedMaterial(m, color));
        } else {
          mesh.material = createHighlightedMaterial(originalMat, color);
        }
      }
    };

    // Animation loop
    let isRunning = true;
    function animate() {
      if (!isRunning) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse move for hover effect
    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast for hover
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      const meshIntersect = intersects.find(i => 
        i.object instanceof THREE.Mesh && 
        i.object.userData.productLabel !== undefined
      );

      // Handle hover highlight
      if (meshIntersect && meshIntersect.object instanceof THREE.Mesh) {
        const mesh = meshIntersect.object;
        
        // If hovering a new mesh
        if (hoveredMeshRef.current !== mesh) {
          // Unhighlight previous hovered mesh (if not selected)
          if (hoveredMeshRef.current && !selectedMeshesRef.current.has(hoveredMeshRef.current)) {
            restoreOriginalMaterial(hoveredMeshRef.current);
          }
          
          // Highlight new mesh (if not selected)
          if (!selectedMeshesRef.current.has(mesh)) {
            applyHighlight(mesh, hoverHighlightColor);
          }
          
          hoveredMeshRef.current = mesh;
          renderer.domElement.style.cursor = 'pointer';
        }

        onHover?.({
          eventName: 'hover',
          elementId: mesh.userData.productLabel,
          modelId: mesh.userData.modelId,
          mesh,
          position: { x: event.clientX, y: event.clientY },
          worldPosition: meshIntersect.point,
        });
      } else {
        // Not hovering any mesh
        if (hoveredMeshRef.current && !selectedMeshesRef.current.has(hoveredMeshRef.current)) {
          restoreOriginalMaterial(hoveredMeshRef.current);
        }
        hoveredMeshRef.current = null;
        renderer.domElement.style.cursor = 'default';
        
        onHover?.({ eventName: 'hover' });
      }
    };

    // Click handler for selection
    const handleClick = (event: MouseEvent) => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      const meshIntersect = intersects.find(i => 
        i.object instanceof THREE.Mesh && 
        i.object.userData.productLabel !== undefined
      );

      if (meshIntersect && meshIntersect.object instanceof THREE.Mesh) {
        const mesh = meshIntersect.object;
        
        // Toggle selection using ref (avoids stale closure)
        if (selectedMeshesRef.current.has(mesh)) {
          // Deselect
          selectedMeshesRef.current.delete(mesh);
          restoreOriginalMaterial(mesh);
        } else {
          // Select
          selectedMeshesRef.current.add(mesh);
          applyHighlight(mesh, highlightColor);
        }
        
        // Update React state for external consumers
        setSelectedMeshes(new Set(selectedMeshesRef.current));

        onPick?.({
          eventName: 'pick',
          elementId: mesh.userData.productLabel || 0,
          modelId: mesh.userData.modelId || '',
          mesh,
          position: { x: event.clientX, y: event.clientY },
          worldPosition: meshIntersect.point,
        });
      }
    };

    // Double-click handler
    const handleDblClick = (event: MouseEvent) => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      const meshIntersect = intersects.find(i => 
        i.object instanceof THREE.Mesh && 
        i.object.userData.productLabel !== undefined
      );

      if (meshIntersect && meshIntersect.object instanceof THREE.Mesh) {
        const mesh = meshIntersect.object;
        
        // Zoom to selected mesh
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.y, size.z) * 2;
        
        controls.target.copy(center);
        camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.5, distance));
        controls.update();

        onDoubleClick?.({
          eventName: 'dblclick',
          elementId: mesh.userData.productLabel,
          modelId: mesh.userData.modelId,
          position: { x: event.clientX, y: event.clientY },
          worldPosition: meshIntersect.point,
        });
      }
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('dblclick', handleDblClick);

    setIsInitialized(true);

    // Cleanup
    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('dblclick', handleDblClick);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load initial model
  useEffect(() => {
    if (isInitialized && modelUrl) {
      loadModel(modelUrl);
    }
  }, [isInitialized, modelUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify when viewer is ready
  useEffect(() => {
    if (isInitialized && ref) {
      onViewerReady?.(ref as unknown as WexViewerRef);
    }
  }, [isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load model function
  const loadModel = useCallback(async (url: string, name?: string): Promise<LoadedModel | null> => {
    if (!sceneRef.current) return null;

    return new Promise((resolve) => {
      loaderRef.current.load(
        url,
        (modelScene: THREE.Group) => {
          const scene = sceneRef.current!;
          
          // Add to scene
          scene.add(modelScene);

          // Calculate bounding box
          const box = new THREE.Box3().setFromObject(modelScene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Update grid to match model
          const oldGrid = scene.getObjectByName('grid');
          if (oldGrid) scene.remove(oldGrid);
          
          const gridSize = Math.max(size.x, size.z) * 1.5;
          const newGrid = new THREE.GridHelper(gridSize, 50, '#6e6e6e', '#4a4a4a');
          newGrid.name = 'grid';
          newGrid.position.set(center.x, box.min.y, center.z);
          scene.add(newGrid);

          // Center camera on model and adjust near/far for optimal depth precision
          if (controlsRef.current && cameraRef.current) {
            const distance = size.length() * 1.5;
            const direction = new THREE.Vector3(1, 0.5, 1).normalize();
            const newCamPos = center.clone().add(direction.multiplyScalar(distance));

            // Adjust camera near/far based on model size to reduce z-fighting
            const modelDiagonal = size.length();
            cameraRef.current.near = Math.max(modelDiagonal * 0.001, 0.1);
            cameraRef.current.far = modelDiagonal * 100;
            cameraRef.current.updateProjectionMatrix();

            const wasDamping = controlsRef.current.enableDamping;
            controlsRef.current.enableDamping = false;
            controlsRef.current.target.copy(center);
            cameraRef.current.position.copy(newCamPos);
            controlsRef.current.update();
            controlsRef.current.enableDamping = wasDamping;
          }

          // Create loaded model object
          const modelId = `model-${Date.now()}`;
          const fileName = name || url.split('/').pop() || 'model';
          
          // Tag meshes with model ID and store product labels
          modelScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.userData.modelId = modelId;
              // Ensure productLabel is set (it should be set by the loader)
              if (child.userData.productLabel === undefined) {
                child.userData.productLabel = child.id;
              }
            }
          });

          const loadedModel: LoadedModel = {
            id: modelId,
            name: fileName,
            source: url,
            sourceType: url.startsWith('blob:') ? 'blob' : 'url',
            scene: modelScene,
            boundingBox: box,
            center,
            size,
            isVisible: true,
            loadedAt: new Date(),
          };

          setModels(prev => new Map(prev).set(modelId, loadedModel));
          onModelLoaded?.(loadedModel);
          resolve(loadedModel);
        },
        (progressEvent: ProgressEvent) => {
          const progress: LoadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent: progressEvent.total > 0 ? (progressEvent.loaded / progressEvent.total) * 100 : 0,
          };
          onProgress?.(progress);
        },
        (error: Error) => {
          onError?.(error);
          resolve(null);
        }
      );
    });
  }, [onModelLoaded, onProgress, onError]);

  // Load model from bytes
  const loadModelFromBytes = useCallback(async (data: ArrayBuffer, name?: string): Promise<LoadedModel | null> => {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const result = await loadModel(url, name);
    return result;
  }, [loadModel]);

  // Unload model
  const unloadModel = useCallback(async (modelId: string): Promise<boolean> => {
    const model = models.get(modelId);
    if (!model || !sceneRef.current) return false;

    // Clear selections for this model
    selectedMeshesRef.current.forEach(mesh => {
      if (mesh.userData.modelId === modelId) {
        const original = originalMaterialsRef.current.get(mesh);
        if (original) mesh.material = original;
        selectedMeshesRef.current.delete(mesh);
      }
    });
    setSelectedMeshes(new Set(selectedMeshesRef.current));

    sceneRef.current.remove(model.scene);
    
    // Dispose geometries and materials
    model.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    // Revoke blob URL if needed
    if (model.sourceType === 'blob' && model.source.startsWith('blob:')) {
      URL.revokeObjectURL(model.source);
    }

    setModels(prev => {
      const next = new Map(prev);
      next.delete(modelId);
      return next;
    });

    return true;
  }, [models]);

  // Unload all models
  const unloadAllModels = useCallback(async () => {
    const modelIds = Array.from(models.keys());
    for (const id of modelIds) {
      await unloadModel(id);
    }
  }, [models, unloadModel]);

  // Set model visibility
  const setModelVisibility = useCallback((modelId: string, visible: boolean) => {
    const model = models.get(modelId);
    if (model) {
      model.scene.visible = visible;
      model.isVisible = visible;
      setModels(prev => new Map(prev).set(modelId, { ...model }));
    }
  }, [models]);

  // Zoom fit
  const zoomFit = useCallback((modelId?: string) => {
    if (!controlsRef.current || !cameraRef.current || !sceneRef.current) return;

    let box: THREE.Box3;
    if (modelId) {
      const model = models.get(modelId);
      if (!model) return;
      box = model.boundingBox;
    } else {
      box = new THREE.Box3();
      models.forEach(m => box.union(m.boundingBox));
    }

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = size.length() * 1.5;
    const direction = new THREE.Vector3(1, 0.5, 1).normalize();
    const newCamPos = center.clone().add(direction.multiplyScalar(distance));

    const wasDamping = controlsRef.current.enableDamping;
    controlsRef.current.enableDamping = false;
    controlsRef.current.target.copy(center);
    cameraRef.current.position.copy(newCamPos);
    controlsRef.current.update();
    controlsRef.current.enableDamping = wasDamping;
  }, [models]);

  // Reset view
  const reset = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    controlsRef.current.reset();
    zoomFit();
  }, [zoomFit]);

  // Set camera view
  const setView = useCallback((view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso') => {
    if (!controlsRef.current || !cameraRef.current || models.size === 0) return;

    const box = new THREE.Box3();
    models.forEach(m => box.union(m.boundingBox));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = size.length() * 1.5;

    const positions: Record<string, THREE.Vector3> = {
      front: new THREE.Vector3(0, 0, 1),
      back: new THREE.Vector3(0, 0, -1),
      left: new THREE.Vector3(-1, 0, 0),
      right: new THREE.Vector3(1, 0, 0),
      top: new THREE.Vector3(0, 1, 0),
      bottom: new THREE.Vector3(0, -1, 0),
      iso: new THREE.Vector3(1, 0.5, 1).normalize(),
    };

    const direction = positions[view];
    const newCamPos = center.clone().add(direction.multiplyScalar(distance));

    const wasDamping = controlsRef.current.enableDamping;
    controlsRef.current.enableDamping = false;
    controlsRef.current.target.copy(center);
    cameraRef.current.position.copy(newCamPos);
    cameraRef.current.lookAt(center);
    controlsRef.current.update();
    controlsRef.current.enableDamping = wasDamping;
  }, [models]);

  // Background color
  const setBackgroundColor = useCallback((color: string) => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(color);
    }
    setSettings(prev => ({ ...prev, backgroundColor: color }));
  }, []);

  // Get selected element IDs
  const getSelectedElements = useCallback((): number[] => {
    return Array.from(selectedMeshesRef.current).map(mesh => mesh.userData.productLabel || 0);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    selectedMeshesRef.current.forEach(mesh => {
      const original = originalMaterialsRef.current.get(mesh);
      if (original) mesh.material = original;
    });
    selectedMeshesRef.current.clear();
    setSelectedMeshes(new Set());
  }, []);

  // Select elements by ID
  const selectElements = useCallback((elementIds: number[], modelId?: string) => {
    if (!sceneRef.current) return;
    
    const createHighlightedMaterial = (originalMaterial: THREE.Material, color: THREE.Color): THREE.Material => {
      if (originalMaterial instanceof THREE.MeshStandardMaterial || 
          originalMaterial instanceof THREE.MeshPhongMaterial ||
          originalMaterial instanceof THREE.MeshLambertMaterial) {
        const cloned = originalMaterial.clone();
        cloned.emissive = color;
        cloned.emissiveIntensity = 0.5;
        return cloned;
      }
      return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    };
    
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.productLabel !== undefined) {
        if (elementIds.includes(child.userData.productLabel)) {
          if (!modelId || child.userData.modelId === modelId) {
            if (!selectedMeshesRef.current.has(child)) {
              if (!originalMaterialsRef.current.has(child)) {
                originalMaterialsRef.current.set(child, child.material);
              }
              const original = child.material;
              if (Array.isArray(original)) {
                child.material = original.map(m => createHighlightedMaterial(m, highlightColor));
              } else {
                child.material = createHighlightedMaterial(original, highlightColor);
              }
              selectedMeshesRef.current.add(child);
            }
          }
        }
      }
    });
    setSelectedMeshes(new Set(selectedMeshesRef.current));
  }, [highlightColor]);

  // X-Ray mode toggle
  const setXRayMode = useCallback((enabled: boolean) => {
    if (!sceneRef.current) return;
    
    isXRayModeRef.current = enabled;
    
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.productLabel !== undefined) {
        if (enabled) {
          // Store original material if not already stored
          if (!xrayMaterialsRef.current.has(child)) {
            xrayMaterialsRef.current.set(child, child.material);
          }
          
          // Create transparent X-ray material
          const originalMat = xrayMaterialsRef.current.get(child);
          if (originalMat) {
            if (Array.isArray(originalMat)) {
              child.material = originalMat.map((m) => {
                const xrayMat = m.clone();
                xrayMat.transparent = true;
                xrayMat.opacity = 0.3;
                xrayMat.depthWrite = false;
                return xrayMat;
              });
            } else {
              const xrayMat = originalMat.clone();
              xrayMat.transparent = true;
              xrayMat.opacity = 0.3;
              xrayMat.depthWrite = false;
              child.material = xrayMat;
            }
          }
        } else {
          // Restore original material
          const originalMat = xrayMaterialsRef.current.get(child);
          if (originalMat) {
            child.material = originalMat;
          }
        }
      }
    });
  }, []);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    loadModel,
    loadModelFromBytes,
    unloadModel,
    unloadAllModels,
    setModelVisibility,
    getLoadedModels: () => models,
    zoomFit,
    reset,
    setView,
    selectElements,
    addToSelection: selectElements,
    removeFromSelection: (ids) => {
      sceneRef.current?.traverse((child) => {
        if (child instanceof THREE.Mesh && ids.includes(child.userData.productLabel)) {
          if (selectedMeshesRef.current.has(child)) {
            const original = originalMaterialsRef.current.get(child);
            if (original) child.material = original;
            selectedMeshesRef.current.delete(child);
          }
        }
      });
      setSelectedMeshes(new Set(selectedMeshesRef.current));
    },
    clearSelection,
    getSelectedElements,
    highlightElements: selectElements,
    unhighlightElements: (ids) => {
      sceneRef.current?.traverse((child) => {
        if (child instanceof THREE.Mesh && ids.includes(child.userData.productLabel)) {
          const original = originalMaterialsRef.current.get(child);
          if (original) child.material = original;
          selectedMeshesRef.current.delete(child);
        }
      });
      setSelectedMeshes(new Set(selectedMeshesRef.current));
    },
    hideElements: (ids) => {
      sceneRef.current?.traverse((child) => {
        if (child instanceof THREE.Mesh && ids.includes(child.userData.productLabel)) {
          child.visible = false;
        }
      });
    },
    showElements: (ids) => {
      sceneRef.current?.traverse((child) => {
        if (child instanceof THREE.Mesh && ids.includes(child.userData.productLabel)) {
          child.visible = true;
        }
      });
    },
    isolateElements: (ids) => {
      sceneRef.current?.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.productLabel !== undefined) {
          child.visible = ids.includes(child.userData.productLabel);
        }
      });
    },
    unisolateElements: () => {
      sceneRef.current?.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = true;
        }
      });
    },
    setBackgroundColor,
    setXRayMode,
    getXRayMode: () => isXRayModeRef.current,
    setSettings: (s) => setSettings(prev => ({ ...prev, ...s })),
    getSettings: () => settings,
    getScene: () => sceneRef.current,
    getCamera: () => cameraRef.current,
    getRenderer: () => rendererRef.current,
  }), [
    loadModel, loadModelFromBytes, unloadModel, unloadAllModels, 
    setModelVisibility, models, zoomFit, reset, setView,
    selectElements, clearSelection, getSelectedElements,
    setBackgroundColor, setXRayMode, settings,
  ]);

  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    position: 'relative',
    overflow: 'hidden',
    ...style,
  };

  return (
    <div
      id={id}
      ref={containerRef}
      className={`wex-viewer ${className || ''}`}
      style={containerStyle}
    >
      {children}
    </div>
  );
});

WexViewer.displayName = 'WexViewer';

export default WexViewer;
