import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class AssetsManager {
    constructor(loader, onTransformUpdate) {
        this.loader = loader;
        this.onTransformUpdate = onTransformUpdate;
        this.container = document.getElementById('asset-preview-container');
        this.select = document.getElementById('asset-select');
        this.currentAsset = null;
        this.currentAssetName = null;

        this.inputs = {
            pos: { x: document.getElementById('asset-pos-x'), y: document.getElementById('asset-pos-y'), z: document.getElementById('asset-pos-z') },
            rot: { x: document.getElementById('asset-rot-x'), y: document.getElementById('asset-rot-y'), z: document.getElementById('asset-rot-z') },
            scl: { x: document.getElementById('asset-scl-x'), y: document.getElementById('asset-scl-y'), z: document.getElementById('asset-scl-z') }
        };

        this.initPreview();
        this.bindEvents();
    }

    initPreview() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        const aspect = this.container.clientWidth / this.container.clientHeight || 1;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
        this.camera.position.set(3, 3, 5);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.zoomSpeed = 30.0;

        const grid = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
        this.scene.add(grid);

        const axes = new THREE.AxesHelper(5);
        if (axes.material) {
            axes.material.depthTest = false;
            axes.material.transparent = true;
        }
        axes.renderOrder = 999;
        this.scene.add(axes);

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const height = entry.contentRect.height;
                if (width > 0 && height > 0) {
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(width, height);
                }
            }
        });
        this.resizeObserver.observe(this.container);

        const animate = () => {
            requestAnimationFrame(animate);
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    bindEvents() {
        this.select.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) this.loadAssetToPreview(val);
        });

        document.getElementById('input-import-glb').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const base64Src = evt.target.result;
                    const name = file.name.replace(/\.[^/.]+$/, "");

                    this.loader.load(name, base64Src).then(() => {
                        this.loader.registerAssetSource(name, base64Src);
                        this.refreshList(name);
                        this.loadAssetToPreview(name);
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        const update = () => {
            this.applyTransformToMesh();
            this.saveTransformToLoader();
            if (this.onTransformUpdate) this.onTransformUpdate(this.currentAssetName);
        };

        Object.values(this.inputs).forEach(g => Object.values(g).forEach(i => i.addEventListener('input', update)));

        document.getElementById('btn-reset-transform').addEventListener('click', () => {
            this.resetFormInputs();
            this.applyTransformToMesh();
            this.saveTransformToLoader();
            if (this.onTransformUpdate) this.onTransformUpdate(this.currentAssetName);
        });
    }

    refreshList(selectedName = null) {
        this.select.innerHTML = '';

        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.textContent = "Select an asset";
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        this.select.appendChild(defaultOpt);

        const names = this.loader.getAssetNames();
        names.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === selectedName) {
                opt.selected = true;
                defaultOpt.selected = false;
            }
            this.select.appendChild(opt);
        });
    }

    loadAssetToPreview(name) {
        if (!name) return;
        this.currentAssetName = name;

        if (this.currentAsset) {
            this.scene.remove(this.currentAsset);
        }

        this.currentAsset = this.loader.get(name);
        this.scene.add(this.currentAsset);

        const savedData = this.loader.getTransform(name);

        this.inputs.pos.x.value = savedData.pos.x;
        this.inputs.pos.y.value = savedData.pos.y;
        this.inputs.pos.z.value = savedData.pos.z;

        this.inputs.rot.x.value = savedData.rot.x;
        this.inputs.rot.y.value = savedData.rot.y;
        this.inputs.rot.z.value = savedData.rot.z;

        this.inputs.scl.x.value = savedData.scl.x;
        this.inputs.scl.y.value = savedData.scl.y;
        this.inputs.scl.z.value = savedData.scl.z;

        this.applyTransformToMesh();

        const box = new THREE.Box3().setFromObject(this.currentAsset);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2));
        cameraZ *= 2.0;
        if (cameraZ < 2) cameraZ = 2;

        this.controls.target.copy(center);
        this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
        this.controls.update();
    }

    resetFormInputs() {
        this.inputs.pos.x.value = 0; this.inputs.pos.y.value = 0; this.inputs.pos.z.value = 0;
        this.inputs.rot.x.value = 0; this.inputs.rot.y.value = 0; this.inputs.rot.z.value = 0;
        this.inputs.scl.x.value = 1; this.inputs.scl.y.value = 1; this.inputs.scl.z.value = 1;
    }

    applyTransformToMesh() {
        if (!this.currentAsset) return;

        this.currentAsset.position.set(
            parseFloat(this.inputs.pos.x.value) || 0,
            parseFloat(this.inputs.pos.y.value) || 0,
            parseFloat(this.inputs.pos.z.value) || 0
        );
        this.currentAsset.rotation.set(
            THREE.MathUtils.degToRad(parseFloat(this.inputs.rot.x.value) || 0),
            THREE.MathUtils.degToRad(parseFloat(this.inputs.rot.y.value) || 0),
            THREE.MathUtils.degToRad(parseFloat(this.inputs.rot.z.value) || 0)
        );
        this.currentAsset.scale.set(
            parseFloat(this.inputs.scl.x.value) || 1,
            parseFloat(this.inputs.scl.y.value) || 1,
            parseFloat(this.inputs.scl.z.value) || 1
        );
    }

    saveTransformToLoader() {
        if (!this.currentAssetName) return;

        const data = {
            pos: {
                x: parseFloat(this.inputs.pos.x.value) || 0,
                y: parseFloat(this.inputs.pos.y.value) || 0,
                z: parseFloat(this.inputs.pos.z.value) || 0
            },
            rot: {
                x: parseFloat(this.inputs.rot.x.value) || 0,
                y: parseFloat(this.inputs.rot.y.value) || 0,
                z: parseFloat(this.inputs.rot.z.value) || 0
            },
            scl: {
                x: parseFloat(this.inputs.scl.x.value) || 1,
                y: parseFloat(this.inputs.scl.y.value) || 1,
                z: parseFloat(this.inputs.scl.z.value) || 1
            }
        };

        this.loader.setTransform(this.currentAssetName, data);
    }
}