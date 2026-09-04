$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-reset-card"

if(!(Test-Path $backup)){
    Copy-Item $file $backup
}

$content = Get-Content $file -Raw -Encoding UTF8


$start=$content.IndexOf("function CompactClassCard")
$end=$content.IndexOf("function EmptyClasses")


if($start -lt 0 -or $end -lt 0){
    Write-Host "CompactClassCard tidak ditemukan"
    exit
}


$new=@'
function CompactClassCard({ courseClass, index }: { courseClass: CourseClass; index:number }) {

return (

<article className="w-full rounded-3xl border border-slate-200 bg-white overflow-hidden">

<div className="h-2 bg-gradient-to-r from-blue-600 to-blue-300"></div>

<div className="p-7">


<div className="flex items-center gap-3">

<div className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
{courseClass.course.code}
</div>

<span className="text-xs font-bold text-slate-400">
{courseClass.course.credits} SKS
</span>

</div>


<div className="mt-6">

<h3 className="text-xl font-bold text-slate-950 text-left">
{courseClass.course.name} - Kelas {courseClass.name}
</h3>


<p className="mt-2 text-sm text-slate-500">
Ganjil 2026/2027
</p>

</div>


<div className="mt-6 border-t border-slate-100 pt-5">


<div className="flex flex-wrap gap-3">


<a
href={courseClass.detail_url}
className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white">
Buka
</a>


<a
href={`/kelas/${courseClass.id}/jurnal`}
className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
Rekap Pembelajaran
</a>


</div>


<div className="mt-4 flex flex-wrap gap-3">


<div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
KODE {courseClass.join_code ?? "-"}
</div>


<button className="rounded-xl border px-4 py-2 text-blue-600">
✎
</button>


<button className="rounded-xl border border-red-200 px-4 py-2 text-red-500">
🗑
</button>


</div>


</div>


</div>

</article>

);

}


'@


$content=$content.Substring(0,$start)+$new+$content.Substring($end)


Set-Content $file $content -Encoding UTF8


Write-Host "CARD RESET SELESAI"


npm run build