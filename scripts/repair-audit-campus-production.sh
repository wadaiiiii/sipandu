#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${SIPANDU_APP_ROOT:-/home/matematikaunsulb/apps/sipandu}"
CURRENT_LINK="$APP_ROOT/current"
WEBROOT="${SIPANDU_WEBROOT:-/home/matematikaunsulb/public_html/akademik/sipandu}"
BACKUP_ROOT="$APP_ROOT/shared/hotfix-backups"
RAW_BASE="https://raw.githubusercontent.com/wadaiiiii/sipandu/main"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [ ! -L "$CURRENT_LINK" ]; then
  echo "ERROR: symlink current tidak ditemukan: $CURRENT_LINK" >&2
  exit 1
fi

CURRENT="$(readlink -f "$CURRENT_LINK")"
BACKUP="$BACKUP_ROOT/$STAMP-full-health-audit"
BLADE="$CURRENT/resources/views/app.blade.php"

if [ ! -f "$CURRENT/artisan" ] || [ ! -d "$CURRENT/vendor" ] || [ ! -f "$BLADE" ]; then
  echo "ERROR: release aktif tidak valid: $CURRENT" >&2
  exit 1
fi

mkdir -p "$BACKUP/resources/views"
cp -a "$BLADE" "$BACKUP/resources/views/app.blade.php"

echo "============================================================"
echo "SiPANDU CAMPUS PRODUCTION REPAIR + HEALTH AUDIT"
echo "============================================================"
echo "Release aktif : $CURRENT"
echo "Webroot       : $WEBROOT"
echo "Backup        : $BACKUP"
echo

# app.blade.php sengaja TIDAK disalin dari main. Release shared-hosting lama
# mempunyai manifest Vite sendiri; mengganti daftar @vite dengan versi main
# dapat meminta entry yang belum ada di build aktif dan membuat dashboard 500.
FILES=(
  "config/sipandu.php"
  "app/Http/Middleware/EnsureProductionSchema.php"
  "app/Services/Classroom/ClassJoinCodeService.php"
  "resources/views/classroom.blade.php"
  "resources/views/quiz.blade.php"
  "resources/views/partials/api-prefix-bridge.blade.php"
  "resources/views/partials/pwa-head.blade.php"
  "resources/views/partials/authenticated-theme-default.blade.php"
  "resources/views/partials/class-management-ui-v2.blade.php"
  "resources/views/partials/quiz-entry-fallback.blade.php"
  "database/migrations/2026_08_30_143000_add_custom_join_code_to_course_classes.php"
  "database/migrations/2026_08_31_000000_repair_campus_lms_schema.php"
)

echo "[1/6] Backup + sinkron file runtime kritis..."
for rel in "${FILES[@]}"; do
  src="$CURRENT/$rel"
  if [ -f "$src" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -a "$src" "$BACKUP/$rel"
  fi
  mkdir -p "$(dirname "$src")"
  curl -fsSL "$RAW_BASE/$rel" -o "$src"
done

# Bersihkan enhancer lama yang pernah dipasang saat cut-over, lalu pasang hanya
# UI v2 + default tema. Daftar @vite release aktif tetap utuh.
sed -i "/partials\.subdir-class-code-hotfix/d" "$BLADE"
sed -i "/partials\.class-delete-hotfix/d" "$BLADE"
sed -i "/partials\.ui-render-parity-hotfix/d" "$BLADE"
sed -i "/partials\.class-card-ui-precision/d" "$BLADE"
sed -i "/partials\.class-management-ui-v2/d" "$BLADE"
sed -i "/partials\.authenticated-theme-default/d" "$BLADE"
sed -i "/<\/body>/i\\    @include('partials.class-management-ui-v2')" "$BLADE"
sed -i "/<\/body>/i\\    @include('partials.authenticated-theme-default')" "$BLADE"

echo "[2/6] Repair schema MySQL/PostgreSQL dengan migration idempotent..."
(
  cd "$CURRENT"
  php artisan optimize:clear
  php artisan migrate --force
)

echo "[3/6] Audit bundle frontend production..."
CURRENT_MANIFEST="$CURRENT/public/build/manifest.json"
WEB_MANIFEST="$WEBROOT/build/manifest.json"
REQUIRED_BUILD=(
  "resources/css/app.css"
  "resources/js/app.tsx"
  "resources/js/classroom-v2.tsx"
  "resources/js/student-classroom.tsx"
  "resources/js/class-quiz.tsx"
  "resources/js/quiz-entry.ts"
  "resources/js/class-access-panel.tsx"
  "resources/js/assessment-center.tsx"
  "resources/js/calendar-panel.tsx"
  "resources/js/users.tsx"
)

manifest_has_all() {
  local manifest="$1"
  [ -f "$manifest" ] || return 1
  local item
  for item in "${REQUIRED_BUILD[@]}"; do
    grep -Fq "\"$item\"" "$manifest" || return 1
  done
  return 0
}

if manifest_has_all "$CURRENT_MANIFEST"; then
  echo "  PASS release/build: entry utama lengkap"
else
  echo "  FAIL release/build: manifest release aktif tidak lengkap"
fi

if ! manifest_has_all "$WEB_MANIFEST" && manifest_has_all "$CURRENT_MANIFEST"; then
  echo "  Webroot build tertinggal. Menyinkronkan build release aktif..."
  rm -rf "$WEBROOT/build"
  cp -a "$CURRENT/public/build" "$WEBROOT/build"
fi

if manifest_has_all "$WEB_MANIFEST"; then
  echo "  PASS webroot/build: entry utama lengkap"
else
  echo "  FAIL webroot/build: entry utama belum lengkap"
fi

echo "[4/6] Audit database, join kelas, kuis, dan route..."
set +e
(
  cd "$CURRENT"
  php <<'PHP'
<?php
$base = getcwd();
require $base.'/vendor/autoload.php';
$app = require $base.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\CourseClass;
use App\Models\CourseClassQuiz;
use App\Services\Classroom\ClassJoinCodeService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

$failed = false;
$pass = static function (string $label): void { echo "  PASS $label\n"; };
$fail = static function (string $label) use (&$failed): void { $failed = true; echo "  FAIL $label\n"; };
$warn = static function (string $label): void { echo "  WARN $label\n"; };

try {
    DB::connection()->getPdo();
    $pass('database connection ['.DB::connection()->getDriverName().']');
} catch (Throwable $e) {
    $fail('database connection: '.$e->getMessage());
}

$tables = [
    'users', 'courses', 'academic_terms', 'course_classes', 'rps_snapshots',
    'course_class_memberships', 'course_class_meetings', 'course_class_materials',
    'course_class_assignments', 'course_class_submissions', 'course_class_attendances',
    'course_class_announcements', 'course_class_uploaded_files', 'course_class_material_progress',
    'course_class_comments', 'course_class_quizzes', 'quiz_questions', 'quiz_question_options',
    'quiz_attempts', 'quiz_answers',
];
foreach ($tables as $table) {
    Schema::hasTable($table) ? $pass("table $table") : $fail("table $table missing");
}

$columns = [
    ['course_classes', 'rps_source_type'], ['course_classes', 'join_code'],
    ['course_class_materials', 'attachment_url'], ['course_class_materials', 'attachment_name'],
    ['course_class_assignments', 'attachment_url'], ['course_class_assignments', 'attachment_name'],
];
foreach ($columns as [$table, $column]) {
    Schema::hasColumn($table, $column) ? $pass("column $table.$column") : $fail("column $table.$column missing");
}

try {
    $codes = app(ClassJoinCodeService::class);
    $class = CourseClass::query()->orderBy('id')->first();
    if ($class) {
        $code = $codes->for($class);
        $resolved = $codes->resolve($code);
        $resolved && $resolved->id === $class->id
            ? $pass("automatic join-code resolver [$code]")
            : $fail("automatic join-code resolver [$code]");
    } else {
        $warn('automatic join-code resolver: belum ada kelas untuk diuji');
    }

    $custom = Schema::hasColumn('course_classes', 'join_code')
        ? CourseClass::query()->whereNotNull('join_code')->where('join_code', '<>', '')->first()
        : null;
    if ($custom) {
        $resolved = $codes->resolve((string) $custom->join_code);
        $resolved && $resolved->id === $custom->id
            ? $pass("custom join-code resolver [{$custom->join_code}]")
            : $fail("custom join-code resolver [{$custom->join_code}]");
    } else {
        $warn('custom join-code resolver: belum ada kode kustom');
    }
} catch (Throwable $e) {
    $fail('join-code runtime: '.$e->getMessage());
}

try {
    $count = CourseClassQuiz::query()->count();
    $pass("quiz database query [$count record]");
} catch (Throwable $e) {
    $fail('quiz database query: '.$e->getMessage());
}

$routeNames = [
    'bootstrap', 'dashboard', 'classes.index', 'classes.store', 'classes.join',
    'classes.show', 'classes.journal', 'classes.quizzes.page', 'classes.quizzes.index',
    'classes.quizzes.store', 'classes.quizzes.show', 'classes.quizzes.start',
    'classes.materials.store', 'classes.assignments.store', 'classes.attendance.store',
    'classes.comments.index', 'classes.announcements.index', 'calendar', 'users.index',
];
foreach ($routeNames as $name) {
    Route::getRoutes()->getByName($name) ? $pass("route $name") : $fail("route $name missing");
}

exit($failed ? 1 : 0);
PHP
)
HEALTH_STATUS=$?
set -e

echo "[5/6] Bangun ulang cache Laravel..."
(
  cd "$CURRENT"
  php artisan optimize:clear
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
)

echo "[6/6] Verifikasi webroot production..."
for f in index.php .htaccess manifest.webmanifest sw.js; do
  if [ -f "$WEBROOT/$f" ]; then
    echo "  PASS webroot/$f"
  else
    echo "  WARN webroot/$f tidak ditemukan"
  fi
done

if [ "$HEALTH_STATUS" -ne 0 ] || ! manifest_has_all "$WEB_MANIFEST"; then
  echo
  echo "============================================================"
  echo "AUDIT BELUM LULUS — cuplikan log Laravel terakhir"
  echo "============================================================"
  tail -n 120 "$CURRENT/storage/logs/laravel.log" 2>/dev/null || true
  echo
  echo "STATUS: FAIL"
  exit 1
fi

echo
echo "============================================================"
echo "STATUS: PASS — CORE SiPANDU SIAP"
echo "============================================================"
echo "Dashboard/Kelas  : PASS"
echo "Gabung kelas     : PASS resolver + schema"
echo "Materi/Tugas     : PASS schema + route"
echo "Presensi         : PASS schema + route"
echo "Diskusi/Pengumum.: PASS schema + route"
echo "Kuis/Ujian       : PASS schema + route + build"
echo "Kalender/Pengguna: PASS route + build"
echo "Mode awal        : terang (sesi login baru)"
echo
echo "Refresh browser dengan Ctrl+Shift+R lalu uji kembali Gabung Kelas dan Kuis/Ujian."
