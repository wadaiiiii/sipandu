$ErrorActionPreference="Stop"

Write-Host "=== SiPANDU UI FINAL FIX ==="

$files=@(
"resources/js/app.tsx",
"resources/js/classroom-v2.tsx"
)

foreach($file in $files){

    if(!(Test-Path $file)){
        Write-Host "Tidak ditemukan $file"
        continue
    }

    $backup="$file.before-ui-final"

    if(!(Test-Path $backup)){
        Copy-Item $file $backup
        Write-Host "Backup:"
        Write-Host $backup
    }

    $c=Get-Content $file -Raw -Encoding UTF8


    # encoding fix
    $c=$c.Replace("â€”","-")
    $c=$c.Replace("â€“","-")
    $c=$c.Replace("Â·","·")
    $c=$c.Replace("â†’","→")
    $c=$c.Replace("â€¦","...")


    # title class
    $c=$c.Replace(
    "truncate",
    ""
    )


    # compact button
    $c=$c.Replace(
    "px-4 py-2.5",
    "px-3 py-2"
    )

    $c=$c.Replace(
    "text-sm",
    "text-xs"
    )


    Set-Content $file $c -Encoding UTF8

    Write-Host "Updated $file"
}


Write-Host ""
Write-Host "Build Vite..."

npm run build


if($LASTEXITCODE -ne 0){

 Write-Host "BUILD ERROR"
 Write-Host "Rollback"

 foreach($file in $files){

   $backup="$file.before-ui-final"

   if(Test-Path $backup){
      Copy-Item $backup $file -Force
   }

 }

 exit 1
}


Write-Host ""
Write-Host "=== BERHASIL ==="