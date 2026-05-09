#!/usr/bin/env bash
# HantaTracker — Setup automático para Raspberry Pi 4 (Raspbian / Debian)
# Ejecutar:  bash setup.sh

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$BACKEND_DIR")"

echo "▸ Backend dir: $BACKEND_DIR"
echo "▸ Repo root:   $REPO_ROOT"

# 1. Dependencias del sistema
echo "▸ Instalando paquetes apt…"
sudo apt-get update -qq
sudo apt-get install -y python3 python3-venv python3-pip git

# 2. Virtualenv aislado
echo "▸ Creando venv en $BACKEND_DIR/venv…"
python3 -m venv "$BACKEND_DIR/venv"
# shellcheck disable=SC1091
source "$BACKEND_DIR/venv/bin/activate"
pip install --upgrade pip
pip install -r "$BACKEND_DIR/requirements.txt"
deactivate

# 3. Test rápido en modo offline
echo "▸ Probando ciclo en dry-run…"
"$BACKEND_DIR/venv/bin/python3" "$BACKEND_DIR/fetch_data.py" --dry-run --no-fetch || {
    echo "✗ El test falló — revisa los logs"; exit 1;
}

# 4. Verificar git remote
cd "$REPO_ROOT"
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ -z "$REMOTE_URL" ]]; then
    echo "⚠ No hay remote 'origin' configurado — añade tu repo:"
    echo "    git remote add origin git@github.com:USUARIO/REPO.git"
elif [[ "$REMOTE_URL" == https://* ]]; then
    echo "⚠ Remote es HTTPS ($REMOTE_URL)."
    echo "  Recomendado: cambiar a SSH para push sin password:"
    echo "    git remote set-url origin git@github.com:USUARIO/REPO.git"
else
    echo "✓ Remote SSH configurado: $REMOTE_URL"
fi

# 5. Instalar systemd timer
SYSTEMD_DIR="/etc/systemd/system"
echo "▸ Instalando systemd units…"
sudo cp "$BACKEND_DIR/systemd/hantatracker.service" "$SYSTEMD_DIR/"
sudo cp "$BACKEND_DIR/systemd/hantatracker.timer"   "$SYSTEMD_DIR/"
sudo systemctl daemon-reload
sudo systemctl enable --now hantatracker.timer

echo
echo "✓ Setup completo."
echo "  Timer status:     systemctl status hantatracker.timer"
echo "  Próxima ejec:     systemctl list-timers hantatracker"
echo "  Lanzar ahora:     sudo systemctl start hantatracker.service"
echo "  Logs systemd:     journalctl -u hantatracker.service -f"
echo "  Logs archivo:     tail -f $BACKEND_DIR/logs/fetch.log"
