# Physics Simulations Lab

Interactive physics simulations demonstrating the **Magnetic**, **Heating**, and **Chemical** effects of electric current, plus **Types of Forces** and **M.Sc. Physics Practicals** modules. Built for students to explore and learn through hands-on experimentation in their browser.

**A personal portfolio project by Megha Ananthi B**

**Live Site**: [megha-ananthi.github.io/physics-simulations](https://megha-ananthi.github.io/physics-simulations/)

---

## Experiments

| # | Experiment | Effect | Description |
|---|-----------|--------|-------------|
| 1 | **Oersted's Compass** | Magnetic | Drag a compass around a current-carrying wire to see how the needle aligns with circular magnetic field lines |
| 2 | **Iron Nail Electromagnet** | Magnetic | Control voltage and coil turns to pick up paper clips with an electromagnet |
| 3 | **Nichrome Wire Heater** | Heating | Watch a wire glow red-hot with adjustable voltage and a thermal camera toggle |
| 4 | **Lemon Battery** | Chemical | Connect lemons in series to generate enough voltage to light an LED |
| 5 | **Voltaic Cell** | Chemical | Choose electrode metals and watch reactivity difference create electricity to light a bulb |

## Types of Forces Module

A second mini-lab covering **friction, gravitational, magnetic and electrostatic forces**. Its hub opens with a
"Sort the Force" contact vs non-contact drag-and-drop game, and each simulation follows a
**predict → try → observe → explain** loop with a 3-question challenge and collectible badges (stored in
`localStorage`).

| Sim | Force | What you do |
|-----|-------|-------------|
| **Friction** (4 mini-sims) | Contact | Pull a block past the static-friction breakaway point, race sliding vs rolling crates, drop a parachute to terminal velocity, and zoom into surface bumps |
| **Gravitational** (3 mini-sims) | Non-contact | Race a hammer vs a feather in air/vacuum on Earth, Moon or Jupiter; drag two masses to see equal-and-opposite pulls; launch a satellite to learn why astronauts float |
| **Magnetic** (2 mini-sims) | Non-contact | Drag a bar magnet over 8 objects (only iron/steel/nickel respond!), toggle field lines, and push two magnets' like/unlike poles together |
| **Electrostatic** | Non-contact | Rub a balloon on a sweater, then lift neutral paper bits, bend a water stream, stick it to a wall, or repel a second balloon — with a humidity slider |

Unlike the 3D electricity experiments, the forces sims are lightweight **2D Canvas** pages (no Three.js) so they run
smoothly on low-end devices, and they use a **light theme** so they stay readable on classroom projectors.

## M.Sc. Physics Practicals Module

Exam-preparation simulations for eleven M.Sc. Physics practicals, opened from the **M.Sc. Physics Practicals**
card on the home page. Every experiment page has four parts: **Simulate** (the interactive experiment),
**Draw it** (each exam diagram drawn stroke by stroke with step captions), **Record** (an exam-ready record
sheet — aim, apparatus, formula, diagrams, procedure, observation tables filled from your own readings,
calculation, result; printable) and **Viva** (likely viva questions with answers).

| Practical | Exp | Experiment | Type |
|-----------|-----|------------|------|
| I  | 3  | Polarimeter — specific rotation of cane sugar | Optics |
| I  | 4  | D/A converter — binary weighted resistor method (IC 741) | Op-amp |
| I  | 11 | RS, clocked RS, D (and JK, T) flip-flops with NAND/NOR | Digital |
| I  | 12 | 4-bit binary adder & subtractor with IC 7483 | Digital |
| I  | 13 | Op-amp 4-bit R-2R ladder DAC (IC 741) | Op-amp |
| I  | 16 | 8085 — sum of a set of n data | 8085 |
| I  | 18 | 8085 — code conversion (decimal ↔ hex, hex ↔ ASCII) | 8085 |
| II | 3  | Air wedge — thickness of a thin wire | Optics |
| II | 13 | Shift register, ring counter and Johnson counter | Digital |
| II | 18 | 8085 — ascending and descending order (bubble sort) | 8085 |
| II | 20 | 8085 — 8-bit addition, subtraction, multiplication, division | 8085 |

The 8085 pages run the real programs on a built-in 8085 assembler/emulator (`experiments/msc/assets/cpu8085.js`),
so every address and opcode in the program tables is generated, not typed. Its tests run headlessly:

```bash
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc experiments/msc/assets/cpu8085.js experiments/msc/assets/programs8085.js experiments/msc/assets/cpu8085.test.js
```

or in a browser at `experiments/msc/tests.html`.

## Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript** — no build tools, no frameworks
- **Three.js** (v0.164.1 via CDN) — 3D rendering with WebGL (electricity experiments)
- **Canvas 2D / SVG** — dependency-free rendering for the Types of Forces and M.Sc. Practicals modules
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
│   ├── lemon-battery.html        # Experiment 4: Lemon Battery
│   ├── voltaic-cell.html         # Experiment 5: Voltaic Cell
│   ├── forces/                   # Types of Forces module (2D Canvas, light theme)
│   │   ├── index.html            # Module hub + "Sort the Force" game
│   │   ├── friction.html         # Static/sliding/rolling/fluid friction (4 tabs)
│   │   ├── gravity.html          # Drop race, two-mass attraction, orbits (3 tabs)
│   │   ├── magnetic.html         # Magnet playground + two magnets (2 tabs)
│   │   └── electrostatic.html    # Charge-the-balloon sandbox
│   └── msc/                      # M.Sc. Physics Practicals module
│       ├── index.html            # Practicals hub (Practical I and II)
│       ├── assets/               # Shared CSS/JS, 8085 emulator, programs and tests
│       └── p1-*.html, p2-*.html  # One page per experiment
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

This is a personal educational portfolio project by Megha Ananthi B.
