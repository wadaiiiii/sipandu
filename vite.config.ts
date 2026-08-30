import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.tsx',
                'resources/js/users.tsx',
                'resources/js/classroom.tsx',
                'resources/js/classroom-v2.tsx',
                'resources/js/student-classroom.tsx',
                'resources/js/student-classroom-ux.ts',
                'resources/js/student-classroom-fastpath.ts',
                'resources/js/classroom-discussion.tsx',
                'resources/js/student-progress.tsx',
                'resources/js/student-material-checklist.tsx',
                'resources/js/join-requests.ts',
                'resources/js/lecturer-join-dashboard.ts',
                'resources/js/action-feedback.ts',
                'resources/js/academic-latex.ts',
                'resources/js/material-resources.ts',
                'resources/js/classroom-editor.ts',
                'resources/js/classroom-loading.ts',
                'resources/js/ux-performance.ts',
                'resources/js/class-card-loading-guard.ts',
                'resources/js/assessment-center.tsx',
                'resources/js/assignment-deeplink.ts',
                'resources/js/class-quiz.tsx',
                'resources/js/quiz-entry.ts',
                'resources/js/class-code-editor.ts',
                'resources/js/pwa-controls.tsx',
                'resources/js/calendar-panel.tsx',
                'resources/js/class-access-panel.tsx',
                'resources/js/header-utilities.ts',
                'resources/js/ui-polish.ts',
                'resources/js/ui-language.ts',
            ],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
});
