Write-Host "FIX LAST SIPANDU API PREFIX"

$file="resources/js/student-classroom.tsx"

(Get-Content $file) `
-replace "api\('/sipandu-api/bootstrap'\)",
"api(sipanduUrl('/sipandu-api/bootstrap'))" `
-replace "api\(`/sipandu-api/classes/\$\{classId\}/meetings`\)",
"api(sipanduUrl(`/sipandu-api/classes/${classId}/meetings`))" `
| Set-Content $file


$file="resources/js/class-quiz.tsx"

(Get-Content $file) `
-replace "api\(`/sipandu-api/classes/\$\{classId\}/quizzes`\)",
"api(sipanduUrl(`/sipandu-api/classes/${classId}/quizzes`))" `
| Set-Content $file


Write-Host "DONE"