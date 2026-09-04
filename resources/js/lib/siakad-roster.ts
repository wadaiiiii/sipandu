import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const appUrl = document.querySelector<HTMLMetaElement>('meta[name="app-url"]')?.content.replace(/\/$/, '') ?? '';
const workerPath = new URL(pdfWorkerUrl, window.location.origin);

if (appUrl && workerPath.origin === window.location.origin && !workerPath.pathname.startsWith(new URL(appUrl).pathname)) {
    workerPath.pathname = `${new URL(appUrl).pathname.replace(/\/$/, '')}${workerPath.pathname}`;
}

GlobalWorkerOptions.workerSrc = workerPath.toString();

export type SiakadRosterRow = { nim: string; name: string };

export async function parseSiakadRoster(file: File): Promise<SiakadRosterRow[]> {
    const document = await getDocument({ data: await file.arrayBuffer() }).promise;
    const rows = new Map<string, SiakadRosterRow>();

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        const lines = new Map<number, Array<{ x: number; text: string }>>();

        for (const item of content.items) {
            if (!('str' in item) || !item.str.trim()) continue;
            const y = Math.round(item.transform[5] * 2) / 2;
            const line = lines.get(y) ?? [];
            line.push({ x: item.transform[4], text: item.str.trim() });
            lines.set(y, line);
        }

        for (const line of [...lines.entries()].sort((a, b) => b[0] - a[0])) {
            const text = line[1].sort((a, b) => a.x - b.x).map((part) => part.text).join(' ');
            const match = text.match(/^\s*\d+\s+([A-Za-z][A-Za-z0-9.-]{3,39})\s+(.+?)\s*$/);
            if (!match) continue;

            const nim = match[1].toUpperCase();
            const name = match[2].replace(/\s{2,}.*$/, '').trim();
            if (name && !/^(NAMA|TOTAL|TIDAK ADA)/i.test(name)) rows.set(nim, { nim, name });
        }
    }

    return [...rows.values()];
}
