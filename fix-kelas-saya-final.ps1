$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-kelas-final"

Copy-Item $file $backup -Force


$content = Get-Content $file -Raw -Encoding UTF8


$start = $content.IndexOf("const classesView = (")

$end = $content.IndexOf("function CompactClassCard",$start)


if($start -lt 0 -or $end -lt 0){
    Write-Host "Marker tidak ditemukan"
    exit
}


$new=@'
const classesView = (

<div className="space-y-8">


<section className="
rounded-[28px]
border
border-slate-200
bg-white
p-6
shadow-sm
">


<div className="
flex
items-center
justify-between
">

<div>

<p className="
text-xs
font-bold
uppercase
tracking-widest
text-blue-600
">
Workspace
</p>


<h1 className="
mt-2
text-3xl
font-bold
text-slate-950
">
Kelas Saya
</h1>


<p className="
mt-2
text-sm
text-slate-500
">
Kelola kelas, materi, tugas dan pembelajaran.
</p>


</div>


<button
onClick={()=>void loadClasses()}
className="
rounded-xl
border
px-4
py-2
text-sm
font-bold
hover:bg-blue-50
">

Muat ulang

</button>


</div>


</section>




<div className="
grid
gap-6
lg:grid-cols-2
">


{classCards.map((courseClass,index)=>(


<div
key={courseClass.id}
className="
overflow-hidden
rounded-[28px]
border
border-slate-200
bg-white
shadow-sm
hover:shadow-lg
transition
">


<div className="
h-2
bg-gradient-to-r
from-blue-600
to-blue-300
"/>



<div className="
p-6
">


<div className="
flex
justify-between
gap-5
">


<div>


<div className="
flex
items-center
gap-3
">

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


<span className="
text-xs
font-bold
text-slate-400
">

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


</div>



<div className="
flex
flex-col
gap-3
min-w-[230px]
">


<a
href={courseClass.detail_url}
className="
rounded-xl
bg-blue-600
px-5
py-3
text-center
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
py-3
text-center
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
py-3
text-sm
font-bold
">

Edit

</button>



</div>


</div>



<div className="
mt-6
flex
items-center
justify-between
rounded-xl
bg-slate-50
p-4
">


<div>

<p className="
text-xs
font-bold
text-slate-400
">

KODE KELAS

</p>


<p className="
mt-1
font-bold
text-blue-700
">

{courseClass.join_code}

</p>


</div>



<div className="
flex
gap-2
">


<button
className="
rounded-xl
border
border-blue-100
p-3
text-blue-600
">

✎

</button>



<button
className="
rounded-xl
border
border-red-200
p-3
text-red-500
">

🗑

</button>


</div>


</div>



</div>


</div>


))}


</div>


</div>

);

'@



$content=$content.Substring(0,$start)+$new+$content.Substring($end)


Set-Content $file $content -Encoding UTF8


Write-Host "BUILD..."

npm run build


if($LASTEXITCODE -ne 0){

Write-Host "BUILD ERROR RESTORE"

Copy-Item $backup $file -Force

exit 1

}


Write-Host ""
Write-Host "======================"
Write-Host "KELAS UI FINAL OK"
Write-Host "======================"