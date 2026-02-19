class Product {
    constructor(id) {
        this.id = id;
        this.name = 'Unknown Product';
        this.price = 0;
        this.color = null;
        this.assetName = 'pyramid';
        this.assetScale = 1;
    }
    setName(n) { this.name = n; }
    setPrice(p) { this.price = p; }
    setColor(c) { this.color = c; }

    addAsset(name, x, z, rot, scale = 1) {
        this.assetName = name;
        this.assetScale = scale;
    }
}

class SimEntity {
    constructor(id, viewport) {
        this.id = id;
        this.viewport = viewport;
        this.name = 'Entity';
        this.pos = { x: 0, z: 0 };

        this.outputLinks = [];
        this.inputLinks = [];

        this.viewport.createNode(this.id, 0, 0);
    }

    setName(n) { this.name = n; }

    setX(v) {
        this.pos.x = v;
        this.viewport.updateNodePos(this.id, this.pos.x, this.pos.z);
    }

    setY(v) {
        this.pos.z = v;
        this.viewport.updateNodePos(this.id, this.pos.x, this.pos.z);
    }

    addAsset(name, x, z, rot, scale = 1) {
        const rotRad = (rot || 0) * Math.PI / 180;
        this.viewport.addAssetToNode(this.id, name, x, z, rotRad, scale);
    }

    finalize() { }
    tick() { }
}

class Sink extends SimEntity {
    constructor(id, viewport) {
        super(id, viewport);
        this.capacity = 1000;
        this.currentStock = 0;
        this.loss = 0;
        this.fail = 0;
        this.inCount = 0;
        this.outCount = 0;
        this.product = null;
    }

    setCapacity(c) { this.capacity = c; }
    setProduct(p) { this.product = p; }

    finalize() {
        this.viewport.setupSinkVisuals(this.id, this.product ? this.product.name : "None");
        this._updateVis();
    }

    receive(product, isFail = false) {
        if (!this.product) return;

        if (product.name !== this.product.name) {
            console.warn(`Sink [${this.name}] rejected product ${product.name}. Expected ${this.product.name}.`);
            return;
        }

        this.inCount++;

        if (isFail) {
            this.fail++;
        } else if (this.capacity === 0) {
            this.currentStock++;
        } else if (this.currentStock < this.capacity) {
            this.currentStock++;
        } else {
            this.loss++;
        }
        this._updateVis();
    }

    tick() {
        this._updateVis();
    }

    _updateVis() {
        this.viewport.updateSinkVisuals(
            this.id,
            this.product ? this.product.name : "None",
            this.currentStock,
            this.capacity,
            this.fail,
            this.loss
        );
    }
}

class Source extends SimEntity {
    constructor(id, viewport) {
        super(id, viewport);
        this.product = null;
        this.duration = 10;
        this.currentTick = 0;
        this.isProcessing = false;

        this.failFreq = 0;
        this.breakFreq = 0;
        this.breakDuration = 0;
        this.isBroken = false;
        this.breakTimer = 0;

        // 0: broken, 1: repairing, 2: waiting, 3: processing
        this.state = 2;
    }

    setProduct(p) { this.product = p; }
    setDuration(d) { this.duration = d; }
    setFailFrequence(f) { this.failFreq = f; }
    setBreakFrequence(f) { this.breakFreq = f; }
    setBreakDuration(d) { this.breakDuration = d; }

    finalize() {
        this.viewport.setupSourceVisuals(this.id, this.product ? this.product.name : "None", this.duration);
        this._updateVis();
    }

    tick() {
        if (!this.product) {
            this.state = 2; // waiting
            return;
        }

        if (this.isBroken) {
            this.breakTimer--;
            this.state = 1; // repairing
            if (this.breakTimer <= 0) {
                this.isBroken = false;
            }
            this._updateVis();
            return;
        }

        if (!this.isProcessing && Math.random() < this.breakFreq) {
            this.isBroken = true;
            this.breakTimer = this.breakDuration;
            this.state = 0; // newly broken
            this._updateVis();
            return;
        }

        if (!this.isProcessing) {
            let canStart = true;

            for (let link of this.inputLinks) {
                if (!link.from || !(link.from instanceof Sink) || link.from.currentStock < link.volume) {
                    canStart = false;
                    break;
                }
            }

            if (canStart) {
                for (let link of this.inputLinks) {
                    const sink = link.from;
                    sink.currentStock -= link.volume;
                    sink.outCount += link.volume;
                    sink._updateVis();

                    for (let i = 0; i < link.volume; i++) {
                        link.transport(sink.product, false, true, i * 0.15);
                    }
                }

                this.isProcessing = true;
                this.currentTick = 1;
                this.state = 3; // processing
            } else {
                this.state = 2; // waiting
            }
        } else {
            this.currentTick++;
            this.state = 3; // processing
        }

        if (this.isProcessing && this.currentTick >= this.duration) {
            this.isProcessing = false;
            const isFail = Math.random() < this.failFreq;

            for (let link of this.outputLinks) {
                for (let i = 0; i < link.volume; i++) {
                    link.transport(this.product, isFail, false, i * 0.15);
                }
            }

            this.currentTick = this.duration;
        }

        this._updateVis();
    }

    _updateVis() {
        const prodRatio = this.duration > 0 ? Math.min(1, this.currentTick / this.duration) : 0;
        const repairRatio = this.isBroken && this.breakDuration > 0 ? 1 - (this.breakTimer / this.breakDuration) : 0;

        this.viewport.updateSourceVisuals(
            this.id,
            this.product ? this.product.name : "None",
            this.duration,
            prodRatio,
            repairRatio,
            this.isBroken
        );
    }
}

class Link {
    constructor(id, viewport) {
        this.id = id;
        this.viewport = viewport;
        this.from = null;
        this.to = null;
        this.volume = 1;
        this.points = [];
    }

    setFrom(el) {
        this.from = el;
        el.outputLinks.push(this);
    }

    setTo(el) {
        this.to = el;
        el.inputLinks.push(this);
    }

    setVolume(v) { this.volume = v; }

    addPosition(x, z, factor) {
        this.points.push({ x, y: 1.4, z });
    }

    finalize() {
        if (!this.from || !this.to) return;
        const start = { x: this.from.pos.x, y: 1.4, z: this.from.pos.z };
        const end = { x: this.to.pos.x, y: 1.4, z: this.to.pos.z };
        const pathPoints = [start, ...this.points, end];

        this.viewport.createLinkVisuals(this.id, pathPoints, this.volume);
    }

    transport(product, isFail, isPull = false, delayOffset = 0) {
        if (!isPull && this.to && this.to instanceof Sink) {
            this.to.receive(product, isFail);
        }
        this.viewport.spawnLinkItem(this.id, product, isFail, delayOffset);
    }
}

export class Simulator {
    constructor(viewport) {
        this.viewport = viewport;
        this.entities = [];
        this.links = [];
        this.products = [];
        this.tickCount = 0;
    }

    reset() {
        this.entities = [];
        this.links = [];
        this.products = [];
        this.tickCount = 0;
        this.viewport.clear();
    }

    runCode(code) {
        this.reset();
        console.log("Compiling user code...");

        const context = {
            createProduct: () => {
                const p = new Product(this.products.length);
                this.products.push(p);
                return p;
            },
            createSource: () => {
                const s = new Source(this.entities.length, this.viewport);
                this.entities.push(s);
                return s;
            },
            createSink: () => {
                const s = new Sink(this.entities.length, this.viewport);
                this.entities.push(s);
                return s;
            },
            createLink: () => {
                const l = new Link(this.links.length, this.viewport);
                this.links.push(l);
                return l;
            },
            createVisual: () => {
                const v = new SimEntity(this.entities.length, this.viewport);
                this.entities.push(v);
                return v;
            },
            log: (msg) => console.log("[User Script]", msg)
        };

        try {
            const userFunction = new Function('ctx', `
                with(ctx) {
                    ${code}
                }
            `);
            userFunction(context);

            this.entities.forEach(e => e.finalize());
            this.links.forEach(l => l.finalize());

            console.log(`Stats: ${this.entities.length} entities, ${this.links.length} links.`);
        } catch (e) {
            console.error("Error in user code:", e);
            alert("Error in your script: " + e.message);
        }
    }

    tick() {
        this.tickCount++;
        this.entities.forEach(e => e.tick());
    }

    getResults() {
        return {
            tick: this.tickCount,
            sources: this.entities.filter(e => e instanceof Source).map(s => ({
                id: s.id,
                name: s.name,
                state: s.state
            })),
            sinks: this.entities.filter(e => e instanceof Sink).map(s => {
                const price = s.product ? s.product.price : 0;
                return {
                    id: s.id,
                    name: s.name,
                    elements: s.inCount - s.outCount,
                    fail: s.fail,
                    loss: s.loss,
                    profit: (s.inCount - s.outCount - (2*s.fail) - (2*s.loss)) * price
                };
            })
        };
    }
}