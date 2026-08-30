#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${SIPANDU_APP_ROOT:-/home/matematikaunsulb/apps/sipandu}"
CURRENT_LINK="$APP_ROOT/current"
BACKUP_ROOT="$APP_ROOT/shared/hotfix-backups"
RAW_BASE="https://raw.githubusercontent.com/wadaiiiii/sipandu/main"

if [ ! -L "$CURRENT_LINK" ]; then
  echo "ERROR: current symlink tidak ditemukan: $CURRENT_LINK" >&2
  exit 1
fi

CURRENT="$(readlink -f "$CURRENT_LINK")"
BLADE="$CURRENT/resources/views/app.blade.php"
PARTIAL_DIR="$CURRENT/resources/views/partials"
PARTIAL="$PARTIAL_DIR/class-card-ui-precision.blade.php"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP-class-card-ui"

if [ ! -f "$CURRENT/artisan" ] || [ ! -f "$BLADE" ]; then
  echo "ERROR: release aktif tidak valid: $CURRENT" >&2
  exit 1
fi

mkdir -p "$BACKUP" "$PARTIAL_DIR"
cp -a "$BLADE" "$BACKUP/app.blade.php"
[ -f "$PARTIAL" ] && cp -a "$PARTIAL" "$BACKUP/class-card-ui-precision.blade.php" || true

echo "Release aktif : $CURRENT"
echo "Backup        : $BACKUP"

echo "Mengambil UI presisi terbaru..."
curl -fsSL "$RAW_BASE/resources/views/partials/class-card-ui-precision.blade.php" -o "$PARTIAL"

if ! grep -q "partials.class-card-ui-precision" "$BLADE"; then
  sed -i "/<\/body>/i\\    @include('partials.class-card-ui-precision')" "$BLADE"
fi

(cd "$CURRENT" && php artisan optimize:clear)

echo
echo "HOTFIX UI KARTU KELAS SELESAI"
echo "Tulisan, tombol, ikon, kode kelas, dan panel peserta sudah dipresisikan."
echo "Refresh dengan Ctrl+Shift+R."
