Write-Host "====================================="
Write-Host " CHECK LARAVEL TEST BASEPATH "
Write-Host "====================================="

$log = "tests/test-basepath.log"

if (Test-Path $log) {

    Write-Host ""
    Write-Host "HASIL Application::inferBasePath()"
    Write-Host "-------------------------------------"

    Get-Content $log

    Write-Host ""
    Write-Host "-------------------------------------"

    $last = Get-Content $log | Select-Object -Last 1

    if ($last -match "\| /$") {
        Write-Host "KESIMPULAN:"
        Write-Host "BASEPATH SALAH -> terbaca ROOT /"
    }
    elseif ($last -match "siakred-matematika\\sipandu\\sipandu") {
        Write-Host "KESIMPULAN:"
        Write-Host "BASEPATH BENAR -> masalah ada di parent::createApplication()"
    }
    else {
        Write-Host "KESIMPULAN:"
        Write-Host "Perlu analisis lanjutan"
    }

}
else {

    Write-Host ""
    Write-Host "Log belum ada:"
    Write-Host $log
    Write-Host ""
    Write-Host "Jalankan dulu:"
    Write-Host "php artisan test --filter=SubdirectoryHostingTest"

}

Write-Host ""
Write-Host "Selesai."