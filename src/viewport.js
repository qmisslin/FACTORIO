import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Viewport {
    constructor(containerId, loader) {
        this.container = document.getElementById(containerId);
        this.loader = loader;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.nodes = new Map();
        this.links = new Map();
        this.linkVisuals = [];
        this.movingItems = [];

        this.assetInstances = [];

        this.showGrid = true;
        this.showLinks = true;
        this.showText = true;

        this.breakIcon = new Image();
        this.breakIcon.src = './assets/source-break.png';

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1e1e1e);

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(10, 15, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.zoomSpeed = 2.0;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 100;

        this.gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0x333333);
        this.scene.add(this.gridHelper);

        this.axesHelper = new THREE.AxesHelper(2);
        if (this.axesHelper.material) {
            this.axesHelper.material.depthTest = false;
            this.axesHelper.material.transparent = true;
        }
        this.axesHelper.renderOrder = 999;
        this.scene.add(this.axesHelper);

        window.addEventListener('resize', () => this.onResize());

        // reset camera
        this.renderer.domElement.addEventListener('dblclick', () => {
            this.camera.position.set(10, 15, 10);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        });
    }

    clear() {
        this.nodes.forEach(node => this.scene.remove(node.group));
        this.nodes.clear();

        this.linkVisuals.forEach(v => this.scene.remove(v));
        this.linkVisuals = [];

        this.movingItems.forEach(item => this.scene.remove(item.mesh));
        this.movingItems = [];

        this.links.clear();
        this.assetInstances = [];
    }

    toggleGrid(active) {
        this.showGrid = active;
        if (this.gridHelper) this.gridHelper.visible = active;
        if (this.axesHelper) this.axesHelper.visible = active;
    }

    toggleLinks(active) {
        this.showLinks = active;
        this.linkVisuals.forEach(v => {
            if (!(v instanceof THREE.Sprite)) {
                v.visible = active;
            }
        });
    }

    toggleText(active) {
        this.showText = active;
        this.nodes.forEach(node => {
            if (node.textObj) node.textObj.sprite.visible = active;
        });
        this.linkVisuals.forEach(v => {
            if (v instanceof THREE.Sprite) {
                v.visible = active;
            }
        });
    }

    applyMasterTransform(assetName, mesh) {
        const t = this.loader.getTransform(assetName);
        mesh.position.set(t.pos.x, t.pos.y, t.pos.z);
        mesh.rotation.set(
            THREE.MathUtils.degToRad(t.rot.x),
            THREE.MathUtils.degToRad(t.rot.y),
            THREE.MathUtils.degToRad(t.rot.z)
        );
        mesh.scale.set(t.scl.x, t.scl.y, t.scl.z);
    }

    updateAssetTransforms(assetName) {
        this.assetInstances.forEach(inst => {
            if (inst.name === assetName) {
                this.applyMasterTransform(assetName, inst.mesh);
            }
        });
    }

    createNode(id, x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        this.scene.add(group);
        this.nodes.set(id, { group, textObj: null });
    }

    updateNodePos(id, x, z) {
        if (this.nodes.has(id)) {
            this.nodes.get(id).group.position.set(x, 0, z);
        }
    }

    addAssetToNode(id, assetName, x, z, rotRad, scale = 1) {
        if (!this.nodes.has(id)) return;

        const container = new THREE.Group();
        container.position.set(x || 0, 0, z || 0);
        container.rotation.y = rotRad || 0;
        container.scale.set(scale, scale, scale);

        const asset = this.loader.get(assetName);
        this.applyMasterTransform(assetName, asset);
        this.assetInstances.push({ name: assetName, mesh: asset });

        container.add(asset);
        this.nodes.get(id).group.add(container);
    }

    setupSourceVisuals(id, productName, duration) {
        const node = this.nodes.get(id);
        if (!node) return;

        node.textObj = this._createTextSprite(true);
        node.textObj.sprite.position.set(0, 2.5, 0);
        node.textObj.sprite.visible = this.showText;
        node.group.add(node.textObj.sprite);

        this._updateSourceCanvas(node.textObj, [productName, `${duration} ticks`], 0, 0, false);
    }

    updateSourceVisuals(id, productName, duration, prodRatio, repairRatio, isBroken) {
        const node = this.nodes.get(id);
        if (!node || !node.textObj) return;
        this._updateSourceCanvas(node.textObj, [productName, `${duration} ticks`], prodRatio, repairRatio, isBroken);
    }

    setupSinkVisuals(id, productName) {
        const node = this.nodes.get(id);
        if (!node) return;

        node.textObj = this._createTextSprite(true);
        node.textObj.sprite.position.set(0, 3.0, 0);
        node.textObj.sprite.visible = this.showText;
        node.group.add(node.textObj.sprite);
    }

    updateSinkVisuals(id, productName, stock, cap, fail, loss) {
        const node = this.nodes.get(id);
        if (!node || !node.textObj) return;

        const capText = cap === 0 ? "∞" : cap;

        this._updateTextCanvas(node.textObj, [
            productName,
            `S: ${stock}/${capText}`,
            `F: ${fail}`,
            `L: ${loss}`
        ]);
    }

    createLinkVisuals(id, points, volume) {
        const pathPoints = points.map(p => new THREE.Vector3(p.x, p.y, p.z));

        const curve = new THREE.CurvePath();
        for (let i = 0; i < pathPoints.length - 1; i++) {
            curve.add(new THREE.LineCurve3(pathPoints[i], pathPoints[i + 1]));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
        const material = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
        const line = new THREE.Line(geometry, material);
        line.visible = this.showLinks;
        this.scene.add(line);
        this.linkVisuals.push(line);

        pathPoints.forEach(p => {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xaaaaaa }));
            dot.position.copy(p);
            dot.visible = this.showLinks;
            this.scene.add(dot);
            this.linkVisuals.push(dot);
        });

        const N = pathPoints.length;
        if (N >= 2) {
            const p1 = pathPoints[N - 2];
            const p2 = pathPoints[N - 1];
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

            const textObj = this._createTextSprite();
            this._updateTextCanvas(textObj, [`Vol: ${volume}`]);
            textObj.sprite.position.copy(mid);
            textObj.sprite.position.y += 0.5;
            textObj.sprite.visible = this.showText;
            this.scene.add(textObj.sprite);
            this.linkVisuals.push(textObj.sprite);
        }

        this.links.set(id, { curve });
    }

    spawnLinkItem(linkId, product, isFail, delayOffset = 0) {
        const link = this.links.get(linkId);
        if (!link || !link.curve) return;

        const container = new THREE.Group();

        let assetName = product ? product.assetName : null;

        if (assetName) {
            const mesh = this.loader.get(assetName);
            this.applyMasterTransform(assetName, mesh);
            this.assetInstances.push({ name: assetName, mesh: mesh });

            if (isFail) {
                mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material = child.material.clone();
                        child.material.color.setHex(0xff0000);
                    }
                });
            } else if (product && product.color) {
                mesh.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material = child.material.clone();
                        child.material.color.set(product.color);
                    }
                });
            }
            container.add(mesh);
        } else {
            const fallbackMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.2),
                new THREE.MeshBasicMaterial({ color: isFail ? 0xff0000 : 0xff00ff })
            );
            container.add(fallbackMesh);
        }

        if (product) {
            const scale = product.assetScale || 1;
            container.scale.set(scale, scale, scale);
        }

        container.visible = delayOffset <= 0;
        this.scene.add(container);

        this.movingItems.push({ mesh: container, curve: link.curve, t: -delayOffset, speed: 0.015 });
    }

    update() {
        for (let i = this.movingItems.length - 1; i >= 0; i--) {
            const item = this.movingItems[i];
            item.t += item.speed;

            if (item.t >= 1) {
                this.scene.remove(item.mesh);
                this.movingItems.splice(i, 1);
            } else if (item.t >= 0) {
                item.mesh.visible = true;
                const pos = item.curve.getPoint(item.t);
                item.mesh.position.copy(pos);

                const nextPos = item.curve.getPoint(Math.min(item.t + 0.01, 1));
                item.mesh.lookAt(nextPos);
            }
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    _createTextSprite(isLarge = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = isLarge ? 256 : 128;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2.5, isLarge ? 2.5 : 1.25, 1);
        sprite.renderOrder = 999;
        return { sprite, canvas, ctx, texture };
    }

    _updateTextCanvas(textObj, lines) {
        const { canvas, ctx, texture } = textObj;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.font = "bold 16px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const lineHeight = 20;
        const startY = (canvas.height - (lines.length * lineHeight)) / 2 + (lineHeight / 2);

        lines.forEach((line, i) => {
            const y = startY + i * lineHeight;
            ctx.strokeText(line, canvas.width / 2, y);
            ctx.fillText(line, canvas.width / 2, y);
        });

        texture.needsUpdate = true;
    }

    _updateSourceCanvas(textObj, lines, prodRatio, repairRatio, isBroken) {
        const { canvas, ctx, texture } = textObj;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.font = "bold 14px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const lineHeight = 18;
        const barHeight = 8;
        const gapTextBar = 8;
        const barGapY = 4;

        let totalHeight = (lines.length * lineHeight) + gapTextBar + (barHeight * 2) + barGapY;

        const hasValidIcon = isBroken && this.breakIcon.complete && this.breakIcon.naturalWidth > 0;
        const iconSize = 40;
        const iconGap = 10;

        if (hasValidIcon) {
            totalHeight += iconSize + iconGap;
        }

        let currentY = (canvas.height - totalHeight) / 2;

        if (hasValidIcon) {
            ctx.drawImage(
                this.breakIcon,
                (canvas.width / 2) - (iconSize / 2),
                currentY,
                iconSize,
                iconSize
            );
            currentY += iconSize + iconGap;
        } else if (isBroken) {
            const textY = currentY + (lineHeight / 2);
            ctx.fillStyle = "#ff5555";
            ctx.strokeText("[PANNE]", canvas.width / 2, textY);
            ctx.fillText("[PANNE]", canvas.width / 2, textY);
            ctx.fillStyle = "white";
            currentY += lineHeight;
        }

        lines.forEach((line) => {
            const textY = currentY + (lineHeight / 2);
            ctx.strokeText(line, canvas.width / 2, textY);
            ctx.fillText(line, canvas.width / 2, textY);
            currentY += lineHeight;
        });

        currentY += gapTextBar;

        const barWidth = 100;
        const startX = (canvas.width - barWidth) / 2;

        ctx.fillStyle = "rgba(34, 85, 34, 0.8)";
        ctx.fillRect(startX, currentY, barWidth, barHeight);
        if (prodRatio > 0) {
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(startX, currentY, barWidth * prodRatio, barHeight);
        }

        currentY += barHeight + barGapY;

        ctx.fillStyle = "rgba(85, 34, 34, 0.8)";
        ctx.fillRect(startX, currentY, barWidth, barHeight);
        if (repairRatio > 0) {
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(startX, currentY, barWidth * repairRatio, barHeight);
        }

        texture.needsUpdate = true;
    }
}