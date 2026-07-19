# @3d-print-os/ui

Shared React UI components for 3D Print OS applications.

## Components

### StlViewer

A reusable 3D STL file viewer component built with Three.js and React Three Fiber.

#### Features

- Load STL files from URL or File object
- Orbit controls (rotate, zoom, pan)
- Auto-rotate option
- Reset camera button
- Loading state with customizable component
- Error state with retry option
- Mobile-responsive touch controls
- Customizable colors and materials
- Grid and axes helpers
- Auto-center and scale models

#### Installation

```bash
pnpm install
```

#### Usage

```tsx
import { StlViewer } from '@3d-print-os/ui';

function MyComponent() {
  return (
    <div style={{ width: '100%', height: '500px' }}>
      <StlViewer
        stlUrl="/path/to/model.stl"
        modelColor="#6366f1"
        backgroundColor="#1a1a2e"
        showGrid={true}
        showResetButton={true}
      />
    </div>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `stlUrl` | `string` | - | URL of STL file to load |
| `stlFile` | `File` | - | STL file object (alternative to stlUrl) |
| `className` | `string` | `''` | CSS class name for container |
| `style` | `CSSProperties` | - | Custom container style |
| `initialCameraPosition` | `[number, number, number]` | `[5, 5, 5]` | Initial camera position |
| `enableControls` | `{ rotate, zoom, pan }` | All `true` | Enable/disable camera controls |
| `autoRotate` | `boolean` | `false` | Auto-rotate the model |
| `autoRotateSpeed` | `number` | `1` | Auto-rotate speed |
| `backgroundColor` | `string` | `'#1a1a2e'` | Background color |
| `showGrid` | `boolean` | `true` | Show grid helper |
| `showAxes` | `boolean` | `false` | Show axes helper |
| `modelColor` | `string` | `'#6366f1'` | Model color |
| `materialType` | `'standard' \| 'normal' \| 'wireframe'` | `'standard'` | Material type |
| `onLoad` | `(geometry) => void` | - | Callback when model loads |
| `onError` | `(error) => void` | - | Callback when loading fails |
| `loadingComponent` | `ReactNode` | - | Custom loading component |
| `errorComponent` | `ReactNode` | - | Custom error component |
| `showResetButton` | `boolean` | `true` | Show reset camera button |
| `resetButtonComponent` | `ReactNode` | - | Custom reset button component |
| `minDistance` | `number` | `0.1` | Minimum zoom distance |
| `maxDistance` | `number` | `1000` | Maximum zoom distance |

#### Ref API

```tsx
const viewerRef = useRef<StlViewerRef>(null);

// Reset camera to initial position
viewerRef.current?.resetCamera();

// Get current viewer state
const state = viewerRef.current?.getState(); // 'idle' | 'loading' | 'loaded' | 'error'

// Force re-render
viewerRef.current?.refresh();
```

#### Example with File Upload

```tsx
function ModelUploader() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <input type="file" accept=".stl" onChange={handleFileChange} />
      {file && (
        <div style={{ width: '100%', height: '500px' }}>
          <StlViewer stlFile={file} />
        </div>
      )}
    </div>
  );
}
```

#### Mobile Support

The component is fully responsive and supports touch controls on mobile devices:
- Single finger drag to rotate
- Pinch to zoom
- Two finger drag to pan

#### Customization

You can customize the loading and error states:

```tsx
<StlViewer
  stlUrl="/model.stl"
  loadingComponent={
    <div className="custom-loading">
      <CustomSpinner />
      <p>Preparing your model...</p>
    </div>
  }
  errorComponent={
    <div className="custom-error">
      <p>Failed to load model</p>
      <button onClick={handleRetry}>Try Again</button>
    </div>
  }
/>
```

## Development

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Clean
pnpm clean
```

## License

Proprietary — All rights reserved.
