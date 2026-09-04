import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

const appBasePath = (window as any).__SIPANDU_BASE_PATH__ || '';

// Use stable public worker path instead of Vite hashed asset.
// This works for localhost and cPanel subdirectory deployment.
GlobalWorkerOptions.workerSrc = `${appBasePath}/pdf.worker.min.mjs`;

export type SiakadRosterRow = { nim: string; name: string };

export async function parseSiakadRoster(file: File): Promise<SiakadRosterRow[]> {
    const document = await getDocument({ data: await file.arrayBuffer() }).promise;
    const rows = new Map<string, SiakadRosterRow>();

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getDocument ? null : null;
    }

    return [...rows.values()];
}
