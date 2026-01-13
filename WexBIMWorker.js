// WexBIM Parser Worker
// This worker moves the heavy parsing work off the main thread

// Import required parsers from a separate module
import { BinaryReader } from './WexBIMLoader.js';

// Listen for messages from the main thread
self.onmessage = function(e) {
  const { data, action } = e.data;
  
  if (action === 'parse') {
    try {
      // Start timing
      const startTime = performance.now();
      
      // Create a reader from the ArrayBuffer
      const reader = new BinaryReader(data);
      
      // Parse the header
      const result = parseHeader(reader);
      
      // Parse the geometry in batches and send progress updates
      const geometries = parseGeometries(reader, result);
      
      // Calculate total processing time
      const endTime = performance.now();
      const processingTime = (endTime - startTime) / 1000;
      
      // Send the parsed data back to the main thread
      self.postMessage({
        action: 'complete',
        result: {
          header: result,
          geometries: geometries,
          processingTime: processingTime
        }
      });
    } catch (error) {
      self.postMessage({
        action: 'error',
        error: error.message
      });
    }
  }
};

// Parse header information
function parseHeader(reader) {
  const magicNumber = reader.readInt32();
  if (magicNumber !== 94132117) {
    throw new Error("Invalid WexBIM file: Magic Number mismatch.");
  }

  const version = reader.readByte();
  if (version > 4) {
    throw new Error(`Unsupported WexBIM version: ${version}`);
  }

  const numShapes = reader.readInt32();
  const numVertices = reader.readInt32();
  const numTriangles = reader.readInt32();
  const numMatrices = reader.readInt32();
  const numProducts = reader.readInt32();
  const numStyles = reader.readInt32();
  const meter = reader.readFloat32();
  let localWCS = version > 3 ? [reader.readFloat64(), reader.readFloat64(), reader.readFloat64()] : [0, 0, 0];
  const numRegions = reader.readInt16();
  
  return {
    version,
    numShapes,
    numVertices,
    numTriangles,
    numMatrices,
    numProducts,
    numStyles,
    meter,
    localWCS,
    numRegions
  };
}

// Parse regions data
function parseRegions(reader, count) {
  const regions = [];
  for (let i = 0; i < count; i++) {
    const population = reader.readInt32();
    
    // Read center coordinates
    const rawCenter = reader.readFloat32Array(3);
    // Transform coordinates: swap Y and Z (WexBIM Z-up to Three.js Y-up)
    const center = [rawCenter[0], rawCenter[2], rawCenter[1]];
    
    // Read bounding box
    const rawBBox = reader.readFloat32Array(6);
    // Transform bounding box coordinates
    const boundingBox = [
      rawBBox[0], rawBBox[2], rawBBox[1], // min x, min y, min z
      rawBBox[3], rawBBox[5], rawBBox[4]  // max x, max y, max z
    ];
    
    regions.push({
      population,
      center,
      boundingBox
    });
  }
  return regions;
}

// Parse styles (minimal version for better performance)
function parseStylesMinimal(reader, count) {
  const styles = [];
  for (let i = 0; i < count; i++) {
    const styleId = reader.readInt32();
    
    // Read RGB color
    const r = reader.readByte();
    const g = reader.readByte();
    const b = reader.readByte();
    const a = reader.readByte();
    
    styles.push({
      id: styleId,
      color: { r, g, b },
      transparent: a < 255,
      opacity: a / 255.0
    });
  }
  return styles;
}

// Parse products
function parseProducts(reader, count) {
  const products = [];
  for (let i = 0; i < count; i++) {
    const productLabel = reader.readInt32();
    const productType = reader.readByte();
    products.push({
      label: productLabel,
      type: productType
    });
  }
  return products;
}

// Parse geometry in batches
function parseGeometries(reader, header) {
  const { version, numRegions } = header;
  const geometries = [];
  
  // Process model sections based on version
  if (version >= 3) {
    for (let r = 0; r < numRegions; r++) {
      const geomCount = reader.readInt32();
      
      for (let g = 0; g < geomCount; g++) {
        // Parse shape information
        const shapes = parseShape(reader, version);
        const geomLength = reader.readInt32();
        
        if (geomLength === 0) continue;
        
        const gbr = reader.getSubReader(geomLength);
        const geometry = parseGeometry(gbr);
        
        geometries.push({
          shapes,
          geometry
        });
        
        // Send progress updates every 100 geometries
        if (geometries.length % 100 === 0) {
          self.postMessage({
            action: 'progress',
            processed: geometries.length
          });
        }
      }
    }
  } else {
    // Older version format handling would go here
  }
  
  return geometries;
}

// Parse shape information
function parseShape(reader, version) {
  const shapes = [];
  const iInstanceType = reader.readByte();
  
  if (iInstanceType === 3) {
    const instanceCount = reader.readInt32();
    for (let i = 0; i < instanceCount; i++) {
      shapes.push({
        iType: 3,
        iLabel: reader.readInt32(),
        transform: reader.readInt32(),
        styleId: reader.readInt32()
      });
    }
  } else {
    shapes.push({
      iType: iInstanceType,
      iLabel: reader.readInt32(),
      transform: reader.readInt32(),
      styleId: reader.readInt32()
    });
  }
  
  return shapes;
}

// Parse geometry data
function parseGeometry(reader) {
  const numVertices = reader.readInt32();
  const numTriangles = reader.readInt32();

  // Pre-allocate typed arrays for better performance
  const vertices = new Float32Array(numVertices * 3);
  const indices = new Uint32Array(numTriangles * 3);
  const vertexNormals = new Float32Array(numVertices * 3);
  const normalCounts = new Uint32Array(numVertices);
  
  // Read vertices directly into the pre-allocated array
  for (let i = 0; i < numVertices; i++) {
    const x = reader.readFloat32();
    const y = reader.readFloat32();
    const z = reader.readFloat32();
    
    // Coordinate system transformation: WexBIM uses Z-up, Three.js uses Y-up
    vertices[i * 3] = x;     // X remains the same
    vertices[i * 3 + 1] = z; // Y in Three.js = Z in WexBIM
    vertices[i * 3 + 2] = y; // Z in Three.js = Y in WexBIM
  }

  let iIndex = 0;
  let readIndex;

  // Determine the correct method for reading indices based on vertex count
  if (numVertices <= 0xFF) {
    readIndex = () => reader.readByte();
  } else if (numVertices <= 0xFFFF) {
    readIndex = () => reader.readUint16();
  } else {
    readIndex = () => reader.readInt32();
  }

  const numFaces = reader.readInt32();
  
  // Process faces and collect normal information
  // ... (implementation similar to WexBIMLoader.js)

  return { 
    vertices, 
    indices, 
    vertexNormals 
  };
}

// Helper function to decode normals
function decodeNormal(u, v) {
  // ... (implementation from WexBIMLoader.js)
} 