/* Futureproof City — browser-only interface, no frameworks or external APIs. */
(() => {
  'use strict';
  const M = window.FutureProofModel;
  if (!M) throw new Error('model.js must load before app.js');

  const STORAGE_KEY = 'futureproof-city-scenarios-v1';
  const state = {
    hazard: 'heat',
    allocation: { ...M.INITIAL },
    selectedDistrict: 'midtown',
    view: 'studio'
  };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const format = (value) => new Intl.NumberFormat('en-IN').format(value);
  const svgNS = 'http://www.w3.org/2000/svg';
  const LABELS = { trees: 'Urban tree canopy', drainage: 'Smart drainage', backup: 'Backup microgrids', hubs: 'Community hubs' };
  let lastEvaluation;
  let toastTimeout;

  function element(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') node.className = value;
      else node.setAttribute(key, String(value));
    });
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function svgElement(tag, attrs = {}, text) {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3200);
  }
  function riskColor(risk) {
    if (risk >= 70) return '#e88b79';
    if (risk >= 52) return '#e4b56c';
    return '#71c29b';
  }
  function mixHex(a, b, amount) {
    const v = Math.max(0, Math.min(1, amount));
    const parse = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
    const parts = [1, 3, 5].map(i => Math.round(parse(a, i) + (parse(b, i) - parse(a, i)) * v));
    return '#' + parts.map(n => n.toString(16).padStart(2, '0')).join('');
  }
  function tileColor(risk, variance) {
    const v = Math.max(0, Math.min(100, risk + variance));
    if (v < 52) return mixHex('#407f70', '#9ac999', v / 52);
    if (v < 70) return mixHex('#b5bd77', '#e6a967', (v - 52) / 18);
    return mixHex('#dfa06c', '#c9776c', (v - 70) / 30);
  }

  function renderMap(result) {
    const svg = $('#cityMap');
    svg.replaceChildren();
    const defs = svgElement('defs');
    const pattern = svgElement('pattern', { id: 'mapDots', width: 25, height: 25, patternUnits: 'userSpaceOnUse' });
    pattern.appendChild(svgElement('circle', { cx: 2, cy: 2, r: 1, fill: '#3c635f', opacity: '.28' }));
    defs.appendChild(pattern);
    svg.appendChild(defs);
    svg.appendChild(svgElement('rect', { width: 900, height: 440, fill: 'url(#mapDots)' }));
    // Fictional waterways and streets make the map feel urban without implying real geography.
    svg.appendChild(svgElement('path', { class: 'river-glow', d: 'M-20 335 C 145 260 196 370 318 350 S 600 365 920 296', 'pointer-events': 'none' }));
    svg.appendChild(svgElement('path', { class: 'river', d: 'M-20 335 C 145 260 196 370 318 350 S 600 365 920 296', 'pointer-events': 'none' }));

    result.districts.forEach((district, index) => {
      const x = 33 + district.col * 282;
      const y = 35 + district.row * 188;
      const width = 267, height = 172;
      const group = svgElement('g', {
        class: `district-group${state.selectedDistrict === district.id ? ' selected' : ''}`,
        tabindex: '0', role: 'button',
        'aria-label': `${district.name}, risk ${Math.round(district.risk)} out of 100. Select district.`
      });
      group.appendChild(svgElement('rect', { x, y, width, height, rx: 9, fill: '#132c2c', opacity: '.94' }));
      // Individual blocks add texture; colors vary reproducibly rather than randomly jumping.
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 7; col++) {
          const n = (index * 43 + row * 19 + col * 11);
          const variance = Math.sin(n * 1.38) * 10 + Math.cos(n * .81) * 7;
          const bx = x + 11 + col * 35.1;
          const by = y + 12 + row * 39.5;
          group.appendChild(svgElement('rect', {
            x: bx, y: by, width: 29.8, height: 31,
            rx: 3.5, fill: tileColor(district.risk, variance), opacity: '.9'
          }));
          if ((row + col + index) % 3 === 0) group.appendChild(svgElement('rect', {
            x: bx + 5, y: by + 6, width: 12, height: 9, rx: 1.2, fill: '#183c3a', opacity: '.42'
          }));
          if ((row + col * 2 + index) % 5 === 0) group.appendChild(svgElement('circle', {
            cx: bx + 24, cy: by + 26, r: 3.2, fill: '#d3edac', opacity: '.72'
          }));
        }
      }
      group.appendChild(svgElement('rect', { x: x + 7, y: y + 130, width: 253, height: 34, rx: 5, fill: '#142a2c', opacity: '.94' }));
      group.appendChild(svgElement('text', { x: x + 16, y: y + 151, class: 'map-label' }, district.name.toUpperCase()));
      group.appendChild(svgElement('text', { x: x + 249, y: y + 151, class: 'map-risk-label', 'text-anchor': 'end' }, `${Math.round(district.risk)} / 100`));
      group.appendChild(svgElement('rect', { class: 'district-outline', x, y, width, height, rx: 9 }));
      group.addEventListener('click', () => selectDistrict(district.id));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectDistrict(district.id);
        }
      });
      svg.appendChild(group);
    });
  }

  function renderDistrictDetail(result) {
    const district = result.districts.find(d => d.id === state.selectedDistrict) || result.districts[0];
    const box = $('#districtDetail');
    box.replaceChildren();
    const info = element('div');
    info.appendChild(element('strong', {}, district.name));
    info.appendChild(element('small', {}, `${format(district.population)} residents · ${district.improvement.toFixed(1)} risk points reduced`));
    box.appendChild(info);
    const label = district.level === 'critical' ? 'HIGHER RISK' : district.level === 'elevated' ? 'ELEVATED RISK' : 'LOWER RISK';
    box.appendChild(element('span', { className: 'detail-pill ' + district.level }, `${Math.round(district.risk)} / 100 · ${label}`));
  }
  function selectDistrict(id) {
    state.selectedDistrict = id;
    renderMap(lastEvaluation);
    renderDistrictDetail(lastEvaluation);
    renderRiskBars(lastEvaluation);
  }

  function renderRiskBars(result) {
    const parent = $('#riskBars');
    parent.replaceChildren();
    [...result.districts].sort((a, b) => b.risk - a.risk).forEach(district => {
      const row = element('button', {
        type: 'button', className: 'risk-row' + (district.id === state.selectedDistrict ? ' active' : ''),
        'aria-label': `Select ${district.name}, risk ${Math.round(district.risk)} of 100`
      });
      const bar = element('span', { className: 'risk-track' });
      const progress = element('span', { className: 'risk-progress' });
      progress.style.width = `${district.risk}%`;
      progress.style.backgroundColor = riskColor(district.risk);
      bar.appendChild(progress);
      row.appendChild(element('span', { className: 'risk-name' }, district.name));
      row.appendChild(bar);
      row.appendChild(element('span', { className: 'risk-number' }, String(Math.round(district.risk))));
      row.addEventListener('click', () => selectDistrict(district.id));
      parent.appendChild(row);
    });
  }

  function renderTimeline(result) {
    const svg = $('#timelineChart');
    svg.replaceChildren();
    const points = M.timeline(state.hazard, state.allocation);
    const values = points.map(p => p.readiness);
    const low = Math.max(0, Math.floor((Math.min(...values) - 8) / 5) * 5);
    const high = Math.min(100, Math.ceil((Math.max(...values) + 8) / 5) * 5);
    const x = month => 35 + month * (475 / 12);
    const y = value => 176 - (value - low) / Math.max(1, high - low) * 146;
    const color = state.hazard === 'heat' ? '#c8f27c' : state.hazard === 'flood' ? '#8fd2f2' : '#d5b2ff';
    for (let i = 0; i < 4; i++) {
      const level = low + (high - low) * i / 3;
      const lineY = y(level);
      svg.appendChild(svgElement('line', { x1: 35, y1: lineY, x2: 510, y2: lineY, stroke: '#34514b', 'stroke-dasharray': '3 6', 'stroke-width': 1 }));
      svg.appendChild(svgElement('text', { x: 24, y: lineY + 3, 'text-anchor': 'end', fill: '#7e9992', 'font-size': 10 }, String(Math.round(level))));
    }
    const d = points.map((point, i) => `${i ? 'L' : 'M'} ${x(point.month).toFixed(1)} ${y(point.readiness).toFixed(1)}`).join(' ');
    const area = `${d} L ${x(12)} 176 L 35 176 Z`;
    const defs = svgElement('defs');
    const gradient = svgElement('linearGradient', { id: 'timelineGradient', x1: '0', x2: '0', y1: '0', y2: '1' });
    gradient.append(svgElement('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.23' }), svgElement('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(gradient);
    svg.appendChild(defs);
    svg.appendChild(svgElement('path', { d: area, fill: 'url(#timelineGradient)' }));
    svg.appendChild(svgElement('path', { d, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    [0, 6, 12].forEach(month => svg.appendChild(svgElement('circle', { cx: x(month), cy: y(points[month].readiness), r: 4.5, fill: color, stroke: '#15292a', 'stroke-width': 2 })));
    svg.appendChild(svgElement('text', { x: x(12) - 8, y: y(points[12].readiness) - 14, 'text-anchor': 'end', fill: color, 'font-size': 13, 'font-weight': 750 }, String(Math.round(points[12].readiness))));
    $('#timelineCaption').replaceChildren(
      document.createTextNode('Illustrative resilience gain after implementation: '),
      element('b', {}, `+${(points[12].readiness - points[0].readiness).toFixed(1)} points`),
      document.createTextNode('. Assumes gradual implementation, with no change in the crisis itself.')
    );
  }

  function renderControls(result) {
    M.LEVERS.forEach(key => {
      const input = $('#' + key);
      input.max = String(result.remaining + state.allocation[key]);
      input.value = String(state.allocation[key]);
      input.style.setProperty('--range-progress', `${100 * state.allocation[key] / Math.max(1, Number(input.max))}%`);
      $('#' + key + 'Output').value = String(state.allocation[key]);
    });
    $('#budgetSpentSmall').textContent = String(result.spent);
    const progress = $('#budgetProgress');
    progress.setAttribute('aria-valuenow', String(result.spent));
    $('#budgetProgressFill').style.width = `${result.spent}%`;
    const dots = $('#budgetDots');
    dots.replaceChildren();
    for (let i = 0; i < 10; i++) dots.appendChild(element('span', { className: i < Math.ceil(result.spent / 10) ? 'active' : '' }));
    $('#recommendationText').textContent = M.recommend(state.hazard, state.allocation).message;
  }

  function renderMetrics(result) {
    $('#readinessValue').textContent = String(result.readiness);
    $('#readinessDelta').textContent = `+${result.readiness - result.baselineReadiness} points from baseline`;
    $('#readinessFill').style.width = `${result.readiness}%`;
    $('#riskReductionValue').textContent = result.riskReduced.toFixed(1);
    $('#exposureValue').textContent = (result.atRisk / 1000).toFixed(1) + 'k';
    $('#remainingValue').textContent = String(result.remaining);
    $('#spentCaption').textContent = `${result.spent} of ${M.BUDGET} credits in use`;
  }

  function render() {
    const result = M.evaluate(state.hazard, state.allocation);
    lastEvaluation = result;
    $$('.hazard-tab').forEach(button => {
      const active = button.dataset.hazard === state.hazard;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#hazardTag').textContent = M.HAZARDS[state.hazard].short;
    $('#hazardDescription').textContent = M.HAZARDS[state.hazard].atmospheric;
    renderMetrics(result);
    renderControls(result);
    renderMap(result);
    renderDistrictDetail(result);
    renderRiskBars(result);
    renderTimeline(result);
  }

  function getSaved() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter(s => s && M.HAZARDS[s.hazard] && typeof s.allocation === 'object').slice(0, 12) : [];
    } catch (_) { return []; }
  }
  function setSaved(scenarios) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios)); return true; }
    catch (_) { showToast('Storage unavailable. Use Export report to keep a copy.'); return false; }
  }
  function saveScenario() {
    const saved = getSaved();
    const stamp = new Date();
    const entry = {
      id: `${stamp.getTime()}-${Math.floor(Math.random() * 100000)}`,
      name: `${M.HAZARDS[state.hazard].name} · Plan ${String(saved.length + 1).padStart(2, '0')}`,
      hazard: state.hazard, allocation: { ...state.allocation },
      createdAt: stamp.toISOString()
    };
    if (setSaved([entry, ...saved].slice(0, 12))) {
      updateSavedCount();
      showToast('Future saved to this browser. Explore it in Saved futures.');
    }
  }
  function updateSavedCount() { $('#savedCount').textContent = String(getSaved().length).padStart(2, '0'); }

  function renderSavedView() {
    const parent = $('#savedList');
    parent.replaceChildren();
    const saved = getSaved();
    updateSavedCount();
    if (!saved.length) {
      const empty = element('div', { className: 'empty-saved' });
      empty.append(element('span', {}, '✳'), element('h3', {}, 'No futures saved. Yet.'), element('p', {}, 'Head to the studio, try a strategy and save your first one.'));
      parent.appendChild(empty);
      return;
    }
    saved.forEach(entry => {
      const result = M.evaluate(entry.hazard, entry.allocation);
      const current = M.evaluate(entry.hazard, state.allocation);
      const comparison = result.readiness - current.readiness;
      const card = element('article', { className: 'saved-card' });
      const top = element('div', { className: 'saved-card-top' });
      top.append(element('span', {}, M.HAZARDS[entry.hazard].name.toUpperCase()), element('span', {}, format(result.spent) + ' / 100 CREDITS'));
      card.appendChild(top);
      card.appendChild(element('h3', {}, entry.name || M.HAZARDS[entry.hazard].name));
      const date = new Date(entry.createdAt);
      card.appendChild(element('p', {}, Number.isFinite(date.getTime()) ? `Saved ${date.toLocaleDateString()}` : 'Saved scenario'));
      card.appendChild(element('div', { className: 'saved-score' }, `${result.readiness} / 100`));
      card.appendChild(element('p', {}, `${comparison >= 0 ? '+' : ''}${comparison} readiness vs your current investments, under the same threat.`));
      const actions = element('div', { className: 'saved-actions' });
      const load = element('button', { type: 'button' }, 'Open scenario ↗');
      load.addEventListener('click', () => {
        state.hazard = entry.hazard;
        state.allocation = M.sanitizeAllocation(entry.allocation);
        state.selectedDistrict = 'midtown';
        selectView('studio');
        render();
        showToast('Scenario loaded. Try a different allocation.');
      });
      const del = element('button', { type: 'button', className: 'delete-button', 'aria-label': 'Delete ' + entry.name }, 'Delete');
      del.addEventListener('click', () => {
        if (setSaved(getSaved().filter(item => item.id !== entry.id))) {
          renderSavedView();
          showToast('Saved future deleted.');
        }
      });
      actions.append(load, del);
      card.appendChild(actions);
      parent.appendChild(card);
    });
  }

  function selectView(name) {
    if (!['studio', 'saved', 'notes'].includes(name)) return;
    state.view = name;
    $('#studioView').hidden = name !== 'studio';
    $('#savedView').hidden = name !== 'saved';
    $('#notesView').hidden = name !== 'notes';
    $('#currentViewName').textContent = ({ studio: 'SCENARIO STUDIO', saved: 'SAVED FUTURES', notes: 'MODEL NOTES' })[name];
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    if (name === 'saved') renderSavedView();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function exportReport() {
    const result = M.evaluate(state.hazard, state.allocation);
    const report = {
      project: 'Futureproof City', version: 1, exportedAt: new Date().toISOString(),
      warning: 'Fictional, illustrative education model. Not evidence-based forecasts or actionable emergency advice.',
      scenario: { hazard: M.HAZARDS[state.hazard].name, key: state.hazard, allocation: result.allocation, budget: result.budget, unspentCredits: result.remaining },
      outcomes: { resilienceIndex: result.readiness, baselineIndex: result.baselineReadiness, riskPointsReduced: result.riskReduced, riskWeightedExposureIndex: result.atRisk, population: result.population },
      neighborhoods: result.districts.map(d => ({ name: d.name, population: d.population, risk: d.risk, baselineRisk: d.baselineRisk, improvement: d.improvement })),
      modelSuggestion: M.recommend(state.hazard, state.allocation).message,
      timeline: M.timeline(state.hazard, state.allocation)
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const objectURL = URL.createObjectURL(blob);
    link.href = objectURL;
    link.download = `futureproof-${state.hazard}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectURL), 2000);
    showToast('Report exported as a JSON file.');
  }

  function init() {
    $$('.hazard-tab').forEach(button => button.addEventListener('click', () => {
      state.hazard = button.dataset.hazard;
      render();
    }));
    M.LEVERS.forEach(key => $('#' + key).addEventListener('input', (event) => {
      const otherSpent = M.spent(state.allocation) - state.allocation[key];
      state.allocation[key] = Math.max(0, Math.min(M.BUDGET - otherSpent, Number(event.target.value) || 0));
      render();
    }));
    $$('[data-preset]').forEach(button => button.addEventListener('click', () => {
      state.allocation = { ...M.PRESETS[button.dataset.preset] };
      render();
      showToast('Strategy applied. The city model has updated.');
    }));
    $$('[data-view]').forEach(button => button.addEventListener('click', () => selectView(button.dataset.view)));
    $('#howButton').addEventListener('click', () => selectView('notes'));
    $('#saveButton').addEventListener('click', saveScenario);
    $('#exportButton').addEventListener('click', exportReport);
    $('#resetButton').addEventListener('click', () => {
      state.hazard = 'heat';
      state.allocation = { ...M.INITIAL };
      state.selectedDistrict = 'midtown';
      render();
      showToast('Studio reset to its starting scenario.');
    });
    updateSavedCount();
    render();
  }
  init();
})();
