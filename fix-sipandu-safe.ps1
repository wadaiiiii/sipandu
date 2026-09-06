Write-Host "======================================="
Write-Host " SIPANDU SAFE RECOVERY"
Write-Host "======================================="

$app = "resources/js/app.tsx"

if(!(Test-Path $app)){
    Write-Host "app.tsx tidak ditemukan"
    exit 1
}


Write-Host "[1] Backup"

$backup = "resources/js/app.tsx.safe-backup"

Copy-Item $app $backup -Force


Write-Host "[2] Restore stable backup"

$stable = "resources/js/app.tsx.before-clean-duplicate"

if(Test-Path $stable){

    Copy-Item $stable $app -Force

}
else{

    Write-Host "Backup stabil tidak ada"
    exit 1

}


Write-Host "[3] Remove broken unicode"

$content = Get-Content $app -Raw


# hapus semua karakter mojibake tanpa menulis karakternya
$content = $content -replace '[\u0080-\uFFFF]{1,3}', ''


# bersihkan spasi aneh
$content = $content -replace '\s+$',''


Set-Content `
-Path $app `
-Value $content `
-Encoding UTF8



Write-Host "[4] Build"

npm run build


if($LASTEXITCODE -ne 0){

    Write-Host "BUILD GAGAL"

    Copy-Item $backup $app -Force

    exit 1
}


Write-Host "======================================="
Write-Host "SELESAI"
Write-Host "======================================="