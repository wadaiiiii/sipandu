$ErrorActionPreference="Stop"

$file="resources/js/app.tsx"
$backup="resources/js/app.tsx.before-replace-compact-card"

if(!(Test-Path $backup)){
    Copy-Item $file $backup
}

$content = Get-Content $file -Raw -Encoding UTF8


$start = $content.IndexOf(
"function CompactClassCard"
)

$end = $content.IndexOf(
"function EmptyClasses"
)


if($start -lt 0 -or $end -lt 0){
    Write-Host "FUNCTION TIDAK DITEMUKAN"
    exit 1
}


$newFunction = @'
function CompactClassCard({ courseClass, index }: { courseClass: CourseClass; index: number }) {
    return (
        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">

            <div className={`h-2 ${
                index % 2 === 0
                ? "bg-gradient-to-r from-blue-500 to-blue-300"
                : "bg-gradient-to-r from-blue-900 to-blue-500"
            }`} />


            <div className="p-6">

                <div className="flex items-center gap-3">

                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                        {courseClass.course.code.substring(0,3)}
                    </div>


                    <span className="text-xs font-bold text-slate-400">
                        {courseClass.course.credits} SKS
                    </span>

                </div>


                <h3 className="mt-5 text-xl font-bold text-slate-950">
                    {courseClass.course.name} - Kelas {courseClass.name}
                </h3>


                <p className="mt-2 text-sm text-slate-500">
                    Ganjil 2026/2027
                </p>


                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">

                    <a
                    href={courseClass.detail_url}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">
                        Buka
                    </a>


                    <a
                    href={`/kelas/${courseClass.id}/jurnal`}
                    className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                        Rekap Pembelajaran
                    </a>


                    <div className="ml-auto flex items-center gap-2">

                        <span className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                            KODE {courseClass.join_code ?? "-"}
                        </span>


                        <button className="h-9 w-9 rounded-xl border text-blue-600">
                            ✎
                        </button>


                        <button className="h-9 w-9 rounded-xl border border-red-200 text-red-500">
                            🗑
                        </button>

                    </div>

                </div>

            </div>

        </article>
    );
}


'@


$content =
$content.Substring(0,$start) +
$newFunction +
$content.Substring($end)


Set-Content $file $content -Encoding UTF8


Write-Host "COMPACT CARD DIGANTI"

npm run build