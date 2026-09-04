export {};

const classId = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
const originalFetch = window.fetch.bind(window);

if (classId && !(window as Window & { __sipanduStudentFastpath?: boolean }).__sipanduStudentFastpath) {
    (window as Window & { __sipanduStudentFastpath?: boolean }).__sipanduStudentFastpath = true;

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const url = new URL(raw, window.location.origin);
        if (url.origin === window.location.origin && url.pathname === '/api/dashboard') {
            return originalFetch(`/api/classes/${classId}/student-progress`, init);
        }
        return originalFetch(input, init);
    }) as typeof window.fetch;
}

