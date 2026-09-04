const fs=require("fs");

const file="resources/js/app.tsx";

const backup=file+".backup-before-reset";


if(!fs.existsSync(backup)){
    fs.copyFileSync(file,backup);
    console.log("Backup dibuat");
}


let c=fs.readFileSync(file,"utf8");


const start=c.indexOf("function CompactClassCard");

const end=c.indexOf("function EmptyClasses");


if(start===-1 || end===-1){
    console.log("Komponen tidak ditemukan");
    process.exit(1);
}



const replacement = String.raw`

function CompactClassCard({courseClass,index}:{
    courseClass:CourseClass;
    index:number;
}){

return (

<article className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

<div className="h-2 bg-gradient-to-r from-blue-600 to-blue-300"></div>


<div className="p-7">


<div className="flex items-center gap-3">

<span className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
{courseClass.course.code}
</span>


<span className="text-xs font-bold text-slate-400">
{courseClass.course.credits} SKS
</span>


</div>



<h2 className="mt-6 text-xl font-bold text-slate-950">
{courseClass.course.name} - Kelas {courseClass.name}
</h2>



<p className="mt-2 text-sm text-slate-500">
Ganjil 2026/2027
</p>



<div className="mt-6 border-t border-slate-100 pt-5 flex flex-wrap gap-3">


<a
href={courseClass.detail_url}
className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white">
Buka
</a>



<a
href={'/kelas/'+courseClass.id+'/jurnal'}
className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
Rekap Pembelajaran
</a>



<span
className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
KODE {courseClass.join_code}
</span>



<button className="rounded-xl border px-4 py-2">
✎
</button>


<button className="rounded-xl border border-red-200 px-4 py-2 text-red-500">
🗑
</button>


</div>


</div>


</article>


)

}

`;


c =
c.substring(0,start)
+
replacement
+
c.substring(end);



fs.writeFileSync(file,c,"utf8");


console.log("KELAS SAYA BERHASIL DI RESET");