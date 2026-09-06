Write-Host "================================"
Write-Host " SIPANDU UPLOAD WARNING FIX V2"
Write-Host "================================"


$targets=@(
"resources/js/classroom-v2.tsx",
"resources/js/classroom.tsx"
)


foreach($file in $targets){

    if(Test-Path "$file.before-upload-fix"){

        Write-Host "Restore backup:" $file

        Copy-Item `
        "$file.before-upload-fix" `
        $file `
        -Force

    }


}



Write-Host ""
Write-Host "Removing complete warning blocks..."



# classroom-v2
$file="resources/js/classroom-v2.tsx"

if(Test-Path $file){

$content=Get-Content $file -Raw


$content=$content -replace `
'\{\!payload\.file_upload_available && \(\s*<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Upload file belum aktif pada server\. Link tetap dapat digunakan\.</div>\s*\)\}', ''


Set-Content $file $content -Encoding UTF8

}



# classroom lama
$file="resources/js/classroom.tsx"

if(Test-Path $file){

$content=Get-Content $file -Raw


$content=$content -replace `
'<div[^>]*>Upload file belum aktif pada server\. Link tetap dapat digunakan; Admin dapat mengaktifkan Vercel Blob untuk upload PDF/PPT/DOC langsung\.</div>', ''


Set-Content $file $content -Encoding UTF8

}



Write-Host ""
Write-Host "Clear Laravel cache"

php artisan optimize:clear



Write-Host ""
Write-Host "Build"

npm run build


Write-Host ""
Write-Host "DONE"