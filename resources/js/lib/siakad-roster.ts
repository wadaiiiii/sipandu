import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

const appBasePath = (window as any).__SIPANDU_BASE_PATH__ || '';

GlobalWorkerOptions.workerSrc = `${appBasePath}/pdf.worker.min.mjs`;

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

