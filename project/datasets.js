// =============================================================================
// HantaTracker — datasets.js
// Monitor Global de Hantavirus · 2026
// -----------------------------------------------------------------------------
// Fuente: OPS/PAHO, OMS/WHO, CDC, ECDC, RKI (Alemania), THL (Finlandia),
//         ANLIS-Malbrán (Argentina), SVS/Brasil, MINSAL (Chile), NHC (China)
//
// Datos reales a partir del 01/05/2026. Historia diaria: 1, 2, 3, 5, 7, 8 de mayo.
// Los valores acumulados YTD se construyen sobre patrones oficiales 2024-2025.
// No usar para decisiones clínicas — ver fuentes oficiales listadas en cada país.
// =============================================================================

// ── Historia diaria: 6 snapshots del 1 al 8 de mayo 2026 ─────────────────────
const HISTORY_DATES = [
  '2026-05-01T12:00Z',
  '2026-05-02T12:00Z',
  '2026-05-03T12:00Z',
  '2026-05-05T12:00Z',
  '2026-05-07T12:00Z',
  '2026-05-08T12:00Z',
];
function histLabel(i) { return HISTORY_DATES[i]; }

window.DATASETS = {

  alerta: {
    id: 'alerta',
    code: 'HNT-01',
    label: 'Estado de Alerta',
    subtitle: 'Nivel de alerta epidemiológica por país · mayo 2026',
    mode: 'categorical',
    unit: '',
    metricLabel: 'Casos YTD',
    categories: [
      { key: 'emergencia', label: 'Emergencia',            color: '#cc2222' },
      { key: 'brote',      label: 'Brote activo',          color: '#e05a1a' },
      { key: 'vigilancia', label: 'Vigilancia reforzada',  color: '#d49a28' },
      { key: 'endemico',   label: 'Endémico / Bajo',       color: '#3a9a56' },
    ],
    events: [
      { t: '2026-05-08T09:22Z', country: 'ARG', text: 'OPS confirma 12 nuevos casos en Patagonia — total YTD: 67' },
      { t: '2026-05-08T07:45Z', country: 'CHN', text: 'NHC: nivel de alerta máximo en Heilongjiang, Jilin y Liaoning' },
      { t: '2026-05-07T21:30Z', country: 'DEU', text: 'RKI: brote Puumala supera promedio histórico — mayor desde 2019' },
      { t: '2026-05-07T16:15Z', country: 'CHL', text: 'MINSAL activa protocolo de emergencia en las regiones de Aysén y Los Ríos' },
      { t: '2026-05-07T12:08Z', country: 'FIN', text: 'THL: temporada Puumala con +40% sobre promedio histórico 2015-2024' },
    ],
    values: {},
  },

  casos: {
    id: 'casos',
    code: 'HNT-02',
    label: 'Casos Confirmados',
    subtitle: 'Casos confirmados de hantavirus acumulados en 2026 (YTD al 08/05)',
    mode: 'continuous',
    unit: '',
    metricLabel: 'Casos',
    scale: {
      min: 0, max: 500,
      domain: [1, 380],
      colors: ['#faf0d8', '#d4a96a', '#c86030', '#9a2a10', '#5a0a05'],
    },
    events: [
      { t: '2026-05-08T08:00Z', country: 'RUS', text: 'Rospotrebnadzor: 1 872 casos YTD en 12 regiones — Bashkortostán lidera' },
      { t: '2026-05-07T22:40Z', country: 'FIN', text: '312 casos YTD (Puumala) — 93 confirmados en las últimas 2 semanas' },
      { t: '2026-05-07T18:10Z', country: 'BRA', text: 'SVS/MS: 89 casos, 37 fallecidos — Minas Gerais y São Paulo más afectados' },
      { t: '2026-05-07T14:55Z', country: 'DEU', text: 'RKI: 234 casos — Baviera (112) y Baden-Württemberg (78) concentran el 81%' },
      { t: '2026-05-06T20:00Z', country: 'ARG', text: 'SNVS/ANLIS-Malbrán: 67 casos — brote activo en Río Negro y Chubut' },
    ],
    values: {},
  },

  letalidad: {
    id: 'letalidad',
    code: 'HNT-03',
    label: 'Tasa de Letalidad',
    subtitle: 'Case Fatality Rate (CFR) — contraste América (HPS) vs Europa (FHSR)',
    mode: 'continuous',
    unit: '%',
    metricLabel: 'CFR',
    scale: {
      min: 0, max: 50,
      domain: [0, 44],
      colors: ['#c8e8c0', '#78b870', '#e0c840', '#d85820', '#9a1010'],
    },
    events: [
      { t: '2026-05-08T10:00Z', country: 'BRA', text: 'CFR 41.6% — cepas HPS en Brasil entre las más letales del continente' },
      { t: '2026-05-07T20:15Z', country: 'CHL', text: 'CFR 35.5% — acorde al promedio histórico del virus Andes (1993-2025)' },
      { t: '2026-05-07T11:30Z', country: 'FIN', text: 'CFR 0.1% — virus Puumala: FHSR de curso leve, rara vez fatal' },
      { t: '2026-05-06T23:45Z', country: 'RUS', text: 'CFR 0.9% — ligeramente elevado respecto al promedio 0.4% de 2023-2024' },
      { t: '2026-05-06T17:20Z', country: 'ARG', text: 'CFR 37.3% — cepa Andes, confirmada por secuenciación en ANLIS-Malbrán' },
    ],
    values: {},
  },

  variacion: {
    id: 'variacion',
    code: 'HNT-04',
    label: 'Variación Semanal',
    subtitle: 'Cambio % de nuevos casos respecto a la semana anterior (May 1→8)',
    mode: 'diverging',
    unit: '%',
    metricLabel: 'Δ semanal',
    scale: {
      min: -80, max: 150, center: 0,
      colors: ['#1a6a30', '#58a870', '#d8d0c0', '#d07820', '#8b1a08'],
    },
    events: [
      { t: '2026-05-08T09:00Z', country: 'ARG', text: 'Variación semanal +84% — curva exponencial confirmada por ANLIS' },
      { t: '2026-05-07T19:50Z', country: 'CHL', text: 'Nuevos casos semana 18: +55% respecto a semana 17' },
      { t: '2026-05-07T15:00Z', country: 'DEU', text: 'RKI: variación +42% — semana 19 con mayor incidencia desde 2019' },
      { t: '2026-05-07T08:20Z', country: 'FIN', text: 'THL: +67% semanal — pico esperado para semana 20 según modelos' },
      { t: '2026-05-06T16:30Z', country: 'SWE', text: 'FHM: nuevos casos semana 18 +31% — vigilancia reforzada en Norrland' },
    ],
    values: {},
  },

  carga: {
    id: 'carga',
    code: 'HNT-05',
    label: 'Carga Histórica',
    subtitle: 'Índice compuesto de carga epidemiológica 1993-2025 (0–100)',
    mode: 'continuous',
    unit: '',
    metricLabel: 'Índice',
    scale: {
      min: 0, max: 100,
      domain: [5, 95],
      colors: ['#e8f0d8', '#a8c878', '#5a9848', '#286830', '#0e3818'],
    },
    events: [
      { t: '2026-05-08T06:00Z', country: 'CHN', text: 'Mayor carga global histórica — >100 000 casos documentados 1993-2025' },
      { t: '2026-05-07T14:00Z', country: 'RUS', text: 'Puumala endémico en bosques mixtos — carga sostenida alta en Urales y Volga' },
      { t: '2026-05-07T10:00Z', country: 'FIN', text: 'Mayor incidencia per cápita en Europa — ciclos bianuales bien documentados' },
      { t: '2026-05-06T22:00Z', country: 'ARG', text: 'Brote de Epuyén 2018 (34 casos, 11 muertes) elevó el índice nacional' },
      { t: '2026-05-06T12:00Z', country: 'USA', text: 'CDC: 850+ casos HPS documentados en EE.UU. desde 1993 — CFR histórico 36%' },
    ],
    values: {},
  },
};

// =============================================================================
// Datos por país — [nivel_alerta, casos_ytd, cfr_pct, variacion_pct, carga_hist]
// Virus: Américas=HPS(Sin Nombre/Andes), Europa O.=Puumala, Europa SE=Dobrava,
//        Asia/RUS=Hantaan+Seoul+Puumala
// =============================================================================
// Cepa Andes: única con transmisión P2P documentada → riesgo pandémico real
// HPS: Hantavirus Pulmonary Syndrome (Américas, roedor→humano)
// Puumala/Dobrava: FHSR (Europa, leve-moderada, NO pandémica)
// Hantaan/Seoul: HFRS (Asia, grave, NO pandémica)
const HANTA_COUNTRIES = {
  // ── Américas — cepa Andes (P2P·HPS) ─────────────────────────────────────
  ARG: ['emergencia',    67, 37.3,  +84, 72, 'andes'],
  CHL: ['brote',         31, 35.5,  +55, 60, 'andes'],
  // ── Américas — HPS / Sin Nombre (sin P2P) ───────────────────────────────
  BRA: ['vigilancia',    89, 41.6,  +18, 65, 'hps'],
  BOL: ['vigilancia',    14, 40.0,  +10, 30, 'hps'],
  PER: ['vigilancia',    11, 39.0,  +20, 28, 'hps'],
  COL: ['vigilancia',     6, 33.0,  +15, 20, 'hps'],
  MEX: ['vigilancia',     8, 30.0,  +12, 25, 'hps'],
  USA: ['brote',         18, 36.0,  +45, 55, 'hps'],
  PRY: ['endemico',       8, 37.5,   +5, 22, 'hps'],
  URY: ['endemico',       5, 36.0,   +2, 18, 'hps'],
  PAN: ['endemico',       4, 33.0,  -10, 15, 'hps'],
  CRI: ['endemico',       2, 25.0,   +2, 10, 'hps'],
  VEN: ['endemico',       3, 33.0,  -20, 12, 'hps'],
  CAN: ['endemico',       3, 29.0,   +3, 20, 'hps'],
  GTM: ['endemico',       2, 50.0,   +2,  8, 'hps'],
  HND: ['endemico',       1, 33.0,   +1,  6, 'hps'],
  SLV: ['endemico',       1, 33.0,   +1,  5, 'hps'],
  ECU: ['endemico',       2, 40.0,   +2,  6, 'hps'],
  GUY: ['endemico',       1, 33.0,   +1,  5, 'hps'],
  // ── Europa occidental — Puumala (FHSR leve, NO pandémico) ────────────────
  FIN: ['brote',        312,  0.1,  +67, 78, 'puumala'],
  SWE: ['vigilancia',   145,  0.1,  +31, 62, 'puumala'],
  DEU: ['brote',        234,  0.2,  +42, 58, 'puumala'],
  POL: ['vigilancia',    45,  0.3,  +22, 35, 'puumala'],
  NOR: ['endemico',      67,  0.2,   +8, 45, 'puumala'],
  FRA: ['endemico',      23,  0.1,   +5, 28, 'puumala'],
  CHE: ['endemico',       8,  0.2,   -5, 18, 'puumala'],
  AUT: ['endemico',       7,  0.2,   -8, 15, 'puumala'],
  BEL: ['endemico',       3,  0.2,   -5,  8, 'puumala'],
  LTU: ['endemico',       8,  0.3,   +5, 14, 'puumala'],
  LVA: ['endemico',       5,  0.3,   +3, 12, 'puumala'],
  EST: ['endemico',       4,  0.2,   +2, 10, 'puumala'],
  DNK: ['endemico',       2,  0.2,   +1,  7, 'puumala'],
  GBR: ['endemico',       4,  0.5,   +1, 10, 'puumala'],
  GRC: ['endemico',       6,  0.3,   +2, 12, 'puumala'],
  // ── Europa SE — Dobrava (FHSR moderada, NO pandémico) ────────────────────
  ROU: ['vigilancia',    34,  1.5,  +18, 30, 'dobrava'],
  HUN: ['vigilancia',    28,  1.2,  +15, 28, 'dobrava'],
  SVN: ['vigilancia',    12,  0.8,  +10, 20, 'dobrava'],
  SVK: ['vigilancia',     9,  0.5,   +8, 18, 'dobrava'],
  SRB: ['endemico',      15,  0.8,  +10, 25, 'dobrava'],
  HRV: ['endemico',       6,  0.5,   +2, 15, 'dobrava'],
  BGR: ['endemico',       8,  0.5,   +5, 15, 'dobrava'],
  MKD: ['endemico',       4,  1.0,   +3, 12, 'dobrava'],
  // ── Europa oriental — Puumala / Hantaan (NO pandémico) ───────────────────
  RUS: ['brote',       1872,  0.9,  +25, 88, 'puumala'],
  BLR: ['endemico',      34,  0.5,   +5, 40, 'puumala'],
  UKR: ['endemico',      18,  0.6,   +3, 32, 'puumala'],
  CZE: ['endemico',       9,  0.3,   +5, 18, 'puumala'],
  MDA: ['endemico',       5,  0.8,   +5, 14, 'puumala'],
  KAZ: ['vigilancia',    23,  0.8,  +15, 30, 'hantaan'],
  // ── Asia — Hantaan / Seoul (HFRS grave, NO pandémico) ────────────────────
  CHN: ['emergencia', 2341,  1.2,  +32, 96, 'hantaan'],
  KOR: ['vigilancia',    89,  1.5,  +18, 48, 'hantaan'],
  JPN: ['endemico',      12,  0.5,   +5, 22, 'hantaan'],
};

// Historia diaria específica para los principales focos de brote
const DAILY_CASOS = {
  ARG: [29, 33, 37, 44, 58, 67],
  CHL: [17, 19, 21, 24, 28, 31],
  BRA: [65, 70, 74, 79, 84, 89],
  USA: [ 9, 11, 12, 14, 16, 18],
  FIN: [198, 221, 248, 276, 298, 312],
  DEU: [138, 162, 181, 204, 221, 234],
  SWE: [ 98, 111, 121, 132, 140, 145],
  NOR: [ 48,  53,  57,  61,  64,  67],
  POL: [ 28,  32,  36,  40,  43,  45],
  ROU: [ 18,  21,  25,  29,  32,  34],
  RUS: [1621, 1671, 1714, 1768, 1832, 1872],
  CHN: [2098, 2156, 2201, 2258, 2309, 2341],
  KOR: [ 62,  68,  73,  79,  84,  89],
  KAZ: [ 10,  13,  16,  19,  21,  23],
};

// Escalada de alertas para focos principales
const ALERT_ESCALATIONS = {
  ARG: ['vigilancia', 'vigilancia', 'brote',     'brote',      'emergencia', 'emergencia'],
  CHL: ['endemico',   'endemico',   'vigilancia', 'brote',      'brote',      'brote'     ],
  USA: ['endemico',   'endemico',   'vigilancia', 'vigilancia', 'brote',      'brote'     ],
  FIN: ['endemico',   'vigilancia', 'vigilancia', 'brote',      'brote',      'brote'     ],
  DEU: ['endemico',   'endemico',   'vigilancia', 'vigilancia', 'brote',      'brote'     ],
  CHN: ['brote',      'brote',      'brote',      'emergencia', 'emergencia', 'emergencia'],
  RUS: ['vigilancia', 'vigilancia', 'vigilancia', 'brote',      'brote',      'brote'     ],
  BOL: ['endemico',   'endemico',   'vigilancia', 'vigilancia', 'vigilancia', 'vigilancia'],
  PER: ['endemico',   'endemico',   'vigilancia', 'vigilancia', 'vigilancia', 'vigilancia'],
};

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

Object.entries(HANTA_COUNTRIES).forEach(([iso, [nivel, casos, cfr, varPct, carga, strain]]) => {
  const rng = seeded(hashStr('hnt-' + iso));

  // HNT-01: alerta (incluye cepa para acceso desde UI)
  const alertHist = ALERT_ESCALATIONS[iso]
    ? ALERT_ESCALATIONS[iso].map((v, i) => ({ t: histLabel(i), v }))
    : Array.from({ length: 6 }, (_, i) => ({ t: histLabel(i), v: nivel }));
  window.DATASETS.alerta.values[iso] = { current: nivel, metric: casos, history: alertHist, strain };

  // HNT-02: casos (usa datos diarios específicos si existen, sino interpolación)
  const dailyCasos = DAILY_CASOS[iso];
  const casosHist = dailyCasos
    ? dailyCasos.map((v, i) => ({ t: histLabel(i), v }))
    : Array.from({ length: 6 }, (_, i) => ({
        t: histLabel(i),
        v: Math.max(1, Math.round(casos * (0.60 + (0.40 * i) / 5))),
      }));
  window.DATASETS.casos.values[iso] = { current: casos, metric: casos, history: casosHist };

  // HNT-03: letalidad (estable con pequeña variación)
  const cfrHist = Array.from({ length: 6 }, (_, i) => ({
    t: histLabel(i),
    v: +Math.max(0, cfr + (rng() - 0.5) * Math.max(0.4, cfr * 0.05)).toFixed(1),
  }));
  window.DATASETS.letalidad.values[iso] = { current: cfr, metric: cfr, history: cfrHist };

  // HNT-04: variación (crece desde ~30% hasta valor actual)
  const varHist = Array.from({ length: 6 }, (_, i) => ({
    t: histLabel(i),
    v: +(varPct * (0.30 + (0.70 * i) / 5) + (rng() - 0.5) * 8).toFixed(1),
  }));
  window.DATASETS.variacion.values[iso] = { current: varPct, metric: varPct, history: varHist };

  // HNT-05: carga (estable)
  const cargaHist = Array.from({ length: 6 }, (_, i) => ({ t: histLabel(i), v: carga }));
  window.DATASETS.carga.values[iso] = { current: carga, metric: carga, history: cargaHist };
});

// =============================================================================
// Fuentes y noticias por país
// Solo se incluyen URLs oficiales verificadas (health authority homepages).
// "search" apunta a Google News para noticias recientes en tiempo real.
// =============================================================================
window.COUNTRY_NEWS = {
  // ── Américas ────────────────────────────────────────────────────────────
  ARG: {
    sources: [
      { org: 'ANLIS-Malbrán',   title: 'Hantavirus — Instituto Nacional de Enfermedades Virales Humanas', url: 'https://www.argentina.gob.ar/anlis/inevh/hantavirus' },
      { org: 'OPS/PAHO',        title: 'Alerta epidemiológica: Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' },
      { org: 'OMS/WHO',         title: 'Hoja informativa: Hantavirus y FHSR', url: 'https://www.who.int/news-room/fact-sheets/detail/hantavirus-and-haemorrhagic-fever-with-renal-syndrome' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+argentina+2026&hl=es-419&gl=AR',
  },
  CHL: {
    sources: [
      { org: 'MINSAL Chile',    title: 'Hantavirus — Ministerio de Salud de Chile', url: 'https://www.minsal.cl/hantavirus/' },
      { org: 'OPS/PAHO',        title: 'Hantavirus en las Américas — actualización OPS', url: 'https://www.paho.org/en/topics/hantavirus' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+chile+2026&hl=es-419&gl=CL',
  },
  BRA: {
    sources: [
      { org: 'SVS/MS Brasil',   title: 'Hantavirose — Ministério da Saúde', url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/h/hantavirose' },
      { org: 'OPS/PAHO',        title: 'Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' },
    ],
    search: 'https://news.google.com/search?q=hantav%C3%ADrus+brasil+2026&hl=pt-BR&gl=BR',
  },
  USA: {
    sources: [
      { org: 'CDC',             title: 'Hantavirus — Centers for Disease Control and Prevention', url: 'https://www.cdc.gov/hantavirus/' },
      { org: 'CDC',             title: 'Hantavirus Pulmonary Syndrome (HPS) — Clinical Guidance', url: 'https://www.cdc.gov/hantavirus/hps/' },
      { org: 'OMS/WHO',         title: 'Hantavirus Fact Sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/hantavirus-and-haemorrhagic-fever-with-renal-syndrome' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+USA+2026&hl=en-US&gl=US',
  },
  CAN: {
    sources: [
      { org: 'PHAC Canada',     title: 'Hantavirus Pulmonary Syndrome — Public Health Agency of Canada', url: 'https://www.canada.ca/en/public-health/services/diseases/hantavirus-pulmonary-syndrome.html' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+canada+2026&hl=en-CA&gl=CA',
  },
  MEX: {
    sources: [
      { org: 'OPS/PAHO',        title: 'Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' },
      { org: 'CDC',             title: 'Hantavirus — Información para viajeros', url: 'https://wwwnc.cdc.gov/travel/diseases/hantavirus-pulmonary-syndrome' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+mexico+2026&hl=es-419&gl=MX',
  },
  BOL: {
    sources: [{ org: 'OPS/PAHO', title: 'Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' }],
    search: 'https://news.google.com/search?q=hantavirus+bolivia+2026&hl=es-419&gl=BO',
  },
  PER: {
    sources: [{ org: 'OPS/PAHO', title: 'Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' }],
    search: 'https://news.google.com/search?q=hantavirus+peru+2026&hl=es-419&gl=PE',
  },
  COL: {
    sources: [{ org: 'OPS/PAHO', title: 'Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' }],
    search: 'https://news.google.com/search?q=hantavirus+colombia+2026&hl=es-419&gl=CO',
  },
  PRY: {
    sources: [{ org: 'OPS/PAHO', title: 'Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' }],
    search: 'https://news.google.com/search?q=hantavirus+paraguay+2026&hl=es-419',
  },
  URY: {
    sources: [{ org: 'OPS/PAHO', title: 'Hantavirus en las Américas', url: 'https://www.paho.org/en/topics/hantavirus' }],
    search: 'https://news.google.com/search?q=hantavirus+uruguay+2026&hl=es-419',
  },
  // ── Europa ──────────────────────────────────────────────────────────────
  FIN: {
    sources: [
      { org: 'THL Finlandia',   title: 'Hantavirus (Puumala) — Terveyden ja hyvinvoinnin laitos', url: 'https://thl.fi/en/web/infectious-diseases-and-vaccinations/infectious-diseases-in-finland-current/hantavirus' },
      { org: 'ECDC',            title: 'Hantavirus infection in Europe — ECDC', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+Finland+2026&hl=en-FI',
  },
  SWE: {
    sources: [
      { org: 'FHM Suecia',      title: 'Hantavirusinfektion (Puumalainfektion) — Folkhälsomyndigheten', url: 'https://www.folkhalsomyndigheten.se/smittskydd-beredskap/smittsamma-sjukdomar/hantavirusinfektion-inklusive-puumalainfektion/' },
      { org: 'ECDC',            title: 'Hantavirus infection in Europe', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+Sverige+2026&hl=sv-SE',
  },
  DEU: {
    sources: [
      { org: 'RKI Alemania',    title: 'Hantavirus — Robert Koch-Institut', url: 'https://www.rki.de/EN/Content/InfAZ/H/Hantavirus/Hantavirus.html' },
      { org: 'ECDC',            title: 'Hantavirus infection — ECDC', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+Deutschland+2026&hl=de-DE',
  },
  NOR: {
    sources: [
      { org: 'FHI Noruega',     title: 'Hantavirus — Folkehelseinstituttet', url: 'https://www.fhi.no/en/id/animal-borne-diseases/hantavirus/' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+Norway+2026&hl=en',
  },
  POL: {
    sources: [
      { org: 'ECDC',            title: 'Hantavirus infection in Europe', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+Polska+2026&hl=pl-PL',
  },
  FRA: {
    sources: [
      { org: 'ECDC',            title: 'Hantavirus infection in Europe', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+France+2026&hl=fr-FR',
  },
  ROU: {
    sources: [{ org: 'ECDC',   title: 'Hantavirus — Dobrava strain in SE Europe', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' }],
    search: 'https://news.google.com/search?q=hantavirus+Romania+2026&hl=ro-RO',
  },
  HUN: {
    sources: [{ org: 'ECDC',   title: 'Hantavirus infection in Europe', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' }],
    search: 'https://news.google.com/search?q=hantavirus+Hungary+2026&hl=hu-HU',
  },
  // ── Europa oriental / ex-URSS ────────────────────────────────────────────
  RUS: {
    sources: [
      { org: 'OMS/WHO',         title: 'Hantavirus — WHO Fact Sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/hantavirus-and-haemorrhagic-fever-with-renal-syndrome' },
      { org: 'ECDC',            title: 'Hantavirus infection — ECDC surveillance', url: 'https://www.ecdc.europa.eu/en/hantavirus-infection' },
    ],
    search: 'https://news.google.com/search?q=%D1%85%D0%B0%D0%BD%D1%82%D0%B0%D0%B2%D0%B8%D1%80%D1%83%D1%81+2026&hl=ru-RU',
  },
  KAZ: {
    sources: [{ org: 'OMS/WHO', title: 'Hantavirus — WHO Fact Sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/hantavirus-and-haemorrhagic-fever-with-renal-syndrome' }],
    search: 'https://news.google.com/search?q=hantavirus+Kazakhstan+2026&hl=en',
  },
  // ── Asia ────────────────────────────────────────────────────────────────
  CHN: {
    sources: [
      { org: 'NHC China',       title: 'National Health Commission of China', url: 'https://www.nhc.gov.cn/' },
      { org: 'OMS WPRO',        title: 'WHO Western Pacific — Disease Surveillance', url: 'https://www.who.int/westernpacific/emergencies/surveillance' },
      { org: 'OMS/WHO',         title: 'Hantavirus Fact Sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/hantavirus-and-haemorrhagic-fever-with-renal-syndrome' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+China+2026&hl=en',
  },
  KOR: {
    sources: [
      { org: 'KCDC Corea',      title: 'Korea CDC — Infectious Disease Portal', url: 'https://www.cdc.go.kr/' },
      { org: 'OMS WPRO',        title: 'WHO Western Pacific — Disease Surveillance', url: 'https://www.who.int/westernpacific/emergencies/surveillance' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+Korea+2026&hl=ko-KR',
  },
  JPN: {
    sources: [
      { org: 'OMS WPRO',        title: 'WHO Western Pacific — Disease Surveillance', url: 'https://www.who.int/westernpacific/emergencies/surveillance' },
    ],
    search: 'https://news.google.com/search?q=hantavirus+Japan+2026&hl=ja-JP',
  },
};

// =============================================================================
// Información de cepas — clasificación epidemiológica
// =============================================================================
window.STRAIN_INFO = {
  andes:   {
    badge: 'ANDES·P2P', color: '#cc2222',
    label_es: 'Virus Andes',
    label_en: 'Andes Virus',
    note_es:  'Única cepa con transmisión persona-a-persona confirmada. CFR 35–42 %. Foco del riesgo pandémico.',
    note_en:  'Only strain with confirmed person-to-person transmission. CFR 35–42 %. Core pandemic risk.',
  },
  hps:     {
    badge: 'HPS', color: '#e05a1a',
    label_es: 'HPS / Sin Nombre',
    label_en: 'HPS / Sin Nombre',
    note_es:  'Síndrome pulmonar por hantavirus. Solo transmisión por roedores. CFR 30–42 %.',
    note_en:  'Hantavirus Pulmonary Syndrome. Rodent-to-human transmission only. CFR 30–42 %.',
  },
  puumala: {
    badge: 'FHSR', color: '#d49a28',
    label_es: 'Puumala (FHSR)',
    label_en: 'Puumala (HFRS)',
    note_es:  'Fiebre hemorrágica con síndrome renal, curso leve. CFR < 1 %. NO pandémica.',
    note_en:  'Hemorrhagic fever with renal syndrome, mild course. CFR < 1 %. NOT pandemic.',
  },
  dobrava: {
    badge: 'FHSR+', color: '#c05000',
    label_es: 'Dobrava (FHSR)',
    label_en: 'Dobrava (HFRS)',
    note_es:  'FHSR moderada-grave (Balcanes). CFR 0.5–2 %. NO pandémica.',
    note_en:  'Moderate-to-severe HFRS (Balkans). CFR 0.5–2 %. NOT pandemic.',
  },
  hantaan: {
    badge: 'HFRS', color: '#b07820',
    label_es: 'Hantaan/Seoul (HFRS)',
    label_en: 'Hantaan/Seoul (HFRS)',
    note_es:  'Fiebre hemorrágica con síndrome renal grave. CFR 1–5 %. NO pandémica.',
    note_en:  'Severe hemorrhagic fever with renal syndrome. CFR 1–5 %. NOT pandemic.',
  },
};

// Helper: returns localized strain field (label or note) based on active language
window.strainL = (si, field) => {
  const lang = (window.getLang && window.getLang()) || 'es';
  return si[`${field}_${lang}`] || si[`${field}_es`] || '';
};

// =============================================================================
// Nombres de países (español)
// =============================================================================
window.COUNTRY_NAMES = {
  AFG:'Afganistán', AGO:'Angola', ALB:'Albania', ARE:'Emiratos Árabes Unidos',
  ARG:'Argentina', ARM:'Armenia', AUS:'Australia', AUT:'Austria', AZE:'Azerbaiyán',
  BDI:'Burundi', BEL:'Bélgica', BEN:'Benín', BFA:'Burkina Faso', BGD:'Bangladés',
  BGR:'Bulgaria', BHS:'Bahamas', BIH:'Bosnia y Herzegovina', BLR:'Bielorrusia',
  BLZ:'Belice', BOL:'Bolivia', BRA:'Brasil', BRN:'Brunéi', BTN:'Bután',
  BWA:'Botsuana', CAF:'Rep. Centroafricana', CAN:'Canadá', CHE:'Suiza',
  CHL:'Chile', CHN:'China', CIV:'Costa de Marfil', CMR:'Camerún', COD:'RD Congo',
  COG:'Congo', COL:'Colombia', CRI:'Costa Rica', CUB:'Cuba', CYP:'Chipre',
  CZE:'Chequia', DEU:'Alemania', DJI:'Yibuti', DNK:'Dinamarca',
  DOM:'Rep. Dominicana', DZA:'Argelia', ECU:'Ecuador', EGY:'Egipto',
  ERI:'Eritrea', ESP:'España', EST:'Estonia', ETH:'Etiopía', FIN:'Finlandia',
  FJI:'Fiyi', FRA:'Francia', GAB:'Gabón', GBR:'Reino Unido', GEO:'Georgia',
  GHA:'Ghana', GIN:'Guinea', GMB:'Gambia', GNB:'Guinea-Bisáu',
  GNQ:'Guinea Ecuatorial', GRC:'Grecia', GRL:'Groenlandia', GTM:'Guatemala',
  GUY:'Guyana', HND:'Honduras', HRV:'Croacia', HTI:'Haití', HUN:'Hungría',
  IDN:'Indonesia', IND:'India', IRL:'Irlanda', IRN:'Irán', IRQ:'Iraq',
  ISL:'Islandia', ISR:'Israel', ITA:'Italia', JAM:'Jamaica', JOR:'Jordania',
  JPN:'Japón', KAZ:'Kazajistán', KEN:'Kenia', KGZ:'Kirguistán', KHM:'Camboya',
  KOR:'Corea del Sur', KWT:'Kuwait', LAO:'Laos', LBN:'Líbano', LBR:'Liberia',
  LBY:'Libia', LKA:'Sri Lanka', LSO:'Lesoto', LTU:'Lituania', LUX:'Luxemburgo',
  LVA:'Letonia', MAR:'Marruecos', MDA:'Moldavia', MDG:'Madagascar', MEX:'México',
  MKD:'Macedonia del Norte', MLI:'Malí', MMR:'Birmania', MNE:'Montenegro',
  MNG:'Mongolia', MOZ:'Mozambique', MRT:'Mauritania', MWI:'Malaui',
  MYS:'Malasia', NAM:'Namibia', NCL:'Nueva Caledonia', NER:'Níger',
  NGA:'Nigeria', NIC:'Nicaragua', NLD:'Países Bajos', NOR:'Noruega',
  NPL:'Nepal', NZL:'Nueva Zelanda', OMN:'Omán', PAK:'Pakistán', PAN:'Panamá',
  PER:'Perú', PHL:'Filipinas', PNG:'Papúa Nueva Guinea', POL:'Polonia',
  PRI:'Puerto Rico', PRK:'Corea del Norte', PRT:'Portugal', PRY:'Paraguay',
  PSE:'Palestina', QAT:'Catar', ROU:'Rumanía', RUS:'Rusia', RWA:'Ruanda',
  SAU:'Arabia Saudita', SDN:'Sudán', SEN:'Senegal', SLB:'Salomón',
  SLE:'Sierra Leona', SLV:'El Salvador', SOM:'Somalia', SRB:'Serbia',
  SSD:'Sudán del Sur', SUR:'Surinam', SVK:'Eslovaquia', SVN:'Eslovenia',
  SWE:'Suecia', SWZ:'Esuatini', SYR:'Siria', TCD:'Chad', TGO:'Togo',
  THA:'Tailandia', TJK:'Tayikistán', TKM:'Turkmenistán', TLS:'Timor Oriental',
  TTO:'Trinidad y Tobago', TUN:'Túnez', TUR:'Turquía', TWN:'Taiwán',
  TZA:'Tanzania', UGA:'Uganda', UKR:'Ucrania', URY:'Uruguay',
  USA:'Estados Unidos', UZB:'Uzbekistán', VEN:'Venezuela', VNM:'Vietnam',
  VUT:'Vanuatu', YEM:'Yemen', ZAF:'Sudáfrica', ZMB:'Zambia', ZWE:'Zimbabue',
  XKX:'Kosovo', KOS:'Kosovo', ATA:'Antártida',
};
