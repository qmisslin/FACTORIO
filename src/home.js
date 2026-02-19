export class HomeManager {
    constructor(callbacks) {
        this.callbacks = callbacks; // { onNew, onSave, onLoad }
        this.init();
    }

    init() {
        // 1. Generate the Full DOM Structure for Home Window
        this.renderHomeWindowLayout();

        // 2. Bind Events
        this.bindEvents();
    }

    renderHomeWindowLayout() {
        const win = document.getElementById('window-home');
        if (!win) return;

        // Clear existing content to apply new layout
        win.innerHTML = '';

        // --- Hero Image Section (Top) ---
        const heroDiv = document.createElement('div');
        heroDiv.className = 'home-hero';
        const heroImg = document.createElement('img');
        heroImg.id = 'home-hero-img';
        heroImg.src = './samples/splashscreen.jpg';
        heroImg.alt = 'Template Preview';
        heroDiv.appendChild(heroImg);
        win.appendChild(heroDiv);

        // --- Content Wrapper ---
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'home-content-wrapper';

        // --- Two Column Layout ---
        const grid = document.createElement('div');
        grid.className = 'home-layout';

        // === LEFT COLUMN ===
        const colLeft = document.createElement('div');
        colLeft.className = 'home-col';

        // Section 1: Choose Template
        const secTemplate = document.createElement('div');
        secTemplate.innerHTML = `
            <span class="section-title">Choose a Template</span>
            <select id="template-select">
                <option value="" selected>Select a template...</option>
                <option value="factor10_empty">Empty Project</option>
                <option value="factor10_simple_line">Simple Line</option>
            </select>
            <button id="btn-load-template" class="action-btn full-width">Load Template</button>
        `;
        colLeft.appendChild(secTemplate);

        // Section 2: Load Own
        const secLoad = document.createElement('div');
        secLoad.className = 'group-separator';
        secLoad.innerHTML = `
            <span class="section-title">Load your own project</span>
            <label for="input-load-scene" class="file-upload-btn">
                Click to upload JSON file
            </label>
            <input type="file" id="input-load-scene" accept=".json">
        `;
        colLeft.appendChild(secLoad);

        // === RIGHT COLUMN ===
        const colRight = document.createElement('div');
        colRight.className = 'home-col';

        // Section 3: Save
        const secSave = document.createElement('div');
        secSave.innerHTML = `
            <span class="section-title">Save Project</span>
            <div class="section">
                <label>Project Name</label>
                <input type="text" id="input-project-name" placeholder="My Factory">
            </div>
            <div class="section">
                <label>Author</label>
                <input type="text" id="input-author" placeholder="Your Name">
            </div>
            <div class="row">
                <button id="btn-new-scene" class="action-btn" style="flex:1; background:#444;">New</button>
                <button id="btn-save-scene" class="action-btn" style="flex:2;">Save JSON</button>
            </div>
        `;
        colRight.appendChild(secSave);

        // Section 4: About
        const secAbout = document.createElement('div');
        secAbout.className = 'group-separator';
        secAbout.innerHTML = `
            <span class="section-title">About</span>
            <p style="font-size: 0.85em; line-height: 1.5; color: #aaa; margin-bottom: 10px;">
                Factor10 is a web-based 3D simulation tool to model and optimize factory lines.
            </p>
            <div style="font-size: 0.8em; color: #666;">
                <div>Author: Quentin Misslin</div>
                <div>License: MIT (Open Source)</div>
                <div>&copy; 2026 Factor10 v1.0.0</div>
            </div>
        `;
        colRight.appendChild(secAbout);

        grid.appendChild(colLeft);
        grid.appendChild(colRight);
        contentWrapper.appendChild(grid);
        win.appendChild(contentWrapper);
    }

    bindEvents() {
        // --- Template Preview Logic ---
        const select = document.getElementById('template-select');
        const heroImg = document.getElementById('home-hero-img');
        const loadTemplateBtn = document.getElementById('btn-load-template');

        select.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                // Try to load specific preview
                heroImg.src = `./samples/${val}.jpg`;
            } else {
                // Default splash
                heroImg.src = './samples/splashscreen.jpg';
            }
        });

        heroImg.addEventListener('error', () => {
            // Fallback if specific jpg doesn't exist
            if (heroImg.src.indexOf('splashscreen.jpg') === -1) {
                heroImg.src = './samples/splashscreen.jpg';
            }
        });

        // --- Load Template Button ---
        loadTemplateBtn.addEventListener('click', () => {
            const val = select.value;
            if (!val) {
                // Empty project logic
                if (confirm('Start a new empty project?')) {
                    this.callbacks.onNew();
                    document.getElementById('input-project-name').value = "";
                }
                return;
            }

            // Fetch remote JSON
            const url = `./samples/${val}.json`;
            console.log(`Fetching template: ${url}`);

            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error("Template file not found");
                    return response.json();
                })
                .then(json => {
                    this.applyLoadedData(json);
                })
                .catch(err => {
                    console.error(err);
                    alert(`Could not load template: ${val}`);
                });
        });

        // --- Inputs ---
        const authorInput = document.getElementById('input-author');
        const projectInput = document.getElementById('input-project-name');

        // New Button (Reset)
        document.getElementById('btn-new-scene').addEventListener('click', () => {
            if (confirm('Discard current changes and start new project?')) {
                this.callbacks.onNew();
                projectInput.value = "";
            }
        });

        // Save Button
        document.getElementById('btn-save-scene').addEventListener('click', () => {
            const appState = this.callbacks.onSave();

            const saveFile = {
                meta: {
                    name: projectInput.value || "Untitled Project",
                    version: "1.0.0",
                    author: authorInput.value || "Anonymous",
                    createdAt: new Date().toISOString()
                },
                settings: {
                    tickDelay: appState.settings.tickDelay,
                    showGrid: true,
                    showLinks: true
                },
                assets: appState.assets,
                code: appState.code
            };

            const blob = new Blob([JSON.stringify(saveFile, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = (saveFile.meta.name).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `factor10_${filename}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // Load File Input
        document.getElementById('input-load-scene').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            this.readFile(file);
            e.target.value = '';
        });
    }

    readFile(fileBlob) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const json = JSON.parse(evt.target.result);
                this.applyLoadedData(json);
            } catch (err) {
                console.error(err);
                alert('Error: Invalid JSON File');
            }
        };
        reader.readAsText(fileBlob);
    }

    applyLoadedData(json) {
        const authorInput = document.getElementById('input-author');
        const projectInput = document.getElementById('input-project-name');

        if (json.meta) {
            if (json.meta.author) authorInput.value = json.meta.author;
            if (json.meta.name) projectInput.value = json.meta.name;
        }
        this.callbacks.onLoad(json);
    }
}