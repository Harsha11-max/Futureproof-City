# FUTUREPROOF CITY ✳
### Design tomorrow, today.

**An interactive, fictional urban-resilience simulator built with HTML, CSS, and vanilla JavaScript.**

What if you had **100 investment credits** to make a city more resilient? Would you prioritize cooling trees, flood drainage, backup electricity, or community hubs? Futureproof City is a playable thought experiment where changing your plan updates a stylized risk map, six neighborhoods, a resilience score, and a 12-month rollout chart in real time.

> **Important:** All districts, populations, model coefficients and scores are fictional. This is a learning/portfolio project—not a scientific forecast, emergency planning tool, or safety recommendation.

## Highlights

- **3 crisis simulations:** Heatwave, flash flood and grid outage.
- **4 investment sliders:** Spend up to 100 credits across tree canopy, drainage, backup power and community hubs.
- **Interactive map:** Six clickable districts whose block colors update as risk changes.
- **Transparent impact model:** Population-weighted resilience index, baseline comparison, illustrative exposure index, and district rankings.
- **Decision assistant:** A rules-based suggestion finds the lever with the best immediate modeled improvement for the next five credits. **No AI API or exaggerated AI claims.**
- **12-month rollout chart:** A generated SVG chart shows how the investments might be phased in.
- **Saved futures:** Keep up to 12 scenarios locally in your browser, reopen them and compare readiness scores.
- **Export:** Download a JSON report containing the input, results, districts, warnings and timeline.
- **No dependencies:** Fully responsive, accessible controls, GitHub Pages compatible; no API keys or account required.

## Quick start

### Option A — Easiest
1. Download and extract this repository.
2. Double-click `index.html` to open it in your browser.
3. Choose a crisis and move an investment slider.

### Option B — VS Code / local server

Open the project folder in VS Code. If you have the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.

Or, if Python is installed, run from the project folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Run the automated tests (optional)

Node.js v18+ is needed for tests, **not** to run the website.

```bash
node --test tests/model.test.cjs
```

## Deploy free using GitHub Pages

1. Create a new **public** repository named `futureproof-city` on GitHub.
2. Upload **the contents of this folder** (`index.html`, `styles.css`, `model.js`, `app.js`, `assets/`, `tests/`, etc.) to the repository's top level. Do **not** upload only the ZIP.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**. Select branch `main` and folder `/ (root)`, then save.
5. Your site should appear at `https://YOUR-USERNAME.github.io/futureproof-city/` after GitHub publishes it.

Or use Git locally:

```bash
git init
git add .
git commit -m "Build interactive Futureproof City simulator"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/futureproof-city.git
git push -u origin main
```

> Create an empty repository first when using the Git commands (don't initialize it with another README).

## How the model works

Risk in each district begins with its fictional vulnerability to a specific crisis. Investments lower risk using crisis-specific coefficients and district effectiveness modifiers. Returns diminish using a square-root function:

```
reduction = Σ sqrt(credits_for_lever / 100)
              × crisis_weight_for_lever
              × district_modifier_for_lever
              × 41

district_risk = clamp(18 + vulnerability × 77 - reduction, 6, 98)
resilience_index = round(100 - population_weighted_avg(district_risk))
```

This is **not validated against historical data**; the coefficients are editorial examples chosen to make tradeoffs visible. See `model.js` for all numbers.

The **exposure index** is a rounded sum of `population × district_risk / 100` across neighborhoods. It is a *risk-weighted mathematical index* expressed in people-equivalent units, **not** the number of residents expected to be harmed. Month-by-month values gradually phase investments in; they do not simulate meteorology, human behavior, or real deployments.

## Project structure

```text
futureproof-city/
├── index.html             # Accessible interface and SVG containers
├── styles.css             # Responsive dark UI and subtle interactions
├── app.js                 # Rendering, controls, storage and JSON download
├── model.js               # Pure, deterministic simulation logic
├── assets/
│   └── favicon.svg        # Original small vector icon
├── tests/
│   └── model.test.cjs     # Node built-in test runner
├── .gitignore
├── LICENSE
└── README.md
```

## Ideas for a next version

- Add your own fictional city and editable district data.
- Chart multi-crisis strategies and tradeoff frontiers.
- Support import of previously exported reports.
- Add multiple languages or a guided storytelling mode.
- Separate model versions so results are reproducible.

## Tech stack

HTML5 · CSS3 · JavaScript (ES2020+) · SVG · browser `localStorage` · Node.js built-in test runner.

No React, backend, credentials, database, external maps, tracking scripts, or third-party packages.

## License

MIT — free to learn from and adapt. Attribution appreciated.
