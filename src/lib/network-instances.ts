export const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://piped-api.lunar.icu',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.rivo.lol',
    'https://piped-api.cfe.re',
    'https://api.piped.projectsegfau.lt',
    'https://api-piped.mha.fi',
    'https://pipedapi.moomoo.me',
    'https://piped-api.garudalinux.org',
    'https://pipedapi.nosebs.ru',
    'https://pipedapi.us.projectsegfau.lt',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.qdi.fi',
    'https://pipedapi.astreapp.ovh',
    'https://pipedapi.pablo.casa',
    'https://pipedapi.drg.re',
];

export const INVIDIOUS_INSTANCES = [
    'https://invidious.nerdvpn.de',
    'https://invidious.f5.si',
    'https://inv.nadeko.net',
    'https://inv.tux.pizza',
    'https://invidious.privacydev.net',
    'https://yewtu.be',
    'https://iv.melmac.space',
    'https://invidious.snopyta.org',
    'https://invidious.tiekoetter.com',
    'https://inv.vern.cc',
    'https://invidious.no-logs.com',
];

// Cobalt API instances (cobalt.tools downloader)
export const COBALT_INSTANCES = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh',
    'https://cobalt-api.kwiatekmiki.com',
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
