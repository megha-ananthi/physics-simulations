# AGENTS.md — AI Agent Context for Physics Simulations Lab

This file provides comprehensive context for AI agents (Codex, Copilot, Cursor, etc.) working on this project. Read this before making any changes.

---

## Project Overview

An interactive physics simulations suite demonstrating the **Magnetic**, **Heating**, and **Chemical** effects of electric current, plus a **Types of Forces** module. This is the **personal portfolio site of Megha Ananthi B** — she presents and explains the experiments herself.

**Branding rule (owner request):** do NOT put school names, "CBSE", class/grade levels, curriculum chapter references, or "For Teachers" sections on any user-facing page. Credit lines say only "Megha Ananthi B".
The M.Sc. practicals module is the one exception to "curriculum references": it shows "Practical I / II · Exp N"
(the owner asked for it so the student can match the exam list) — but never a university name or course code.

- **Live URL**: https://megha-ananthi.github.io/physics-simulations/
- **Repo**: https://github.com/megha-ananthi/physics-simulations
- **Target audience**: Children aged 12-14, using home computers or mobile devices

---

## Architecture Constraints

These are **hard constraints** — do not violate them:

1. **Static files only** — HTML, CSS, Vanilla JS. No frameworks (React, Vue, etc.), no build tools (Webpack, Vite, etc.), no package.json, no npm.
2. **GitHub Pages hosting** — must work when served as static files from the repo root.
3. **Three.js via CDN** — loaded using `<script type="importmap">` pointing to `https://cdn.jsdelivr.net/npm/three@0.164.1/`. Do NOT install via npm.
4. **No external image/model assets** — all 3D objects are built programmatically using Three.js geometries (CylinderGeometry, SphereGeometry, TubeGeometry, etc.).
5. **All links must be relative** — no absolute paths. Hub links to experiments use `experiments/foo.html`, experiments link back with `../index.html`.
6. **Mobile-responsive** — every page must work on phones/tablets with touch controls.

---

## File Structure

```
physics-simulations/
├── index.html                      # Hub page — entry point, links to all experiments
├── css/
│   └── style.css                   # Hub page styles (CSS custom properties, grid, animations)
├── js/
│   └── main.js                     # Hub page JS (particle canvas background, fun facts rotator)
├── experiments/
│   ├── oersted.html                # Exp 1: Oersted's Compass (Magnetic Effect)
│   ├── electromagnet.html          # Exp 2: Iron Nail Electromagnet (Magnetic Effect)
│   ├── heating.html                # Exp 3: Nichrome Wire Heating (Heating Effect)
│   ├── lemon-battery.html          # Exp 4: Lemon Battery (Chemical Effect)
│   ├── voltaic-cell.html           # Exp 5: Voltaic Cell (Chemical Effect)
│   ├── forces/                     # "Types of Forces" module (Canvas 2D, no Three.js)
│   │   ├── index.html              # Module hub + "Sort the Force" contact/non-contact game
│   │   ├── friction.html           # Tabs: pull-block, rolling race, parachute drop, zoom-in
│   │   ├── gravity.html            # Tabs: drop race, two-mass attraction, orbit view
│   │   ├── magnetic.html           # Tabs: magnet playground, two magnets
│   │   └── electrostatic.html      # Single scene: balloon + 4 selectable targets
│   └── msc/                        # "M.Sc. Physics Practicals" module (exam prep, light theme)
│       ├── index.html              # Practicals hub: Practical I and Practical II cards
│       ├── tests.html              # Browser runner for the 8085 engine tests
│       ├── assets/                 # Shared by every page in this module only
│       │   ├── msc.css             # Theme, page skeleton, record sheet, 8085 widget, print styles
│       │   ├── msc-common.js       # window.MSC: tabs, canvas, SVG symbols, draw-along, flowchart, viva
│       │   ├── cpu8085.js          # window.CPU8085: assembler, emulator, trainer-kit widget
│       │   ├── programs8085.js     # window.PROGRAMS8085: every 8085 program + samples + flowcharts
│       │   └── cpu8085.test.js     # Headless tests (JavaScriptCore) for the two files above
│       ├── p1-03-polarimeter.html  # Practical I Exp 3   (optics)
│       ├── p1-04-weighted-dac.html # Practical I Exp 4   (op-amp, from the record; bench view modelled on the lab video)
│       ├── p1-11-flip-flops.html   # Practical I Exp 11  (digital)
│       ├── p1-12-adder-subtractor.html  # Practical I Exp 12 (digital, IC 7483)
│       ├── p1-13-r2r-dac.html      # Practical I Exp 13  (op-amp) — reference analog page
│       ├── p1-16-sum-of-n-data.html     # Practical I Exp 16 (8085)
│       ├── p1-18-code-conversion.html   # Practical I Exp 18 (8085)
│       ├── p2-03-air-wedge.html    # Practical II Exp 3  (optics)
│       ├── p2-13-shift-register-counters.html # Practical II Exp 13 (digital)
│       ├── p2-18-sorting.html      # Practical II Exp 18 (8085) — reference 8085 page
│       └── p2-20-8085-arithmetic.html   # Practical II Exp 20 (8085, record version)
├── AGENTS.md                       # This file — AI agent context
├── README.md                       # Human-readable project docs
└── .Codex/
    ├── settings.json               # Shared Codex permissions (committed)
    ├── settings.local.json          # Local-only settings (gitignored, may contain tokens)
    └── launch.json                 # Dev server config for Codex Preview
```

---

## Hub Page Architecture (`index.html` + `css/style.css` + `js/main.js`)

### Design System
- **Fonts**: Fredoka One (headings, `font-family: var(--font-heading)`), Nunito (body, `font-family: var(--font-body)`) — loaded from Google Fonts with `font-display: swap`
- **Color tokens** (CSS custom properties in `:root`):
  - `--color-magnetic: #4A90D9` (blue) — used for magnetic effect experiments
  - `--color-heating: #E86830` (orange-red) — used for heating effect experiments
  - `--color-chemical: #4CAF50` (green) — used for chemical effect experiments
  - `--color-bg: #F5F0FF` (lavender) — page background
  - `--color-header-start: #6B3FA0` / `--color-header-end: #3F51B5` — header gradient
- **Card radius**: `--radius-card: 20px` — large border-radius for child-friendly feel
- **Animations**: `fadeSlideUp`, `wiggle`, `float` — defined as `@keyframes` in style.css
- **Responsive breakpoints**: 768px (tablet), 480px (mobile)
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all animations

### Hub Page Structure
- `<canvas id="particle-canvas">` — fullscreen background with floating colored dots (js/main.js)
- `.content-layer` — positioned above canvas with `z-index: 1`
- `.lab-header` — gradient header with author credit
- `.experiments-grid` — CSS Grid (`auto-fit, minmax(280px, 1fr)`) of `.experiment-card` links
- `.fun-facts` — rotating electricity facts (js/main.js, 5-second interval)
- `.lab-footer` — author credit only (no school name — see branding rule)

### Adding a New Card to the Hub
Add a new `<a>` tag inside `.experiments-grid` in `index.html`:
```html
<a href="experiments/your-experiment.html" class="experiment-card magnetic|heating|chemical">
    <div class="card-badge">Effect Type</div>
    <div class="card-icon">EMOJI</div>
    <h3>Experiment Name</h3>
    <p>Short child-friendly description.</p>
    <div class="card-cta">Start Experiment <span class="arrow">&rarr;</span></div>
</a>
```
- Use class `magnetic`, `heating`, or `chemical` for automatic color theming
- Update the `animation-delay` on `.experiment-card:nth-child(N)` in style.css if needed

---

## Experiment Page Architecture (each file in `experiments/`)

Every experiment is a **single self-contained HTML file** with inline `<style>` and `<script type="module">`. They share no external CSS/JS (each experiment is independent).

### Common Pattern

```
<!DOCTYPE html>
<html>
<head>
    <!-- Google Fonts: Fredoka One + Nunito -->
    <!-- Inline <style> for UI overlay -->
</head>
<body>
    <div id="three-canvas"></div>           <!-- Three.js renderer target -->

    <div class="ui-overlay">                <!-- HTML/CSS overlay on top of 3D -->
        <a class="back-btn">← Back to Lab</a>
        <div class="exp-title">Title</div>
        <div class="info-display">...</div>  <!-- Real-time stats panel -->
        <p class="hint">...</p>              <!-- Interaction instructions -->
        <div class="control-panel">          <!-- Sliders, switches -->
            <!-- Voltage slider, power switch, etc. -->
        </div>
    </div>

    <script type="importmap">               <!-- Three.js CDN import -->
    <script type="module">                  <!-- All 3D scene + logic -->
</body>
</html>
```

### Three.js Setup (every experiment)
```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 15, 30);
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// OrbitControls (drag to rotate, scroll to zoom)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting: AmbientLight + DirectionalLight (key) + DirectionalLight (fill)
// Optional: PointLight for dynamic effects (glow when powered on)
```

### UI Overlay Conventions
- **Back button**: `.back-btn` — top-left, links to `../index.html`
- **Title**: `.exp-title` — top-center, uses Fredoka One font
- **Info display**: `.info-display` — top-right, shows real-time values (voltage, temperature, etc.)
- **Control panel**: `.control-panel` — bottom-center, glassmorphism style
  - Sliders: `<input type="range">` with custom styling (24px thumb for touch)
  - Power switch: checkbox styled as toggle (`.power-switch` with `.switch-track` + `.switch-knob`)
- **Hint text**: `.hint` — above control panel, describes interaction method
- All UI uses `position: fixed` with `z-index: 20` to stay above the 3D canvas
- `pointer-events: none` on `.ui-overlay`, `pointer-events: auto` on children

### Color Scheme per Experiment
- Magnetic experiments: accent color `#4A90D9` (blue) — slider thumbs, info values
- Heating experiments: accent color `#E86830` (orange) — slider thumbs, info values
- Chemical experiments: accent color `#4CAF50` (green) — slider thumbs, info values

---

## Existing Experiments — Detailed Reference

### Experiment 1: Oersted's Compass (`experiments/oersted.html`)
**Effect**: Magnetic
**3D Objects**:
- Battery (CylinderGeometry, red/black halves)
- Horizontal copper wire (TubeGeometry along CatmullRomCurve3) at `y=1.2`
- Wire support posts (CylinderGeometry) at x=-2 and x=2
- Compass (TorusGeometry ring + CylinderGeometry disc + BoxGeometry needle halves + SphereGeometry glass dome)
- Connecting wires from battery to main wire (TubeGeometry, red/black)

**Key Feature**: Compass is **draggable** on the table using raycaster. Needle angle computed from circular magnetic field physics:
- Wire runs along X-axis, field circles in YZ plane
- At compass position: find closest point on wire, compute radial vector, get tangent direction (right-hand rule)
- Needle angle = `atan2` of tangent projected onto XZ table plane, scaled by field strength (`voltage / distance`)

**Controls**: Voltage slider (1-10V), Power switch
**Info panel**: Voltage, Needle Angle (degrees), Distance from wire, Status

### Experiment 2: Iron Nail Electromagnet (`experiments/electromagnet.html`)
**Effect**: Magnetic
**3D Objects**:
- Battery (CylinderGeometry, red/black halves) at x=-3.5
- Iron nail (CylinderGeometry body + ConeGeometry tip + CylinderGeometry head) at y=1.5
- Wire coil (TubeGeometry along CatmullRomCurve3 **spiral**) — **rebuilt dynamically** when turns change
- 10 paper clips (CapsuleGeometry pairs) scattered on table
- Connecting wires (TubeGeometry) — **rebuilt dynamically** to track coil lead endpoints
- Table with legs (BoxGeometry + CylinderGeometry)

**Key Feature**: `buildCoil(turns)` regenerates the spiral geometry and recalculates lead wire endpoints. `rebuildConnectingWires()` creates new wire meshes from battery terminals to coil lead endpoints. Both must be called together.

**Animation Logic**: `strength = voltage * coilTurns`. Number of clips attracted = `floor(strength / maxStrength * totalClips)`. Clips lerp to nail tip position when attracted, fall back to rest when released.

**Controls**: Voltage slider (1-10V), Coil Turns slider (2-10), Power switch
**Info panel**: Voltage, Coil Turns, Clips Picked, Status

### Experiment 3: Nichrome Wire Heater (`experiments/heating.html`)
**Effect**: Heating
**3D Objects**:
- Cardboard base (BoxGeometry, tan)
- Two holder nails (CylinderGeometry + ConeGeometry) at x=-1.2 and x=1.2
- Nichrome wire (CylinderGeometry, thin) stretched between nails at y=0.88
- Battery + connecting wires
- Heat particles (SphereGeometry, animated upward from wire)

**Key Feature**: Wire material uses `emissive` property that increases with voltage. Color transitions: gray → orange → red/glowing. **Thermal camera toggle** changes color scheme to heat-map (blue→cyan→green→yellow→red).

**Controls**: Voltage slider (1-10V), Power switch, Thermal Camera toggle button
**Info panel**: Voltage, Temperature (°C), Status, Temperature bar

### Experiment 4: Lemon Battery (`experiments/lemon-battery.html`)
**Effect**: Chemical
**3D Objects**:
- 6 lemons (SphereGeometry, squashed, yellow) with iron nail + copper strip each
- Connecting wires between lemons (copper→iron, TubeGeometry)
- LED at the end (SphereGeometry dome + CylinderGeometry base + legs)
- LED wires from first/last lemon to LED
- Bubble particles inside each lemon (SphereGeometry, animated upward)

**Key Feature**: `VOLTAGE_PER_LEMON = 0.9V`. LED threshold = 1.8V (2+ lemons needed). LED brightness scales with total voltage. Bubbles show chemical reaction when circuit is closed. `updateVisibility()` hides/shows lemons and rebuilds LED wires when count changes.

**Controls**: Lemons slider (1-6), Connect circuit switch
**Info panel**: Lemons count, Voltage/Lemon, Total Voltage, Circuit status, LED indicator

---

## "Types of Forces" Module (`experiments/forces/`)

A second mini-lab covering **friction, gravitational, magnetic and electrostatic forces**. It deliberately
does NOT use Three.js — every sim is plain **Canvas 2D** in a single self-contained HTML file, so the pages
stay light for low-end devices. Unlike the dark 3D electricity experiments, the forces pages use a
**light theme** (white canvas `#FBFAFF`, lavender page background) because dark canvases wash out on
classroom projectors — keep any new forces page light. Key conventions (all established by `friction.html`,
the canonical template):

- **Page skeleton**: `.top-bar` (back to module hub + back to main lab), `.big-idea` one-liner, `.tabs`
  pill row, `.stage-wrap` with `<canvas id="sim-canvas">` plus per-tab `.info-display` panels, per-tab
  `.tab-panel` (a `.predict-bar` + `.control-panel`), then explanation `.section-card`, a 3-question
  challenge `.section-card`, and a footer.
- **Logical canvas space is 900×560**; `fitCanvas()` scales for width/devicePixelRatio and the main loop
  sets the transform each frame. Pointer coords map through `ptr(e)`.
- **Accent color per page** via `--accent` custom property only (the rest of the style block is shared):
  friction `#FF7043`, gravity `#9575CD`, magnetic `#4A90D9`, electrostatic `#E8A000`. The module hub uses
  `--color-forces: #7E57C2` (also added to the main hub's `css/style.css`). On the white canvas use
  `#E67700` instead of light yellows and `#0288D1` instead of light blues for text/arrows.
- **Predict → Observe → Explain**: every sim tab has a `makePredict(...)` bar; the sim calls `.reveal()`
  when the observable event happens (breakaway, race finish, terminal velocity, first paper-bit jump...).
  Never reveal on a timer alone — tie it to the discrepant event.
- **Badges**: `localStorage` key `forces-lab-progress` holds `{sorter, friction, gravity, magnetic,
  electrostatic}`. Sim pages call `setBadge(name)` when the 3-question challenge is fully correct; the
  module hub renders ✅ tags and a "Force Master" banner when all five are earned.
- **Physics is simplified on purpose** (g = 10, toy drag coefficients, stylized field lines). Keep values
  qualitative/illustrative — the footer on every page says so. Don't "fix" them to exact real-world values
  at the cost of readability.
- Each page targets a documented misconception (friction acts only when moving; heavier falls faster;
  no gravity in space; magnets attract all metals; electric = magnetic attraction). If you add a sim,
  pick its misconception first and design the reveal around it.

## "M.Sc. Physics Practicals" Module (`experiments/msc/`)

Exam-preparation simulations for eleven M.Sc. Physics practicals (Practical I: Exp 3, 11, 12, 13, 16, 18 —
numbered as in the manual's page-5 "List of Experiments", not its chapter headings — plus Exp 4, the binary
weighted resistor DAC, numbered as in the student's record; Practical II: Exp 3, 13, 18, 20).
The student must understand the experiment and then draw and write it in the exam, so every page has the
same four sections, reachable from a sticky `.section-nav`:

1. **Simulate** (`#simulate`) — the interactive experiment with live readouts.
2. **Draw it** (`#draw`) — exam diagrams drawn stroke by stroke with a moving pen and a caption per step.
3. **Record** (`#record`) — `article.record` styled like a record notebook: Aim, Apparatus, Formula,
   diagrams (`.rec-diagram[data-diagram=name]` slots are filled automatically with a static copy of the
   named draw-along diagram), Procedure, Observation tables filled from the student's own simulation
   readings, Calculation, Result, Precautions. The print button prints only this section (A4).
4. **Viva** (`#viva`) — tap-to-reveal questions via `MSC.viva`.

Conventions:
- **Shared assets are deliberate here** (unlike the rest of the site): pages load `assets/msc.css`,
  `assets/msc-common.js` and, for 8085 pages, `assets/cpu8085.js` + `assets/programs8085.js`.
  Reference pages to copy: `p1-13-r2r-dac.html` (circuit/analog pattern) and `p2-18-sorting.html` (8085).
- **Accent per type** via `--accent`: optics `#00897B`, digital `#5C6BC0`, op-amp/analog `#EF6C00`, 8085 `#8E24AA`.
- **Draw-along diagrams**: `MSC.diagram(target, {name, title, viewBox, steps: [{c: caption, s: svgMarkup}]})`,
  built with the `MSC.sym` symbol library (resistor, opamp, gate, chip, dff, dip, axes, arrow …; label
  markup `_{sub}`, `^{sup}`, `!{overline}`). Flowcharts come from `MSC.flowchart(spec)`.
- **8085 programs live only in `programs8085.js`**, written as mnemonic source. The assembler generates
  addresses and opcodes, so listings are always byte-accurate; never hand-type opcodes into a page.
  The manual and record contain typos (e.g. `JC NEXTBYT` printed `DA 14 80`, `MOV A,C` written `77`);
  pages show these as "Check your record" notes, taken from each program's `notes`.
- **Tests**: after changing `cpu8085.js` or `programs8085.js`, run
  `/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc experiments/msc/assets/cpu8085.js experiments/msc/assets/programs8085.js experiments/msc/assets/cpu8085.test.js`
  (Node isn't installed on this machine) or open `experiments/msc/tests.html`.
- **Widget gotcha**: `CPU8085.mount()` callbacks receive the widget `api` as a parameter — use it rather
  than the variable returned by `mount()`, and declare any `let` the callbacks use before calling `mount()`.

## How to Add a New Experiment

### Step 1: Create the HTML file
Copy an existing experiment (e.g., `electromagnet.html`) and modify:
- Title in `<title>`, `.exp-title`
- Favicon emoji
- Accent color in slider thumbs and info values
- All 3D scene objects and animation logic
- Control panel sliders/switches for your experiment's variables
- Info display rows

### Step 2: Build the 3D scene
Use Three.js geometries — do NOT load external models or images:
- `CylinderGeometry` — wires, nails, battery bodies
- `SphereGeometry` — balls, particles, lemon-like shapes
- `BoxGeometry` — rectangular objects, platforms, strips
- `ConeGeometry` — nail tips, pointed objects
- `TorusGeometry` — rings, field lines
- `TubeGeometry` + `CatmullRomCurve3` — curved wires, coils, pipes
- `CapsuleGeometry` — paper clips, rounded elongated objects

### Step 3: Add interactivity
- Use HTML sliders/switches in the UI overlay to control simulation parameters
- Wire up `addEventListener('input'/'change')` to update state variables
- In the `requestAnimationFrame` loop, animate objects based on state
- Use `lerp` for smooth transitions (e.g., `position.lerp(target, speed * dt)`)

### Step 4: Add card to hub
Add entry in `index.html` `.experiments-grid` (see "Adding a New Card" section above).

### Step 5: Test
- Open in browser, verify 3D scene loads
- Test all controls (sliders, switches)
- Drag to orbit, scroll to zoom
- Test on mobile viewport (Chrome DevTools device toolbar)
- Verify "Back to Lab" link works

---

## Common Patterns and Gotchas

### Dynamic geometry rebuilding
When a slider changes a visual property (like coil turns), you must:
1. Remove old mesh from scene: `scene.remove(mesh)`
2. Dispose old geometry: `mesh.geometry.dispose()`
3. Create new geometry and mesh
4. Add to scene: `scene.add(newMesh)`
5. Rebuild any dependent objects (e.g., connecting wires)

### Connecting wires
Wires between components use `TubeGeometry` along `CatmullRomCurve3`:
```javascript
const from = new THREE.Vector3(x1, y1, z1);
const to = new THREE.Vector3(x2, y2, z2);
const mid = new THREE.Vector3((x1+x2)/2, Math.max(y1,y2)+0.3, (z1+z2)/2);
const curve = new THREE.CatmullRomCurve3([from, mid, to]);
const geo = new THREE.TubeGeometry(curve, 20, 0.025, 8, false);
```

### Material conventions
- Metallic objects: `metalness: 0.7-0.9, roughness: 0.2-0.4`
- Plastic/painted: `metalness: 0.1-0.3, roughness: 0.4-0.6`
- Wood: `metalness: 0.05, roughness: 0.8`
- Glowing effects: use `emissive` color + `emissiveIntensity`
- Transparent: `transparent: true, opacity: 0.15`

### Mobile considerations
- Minimum touch target: 24px slider thumb (CSS)
- OrbitControls handles touch automatically (drag = orbit, pinch = zoom)
- Reduce particle counts on mobile (`window.innerWidth < 768`)
- Test at 375px width (iPhone SE) and 768px (iPad)

### CSS in experiments
Each experiment has its own inline `<style>` — they do NOT share `css/style.css`. If you add a new experiment, copy the full style block from an existing one and adjust accent colors.

### Import map
Every experiment must include this in the `<head>`:
```html
<script type="importmap">
{
    "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/"
    }
}
</script>
```

---

## Git Workflow

- **`main`** branch: production, deployed to GitHub Pages
- **Feature branches**: `feature/experiment-name` or `docs/description`
- Always create PRs to merge into `main`
- Commit messages: imperative mood, describe what changed and why
- Do NOT commit `.Codex/settings.local.json` (contains local-only config, may have tokens)

---

## Future Experiments (planned)

The following experiments may be added in future iterations. They continue the same middle-school physics themes on effects of electric current:

- **Electric Bell** — demonstrates electromagnet + spring mechanism
- **Electroplating** — chemical effect, coating a metal object
- **Electric Fuse** — heating effect, wire melts at threshold current
- **Series vs Parallel Circuits** — comparing brightness of bulbs
- **Fleming's Left Hand Rule** — motor effect, force on current-carrying conductor

When adding these, follow the patterns documented above and update this file.
