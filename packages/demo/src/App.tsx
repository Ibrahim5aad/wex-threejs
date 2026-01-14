import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  WexViewer,
  FileLoaderPanel,
  ModelManagerPanel,
  LoadingOverlay,
  ViewerToolbar,
  BuiltInButtons,
  Icons,
} from '@xbim/wex-threejs';
import type {
  WexViewerRef,
  LoadedModel,
  ToolbarItem,
  PickEventArgs,
} from '@xbim/wex-threejs';
// Import library styles from source for dev mode
import '../../wex-threejs/src/ui/theme.css';
import '../../wex-threejs/src/ui/viewer-toolbar.css';
import '../../wex-threejs/src/ui/file-loader-panel.css';
import '../../wex-threejs/src/ui/model-manager-panel.css';
import './App.css';

const { Folder: IconFolder, Package: IconPackage } = Icons;

// Demo models
const DEMO_MODELS = [
  { name: 'Sample House', path: '/SampleHouse.wexbim' },
  { name: 'Four Walls', path: '/FourWalls1.wexbim' },
];

/**
 * Sample WexThreeJS Application
 * Similar to Xbim.WexBlazor.Sample's XbimViewer.razor
 */
function App() {
  const viewerRef = useRef<WexViewerRef>(null);
  
  // State
  const [models, setModels] = useState<LoadedModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedElements, setSelectedElements] = useState<number[]>([]);
  const [showFileLoader, setShowFileLoader] = useState(true);
  const [showModelManager, setShowModelManager] = useState(true);
  
  // Feature toggles
  const [gridVisible, setGridVisible] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [xrayMode, setXrayMode] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isIsolated, setIsIsolated] = useState(false);
  
  // Toolbar items - built dynamically
  const [toolbarItems, setToolbarItems] = useState<ToolbarItem[]>([]);

  // Build toolbar when viewer is ready
  const buildToolbar = useCallback(() => {
    if (!viewerRef.current) return;

    const items: ToolbarItem[] = [
      // Home & Fit
      BuiltInButtons.createHomeButton(viewerRef),
      BuiltInButtons.createZoomFitButton(viewerRef),
      BuiltInButtons.createResetButton(viewerRef),
      
      { type: 'separator' },
      
      // Views dropdown
      BuiltInButtons.createViewsDropdown(viewerRef) as unknown as ToolbarItem,
      
      { type: 'separator' },
      
      // Mode toggles
      BuiltInButtons.createXRayToggle(xrayMode, (active) => {
        setXrayMode(active);
        viewerRef.current?.setXRayMode(active);
      }),
      
      BuiltInButtons.createGridToggle(gridVisible, (visible) => {
        setGridVisible(visible);
        // Toggle grid visibility in scene
        const scene = viewerRef.current?.getScene();
        if (scene) {
          const grid = scene.getObjectByName('grid');
          if (grid) grid.visible = visible;
        }
      }),
      
      { type: 'separator' },
      
      // Selection controls
      BuiltInButtons.createHideToggle(
        viewerRef,
        () => selectedElements,
        isHidden,
        setIsHidden
      ),
      
      BuiltInButtons.createIsolateToggle(
        viewerRef,
        () => selectedElements,
        isIsolated,
        setIsIsolated
      ),
      
      BuiltInButtons.createClearSelectionButton(viewerRef),
      
      { type: 'separator' },
      
      // Theme toggle
      BuiltInButtons.createThemeToggle(isDarkTheme, (dark) => {
        setIsDarkTheme(dark);
        viewerRef.current?.setBackgroundColor(dark ? '#1a1a2e' : '#f0f0f0');
      }),
    ];

    setToolbarItems(items);
  }, [gridVisible, xrayMode, isHidden, isIsolated, isDarkTheme, selectedElements]);

  // Rebuild toolbar when toggle states change
  useEffect(() => {
    if (viewerRef.current) {
      buildToolbar();
    }
  }, [buildToolbar]);

  // Handle viewer ready
  const handleViewerReady = useCallback(() => {
    buildToolbar();
  }, [buildToolbar]);

  // Handle model loaded
  const handleModelLoaded = useCallback((model: LoadedModel) => {
    setModels(prev => [...prev, model]);
    setIsLoading(false);
    setProgress(100);
    setShowFileLoader(false);
  }, []);

  // Handle progress
  const handleProgress = useCallback((p: { percent: number }) => {
    setProgress(p.percent);
  }, []);

  // Handle error
  const handleError = useCallback((error: Error) => {
    console.error('Failed to load model:', error);
    setIsLoading(false);
  }, []);

  // Handle element pick
  const handlePick = useCallback((event: PickEventArgs) => {
    console.log('Picked element:', event.elementId, 'Model:', event.modelId);
    
    // Update selected elements from the viewer's internal state
    const selected = viewerRef.current?.getSelectedElements() || [];
    setSelectedElements(selected);
  }, []);

  // Load from file data
  const handleFileLoaded = async (data: ArrayBuffer, fileName: string) => {
    if (!viewerRef.current) return;
    setIsLoading(true);
    setProgress(0);
    await viewerRef.current.loadModelFromBytes(data, fileName);
  };

  // Load from URL
  const handleUrlLoaded = async (url: string) => {
    if (!viewerRef.current) return;
    setIsLoading(true);
    setProgress(0);
    await viewerRef.current.loadModel(url);
  };

  // Load a demo model
  const loadDemoModel = async (path: string) => {
    if (!viewerRef.current) return;
    setIsLoading(true);
    setProgress(0);
    await viewerRef.current.loadModel(path);
  };

  // Unload model
  const handleUnloadModel = async (modelId: string) => {
    if (!viewerRef.current) return;
    await viewerRef.current.unloadModel(modelId);
    setModels(prev => prev.filter(m => m.id !== modelId));
  };

  // Toggle model visibility
  const handleToggleVisibility = (modelId: string, visible: boolean) => {
    if (!viewerRef.current) return;
    viewerRef.current.setModelVisibility(modelId, visible);
    setModels(prev => prev.map(m => 
      m.id === modelId ? { ...m, isVisible: visible } : m
    ));
  };

  // Zoom to model
  const handleZoomTo = (modelId: string) => {
    viewerRef.current?.zoomFit(modelId);
  };

  return (
    <div className={`app ${isDarkTheme ? 'theme-dark' : 'theme-light'}`}>
      {/* 3D Viewer - Full screen */}
      <WexViewer
        ref={viewerRef}
        width="100%"
        height="100%"
        backgroundColor={isDarkTheme ? '#1a1a2e' : '#f0f0f0'}
        selectionColor="#2196F3"  // Blue for selection (default)
        hoverColor="#4CAF50"       // Green for hover (default)
        onViewerReady={handleViewerReady}
        onModelLoaded={handleModelLoaded}
        onProgress={handleProgress}
        onError={handleError}
        onPick={handlePick}
      >
        {/* Toolbar at bottom center */}
        <ViewerToolbar
          items={toolbarItems}
          position="bottom"
          alignment="center"
        />

        {/* Loading Overlay */}
        <LoadingOverlay 
          isLoading={isLoading} 
          progress={progress}
          message="Loading model..."
        />

        {/* File Loader Panel */}
        <FileLoaderPanel
          isVisible={showFileLoader}
          allowClose={models.length > 0}
          demoModels={DEMO_MODELS}
          onFileLoaded={handleFileLoaded}
          onUrlLoaded={handleUrlLoaded}
          onClose={() => setShowFileLoader(false)}
        />

        {/* Model Manager Panel (top right) */}
        {showModelManager && models.length > 0 && (
          <div className="model-manager-container">
            <ModelManagerPanel
              models={models}
              onUnload={handleUnloadModel}
              onToggleVisibility={handleToggleVisibility}
              onZoomTo={handleZoomTo}
            />
          </div>
        )}

        {/* Demo Models Quick Access */}
        {!showFileLoader && models.length === 0 && (
          <div className="demo-models-overlay">
            <h3>🏗️ WexThreeJS Demo</h3>
            <p>Select a demo model to get started:</p>
            <div className="demo-buttons">
              {DEMO_MODELS.map((model) => (
                <button
                  key={model.path}
                  className="demo-model-btn"
                  onClick={() => loadDemoModel(model.path)}
                >
                  {model.name}
                </button>
              ))}
            </div>
            <button 
              className="open-loader-btn"
              onClick={() => setShowFileLoader(true)}
            >
              <IconFolder size={14} /> Load Custom File
            </button>
          </div>
        )}

        {/* Selection Info */}
        {selectedElements.length > 0 && (
          <div className="selection-info">
            <span className="selection-badge">
              {selectedElements.length} selected
            </span>
            <button 
              className="clear-selection-btn"
              onClick={() => {
                viewerRef.current?.clearSelection();
                setSelectedElements([]);
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Floating buttons */}
        <div className="floating-buttons">
          <button 
            className={`floating-btn ${showFileLoader ? 'active' : ''}`}
            title={showFileLoader ? 'Hide File Loader' : 'Show File Loader'}
            onClick={() => setShowFileLoader(!showFileLoader)}
          >
            <IconFolder size={18} />
          </button>
          <button 
            className={`floating-btn ${showModelManager ? 'active' : ''}`}
            title={showModelManager ? 'Hide Model Manager' : 'Show Model Manager'}
            onClick={() => setShowModelManager(!showModelManager)}
          >
            <IconPackage size={18} />
          </button>
        </div>
      </WexViewer>
    </div>
  );
}

export default App;
