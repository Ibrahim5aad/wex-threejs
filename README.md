# WexThreeJS

A React Three.js library for viewing WexBIM 3D models.

![WexThreeJS Demo](docs/images/screenshot.png)

## Project Structure

This is a monorepo containing:

- **`packages/wex-threejs`** - The core React component library (published as `@xbim/wex-threejs`)
- **`packages/demo`** - Demo application showcasing the library

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/Ibrahim5aad/WexThreeJS.git
cd WexThreeJS

# Install dependencies
npm install

# Build the library
npm run build

# Run the demo
npm run dev
```

## Development

```bash
# Watch mode for library development
npm run dev:lib

# Run demo in development mode  
npm run dev

# Build everything
npm run build:all
```

## Using the Library

```bash
npm install @xbim/wex-threejs three
```

```tsx
import { useRef } from 'react';
import { WexViewer, ViewerToolbar, BuiltInButtons } from '@xbim/wex-threejs';

function App() {
  const viewerRef = useRef(null);

  return (
    <WexViewer
      ref={viewerRef}
      modelUrl="/model.wexbim"
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

See `packages/wex-threejs/README.md` for full API documentation.

## License

MIT
