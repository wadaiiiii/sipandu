$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="$file.before-kelas-ui-final"

Write-Host "BACKUP..."
Copy-Item $file $backup -Force


$content = Get-Content $file -Raw -Encoding UTF8


# cari blok kartu kelas
$start = $content.IndexOf('<div data-sipandu-class-head="true">')

if($start -lt 0){
    Write-Host "BLOCK TIDAK DITEMUKAN"
    exit 1
}


$end = $content.IndexOf('<div className="mt-5 rounded-[22px]', $start)

if($end -lt 0){
    Write-Host "END BLOCK TIDAK DITEMUKAN"
    exit 1
}


$newBlock=@'

<div data-sipandu-class-head="true"
className="rounded-[24px] border border-slate-200 bg-white overflow-hidden">

<div className="h-2 bg-gradient-to-r from-blue-600 to-blue-300"></div>


<div className="p-6">


<div className="flex items-center gap-3">

<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
{courseClass.course.code}
</span>


<span className="text-xs font-semibold text-slate-400">
{courseClass.course.credits} SKS
</span>

</div>



<h2 className="mt-5 text-2xl font-bold text-slate-950">
{courseClass.course.name} - Kelas {courseClass.name}
</h2>



<p className="mt-2 text-sm text-slate-500">
{semesterLabel(courseClass.academic_term.semester)}
{" "}
{courseClass.academic_term.academic_year}
</p>



<div className="mt-6 border-t border-slate-100 pt-5">


<div className="flex flex-wrap items-center gap-3">


<a
href={courseClass.detail_url}
className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white"
>
Buka
</a>



<a
href={`/kelas/${courseClass.id}/jurnal`}
className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700"
>
Rekap Pembelajaran
</a>



<div className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
KODE {courseClass.join_code}
</div>



<button
type="button"
onClick={()=>void renameClass(courseClass)}
className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
>
Edit
</button>



</div>


</div>


</div>

</div>


'@


$content =
$content.Substring(0,$start) +
$newBlock +
$content.Substring($end)



Set-Content $file $content -Encoding UTF8



Write-Host ""
Write-Host "BUILD..."
npm run build



if($LASTEXITCODE -ne 0){

Write-Host "BUILD GAGAL - ROLLBACK"

Copy-Item $backup $file -Force

exit 1

}



Write-Host ""
Write-Host "================================="
Write-Host "KELAS SAYA UI BERHASIL DIPERBAIKI"
Write-Host "================================="