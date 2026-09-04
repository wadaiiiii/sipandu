$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.backup-ui-kelas"

Write-Host "BACKUP..."

Copy-Item $file $backup -Force


$c = Get-Content $file -Raw -Encoding UTF8


Write-Host "Cari classesView..."


$start=$c.IndexOf("const classesView = (")

if($start -lt 0){
    Write-Host "Tidak menemukan classesView"
    exit 1
}


$end=$c.IndexOf("function CompactClassCard",$start)


if($end -lt 0){
    Write-Host "Tidak menemukan CompactClassCard"
    exit 1
}



$new=@'

const classesView = (

<div className="space-y-8">

<section className="flex items-center justify-between">

<div>
<p className="text-xs font-bold uppercase tracking-widest text-blue-600">
Workspace
</p>

<h1 className="mt-2 text-3xl font-bold text-slate-950">
Kelas Saya
</h1>

<p className="mt-2 text-sm text-slate-500">
Kelola seluruh kelas pembelajaran.
</p>

</div>

</section>



<div className="grid gap-6 lg:grid-cols-2">


{classCards.map((courseClass,index)=>(


<article
key={courseClass.id}
className="
rounded-[28px]
border
border-slate-200
bg-white
overflow-hidden
shadow-sm
"
>


<div className="
h-2
bg-gradient-to-r
from-blue-600
to-blue-300
"/>



<div className="p-6">


<div className="flex items-center gap-3">

<span className="
rounded-full
bg-blue-50
px-3
py-1
text-xs
font-bold
text-blue-700
">

{courseClass.course.code}

</span>


<span className="text-xs text-slate-400 font-bold">

{courseClass.course.credits} SKS

</span>

</div>



<h2 className="
mt-5
text-xl
font-bold
text-slate-950
">

{courseClass.course.name}
{" - "}
Kelas {courseClass.name}

</h2>



<p className="
mt-2
text-sm
text-slate-500
">

{semesterLabel(courseClass.academic_term.semester)}
{" "}
{courseClass.academic_term.academic_year}

</p>



<div className="
mt-6
flex
flex-wrap
gap-3
">


<a
href={courseClass.detail_url}
className="
rounded-xl
bg-blue-600
px-5
py-2
text-sm
font-bold
text-white
">

Buka

</a>



<a
href={`/kelas/${courseClass.id}/jurnal`}
className="
rounded-xl
bg-blue-50
px-5
py-2
text-sm
font-bold
text-blue-700
">

Rekap Pembelajaran

</a>



<button
onClick={()=>void renameClass(courseClass)}
className="
rounded-xl
border
border-slate-200
px-5
py-2
">

Edit

</button>


</div>


<div className="
mt-5
rounded-xl
bg-slate-50
p-4
">

<p className="text-xs text-slate-400 font-bold">
KODE KELAS
</p>


<p className="mt-1 font-bold text-blue-700">
{courseClass.join_code}
</p>


</div>


</div>


</article>


))}


</div>


</div>


);


'@



$c=$c.Substring(0,$start)+$new+$c.Substring($end)


Set-Content $file $c -Encoding UTF8



Write-Host "BUILD..."

npm run build


if($LASTEXITCODE -ne 0){

Write-Host "BUILD ERROR - ROLLBACK"

Copy-Item $backup $file -Force

exit 1

}


Write-Host ""
Write-Host "=============================="
Write-Host "UI KELAS SAYA BERHASIL"
Write-Host "=============================="