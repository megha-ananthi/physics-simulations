# Physics Simulations Lab

Interactive 3D physics simulations demonstrating the **Magnetic**, **Heating**, and **Chemical** effects of electric current. Built for students to explore and learn through hands-on experimentation in their browser.

**Presented by Megha Ananthi B** — Science Teacher (Physics), Sri Krish International School (CBSE)

**Live Site**: [megha-ananthi.github.io/physics-simulations](https://megha-ananthi.github.io/physics-simulations/)

---

## Experiments

| # | Experiment | Effect | Description |
|---|-----------|--------|-------------|
| 1 | **Oersted's Compass** | Magnetic | Drag a compass around a current-carrying wire to see how the needle aligns with circular magnetic field lines |
| 2 | **Iron Nail Electromagnet** | Magnetic | Control voltage and coil turns to pick up paper clips with an electromagnet |
| 3 | **Nichrome Wire Heater** | Heating | Watch a wire glow red-hot with adjustable voltage and a thermal camera toggle |
| 4 | **Lemon Battery** | Chemical | Connect lemons in series to generate enough voltage to light an LED |

## Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript** — no build tools, no frameworks
- **Three.js** (v0.164.1 via CDN) — 3D rendering with WebGL
- **OrbitControls** — click-drag to rotate, scroll to zoom, pinch on mobile
- **Google Fonts** — Fredoka One (headings) + Nunito (body)
- **GitHub Pages** — static hosting, always live

## Project Structure

```
physics-simulations/
├── index.html                    # Hub page with experiment cards
├── css/
│   └── style.css                 # Hub page styles
├── js/
│   └── main.js                   # Particle background + fun facts
├── experiments/
│   ├── oersted.html              # Experiment 1: Oersted's Compass
│   ├── electromagnet.html        # Experiment 2: Iron Nail Electromagnet
│   ├── heating.html              # Experiment 3: Nichrome Wire Heater
│   └── lemon-battery.html        # Experiment 4: Lemon Battery
├── CLAUDE.md                     # AI agent context file
└── README.md                     # This file
```

## Running Locally

No build step required. Just open `index.html` in a browser:

```bash
# Clone the repo
git clone https://github.com/megha-ananthi/physics-simulations.git
cd physics-simulations

# Option 1: Open directly
open index.html

# Option 2: Local server (recommended for module imports)
python3 -m http.server 8000
# Then visit http://localhost:8000
```

> A local HTTP server is recommended because Three.js uses ES module imports which require CORS headers.

## Adding New Experiments

1. Create a new file in `experiments/` (e.g. `experiments/new-experiment.html`)
2. Follow the existing pattern: Three.js scene + UI overlay + controls
3. Add a card linking to it in `index.html`
4. See `CLAUDE.md` for detailed architecture and conventions

## Design Principles

- **Child-friendly**: Large touch targets (48px+), bright colors, playful fonts
- **Mobile-first**: Responsive layout, touch-friendly 3D controls
- **No external assets**: All 3D objects built programmatically with Three.js geometries
- **Accessible**: Respects `prefers-reduced-motion`, semantic HTML, keyboard navigable cards
- **Static-only**: No backend, no build tools, deploys anywhere

## Browser Support

Requires a modern browser with WebGL and ES Module support:
- Chrome 89+
- Firefox 89+
- Safari 15+
- Edge 89+

## License

This project is for educational purposes at Sri Krish International School (CBSE).
