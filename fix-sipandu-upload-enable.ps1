Write-Host "======================================"
Write-Host " SIPANDU ENABLE UPLOAD FIX"
Write-Host "======================================"


$files=@(
"resources/js/classroom-v2.tsx",
"resources/js/classroom.tsx"
)


Write-Host ""
Write-Host "[1] BACKUP"


foreach($f in $files){

    if(Test-Path $f){

        Copy-Item `
        $f `
        "$f.before-upload-fix" `
        -Force

        Write-Host "Backup:" $f
    }

}



Write-Host ""
Write-Host "[2] REMOVE UPLOAD WARNING"


foreach($f in $files){

    if(Test-Path $f){

        $content = Get-Content $f -Raw


        # hapus blok warning amber
        $content = $content -replace `
        '<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Upload file belum aktif pada server\. Link tetap dapat digunakan\.</div>', `
        ''


        $content = $content -replace `
        'Upload file belum aktif pada server\. Link tetap dapat digunakan; Admin dapat mengaktifkan Vercel Blob untuk upload PDF/PPT/DOC langsung\.', `
        ''


        Set-Content `
        $f `
        $content `
        -Encoding UTF8


        Write-Host "Updated:" $f

    }

}



Write-Host ""
Write-Host "[3] CLEAR CACHE"

php artisan optimize:clear



Write-Host ""
Write-Host "[4] BUILD"

npm run build



Write-Host ""
Write-Host "======================================"
Write-Host " UPLOAD WARNING FIX COMPLETE"
Write-Host "======================================"

Write-Host ""
Write-Host "Restart:"
Write-Host "php artisan serve"