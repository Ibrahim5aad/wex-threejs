# wex-threejs

A React component library for viewing WexBIM 3D building models using Three.js.

## Installation

```bash
npm install wex-threejs three
```

## Quick Start

```tsx
import { WexViewer, ViewerToolbar, BuiltInButtons } from 'wex-threejs';
import 'wex-threejs/styles.css';

function App() {
  const viewerRef = useRef(null);

  return (
    <WexViewer
      ref={viewerRef}
      modelUrl="/path/to/model.wexbim"
      style={{ width: '100%', height: '100vh' }}
    >
      <ViewerToolbar
        position="bottom"
        items={[
          BuiltInButtons.createHomeButton(viewerRef),
          BuiltInButtons.createZoomFitButton(viewerRef),
          BuiltInButtons.createResetButton(viewerRef),
        ]}
      />
    </WexViewer>
  );
}
```

## Components

### WexViewer

The main 3D viewer component.

```tsx
<WexViewer
  ref={viewerRef}
  modelUrl="/model.wexbim"
  backgroundColor="#1a1a2e"
  selectionColor="#2196F3"  // Blue (default) - customizable
  hoverColor="#4CAF50"      // Green (default) - customizable
  onModelLoaded={(model) => console.log('Loaded:', model)}
  onPick={(event) => console.log('Picked:', event.elementId)}
  onHover={(event) => console.log('Hovered:', event.elementId)}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `backgroundColor` | `string` | `'#1a1a2e'` | Viewer background color |
| `selectionColor` | `string` | `'#2196F3'` | Highlight color for selected elements (customizable) |
| `hoverColor` | `string` | `'#4CAF50'` | Highlight color for hovered elements (customizable) |
| `modelUrl` | `string` | - | URL to initial model to load |
| `onPick` | `(event) => void` | - | Called when an element is clicked |
| `onHover` | `(event) => void` | - | Called when hovering over an element |

### ViewerToolbar

A customizable toolbar for viewer controls.

```tsx
<ViewerToolbar
  position="bottom"  // 'top' | 'bottom' | 'left' | 'right'
  alignment="center" // 'start' | 'center' | 'end'
  items={[...]}
/>
```

### FileLoaderPanel

A panel for loading WexBIM files from local storage or URLs.

```tsx
<FileLoaderPanel
  onFileLoad={(file) => viewerRef.current?.loadModelFromBytes(file)}
  onUrlLoad={(url) => viewerRef.current?.loadModel(url)}
/>
```

### ModelManagerPanel

A panel for managing loaded models.

```tsx
<ModelManagerPanel
  models={models}
  onUnload={(id) => viewerRef.current?.unloadModel(id)}
  onToggleVisibility={(id, visible) => viewerRef.current?.setModelVisibility(id, visible)}
/>
```

## Built-in Toolbar Buttons

```tsx
import { BuiltInButtons } from 'wex-threejs';

// Navigation
BuiltInButtons.createHomeButton(viewerRef)
BuiltInButtons.createZoomFitButton(viewerRef)
BuiltInButtons.createResetButton(viewerRef)
BuiltInButtons.createViewsDropdown(viewerRef)

// Toggles
BuiltInButtons.createGridToggle(visible, setVisible)
BuiltInButtons.createXRayToggle(active, setActive)
BuiltInButtons.createThemeToggle(isDark, setIsDark)

// Selection
BuiltInButtons.createHideToggle(viewerRef, getSelected, isHidden, setHidden)
BuiltInButtons.createIsolateToggle(viewerRef, getSelected, isIsolated, setIsolated)
BuiltInButtons.createClearSelectionButton(viewerRef)
```

## Icons

The library includes a set of minimal, monochrome SVG icons:

```tsx
import { Icons } from 'wex-threejs';

<Icons.Home size={24} />
<Icons.ZoomFit size={24} />
<Icons.Grid size={24} />
// ... and more
```

## Theming

The library uses CSS custom properties (variables) for easy customization. Import the styles and override the variables to match your brand.

### Default Theme Colors

| Theme | Accent Color | Description |
|-------|--------------|-------------|
| Dark (default) | `#4CAF50` (Green) | Used for active/toggled states |
| Light | `#2196F3` (Blue) | Applied when `.theme-light` class is present |

### Customizing Colors

**Option 1: Override in your CSS file**

```css
/* Custom theme with orange accent */
:root {
  --wex-accent-color: #FF9800;
  --wex-accent-color-hover: #F57C00;
  --wex-accent-color-light: rgba(255, 152, 0, 0.3);
  --wex-accent-color-lighter: rgba(255, 152, 0, 0.4);
}

/* Custom light theme with purple accent */
.theme-light {
  --wex-accent-color: #9C27B0;
  --wex-accent-color-hover: #7B1FA2;
  --wex-accent-color-light: rgba(156, 39, 176, 0.15);
  --wex-accent-color-lighter: rgba(156, 39, 176, 0.25);
}
```

**Option 2: Inline styles**

```tsx
<div style={{ '--wex-accent-color': '#E91E63' } as React.CSSProperties}>
  <WexViewer ref={viewerRef} ... />
</div>
```

### Available CSS Variables

#### Accent Colors
| Variable | Description |
|----------|-------------|
| `--wex-accent-color` | Primary accent color (active states, highlights) |
| `--wex-accent-color-hover` | Accent color on hover |
| `--wex-accent-color-light` | Light accent background (30% opacity) |
| `--wex-accent-color-lighter` | Lighter accent background (40% opacity) |

#### Background Colors
| Variable | Description |
|----------|-------------|
| `--wex-bg-primary` | Main panel/toolbar background |
| `--wex-bg-secondary` | Secondary panel background |
| `--wex-bg-tertiary` | Button/element background |
| `--wex-bg-hover` | Background on hover |

#### Text Colors
| Variable | Description |
|----------|-------------|
| `--wex-text-primary` | Primary text color |
| `--wex-text-secondary` | Secondary text color |
| `--wex-text-muted` | Muted/disabled text |

#### Border Colors
| Variable | Description |
|----------|-------------|
| `--wex-border-color` | Default border color |
| `--wex-border-color-hover` | Border color on hover |

#### Icon Colors
| Variable | Description |
|----------|-------------|
| `--wex-icon-color` | Default icon stroke color |
| `--wex-icon-color-active` | Icon color when active |

#### Other
| Variable | Description |
|----------|-------------|
| `--wex-separator-color` | Toolbar separator color |

### Switching Between Themes

Add the `theme-light` class to your container to switch to light mode:

```tsx
function App() {
  const [isDark, setIsDark] = useState(true);
  
  return (
    <div className={isDark ? '' : 'theme-light'}>
      <WexViewer ref={viewerRef} ... />
    </div>
  );
}
```

### Customizing 3D Selection and Hover Colors

The colors used for highlighting selected and hovered 3D elements can be customized via props:

**Default Colors:**
- **Selection**: `#2196F3` (Blue) - highlights elements when clicked/selected
- **Hover**: `#4CAF50` (Green) - highlights elements when mouse hovers over them

**Customizing:**

```tsx
<WexViewer
  ref={viewerRef}
  selectionColor="#FF5722"  // Custom orange for selection
  hoverColor="#00BCD4"      // Custom cyan for hover
  // ... other props
/>
```

You can use any valid CSS color value:
- Hex: `"#FF5722"`
- RGB: `"rgb(255, 87, 34)"`
- RGBA: `"rgba(255, 87, 34, 0.8)"`
- Named colors: `"red"`, `"blue"`, etc.

**Note:** These colors are separate from the UI theme colors (CSS variables). They control the 3D element highlighting in the viewer, while CSS variables control the UI components (toolbars, panels, buttons).

---

## API Reference

### WexViewerRef Methods

```typescript
interface WexViewerRef {
  // Model loading
  loadModel(url: string, name?: string): Promise<LoadedModel | null>;
  loadModelFromBytes(data: ArrayBuffer, name?: string): Promise<LoadedModel | null>;
  unloadModel(modelId: string): Promise<boolean>;
  unloadAllModels(): Promise<void>;
  getLoadedModels(): Map<string, LoadedModel>;
  
  // Visibility
  setModelVisibility(modelId: string, visible: boolean): void;
  hideElements(elementIds: number[]): void;
  showElements(elementIds: number[]): void;
  isolateElements(elementIds: number[]): void;
  unisolateElements(): void;
  
  // Navigation
  zoomFit(modelId?: string): void;
  reset(): void;
  setView(view: 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'): void;
  
  // Selection & Highlighting
  selectElements(elementIds: number[], modelId?: string): void;
  addToSelection(elementIds: number[], modelId?: string): void;
  removeFromSelection(elementIds: number[], modelId?: string): void;
  clearSelection(): void;
  getSelectedElements(): number[];
  highlightElements(elementIds: number[], modelId?: string): void;
  unhighlightElements(elementIds: number[], modelId?: string): void;
  
  // X-Ray Mode
  setXRayMode(enabled: boolean): void;
  getXRayMode(): boolean;
  
  // Settings
  setBackgroundColor(color: string): void;
  setSettings(settings: Partial<ViewerSettings>): void;
  getSettings(): ViewerSettings;
  
  // Three.js Access
  getScene(): THREE.Scene | null;
  getCamera(): THREE.PerspectiveCamera | null;
  getRenderer(): THREE.WebGLRenderer | null;
}
```

## License

MIT
