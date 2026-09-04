const fs = require("fs");
const {execSync}=require("child_process");

const file="resources/js/app.tsx";

const backups=[
"resources/js/app.tsx.before-ui-final",
"resources/js/app.tsx.before-final-class-ui",
"resources/js/app.tsx.before-class-ui-fix"
];

let restored=false;

for(const b of backups){
    if(fs.existsSync(b)){
        fs.copyFileSync(b,file);
        console.log("RESTORE:",b);
        restored=true;
        break;
    }
}

if(!restored){
    console.log("Backup tidak ditemukan");
    process.exit(1);
}


let c=fs.readFileSync(file,"utf8");


// bersihkan mojibake umum
c=c.replaceAll("â€”","-")
 .replaceAll("â€“","-")
 .replaceAll("Â·","·")
 .replaceAll("â†’","→")
 .replaceAll("â€™","'");

fs.writeFileSync(file,c,"utf8");


console.log("RESTORE SELESAI");


try{
 execSync("npm run build",{stdio:"inherit"});
 console.log("BUILD OK");
}catch(e){
 console.log("BUILD GAGAL");
 process.exit(1);
}