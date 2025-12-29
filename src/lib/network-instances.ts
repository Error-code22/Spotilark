export const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',  // Official, multi-region CDN
    'https://pipedapi.tokhmi.xyz',   // US CDN
    'https://pipedapi.moomoo.me',    // GB CDN
    'https://pipedapi.syncpundit.io',// Multi-region CDN
    'https://api-piped.mha.fi',      // FI CDN
    'https://piped-api.garudalinux.org', // FI CDN
    'https://pipedapi.rivo.lol',     // CL CDN
    'https://pipedapi.leptons.xyz',  // AT CDN
    'https://piped-api.lunar.icu',   // DE CDN
    'https://ytapi.dc09.ru',         // RU CDN
    'https://pipedapi.colinslegacy.com', // US CDN
    'https://yapi.vyper.me',         // CL CDN
    'https://api.looleh.xyz',        // NL CDN
    'https://piped-api.cfe.re',      // PL CDN
    'https://pipedapi.nosebs.ru',    // FI CDN
    'https://pa.mint.lgbt',          // CA, no CDN
    'https://pa.il.ax',              // US, no CDN
    'https://api.piped.projectsegfau.lt', // FR, no CDN
    'https://pipedapi.us.projectsegfau.lt', // US, no CDN
    'https://watchapi.whatever.social', // US, no CDN
];

export const INVIDIOUS_INSTANCES = [
    'https://invidious.nerdvpn.de',  // Healthy, 100% uptime, UA
    'https://invidious.f5.si',       // Healthy, 98.6% uptime, JP
    'https://inv.nadeko.net',        // Up, multi-backend
    'https://yewtu.be',              // Often works despite 403s (retry with headers)
    'https://inv.tux.pizza',
    'https://invidious.privacydev.net',
];

export function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export function getStealthHeaders(instanceUrl: string, type: 'mobile' | 'desktop' = 'mobile'): Record<string, string> {
    const origin = new URL(instanceUrl).origin;

    if (type === 'mobile') {
        return {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Origin': origin,
            'Referer': origin + '/',
            'Accept-Language': 'en-US,en;q=0.9'
        };
    }

    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': origin,
        'Referer': origin + '/',
        'X-Requested-With': 'XMLHttpRequest'
    };
}
