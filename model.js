/* Futureproof City — a deterministic, illustrative teaching model.
   No real city data, weather service, or AI predictions are involved. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FutureProofModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BUDGET = 100;
  const LEVERS = ['trees', 'drainage', 'backup', 'hubs'];
  const HAZARDS = {
    heat: {
      name: 'Heatwave', short: 'HEAT', description: 'Extended extreme temperatures',
      weights: { trees: 0.72, drainage: 0.05, backup: 0.13, hubs: 0.35 },
      color: '#ffa36d', atmospheric: 'High temperatures stress dense neighbourhoods and vulnerable residents.'
    },
    flood: {
      name: 'Flash flood', short: 'FLOOD', description: 'Intense rainfall and runoff',
      weights: { trees: 0.22, drainage: 0.78, backup: 0.10, hubs: 0.26 },
      color: '#72caff', atmospheric: 'Low-lying areas face rising water and access disruptions.'
    },
    blackout: {
      name: 'Grid outage', short: 'GRID', description: 'Prolonged power disruption',
      weights: { trees: 0.05, drainage: 0.09, backup: 0.82, hubs: 0.42 },
      color: '#d5a6ff', atmospheric: 'Power interruptions affect hospitals, transport and communication.'
    }
  };

  const DISTRICTS = [
    { id: 'northbank', name: 'Northbank', population: 21400, col: 0, row: 0,
      vulnerability: { heat: 0.55, flood: 0.44, blackout: 0.38 }, boosts: { trees: 1.12, drainage: 1, backup: 0.93, hubs: 1 } },
    { id: 'midtown', name: 'Midtown', population: 36500, col: 1, row: 0,
      vulnerability: { heat: 0.83, flood: 0.38, blackout: 0.77 }, boosts: { trees: 1.23, drainage: 0.95, backup: 1.17, hubs: 0.95 } },
    { id: 'eastpoint', name: 'Eastpoint', population: 18200, col: 2, row: 0,
      vulnerability: { heat: 0.67, flood: 0.53, blackout: 0.59 }, boosts: { trees: 1.0, drainage: 1.08, backup: 1, hubs: 1.03 } },
    { id: 'riverbend', name: 'Riverbend', population: 23400, col: 0, row: 1,
      vulnerability: { heat: 0.45, flood: 0.94, blackout: 0.52 }, boosts: { trees: 0.9, drainage: 1.3, backup: 0.96, hubs: 1.06 } },
    { id: 'oldtown', name: 'Old Town', population: 16300, col: 1, row: 1,
      vulnerability: { heat: 0.51, flood: 0.28, blackout: 0.45 }, boosts: { trees: 1.08, drainage: 0.92, backup: 0.94, hubs: 1.04 } },
    { id: 'southline', name: 'Southline', population: 27300, col: 2, row: 1,
      vulnerability: { heat: 0.75, flood: 0.73, blackout: 0.76 }, boosts: { trees: 1.0, drainage: 1.14, backup: 1.1, hubs: 1.2 } }
  ];

  const PRESETS = {
    balanced: { trees: 25, drainage: 25, backup: 25, hubs: 25 },
    green: { trees: 45, drainage: 15, backup: 10, hubs: 30 },
    flood: { trees: 15, drainage: 50, backup: 10, hubs: 25 },
    grid: { trees: 10, drainage: 10, backup: 55, hubs: 25 }
  };
  const INITIAL = { trees: 30, drainage: 25, backup: 20, hubs: 15 };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function sanitizeAllocation(value) {
    const input = value && typeof value === 'object' ? value : {};
    const out = {};
    let remaining = BUDGET;
    for (const key of LEVERS) {
      const raw = Number(input[key]);
      const clean = Number.isFinite(raw) ? clamp(Math.round(raw), 0, remaining) : 0;
      out[key] = clean;
      remaining -= clean;
    }
    return out;
  }

  function spent(allocation) {
    return LEVERS.reduce((sum, key) => sum + allocation[key], 0);
  }

  function districtRisk(district, hazard, allocation) {
    const definition = HAZARDS[hazard];
    if (!definition) throw new Error('Unknown hazard: ' + hazard);
    const base = clamp(18 + district.vulnerability[hazard] * 77, 15, 97);
    let reduction = 0;
    for (const key of LEVERS) {
      // The square root rewards early investment and imposes diminishing returns.
      const effort = Math.sqrt(clamp(allocation[key], 0, BUDGET) / BUDGET);
      reduction += effort * definition.weights[key] * district.boosts[key] * 41;
    }
    return Math.round(clamp(base - reduction, 6, 98) * 10) / 10;
  }

  function evaluate(hazard, providedAllocation) {
    if (!HAZARDS[hazard]) throw new Error('Unknown hazard: ' + hazard);
    const allocation = sanitizeAllocation(providedAllocation);
    const empty = { trees: 0, drainage: 0, backup: 0, hubs: 0 };
    const districts = DISTRICTS.map((district) => {
      const risk = districtRisk(district, hazard, allocation);
      const baselineRisk = districtRisk(district, hazard, empty);
      return {
        id: district.id, name: district.name, population: district.population,
        col: district.col, row: district.row, risk, baselineRisk,
        improvement: Math.round((baselineRisk - risk) * 10) / 10,
        level: risk >= 70 ? 'critical' : risk >= 52 ? 'elevated' : 'steady'
      };
    });
    const population = districts.reduce((sum, d) => sum + d.population, 0);
    const avgRisk = districts.reduce((sum, d) => sum + d.risk * d.population, 0) / population;
    const baselineRisk = districts.reduce((sum, d) => sum + d.baselineRisk * d.population, 0) / population;
    const atRisk = Math.round(districts.reduce((sum, d) => sum + (d.population * d.risk / 100), 0) / 100) * 100;
    const riskReduced = Math.max(0, Math.round((baselineRisk - avgRisk) * 10) / 10);
    const priorityDistrict = [...districts].sort((a, b) => b.risk - a.risk)[0];
    return {
      hazard, allocation, budget: BUDGET, spent: spent(allocation), remaining: BUDGET - spent(allocation),
      readiness: Math.round(100 - avgRisk), baselineReadiness: Math.round(100 - baselineRisk),
      risk: Math.round(avgRisk * 10) / 10, baselineRisk: Math.round(baselineRisk * 10) / 10,
      riskReduced, atRisk, population, districts, priorityDistrict
    };
  }

  function recommend(hazard, allocation) {
    const clean = sanitizeAllocation(allocation);
    const remaining = BUDGET - spent(clean);
    if (!remaining) return { key: null, gain: 0, message: 'All 100 credits are assigned. Rebalance a lever to explore a different approach.' };
    const step = Math.min(5, remaining);
    const current = evaluate(hazard, clean).risk;
    const choices = LEVERS.map(key => {
      const next = { ...clean, [key]: clean[key] + step };
      const gain = current - evaluate(hazard, next).risk;
      return { key, gain };
    }).sort((a, b) => b.gain - a.gain);
    return {
      ...choices[0], step,
      message: `Adding ${step} credits to ${({ trees: 'urban trees', drainage: 'drainage', backup: 'backup power', hubs: 'community hubs' })[choices[0].key]} yields the strongest immediate modeled reduction in average risk.`
    };
  }

  function timeline(hazard, allocation) {
    const clean = sanitizeAllocation(allocation);
    return Array.from({ length: 13 }, (_, month) => {
      const progress = Math.pow(month / 12, 0.83);
      const staged = Object.fromEntries(LEVERS.map(key => [key, clean[key] * progress]));
      const population = DISTRICTS.reduce((sum, d) => sum + d.population, 0);
      const weightedRisk = DISTRICTS.reduce((sum, d) => sum + districtRisk(d, hazard, staged) * d.population, 0) / population;
      return { month, readiness: Math.round((100 - weightedRisk) * 10) / 10 };
    });
  }

  return { BUDGET, LEVERS, HAZARDS, DISTRICTS, PRESETS, INITIAL, sanitizeAllocation, spent, districtRisk, evaluate, recommend, timeline };
});
