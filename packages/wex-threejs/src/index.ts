// =============================================================================
// @xbim/wex-threejs - React Three.js WexBIM Viewer
// =============================================================================

// Import styles for bundling
import './styles.css';

// Core components
export { WexViewer } from './core/WexViewer';

// Loaders
export { WexBIMLoader } from './loaders/wexbim/wexBimLoader.js';

// UI components
export { 
  FileLoaderPanel,
  ModelInfoPanel, 
  LoadingOverlay,
  ViewerToolbar,
  ModelManagerPanel,
  BuiltInButtons,
  Icons,
} from './ui';

// Button factories
export {
  createZoomFitButton,
  createResetButton,
  createHomeButton,
  createClearSelectionButton,
  createViewsDropdown,
  createViewsButtonGroup,
  createXRayToggle,
  createGridToggle,
  createHideToggle,
  createIsolateToggle,
  createSectionBoxButtons,
  createClippingPlaneButtons,
  createThemeToggle,
} from './ui/BuiltInButtons';

// Hooks
export { 
  useViewerStore,
  useModels,
  useSelectedObjects,
  useIsLoading,
  useLoadingProgress,
  useViewerSettings,
  useViewerError,
} from './hooks/useViewerStore';

// Types
export type {
  // Model types
  LoadedModel,
  ModelSourceType,
  LoadProgress,
  
  // Event types
  ViewerEventArgs,
  PickEventArgs,
  HoverEventArgs,
  
  // Viewer types
  ViewerSettings,
  ViewerState,
  WexViewerProps,
  WexViewerRef,
  
  // Plugin types
  ViewerPlugin,
  NavigationCubeOptions,
  GridOptions,
  SectionBoxOptions,
  
  // Toolbar types
  ToolbarPosition,
  ToolbarAlignment,
  ToolbarItem,
  ToolbarButton,
  ToolbarToggleButton,
  ToolbarButtonGroup,
  ToolbarSeparator,
  ViewerToolbarProps,
  
  // UI component props
  ModelInfoPanelProps,
  LoadingOverlayProps,
  ModelManagerPanelProps,
} from './types';

// Re-export FileLoaderPanel props
export type { FileLoaderPanelProps } from './ui/FileLoaderPanel';

// Constants
export { DEFAULT_VIEWER_SETTINGS } from './types';

// Default export
export { WexViewer as default } from './core/WexViewer';
