export class ResultManager {
    constructor(containerId, btnCsvId) {
        this.container = document.getElementById(containerId);
        this.btnCsv = document.getElementById(btnCsvId);
        this.history = [];
        this.graphs = new Map();

        this.btnCsv.addEventListener('click', () => this.exportCSV());
    }

    reset() {
        this.history = [];
        this.container.innerHTML = '';
        this.graphs.clear();
    }

    update(data) {
        this.history.push(data);

        if (this.graphs.size === 0) {
            this.initGraphs(data);
        }

        this.graphs.forEach(graph => graph.render(this.history));
    }

    initGraphs(data) {
        data.sources.forEach(s => {
            const g = new SourceGraph(s.name);
            this.container.appendChild(g.getElement());
            this.graphs.set(`source_${s.id}`, g);
        });

        data.sinks.forEach(s => {
            const g = new SinkGraph(s.name);
            this.container.appendChild(g.getElement());
            this.graphs.set(`sink_${s.id}`, g);

            const gp = new SinkProfitGraph(s.name);
            this.container.appendChild(gp.getElement());
            this.graphs.set(`sink_profit_${s.id}`, gp);
        });
    }

    exportCSV() {
        if (this.history.length === 0) return;

        const first = this.history[0];
        let headers = ['Tick'];

        first.sources.forEach(s => headers.push(`"${s.name} State"`));
        first.sinks.forEach(s => {
            headers.push(`"${s.name} Success"`, `"${s.name} Fail"`, `"${s.name} Loss"`, `"${s.name} Profit"`);
        });

        let csv = headers.join(',') + '\n';

        this.history.forEach(row => {
            let line = [row.tick];
            row.sources.forEach(s => line.push(s.state));
            row.sinks.forEach(s => {
                line.push(s.elements, s.fail, s.loss, s.profit);
            });
            csv += line.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factor10_results_${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// --- CLASSES DE DESSIN ---

class SourceGraph {
    constructor(name) {
        this.sourceName = name;
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'graph-card';

        this.wrapper.innerHTML = `
            <div class="graph-header">
                <span class="graph-title">${name} (Source)</span>
                <div class="graph-legend">
                    <div class="legend-item"><div class="legend-color" style="background:#ff5555"></div>Breakdown</div>
                    <div class="legend-item"><div class="legend-color" style="background:#ffaa00"></div>Repairing</div>
                    <div class="legend-item"><div class="legend-color" style="background:#888888"></div>Waiting</div>
                    <div class="legend-item"><div class="legend-color" style="background:#55ff55"></div>Processing</div>
                </div>
            </div>
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'graph-canvas';
        this.canvas.height = 100;
        this.ctx = this.canvas.getContext('2d');
        this.wrapper.appendChild(this.canvas);
    }

    getElement() { return this.wrapper; }

    render(history) {
        const w = this.canvas.parentElement.clientWidth - 20;
        const h = this.canvas.height;
        this.canvas.width = w;

        this.ctx.clearRect(0, 0, w, h);

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
            const y = h - (i * (h / 3));
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }

        if (history.length === 0) return;

        const maxPoints = 50;
        const visibleHistory = history.slice(-maxPoints);

        const colors = ['#ff5555', '#ffaa00', '#888888', '#55ff55'];

        this.ctx.lineWidth = 2;

        let lastY = 0;
        let lastState = -1;

        visibleHistory.forEach((tickData, i) => {
            const data = tickData.sources.find(s => s.name === this.sourceName);

            if (data) {
                const x = (i / (maxPoints - 1)) * w;
                const y = h - (data.state * (h / 3));

                if (i === 0) {
                    lastY = y;
                    lastState = data.state;
                } else {
                    const prevX = ((i - 1) / (maxPoints - 1)) * w;

                    this.ctx.beginPath();
                    this.ctx.strokeStyle = colors[lastState];
                    this.ctx.moveTo(prevX, lastY);
                    this.ctx.lineTo(x, lastY);
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.strokeStyle = colors[data.state];
                    this.ctx.moveTo(x, lastY);
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();

                    lastY = y;
                    lastState = data.state;
                }
            }
        });
    }
}

class SinkGraph {
    constructor(name) {
        this.sinkName = name;
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'graph-card';

        // Ajout des balises span avec des classes pour cibler les valeurs
        this.wrapper.innerHTML = `
            <div class="graph-header">
                <span class="graph-title">${name} (Sink Items)</span>
                <div class="graph-legend">
                    <div class="legend-item"><div class="legend-color" style="background:#4772b3"></div>Success: <span class="val-elements" style="font-weight:bold; color:#fff;">0</span></div>
                    <div class="legend-item"><div class="legend-color" style="background:#ff5555"></div>Fail: <span class="val-fail" style="font-weight:bold; color:#fff;">0</span></div>
                    <div class="legend-item"><div class="legend-color" style="background:#ffaa00"></div>Loss: <span class="val-loss" style="font-weight:bold; color:#fff;">0</span></div>
                </div>
            </div>
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'graph-canvas';
        this.canvas.height = 120;
        this.ctx = this.canvas.getContext('2d');
        this.wrapper.appendChild(this.canvas);
    }

    getElement() { return this.wrapper; }

    render(history) {
        const w = this.canvas.parentElement.clientWidth - 20;
        const h = this.canvas.height;
        this.canvas.width = w;

        this.ctx.clearRect(0, 0, w, h);

        if (history.length === 0) return;

        // Mise à jour des valeurs de la légende
        const lastTickData = history[history.length - 1];
        const currentData = lastTickData.sinks.find(s => s.name === this.sinkName);
        if (currentData) {
            this.wrapper.querySelector('.val-elements').textContent = currentData.elements;
            this.wrapper.querySelector('.val-fail').textContent = currentData.fail;
            this.wrapper.querySelector('.val-loss').textContent = currentData.loss;
        }

        const maxPoints = 50;
        const visibleHistory = history.slice(-maxPoints);

        let maxVal = 10;
        visibleHistory.forEach(tick => {
            const data = tick.sinks.find(s => s.name === this.sinkName);
            if (data) {
                maxVal = Math.max(maxVal, data.elements, data.fail, data.loss);
            }
        });

        const drawLine = (key, color) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            visibleHistory.forEach((tick, i) => {
                const data = tick.sinks.find(s => s.name === this.sinkName);
                if (data) {
                    const x = (i / (maxPoints - 1)) * w;
                    const y = h - (data[key] / maxVal) * h;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
            });
            this.ctx.stroke();
        };

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, h / 2); this.ctx.lineTo(w, h / 2);
        this.ctx.stroke();

        drawLine('elements', '#4772b3');
        drawLine('fail', '#ff5555');
        drawLine('loss', '#ffaa00');
    }
}

class SinkProfitGraph {
    constructor(name) {
        this.sinkName = name;
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'graph-card';

        // Ajout de la balise span pour cibler la valeur du profit
        this.wrapper.innerHTML = `
            <div class="graph-header">
                <span class="graph-title">${name} (Sink Profit)</span>
                <div class="graph-legend">
                    <div class="legend-item"><div class="legend-color" style="background:#55ff55"></div>Profit: <span class="val-profit" style="font-weight:bold; color:#fff;">0</span></div>
                </div>
            </div>
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'graph-canvas';
        this.canvas.height = 100;
        this.ctx = this.canvas.getContext('2d');
        this.wrapper.appendChild(this.canvas);
    }

    getElement() { return this.wrapper; }

    render(history) {
        const w = this.canvas.parentElement.clientWidth - 20;
        const h = this.canvas.height;
        this.canvas.width = w;

        this.ctx.clearRect(0, 0, w, h);

        if (history.length === 0) return;

        // Mise à jour de la valeur du profit dans la légende
        const lastTickData = history[history.length - 1];
        const currentData = lastTickData.sinks.find(s => s.name === this.sinkName);
        if (currentData) {
            this.wrapper.querySelector('.val-profit').textContent = currentData.profit;
        }

        const maxPoints = 50;
        const visibleHistory = history.slice(-maxPoints);

        let maxVal = 10;
        let minVal = 0;

        visibleHistory.forEach(tick => {
            const data = tick.sinks.find(s => s.name === this.sinkName);
            if (data) {
                maxVal = Math.max(maxVal, data.profit);
                minVal = Math.min(minVal, data.profit);
            }
        });

        const range = (maxVal - minVal) || 1;

        if (minVal < 0) {
            const zeroY = h - ((0 - minVal) / range) * h;
            this.ctx.strokeStyle = '#555';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, zeroY);
            this.ctx.lineTo(w, zeroY);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = '#55ff55';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        visibleHistory.forEach((tick, i) => {
            const data = tick.sinks.find(s => s.name === this.sinkName);
            if (data) {
                const x = (i / (maxPoints - 1)) * w;
                const y = h - ((data.profit - minVal) / range) * h;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
        });
        this.ctx.stroke();
    }
}