export function sipanduUrl(path: string): string {

    const base =
        document
            .querySelector<HTMLMetaElement>('meta[name="app-base-path"]')
            ?.content || '';

    if (!path.startsWith('/')) {
        return path;
    }

    return `${base}${path}`;
}