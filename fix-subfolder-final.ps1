Write-Host "FIX SIPANDU SUBFOLDER PATH"

# class quiz
(Get-Content resources/js/class-quiz.tsx) `
-replace "api\('/sipandu-api/bootstrap'\)",
"api(sipanduUrl('/sipandu-api/bootstrap'))" `
| Set-Content resources/js/class-quiz.tsx


# student progress
(Get-Content resources/js/student-progress.tsx) `
-replace "loadJson<BootstrapPayload>\('/sipandu-api/bootstrap'\)",
"loadJson<BootstrapPayload>(sipanduUrl('/sipandu-api/bootstrap'))" `
| Set-Content resources/js/student-progress.tsx


# student material checklist
(Get-Content resources/js/student-material-checklist.tsx) `
-replace "loadJson<BootstrapPayload>\('/sipandu-api/bootstrap'\)",
"loadJson<BootstrapPayload>(sipanduUrl('/sipandu-api/bootstrap'))" `
| Set-Content resources/js/student-material-checklist.tsx


# logout
(Get-Content resources/js/app.tsx) `
-replace "fetch\('/logout'",
"fetch(sipanduUrl('/logout')" `
| Set-Content resources/js/app.tsx


# class code editor
(Get-Content resources/js/class-code-editor.ts) `
-replace "fetch\(`/sipandu-api/",
"fetch(sipanduUrl(`/sipandu-api/" `
| Set-Content resources/js/class-code-editor.ts


# classroom editor
(Get-Content resources/js/classroom-editor.ts) `
-replace "fetch\(`/sipandu-api/",
"fetch(sipanduUrl(`/sipandu-api/" `
| Set-Content resources/js/classroom-editor.ts


Write-Host "DONE"