# HantaTracker — Backend Raspberry Pi 4

Recolector horario que corre en una **Raspberry Pi 4 Model B** (Raspbian / Debian / Ubuntu).
Cada hora:

1. Descarga señales reales de **ProMED-mail**, **WHO Disease Outbreak News** y **Google News** (RSS público).
2. Extrae menciones de hantavirus por país y modula el modelo logístico baseline.
3. Calcula **R0 dinámico** por país a partir de la serie de incidencia (cache local de 60 días).
4. Recalcula la **probabilidad de pandemia** (epidemiológica + R0 Andes + spread + crecimiento).
5. Escribe `project/data/live.json` y hace `git push` a GitHub.
6. El workflow `pages.yml` redespliega GitHub Pages automáticamente.

```
ProMED RSS ─┐
WHO DON   ─┼─→  fetch_data.py  ──→  live.json  ──git push──→  GitHub Pages
Google News ┘    (R0 + pandemic)
```

---

## Requisitos

- Raspberry Pi 4 Model B con Raspbian/Debian Bookworm (o cualquier Linux con systemd)
- Python 3.9+
- Acceso SSH al repo de GitHub (recomendado) — ver más abajo

---

## Instalación rápida

```bash
ssh pi@raspberrypi.local
cd ~
git clone git@github.com:TU_USUARIO/proyecto_tracker.git
cd proyecto_tracker/backend
bash setup.sh
```

`setup.sh` hace todo: instala dependencias apt, crea venv, instala paquetes Python, prueba un dry-run, instala el systemd timer.

---

## Setup manual paso a paso

### 1. Clonar repo

```bash
git clone git@github.com:TU_USUARIO/proyecto_tracker.git ~/proyecto_tracker
```

### 2. Generar SSH key para que la Pi pueda hacer push

```bash
ssh-keygen -t ed25519 -C "raspberrypi-hantatracker" -f ~/.ssh/id_ed25519_hanta -N ""
cat ~/.ssh/id_ed25519_hanta.pub
```

Copia esa clave a GitHub: **Settings → SSH and GPG keys → New SSH key**. Después:

```bash
# Configura git para usar esa key con github.com
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_hanta
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

# Verifica
ssh -T git@github.com    # debe responder con tu username
```

Si clonaste por HTTPS, cambia a SSH:

```bash
cd ~/proyecto_tracker
git remote set-url origin git@github.com:TU_USUARIO/proyecto_tracker.git
```

### 3. Configurar identidad de los commits

```bash
cd ~/proyecto_tracker
git config user.name  "HantaTracker RPi Bot"
git config user.email "hantapi@noreply.local"
```

### 4. Instalar dependencias y venv

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip git
cd ~/proyecto_tracker/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### 5. Probar manualmente

```bash
# Dry-run sin red ni push (rápido — sólo lógica)
./venv/bin/python3 fetch_data.py --dry-run --no-fetch

# Ciclo completo SIN push (descarga señales, escribe live.json, no commitea)
./venv/bin/python3 fetch_data.py --no-push

# Ciclo completo CON push (lo que hará systemd cada hora)
./venv/bin/python3 fetch_data.py
```

### 6. Activar el timer de systemd

```bash
sudo cp systemd/hantatracker.service /etc/systemd/system/
sudo cp systemd/hantatracker.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hantatracker.timer
```

Verificar:

```bash
systemctl status hantatracker.timer
systemctl list-timers hantatracker
journalctl -u hantatracker.service -f      # logs en vivo
```

---

## Flags del script

| Flag         | Qué hace                                                          |
|--------------|-------------------------------------------------------------------|
| `--no-push`  | Genera `live.json` pero no hace `git push`                        |
| `--no-fetch` | Salta los feeds RSS (usa solo el modelo baseline + cache previo)  |
| `--dry-run`  | No escribe `live.json` ni hace push (útil para probar la lógica)  |

---

## Cómo se calcula R0

El script mantiene un cache (`cache/history.json`) con la serie diaria acumulada por país. Cada hora añade el dato actual; cuando hay ≥14 puntos:

```
incidencia_diaria[i] = max(0, acum[i] - acum[i-1])
incidencia_reciente  = sum(incidencia[-7:])         # última semana
incidencia_previa    = sum(incidencia[-14:-7])      # semana anterior
r                    = ln(reciente / previa) / 7    # tasa exp. diaria
R0                   = exp(r * Tg),  Tg = 14 días
```

`Tg=14` es el **generation time** típico de hantavirus (incubación + ventana infecciosa).
R0 se acota a `[0.1, 5.0]`.

**Interpretación:**
- R0 < 1   → brote en declive
- R0 ≈ 1   → estable / endémico
- R0 > 1   → expansión (relevante solo en cepas P2P como **Andes**)

> Las cepas no-Andes (HPS sigmodontino, Puumala, Dobrava, Hantaan) son **zoonóticas
> sin transmisión persona-a-persona**, así que su R0 es indicador de exposición ambiental,
> no de pandemia. La probabilidad de pandemia pondera con peso especial el R0 de Andes.

---

## Flujo de datos en producción

```
[Pi cron 1h]  fetch_data.py
       │
       ├─ ProMED RSS         (señales)
       ├─ WHO DON RSS        (señales)
       ├─ Google News RSS    (señales)
       ├─ cache/history.json (serie temporal local → R0)
       ▼
  live.json   ──git push──→  GitHub main
                                  │
                       ┌──────────┴──────────┐
                       │                     │
                  pages.yml            (browser fetch
                       │                ./data/live.json
                       ▼                 cada hora)
              GitHub Pages CDN  ◀─── usuarios
```

---

## Coordinación con GitHub Actions

Si la Pi está activa, **deshabilita el cron** del workflow `update-data.yml` para evitar
que ambos compitan escribiendo `live.json`. Edita `.github/workflows/update-data.yml`:

```yaml
on:
  # schedule:
  #   - cron: '0 * * * *'   ← comentado: la Pi es la fuente
  workflow_dispatch:        # ← solo manual (fallback)
```

Si la Pi está caída, puedes lanzar el workflow desde GitHub UI manualmente como respaldo.

---

## Troubleshooting

**El push falla con `Permission denied (publickey)`:**
- Verifica `ssh -T git@github.com` desde el usuario `pi`
- Confirma que el remote es SSH: `git remote -v`

**El timer no dispara:**
- `systemctl list-timers hantatracker` debe mostrar `NEXT`
- `journalctl -u hantatracker.service` muestra errores
- Verifica reloj de la Pi: `timedatectl` (debe estar en sync por NTP)

**`feedparser` falla:**
- Algunos feeds requieren User-Agent realista — el script ya envía uno. Si una fuente bloquea, los logs lo reportan y se siguen procesando las demás.

**R0 sale `null` para todos los países:**
- Necesita al menos 14 puntos en cache. Espera 14 horas (o cambia el threshold en `calculate_r0`).

---

## Estructura

```
backend/
├── fetch_data.py             # script principal (un ciclo)
├── requirements.txt          # deps Python
├── setup.sh                  # instalador one-shot
├── .env.example              # variables opcionales
├── README.md                 # este archivo
├── systemd/
│   ├── hantatracker.service  # unit oneshot
│   └── hantatracker.timer    # cron horario
├── cache/
│   └── history.json          # generado en runtime (R0 input)
└── logs/
    └── fetch.log             # generado en runtime
```
