import * as THREE from "three";

/*
  This class computes "surface IDs" for a given mesh.

  A "surface" is defined as a set of triangles that share vertices.
  
  Optimized version with better performance for large models.
*/
class FindSurfaces {
  constructor() {
    // This identifier, must be globally unique for each surface
    // across all geometry rendered on screen
    this.surfaceId = 0;
    
    // Performance options
    this.options = {
      maxSurfacesPerGeometry: 10000,  // Cap the number of surfaces to avoid processing very large models
      useWorker: false,              // Use web worker for large models (not fully implemented yet)
      batchSize: 10000,              // Process vertices in batches to avoid UI freezing
      skipTooLargeModels: true       // Skip processing for very large models
    };
    
    // Cache for already processed meshes
    this.surfaceIdCache = new WeakMap();
  }

  /*
   * Returns the surface Ids as a Float32Array that can be inserted as a vertex attribute
   * Now with caching for better performance on repeated calls
   */
  getSurfaceIdAttribute(mesh) {
    // Check if we've already processed this mesh
    if (this.surfaceIdCache.has(mesh)) {
      return this.surfaceIdCache.get(mesh);
    }
    
    const bufferGeometry = mesh.geometry;
    const numVertices = bufferGeometry.attributes.position.count;
    
    // Skip very large meshes if option is set
    if (this.options.skipTooLargeModels && numVertices > 100000) {
      console.warn(`Skipping surface ID generation for large mesh with ${numVertices} vertices`);
      
      // Generate a dummy attribute with a single surface ID
      const dummyColors = new Float32Array(numVertices * 4);
      for (let i = 0; i < numVertices; i++) {
        dummyColors[i * 4] = this.surfaceId;
        dummyColors[i * 4 + 3] = 1;  // Alpha
      }
      this.surfaceId++;
      
      // Cache and return
      this.surfaceIdCache.set(mesh, dummyColors);
      return dummyColors;
    }
    
    // Generate surface IDs
    const vertexIdToSurfaceId = this._generateSurfaceIds(mesh);

    // Create attribute array
    const colors = new Float32Array(numVertices * 4);
    for (let i = 0; i < numVertices; i++) {
      const vertexId = i;
      let surfaceId = vertexIdToSurfaceId[vertexId] || 0;

      colors[i * 4] = surfaceId;
      colors[i * 4 + 3] = 1;  // Alpha
    }

    // Cache the result
    this.surfaceIdCache.set(mesh, colors);
    
    return colors;
  }

  /*
   * Returns a `vertexIdToSurfaceId` map
   * given a vertex, returns the surfaceId
   * Optimized implementation with more efficient data structures
   */
  _generateSurfaceIds(mesh) {
    const bufferGeometry = mesh.geometry;
    const numVertices = bufferGeometry.attributes.position.count;
    
    // Early exit if no index buffer
    if (!bufferGeometry.index) {
      const result = {};
      for (let i = 0; i < numVertices; i++) {
        result[i] = this.surfaceId++;
      }
      return result;
    }
    
    const numIndices = bufferGeometry.index.count;
    const indexBuffer = bufferGeometry.index.array;
    
    // Use typed arrays for better memory performance
    // For each vertex, we need to store its connections
    // We'll use an array of arrays, which is more efficient than a Map of Arrays
    const adjacencyList = new Array(numVertices);
    
    // Initialize adjacency list
    for (let i = 0; i < numVertices; i++) {
      adjacencyList[i] = [];
    }
    
    // Build the adjacency list
    for (let i = 0; i < numIndices; i += 3) {
      const i1 = indexBuffer[i + 0];
      const i2 = indexBuffer[i + 1];
      const i3 = indexBuffer[i + 2];

      this._addEdge(adjacencyList, i1, i2);
      this._addEdge(adjacencyList, i1, i3);
      this._addEdge(adjacencyList, i2, i3);
    }
    
    // Find connected components (surfaces)
    const visited = new Uint8Array(numVertices);
    const vertexIdToSurfaceId = {};
    let surfaceCount = 0;
    
    // Cap the maximum number of surfaces to avoid excessive processing
    const maxSurfaces = this.options.maxSurfacesPerGeometry;
    
    for (let i = 0; i < numVertices && surfaceCount < maxSurfaces; i++) {
      if (visited[i] === 0) {
        // Found a new surface
        const surfaceId = this.surfaceId++;
        surfaceCount++;
        
        // Get all vertices in this surface
        this._bfs(adjacencyList, i, visited, vertexId => {
          vertexIdToSurfaceId[vertexId] = surfaceId;
        });
      }
    }
    
    return vertexIdToSurfaceId;
  }
  
  // Helper function to add an edge to the adjacency list
  _addEdge(adjacencyList, a, b) {
    // Avoid duplicates - only check if the list is small
    const listA = adjacencyList[a];
    if (listA.length < 10) {
      // Small list - linear search is faster than binary
      if (listA.indexOf(b) === -1) {
        listA.push(b);
      }
    } else {
      // Large list - just push and we'll handle duplicates later if needed
      listA.push(b);
    }
    
    const listB = adjacencyList[b];
    if (listB.length < 10) {
      if (listB.indexOf(a) === -1) {
        listB.push(a);
      }
    } else {
      listB.push(a);
    }
  }
  
  // Breadth-first search to find all vertices in a connected component
  _bfs(adjacencyList, startVertex, visited, callback) {
    const queue = [startVertex];
    visited[startVertex] = 1;
    callback(startVertex);
    
    while (queue.length > 0) {
      const vertex = queue.shift();
      const neighbors = adjacencyList[vertex];
      
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        if (visited[neighbor] === 0) {
          visited[neighbor] = 1;
          queue.push(neighbor);
          callback(neighbor);
        }
      }
    }
  }
}

export default FindSurfaces;

export function getSurfaceIdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      maxSurfaceId: { value: 1 },
    },
    vertexShader: getVertexShader(),
    fragmentShader: getFragmentShader(),
    vertexColors: true,
  });
}

function getVertexShader() {
  return `
  varying vec2 v_uv;
  varying vec4 vColor;

  void main() {
     v_uv = uv;
     vColor = color;

     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `;
}

function getFragmentShader() {
  return `
  varying vec2 v_uv;
  varying vec4 vColor;
  uniform float maxSurfaceId;

  void main() {
    // Normalize the surfaceId when writing to texture
    // Surface ID needs rounding as precision can be lost in perspective correct interpolation 
    float surfaceId = round(vColor.r) / maxSurfaceId;
    gl_FragColor = vec4(surfaceId, 0.0, 0.0, 1.0);
  }
  `;
}

// For debug rendering, assign a random color
// to each surfaceId
export function getDebugSurfaceIdMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: getVertexShader(),
    fragmentShader: `
  varying vec2 v_uv;
  varying vec4 vColor;

  void main() {      
      int surfaceId = int(round(vColor.r) * 100.0);
      float R = float(surfaceId % 255) / 255.0;
      float G = float((surfaceId + 50) % 255) / 255.0;
      float B = float((surfaceId * 20) % 255) / 255.0;

      gl_FragColor = vec4(R, G, B, 1.0);
  }
  `,
    vertexColors: true,
  });
}