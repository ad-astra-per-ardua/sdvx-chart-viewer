export function normalize(s) {
    return s.normalize("NFKC").toLowerCase();
}
export function buildSearchIndex(items, pick) {
    const out = new Array(items.length);
    for (let i = 0; i < items.length; i++)
        out[i] = normalize(pick(items[i]));
    return out;
}
