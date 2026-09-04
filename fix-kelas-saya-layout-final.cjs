const fs = require("fs");
const { execSync } = require("child_process");

const file = "resources/js/app.tsx";
const backup = "resources/js/app.tsx.before-layout-final";


console.log("=== FIX KELAS SAYA UI FINAL ===");


if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
    console.log("Backup dibuat");
}


let c = fs.readFileSync(file,"utf8");


// hapus class flex lama yang membuat tombol ke tengah
c = c.replace(
    /flex items-start justify-between gap-3/g,
    "block"
);


c = c.replace(
    /flex items-center justify-between/g,
    "block"
);


// tombol toolbar bawah
c = c.replace(
    /mt-4 flex flex-wrap gap-2/g,
    "mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5"
);


// perbaiki judul supaya tidak terpotong
c = c.replace(
    /line-clamp-2 font-bold/g,
    "font-bold break-words"
);


// hapus tampilan Edit nama kelas panjang
c = c.replace(
    /Edit nama kelas/g,
    "Edit"
);


// bersihkan mojibake
c = c.replaceAll("â€”","-");
c = c.replaceAll("â€“","-");
c = c.replaceAll("Â·","·");
c = c.replaceAll("â€™","'");


fs.writeFileSync(file,c,"utf8");


console.log("Patch selesai");


try {

    execSync("npm run build",{
        stdio:"inherit"
    });


    console.log("");
    console.log("============================");
    console.log("UI KELAS SAYA BERHASIL");
    console.log("============================");


}
catch(e){

    console.log("BUILD GAGAL - ROLLBACK");

    fs.copyFileSync(backup,file);

    process.exit(1);

}