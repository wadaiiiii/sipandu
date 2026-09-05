export function sipanduUrl(path: string): string {
    const base =
        (window as any).__SIPANDU_BASE_PATH__ ||
        '';

    const cleanBase = String(base).replace(/\/+$/, '');

    const cleanPath = String(path).replace(/^\/+/, '');

    if (!cleanBase) {
        return `/${cleanPath}`;
    }

    return `${cleanBase}/${cleanPath}`;
}
