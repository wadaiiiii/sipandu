$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-force-kelas-ui"

Write-Host "FORCE PATCH KELAS UI"

if(!(Test-Path $backup)){
    Copy-Item $file $backup
}


$content = Get-Content $file -Raw -Encoding UTF8


# ganti hanya bagian header kelas
$pattern = '(?s)<div data-sipandu-class-head="true".*?</div>\s*<div className="mt-5 rounded-\[22px\]'


$newBlock = @'
<div data-sipandu-class-head="true" className="block w-full">

    <div className="w-full">

        <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                {courseClass.course.code}
            </span>

            <span className="text-xs font-semibold text-slate-400">
                {courseClass.course.credits} SKS
            </span>
        </div>


        <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
            {courseClass.course.name} - Kelas {courseClass.name}
        </h2>


        <p className="mt-1 text-xs text-slate-500">
            {semesterLabel(courseClass.academic_term.semester)} {courseClass.academic_term.academic_year}
        </p>


        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">

            <a href={courseClass.detail_url}
            className="rounded-xl bg-[#1764ff] px-4 py-2 text-xs font-bold text-white">
                Buka
            </a>

            <a href={`/kelas/${courseClass.id}/jurnal`}
            className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                Rekap Pembelajaran
            </a>

            <button
            onClick={() => void renameClass(courseClass)}
            className="rounded-xl border px-4 py-2 text-xs font-bold">
                Edit
            </button>

        </div>

    </div>

</div>


<div className="mt-5 rounded-[22px]
'@


$result=[regex]::Replace(
    $content,
    $pattern,
    $newBlock,
    1
)


if($result -eq $content){

    Write-Host "TARGET TIDAK DITEMUKAN"
    exit 1
}


# encoding fix
$result=$result.Replace("â€”","-")
$result=$result.Replace("â€“","-")
$result=$result.Replace("Â·","·")
$result=$result.Replace("â†’","→")
$result=$result.Replace("â€¦","...")


Set-Content $file $result -Encoding UTF8


Write-Host "WRITE OK"

npm run build


if($LASTEXITCODE -ne 0){

    Copy-Item $backup $file -Force

    Write-Host "ROLLBACK"
    exit 1
}


Write-Host "SUCCESS"