$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-kelas-real"

if(!(Test-Path $backup)){
 Copy-Item $file $backup
}

$c=Get-Content $file -Raw -Encoding UTF8


$start=$c.IndexOf(
"            <section className=""grid gap-5"">"
)

$end=$c.IndexOf(
"            </section>",
$start
)


if($start -lt 0){
 Write-Host "START tidak ditemukan"
 exit
}


$new=@'
            <section className="grid gap-5">

                {classes.length === 0 && !classesBusy && <EmptyClasses />}

                {classes.map((courseClass) => (

                <article 
                key={courseClass.id}
                className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

                    <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-300"></div>


                    <div className="p-6">

                        <div className="flex items-center gap-3">

                            <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                                {courseClass.course.code}
                            </span>

                            <span className="text-xs font-bold text-slate-400">
                                {courseClass.course.credits} SKS
                            </span>

                        </div>


                        <h2 className="mt-5 text-2xl font-bold text-left text-slate-950">
                            {courseClass.course.name} - Kelas {courseClass.name}
                        </h2>


                        <p className="mt-2 text-sm text-slate-500">
                            {semesterLabel(courseClass.academic_term.semester)} {courseClass.academic_term.academic_year}
                        </p>


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


                                <button
                                onClick={() => void renameClass(courseClass)}
                                className="rounded-xl border px-5 py-2 text-sm font-bold">
                                Edit
                                </button>

                            </div>


                            <div className="mt-4 flex gap-3">

                                <span className="rounded-xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700">
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

                    </div>


                </article>

                ))}

            </section>
'@


$c=$c.Substring(0,$start)+$new+$c.Substring($end + "</section>".Length)


Set-Content $file $c -Encoding UTF8


npm run build