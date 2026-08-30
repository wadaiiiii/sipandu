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
                'resources/js/classroom-discussion.tsx',
                'resources/js/student-progress.tsx',
                'resources/js/student-material-checklist.tsx',
                'resources/js/join-requests.ts',
                'resources/js/lecturer-join-dashboard.ts',
                'resources/js/pwa-controls.tsx',
                'resources/js/calendar-panel.tsx',
                'resources/js/class-access-panel.tsx',
                'resources/js/header-utilities.ts',
                'resources/js/ui-polish.ts',
            ],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
});
