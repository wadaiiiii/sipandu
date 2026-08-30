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
PARTIAL="$PARTIAL_DIR/class-management-ui-v2.blade.php"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP-class-open-ui"

if [ ! -f "$CURRENT/artisan" ] || [ ! -f "$BLADE" ]; then
  echo "ERROR: release aktif tidak valid: $CURRENT" >&2
  exit 1
fi

mkdir -p "$BACKUP" "$PARTIAL_DIR"
cp -a "$BLADE" "$BACKUP/app.blade.php"
for file in class-card-ui-precision.blade.php class-management-ui-v2.blade.php; do
  [ -f "$PARTIAL_DIR/$file" ] && cp -a "$PARTIAL_DIR/$file" "$BACKUP/$file" || true
done

echo "Release aktif : $CURRENT"
echo "Backup        : $BACKUP"
echo "Mengambil patch navigasi + UI Kelas Saya..."
curl -fsSL "$RAW_BASE/resources/views/partials/class-management-ui-v2.blade.php" -o "$PARTIAL"

# Hindari style lama bertumpuk. File lama tetap disimpan untuk rollback.
sed -i "/partials\.class-card-ui-precision/d" "$BLADE"
sed -i "/partials\.class-management-ui-v2/d" "$BLADE"
sed -i "/<\/body>/i\\    @include('partials.class-management-ui-v2')" "$BLADE"

(cd "$CURRENT" && php artisan optimize:clear)

echo
echo "HOTFIX BUKA KELAS + UI SELESAI"
echo "- Link Learning Timeline/Jurnal dipaksa mengikuti APP_BASE_PATH."
echo "- UI Kelas Saya menggunakan layout v2 yang lebih presisi."
echo "Refresh browser dengan Ctrl+Shift+R."
