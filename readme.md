# FACTOR10

FACTOR10 is a 3D production flow simulation tool built with Three.js.

It allows you to model factories using Sources, Sinks, Products and Links,
and visualize production, failures, losses and profit in real time.

---

## 🌐 Live Demo

👉 https://qmisslin.github.io/FACTORIO/

---

## 🚀 Features

- 3D factory visualization
- Custom asset import (GLB)
- Production simulation with ticks
- Machine failure & breakdown management
- Visual links with animated flow
- Real-time production statistics
- CSV export of simulation results
- Scene persistence via JSON

---

## 🏗 Project Structure

```

.
├── assets/
├── samples/
├── src/
│   ├── app.js
│   ├── simulator.js
│   ├── viewport.js
│   ├── ...
├── index.html
└── specs.md

````

---

## 🛠 Development

To run locally:

```bash
python -m http.server 8000
````

Then open:

```
http://localhost:8000
```

---

## 📦 Deployment

This project is automatically deployed via **GitHub Pages**
from the `main` branch.

---

## 👤 Author

Quentin Misslin
