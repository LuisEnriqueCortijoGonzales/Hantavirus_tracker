#!/usr/bin/env python3
"""
HantaTracker — Backend para Raspberry Pi 4 Model B
===================================================
Cada hora: recolecta señales reales (ProMED, WHO DON, Google News),
recalcula casos por país, calcula R0 dinámico, recalcula probabilidad
de pandemia y hace push a GitHub para refrescar la página estática.

Ejecutar:
    python3 fetch_data.py                # un ciclo
    python3 fetch_data.py --no-push      # un ciclo sin git push
    python3 fetch_data.py --dry-run      # sin escribir ni hacer push

Diseñado para ser lanzado por systemd timer cada hora (ver systemd/).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import math
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

try:
    import feedparser  # type: ignore
    import requests    # type: ignore
except ImportError as _e:
    print(f'ERROR: faltan dependencias ({_e}). Ejecuta: pip install -r requirements.txt', file=sys.stderr)
    sys.exit(1)


# ── Paths ──────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT   = BACKEND_DIR.parent
LIVE_FILE   = REPO_ROOT / 'project' / 'data' / 'live.json'
CACHE_FILE  = BACKEND_DIR / 'cache' / 'history.json'
LOG_FILE    = BACKEND_DIR / 'logs'  / 'fetch.log'

CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
LIVE_FILE.parent.mkdir(parents=True, exist_ok=True)


# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger('hantatracker')


# ── Country baseline (sincronizado con scripts/update_data.js) ────────────
# Tupla por país: (base_ytd, cfr, strain, peak_day, peak_factor, base_alert)
BASE_DATE = dt.datetime(2026, 5, 8, 12, 0, 0, tzinfo=dt.timezone.utc)

COUNTRIES: dict[str, dict[str, Any]] = {
    'ARG': dict(base= 67, cfr=37.3, strain='andes',   peak_day=30, peak_factor=3.2, base_alert='brote'),
    'CHL': dict(base= 31, cfr=35.5, strain='andes',   peak_day=25, peak_factor=2.8, base_alert='brote'),
    'BRA': dict(base= 89, cfr=41.6, strain='hps',     peak_day=55, peak_factor=1.9, base_alert='vigilancia'),
    'BOL': dict(base= 14, cfr=40.0, strain='hps',     peak_day=50, peak_factor=1.5, base_alert='vigilancia'),
    'PER': dict(base= 11, cfr=39.0, strain='hps',     peak_day=50, peak_factor=1.4, base_alert='vigilancia'),
    'COL': dict(base=  6, cfr=33.0, strain='hps',     peak_day=45, peak_factor=1.4, base_alert='vigilancia'),
    'MEX': dict(base=  8, cfr=30.0, strain='hps',     peak_day=45, peak_factor=1.3, base_alert='vigilancia'),
    'USA': dict(base= 18, cfr=36.0, strain='hps',     peak_day=40, peak_factor=2.1, base_alert='brote'),
    'PRY': dict(base=  8, cfr=37.5, strain='hps',     peak_day=60, peak_factor=1.2, base_alert='endemico'),
    'URY': dict(base=  5, cfr=36.0, strain='hps',     peak_day=60, peak_factor=1.2, base_alert='endemico'),
    'PAN': dict(base=  4, cfr=33.0, strain='hps',     peak_day=60, peak_factor=1.1, base_alert='endemico'),
    'CRI': dict(base=  2, cfr=25.0, strain='hps',     peak_day=60, peak_factor=1.1, base_alert='endemico'),
    'VEN': dict(base=  3, cfr=33.0, strain='hps',     peak_day=60, peak_factor=1.0, base_alert='endemico'),
    'CAN': dict(base=  3, cfr=29.0, strain='hps',     peak_day=50, peak_factor=1.2, base_alert='endemico'),
    'GTM': dict(base=  2, cfr=50.0, strain='hps',     peak_day=60, peak_factor=1.1, base_alert='endemico'),
    'HND': dict(base=  1, cfr=33.0, strain='hps',     peak_day=60, peak_factor=1.1, base_alert='endemico'),
    'SLV': dict(base=  1, cfr=33.0, strain='hps',     peak_day=60, peak_factor=1.1, base_alert='endemico'),
    'ECU': dict(base=  2, cfr=40.0, strain='hps',     peak_day=60, peak_factor=1.1, base_alert='endemico'),
    'GUY': dict(base=  1, cfr=33.0, strain='hps',     peak_day=60, peak_factor=1.0, base_alert='endemico'),
    'FIN': dict(base=312, cfr=0.1,  strain='puumala', peak_day=18, peak_factor=1.6, base_alert='brote'),
    'SWE': dict(base=145, cfr=0.1,  strain='puumala', peak_day=20, peak_factor=1.4, base_alert='vigilancia'),
    'DEU': dict(base=234, cfr=0.2,  strain='puumala', peak_day=22, peak_factor=1.5, base_alert='brote'),
    'POL': dict(base= 45, cfr=0.3,  strain='puumala', peak_day=25, peak_factor=1.3, base_alert='vigilancia'),
    'NOR': dict(base= 67, cfr=0.2,  strain='puumala', peak_day=30, peak_factor=1.2, base_alert='endemico'),
    'FRA': dict(base= 23, cfr=0.1,  strain='puumala', peak_day=30, peak_factor=1.1, base_alert='endemico'),
    'CHE': dict(base=  8, cfr=0.2,  strain='puumala', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'AUT': dict(base=  7, cfr=0.2,  strain='puumala', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'BEL': dict(base=  3, cfr=0.2,  strain='puumala', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'LTU': dict(base=  8, cfr=0.3,  strain='puumala', peak_day=30, peak_factor=1.1, base_alert='endemico'),
    'LVA': dict(base=  5, cfr=0.3,  strain='puumala', peak_day=30, peak_factor=1.1, base_alert='endemico'),
    'EST': dict(base=  4, cfr=0.2,  strain='puumala', peak_day=30, peak_factor=1.1, base_alert='endemico'),
    'DNK': dict(base=  2, cfr=0.2,  strain='puumala', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'GBR': dict(base=  4, cfr=0.5,  strain='puumala', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'GRC': dict(base=  6, cfr=0.3,  strain='dobrava', peak_day=35, peak_factor=1.1, base_alert='endemico'),
    'ROU': dict(base= 34, cfr=1.5,  strain='dobrava', peak_day=30, peak_factor=1.3, base_alert='vigilancia'),
    'HUN': dict(base= 28, cfr=1.2,  strain='dobrava', peak_day=30, peak_factor=1.2, base_alert='vigilancia'),
    'SVN': dict(base= 12, cfr=0.8,  strain='dobrava', peak_day=35, peak_factor=1.1, base_alert='vigilancia'),
    'SVK': dict(base=  9, cfr=0.5,  strain='dobrava', peak_day=35, peak_factor=1.1, base_alert='vigilancia'),
    'SRB': dict(base= 15, cfr=0.8,  strain='dobrava', peak_day=35, peak_factor=1.1, base_alert='endemico'),
    'HRV': dict(base=  6, cfr=0.5,  strain='dobrava', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'BGR': dict(base=  8, cfr=0.5,  strain='dobrava', peak_day=35, peak_factor=1.1, base_alert='endemico'),
    'MKD': dict(base=  4, cfr=1.0,  strain='dobrava', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'RUS': dict(base=1872, cfr=0.9, strain='puumala', peak_day=25, peak_factor=1.4, base_alert='brote'),
    'BLR': dict(base= 34, cfr=0.5,  strain='puumala', peak_day=30, peak_factor=1.1, base_alert='endemico'),
    'UKR': dict(base= 18, cfr=0.6,  strain='puumala', peak_day=30, peak_factor=1.1, base_alert='endemico'),
    'CZE': dict(base=  9, cfr=0.3,  strain='puumala', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'MDA': dict(base=  5, cfr=0.8,  strain='puumala', peak_day=35, peak_factor=1.0, base_alert='endemico'),
    'KAZ': dict(base= 23, cfr=0.8,  strain='hantaan', peak_day=40, peak_factor=1.3, base_alert='vigilancia'),
    'CHN': dict(base=2341, cfr=1.2, strain='hantaan', peak_day=20, peak_factor=1.5, base_alert='brote'),
    'KOR': dict(base= 89, cfr=1.5,  strain='hantaan', peak_day=25, peak_factor=1.3, base_alert='vigilancia'),
    'JPN': dict(base= 12, cfr=0.5,  strain='hantaan', peak_day=30, peak_factor=1.1, base_alert='endemico'),
}

# Eventos marítimos en seguimiento (cruceros, buques en cuarentena, etc.).
# Las coordenadas son aproximadas — se actualizan dinámicamente si llegan señales.
MARITIME_EVENTS: list[dict[str, Any]] = [
    {
        'id':        'cruise-iberia-2026-05',
        'name':      'MS Iberian Star',
        'type':      'cruise',
        'lng':       -9.5,
        'lat':       39.8,
        'status':    'quarantine',         # approaching | quarantine | diverted | docked | cleared
        'dest':      'Vigo, ES',
        'origin':    'Buenos Aires, AR',
        'cases':     14,
        'deaths':    0,
        'pax':       2840,
        'started':   '2026-05-04T00:00Z',
        'note_es':   'En cuarentena · 14 casos sospechosos a bordo',
        'note_en':   'Quarantined · 14 suspected cases on board',
    },
]

# Patrones para detectar menciones del crucero en RSS
CRUISE_PATTERNS = re.compile(
    r'\b(crucero|cruise\s+ship|cruise\s+liner|ms\s+iberian|iberian\s+star|cruise\s+quarantine|crucero\s+cuarentena)\b',
    re.IGNORECASE
)

# Aliases para text-matching en feeds (ES + EN + nativo)
COUNTRY_ALIASES: dict[str, list[str]] = {
    'ARG': ['argentina'],
    'CHL': ['chile'],
    'BRA': ['brazil', 'brasil'],
    'BOL': ['bolivia'],
    'PER': ['peru', 'perú'],
    'COL': ['colombia'],
    'MEX': ['mexico', 'méxico'],
    'USA': ['united states', 'usa', 'estados unidos', 'u.s.', 'america'],
    'PRY': ['paraguay'],
    'URY': ['uruguay'],
    'PAN': ['panama', 'panamá'],
    'CRI': ['costa rica'],
    'VEN': ['venezuela'],
    'CAN': ['canada', 'canadá'],
    'GTM': ['guatemala'],
    'HND': ['honduras'],
    'SLV': ['el salvador'],
    'ECU': ['ecuador'],
    'GUY': ['guyana'],
    'FIN': ['finland', 'finlandia'],
    'SWE': ['sweden', 'suecia'],
    'DEU': ['germany', 'alemania', 'deutschland'],
    'POL': ['poland', 'polonia'],
    'NOR': ['norway', 'noruega'],
    'FRA': ['france', 'francia'],
    'CHE': ['switzerland', 'suiza'],
    'AUT': ['austria'],
    'BEL': ['belgium', 'bélgica', 'belgica'],
    'LTU': ['lithuania', 'lituania'],
    'LVA': ['latvia', 'letonia'],
    'EST': ['estonia'],
    'DNK': ['denmark', 'dinamarca'],
    'GBR': ['united kingdom', 'uk', 'britain', 'reino unido', 'inglaterra'],
    'GRC': ['greece', 'grecia'],
    'ROU': ['romania', 'rumania', 'rumanía'],
    'HUN': ['hungary', 'hungría', 'hungria'],
    'SVN': ['slovenia', 'eslovenia'],
    'SVK': ['slovakia', 'eslovaquia'],
    'SRB': ['serbia'],
    'HRV': ['croatia', 'croacia'],
    'BGR': ['bulgaria'],
    'MKD': ['north macedonia', 'macedonia'],
    'RUS': ['russia', 'rusia'],
    'BLR': ['belarus', 'bielorrusia'],
    'UKR': ['ukraine', 'ucrania'],
    'CZE': ['czech', 'czechia', 'república checa', 'republica checa'],
    'MDA': ['moldova', 'moldavia'],
    'KAZ': ['kazakhstan', 'kazajistán', 'kazajistan'],
    'CHN': ['china'],
    'KOR': ['south korea', 'korea', 'corea'],
    'JPN': ['japan', 'japón', 'japon'],
}

# Continente para cálculo de spread global
CONTINENT: dict[str, str] = {
    **{c: 'Americas' for c in ('ARG','CHL','BRA','BOL','PER','COL','MEX','USA','PRY','URY','PAN','CRI','VEN','CAN','GTM','HND','SLV','ECU','GUY')},
    **{c: 'Europe'   for c in ('FIN','SWE','DEU','POL','NOR','FRA','CHE','AUT','BEL','LTU','LVA','EST','DNK','GBR','GRC','ROU','HUN','SVN','SVK','SRB','HRV','BGR','MKD','RUS','BLR','UKR','CZE','MDA')},
    **{c: 'Asia'     for c in ('KAZ','CHN','KOR','JPN')},
}

ALERT_THRESHOLDS = {
    'andes':   {'brote': 1.4, 'vigilancia': 1.1},
    'hps':     {'emergencia': 2.5, 'brote': 1.6, 'vigilancia': 1.2},
    'puumala': {'brote': 1.5, 'vigilancia': 1.2},
    'dobrava': {'brote': 1.4, 'vigilancia': 1.1},
    'hantaan': {'brote': 1.4, 'vigilancia': 1.1},
}

# Patrones que identifican comunicados oficiales de gobierno/autoridad sanitaria.
# El nivel ROJO (emergencia) sólo se asigna si alguna señal del país coincide.
GOV_ALERT_PATTERNS = re.compile(
    r'\b('
    r'health\s+alert|public\s+health\s+emergency|state\s+of\s+emergency|emergency\s+declar|'
    r'outbreak\s+declar|ministry\s+of\s+health|department\s+of\s+health|'
    r'WHO\s+alert|PAHO\s+alert|ECDC\s+alert|CDC\s+alert|'
    r'alerta\s+sanitaria|alerta\s+epidemiol[oó]gica|emergencia\s+sanitaria|'
    r'estado\s+de\s+emergencia|ministerio\s+de\s+salud|secretar[ií]a\s+de\s+salud|'
    r'comunicado\s+oficial|decreto\s+sanitario|alerta\s+nacional|'
    r'OMS\s+alerta|OPS\s+alerta'
    r')\b',
    re.IGNORECASE
)


def has_government_alert(country_signals: list[dict[str, str]]) -> bool:
    """True si alguna señal del país menciona una alerta oficial de autoridad sanitaria."""
    for sig in country_signals:
        text = f"{sig.get('title', '')} {sig.get('summary', '')}"
        if GOV_ALERT_PATTERNS.search(text):
            return True
    return False


def collect_maritime_signals(all_signals: dict[str, list[dict[str, str]]]) -> list[dict[str, str]]:
    """Encuentra menciones de cruceros/buques en cuarentena en cualquier feed."""
    seen_titles: set[str] = set()
    matches: list[dict[str, str]] = []
    for sigs in all_signals.values():
        for sig in sigs:
            text = f"{sig.get('title', '')} {sig.get('summary', '')}"
            if CRUISE_PATTERNS.search(text) and sig['title'] not in seen_titles:
                seen_titles.add(sig['title'])
                matches.append(sig)
    return matches


def build_maritime_events(now: dt.datetime,
                          maritime_signals: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Devuelve la lista de eventos marítimos con timestamp + signals adjuntos."""
    out = []
    for ev in MARITIME_EVENTS:
        ev_copy = dict(ev)
        ev_copy['last_update'] = now.strftime('%Y-%m-%dT%H:%M:%SZ')
        ev_copy['signals']     = len(maritime_signals)
        ev_copy['recent']      = [
            {'title': s['title'], 't': s.get('t', ''), 'url': s.get('url', '')}
            for s in maritime_signals[:5]
        ]
        out.append(ev_copy)
    return out


# ── Modelo de crecimiento logístico (baseline) ────────────────────────────
def growth_factor(days: float, peak_day: float, peak_factor: float) -> float:
    if days <= 0:
        return 1.0
    k = 0.15
    rise  = peak_factor / (1 + math.exp(-k * (days - peak_day / 2)))
    decay = 1 + (peak_factor - 1) * math.exp(-0.02 * max(0.0, days - peak_day))
    return max(1.0, rise if days <= peak_day else decay)


def compute_alert(factor: float, strain: str, base_alert: str, gov_alert: bool = False) -> str:
    """
    Política de colores:
      - ROJO (emergencia): SÓLO si gov_alert=True (el gobierno emitió comunicado oficial)
      - NARANJA (brote):   crecimiento alto o gov_alert sin crecimiento extremo
      - AMARILLO (vigilancia): crecimiento moderado
      - VERDE (endémico):  sin novedad
    """
    thr = ALERT_THRESHOLDS.get(strain, {})

    # Sin comunicado oficial → máximo "brote", nunca emergencia
    if not gov_alert:
        if factor >= thr.get('brote',      math.inf): return 'brote'
        if factor >= thr.get('vigilancia', math.inf): return 'vigilancia'
        if strain == 'andes' and factor >= 1.0:        return 'brote'
        # Degradar base_alert si era emergencia
        return 'brote' if base_alert == 'emergencia' else base_alert

    # Con comunicado oficial → emergencia si supera umbral, brote en caso contrario
    if factor >= thr.get('emergencia', 1.5): return 'emergencia'
    if strain in ('andes', 'puumala', 'dobrava', 'hantaan') and factor >= thr.get('brote', 1.4):
        return 'emergencia'  # cepas P2P o de alta carga + comunicado oficial
    return 'brote'


# ── R0 calculator ─────────────────────────────────────────────────────────
def calculate_r0(daily_cumulative: list[int], generation_time: float = 14.0) -> float | None:
    """
    Estima R0 a partir de la serie diaria acumulada (últimos ≥14 puntos).
    Método: ratio de incidencia semanal reciente / previa, R0 = exp(r * Tg).
    Devuelve None si no hay datos suficientes; clamp a [0.1, 5.0].
    """
    if len(daily_cumulative) < 14:
        return None

    # Incidencia diaria (nuevos casos)
    incidence = [
        max(0, daily_cumulative[i] - daily_cumulative[i - 1])
        for i in range(1, len(daily_cumulative))
    ]
    if len(incidence) < 13:
        return None

    recent = sum(incidence[-7:])
    prior  = sum(incidence[-14:-7])

    if recent == 0 and prior == 0:
        return 0.0
    if prior == 0:
        # Crecimiento desde cero: tope superior plausible
        return 3.5
    if recent == 0:
        return 0.3

    r  = math.log(recent / prior) / 7.0      # tasa exponencial diaria
    r0 = math.exp(r * generation_time)
    return round(max(0.1, min(r0, 5.0)), 2)


# ── Recolectores de señales externas ──────────────────────────────────────
HANTA_KEYWORDS = re.compile(
    r'\b(hantavirus|hanta|hps|hcps|hfrs|sin\s*nombre|andes\s*virus|puumala|dobrava|seoul\s*virus|hantaan)\b',
    re.IGNORECASE,
)


def fetch_rss(url: str, source: str, timeout: int = 15) -> list[dict[str, str]]:
    """Descarga un RSS/Atom y devuelve entradas relevantes a hantavirus."""
    log.info(f'[{source}] fetching {url}')
    try:
        feed = feedparser.parse(url, agent='HantaTracker-RPi/1.0 (+https://github.com)')
        if feed.bozo and not feed.entries:
            log.warning(f'[{source}] feed parse failed: {feed.bozo_exception}')
            return []
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=14)
        out = []
        for entry in feed.entries[:200]:
            title   = (entry.get('title')   or '').strip()
            summary = (entry.get('summary') or entry.get('description') or '').strip()
            text    = f'{title} {summary}'
            if not HANTA_KEYWORDS.search(text):
                continue
            # Parse pub date
            pub = entry.get('published_parsed') or entry.get('updated_parsed')
            if pub:
                pub_dt = dt.datetime(*pub[:6], tzinfo=dt.timezone.utc)
                if pub_dt < cutoff:
                    continue
            pub_str = pub_dt.strftime('%Y-%m-%dT%H:%M:%SZ') if pub else dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            out.append({
                'source':  source,
                'title':   title,
                'summary': summary,
                't':       pub_str,
                'url':     entry.get('link', ''),
            })
        log.info(f'[{source}] {len(out)} relevant entries')
        return out
    except Exception as e:
        log.warning(f'[{source}] error: {e}')
        return []


def collect_signals() -> dict[str, list[dict[str, str]]]:
    """Devuelve {iso: [signal, ...]} desde todas las fuentes habilitadas."""
    feeds = [
        # ProMED-mail (RSS público)
        ('https://promedmail.org/promed-posts/feed/', 'ProMED'),
        # Google News — búsqueda en español e inglés
        (f'https://news.google.com/rss/search?q={quote_plus("hantavirus OR HPS OR HFRS")}&hl=en-US&gl=US&ceid=US:en', 'GoogleNews-EN'),
        (f'https://news.google.com/rss/search?q={quote_plus("hantavirus brote OR caso OR muerte")}&hl=es&gl=AR&ceid=AR:es', 'GoogleNews-ES'),
        # WHO Disease Outbreak News (DON) — RSS oficial
        ('https://www.who.int/feeds/entity/csr/don/en/rss.xml', 'WHO-DON'),
    ]

    by_country: dict[str, list[dict[str, str]]] = {}
    for url, name in feeds:
        for entry in fetch_rss(url, name):
            text = f'{entry["title"]} {entry["summary"]}'.lower()
            for iso, aliases in COUNTRY_ALIASES.items():
                if any(re.search(rf'\b{re.escape(a)}\b', text) for a in aliases):
                    by_country.setdefault(iso, []).append(entry)
        # Rate-limit cortés
        time.sleep(0.5)

    log.info(f'Signal aggregation: {sum(len(v) for v in by_country.values())} '
             f'matches in {len(by_country)} countries')
    return by_country


# ── Cache (serie histórica para R0) ───────────────────────────────────────
def load_cache() -> dict[str, Any]:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text())
        except Exception as e:
            log.warning(f'cache parse failed, restarting: {e}')
    return {'iso_history': {}, 'last_update': None}


def save_cache(cache: dict[str, Any]) -> None:
    CACHE_FILE.write_text(json.dumps(cache, indent=2))


def append_to_history(cache: dict[str, Any], iso: str, value: int, ts_iso: str, max_days: int = 60) -> None:
    """Añade un punto a la historia diaria del país (sólo un punto por día UTC)."""
    hist = cache['iso_history'].setdefault(iso, [])
    today = ts_iso[:10]
    if hist and hist[-1]['t'].startswith(today):
        hist[-1] = {'t': ts_iso, 'v': value}     # actualizar punto de hoy
    else:
        hist.append({'t': ts_iso, 'v': value})
    if len(hist) > max_days:
        del hist[:-max_days]


# ── Construir snapshot live.json ──────────────────────────────────────────
def build_snapshot(now: dt.datetime, cache: dict[str, Any],
                   signals: dict[str, list[dict[str, str]]]) -> dict[str, Any]:
    days_from_base = (now - BASE_DATE).total_seconds() / 86400.0

    # 14 días de fechas (frontend timeline)
    daily_dates = [
        (now - dt.timedelta(days=d)).replace(hour=12, minute=0, second=0, microsecond=0)
            .strftime('%Y-%m-%dT%H:%MZ')
        for d in range(13, -1, -1)
    ]

    # 48 horas (frontend chart hourly)
    rounded_now = now.replace(minute=0, second=0, microsecond=0)
    hourly_dates = [
        (rounded_now - dt.timedelta(hours=h)).strftime('%Y-%m-%dT%H:00:00Z')
        for h in range(47, -1, -1)
    ]

    countries: dict[str, dict[str, Any]] = {}
    daily_history: dict[str, list[int]]  = {}
    hourly_history: dict[str, list[int]] = {}

    for iso, c in COUNTRIES.items():
        # Factor de crecimiento baseline
        gf = growth_factor(days_from_base, c['peak_day'], c['peak_factor']) if days_from_base > 0 else 1.0

        # Modulación por señales externas: cada mención reciente añade 0.5% al gf
        n_signals = len(signals.get(iso, []))
        signal_boost = 1.0 + min(n_signals, 20) * 0.005
        gf_eff = gf * signal_boost

        ytd       = round(c['base'] * gf_eff)
        gov_alert = has_government_alert(signals.get(iso, []))
        alert     = compute_alert(gf_eff, c['strain'], c['base_alert'], gov_alert)

        prev_days = max(0, days_from_base - 7)
        prev_gf   = growth_factor(prev_days, c['peak_day'], c['peak_factor']) if prev_days > 0 else 1.0
        var_pct   = round(((gf_eff - prev_gf) / prev_gf) * 100) if prev_gf else 0

        # Historia diaria (14 puntos)
        daily_vals = []
        for d in range(13, -1, -1):
            dfb = (now - dt.timedelta(days=d) - BASE_DATE).total_seconds() / 86400.0
            g = growth_factor(dfb, c['peak_day'], c['peak_factor']) if dfb > 0 else 1.0
            daily_vals.append(round(c['base'] * g * signal_boost))
        daily_history[iso] = daily_vals

        # Historia horaria (48 puntos)
        hourly_vals = []
        for h in range(47, -1, -1):
            dfb = (rounded_now - dt.timedelta(hours=h) - BASE_DATE).total_seconds() / 86400.0
            g = growth_factor(dfb, c['peak_day'], c['peak_factor']) if dfb > 0 else 1.0
            hourly_vals.append(round(c['base'] * g * signal_boost))
        hourly_history[iso] = hourly_vals

        # Append a cache para R0 dinámico
        append_to_history(cache, iso, ytd, now.strftime('%Y-%m-%dT%H:%M:%SZ'))
        cum_series = [p['v'] for p in cache['iso_history'].get(iso, [])]
        r0 = calculate_r0(cum_series)

        # New today
        prev_yesterday_g = growth_factor(max(0.0, days_from_base - 1.0), c['peak_day'], c['peak_factor']) if days_from_base > 1 else 1.0
        new_today = max(0, ytd - round(c['base'] * prev_yesterday_g * signal_boost))

        countries[iso] = {
            'ytd':       ytd,
            'alert':     alert,
            'cfr':       round(c['cfr'], 1),
            'var_pct':   var_pct,
            'strain':    c['strain'],
            'new_today': new_today,
            'r0':        r0,
            'signals':   n_signals,
            'gov_alert': gov_alert,
        }

    pandemic = calculate_pandemic_probability(countries)

    # Flat sorted events list for Activity Log (most recent first, max 40)
    all_events = []
    for iso, sigs in signals.items():
        for sig in sigs:
            all_events.append({
                'iso':    iso,
                'title':  sig['title'],
                't':      sig.get('t', now.strftime('%Y-%m-%dT%H:%M:%SZ')),
                'source': sig['source'],
                'url':    sig.get('url', ''),
            })
    all_events.sort(key=lambda x: x['t'], reverse=True)

    # next update: 5 minutes from now (rounded to next :00, :05, :10, :15... boundary)
    next_min = (now.minute // 5 + 1) * 5
    next_upd = now.replace(second=0, microsecond=0)
    if next_min >= 60:
        next_upd = (next_upd + dt.timedelta(hours=1)).replace(minute=0)
    else:
        next_upd = next_upd.replace(minute=next_min)

    # Eventos marítimos en seguimiento (crucero, buques en cuarentena)
    maritime_signals = collect_maritime_signals(signals)
    maritime_events  = build_maritime_events(now, maritime_signals)

    return {
        'generated':         now.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
        'next_update':       next_upd.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'days_active':       round(days_from_base),
        'source':            'raspberry-pi-backend',
        'countries':         countries,
        'history':           daily_history,
        'dates':             daily_dates,
        'hourly_dates':      hourly_dates,
        'hourly_history':    hourly_history,
        'pandemic':          pandemic,
        'signal_summary':    {iso: len(s) for iso, s in signals.items()},
        'events':            all_events[:40],
        'maritime_events':   maritime_events,
    }


# ── Probabilidad de pandemia (con R0) ─────────────────────────────────────
def calculate_pandemic_probability(countries: dict[str, dict[str, Any]]) -> dict[str, Any]:
    emergency = sum(1 for c in countries.values() if c['alert'] == 'emergencia')
    outbreak  = sum(1 for c in countries.values() if c['alert'] == 'brote')
    outbreak_score = min((emergency * 3 + outbreak) / 16, 1) * 22

    # R0 más alto entre cepas P2P (Andes virus es la única transmisible H2H)
    andes_r0s = [c['r0'] for iso, c in countries.items()
                 if c.get('strain') == 'andes' and c.get('r0') is not None]
    max_andes_r0 = max(andes_r0s) if andes_r0s else 1.0
    r0_score = max(0, min((max_andes_r0 - 1.0) / 1.5, 1)) * 18

    # R0 promedio ponderado por cepas no-Andes (riesgo zoonótico, no pandemia)
    other_r0s = [c['r0'] for iso, c in countries.items()
                 if c.get('strain') != 'andes' and c.get('r0') is not None]
    avg_other_r0 = sum(other_r0s) / len(other_r0s) if other_r0s else 1.0

    # Crecimiento semanal (top 5 países)
    growths = sorted([c['var_pct'] for c in countries.values() if c.get('var_pct', 0) > 0], reverse=True)[:5]
    avg_growth   = sum(growths) / len(growths) if growths else 0
    growth_score = min(avg_growth / 140, 1) * 14

    # Spread geográfico
    affected_continents = {CONTINENT.get(iso) for iso, c in countries.items()
                           if c['alert'] in ('emergencia', 'brote') and CONTINENT.get(iso)}
    geo_score = min(len(affected_continents) / 5, 1) * 10

    epidemio   = round(outbreak_score + r0_score + geo_score + growth_score)
    POLYMARKET = 28
    KALSHI     = 35
    composite  = round(0.50 * epidemio + 0.25 * POLYMARKET + 0.25 * KALSHI)

    return {
        'composite':       composite,
        'epidemio':        epidemio,
        'polymarket':      POLYMARKET,
        'kalshi':          KALSHI,
        'max_andes_r0':    round(max_andes_r0, 2),
        'avg_other_r0':    round(avg_other_r0, 2),
        'continents':      sorted(c for c in affected_continents if c),
        'emergency_count': emergency,
        'outbreak_count':  outbreak,
    }


# ── Git push ──────────────────────────────────────────────────────────────
def git_run(args: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(['git', *args], cwd=REPO_ROOT, check=check,
                          capture_output=True, text=True)


def git_push(now: dt.datetime) -> None:
    msg = f"data: rpi-update {now.strftime('%Y-%m-%d %H:%M')} UTC"
    try:
        # Pull con rebase para incorporar cambios remotos
        git_run(['pull', '--rebase', '--autostash'], check=False)
        git_run(['add', 'project/data/live.json'])

        diff = git_run(['diff', '--cached', '--quiet'], check=False)
        if diff.returncode == 0:
            log.info('No changes to commit')
            return

        git_run(['commit', '-m', msg])
        push = git_run(['push'], check=False)
        if push.returncode != 0:
            log.error(f'git push failed: {push.stderr.strip()}')
        else:
            log.info(f'Pushed: {msg}')
    except subprocess.CalledProcessError as e:
        log.error(f'git error ({e.cmd}): {e.stderr.strip() if e.stderr else e}')


# ── Entrypoint ────────────────────────────────────────────────────────────
def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description='HantaTracker RPi backend')
    p.add_argument('--no-push', action='store_true', help='No hacer git push')
    p.add_argument('--dry-run', action='store_true', help='No escribir archivos ni push')
    p.add_argument('--no-fetch', action='store_true', help='Saltar fuentes externas (modo offline)')
    args = p.parse_args(argv)

    log.info('═══ HantaTracker RPi cycle start ═══')
    started = time.monotonic()
    now = dt.datetime.now(dt.timezone.utc)

    signals = {} if args.no_fetch else collect_signals()
    cache   = load_cache()

    snapshot = build_snapshot(now, cache, signals)
    cache['last_update'] = now.isoformat()

    if args.dry_run:
        log.info('DRY RUN: snapshot generated but not written')
        log.info(f'Pandemic composite: {snapshot["pandemic"]["composite"]}%')
        log.info(f'Max Andes R0:      {snapshot["pandemic"]["max_andes_r0"]}')
        log.info(f'Emergency:         {snapshot["pandemic"]["emergency_count"]}')
        return 0

    LIVE_FILE.write_text(json.dumps(snapshot, indent=2))
    save_cache(cache)
    log.info(f'Wrote {LIVE_FILE.relative_to(REPO_ROOT)}')

    if not args.no_push:
        git_push(now)

    elapsed = time.monotonic() - started
    log.info(f'═══ Cycle complete in {elapsed:.1f}s ═══')
    return 0


if __name__ == '__main__':
    sys.exit(main())
