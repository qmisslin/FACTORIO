import { Loader } from './loader.js';
import { HomeManager } from './home.js';
import { AssetsManager } from './assets.js';
import { CodeManager } from './code.js';
import { Viewport } from './viewport.js';
import { Simulator } from './simulator.js';
import { ResultManager } from './result.js';

class App {
    constructor() {
        this.loader = new Loader();
        this.tickDelay = 500;
        this.isRunning = false;
        this.lastTickTime = 0;

        this.currentCode = `// Factor10 Simulation Script
var product = createProduct();
product.setName('Simple Cube');
product.setPrice(10);
product.addAsset('pyramid', 0, 0, 0, 1);

var stock = createSink();
stock.setName('Stock');
stock.setProduct(product);
stock.setCapacity(100);
stock.addAsset('cube', 0, 0, 0, 0.5);
stock.setX(5);
stock.setY(0);

var machine = createSource();
machine.setName('Machine');
machine.setProduct(product);
machine.setDuration(5);
machine.addAsset('cube', 0, 0, 0, 0.5);
machine.setX(-5);
machine.setY(0);

var link = createLink();
link.setFrom(machine);
link.setTo(stock);
link.setVolume(1);
link.addPosition(0, 2); 
`;
        this.init();
    }

    async init() {
        await this.loader.init();

        this.viewport = new Viewport('viewport', this.loader);
        this.simulator = new Simulator(this.viewport);

        this.assetsManager = new AssetsManager(this.loader, (assetName) => {
            this.viewport.updateAssetTransforms(assetName);
        });

        this.codeManager = new CodeManager(this.loader, (newCode) => {
            this.currentCode = newCode;
        });

        this.resultManager = new ResultManager('graphs-container', 'btn-export-csv');

        this.homeManager = new HomeManager({
            onNew: () => this.reset(),
            onSave: () => this.getState(),
            onLoad: (json) => this.loadState(json)
        });

        this.assetsManager.refreshList();
        this.codeManager.setValue(this.currentCode);
        this.codeManager.refreshAssetList();

        this.bindDock();

        // Lancement initial
        this.reset();
        this.animate();
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));

        if (this.isRunning) {
            if (!this.lastTickTime) this.lastTickTime = time;
            if (time - this.lastTickTime >= this.tickDelay) {
                this.simulator.tick();
                this.lastTickTime = time;
                this.updateResults();
            }
        }

        this.viewport.update();
    }

    bindDock() {
        document.querySelectorAll('.dock-btn[data-target]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.dock-btn[data-target]').forEach(b => {
                    if (b !== btn.closest('.dock-btn')) b.classList.remove('active');
                });

                const targetId = btn.closest('.dock-btn').dataset.target;
                const win = document.getElementById(targetId);
                const wasHidden = win.classList.contains('hidden');

                document.querySelectorAll('.floating-window').forEach(w => w.classList.add('hidden'));

                if (wasHidden) {
                    win.classList.remove('hidden');
                    btn.closest('.dock-btn').classList.add('active');

                    if (targetId === 'window-assets' && this.assetsManager.currentAssetName) {
                        this.assetsManager.loadAssetToPreview(this.assetsManager.currentAssetName);
                    }
                    if (targetId === 'window-code') {
                        this.codeManager.refreshAssetList();
                    }
                } else {
                    btn.closest('.dock-btn').classList.remove('active');
                }
            });
        });

        const tickDisplay = document.getElementById('tick-display');
        document.getElementById('tick-up').addEventListener('click', () => {
            if (this.tickDelay < 2000) this.tickDelay += 100;
            tickDisplay.textContent = this.tickDelay + "ms";
        });
        document.getElementById('tick-down').addEventListener('click', () => {
            if (this.tickDelay > 100) this.tickDelay -= 100;
            tickDisplay.textContent = this.tickDelay + "ms";
        });

        document.getElementById('sim-play').addEventListener('click', () => {
            this.isRunning = true;
            this.lastTickTime = 0;
        });
        document.getElementById('sim-pause').addEventListener('click', () => {
            this.isRunning = false;
        });
        document.getElementById('sim-reset').addEventListener('click', () => this.reset());

        document.getElementById('toggle-grid').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('active');
            this.viewport.toggleGrid(btn.classList.contains('active'));
        });
        document.getElementById('toggle-links').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('active');
            this.viewport.toggleLinks(btn.classList.contains('active'));
        });
        document.getElementById('toggle-text').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('active');
            this.viewport.toggleText(btn.classList.contains('active'));
        });
    }

    reset() {
        this.isRunning = false;

        // 1. On compile le code (ce qui initialise le Simulator à Tick 0)
        this.simulator.runCode(this.currentCode);

        // 2. On vide l'ancien historique et le DOM des graphiques
        this.resultManager.reset();

        // 3. NOUVEAU: On met à jour les résultats immédiatement. 
        // Cela va lire le Tick 0, créer les éléments HTML des graphiques, et dessiner la grille d'arrière-plan.
        this.updateResults();
    }

    updateResults() {
        this.resultManager.update(this.simulator.getResults());
    }

    getState() {
        const assetsList = [];
        const names = this.loader.getAssetNames();

        names.forEach(name => {
            const t = this.loader.getTransform(name);
            const src = this.loader.getAssetSource(name);

            assetsList.push({
                name: name,
                src: src || undefined,
                transform: {
                    position: t.pos,
                    rotation: t.rot,
                    scale: t.scl
                }
            });
        });

        return {
            settings: { tickDelay: this.tickDelay },
            code: this.currentCode,
            assets: assetsList
        };
    }

    async loadState(json) {
        if (json.settings) {
            this.tickDelay = json.settings.tickDelay || 500;
            document.getElementById('tick-display').textContent = this.tickDelay + "ms";
        }

        if (json.code) {
            this.currentCode = json.code;
            this.codeManager.setValue(this.currentCode);
        }

        if (json.assets && Array.isArray(json.assets)) {
            const loadingPromises = json.assets.map(assetData => {
                if (assetData.src) {
                    return this.loader.load(assetData.name, assetData.src)
                        .then(() => {
                            this.loader.registerAssetSource(assetData.name, assetData.src);
                        })
                        .catch(err => console.error(`Failed to load embedded asset ${assetData.name}`, err));
                }
                return Promise.resolve();
            });

            await Promise.all(loadingPromises);
            this.assetsManager.refreshList();
            this.codeManager.refreshAssetList();

            json.assets.forEach(assetData => {
                const internalTransform = {
                    pos: assetData.transform.position || { x: 0, y: 0, z: 0 },
                    rot: assetData.transform.rotation || { x: 0, y: 0, z: 0 },
                    scl: assetData.transform.scale || { x: 1, y: 1, z: 1 }
                };
                this.loader.setTransform(assetData.name, internalTransform);
            });
        }

        // On reset à la fin du chargement, ce qui va aussi dessiner les graphiques
        this.reset();
    }
}

window.app = new App();