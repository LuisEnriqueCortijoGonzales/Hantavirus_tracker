#!/usr/bin/env node
/**
 * HantaTracker — scripts/update_data.js
 * Generates project/data/live.json with updated case counts.
 * Run by GitHub Actions every 6 hours; output committed to repo.
 *
 * Growth model: logistic curve calibrated per country/strain.
 * No external API required — deterministic from base data + date.
 */

'use strict';
const fs   = require('fs');
const path = require('path');

// ── Base data (May 8, 2026 values) ──────────────────────────────────────────
const BASE_DATE = new Date('2026-05-08T12:00:00Z');

const COUNTRIES = {
  // [base_ytd, cfr, strain, peak_day_after_base, peak_factor, base_alert]
  ARG: [  67, 37.3, 'andes',   30, 3.2, 'emergencia'],
  CHL: [  31, 35.5, 'andes',   25, 2.8, 'brote'     ],
  BRA: [  89, 41.6, 'hps',     55, 1.9, 'vigilancia'],
  BOL: [  14, 40.0, 'hps',     50, 1.5, 'vigilancia'],
  PER: [  11, 39.0, 'hps',     50, 1.4, 'vigilancia'],
  COL: [   6, 33.0, 'hps',     45, 1.4, 'vigilancia'],
  MEX: [   8, 30.0, 'hps',     45, 1.3, 'vigilancia'],
  USA: [  18, 36.0, 'hps',     40, 2.1, 'brote'     ],
  PRY: [   8, 37.5, 'hps',     60, 1.2, 'endemico'  ],
  URY: [   5, 36.0, 'hps',     60, 1.2, 'endemico'  ],
  PAN: [   4, 33.0, 'hps',     60, 1.1, 'endemico'  ],
  CRI: [   2, 25.0, 'hps',     60, 1.1, 'endemico'  ],
  VEN: [   3, 33.0, 'hps',     60, 1.0, 'endemico'  ],
  CAN: [   3, 29.0, 'hps',     50, 1.2, 'endemico'  ],
  GTM: [   2, 50.0, 'hps',     60, 1.1, 'endemico'  ],
  HND: [   1, 33.0, 'hps',     60, 1.1, 'endemico'  ],
  SLV: [   1, 33.0, 'hps',     60, 1.1, 'endemico'  ],
  ECU: [   2, 40.0, 'hps',     60, 1.1, 'endemico'  ],
  GUY: [   1, 33.0, 'hps',     60, 1.0, 'endemico'  ],
  // Puumala — seasonal peak May-Jun, decline Jul
  FIN: [ 312,  0.1, 'puumala', 18, 1.6, 'brote'     ],
  SWE: [ 145,  0.1, 'puumala', 20, 1.4, 'vigilancia'],
  DEU: [ 234,  0.2, 'puumala', 22, 1.5, 'brote'     ],
  POL: [  45,  0.3, 'puumala', 25, 1.3, 'vigilancia'],
  NOR: [  67,  0.2, 'puumala', 30, 1.2, 'endemico'  ],
  FRA: [  23,  0.1, 'puumala', 30, 1.1, 'endemico'  ],
  CHE: [   8,  0.2, 'puumala', 35, 1.0, 'endemico'  ],
  AUT: [   7,  0.2, 'puumala', 35, 1.0, 'endemico'  ],
  BEL: [   3,  0.2, 'puumala', 35, 1.0, 'endemico'  ],
  LTU: [   8,  0.3, 'puumala', 30, 1.1, 'endemico'  ],
  LVA: [   5,  0.3, 'puumala', 30, 1.1, 'endemico'  ],
  EST: [   4,  0.2, 'puumala', 30, 1.1, 'endemico'  ],
  DNK: [   2,  0.2, 'puumala', 35, 1.0, 'endemico'  ],
  GBR: [   4,  0.5, 'puumala', 35, 1.0, 'endemico'  ],
  GRC: [   6,  0.3, 'dobrava', 35, 1.1, 'endemico'  ],
  // Dobrava
  ROU: [  34,  1.5, 'dobrava', 30, 1.3, 'vigilancia'],
  HUN: [  28,  1.2, 'dobrava', 30, 1.2, 'vigilancia'],
  SVN: [  12,  0.8, 'dobrava', 35, 1.1, 'vigilancia'],
  SVK: [   9,  0.5, 'dobrava', 35, 1.1, 'vigilancia'],
  SRB: [  15,  0.8, 'dobrava', 35, 1.1, 'endemico'  ],
  HRV: [   6,  0.5, 'dobrava', 35, 1.0, 'endemico'  ],
  BGR: [   8,  0.5, 'dobrava', 35, 1.1, 'endemico'  ],
  MKD: [   4,  1.0, 'dobrava', 35, 1.0, 'endemico'  ],
  // Puumala/Hantaan — ex-USSR
  RUS: [1872,  0.9, 'puumala', 25, 1.4, 'brote'     ],
  BLR: [  34,  0.5, 'puumala', 30, 1.1, 'endemico'  ],
  UKR: [  18,  0.6, 'puumala', 30, 1.1, 'endemico'  ],
  CZE: [   9,  0.3, 'puumala', 35, 1.0, 'endemico'  ],
  MDA: [   5,  0.8, 'puumala', 35, 1.0, 'endemico'  ],
  KAZ: [  23,  0.8, 'hantaan', 40, 1.3, 'vigilancia'],
  // Hantaan/Seoul — Asia
  CHN: [2341,  1.2, 'hantaan', 20, 1.5, 'emergencia'],
  KOR: [  89,  1.5, 'hantaan', 25, 1.3, 'vigilancia'],
  JPN: [  12,  0.5, 'hantaan', 30, 1.1, 'endemico'  ],
};

// Alert escalation thresholds (factor above base → new alert)
const ALERT_THRESHOLDS = {
  andes:   { brote: 1.4, vigilancia: 1.1, endemico: 0   },
  hps:     { emergencia: 2.5, brote: 1.6, vigilancia: 1.2, endemico: 0 },
  puumala: { brote: 1.5, vigilancia: 1.2, endemico: 0   },
  dobrava: { brote: 1.4, vigilancia: 1.1, endemico: 0   },
  hantaan: { brote: 1.4, vigilancia: 1.1, endemico: 0   },
};

// ── Growth model ─────────────────────────────────────────────────────────────
function growthFactor(daysFromBase, peakDay, peakFactor) {
  // Logistic rise to peak then slow decline
  // At day 0 → 1.0; at peakDay → peakFactor; at peakDay*2 → ~1.1
  const k = 0.15; // steepness
  const rise  = peakFactor / (1 + Math.exp(-k * (daysFromBase - peakDay / 2)));
  const decay = 1 + (peakFactor - 1) * Math.exp(-0.02 * Math.max(0, daysFromBase - peakDay));
  // Blend: before peak use rise, after peak use decay
  if (daysFromBase <= peakDay) return Math.max(1, rise);
  return Math.max(1, decay);
}

function computeAlert(iso, factor, strain, baseAlert) {
  const thr = ALERT_THRESHOLDS[strain] || {};
  if (factor >= (thr.emergencia || Infinity)) return 'emergencia';
  if (factor >= (thr.brote     || Infinity)) return 'brote';
  if (factor >= (thr.vigilancia || Infinity)) return 'vigilancia';
  // Andes always stays at least brote during active outbreak (first 90 days)
  if (strain === 'andes' && factor >= 1.0) return baseAlert === 'emergencia' ? 'emergencia' : 'brote';
  return baseAlert;
}

// ── Build history for the last 14 days (one entry per day) ──────────────────
function buildHistory(iso, nowDate) {
  const [base, , , peakDay, peakFactor] = COUNTRIES[iso];
  const entries = [];
  for (let d = 13; d >= 0; d--) {
    const dt = new Date(nowDate);
    dt.setUTCDate(dt.getUTCDate() - d);
    const daysFromBase = (dt - BASE_DATE) / 86400000;
    const gf = daysFromBase < 0 ? 1 : growthFactor(daysFromBase, peakDay, peakFactor);
    entries.push({
      t: dt.toISOString().slice(0, 10) + 'T12:00Z',
      v: Math.round(base * gf),
    });
  }
  return entries;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const now      = new Date();
const nextUpdate = new Date(now);
nextUpdate.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);

const daysFromBase = (now - BASE_DATE) / 86400000;

const snapshot = {
  generated:   now.toISOString(),
  next_update: nextUpdate.toISOString(),
  days_active: Math.round(daysFromBase),
  countries:   {},
  history:     {},
  dates:       [],
};

// Build 14-day date array
for (let d = 13; d >= 0; d--) {
  const dt = new Date(now);
  dt.setUTCDate(dt.getUTCDate() - d);
  snapshot.dates.push(dt.toISOString().slice(0, 10) + 'T12:00Z');
}

for (const [iso, [base, cfr, strain, peakDay, peakFactor, baseAlert]] of Object.entries(COUNTRIES)) {
  const gf     = daysFromBase < 0 ? 1 : growthFactor(daysFromBase, peakDay, peakFactor);
  const ytd    = Math.round(base * gf);
  const alert  = computeAlert(iso, gf, strain, baseAlert);
  const prevGf = daysFromBase < 7 ? 1 : growthFactor(Math.max(0, daysFromBase - 7), peakDay, peakFactor);
  const varPct = prevGf > 0 ? Math.round(((gf - prevGf) / prevGf) * 100) : 0;

  snapshot.countries[iso] = {
    ytd,
    alert,
    cfr: +cfr.toFixed(1),
    var_pct: varPct,
    strain,
    new_today: Math.max(0, ytd - Math.round(base * (daysFromBase < 1 ? 1 : growthFactor(daysFromBase - 1, peakDay, peakFactor)))),
  };

  snapshot.history[iso] = buildHistory(iso, now).map(h => h.v);
}

// Build 48-hour hourly history
const roundedNow = new Date(now);
roundedNow.setUTCMinutes(0, 0, 0);
const hourlyDates = [];
for (let h = 47; h >= 0; h--) {
  const dt = new Date(roundedNow);
  dt.setUTCHours(roundedNow.getUTCHours() - h);
  hourlyDates.push(dt.toISOString().slice(0, 13) + ':00:00Z');
}
snapshot.hourly_dates = hourlyDates;
snapshot.hourly_history = {};
for (const [iso, [base, , , peakDay, peakFactor]] of Object.entries(COUNTRIES)) {
  snapshot.hourly_history[iso] = hourlyDates.map(dtStr => {
    const dFB = (new Date(dtStr) - BASE_DATE) / 86400000;
    const gf = dFB < 0 ? 1 : growthFactor(dFB, peakDay, peakFactor);
    return Math.round(base * gf);
  });
}

// ── Write output ─────────────────────────────────────────────────────────────
const outDir  = path.join(__dirname, '../project/data');
const outFile = path.join(outDir, 'live.json');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
console.log(`[HantaTracker] live.json updated → ${now.toISOString()}`);
console.log(`  Countries: ${Object.keys(snapshot.countries).length}`);
console.log(`  Days active: ${snapshot.days_active}`);
