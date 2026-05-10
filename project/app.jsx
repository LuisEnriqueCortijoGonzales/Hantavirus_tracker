/* global React, ReactDOM, d3, topojson */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark"
}/*EDITMODE-END*/;

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const NUM_TO_A3 = {
  '004':'AFG','008':'ALB','012':'DZA','016':'ASM','020':'AND','024':'AGO','028':'ATG','031':'AZE','032':'ARG','036':'AUS',
  '040':'AUT','044':'BHS','048':'BHR','050':'BGD','051':'ARM','052':'BRB','056':'BEL','060':'BMU','064':'BTN','068':'BOL',
  '070':'BIH','072':'BWA','074':'BVT','076':'BRA','084':'BLZ','086':'IOT','090':'SLB','092':'VGB','096':'BRN','100':'BGR',
  '104':'MMR','108':'BDI','112':'BLR','116':'KHM','120':'CMR','124':'CAN','132':'CPV','136':'CYM','140':'CAF','144':'LKA',
  '148':'TCD','152':'CHL','156':'CHN','158':'TWN','162':'CXR','166':'CCK','170':'COL','174':'COM','175':'MYT','178':'COG',
  '180':'COD','184':'COK','188':'CRI','191':'HRV','192':'CUB','196':'CYP','203':'CZE','204':'BEN','208':'DNK','212':'DMA',
  '214':'DOM','218':'ECU','222':'SLV','226':'GNQ','231':'ETH','232':'ERI','233':'EST','234':'FRO','238':'FLK','239':'SGS',
  '242':'FJI','246':'FIN','250':'FRA','254':'GUF','258':'PYF','260':'ATF','262':'DJI','266':'GAB','268':'GEO','270':'GMB',
  '275':'PSE','276':'DEU','288':'GHA','292':'GIB','296':'KIR','300':'GRC','304':'GRL','308':'GRD','312':'GLP','316':'GUM',
  '320':'GTM','324':'GIN','328':'GUY','332':'HTI','334':'HMD','336':'VAT','340':'HND','344':'HKG','348':'HUN','352':'ISL',
  '356':'IND','360':'IDN','364':'IRN','368':'IRQ','372':'IRL','376':'ISR','380':'ITA','384':'CIV','388':'JAM','392':'JPN',
  '398':'KAZ','400':'JOR','404':'KEN','408':'PRK','410':'KOR','414':'KWT','417':'KGZ','418':'LAO','422':'LBN','426':'LSO',
  '428':'LVA','430':'LBR','434':'LBY','438':'LIE','440':'LTU','442':'LUX','446':'MAC','450':'MDG','454':'MWI','458':'MYS',
  '462':'MDV','466':'MLI','470':'MLT','474':'MTQ','478':'MRT','480':'MUS','484':'MEX','492':'MCO','496':'MNG','498':'MDA',
  '499':'MNE','500':'MSR','504':'MAR','508':'MOZ','512':'OMN','516':'NAM','520':'NRU','524':'NPL','528':'NLD','531':'CUW',
  '533':'ABW','534':'SXM','535':'BES','540':'NCL','548':'VUT','554':'NZL','558':'NIC','562':'NER','566':'NGA','570':'NIU',
  '574':'NFK','578':'NOR','580':'MNP','581':'UMI','583':'FSM','584':'MHL','585':'PLW','586':'PAK','591':'PAN','598':'PNG',
  '600':'PRY','604':'PER','608':'PHL','612':'PCN','616':'POL','620':'PRT','624':'GNB','626':'TLS','630':'PRI','634':'QAT',
  '638':'REU','642':'ROU','643':'RUS','646':'RWA','652':'BLM','654':'SHN','659':'KNA','660':'AIA','662':'LCA','663':'MAF',
  '666':'SPM','670':'VCT','674':'SMR','678':'STP','682':'SAU','686':'SEN','688':'SRB','690':'SYC','694':'SLE','702':'SGP',
  '703':'SVK','704':'VNM','705':'SVN','706':'SOM','710':'ZAF','716':'ZWE','724':'ESP','728':'SSD','729':'SDN','732':'ESH',
  '740':'SUR','744':'SJM','748':'SWZ','752':'SWE','756':'CHE','760':'SYR','762':'TJK','764':'THA','768':'TGO','772':'TKL',
  '776':'TON','780':'TTO','784':'ARE','788':'TUN','792':'TUR','795':'TKM','796':'TCA','798':'TUV','800':'UGA','804':'UKR',
  '807':'MKD','818':'EGY','826':'GBR','831':'GGY','832':'JEY','833':'IMN','834':'TZA','840':'USA','850':'VIR','854':'BFA',
  '858':'URY','860':'UZB','862':'VEN','876':'WLF','882':'WSM','887':'YEM','894':'ZMB','010':'ATA',
};

function nameOf(iso, fallback) {
  return (window.COUNTRY_NAMES && window.COUNTRY_NAMES[iso]) || fallback || iso;
}

function resolveColor(ds, val) {
  if (val == null) return 'var(--rule-soft)';
  if (ds.mode === 'categorical' || ds.mode === 'binary') {
    const cat = ds.categories.find(c => c.key === val);
    return cat ? cat.color : 'var(--ink-mute)';
  }
  if (ds.mode === 'continuous') {
    const { domain, colors } = ds.scale;
    const stops = d3.range(domain[0], domain[1] + 0.0001, (domain[1] - domain[0]) / (colors.length - 1));
    return d3.scaleLinear().domain(stops).range(colors).clamp(true)(val);
  }
  if (ds.mode === 'diverging') {
    const { min, max, center, colors } = ds.scale;
    const stops = [min, (min + center) / 2, center, (max + center) / 2, max];
    return d3.scaleLinear().domain(stops).range(colors).clamp(true)(val);
  }
  return '#666';
}

function fmt(ds, v) {
  if (v == null) return '—';
  if (ds.mode === 'categorical' || ds.mode === 'binary') {
    const cat = ds.categories.find(c => c.key === v);
    if (!cat) return '—';
    const tKey = 'cat.' + cat.key;
    const translated = window.t?.(tKey);
    return (translated && translated !== tKey) ? translated : cat.label;
  }
  if (ds.mode === 'continuous') return `${Number(v).toFixed(0)}${ds.unit}`;
  if (ds.mode === 'diverging') return `${v > 0 ? '+' : ''}${Number(v).toFixed(1).replace(/\.?0+$/, '')}${ds.unit}`;
  return String(v);
}

function valueAt(ds, iso, step) {
  const rec = ds.values[iso];
  if (!rec) return null;
  if (step >= 5) return rec.current;
  if (rec.history && rec.history[step]) return rec.history[step].v;
  return rec.current;
}

function dateLabel(isoStr) {
  const parts = isoStr.slice(0, 10).split('-');
  return `${parts[2]}/${parts[1]}`;
}

function calcPandemicProb() {
  // Si el backend (Pi) ya pre-calculó la probabilidad, úsala.
  const live = window.LIVE_DATA?.pandemic;
  if (live && typeof live.composite === 'number') {
    return {
      composite:  live.composite,
      epidemio:   live.epidemio,
      polymarket: live.polymarket,
      kalshi:     live.kalshi,
      maxAndesR0: live.max_andes_r0,
      avgOtherR0: live.avg_other_r0,
    };
  }

  // Fallback: cálculo local cuando no hay datos del backend
  const alerta    = window.DATASETS.alerta.values;
  const variacion = window.DATASETS.variacion.values;

  const emergency = Object.values(alerta).filter(v => v.current === 'emergencia').length;
  const brote     = Object.values(alerta).filter(v => v.current === 'brote').length;
  const outbreakScore = Math.min((emergency * 3 + brote) / 16, 1) * 22;

  const posGrowths = Object.values(variacion)
    .map(v => v.current).filter(v => typeof v === 'number' && v > 0)
    .sort((a, b) => b - a).slice(0, 5);
  const avgGrowth = posGrowths.length
    ? posGrowths.reduce((a, b) => a + b, 0) / posGrowths.length : 0;
  const growthScore = Math.min(avgGrowth / 140, 1) * 14;

  const continentalScore = 12;
  const epidemio  = Math.round(outbreakScore + growthScore + continentalScore);
  const POLYMARKET = 28;
  const KALSHI     = 35;
  const composite  = Math.round(0.50 * epidemio + 0.25 * POLYMARKET + 0.25 * KALSHI);

  return { composite, epidemio, polymarket: POLYMARKET, kalshi: KALSHI };
}

function formatUpdated(ts) {
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return window.t('header.updated.now');
  if (diffMin < 60) return `${window.t('header.updated')} ${diffMin}${window.t('header.updated.m')}`;
  return `${window.t('header.updated')} ${Math.floor(diffMin / 60)}${window.t('header.updated.h')}`;
}

const COIN_META = {
  BTC:  { symbol: '₿', color: '#F7931A' },
  ETH:  { symbol: 'Ξ', color: '#627EEA' },
  SOL:  { symbol: '◎', color: '#9945FF' },
  USDC: { symbol: '$', color: '#2775CA' },
  USDT: { symbol: '₮', color: '#26A17B' },
  PEN:  { symbol: 'S/', color: '#00BF63' },
};

function walletUri(w) {
  if (!w.address) return null;
  if (w.currency === 'BTC') return `bitcoin:${w.address}`;
  if (w.currency === 'SOL') return `solana:${w.address}`;
  return `ethereum:${w.address}`;
}

// Detect language from URL: ?lang=en, #en, or path ending /en
function detectLangFromUrl() {
  const { search, hash, pathname } = window.location;
  if (/[?&]lang=en/i.test(search) || hash === '#en' || /\/en\/?$/.test(pathname)) return 'en';
  if (/[?&]lang=es/i.test(search) || hash === '#es' || /\/es\/?$/.test(pathname)) return 'es';
  return window.getLang?.() || 'es';
}

// ============================================================================
// App root
// ============================================================================
function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const theme = t.theme === 'dark' ? 'dark' : 'light';

  const [datasetId, setDatasetId]     = useState('alerta');
  const [topo, setTopo]               = useState(null);
  const [hovered, setHovered]         = useState(null);
  const [selected, setSelected]       = useState(null);
  const [compare, setCompare]         = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [step, setStep]               = useState(5);
  const [filterSet, setFilterSet]     = useState(null);
  const [search, setSearch]           = useState('');
  const [now, setNow]                 = useState(new Date());
  const [donationOpen, setDonationOpen] = useState(false);
  const [lang, setLangState]          = useState(() => {
    const l = detectLangFromUrl();
    window.setLang?.(l);
    return l;
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [datasetsVer, setDatasetsVer] = useState(0);
  const [liveReady,   setLiveReady]   = useState(false);

  const ds = window.DATASETS[datasetId];

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  useEffect(() => {
    fetch(TOPO_URL).then(r => r.json()).then(setTopo)
      .catch(err => console.error('TopoJSON load failed', err));
  }, []);

  useEffect(() => { setFilterSet(null); setStep(5); }, [datasetId]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Live data: fetch on mount, then every minute
  const fetchLive = useCallback(() => {
    fetch('./data/live.json?t=' + Date.now())
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        const { countries, history, dates } = data;

        // Build new dataset wrappers so useMemo caches bust on changed ds reference
        const upd = {};
        for (const [id, dataset] of Object.entries(window.DATASETS)) {
          upd[id] = { ...dataset, values: { ...dataset.values } };
        }

        Object.entries(countries).forEach(([iso, c]) => {
          if (upd.alerta.values[iso]) {
            upd.alerta.values[iso] = {
              ...upd.alerta.values[iso],
              current: c.alert, metric: c.ytd, strain: c.strain,
            };
          }
          if (upd.casos.values[iso]) {
            // Indices 9-13 of the 14-day array (index 13 = today)
            const hist5 = (history[iso] && dates && dates.length >= 14)
              ? [9,10,11,12,13].map(j => ({ t: dates[j], v: history[iso][j] ?? c.ytd }))
              : upd.casos.values[iso].history;
            upd.casos.values[iso] = { ...upd.casos.values[iso], current: c.ytd, history: hist5 };
          }
          if (upd.letalidad.values[iso]) {
            upd.letalidad.values[iso] = { ...upd.letalidad.values[iso], current: c.cfr };
          }
          if (upd.variacion.values[iso]) {
            upd.variacion.values[iso] = { ...upd.variacion.values[iso], current: c.var_pct };
          }
        });

        window.LIVE_DATA = data;
        window.DATASETS = upd;
        setLastUpdated(Date.now());
        setDatasetsVer(v => v + 1);
        setLiveReady(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 60000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const toggleLang = () => {
    const next = lang === 'es' ? 'en' : 'es';
    window.setLang?.(next);
    setLangState(next);
  };

  return (
    <div className="app">
      <Header
        ds={ds} datasetId={datasetId} setDatasetId={setDatasetId}
        theme={theme} setTheme={v => setTweak('theme', v)}
        search={search} setSearch={setSearch}
        compareMode={compareMode}
        setCompareMode={v => { setCompareMode(v); if (!v) setCompare(null); }}
        now={now} onDonate={() => setDonationOpen(true)}
        lang={lang} onToggleLang={toggleLang}
        lastUpdated={lastUpdated}
      />

      <div className="layout">
        <aside className="left">
          <PandemicPanel datasetsVer={datasetsVer} />
          <SummaryPanel ds={ds} step={step} />
          <RankingPanel ds={ds} step={step} onPick={setSelected} selected={selected} compare={compare} />
        </aside>

        <main className="center">
          <MapView
            ds={ds} topo={topo} theme={theme} step={step}
            filterSet={filterSet} hovered={hovered} setHovered={setHovered}
            selected={selected} setSelected={setSelected}
            compare={compare} setCompare={setCompare}
            compareMode={compareMode} search={search}
            liveReady={liveReady}
          />
          <BottomBar ds={ds} step={step} setStep={setStep} filterSet={filterSet} setFilterSet={setFilterSet} />
        </main>

        <aside className="right">
          <DetailPanel ds={ds} iso={selected} compareIso={compare} compareMode={compareMode} step={step} />
          <ChartPanel ds={ds} iso={selected} compareIso={compare} step={step} lang={lang} />
          <NewsPanel iso={selected} lang={lang} />
          <EventsPanel ds={ds} onPick={setSelected} />
        </aside>
      </div>

      {hovered && <Tooltip ds={ds} hovered={hovered} step={step} />}
      {donationOpen && <DonationModal onClose={() => setDonationOpen(false)} />}

      <footer className="page-footer">
        <span className="footer-brand">HantaTracker</span>
        <span className="footer-sep">·</span>
        <span className="footer-author">by <strong>Luis Enrique Cortijo Gonzales</strong></span>
        <span className="footer-sep">·</span>
        <span className="footer-data">Datos: OPS/OMS · CDC · ECDC · RKI · THL</span>
      </footer>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Apariencia">
          <window.TweakRadio label="Tema" value={theme}
            onChange={v => setTweak('theme', v)}
            options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================
function Header({ ds, datasetId, setDatasetId, theme, setTheme, search, setSearch,
                  compareMode, setCompareMode, now, onDonate, lang, onToggleLang, lastUpdated }) {
  const utc = now.toISOString().slice(11, 19) + ' UTC';
  const updLabel = lastUpdated ? formatUpdated(lastUpdated) : null;

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><span/></div>
        <div className="brand-text">
          <div className="brand-title">Hantavirus</div>
          <div className="brand-sub">{window.t('header.sub')}</div>
        </div>
      </div>

      <div className="dataset-tabs" role="tablist">
        {Object.values(window.DATASETS).map(d => (
          <button key={d.id} role="tab"
            aria-selected={d.id === datasetId}
            className={`tab ${d.id === datasetId ? 'is-active' : ''}`}
            onClick={() => setDatasetId(d.id)}>
            <span className="tab-code">{window.t('ds.' + d.id + '.sub')}</span>
            <span className="tab-label">{window.t('ds.' + d.id + '.label')}</span>
          </button>
        ))}
      </div>

      <div className="header-actions">
        <div className="search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6"/><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          <input type="text" placeholder={window.t('header.search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`btn ${compareMode ? 'is-active' : ''}`}
          onClick={() => setCompareMode(!compareMode)}>{window.t('header.compare')}</button>
        <div className="clock">
          <span className="clock-label">
            <span className="clock-dot"/>
            {updLabel
              ? <span className="live-stale">{updLabel}</span>
              : window.t('header.live')}
          </span>
          <span className="clock-time">{utc}</span>
        </div>
        <button className="btn donate-btn" onClick={onDonate} title={window.t('header.donate')}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          {window.t('header.donate')}
        </button>
        <button className="btn lang-toggle-btn" onClick={onToggleLang} title="Switch language">
          {window.t('lang.toggle')}
        </button>
        <button className="btn icon-only" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Cambiar tema">
          {theme === 'dark'
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="currentColor"/><g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></g></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" fill="currentColor"/></svg>}
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// Pandemic probability panel
// ============================================================================
function PandemicPanel({ datasetsVer }) {
  const prob = useMemo(() => calcPandemicProb(), [datasetsVer]);
  const levelKey = prob.composite < 20 ? 'pandemic.level.low'
                 : prob.composite < 35 ? 'pandemic.level.mod'
                 : prob.composite < 55 ? 'pandemic.level.high'
                 : 'pandemic.level.crit';
  const levelColor = prob.composite < 20 ? '#3a9a56' : prob.composite < 35 ? '#d49a28' : prob.composite < 55 ? '#e05a1a' : '#cc2222';

  const activeCount = Object.values(window.DATASETS.alerta.values)
    .filter(v => v.current === 'emergencia' || v.current === 'brote').length;

  const rfKeys = ['pandemic.rf1','pandemic.rf2','pandemic.rf3','pandemic.rf4','pandemic.rf5','pandemic.rf6'];
  const rfUp   = [true, true, true, false, false, false];

  return (
    <section className="panel pandemic-panel">
      <div className="panel-head">
        <h3>{window.t('panel.pandemic')}</h3>
        <span className="panel-sub live"><span className="live-dot"/> {window.t('panel.pandemic.model')}</span>
      </div>
      <div className="pandemic-body">

        <div className="pandemic-big">
          <span className="pandemic-pct" style={{ color: levelColor }}>{prob.composite}<span className="pandemic-pct-symbol">%</span></span>
          <span className="pandemic-level" style={{ color: levelColor, borderColor: levelColor }}>{window.t(levelKey)}</span>
        </div>

        <div className="pandemic-gauge">
          <div className="gauge-track">
            <div className="gauge-zone zone-low"/>
            <div className="gauge-zone zone-mod"/>
            <div className="gauge-zone zone-high"/>
            <div className="gauge-zone zone-crit"/>
            <div className="gauge-needle" style={{ left: `${prob.composite}%` }}/>
          </div>
          <div className="gauge-ticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>
        </div>

        {typeof prob.maxAndesR0 === 'number' && (
          <div className="r0-summary">
            <span className="r0-label">R₀ Andes (máx)</span>
            <span className="r0-value" style={{
              color: prob.maxAndesR0 < 1 ? '#3a9a56' :
                     prob.maxAndesR0 < 1.5 ? '#d49a28' :
                     prob.maxAndesR0 < 2 ? '#e05a1a' : '#cc2222'
            }}>{prob.maxAndesR0.toFixed(2)}</span>
            {typeof prob.avgOtherR0 === 'number' && (
              <span className="r0-other">Otros: {prob.avgOtherR0.toFixed(2)}</span>
            )}
          </div>
        )}

        <div className="prob-sources">
          <div className="prob-row">
            <span className="prob-label">{window.t('pandemic.epi')}</span>
            <div className="prob-bar-track"><div className="prob-bar epi" style={{ width: `${prob.epidemio}%` }}/></div>
            <span className="prob-val">{prob.epidemio}%</span>
          </div>
          <div className="prob-row">
            <a href="https://polymarket.com" target="_blank" rel="noopener" className="prob-label prob-link">Polymarket ↗</a>
            <div className="prob-bar-track"><div className="prob-bar poly" style={{ width: `${prob.polymarket}%` }}/></div>
            <span className="prob-val">{prob.polymarket}%</span>
          </div>
          <div className="prob-row">
            <a href="https://kalshi.com" target="_blank" rel="noopener" className="prob-label prob-link">Kalshi ↗</a>
            <div className="prob-bar-track"><div className="prob-bar kal" style={{ width: `${prob.kalshi}%` }}/></div>
            <span className="prob-val">{prob.kalshi}%</span>
          </div>
        </div>

        <div className="risk-factors">
          {rfKeys.map((k, i) => (
            <div key={i} className={`rf-row ${rfUp[i] ? 'rf-up' : 'rf-down'}`}>
              <span className="rf-icon">{rfUp[i] ? '▲' : '▼'}</span>
              <span className="rf-text">
                {i === 0 ? `${activeCount} ` : ''}{window.t(k)}
              </span>
            </div>
          ))}
        </div>

        <div className="pandemic-meta">{window.t('pandemic.meta')}</div>
      </div>
    </section>
  );
}

// ============================================================================
// Map
// ============================================================================
function MapView({ ds, topo, theme, step, filterSet, hovered, setHovered,
                   selected, setSelected, compare, setCompare, compareMode, search, liveReady }) {
  const wrapperRef = useRef(null);
  const svgRef    = useRef(null);
  const gRef      = useRef(null);
  const zoomRef   = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 540 });

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const r = e.contentRect;
        setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const { features, projection, pathGen } = useMemo(() => {
    if (!topo || !size.w || !size.h) return { features: null, projection: null, pathGen: null };
    const fc = topojson.feature(topo, topo.objects.countries);
    const proj = d3.geoNaturalEarth1().fitSize([size.w - 40, size.h - 80], fc);
    proj.translate([size.w / 2, size.h / 2 + 10]);
    return { features: fc.features, projection: proj, pathGen: d3.geoPath(proj) };
  }, [topo, size.w, size.h]);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    const g   = d3.select(gRef.current);
    const zoom = d3.zoom().scaleExtent([1, 8]).on('zoom', ev => {
      g.attr('transform', ev.transform);
      g.selectAll('path.country').attr('stroke-width', 0.5 / ev.transform.k);
      g.selectAll('.sphere').attr('stroke-width', 0.7 / ev.transform.k);
      g.selectAll('.graticule').attr('stroke-width', 0.4 / ev.transform.k);
    });
    svg.call(zoom).on('dblclick.zoom', null);
    zoomRef.current = zoom;
    return () => svg.on('.zoom', null);
  }, [features]);

  useEffect(() => {
    if (!search || !features || !projection) return;
    const q = search.trim().toLowerCase();
    if (q.length < 2) return;
    const match = features.find(f => {
      const iso  = NUM_TO_A3[f.id];
      const name = (window.COUNTRY_NAMES && window.COUNTRY_NAMES[iso]) || f.properties.name || '';
      return name.toLowerCase().includes(q) || (iso && iso.toLowerCase() === q);
    });
    if (match && zoomRef.current && svgRef.current) {
      const c = d3.geoPath(projection).centroid(match);
      if (!isNaN(c[0])) {
        d3.select(svgRef.current).transition().duration(450).call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(size.w / 2 - c[0] * 2.5, size.h / 2 - c[1] * 2.5).scale(2.5)
        );
      }
    }
  }, [search, features, projection]);

  const handleClick = useCallback(iso => {
    if (!iso) return;
    if (compareMode) {
      if (!selected) setSelected(iso);
      else if (iso !== selected) setCompare(iso);
      else setSelected(null);
    } else {
      setSelected(iso === selected ? null : iso);
      setCompare(null);
    }
  }, [compareMode, selected, setSelected, setCompare]);

  const matchesFilter = iso => {
    if (!filterSet) return true;
    const v = valueAt(ds, iso, step);
    return (ds.mode === 'categorical' || ds.mode === 'binary') ? filterSet.has(v) : true;
  };

  const onMouseMove = (e, iso, name) => {
    const wrap = wrapperRef.current.getBoundingClientRect();
    setHovered({ iso, name, x: e.clientX - wrap.left, y: e.clientY - wrap.top });
  };

  return (
    <div className={`map-wrap${liveReady ? ' data-ready' : ''}`} ref={wrapperRef}>
      <span className="corner-tl" aria-hidden="true"/>
      <span className="corner-bl" aria-hidden="true"/>

      <div className="map-title">
        <div className="map-title-eyebrow">{ds.code}</div>
        <h2 className="map-title-h">{window.t('ds.' + ds.id + '.label')}</h2>
        <div className="map-title-sub">{ds.subtitle}</div>
      </div>

      <div className="map-toolbar">
        <button className="map-btn" onClick={() => d3.select(svgRef.current).transition().duration(180).call(zoomRef.current.scaleBy, 1.5)}>+</button>
        <button className="map-btn" onClick={() => d3.select(svgRef.current).transition().duration(180).call(zoomRef.current.scaleBy, 1/1.5)}>−</button>
        <button className="map-btn" onClick={() => d3.select(svgRef.current).transition().duration(220).call(zoomRef.current.transform, d3.zoomIdentity)}>⟲</button>
      </div>

      <svg ref={svgRef} width={size.w} height={size.h}
           onMouseLeave={() => setHovered(null)}
           role="img" aria-label="Mapa mundial de hantavirus">
        <defs>
          <pattern id="dim-stripes" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="var(--map-bg)"/>
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--rule-soft)" strokeWidth="1.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="var(--map-bg)"/>
        {pathGen && (
          <g ref={gRef}>
            <path className="graticule" d={pathGen(d3.geoGraticule().step([15, 15])())}
              fill="none" stroke="var(--map-grid)" strokeWidth={0.4} opacity={0.55}/>
            <path d={pathGen({ type: 'Sphere' })} fill="none" stroke="var(--map-grid)"
              strokeWidth={0.7} opacity={0.7} className="sphere"/>
            {features.map(f => {
              const iso    = NUM_TO_A3[f.id] || f.id;
              const name   = nameOf(iso, f.properties.name);
              const v      = valueAt(ds, iso, step);
              const vis    = matchesFilter(iso);
              const fill   = vis ? resolveColor(ds, v) : 'url(#dim-stripes)';
              const isSel  = iso === selected;
              const isCmp  = iso === compare;
              const isHov  = hovered && hovered.iso === iso;
              return (
                <path key={f.id} className="country" d={pathGen(f)} fill={fill}
                  stroke={isSel ? 'var(--accent)' : isCmp ? 'var(--accent-2)' : 'var(--country-stroke)'}
                  strokeWidth={isSel || isCmp ? 1.6 : 0.5}
                  opacity={!vis ? 0.55 : isHov ? 0.88 : 1}
                  style={{ cursor: 'pointer', transition: 'opacity 100ms' }}
                  onMouseMove={e => onMouseMove(e, iso, name)}
                  onMouseEnter={e => onMouseMove(e, iso, name)}
                  onClick={() => handleClick(iso)}/>
              );
            })}
            {[selected, compare].filter(Boolean).map((iso, i) => {
              const f = features.find(ff => (NUM_TO_A3[ff.id] || ff.id) === iso);
              if (!f) return null;
              const c = pathGen.centroid(f);
              if (isNaN(c[0])) return null;
              return (
                <g key={iso} pointerEvents="none">
                  <line className="country-leader" x1={c[0]} y1={c[1]} x2={c[0]} y2={c[1] - 26}/>
                  <circle cx={c[0]} cy={c[1]} r={3}
                    fill={i === 1 ? 'var(--accent-2)' : 'var(--accent)'}
                    stroke="var(--paper)" strokeWidth="1.5"/>
                  <text className="country-label" x={c[0]} y={c[1] - 32} textAnchor="middle">
                    {nameOf(iso, f.properties.name).toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* ── Eventos marítimos (cruceros en seguimiento) ─────────── */}
            {(window.LIVE_DATA?.maritime_events || []).map(ev => {
              const pt = projection([ev.lng, ev.lat]);
              if (!pt || isNaN(pt[0])) return null;
              const [x, y] = pt;
              const STATUS_COLOR = {
                quarantine:  '#cc2222',
                approaching: '#d49a28',
                diverted:    '#e05a1a',
                docked:      '#3a9a56',
                cleared:     '#3a9a56',
              };
              const color = STATUS_COLOR[ev.status] || '#888';
              return (
                <g key={ev.id} className="maritime-marker" style={{ cursor: 'pointer' }}
                   onMouseMove={e => {
                     const wrap = wrapperRef.current.getBoundingClientRect();
                     setHovered({
                       iso: ev.id, name: `${ev.name} — ${ev.cases} ${window.t('maritime.cases')}`,
                       maritime: ev,
                       x: e.clientX - wrap.left, y: e.clientY - wrap.top,
                     });
                   }}
                   onMouseLeave={() => setHovered(null)}>
                  {/* Pulso animado */}
                  <circle cx={x} cy={y} r={6} fill={color} opacity={0.35}>
                    <animate attributeName="r" values="6;14;6" dur="2.4s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite"/>
                  </circle>
                  {/* Punto central */}
                  <circle cx={x} cy={y} r={4.5} fill={color}
                    stroke="var(--paper)" strokeWidth="1.5"/>
                  {/* Icono barco */}
                  <text x={x} y={y + 2.5} textAnchor="middle" fontSize="6"
                    fill="var(--paper)" fontWeight="900" pointerEvents="none">⚓</text>
                  {/* Etiqueta */}
                  <line x1={x} y1={y - 7} x2={x} y2={y - 22}
                    stroke={color} strokeWidth="1" strokeDasharray="2 2" pointerEvents="none"/>
                  <text x={x} y={y - 26} textAnchor="middle" fontSize="9"
                    fill={color} fontWeight="bold" pointerEvents="none">{ev.name}</text>
                  <text x={x} y={y - 16} textAnchor="middle" fontSize="8"
                    fill="var(--ink-dim)" pointerEvents="none">
                    {ev.cases} {window.t('maritime.cases.short')} · {ev.dest}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      <div className="map-meta">
        <span><strong>{window.t('map.countries')}</strong> {Object.keys(ds.values).length}</span>
        <span className="map-meta-divider"/>
        <span><strong>{window.t('map.source')}</strong> {window.t('map.source.val')}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Tooltip
// ============================================================================
function Tooltip({ ds, hovered, step }) {
  if (!hovered) return null;

  // Maritime event tooltip (cruise / vessel)
  if (hovered.maritime) {
    const ev = hovered.maritime;
    const lang = (window.getLang && window.getLang()) || 'es';
    const note = lang === 'en' ? (ev.note_en || ev.note_es) : (ev.note_es || ev.note_en);
    const STATUS_COLOR = {
      quarantine: '#cc2222', approaching: '#d49a28', diverted: '#e05a1a',
      docked: '#3a9a56', cleared: '#3a9a56',
    };
    const color = STATUS_COLOR[ev.status] || '#888';
    return (
      <div className="tooltip" style={{ left: hovered.x + 18, top: hovered.y + 18 }}>
        <div className="tt-row">
          <span className="tt-swatch" style={{ color }}/>
          <span className="tt-name">{ev.name}</span>
          <span className="tt-iso">⚓</span>
        </div>
        <div className="tt-val" style={{ color }}>
          {window.t(`maritime.status.${ev.status}`) || ev.status}
        </div>
        <div className="tt-extra">{ev.cases} {window.t('maritime.cases')} · CFR 0%</div>
        <div className="tt-extra">{window.t('maritime.origin')}: {ev.origin}</div>
        <div className="tt-extra">{window.t('maritime.dest')}: {ev.dest}</div>
        {ev.pax && <div className="tt-extra">{window.t('maritime.pax')}: {ev.pax.toLocaleString()}</div>}
        {note && <div className="tt-extra" style={{ marginTop: 4, fontStyle: 'italic' }}>{note}</div>}
        <div className="tt-hint">{window.t('maritime.tracking')}</div>
      </div>
    );
  }

  const rec   = ds.values[hovered.iso];
  const v     = rec ? valueAt(ds, hovered.iso, step) : null;
  const swatch = resolveColor(ds, v);
  const label = fmt(ds, v);
  let extra = null;
  if ((ds.mode === 'continuous' || ds.mode === 'diverging') && rec?.metric != null)
    extra = `${ds.metricLabel}: ${fmt(ds, rec.current)}`;
  else if (ds.mode === 'categorical' && rec?.metric != null)
    extra = `${ds.metricLabel}: ${rec.metric}${ds.unit}`;

  const strain = window.DATASETS.alerta.values[hovered.iso]?.strain;
  const strainInfo = strain && window.STRAIN_INFO?.[strain];

  return (
    <div className="tooltip" style={{ left: hovered.x + 18, top: hovered.y + 18 }}>
      <div className="tt-row">
        <span className="tt-swatch" style={{ color: swatch }}/>
        <span className="tt-name">{hovered.name}</span>
        <span className="tt-iso">{hovered.iso}</span>
      </div>
      <div className="tt-val">{label}</div>
      {extra && <div className="tt-extra">{extra}</div>}
      {strainInfo && (
        <div className="tt-strain" style={{ color: strainInfo.color }}>
          {strainInfo.badge} — {window.strainL(strainInfo, 'label')}
        </div>
      )}
      {!rec && <div className="tt-extra tt-no-data">{window.t('tt.nodata')}</div>}
      <div className="tt-hint">{window.t('tt.hint')}</div>
    </div>
  );
}

// ============================================================================
// Summary
// ============================================================================
function SummaryPanel({ ds, step }) {
  const stats = useMemo(() => {
    const entries = Object.entries(ds.values);
    if (ds.mode === 'categorical' || ds.mode === 'binary') {
      const counts = {};
      entries.forEach(([iso]) => { const v = valueAt(ds, iso, step); counts[v] = (counts[v] || 0) + 1; });
      const total = entries.length;
      return { kind: 'cat', total, top: ds.categories.map(c => ({ ...c, n: counts[c.key] || 0 })).sort((a,b) => b.n - a.n) };
    }
    const vals = entries.map(([iso]) => { const v = valueAt(ds, iso, step); return typeof v === 'number' ? v : null; }).filter(v => v != null);
    return { kind: 'num', n: vals.length, mean: d3.mean(vals), med: d3.median(vals), max: d3.max(vals), min: d3.min(vals) };
  }, [ds, step]);

  return (
    <section className="panel">
      <div className="panel-head"><h3>{window.t('panel.summary')}</h3><span className="panel-sub">{ds.code}</span></div>
      {stats.kind === 'cat' ? (
        <div className="summary-cat">
          <div className="big">{stats.total}<span className="big-sub">países con registro</span></div>
          <div className="cat-list">
            {stats.top.map(c => (
              <div className="cat-row" key={c.key} style={{ color: c.color }}>
                <span className="cat-dot"/><span className="cat-label">{window.t('cat.' + c.key)}</span>
                <span className="cat-bar"><span style={{ width: `${(c.n/stats.total)*100}%` }}/></span>
                <span className="cat-n">{c.n}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="summary-num">
          <div className="kpi-grid">
            <Kpi label="Promedio" value={fmt(ds, stats.mean)} />
            <Kpi label="Mediana"  value={fmt(ds, stats.med)} />
            <Kpi label="Máximo"   value={fmt(ds, stats.max)} />
            <Kpi label="Mínimo"   value={fmt(ds, stats.min)} />
          </div>
        </div>
      )}
    </section>
  );
}
function Kpi({ label, value }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

// ============================================================================
// Ranking
// ============================================================================
function RankingPanel({ ds, step, onPick, selected, compare }) {
  const rows = useMemo(() => {
    return Object.keys(ds.values).map(iso => {
      const v   = valueAt(ds, iso, step);
      const num = typeof v === 'number' ? v : ds.values[iso]?.metric;
      return { iso, name: nameOf(iso), v, num };
    }).sort((a, b) => ((b.num ?? -Infinity) - (a.num ?? -Infinity))).slice(0, 10);
  }, [ds, step]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{window.t('panel.ranking')} — {ds.metricLabel}</h3>
        <span className="panel-sub">{window.t('panel.ranking.sub')}</span>
      </div>
      <ul className="rank-list">
        {rows.map((r, i) => {
          const swatch = resolveColor(ds, r.v);
          const active = selected === r.iso || compare === r.iso;
          return (
            <li key={r.iso} className={`rank-row ${active ? 'is-active' : ''}`}
                onClick={() => onPick(r.iso)} style={{ color: swatch }}>
              <span className="rank-pos">{String(i+1).padStart(2,'0')}</span>
              <span className="rank-swatch"/>
              <span className="rank-name">{r.name}</span>
              <span className="rank-val">{fmt(ds, r.v)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================================
// Detail
// ============================================================================
function DetailPanel({ ds, iso, compareIso, compareMode, step }) {
  if (!iso) {
    const alertVals = Object.values(window.DATASETS.alerta.values);
    const emergency = alertVals.filter(v => v.current === 'emergencia').length;
    const brote     = alertVals.filter(v => v.current === 'brote').length;
    const totalCasos = Object.values(window.DATASETS.casos.values)
      .reduce((s, v) => s + (v.current || 0), 0);
    const andesCountries = alertVals.filter(v => v.strain === 'andes').length;
    return (
      <section className="panel">
        <div className="panel-head">
          <h3>{window.t('panel.detail')}</h3>
          <span className="panel-sub">{window.t('panel.detail.empty')}</span>
        </div>
        <div className="detail-body">
          <div className="global-stats">
            <div className="gs-row">
              <span className="gs-label">{window.t('detail.emergency')}</span>
              <span className="gs-val" style={{color:'#cc2222'}}>{emergency} países</span>
            </div>
            <div className="gs-row">
              <span className="gs-label">{window.t('detail.outbreak')}</span>
              <span className="gs-val" style={{color:'#e05a1a'}}>{brote} países</span>
            </div>
            <div className="gs-row">
              <span className="gs-label">{window.t('detail.total')}</span>
              <span className="gs-val">{totalCasos.toLocaleString()}</span>
            </div>
            <div className="gs-row">
              <span className="gs-label">{window.t('detail.andes')}</span>
              <span className="gs-val" style={{color:'#cc2222'}}>{andesCountries} países</span>
            </div>
          </div>
          <p className="empty-hint" style={{marginTop:'14px'}}>{window.t('detail.click')}</p>
          {compareMode && <p className="empty-hint">{window.t('detail.compare.hint')}</p>}
        </div>
      </section>
    );
  }

  const renderOne = i => {
    if (!i) return null;
    const rec = ds.values[i];
    const v   = valueAt(ds, i, step);
    const sw  = resolveColor(ds, v);
    return (
      <div className="detail-card" key={i}>
        <div className="detail-head">
          <span className="detail-swatch" style={{ color: sw }}/>
          <div>
            <div className="detail-name">{nameOf(i)}</div>
            <div className="detail-iso">{i}</div>
          </div>
        </div>
        {rec ? (
          <>
            {(() => {
              const strainKey = window.DATASETS.alerta.values[i]?.strain;
              const si = strainKey && window.STRAIN_INFO?.[strainKey];
              return si ? (
                <div className="detail-strain-banner" style={{ borderColor: si.color, color: si.color }}>
                  <span className="dsb-badge">{si.badge}</span>
                  <span className="dsb-note">{window.strainL(si, 'note')}</span>
                </div>
              ) : null;
            })()}
            <div className="detail-grid">
              <div><div className="dl">{window.t('detail.field.status')}</div><div className="dv">{fmt(ds, v)}</div></div>
              {rec.metric != null && (
                <div><div className="dl">{ds.metricLabel}</div>
                  <div className="dv">{ds.mode === 'categorical' ? `${rec.metric}${ds.unit}` : fmt(ds, rec.current)}</div>
                </div>
              )}
              {(() => {
                const liveCountry = window.LIVE_DATA?.countries?.[i];
                const r0 = liveCountry?.r0;
                if (typeof r0 !== 'number') return null;
                const r0Color = r0 < 1 ? '#3a9a56' : r0 < 1.5 ? '#d49a28' : r0 < 2 ? '#e05a1a' : '#cc2222';
                return (
                  <div><div className="dl">R₀ estimado</div>
                    <div className="dv" style={{color: r0Color}}>{r0.toFixed(2)}</div>
                  </div>
                );
              })()}
              {(() => {
                const sigCount = window.LIVE_DATA?.countries?.[i]?.signals;
                if (typeof sigCount !== 'number' || sigCount === 0) return null;
                return (
                  <div><div className="dl">Señales 14d</div>
                    <div className="dv">{sigCount}</div>
                  </div>
                );
              })()}
              <div><div className="dl">{window.t('detail.field.updated')}</div><div className="dv">08/05/2026</div></div>
              <div><div className="dl">{window.t('detail.field.source')}</div><div className="dv">{window.t('detail.field.source.val')}</div></div>
            </div>
          </>
        ) : (
          <div className="detail-no-data">
            {window.t('detail.nodata')} {nameOf(i)} en 2026.
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{window.t('panel.detail')}</h3>
        {compareIso && <span className="panel-sub">{window.t('panel.detail.compare')}</span>}
      </div>
      <div className="detail-body">{renderOne(iso)}{compareIso && renderOne(compareIso)}</div>
    </section>
  );
}

// ============================================================================
// Chart — eje X usa fechas (DD/MM)
// D3 owns the inner <div ref={d3ref}> exclusively; React never renders
// children there, avoiding the removeChild DOM conflict.
// ============================================================================
function ChartPanel({ ds, iso, compareIso, step, lang }) {
  const d3ref = useRef(null);
  const [chartMode, setChartMode] = useState('daily');

  useEffect(() => { setChartMode('daily'); }, [iso]);

  useEffect(() => {
    const wrap = d3ref.current;
    if (!wrap) return;
    wrap.innerHTML = '';

    const isNumeric = ds.mode === 'continuous' || ds.mode === 'diverging';
    const W = wrap.clientWidth || 280, H = 130, M = { t: 14, r: 12, b: 24, l: 36 };
    const svg = d3.select(wrap).append('svg').attr('width', W).attr('height', H);

    // ── Hourly mode (48h) ──────────────────────────────────────────────────
    if (chartMode === 'hourly' && iso && isNumeric) {
      const liveData = window.LIVE_DATA;
      const hourlyDates = liveData?.hourly_dates || [];
      const hourlyVals  = liveData?.hourly_history?.[iso] || [];
      const cmpVals     = compareIso ? (liveData?.hourly_history?.[compareIso] || []) : [];
      if (!hourlyDates.length || !hourlyVals.length) {
        svg.append('text').attr('x', W/2).attr('y', H/2).attr('text-anchor','middle')
          .attr('fill','var(--ink-mute)').attr('font-size',11).attr('font-family','IBM Plex Mono')
          .text(window.t('chart.nodata'));
        return;
      }
      const idxArr = hourlyDates.map((_, i) => i);
      const xb = d3.scalePoint().domain(idxArr.map(String)).range([M.l, W - M.r]).padding(0.5);
      const allV = [...hourlyVals, ...cmpVals];
      const yMin = d3.min(allV), yMax = d3.max(allV);
      const pad = (yMax - yMin) * 0.2 || 1;
      const y = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([H - M.b, M.t]).nice();

      const tickEvery = 8;
      svg.append('g').attr('transform', `translate(0,${H-M.b})`)
        .call(d3.axisBottom(xb)
          .tickValues(idxArr.filter(i => i % tickEvery === 0).map(String))
          .tickFormat(i => hourlyDates[+i]?.slice(11, 13) + 'h')
          .tickSizeOuter(0))
        .call(g => g.selectAll('text').attr('fill','var(--ink-mute)').attr('font-family','IBM Plex Mono').attr('font-size',8))
        .call(g => g.selectAll('line,path').attr('stroke','var(--rule-soft)'));
      svg.append('g').attr('transform', `translate(${M.l},0)`)
        .call(d3.axisLeft(y).ticks(3).tickSizeOuter(0))
        .call(g => g.selectAll('text').attr('fill','var(--ink-mute)').attr('font-family','IBM Plex Mono').attr('font-size',8))
        .call(g => g.selectAll('line,path').attr('stroke','var(--rule-soft)'));

      const lineFn = vals => d3.line().x((_, i) => xb(String(i))).y(v => y(v)).curve(d3.curveMonotoneX)(vals);
      svg.append('path').attr('fill','none').attr('stroke','var(--accent)').attr('stroke-width',1.6).attr('d', lineFn(hourlyVals));
      if (cmpVals.length) {
        svg.append('path').attr('fill','none').attr('stroke','var(--accent-2)').attr('stroke-width',1.2).attr('opacity',0.8).attr('d', lineFn(cmpVals));
      }
      return;
    }

    const getLabels = hist => hist.map(p => dateLabel(p.t));

    // Global overview: top-4 countries by current value
    if (!iso) {
      if (!isNumeric) return;
      const topIsos = Object.entries(ds.values)
        .map(([k, v]) => ({ iso: k, val: typeof v.current === 'number' ? v.current : 0 }))
        .sort((a, b) => b.val - a.val).slice(0, 4).map(d => d.iso);
      if (!topIsos.length) return;

      const COLORS = ['#00c896','#e05a1a','#d49a28','#627EEA'];
      const topSeries = topIsos.map((k, i) => ({
        iso: k, hist: ds.values[k]?.history || [], color: COLORS[i],
      }));
      const allVals = topSeries.flatMap(s => s.hist.map(p => p.v));
      if (!allVals.length) return;
      const labels = getLabels(topSeries[0]?.hist || []);
      const xb = d3.scalePoint().domain(labels).range([M.l, W - M.r]).padding(0.5);
      const yMin = d3.min(allVals), yMax = d3.max(allVals);
      const pad = (yMax - yMin) * 0.15 || 1;
      const y = d3.scaleLinear().domain([Math.max(0, yMin - pad), yMax + pad]).range([H - M.b, M.t]).nice();

      svg.append('g').attr('transform', `translate(0,${H-M.b})`).call(d3.axisBottom(xb).tickSizeOuter(0))
        .call(g => g.selectAll('text').attr('fill','var(--ink-mute)').attr('font-family','IBM Plex Mono').attr('font-size',8))
        .call(g => g.selectAll('line,path').attr('stroke','var(--rule-soft)'));
      svg.append('g').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(3).tickSizeOuter(0))
        .call(g => g.selectAll('text').attr('fill','var(--ink-mute)').attr('font-family','IBM Plex Mono').attr('font-size',8))
        .call(g => g.selectAll('line,path').attr('stroke','var(--rule-soft)'));

      const line = d3.line().x((d, j) => xb(labels[j])).y(d => y(d.v)).curve(d3.curveMonotoneX);
      topSeries.forEach((s, si) => {
        if (!s.hist.length) return;
        svg.append('path').attr('fill','none').attr('stroke',s.color)
          .attr('stroke-width', si === 0 ? 2 : 1.2).attr('opacity', si === 0 ? 1 : 0.7)
          .attr('d', line(s.hist));
        const last = s.hist[s.hist.length - 1];
        svg.append('text')
          .attr('x', xb(labels[labels.length - 1]) + 4)
          .attr('y', y(last.v) + 3)
          .attr('font-size', 8).attr('font-family', 'IBM Plex Mono')
          .attr('fill', s.color).text(s.iso);
      });
      return;
    }

    // Categorical chart
    if (!isNumeric) {
      const series = [iso, compareIso].filter(Boolean).map(i => ds.values[i]?.history || []);
      const labels = getLabels(series[0] || []);
      if (!labels.length) {
        svg.append('text').attr('x', W/2).attr('y', H/2).attr('text-anchor','middle')
          .attr('fill','var(--ink-mute)').attr('font-size',11).attr('font-family','IBM Plex Mono')
          .text(window.t('chart.nodata'));
        return;
      }
      const xb = d3.scaleBand().domain(labels).range([M.l, W - M.r]).padding(0.15);
      svg.append('g').attr('transform', `translate(0,${H-M.b})`).call(d3.axisBottom(xb).tickSizeOuter(0))
        .call(g => g.selectAll('text').attr('fill','var(--ink-mute)').attr('font-family','IBM Plex Mono').attr('font-size',8))
        .call(g => g.selectAll('line,path').attr('stroke','var(--rule-soft)'));
      const rowH = (H - M.t - M.b) / Math.max(series.length, 1);
      series.forEach((hist, idx) => {
        svg.append('g').selectAll('rect').data(hist).enter().append('rect')
          .attr('x', (d, j) => xb(labels[j])).attr('y', M.t + idx * rowH + 4)
          .attr('width', xb.bandwidth()).attr('height', Math.max(rowH - 8, 8))
          .attr('fill', d => resolveColor(ds, d.v));
        svg.append('text').attr('x', M.l - 6).attr('y', M.t + idx * rowH + rowH/2 + 3)
          .attr('text-anchor','end').attr('font-size',8).attr('font-family','IBM Plex Mono').attr('fill','var(--ink-mute)')
          .text(idx === 0 ? iso : compareIso);
      });
      return;
    }

    const series = [
      { iso, hist: ds.values[iso]?.history || [], color: 'var(--accent)' },
      compareIso ? { iso: compareIso, hist: ds.values[compareIso]?.history || [], color: 'var(--accent-2)' } : null,
    ].filter(Boolean);

    const allVals = series.flatMap(s => s.hist.map(p => p.v));
    if (allVals.length === 0) {
      svg.append('text').attr('x', W/2).attr('y', H/2).attr('text-anchor','middle')
        .attr('fill','var(--ink-mute)').attr('font-size',11).attr('font-family','IBM Plex Mono')
        .text(window.t('chart.nodata'));
      return;
    }
    const labels  = getLabels(series[0]?.hist || []);
    const xb = d3.scalePoint().domain(labels).range([M.l, W - M.r]).padding(0.5);
    const yMin = d3.min(allVals), yMax = d3.max(allVals);
    const pad = (yMax - yMin) * 0.2 || 1;
    const y   = d3.scaleLinear().domain([yMin - pad, yMax + pad]).range([H - M.b, M.t]).nice();

    svg.append('g').attr('transform', `translate(0,${H-M.b})`).call(d3.axisBottom(xb).tickSizeOuter(0))
      .call(g => g.selectAll('text').attr('fill','var(--ink-mute)').attr('font-family','IBM Plex Mono').attr('font-size',8))
      .call(g => g.selectAll('line,path').attr('stroke','var(--rule-soft)'));
    svg.append('g').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(3).tickSizeOuter(0))
      .call(g => g.selectAll('text').attr('fill','var(--ink-mute)').attr('font-family','IBM Plex Mono').attr('font-size',8))
      .call(g => g.selectAll('line,path').attr('stroke','var(--rule-soft)'));

    if (ds.mode === 'diverging')
      svg.append('line').attr('x1',M.l).attr('x2',W-M.r).attr('y1',y(0)).attr('y2',y(0))
        .attr('stroke','var(--ink-mute)').attr('stroke-dasharray','2 3');

    const line = d3.line().x((d, j) => xb(labels[j])).y(d => y(d.v)).curve(d3.curveMonotoneX);
    series.forEach(s => {
      svg.append('path').attr('fill','none').attr('stroke',s.color).attr('stroke-width',1.6).attr('d',line(s.hist));
      svg.append('g').selectAll('circle').data(s.hist).enter().append('circle')
        .attr('cx',(d,j) => xb(labels[j])).attr('cy',d => y(d.v))
        .attr('r',2.5).attr('fill','var(--paper)').attr('stroke',s.color).attr('stroke-width',1.4);
    });
  }, [ds, iso, compareIso, step, lang, chartMode]);

  const subLabel = iso ? nameOf(iso) : window.t('chart.top');
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{window.t('panel.chart')}</h3>
        <span className="panel-sub">{subLabel}</span>
        {iso && (
          <div className="chart-mode-tabs">
            <button className={`chart-mode-btn ${chartMode==='daily'?'is-active':''}`}
                    onClick={() => setChartMode('daily')}>14d</button>
            <button className={`chart-mode-btn ${chartMode==='hourly'?'is-active':''}`}
                    onClick={() => setChartMode('hourly')}>48h</button>
          </div>
        )}
      </div>
      <div className="chart-body">
        {/* d3ref is exclusively owned by D3 — React never renders children here */}
        <div ref={d3ref} />
      </div>
    </section>
  );
}

// ============================================================================
// News panel
// ============================================================================
function NewsPanel({ iso, lang }) {
  const country = nameOf(iso);
  const news    = iso ? (window.COUNTRY_NEWS && window.COUNTRY_NEWS[iso]) : null;
  const hasData = iso ? !!window.DATASETS.alerta.values[iso] : false;

  if (!iso) {
    return (
      <section className="panel news-panel">
        <div className="panel-head"><h3>{window.t('panel.news')}</h3><span className="panel-sub">{window.t('panel.news.select')}</span></div>
        <div className="empty-state">
          <div className="empty-icon">↙</div>
          <p>{window.t('news.empty.text')}</p>
        </div>
      </section>
    );
  }

  const hl = lang === 'en' ? 'en' : 'es';
  const searchUrl = news?.search
    || `https://news.google.com/search?q=${encodeURIComponent(window.t('news.hantavirus') + ' ' + country)}&hl=${hl}`;

  return (
    <section className="panel news-panel">
      <div className="panel-head">
        <h3>{window.t('panel.news')}</h3>
        <span className="panel-sub">{country}</span>
      </div>
      <div className="news-body">

        {!hasData && (
          <div className="news-no-cases">
            <span className="news-check">✓</span>
            {window.t('news.no_cases')} <strong>{country}</strong> {window.t('news.in')} 2026.
          </div>
        )}

        {news?.sources?.length > 0 && (
          <>
            <div className="news-section-label">{window.t('news.section.official')}</div>
            <ul className="news-list">
              {news.sources.map((s, i) => (
                <li key={i} className="news-item">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="news-link">
                    <span className="news-org">{s.org}</span>
                    <span className="news-title">{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        {!news?.sources?.length && hasData && (
          <div className="news-section-label">{window.t('news.section.none')}</div>
        )}

        <div className="news-section-label">{window.t('news.section.rt')}</div>
        <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="news-google-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          {window.t('news.search')} "{country} {window.t('news.hantavirus')}" →
        </a>

        <a href="https://www.who.int/news-room/fact-sheets/detail/hantavirus-and-haemorrhagic-fever-with-renal-syndrome"
           target="_blank" rel="noopener noreferrer" className="news-who-link">
          {window.t('news.who')}
        </a>
      </div>
    </section>
  );
}

// ============================================================================
// Events
// ============================================================================
function EventsPanel({ ds, onPick }) {
  // Use live RSS events from Pi when available; fall back to static dataset events
  const liveEvents = window.LIVE_DATA?.events;
  const items = liveEvents && liveEvents.length > 0
    ? liveEvents.map(e => ({
        t:       e.t,
        country: e.iso,
        text:    e.title,
        url:     e.url,
        source:  e.source,
      }))
    : ds.events.map(e => ({ ...e, url: '', source: '' }));

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{window.t('panel.events')}</h3>
        <span className="panel-sub live"><span className="live-dot"/> {window.t('panel.events.live')}</span>
      </div>
      <ul className="events-list">
        {items.map((e, i) => (
          <li key={i} className="ev-row" onClick={() => onPick(e.country)}>
            <div className="ev-time">{e.t.slice(11,16)}<br/>{e.t.slice(5,10)}</div>
            <div className="ev-body">
              <span className="ev-iso">{e.country}</span>
              {e.url
                ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="ev-text ev-link" onClick={ev => ev.stopPropagation()}>{e.text}</a>
                : <span className="ev-text">{e.text}</span>
              }
              {e.source && <span className="ev-source">{e.source}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ============================================================================
// Bottom bar
// ============================================================================
function BottomBar({ ds, step, setStep, filterSet, setFilterSet }) {
  return (
    <>
      <Timeline step={step} setStep={setStep} ds={ds} />
      <Legend ds={ds} filterSet={filterSet} setFilterSet={setFilterSet} />
    </>
  );
}

// ============================================================================
// Timeline
// ============================================================================
function Timeline({ step, setStep, ds }) {
  const sampleIso = Object.keys(ds.values)[0];
  const hist = (sampleIso && ds.values[sampleIso]?.history) || [];
  const labels = hist.length >= 5
    ? hist.slice(0, 5).map(h => dateLabel(h.t))
    : ['01/05','02/05','03/05','06/05','07/05'];

  const stepLabel = step >= labels.length
    ? `${labels[labels.length - 1]} (${window.t('tl.today')})`
    : labels[step];

  return (
    <div className="timeline">
      <div className="tl-label">
        <span className="tl-label-eyebrow">{window.t('tl.label')}</span>
        <span className="tl-label-now">{stepLabel}</span>
      </div>
      <div className="tl-track">
        {labels.map((l, i) => (
          <button key={i} className={`tl-step ${i===step?'is-active':''} ${i<step?'is-past':''}`}
                  onClick={() => setStep(i)}>
            <span className="tl-dot"/>
            <span className="tl-text">{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Legend
// ============================================================================
function Legend({ ds, filterSet, setFilterSet }) {
  const toggle = k => {
    const cur = filterSet ? new Set(filterSet) : new Set(ds.categories.map(c => c.key));
    if (cur.has(k)) cur.delete(k); else cur.add(k);
    setFilterSet(cur.size === ds.categories.length ? null : cur);
  };

  if (ds.mode === 'categorical' || ds.mode === 'binary') {
    return (
      <div className="legend">
        <span className="lg-title">{window.t('lg.cat')}</span>
        <div className="lg-items">
          {ds.categories.map(c => {
            const active = !filterSet || filterSet.has(c.key);
            return (
              <button key={c.key} className={`lg-chip ${active?'':'is-off'}`}
                      onClick={() => toggle(c.key)} style={{ color: c.color }}>
                <span className="lg-dot"/>
                <span style={{ color:'var(--ink-2)' }}>{window.t('cat.' + c.key)}</span>
              </button>
            );
          })}
        </div>
        {filterSet && <button className="lg-reset" onClick={() => setFilterSet(null)}>{window.t('lg.reset')}</button>}
      </div>
    );
  }
  const sc = ds.scale;
  const stops = ds.mode === 'diverging'
    ? [sc.min,(sc.min+sc.center)/2,sc.center,(sc.max+sc.center)/2,sc.max]
    : [sc.domain[0],(sc.domain[0]+sc.domain[1])/2,sc.domain[1]];
  return (
    <div className="legend">
      <span className="lg-title">{window.t('lg.scale')} — {ds.metricLabel}</span>
      <div className="lg-gradient">
        <div className="lg-bar" style={{ background:`linear-gradient(to right,${sc.colors.join(',')})` }}/>
        <div className="lg-ticks">
          {stops.map((s,i) => <span key={i}>{ds.mode==='diverging'&&s>0?'+':''}{Number(s).toFixed(0)}{ds.unit}</span>)}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Donation modal — data driven from ./donate/info.json
// ============================================================================
function DonationModal({ onClose }) {
  const [wallets, setWallets] = useState(null);

  useEffect(() => {
    fetch('./donate/info.json?t=' + Date.now())
      .then(r => r.json())
      .then(d => setWallets(d.donations))
      .catch(() => setWallets([]));
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{window.t('donate.title')}</div>
            <div className="modal-sub">{window.t('donate.sub')}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="modal-desc">{window.t('donate.desc')}</p>
        <div className="modal-wallets">
          {wallets === null && (
            <div className="donate-loading">{window.t('donate.loading') || 'Cargando…'}</div>
          )}
          {wallets?.map(w => <DonateCard key={w.id} wallet={w} />)}
        </div>
        <div className="modal-footer">
          {window.t('donate.footer')}
          <div className="modal-credits">by Luis Enrique Cortijo Gonzales</div>
        </div>
      </div>
    </div>
  );
}

function DonateCard({ wallet }) {
  const { currency, network, address, account_name, qr_image } = wallet;
  const meta   = COIN_META[currency] || { symbol: '?', color: '#888' };
  const uri    = walletUri(wallet);
  const isPen  = currency === 'PEN';
  const imgSrc = `./donate/${qr_image}`;

  const qrRef = useRef(null);
  const [imgOk,  setImgOk]  = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (imgOk || !uri || !qrRef.current || !window.QRCode) return;
    qrRef.current.innerHTML = '';
    new window.QRCode(qrRef.current, {
      text: uri, width: 130, height: 130,
      colorDark: '#000000', colorLight: '#ffffff',
    });
  }, [uri, imgOk]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`crypto-card${isPen ? ' yape-card' : ''}`}>
      <div className={`crypto-card-head${isPen ? ' yape-head' : ''}`} style={{ color: meta.color }}>
        {isPen ? (
          <span className="yape-logo">
            <span style={{color:'#00BF63'}}>Yape</span>
            <span style={{color:'#4A90D9', marginLeft:'4px'}}>/ Dale</span>
          </span>
        ) : (
          <>
            <span className="crypto-symbol">{meta.symbol}</span>
            <span className="crypto-name">{currency}</span>
          </>
        )}
        <span className="crypto-ticker" style={{color: meta.color}}>{currency}</span>
      </div>

      <div className="crypto-network" style={isPen ? {color:'#00BF63'} : {}}>{network}</div>

      <div className={`crypto-qr${isPen ? ' yape-qr-wrap' : ''}`}>
        {imgOk ? (
          <img src={imgSrc} alt={`${currency} QR`}
               className={isPen ? 'yape-qr-img' : 'donate-qr-img'}
               onError={() => setImgOk(false)} />
        ) : uri ? (
          <div ref={qrRef} />
        ) : (
          <div className="yape-fallback">
            <div className="yape-flag">🇵🇪</div>
            <div className="yape-fallback-name">{account_name || 'Luis Enrique Cortijo Gonzales'}</div>
            <div className="yape-fallback-hint">Busca en Yape / Dale<br/>por nombre o número</div>
          </div>
        )}
      </div>

      {address && (
        <>
          <div className="crypto-addr">{address.slice(0,10)}…{address.slice(-8)}</div>
          <button className={`crypto-copy-btn ${copied?'is-copied':''}`} onClick={copy}>
            {copied ? window.t('donate.copied') : window.t('donate.copy')}
          </button>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
