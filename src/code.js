export class CodeManager {
    constructor(loader, onCodeChange) {
        this.loader = loader;
        this.onCodeChange = onCodeChange;
        this.editor = null;
        this.container = document.getElementById('code-container');

        this.init();
    }

    init() {
        // 1. Configurer la mise en page (Toolbar + Editor container)
        this.renderLayout();

        // 2. Initialiser Monaco Editor
        this.initMonaco();

        // 3. Bind Events (Toolbar)
        this.bindEvents();
    }

    renderLayout() {
        // Vider le conteneur actuel
        this.container.innerHTML = '';

        // Création de la Toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'code-toolbar';

        // Select Asset
        const select = document.createElement('select');
        select.id = 'code-asset-select';
        const defaultOpt = document.createElement('option');
        defaultOpt.text = "Select asset...";
        defaultOpt.value = "";
        select.appendChild(defaultOpt);
        toolbar.appendChild(select);

        // Button Add
        const btnAdd = document.createElement('button');
        btnAdd.id = 'btn-add-to-script';
        btnAdd.textContent = 'Add to script';
        btnAdd.className = 'action-btn';
        toolbar.appendChild(btnAdd);

        this.container.appendChild(toolbar);

        // Création du conteneur pour l'éditeur (Flex grow)
        const editorDiv = document.createElement('div');
        editorDiv.id = 'monaco-editor-root';
        editorDiv.style.width = '100%';
        editorDiv.style.flexGrow = '1';
        this.container.appendChild(editorDiv);
    }

    initMonaco() {
        // Configuration du chemin pour Monaco (basé sur le CDN dans index.html)
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(document.getElementById('monaco-editor-root'), {
                value: "// Loading...",
                language: 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false
            });

            // Écouter les changements pour mettre à jour l'app
            this.editor.onDidChangeModelContent(() => {
                const code = this.editor.getValue();
                if (this.onCodeChange) {
                    this.onCodeChange(code);
                }
            });

            // Rafraichir la liste des assets une fois l'éditeur prêt
            this.refreshAssetList();
        });
    }

    bindEvents() {
        const btnAdd = document.getElementById('btn-add-to-script');
        const select = document.getElementById('code-asset-select');

        // Refresh list on focus/click to ensure newly imported assets are there
        select.addEventListener('focus', () => this.refreshAssetList());

        btnAdd.addEventListener('click', () => {
            const assetName = select.value;
            if (!assetName || !this.editor) return;

            // Insérer le texte à la position du curseur
            const selection = this.editor.getSelection();
            const id = { major: 1, minor: 1 };
            const text = `'${assetName}'`;

            const op = {
                identifier: id,
                range: selection,
                text: text,
                forceMoveMarkers: true
            };

            this.editor.executeEdits("my-source", [op]);
            this.editor.focus();
        });
    }

    refreshAssetList() {
        const select = document.getElementById('code-asset-select');
        const currentVal = select.value;

        // Garder l'option par défaut
        select.innerHTML = '<option value="">Select asset...</option>';

        const names = this.loader.getAssetNames();
        names.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });

        select.value = currentVal;
    }

    setValue(code) {
        if (this.editor) {
            this.editor.setValue(code);
        } else {
            // Si l'éditeur n'est pas encore prêt, on attend un peu (solution simple)
            // Dans une app complexe on utiliserait une Promise
            setTimeout(() => {
                if (this.editor) this.editor.setValue(code);
            }, 500);
        }
    }
}