$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-kelas-card-final"

Write-Host "=== SIPANDU KELAS CARD FINAL PATCH ==="

if(!(Test-Path $backup)){
    Copy-Item $file $backup
    Write-Host "Backup dibuat:"
    Write-Host $backup
}


$content = Get-Content $file -Raw -Encoding UTF8


$old = @'
<div data-sipandu-class-head="true" className="block w-full">
                                    <div className="w-full"><div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">{courseClass.course.code}</span><span className="text-xs font-semibold text-slate-400">{courseClass.course.credits} SKS</span></div><h2 className="mt-3 w-full text-xl font-bold tracking-tight text-slate-950">{courseClass.course.name} - Kelas {courseClass.name}</h2><p className="mt-1 text-xs text-slate-500">{semesterLabel(courseClass.academic_term.semester)} {courseClass.academic_term.academic_year}</p></div>
                                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><a href={courseClass.detail_url} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[#1764ff] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-100 transition hover:bg-[#0d56e8]">Learning Timeline <ArrowUpRight size={15} /></a><button type="button" onClick={() => void renameClass(courseClass)} className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Edit</button><a href={`/kelas/${courseClass.id}/jurnal`} className="inline-flex w-fit items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"><FileText size={15} /> Jurnal Kelas</a></div>
                                </div>
'@


$new = @'
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


        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">

            <a
                href={courseClass.detail_url}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1764ff] px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-100 transition hover:bg-[#0d56e8]"
            >
                Learning Timeline <ArrowUpRight size={14} />
            </a>


            <a
                href={`/kelas/${courseClass.id}/jurnal`}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
                <FileText size={14}/>
                Rekap Pembelajaran
            </a>


            <button
                type="button"
                onClick={() => void renameClass(courseClass)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
            >
                Edit
            </button>


        </div>

    </div>

</div>
'@


if(!$content.Contains($old)){
    Write-Host "Blok JSX tidak ditemukan"
    Write-Host "Tidak ada perubahan"
    exit 1
}


$content=$content.Replace($old,$new)


# bersihkan simbol umum
$content=$content.Replace("â€”","-")
$content=$content.Replace("â€“","-")
$content=$content.Replace("Â·","·")
$content=$content.Replace("â†’","→")
$content=$content.Replace("â€¦","...")


Set-Content $file $content -Encoding UTF8


Write-Host "Patch selesai"
Write-Host "Build..."

npm run build


if($LASTEXITCODE -ne 0){

    Write-Host "BUILD GAGAL - ROLLBACK"

    Copy-Item $backup $file -Force

    exit 1
}


Write-Host ""
Write-Host "================================"
Write-Host "KELAS CARD FINAL BERHASIL"
Write-Host "================================"