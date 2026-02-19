import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Loader {
    constructor() {
        this.loader = new GLTFLoader();
        this.assets = new Map();

        // Registry to store the Base64 source of imported assets for saving
        // Key: assetName, Value: data:application/octet-stream;base64,....
        this.assetSources = new Map();

        // Default Transforms registry
        this.transforms = new Map();

        this.materials = {
            blue: new THREE.MeshBasicMaterial({ color: 0x007acc }),
            orange: new THREE.MeshBasicMaterial({ color: 0xffa500 }),
            purple: new THREE.MeshBasicMaterial({ color: 0x9b59b6 }),
            grey: new THREE.MeshBasicMaterial({ color: 0x888888 })
        };
    }

    async init() {
        const presets = [
            'Sphere', 'bottle', 'box', 'conv-left', 'conv-merge',
            'conv-right', 'conv-split', 'conv', 'cube', 'cylinder',
            'elevator-truck', 'factory', 'floor-brown', 'floor-green',
            'floor-grey', 'floor-white', 'machine', 'pallet-1',
            'pallet-2', 'pyramid', 'robot', 'truck', 'wall-corner-white',
            'wall-door', 'wall-window', 'wall'
        ];

        const loadPromises = presets.map(async (name) => {
            try {
                await this.load(name, `./assets/${name}.glb`);
            } catch (e) {
                console.warn(`Could not load preset ${name}.glb`, e);

                // Fallbacks for critical default assets to prevent crash
                if (name === 'pyramid') {
                    this.registerProcedural('pyramid', new THREE.ConeGeometry(0.5, 1, 4), this.materials.purple);
                } else if (name === 'cube') {
                    this.registerProcedural('cube', new THREE.BoxGeometry(1, 1, 1), this.materials.blue);
                }
            }
        });

        await Promise.all(loadPromises);
    }

    registerProcedural(name, geometry, material) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.5;
        const group = new THREE.Group();
        group.add(mesh);

        this.assets.set(name, group);
        this.initTransform(name);
    }

    load(name, url) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                this._convertToUnlit(gltf.scene);
                this.assets.set(name, gltf.scene);
                this.initTransform(name);
                resolve(gltf.scene);
            }, undefined, reject);
        });
    }

    registerAssetSource(name, src) {
        this.assetSources.set(name, src);
    }

    getAssetSource(name) {
        return this.assetSources.get(name);
    }

    initTransform(name) {
        if (!this.transforms.has(name)) {
            this.transforms.set(name, {
                pos: { x: 0, y: 0, z: 0 },
                rot: { x: 0, y: 0, z: 0 },
                scl: { x: 1, y: 1, z: 1 }
            });
        }
    }

    getTransform(name) {
        return this.transforms.get(name) || {
            pos: { x: 0, y: 0, z: 0 },
            rot: { x: 0, y: 0, z: 0 },
            scl: { x: 1, y: 1, z: 1 }
        };
    }

    setTransform(name, data) {
        this.transforms.set(name, data);
    }

    _convertToUnlit(scene) {
        scene.traverse((child) => {
            if (child.isMesh) {
                const oldMat = child.material;
                const newMat = new THREE.MeshBasicMaterial();
                if (oldMat.color) newMat.color.copy(oldMat.color);
                if (oldMat.map) {
                    newMat.map = oldMat.map;
                    newMat.map.colorSpace = THREE.SRGBColorSpace;
                }
                newMat.transparent = oldMat.transparent;
                newMat.opacity = oldMat.opacity;
                newMat.side = oldMat.side;
                newMat.alphaTest = oldMat.alphaTest;
                if (child.skeleton) newMat.skinning = true;
                child.material = newMat;
            }
        });
    }

    get(name) {
        if (this.assets.has(name)) {
            return this.assets.get(name).clone(true);
        }

        // Generic fallback for missing assets requested by scripts
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })));
        return group;
    }

    getAssetNames() {
        return Array.from(this.assets.keys());
    }
}