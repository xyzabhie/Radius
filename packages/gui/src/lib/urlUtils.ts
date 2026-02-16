import { KeyValueItem } from "../components/request/types";

// Polyfill for uuid if needed, or use crypto.randomUUID
function generateId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
}

/**
 * Updates params list based on URL change.
 * Preserves disabled params.
 * Matches existing params by Key to preserve ID/Description.
 */
export function syncParamsFromUrl(url: string, currentParams: KeyValueItem[]): KeyValueItem[] {
    const splitIndex = url.indexOf('?');

    if (splitIndex === -1) {
        // No query string -> Return only disabled params (remove all enabled ones)
        // This effectively "clears" the active params as directed by the URL being cleared.
        return currentParams.filter(p => !p.enabled);
    }

    const queryString = url.slice(splitIndex + 1);

    // Handle {{variable}} in query string - URLSearchParams might escape them strangely.
    // But for now let's use URLSearchParams as it handles decoding %20 etc. correctly.
    // If user types `?key={{val}}`, URLSearchParams works fine.

    const searchParams = new URLSearchParams(queryString);
    const newParams: KeyValueItem[] = [];

    // We need to map the new URL params to our existing items to preserve metadata
    const usedIds = new Set<string>();

    searchParams.forEach((value, key) => {
        // Try to find an existing ENALBED param with this key that hasn't been claimed
        let match = currentParams.find(p => p.enabled && p.key === key && !usedIds.has(p.id));

        if (!match) {
            // Try to find ANY param (maybe we are re-enabling it via URL)
            match = currentParams.find(p => p.key === key && !usedIds.has(p.id));
        }

        if (match) {
            newParams.push({ ...match, value, enabled: true });
            usedIds.add(match.id);
        } else {
            newParams.push({
                id: generateId(),
                key,
                value,
                enabled: true,
                description: ''
            });
        }
    });

    // Add back all disabled params that weren't "re-enabled" by the URL match
    currentParams.forEach(p => {
        if (!p.enabled && !usedIds.has(p.id)) {
            newParams.push(p);
        }
    });

    return newParams;
}

/**
 * Updates URL based on Params change.
 */
export function syncUrlFromParams(url: string, params: KeyValueItem[]): string {
    const splitIndex = url.indexOf('?');
    const baseUrl = splitIndex === -1 ? url : url.slice(0, splitIndex);

    const activeParams = params.filter(p => p.enabled && p.key);

    if (activeParams.length === 0) {
        return baseUrl;
    }

    // We construct the query string manually or via URLSearchParams.
    // URLSearchParams ensures correct encoding.
    const searchParams = new URLSearchParams();
    activeParams.forEach(p => {
        searchParams.append(p.key, p.value);
    });

    // Note: URLSearchParams encodes spaces as '+', traditionally. 
    // Some APIs prefer '%20'. But standard is fine.
    // We decode '+' in the editor anyway.

    return `${baseUrl}?${searchParams.toString()}`;
}
