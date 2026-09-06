$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-card-v2"


Write-Host "BACKUP FILE..."
Copy-Item $file $backup -Force


$content = Get-Content $file -Raw -Encoding UTF8


# cari area kartu lama
$start = $content.IndexOf('<div data-sipandu-class-head="true"')


if($start -lt 0){
    Write-Host "CARD KELAS TIDAK DITEMUKAN"
    exit 1
}


$end = $content.IndexOf(
'<div className="mt-5 rounded-[22px]',
$start
)


if($end -lt 0){
    Write-Host "BATAS CARD TIDAK DITEMUKAN"
    exit 1
}



$new=@'

<div className="rounded-[26px] border border-slate-200 bg-white overflow-hidden">


<div className="h-2 bg-gradient-to-r from-blue-600 to-blue-300"></div>


<div className="p-6">


<div className="flex items-center gap-3">

<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">

{courseClass.course.code}

</span>


<span className="text-xs font-bold text-slate-400">

{courseClass.course.credits} SKS

</span>


</div>



<h2 className="mt-5 text-xl font-bold text-slate-950">

{courseClass.course.name} - Kelas {courseClass.name}

</h2>



<p className="mt-2 text-sm text-slate-500">

{semesterLabel(courseClass.academic_term.semester)}
{" "}
{courseClass.academic_term.academic_year}

</p>




<div className="mt-6 border-t border-slate-100 pt-5">


<div className="flex flex-wrap gap-3">


<a
href={courseClass.detail_url}
className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white">

Buka Kelas

</a>



<a
href={`/kelas/${courseClass.id}/jurnal`}
className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">

Rekap Pembelajaran

</a>



<span className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700">

KODE {courseClass.join_code}

</span>



<button
onClick={()=>void renameClass(courseClass)}
className="rounded-xl border px-4 py-2 text-sm font-bold">

Edit

</button>


</div>


</div>


</div>


</div>


'@



$content =
$content.Substring(0,$start)
+
$new
+
$content.Substring($end)



Set-Content $file $content -Encoding UTF8



Write-Host "BUILD..."

npm run build


if($LASTEXITCODE -ne 0){

Write-Host "BUILD GAGAL - RESTORE"

Copy-Item $backup $file -Force

exit 1

}


Write-Host ""
Write-Host "=============================="
Write-Host "KELAS SAYA CARD BERHASIL"
Write-Host "=============================="