import * as THREE from "three";

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
  }

  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType("arraybuffer");
    loader.load(
      url,
      (data) => {
        try {
          const parsedData = this.parse(new BinaryReader(data));
          onLoad(parsedData);
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

  parse(reader) {
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

    console.log("Parsed Header:", { numShapes, numVertices, numTriangles });

    this.regions = this.parseRegions(reader, numRegions);
    this.parseStyles(reader, numStyles);
    this.parseProducts(reader, numProducts);

    const scene = new THREE.Group();

    if (version >= 3) {
      for (let r = 0; r < numRegions; r++) {
        let region = this.regions[r];
        let geomCount = reader.readInt32();

        for (let g = 0; g < geomCount; g++) {
          // Read shape information
          const shapes = this.parseShape(reader, version);

          // Read geometry length
          let geomLength = reader.readInt32();
          if (geomLength === 0) continue;

          // Read geometry using subreader to prevent overflow
          let gbr = reader.getSubReader(geomLength);
          const geometry = this.parseGeometry(gbr);

          if (!gbr.isEOF()) {
            throw new Error(`Incomplete reading of geometry for shape instance ${shapes[0].iLabel}`);
          }

          this.addGeometryToScene(scene, shapes, geometry);
        }
      }
    } else {
      for (let iShape = 0; iShape < numShapes; iShape++) {
        const shapes = this.parseShape(reader, version);
        const geometry = this.parseGeometry(reader);

        this.addGeometryToScene(scene, shapes, geometry);
      }
    }

    return scene;
  }

  parseRegions(reader, count) {
    const regions = [];
    for (let i = 0; i < count; i++) {
      regions.push({
        Population: reader.readInt32(),
        Centre: reader.readFloat32Array(3),
        BoundingBox: reader.readFloat32Array(6),
        GeometryModels: [],
      });
    }
    return regions;
  }

  parseStyles(reader, count) {
    for (let i = 0; i < count; i++) {
      const styleId = reader.readInt32();
      const rgba = [reader.readFloat32() * 255, reader.readFloat32() * 255, reader.readFloat32() * 255, reader.readFloat32() * 255];
      this._styleMap.add({ id: styleId, index: i, transparent: rgba[3] < 254 });
    }

    this._styleMap.add({ id: -1, index: count, transparent: false });
    this._styleMap.add({ id: -2, index: count + 1, transparent: false });
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

    for (let i = 0; i < repetition; i++) {
      const productLabel = reader.readInt32();
      const instanceTypeId = reader.readInt16();
      const instanceLabel = reader.readInt32();
      const styleId = reader.readInt32();

      let transformation = null;
      if (repetition > 1) {
        transformation = version === 1 ? reader.readFloat32Array(16) : reader.readFloat64Array(16);
      }

      let styleItem = this._styleMap.get(styleId) || this._styleMap.get(-1);
      const type = this.productMaps[productLabel]?.type || 0;
      if (type === 3 || type === 4) {
        styleItem = this._styleMap.get(-2);
      }

      shapes.push({
        pLabel: productLabel,
        iLabel: instanceLabel,
        style: styleItem.index,
        transparent: styleItem.transparent,
        transform: transformation ? this._iTransform++ : -1,
      });
    }

    return shapes;
  }

  parseGeometry(reader) {
    const version = reader.readByte();
    const numVertices = reader.readInt32();
    const numTriangles = reader.readInt32();

    const vertices = reader.readFloat32Array(numVertices * 3);
    const indices = new Uint32Array(numTriangles * 3);
    const normals = new Uint8Array(numTriangles * 6);

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

    for (let i = 0; i < numFaces; i++) {
        let numTrianglesInFace = reader.readInt32();
        if (numTrianglesInFace === 0) continue;

        const isPlanar = numTrianglesInFace > 0;
        numTrianglesInFace = Math.abs(numTrianglesInFace);

        if (isPlanar) {
            const normal = reader.readUint8Array(2);

            // ✅ FIX: Read indices manually instead of using `readArray`
            const planarIndices = new Uint32Array(numTrianglesInFace * 3);
            for (let j = 0; j < numTrianglesInFace * 3; j++) {
                planarIndices[j] = readIndex();
            }

            indices.set(planarIndices, iIndex);

            for (let j = 0; j < numTrianglesInFace * 3; j++) {
                normals.set(normal, iIndex * 2);
                iIndex++;
            }
        } else {
            for (let j = 0; j < numTrianglesInFace; j++) {
                indices[iIndex] = readIndex();
                normals.set(reader.readUint8Array(2), iIndex * 2);
                iIndex++;

                indices[iIndex] = readIndex();
                normals.set(reader.readUint8Array(2), iIndex * 2);
                iIndex++;

                indices[iIndex] = readIndex();
                normals.set(reader.readUint8Array(2), iIndex * 2);
                iIndex++;
            }
        }
    }

    return { vertices, indices, normals };
  }

  addGeometryToScene(scene, shapes, geometryData) {
    if (!geometryData || !geometryData.vertices || !geometryData.indices) {
        console.warn("Skipping empty geometry.");
        return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(geometryData.vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometryData.indices), 1));
    geometry.setAttribute("normal", new THREE.BufferAttribute(new Uint8Array(geometryData.normals), 2));

    const materials = shapes.map((shape) => {
        const style = this._styleMap.get(shape.style) || this._styleMap.get(-1); 
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xffffff), 
            transparent: style.transparent,
            opacity: style.transparent ? 0.5 : 1,
            metalness: 0.1,
            roughness: 0.9,
            side: THREE.DoubleSide, // Avoid backface culling issues
        });
    });


    if (shapes.length > 1) {
        const instancedMesh = new THREE.InstancedMesh(geometry, materials[0], shapes.length);
        const dummy = new THREE.Object3D();

        shapes.forEach((shape, index) => {
            if (shape.transform !== -1) {
                const matrix = new THREE.Matrix4().fromArray(shape.transform);
                dummy.applyMatrix4(matrix);
            }
            instancedMesh.setMatrixAt(index, dummy.matrix);
        });

        scene.add(instancedMesh);
    } else {
        // ✅ Regular Mesh for a single instance
        const mesh = new THREE.Mesh(geometry, materials[0]);
        if (shapes[0].transform !== -1) {
            mesh.applyMatrix4(new THREE.Matrix4().fromArray(shapes[0].transform));
        }
        scene.add(mesh);
    }
}



}


class StyleMap {
  constructor() {
    this._internal = {};
  }

  add(record) {
    this._internal[record.id] = record;
  }

  get(id) {
    return this._internal[id] || null;
  }
}

export { WexBIMLoader };
