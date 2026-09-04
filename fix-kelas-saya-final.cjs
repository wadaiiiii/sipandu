const fs = require("fs");
const { execSync } = require("child_process");

const file = "resources/js/app.tsx";
const backup = "resources/js/app.tsx.before-kelas-saya-final";


console.log("=== SiPANDU KELAS SAYA FINAL PATCH ===");


if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
    console.log("Backup dibuat");
}


let content = fs.readFileSync(file, "utf8");

const start = content.indexOf("const classesView = (");

if (start === -1) {
    console.log("classesView tidak ditemukan");
    process.exit(1);
}


const end = content.indexOf(
    "const content =",
    start
);


if (end === -1) {
    console.log("batas akhir classesView tidak ditemukan");
    process.exit(1);
}



const newClassesView = String.raw`

const classesView = (
    <div className="space-y-7">

        <section className="flex items-end justify-between gap-4">

            <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Workspace
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-950">
                    Kelas Saya
                </h1>

                <p className="mt-2 text-xs text-slate-500">
                    Learning Timeline, materi, tugas, peserta, dan jurnal kelas.
                </p>

            </div>


            <button
            onClick={() => void loadClasses()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold">
                Muat ulang
            </button>


        </section>



        {classError &&
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {classError}
        </div>
        }



        <section className="grid grid-cols-1 gap-6">


        {classes.map((courseClass,index)=>{

            return (

            <article
            key={courseClass.id}
            className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">


                <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-300" />


                <div className="p-6">


                    <div className="flex items-center gap-3">

                        <span className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
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



                    <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">


                        <a
                        href={courseClass.detail_url}
                        className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white">
                            Buka
                        </a>


                        <a
                        href={"/kelas/" + courseClass.id + "/jurnal"}
                        className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
                            Rekap Pembelajaran
                        </a>



                        <button
                        onClick={() => void renameClass(courseClass)}
                        className="rounded-xl border px-5 py-2 text-sm font-bold">
                            Edit
                        </button>



                    </div>



                    <div className="mt-4 flex gap-3">


                        <span className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
                            KODE {courseClass.join_code}
                        </span>



                    </div>


                </div>


            </article>


            )

        })}


        </section>


    </div>
);


`;



content =
    content.substring(0,start)
    +
    newClassesView
    +
    content.substring(end);



content = content
.replace(/â€”/g,"-")
.replace(/â€“/g,"-")
.replace(/Â·/g,"·")
.replace(/â€¦/g,"...");



fs.writeFileSync(file, content, "utf8");


console.log("classesView diganti");


try {

    execSync("npm run build", {
        stdio:"inherit"
    });

}
catch(e){

    console.log("BUILD GAGAL - ROLLBACK");

    fs.copyFileSync(backup,file);

    process.exit(1);

}



console.log("");
console.log("==============================");
console.log("KELAS SAYA FINAL BERHASIL");
console.log("==============================");