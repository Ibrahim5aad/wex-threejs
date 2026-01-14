import * as THREE from 'three';

// ============================================================================
// Model Types
// ============================================================================

/**
 * Type of model source
 */
export type ModelSourceType = 'file' | 'url' | 'blob';

/**
 * Represents a model loaded in the viewer
 */
export interface LoadedModel {
  /** Unique identifier for this model in the viewer */
  id: string;
  /** Display name of the model (usually the filename) */
  name: string;
  /** Source URL or path of the model */
  source: string;
  /** Type of source */
  sourceType: ModelSourceType;
  /** The Three.js scene/group containing the model */
  scene: THREE.Group;
  /** Bounding box of the model */
  boundingBox: THREE.Box3;
  /** Center point of the model */
  center: THREE.Vector3;
  /** Size of the model */
  size: THREE.Vector3;
  /** Whether the model is currently visible */
  isVisible: boolean;
  /** When the model was loaded */
  loadedAt: Date;
  /** File size in bytes (if known) */
  sizeBytes?: number;
  /** Custom tag data associated with the model */
  tag?: unknown;
}

/**
 * Progress info during model loading
 */
export interface LoadProgress {
  loaded: number;
  total: number;
  percent: number;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Base event args for viewer events
 */
export interface ViewerEventArgs {
  /** Name of the event */
  eventName: string;
  /** Model ID if applicable */
  modelId?: string;
  /** Element/product ID if applicable */
  elementId?: number;
  /** Mouse position */
  position?: { x: number; y: number };
  /** 3D world position */
  worldPosition?: THREE.Vector3;
  /** Additional event data */
  data?: unknown;
}

/**
 * Pick event args (when clicking on an element)
 */
export interface PickEventArgs extends ViewerEventArgs {
  eventName: 'pick';
  elementId: number;
  modelId: string;
  worldPosition: THREE.Vector3;
  mesh: THREE.Mesh;
}

/**
 * Hover event args
 */
export interface HoverEventArgs extends ViewerEventArgs {
  eventName: 'hover';
  elementId?: number;
  modelId?: string;
  mesh?: THREE.Mesh;
}

// ============================================================================
// Viewer Props & State
// ============================================================================

/**
 * Viewer settings
 */
export interface ViewerSettings {
  /** Background color */
  backgroundColor: string;
  /** Show grid */
  showGrid: boolean;
  /** Show axes helper */
  showAxes: boolean;
  /** Enable shadows */
  enableShadows: boolean;
  /** Ambient light intensity */
  ambientLightIntensity: number;
  /** Directional light intensity */
  directionalLightIntensity: number;
  /** Camera field of view */
  cameraFov: number;
  /** Camera near plane */
  cameraNear: number;
  /** Camera far plane */
  cameraFar: number;
  /** Enable orbit controls damping */
  enableDamping: boolean;
  /** Damping factor */
  dampingFactor: number;
}

/**
 * Default viewer settings
 */
export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  backgroundColor: '#1a1a2e',
  showGrid: true,
  showAxes: true,
  enableShadows: false,
  ambientLightIntensity: 0.4,
  directionalLightIntensity: 1.0,
  cameraFov: 75,
  cameraNear: 1,      // Increased from 0.1 to reduce z-fighting
  cameraFar: 100000,
  enableDamping: true,
  dampingFactor: 0.2,
};

/**
 * Viewer state
 */
export interface ViewerState {
  /** Currently loaded models */
  models: Map<string, LoadedModel>;
  /** Currently selected element IDs */
  selectedElements: Set<number>;
  /** Currently highlighted element IDs */
  highlightedElements: Set<number>;
  /** Currently hidden element IDs */
  hiddenElements: Set<number>;
  /** Whether the viewer is loading */
  isLoading: boolean;
  /** Loading progress (0-100) */
  loadingProgress: number;
  /** Current error message */
  error: string | null;
  /** Viewer settings */
  settings: ViewerSettings;
}

// ============================================================================
// WexViewer Component Props
// ============================================================================

/**
 * Props for the WexViewer component
 */
export interface WexViewerProps {
  /** Unique ID for the viewer */
  id?: string;
  /** Width of the viewer (CSS value) */
  width?: string | number;
  /** Height of the viewer (CSS value) */
  height?: string | number;
  /** Background color */
  backgroundColor?: string;
  /** Selection highlight color (hex string or CSS color) */
  selectionColor?: string;
  /** Hover highlight color (hex string or CSS color) */
  hoverColor?: string;
  /** URL to initial model to load */
  modelUrl?: string;
  /** Viewer settings override */
  settings?: Partial<ViewerSettings>;
  /** Container style */
  style?: React.CSSProperties;
  /** Container class name */
  className?: string;
  /** Child content (toolbars, overlays) */
  children?: React.ReactNode;
  
  // Events
  /** Called when viewer is initialized */
  onViewerReady?: (viewer: WexViewerRef) => void;
  /** Called when a model is loaded */
  onModelLoaded?: (model: LoadedModel) => void;
  /** Called when loading progress updates */
  onProgress?: (progress: LoadProgress) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when an element is clicked */
  onPick?: (event: PickEventArgs) => void;
  /** Called when hovering over an element */
  onHover?: (event: HoverEventArgs) => void;
  /** Called on double click */
  onDoubleClick?: (event: ViewerEventArgs) => void;
}

/**
 * Ref interface for WexViewer (imperative API)
 */
export interface WexViewerRef {
  // Model Management
  loadModel: (url: string, name?: string) => Promise<LoadedModel | null>;
  loadModelFromBytes: (data: ArrayBuffer, name?: string) => Promise<LoadedModel | null>;
  unloadModel: (modelId: string) => Promise<boolean>;
  unloadAllModels: () => Promise<void>;
  setModelVisibility: (modelId: string, visible: boolean) => void;
  getLoadedModels: () => Map<string, LoadedModel>;
  
  // Camera & View
  zoomFit: (modelId?: string) => void;
  reset: () => void;
  setView: (view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso') => void;
  
  // Selection & Highlighting
  selectElements: (elementIds: number[], modelId?: string) => void;
  addToSelection: (elementIds: number[], modelId?: string) => void;
  removeFromSelection: (elementIds: number[], modelId?: string) => void;
  clearSelection: () => void;
  getSelectedElements: () => number[];
  
  highlightElements: (elementIds: number[], modelId?: string) => void;
  unhighlightElements: (elementIds: number[], modelId?: string) => void;
  
  // Visibility
  hideElements: (elementIds: number[], modelId?: string) => void;
  showElements: (elementIds: number[], modelId?: string) => void;
  isolateElements: (elementIds: number[], modelId?: string) => void;
  unisolateElements: () => void;
  
  // Settings
  setBackgroundColor: (color: string) => void;
  setSettings: (settings: Partial<ViewerSettings>) => void;
  getSettings: () => ViewerSettings;
  
  // X-Ray Mode
  setXRayMode: (enabled: boolean) => void;
  getXRayMode: () => boolean;
  
  // Access to Three.js objects
  getScene: () => THREE.Scene | null;
  getCamera: () => THREE.PerspectiveCamera | null;
  getRenderer: () => THREE.WebGLRenderer | null;
}

// ============================================================================
// Plugin Types
// ============================================================================

/**
 * Base plugin interface
 */
export interface ViewerPlugin {
  /** Unique identifier */
  id: string;
  /** Plugin type name */
  type: string;
  /** Whether the plugin is stopped */
  isStopped: boolean;
  /** Initialize the plugin */
  init: (scene: THREE.Scene, camera: THREE.Camera) => void;
  /** Update the plugin (called each frame) */
  update?: () => void;
  /** Dispose the plugin */
  dispose: () => void;
}

/**
 * Navigation cube plugin options
 */
export interface NavigationCubeOptions {
  /** Size ratio relative to viewer (0-1) */
  ratio?: number;
  /** Transparency when not hovering (0-1) */
  passiveAlpha?: number;
  /** Transparency when hovering (0-1) */
  activeAlpha?: number;
  /** Position in viewer */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Grid plugin options
 */
export interface GridOptions {
  /** Size of the grid */
  size?: number;
  /** Number of divisions */
  divisions?: number;
  /** Primary color */
  color1?: string;
  /** Secondary color */
  color2?: string;
}

/**
 * Section box plugin options
 */
export interface SectionBoxOptions {
  /** Box color */
  color?: string;
  /** Box opacity */
  opacity?: number;
}

// ============================================================================
// Toolbar Types
// ============================================================================

/**
 * Position of toolbar
 */
export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Alignment of toolbar
 */
export type ToolbarAlignment = 'start' | 'center' | 'end';

/**
 * Base toolbar item
 */
export interface ToolbarItemBase {
  id: string;
  tooltip?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Toolbar button
 */
export interface ToolbarButton extends ToolbarItemBase {
  type: 'button';
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
}

/**
 * Toolbar toggle button
 */
export interface ToolbarToggleButton extends ToolbarItemBase {
  type: 'toggle';
  icon?: React.ReactNode;
  toggledIcon?: React.ReactNode;
  isToggled: boolean;
  onToggle: (toggled: boolean) => void;
}

/**
 * Toolbar button group
 */
export interface ToolbarButtonGroup extends ToolbarItemBase {
  type: 'group';
  label?: string;
  items: ToolbarItem[];
}

/**
 * Toolbar separator
 */
export interface ToolbarSeparator {
  type: 'separator';
}

/**
 * Union type for toolbar items
 */
export type ToolbarItem = ToolbarButton | ToolbarToggleButton | ToolbarButtonGroup | ToolbarSeparator;

/**
 * Toolbar props
 */
export interface ViewerToolbarProps {
  items?: ToolbarItem[];
  position?: ToolbarPosition;
  alignment?: ToolbarAlignment;
  className?: string;
  children?: React.ReactNode;
}

// ============================================================================
// UI Component Props
// ============================================================================

/**
 * File dropzone props
 */
export interface FileDropzoneProps {
  accept?: string;
  onLoad?: (url: string, fileName: string, data: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Model info panel props
 */
export interface ModelInfoPanelProps {
  model?: LoadedModel | null;
  className?: string;
}

/**
 * Loading overlay props
 */
export interface LoadingOverlayProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

/**
 * Model manager panel props
 */
export interface ModelManagerPanelProps {
  models: LoadedModel[];
  onUnload?: (modelId: string) => void;
  onToggleVisibility?: (modelId: string, visible: boolean) => void;
  onZoomTo?: (modelId: string) => void;
  className?: string;
}

// ============================================================================
// WexBIM Types (from loader)
// ============================================================================

export interface WexBIMStyle {
  id: number;
  color: THREE.Color;
  opacity: number;
}

export interface WexBIMGeometry {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export interface WexBIMShape {
  productLabel: number;
  instanceLabel: number;
  styleId: number;
  geometryId: number;
  transform: number[] | null;
  boundingBox: number[];
}

// Legacy exports for backwards compatibility
export type Viewer3DProps = WexViewerProps;
export type WexBIMModelProps = {
  src: string;
  onLoad?: (model: LoadedModel) => void;
  onProgress?: (progress: LoadProgress) => void;
  onError?: (error: Error) => void;
};
