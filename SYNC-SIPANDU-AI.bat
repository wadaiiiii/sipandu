@echo off
setlocal EnableExtensions EnableDelayedExpansion

title SYNC-SIPANDU-AI - Safe Git Workflow
color 0B

rem ============================================================================
rem SYNC-SIPANDU-AI.bat
rem Repo    : wadaiiiii/sipandu
rem Workflow: AUDIT -> PATCH -> TYPE -> BUILD -> TRACK -> COMMIT -> PUSH
rem Target  : ai-patch only
rem Guard   : main and production are never checkout/push targets
rem ============================================================================

set "REMOTE=origin"
set "TARGET_BRANCH=ai-patch"
set "DEFAULT_REPO=C:\Users\LENOVO\siakred-matematika\sipandu\sipandu"
set "COMMIT_MESSAGE=%~3"
if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=fix: sync SiPANDU through ai-patch"

rem Usage:
rem   SYNC-SIPANDU-AI.bat
rem   SYNC-SIPANDU-AI.bat "C:\path\to\sipandu"
rem   SYNC-SIPANDU-AI.bat "C:\path\to\sipandu" FinalFiles
rem   SYNC-SIPANDU-AI.bat "C:\path\to\sipandu" ALL "fix: your message"

if not "%~1"=="" (
    set "REPO_DIR=%~1"
) else if exist "%~dp0.git" (
    set "REPO_DIR=%~dp0"
) else (
    set "REPO_DIR=%DEFAULT_REPO%"
)

set "STAGE_SCOPE=%~2"
if not defined STAGE_SCOPE set "STAGE_SCOPE=FinalFiles"

echo.
echo ============================================================
echo   SYNC-SIPANDU-AI
echo   Repo   : wadaiiiii/sipandu
echo   Target : %TARGET_BRANCH%
echo ============================================================
echo.

where git >nul 2>&1
if errorlevel 1 goto :no_git

if not exist "%REPO_DIR%" goto :no_repo
cd /d "%REPO_DIR%"

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto :not_repo

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH goto :detached

if /I "!CURRENT_BRANCH!"=="main" goto :protected_branch
if /I "!CURRENT_BRANCH!"=="production" goto :protected_branch

echo [AUDIT] Pemeriksaan remote dan branch...
git remote get-url "%REMOTE%" >nul 2>&1
if errorlevel 1 goto :no_remote

for /f "tokens=1" %%H in ('git ls-remote "%REMOTE%" "refs/heads/main" 2^>nul') do set "MAIN_BEFORE=%%H"
for /f "tokens=1" %%H in ('git ls-remote "%REMOTE%" "refs/heads/production" 2^>nul') do set "PRODUCTION_BEFORE=%%H"
for /f "tokens=1" %%H in ('git ls-remote "%REMOTE%" "refs/heads/ai-patch" 2^>nul') do set "AI_BEFORE=%%H"

if not defined AI_BEFORE goto :no_remote_patch

git fetch "%REMOTE%" --prune
if errorlevel 1 goto :fetch_failed

set "WORKTREE_DIRTY="
for /f "delims=" %%S in ('git status --porcelain 2^>nul') do set "WORKTREE_DIRTY=1"

if /I not "!CURRENT_BRANCH!"=="%TARGET_BRANCH%" (
    if defined WORKTREE_DIRTY goto :dirty_before_switch
    echo [AUDIT] Beralih ke branch %TARGET_BRANCH%...
    git show-ref --verify --quiet "refs/heads/%TARGET_BRANCH%"
    if errorlevel 1 (
        git switch --track -c "%TARGET_BRANCH%" "%REMOTE%/%TARGET_BRANCH%" >nul 2>&1
        if errorlevel 1 git checkout -b "%TARGET_BRANCH%" --track "%REMOTE%/%TARGET_BRANCH%"
    ) else (
        git switch "%TARGET_BRANCH%" >nul 2>&1
        if errorlevel 1 git checkout "%TARGET_BRANCH%"
    )
    if errorlevel 1 goto :switch_failed
    set "CURRENT_BRANCH=%TARGET_BRANCH%"
)

if /I not "!CURRENT_BRANCH!"=="%TARGET_BRANCH%" goto :wrong_branch

if not defined WORKTREE_DIRTY (
    echo [AUDIT] Sinkronisasi lokal ai-patch secara fast-forward...
    git pull --ff-only "%REMOTE%" "%TARGET_BRANCH%"
    if errorlevel 1 goto :pull_failed
)

echo [AUDIT] Branch aktif: !CURRENT_BRANCH!
echo [AUDIT] Status working tree:
git status --short

echo [TYPE] Pemeriksaan whitespace pada perubahan...
git diff --check
if errorlevel 1 goto :diff_failed

if /I "%SYNC_NONINTERACTIVE%"=="1" (
    set "RUN_PHP_TEST=1"
    set "RUN_NPM_BUILD=1"
) else (
    choice /C YN /N /M "Jalankan php artisan test jika tersedia? [Y/N] "
    if errorlevel 2 (set "RUN_PHP_TEST=0") else (set "RUN_PHP_TEST=1")
    choice /C YN /N /M "Jalankan npm run build jika tersedia? [Y/N] "
    if errorlevel 2 (set "RUN_NPM_BUILD=0") else (set "RUN_NPM_BUILD=1")
)

if "!RUN_PHP_TEST!"=="1" (
    if exist "artisan" (
        where php >nul 2>&1
        if errorlevel 1 (
            echo [WARN] PHP tidak ditemukan. Test PHP dilewati.
        ) else (
            echo [TYPE] Menjalankan php artisan test...
            php artisan test
            if errorlevel 1 goto :php_test_failed
        )
    ) else (
        echo [WARN] artisan tidak ditemukan. Test PHP dilewati.
    )
)

if "!RUN_NPM_BUILD!"=="1" (
    if exist "package.json" (
        where npm >nul 2>&1
        if errorlevel 1 (
            echo [WARN] npm tidak ditemukan. Build frontend dilewati.
        ) else (
            echo [BUILD] Menjalankan npm run build...
            call npm run build
            if errorlevel 1 goto :npm_build_failed
        )
    ) else (
        echo [WARN] package.json tidak ditemukan. Build frontend dilewati.
    )
)

echo [TRACK] Scope staging: %STAGE_SCOPE%
if /I "%STAGE_SCOPE%"=="ALL" goto :stage_all

if not exist "%STAGE_SCOPE%" (
    echo [ERROR] Scope "%STAGE_SCOPE%" tidak ditemukan.
    echo         Gunakan parameter ALL untuk stage perubahan repository secara eksplisit.
    goto :fail
)

git add -A -- "%STAGE_SCOPE%"
if errorlevel 1 goto :stage_failed
goto :stage_done

:stage_all
if /I "%SYNC_NONINTERACTIVE%"=="1" goto :stage_all_confirmed
choice /C YN /N /M "Stage seluruh perubahan kecuali .env, storage, vendor, node_modules? [Y/N] "
if errorlevel 2 goto :stage_cancelled

:stage_all_confirmed
git add -A -- . ":(exclude).env" ":(exclude).env.*" ":(exclude)storage/*" ":(exclude)vendor/*" ":(exclude)node_modules/*"
if errorlevel 1 goto :stage_failed

:stage_done
echo [TRACK] Perubahan yang akan di-commit:
git diff --cached --name-status

git diff --cached --name-only | findstr /R /C:"^\.env" /C:"^storage/" /C:"^vendor/" /C:"^node_modules/" >nul
if not errorlevel 1 goto :protected_files

git diff --cached --check
if errorlevel 1 goto :staged_diff_failed

git diff --cached --quiet
if not errorlevel 1 goto :nothing_to_commit

echo.
echo [COMMIT] %COMMIT_MESSAGE%
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 goto :commit_failed

echo [PUSH] Hanya push ke %TARGET_BRANCH%...
git push "%REMOTE%" "%TARGET_BRANCH%:%TARGET_BRANCH%"
if errorlevel 1 goto :push_failed

for /f "tokens=1" %%H in ('git ls-remote "%REMOTE%" "refs/heads/main" 2^>nul') do set "MAIN_AFTER=%%H"
for /f "tokens=1" %%H in ('git ls-remote "%REMOTE%" "refs/heads/production" 2^>nul') do set "PRODUCTION_AFTER=%%H"
for /f "tokens=1" %%H in ('git ls-remote "%REMOTE%" "refs/heads/ai-patch" 2^>nul') do set "AI_AFTER=%%H"

if defined MAIN_BEFORE if defined MAIN_AFTER if not "!MAIN_BEFORE!"=="!MAIN_AFTER!" echo [WARN] Remote main berubah oleh proses lain; script ini tidak mendorong main.
if defined PRODUCTION_BEFORE if defined PRODUCTION_AFTER if not "!PRODUCTION_BEFORE!"=="!PRODUCTION_AFTER!" echo [WARN] Remote production berubah oleh proses lain; script ini tidak mendorong production.

echo.
echo ============================================================
echo   SINKRONISASI SELESAI
echo   MAIN       : TIDAK DISENTUH
echo   PRODUCTION : TIDAK DISENTUH
echo   AI-PATCH   : UPDATED
echo   SHA        : !AI_AFTER!
echo ============================================================
goto :success

:nothing_to_commit
echo [INFO] Tidak ada perubahan baru pada scope "%STAGE_SCOPE%".
echo        Tidak ada commit atau push yang dilakukan.
goto :success

:stage_cancelled
echo [INFO] Staging dibatalkan oleh pengguna.
goto :fail

:no_git
echo [ERROR] Git tidak ditemukan pada PATH Windows.
goto :fail

:no_repo
echo [ERROR] Folder repository tidak ditemukan:
echo         %REPO_DIR%
goto :fail

:not_repo
echo [ERROR] Folder tersebut bukan repository Git:
echo         %REPO_DIR%
goto :fail

:detached
echo [ERROR] HEAD sedang detached. Checkout ai-patch secara manual terlebih dahulu.
goto :fail

:protected_branch
echo [BLOCKED] Branch !CURRENT_BRANCH! dilindungi.
echo          Script tidak bekerja langsung pada main atau production.
goto :fail

:no_remote
echo [ERROR] Remote "%REMOTE%" belum tersedia.
goto :fail

:no_remote_patch
echo [ERROR] Remote branch origin/ai-patch tidak ditemukan.
echo         Buat branch ai-patch melalui workflow proyek terlebih dahulu.
goto :fail

:fetch_failed
echo [ERROR] git fetch gagal. Periksa koneksi atau autentikasi GitHub.
goto :fail

:dirty_before_switch
echo [BLOCKED] Working tree memiliki perubahan dan branch aktif bukan ai-patch.
echo          Tidak ada switch otomatis agar perubahan tidak tertimpa.
goto :fail

:switch_failed
echo [ERROR] Tidak dapat berpindah ke branch ai-patch.
goto :fail

:wrong_branch
echo [ERROR] Branch aktif bukan ai-patch. Proses dihentikan.
goto :fail

:pull_failed
echo [ERROR] ai-patch lokal tidak dapat di-fast-forward dari origin/ai-patch.
echo         Selesaikan perbedaan branch secara manual terlebih dahulu.
goto :fail

:diff_failed
echo [ERROR] Ditemukan whitespace error pada perubahan.
goto :fail

:php_test_failed
echo [ERROR] php artisan test gagal. Commit dan push dibatalkan.
goto :fail

:npm_build_failed
echo [ERROR] npm run build gagal. Commit dan push dibatalkan.
goto :fail

:stage_failed
echo [ERROR] git add gagal.
goto :fail

:protected_files
echo [BLOCKED] Staging memuat .env atau folder yang dilindungi.
echo          Hapus file tersebut dari staging sebelum menjalankan ulang.
goto :fail

:staged_diff_failed
echo [ERROR] Ditemukan whitespace error pada staging.
goto :fail

:commit_failed
echo [ERROR] Commit gagal. Push dibatalkan.
goto :fail

:push_failed
echo [ERROR] Push ke ai-patch gagal. main dan production tidak disentuh.
goto :fail

:success
if /I not "%SYNC_NO_PAUSE%"=="1" pause
endlocal
exit /b 0

:fail
echo.
echo [STOP] Tidak ada push ke main atau production.
if /I not "%SYNC_NO_PAUSE%"=="1" pause
endlocal
exit /b 1
