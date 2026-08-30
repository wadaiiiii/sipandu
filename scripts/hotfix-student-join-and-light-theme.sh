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
SERVICE="$CURRENT/app/Services/Classroom/ClassJoinCodeService.php"
PWA_HEAD="$CURRENT/resources/views/partials/pwa-head.blade.php"
THEME_PARTIAL="$CURRENT/resources/views/partials/authenticated-theme-default.blade.php"
BLADE="$CURRENT/resources/views/app.blade.php"
MIGRATION="$CURRENT/database/migrations/2026_08_30_143000_add_custom_join_code_to_course_classes.php"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/$STAMP-student-join-theme"

if [ ! -f "$CURRENT/artisan" ] || [ ! -f "$BLADE" ]; then
  echo "ERROR: release aktif tidak valid: $CURRENT" >&2
  exit 1
fi

mkdir -p "$BACKUP" "$(dirname "$SERVICE")" "$(dirname "$PWA_HEAD")" "$(dirname "$MIGRATION")"
for file in "$SERVICE" "$PWA_HEAD" "$THEME_PARTIAL" "$BLADE" "$MIGRATION"; do
  [ -f "$file" ] && cp -a "$file" "$BACKUP/$(basename "$file")" || true
done

echo "Release aktif : $CURRENT"
echo "Backup        : $BACKUP"
echo "Memasang perbaikan join mahasiswa..."

curl -fsSL "$RAW_BASE/app/Services/Classroom/ClassJoinCodeService.php" -o "$SERVICE"
curl -fsSL "$RAW_BASE/database/migrations/2026_08_30_143000_add_custom_join_code_to_course_classes.php" -o "$MIGRATION"

echo "Memastikan kolom join_code tersedia..."
(cd "$CURRENT" && php artisan migrate --force)

echo "Memasang default mode terang..."
curl -fsSL "$RAW_BASE/resources/views/partials/pwa-head.blade.php" -o "$PWA_HEAD"
curl -fsSL "$RAW_BASE/resources/views/partials/authenticated-theme-default.blade.php" -o "$THEME_PARTIAL"

sed -i "/partials\.authenticated-theme-default/d" "$BLADE"
sed -i "/<\/body>/i\\    @include('partials.authenticated-theme-default')" "$BLADE"

(cd "$CURRENT" && php artisan optimize:clear)
(cd "$CURRENT" && php artisan config:cache)
(cd "$CURRENT" && php artisan route:cache)
(cd "$CURRENT" && php artisan view:cache)

echo
echo "HOTFIX JOIN MAHASISWA + TEMA SELESAI"
echo "- Kode join otomatis tidak lagi error jika kolom custom belum tersedia."
echo "- Migrasi join_code sudah dipastikan terpasang."
echo "- Sesi login baru dimulai dengan mode terang."
echo "Refresh browser dengan Ctrl+Shift+R lalu coba Gabung Kelas lagi."
