import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

class BinaryReader {
  constructor(arrayBuffer) {
    this.view = new DataView(arrayBuffer);
    this.offset = 0;
  }

  readInt32() {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readUint16() {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readInt16() {
    const value = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readByte() {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readFloat32() {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat64() {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readFloat32Array(count) {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = this.readFloat32();
    }
    return arr;
  }

  readFloat64Array(count) {
    const arr = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = this.readFloat64();
    }
    return arr;
  }

  readUint8Array(count) {
    const arr = new Uint8Array(this.view.buffer, this.offset, count);
    this.offset += count;
    return arr;
  }

  getSubReader(length) {
    // Create a new reader with a view into the same buffer at the current offset
    const subBuffer = this.view.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return new BinaryReader(subBuffer);
  }

  isEOF() {
    return this.offset >= this.view.byteLength;
  }
}


/**
 * WexBIM Loader for Three.js, aligned with `TriangulatedShape`.
 */
class WexBIMLoader extends THREE.Loader {
  constructor(manager) {
    super(manager);
    this._iTransform = 0;
    this._iMatrix = 0;
    this.productMaps = {};
    this.productIdLookup = [];
    this.regions = [];
    this._styleMap = new StyleMap();
    
    // Create a coordinate transformation matrix for converting from WexBIM (Z-up) to Three.js (Y-up)
    this._coordTransform = new THREE.Matrix4().set(
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, 1, 0, 0,
      0, 0, 0, 1
    );
    
    // Configure level of detail settings
    this.lodSettings = {
      useProgressive: true,          // Use progressive loading
      skipNormalsForLargeModels: true, // Skip normal computation for large models
      geometryCompressionLevel: 0.5,  // Compression level for geometry (0-1)
      useDraco: false,               // Use Draco compression if available
      useInstancedMeshes: true,      // Use instanced meshes for repeated geometry
      useGeometryBatching: true      // Batch similar geometries
    };
    
    // Performance monitoring
    this.performanceStats = {
      parseTime: 0,
      geometryCreationTime: 0,
      materialCreationTime: 0,
      totalTime: 0
    };
  }

  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    
    // Start timing
    const startTime = performance.now();
    
    loader.load(
      url,
      (data) => {
        try {
          // Use web worker for parsing if available
          if (window.Worker) {
            this._parseWithWorker(data, startTime, onLoad, onProgress, onError);
          } else {
            // Fallback to synchronous parsing
            const reader = new BinaryReader(data);
            const parsedData = this.parse(reader);
            
            // Record parsing time
            const parseEndTime = performance.now();
            this.performanceStats.parseTime = (parseEndTime - startTime) / 1000;
            
            onLoad(parsedData);
          }
        } catch (error) {
          if (onError) {
            onError(error);
          } else {
            console.error(error);
          }
          this.manager.itemError(url);
        }
      },
      onProgress,
      onError
    );
  }

  // New method to use web worker for parsing
  _parseWithWorker(arrayBuffer, startTime, onLoad, onProgress, onError) {
    try {
      // Create a new worker
      const worker = new Worker(new URL('./WexBIMWorker.js', import.meta.url), { type: 'module' });
      
      // Listen for messages from the worker
      worker.onmessage = (e) => {
        const { action, result, error, processed } = e.data;
        
        switch (action) {
          case 'complete':
            // Record parsing time from worker
            this.performanceStats.parseTime = result.processingTime;
            
            // Process the parsed data from the worker
            const scene = this._createSceneFromWorkerData(result);
            
            // Record total time
            const endTime = performance.now();
            this.performanceStats.totalTime = (endTime - startTime) / 1000;
            
            // Output performance stats
            console.log('Performance stats:', this.performanceStats);
            
            // Terminate the worker
            worker.terminate();
            
            // Return the scene
            onLoad(scene);
            break;
            
          case 'progress':
            // Forward progress to the onProgress callback
            if (onProgress) {
              onProgress({
                type: 'geometry-processing',
                processed: processed
              });
            }
            break;
            
          case 'error':
            console.error('Worker error:', error);
            if (onError) {
              onError(new Error(error));
            }
            worker.terminate();
            break;
        }
      };
      
      // Handle worker errors - fallback to synchronous parsing
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        console.log('Falling back to synchronous parsing...');
        worker.terminate();
        
        // Fallback to synchronous parsing
        try {
          const reader = new BinaryReader(arrayBuffer);
          const parsedData = this.parse(reader);
          onLoad(parsedData);
        } catch (parseError) {
          if (onError) {
            onError(parseError);
          }
        }
      };
      
      // Start the worker
      worker.postMessage({
        action: 'parse',
        data: arrayBuffer
      });
      
    } catch (error) {
      console.error('Failed to create worker:', error);
      // Fallback to synchronous parsing
      const reader = new BinaryReader(arrayBuffer);
      const parsedData = this.parse(reader);
      onLoad(parsedData);
    }
  }
  
  // New method to create a scene from worker data
  _createSceneFromWorkerData(result) {
    const { header, geometries } = result;
    
    // Extract header information
    const { version, numRegions, styles, products, regions } = header;
    
    // Store header information
    this.regions = regions || [];
    
    // Create a new scene
    const scene = new THREE.Group();
    
    // Start timing geometry creation
    const geomStartTime = performance.now();
    
    // Add geometries to the scene
    let createdGeometryCount = 0;
    const cacheGeometry = new Map(); // Cache for reusing geometries
    
    // Use progressive loading - add geometries in batches
    // Return a promise that resolves when all geometries are added
    return new Promise(resolve => {
      // Function to process a batch of geometries
      const processBatch = (startIndex, batchSize) => {
        const endIndex = Math.min(startIndex + batchSize, geometries.length);
        
        // Process each geometry in this batch
        for (let i = startIndex; i < endIndex; i++) {
          const { shapes, geometry } = geometries[i];
          
          // Create geometry key for caching
          const geometryKey = `${geometry.vertices.length}_${geometry.indices.length}`;
          
          // Use cached geometry if available
          let threeGeometry;
          if (cacheGeometry.has(geometryKey)) {
            threeGeometry = cacheGeometry.get(geometryKey);
          } else {
            // Create a new Three.js geometry
            threeGeometry = this._createBufferGeometry(geometry);
            
            // Add to cache if not too large
            if (createdGeometryCount < 1000) { // Limit cache size
              cacheGeometry.set(geometryKey, threeGeometry);
            }
          }
          
          // Skip empty geometries
          if (!threeGeometry) continue;
          
          // Add to scene
          this.addGeometryToScene(scene, shapes, threeGeometry);
          createdGeometryCount++;
        }
        
        // If there are more geometries to process, schedule the next batch
        if (endIndex < geometries.length) {
          setTimeout(() => {
            processBatch(endIndex, batchSize);
          }, 0);
        } else {
          // All batches processed - finalize the scene
          
          // Record geometry creation time
          const geomEndTime = performance.now();
          this.performanceStats.geometryCreationTime = (geomEndTime - geomStartTime) / 1000;
          
          // Resolve the promise with the completed scene
          resolve(scene);
        }
      };
      
      // Start processing with first batch
      const BATCH_SIZE = 100;
      processBatch(0, BATCH_SIZE);
    });
  }
  
  // Create a Three.js BufferGeometry from geometry data
  _createBufferGeometry(geometryData) {
    if (!geometryData || !geometryData.vertices || !geometryData.indices) {
      console.warn("Skipping empty geometry data");
      return null;
    }
    
    // Create new buffer geometry
    const geometry = new THREE.BufferGeometry();
    
    // Add position attribute
    geometry.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array(geometryData.vertices), 3
    ));
    
    // Add indices
    geometry.setIndex(new THREE.BufferAttribute(
      new Uint32Array(geometryData.indices), 1
    ));
    
    // Add normals if available (check both property names for compatibility)
    const normals = geometryData.normals || geometryData.vertexNormals;
    if (normals && normals.length > 0) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(
        new Float32Array(normals), 3
      ));
    } else {
      // Compute normals if not provided and not a large model
      geometry.computeVertexNormals();
    }
    
    // Compute bounding information for frustum culling
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    
    return geometry;
  }

  parse(reader) {
    // Start timing
    const startTime = performance.now();
    
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

    // Determine if this is a large model based on metrics
    const isLargeModel = numShapes > 1000 || numVertices > 100000 || numTriangles > 100000;
    // Set optimization level
    const optimizationLevel = isLargeModel ? 
                             (numShapes > 10000 ? 'extreme' : 'high') : 
                             'normal';
    
    // Parse header data
    this.regions = this.parseRegions(reader, numRegions);
    
    // Use simpler style parsing for extremely large models
    if (optimizationLevel === 'extreme') {
        // For extreme optimization, use minimal style parsing
        this._parseStylesMinimal(reader, numStyles);
    } else {
        this.parseStyles(reader, numStyles);
    }
    
    this.parseProducts(reader, numProducts);

    const scene = new THREE.Group();
    
    // Process model in batches to allow browser to update UI
    // This will prevent "script running too long" errors
    return new Promise(resolve => {
        const processInBatches = async () => {
            // Process model sections based on version
            if (version >= 3) {
                for (let r = 0; r < numRegions; r++) {
                    const region = this.regions[r];
                    const geomCount = reader.readInt32();
                    
                    // Process geometry in batches (100 at a time is reasonable)
                    const BATCH_SIZE = 100;
                    
                    for (let g = 0; g < geomCount; g += BATCH_SIZE) {
                        const batchEnd = Math.min(g + BATCH_SIZE, geomCount);
                        
                        // Process a batch of geometries
                        for (let i = g; i < batchEnd; i++) {
                            const shapes = this.parseShape(reader, version);
                            const geomLength = reader.readInt32();
                            
                            if (geomLength === 0) continue;
                            
                            const gbr = reader.getSubReader(geomLength);
                            const geometryData = this.parseGeometry(gbr);
                            
                            if (!gbr.isEOF()) {
                                console.warn(`Incomplete reading of geometry for shape instance ${shapes[0].iLabel}`);
                            }
                            
                            // Convert raw geometry data to THREE.BufferGeometry
                            const geometry = this._createBufferGeometry(geometryData);
                            if (geometry) {
                                this.addGeometryToScene(scene, shapes, geometry);
                            }
                        }
                        
                        // Give browser a chance to process events between batches
                        await new Promise(r => setTimeout(r, 0));
                    }
                }
            } else {
                // Same batch processing for older versions
                const BATCH_SIZE = 100;
                
                for (let i = 0; i < numShapes; i += BATCH_SIZE) {
                    const batchEnd = Math.min(i + BATCH_SIZE, numShapes);
                    
                    for (let j = i; j < batchEnd; j++) {
                        const shapes = this.parseShape(reader, version);
                        const geometryData = this.parseGeometry(reader);
                        const geometry = this._createBufferGeometry(geometryData);
                        if (geometry) {
                            this.addGeometryToScene(scene, shapes, geometry);
                        }
                    }
                    
                    // Give browser a chance to process events
                    await new Promise(r => setTimeout(r, 0));
                }
            }
            
            const endTime = performance.now();
            console.log(`Model parsing complete in ${((endTime - startTime)/1000).toFixed(2)} seconds`);
            resolve(scene);
        };
        
        // Start batch processing
        processInBatches();
    });
  }

  parseRegions(reader, count) {
    const regions = [];
    for (let i = 0; i < count; i++) {
      const population = reader.readInt32();
      
      // Read center coordinates
      const rawCenter = reader.readFloat32Array(3);
      // Transform coordinates: swap Y and Z (WexBIM Z-up to Three.js Y-up)
      const center = [rawCenter[0], rawCenter[2], rawCenter[1]];
      
      // Read bounding box (min x, min y, min z, max x, max y, max z)
      const rawBBox = reader.readFloat32Array(6);
      // Transform bounding box coordinates
      const boundingBox = [
        rawBBox[0], rawBBox[2], rawBBox[1],  // min x, min y (was z), min z (was y)
        rawBBox[3], rawBBox[5], rawBBox[4]   // max x, max y (was z), max z (was y)
      ];
      
      regions.push({
        Population: population,
        Centre: center,
        BoundingBox: boundingBox,
        GeometryModels: [],
      });
    }
    return regions;
  }

  parseStyles(reader, count) {
    // Performance: Only log every 10th style for large models
    const shouldLogDetail = count < 50;
    
    for (let i = 0; i < count; i++) {
      const styleId = reader.readInt32();
      const r = reader.readFloat32();
      const g = reader.readFloat32();
      const b = reader.readFloat32();
      const a = reader.readFloat32();
      const rgba = [r * 255, g * 255, b * 255, a * 255];
      
      const colorObj = new THREE.Color(r, g, b);
      const hex = '#' + colorObj.getHexString();
      
      this._styleMap.add({ 
        id: styleId, 
        index: i, 
        transparent: rgba[3] < 254,
        opacity: a,
        color: colorObj,
        hex: hex
      });
    }

    // Add default styles with bright colors for testing
    this._styleMap.add({ 
      id: -1, 
      index: count, 
      transparent: false,
      opacity: 1.0,
      color: new THREE.Color(1, 0, 0), // Bright red for unknown styles
      hex: '#ff0000'
    });
    this._styleMap.add({ 
      id: -2, 
      index: count + 1, 
      transparent: false,
      opacity: 1.0,
      color: new THREE.Color(0, 0, 1), // Bright blue for type 3 or 4
      hex: '#0000ff'
    });
  }

  parseProducts(reader, count) {
    for (let i = 0; i < count; i++) {
      const productLabel = reader.readInt32();
      const prodType = reader.readInt16();
      const bBox = reader.readFloat32Array(6);

      this.productMaps[productLabel] = {
        productID: productLabel,
        renderId: i + 1,
        type: prodType,
        bBox,
        spans: [],
        states: prodType === 3 || prodType === 4 ? [0] : [],
      };

      this.productIdLookup[i + 1] = productLabel;
    }
  }

  parseShape(reader, version) {
    const repetition = reader.readInt32();
    const shapes = [];
    
    // Performance: Only log detail for smaller models
    const shouldLogDetail = repetition < 50;

    for (let i = 0; i < repetition; i++) {
      const productLabel = reader.readInt32();
      const instanceTypeId = reader.readInt16();
      const instanceLabel = reader.readInt32();
      const styleId = reader.readInt32();

      let transformation = null;
      if (repetition > 1) {
        // Read the transformation matrix
        const rawTransform = version === 1 ? reader.readFloat32Array(16) : reader.readFloat64Array(16);
        
        // Convert from WexBIM to Three.js coordinate system
        transformation = this._transformMatrix(rawTransform);
      }

      // Get style information
      let styleItem = this._styleMap.get(styleId);
      if (!styleItem) {
        styleItem = this._styleMap.get(-1);
      }
      
      const type = this.productMaps[productLabel]?.type || 0;
      let finalStyleId = styleId;
      
      if (type === 3 || type === 4) {
        finalStyleId = -2;
        styleItem = this._styleMap.get(-2);
      }

      shapes.push({
        pLabel: productLabel,
        iLabel: instanceLabel,
        styleId: finalStyleId, // Store the actual style ID to use for lookup
        style: styleItem.index,
        transparent: styleItem.transparent,
        opacity: styleItem.opacity || 1.0,
        transform: transformation, // Store the actual transformation array (or null if none)
      });
    }

    return shapes;
  }

  parseGeometry(reader) {
    const version = reader.readByte();
    const numVertices = reader.readInt32();
    const numTriangles = reader.readInt32();

    // Pre-allocate typed arrays for better performance
    // Using direct allocation instead of copying data later
    const vertices = new Float32Array(numVertices * 3);
    const indices = new Uint32Array(numTriangles * 3);
    
    // Create array for vertex normals (not per-face normals)
    // This will be accumulated and normalized later for smoother shading
    const vertexNormals = new Float32Array(numVertices * 3);
    const normalCounts = new Uint32Array(numVertices); // Count contributions to each vertex
    
    // Read vertices directly into the pre-allocated array
    for (let i = 0; i < numVertices; i++) {
        const x = reader.readFloat32();
        const y = reader.readFloat32();
        const z = reader.readFloat32();
        
        // Coordinate system transformation: WexBIM uses Z-up, Three.js uses Y-up
        // Swap Y and Z coordinates (and negate one for correct handedness)
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
    
    // Temporary array to store face indices for a second pass
    const faceIndices = [];
    const faceNormals = [];

    for (let i = 0; i < numFaces; i++) {
        let numTrianglesInFace = reader.readInt32();
        if (numTrianglesInFace === 0) continue;

        const isPlanar = numTrianglesInFace > 0;
        numTrianglesInFace = Math.abs(numTrianglesInFace);

        if (isPlanar) {
            // Read the packed normal (2 bytes for planar face)
            const u = reader.readByte();
            const v = reader.readByte();
            
            // Decode the normal vector using the SharpDxHelper.Vector3 equivalent
            const normal = this._decodeNormal(u, v);
            
            // Transform normal to match Three.js coordinate system (swap Y and Z)
            const normalThreeJS = new THREE.Vector3(
                normal.x,
                normal.z,  // Y in Three.js = Z in WexBIM
                normal.y   // Z in Three.js = Y in WexBIM
            );
            
            // Store face indices and the corresponding normal
            const faceTriangles = [];
            
            // Read indices for the face
            for (let j = 0; j < numTrianglesInFace * 3; j++) {
                const vertexIndex = readIndex();
                faceTriangles.push(vertexIndex);
                indices[iIndex++] = vertexIndex;
            }
            
            faceIndices.push(faceTriangles);
            faceNormals.push(normalThreeJS);
        } else {
            // Non-planar face - each vertex has its own normal
            for (let j = 0; j < numTrianglesInFace; j++) {
                const triangleIndices = [];
                const triangleNormals = [];
                
                for (let k = 0; k < 3; k++) {
                    // Read vertex index
                    const vertexIndex = readIndex();
                    triangleIndices.push(vertexIndex);
                    indices[iIndex++] = vertexIndex;
                    
                    // Read normal data (2 bytes per normal)
                    const u = reader.readByte();
                    const v = reader.readByte();
                    
                    // Decode the normal vector
                    const normal = this._decodeNormal(u, v);
                    
                    // Transform normal to match Three.js coordinate system
                    const normalThreeJS = new THREE.Vector3(
                        normal.x,
                        normal.z, // Y in Three.js = Z in WexBIM
                        normal.y  // Z in Three.js = Y in WexBIM
                    );
                    
                    triangleNormals.push(normalThreeJS);
                }
                
                faceIndices.push(triangleIndices);
                faceNormals.push(triangleNormals);
            }
        }
    }
    
    // Second pass - accumulate normals at vertices for smoother shading
    for (let i = 0; i < faceIndices.length; i++) {
        const indices = faceIndices[i];
        const normals = faceNormals[i];
        
        // Handle both planar (single normal) and non-planar (per-vertex normal) cases
        const isPlanar = !Array.isArray(normals.x);
        
        for (let j = 0; j < indices.length; j++) {
            const vertexIndex = indices[j];
            const normal = isPlanar ? normals : normals[j % 3];
            
            // Accumulate normal at this vertex
            const offset = vertexIndex * 3;
            vertexNormals[offset] += normal.x;
            vertexNormals[offset + 1] += normal.y;
            vertexNormals[offset + 2] += normal.z;
            
            // Count contribution
            normalCounts[vertexIndex]++;
        }
    }
    
    // Normalize accumulated normals
    for (let i = 0; i < numVertices; i++) {
        const count = normalCounts[i];
        if (count > 0) {
            const offset = i * 3;
            vertexNormals[offset] /= count;
            vertexNormals[offset + 1] /= count;
            vertexNormals[offset + 2] /= count;
            
            // Ensure normal is normalized
            const length = Math.sqrt(
                vertexNormals[offset] * vertexNormals[offset] +
                vertexNormals[offset + 1] * vertexNormals[offset + 1] +
                vertexNormals[offset + 2] * vertexNormals[offset + 2]
            );
            
            if (length > 0) {
                vertexNormals[offset] /= length;
                vertexNormals[offset + 1] /= length;
                vertexNormals[offset + 2] /= length;
            }
        }
    }

    // Ensure our index is correct
    if (iIndex !== numTriangles * 3) {
        console.warn(`Expected ${numTriangles * 3} indices but got ${iIndex}`);
    }

    return { vertices, indices, normals: vertexNormals };
  }

  /**
   * Decode a normal vector from two bytes (u,v) using octahedral encoding
   * This is equivalent to SharpDxHelper.Vector3 in the C# code
   * @param {number} u - First byte of the encoded normal
   * @param {number} v - Second byte of the encoded normal
   * @returns {THREE.Vector3} - Decoded normal vector
   */
  _decodeNormal(u, v) {
    // Convert from polar coordinates
    // u and v are passed as integers between 0-255, we need to normalize them
    const un = 2 * (u / 255.0) - 1.0;
    const vn = 2 * (v / 255.0) - 1.0;
    
    // Calculate the z component assuming unit vector
    let zSquared = 1.0 - un * un - vn * vn;
    const normal = new THREE.Vector3(un, vn, zSquared > 0 ? Math.sqrt(zSquared) : 0);
    
    // Ensure the normal is normalized
    normal.normalize();
    
    // Convert from Y-up to Z-up for Three.js
    // In WexBim format: +Y is UP, +X is RIGHT, +Z is FORWARD (away from viewer)
    // In Three.js: +Y is UP, +X is RIGHT, +Z is BACKWARD (toward viewer)
    normal.z = -normal.z;
    
    return normal;
  }

  addGeometryToScene(scene, shapes, geometry) {
    if (!geometry) {
        console.warn("Skipping empty geometry.");
        return;
    }

    // Create materials more efficiently by using the start timer
    const materialStartTime = performance.now();

    if (shapes.length === 1) {
        const shape = shapes[0];
        const style = this._styleMap.get(shape.styleId);
        
        if (!style) return;
        
        const shapeGroup = new THREE.Group();
        
        // Create material
        const material = this._styleMap.getMaterial(shape.styleId);
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        
        if (shape.transform) {
            mesh.applyMatrix4(new THREE.Matrix4().fromArray(shape.transform));
        }
        
        mesh.frustumCulled = true;
        shapeGroup.add(mesh);
        
        // Add the entire group to the scene
        scene.add(shapeGroup);
    } else {
        // For multiple shapes with the same geometry, use instanced meshes
        this._addInstancedGeometryToScene(scene, shapes, geometry);
    }
    
    // Record material creation time
    const materialEndTime = performance.now();
    this.performanceStats.materialCreationTime += (materialEndTime - materialStartTime) / 1000;
  }
  
  // New method for adding instanced geometry
  _addInstancedGeometryToScene(scene, shapes, geometry) {
    // Group shapes by style ID for better instancing
    const shapesByStyle = {};
    
    shapes.forEach(shape => {
        const styleId = shape.styleId;
        if (!shapesByStyle[styleId]) {
            shapesByStyle[styleId] = [];
        }
        shapesByStyle[styleId].push(shape);
    });
    
    // Create instanced meshes for each style group
    for (const styleId in shapesByStyle) {
        const shapesInGroup = shapesByStyle[styleId];
        const style = this._styleMap.get(styleId);
        if (!style) continue;
        
        // Create material for this style
        const material = this._styleMap.getMaterial(styleId);
        
        // Create instanced mesh
        const instancedMesh = new THREE.InstancedMesh(
            geometry,
            material,
            shapesInGroup.length
        );
        
        // Set instance matrices
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < shapesInGroup.length; i++) {
            const shape = shapesInGroup[i];
            
            if (shape.transform) {
                matrix.fromArray(shape.transform);
            } else {
                matrix.identity();
            }
            
            instancedMesh.setMatrixAt(i, matrix);
        }
        
        // Update matrices flag
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // Enable frustum culling
        instancedMesh.frustumCulled = true;
        
        // Add to scene
        scene.add(instancedMesh);
    }
  }

  // Minimal style parsing for extreme optimization
  _parseStylesMinimal(reader, count) {
    // Create a palette of predefined colors to use
    const palette = [
        new THREE.Color(0.8, 0.8, 0.8), // light gray
        new THREE.Color(0.6, 0.6, 0.6), // medium gray
        new THREE.Color(0.4, 0.4, 0.4), // dark gray
        new THREE.Color(0.7, 0.3, 0.3), // red
        new THREE.Color(0.3, 0.7, 0.3), // green
        new THREE.Color(0.3, 0.3, 0.7), // blue
        new THREE.Color(0.7, 0.7, 0.3), // yellow
        new THREE.Color(0.7, 0.3, 0.7), // purple
        new THREE.Color(0.3, 0.7, 0.7)  // cyan
    ];
    
    // Read but don't process all styles (just skip the data)
    for (let i = 0; i < count; i++) {
        const styleId = reader.readInt32();
        // Read but store RGBA values
        const r = reader.readFloat32();
        const g = reader.readFloat32();
        const b = reader.readFloat32();
        const a = reader.readFloat32();
        
        // Assign a color from the palette based on index
        const colorIndex = i % palette.length;
        const color = palette[colorIndex];
        const hex = '#' + color.getHexString();
        
        this._styleMap.add({ 
            id: styleId, 
            index: i, 
            transparent: a < 0.99,
            opacity: a,
            color: color,
            hex: hex
        });
    }
    
    // Add default styles
    this._styleMap.add({ 
        id: -1, 
        index: count, 
        transparent: false,
        opacity: 1.0,
        color: new THREE.Color(1, 0, 0),
        hex: '#ff0000'
    });
    this._styleMap.add({ 
        id: -2, 
        index: count + 1, 
        transparent: false,
        opacity: 1.0,
        color: new THREE.Color(0, 0, 1),
        hex: '#0000ff'
    });
  }

  // Helper method to transform matrices from WexBIM (Z-up) to Three.js (Y-up) coordinate system
  _transformMatrix(rawMatrix) {
    if (!rawMatrix) return null;
    
    // Create a Three.js matrix from the raw data
    const wexBimMatrix = new THREE.Matrix4().fromArray(rawMatrix);
    
    // Apply the coordinate transformation: M' = T * M * T^-1
    // This effectively changes the coordinate system while preserving the transformation
    const threeJsMatrix = new THREE.Matrix4()
      .multiplyMatrices(this._coordTransform, wexBimMatrix)
      .multiply(new THREE.Matrix4().copy(this._coordTransform).invert());
    
    return threeJsMatrix.elements;
  }
}


class StyleMap {
  constructor() {
    this.styles = {};
    this.materialCache = {}; // Cache for materials to avoid recreation
    
    // Default style if none is provided
    this.defaultStyle = {
      color: { r: 200, g: 200, b: 200 },
      transparent: false,
      opacity: 1.0
    };
    
    // Material settings that will be used for all materials
    this.materialSettings = {
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide,
      dithering: true
    };
  }

  /**
   * Create a material for a style with optimized settings
   * @param {number} styleId - Style ID
   * @param {object} style - Style object with color, transparency, etc.
   * @returns {THREE.Material} - A Three.js material
   */
  createMaterial(styleId, style) {
    // Check if material already exists in cache
    if (this.materialCache[styleId]) {
      return this.materialCache[styleId];
    }
    
    // Get style or use default
    style = style || this.defaultStyle;
    const color = style.color || this.defaultStyle.color;
    
    // Determine the color values - THREE.Color uses 0-1 range, raw objects use 0-255
    let r, g, b;
    if (color instanceof THREE.Color) {
      // Already a THREE.Color - values are 0-1
      r = color.r;
      g = color.g;
      b = color.b;
    } else if (color.r !== undefined) {
      // Raw RGB object with 0-255 range
      r = color.r / 255;
      g = color.g / 255;
      b = color.b / 255;
    } else {
      // Fallback to gray
      r = g = b = 0.7;
    }
    
    // Create material with optimized settings
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r, g, b),
      wireframe: false,
      transparent: style.transparent || false,
      opacity: style.opacity || 1.0,
      side: THREE.DoubleSide,
      roughness: this.materialSettings.roughness,
      metalness: this.materialSettings.metalness,
      flatShading: this.materialSettings.flatShading,
      // Subtle emissive to prevent total darkness in shadowed areas
      emissive: new THREE.Color(r * 0.1, g * 0.1, b * 0.1),
      dithering: this.materialSettings.dithering
    });
    
    // Add to cache
    this.materialCache[styleId] = material;
    
    return material;
  }

  /**
   * Add a style to the map
   * @param {object} record - Style record with ID and properties
   */
  add(record) {
    this.styles[record.id] = record;
  }

  /**
   * Get a style by ID
   * @param {number} id - Style ID
   * @returns {object|null} - Style object or null if not found
   */
  get(id) {
    return this.styles[id] || null;
  }

  /**
   * Get a material for a style ID
   * @param {number} styleId - Style ID
   * @returns {THREE.Material} - Three.js material
   */
  getMaterial(styleId) {
    // Get the style
    const style = this.get(styleId);
    
    // Create material (or get from cache)
    return this.createMaterial(styleId, style);
  }

  /**
   * Debug method to output all styles
   */
  dumpStyles() {
    console.log("STYLE MAP:", this.styles);
  }
}

export { WexBIMLoader, BinaryReader };
