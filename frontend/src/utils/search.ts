export function normalize(s: string): string {
  return s.normalize("NFKC").toLowerCase();
}

export function buildSearchIndex<T>(
  items: readonly T[],
  pick: (item: T) => string,
): string[] {
  const out = new Array<string>(items.length);
  for (let i = 0; i < items.length; i++) out[i] = normalize(pick(items[i]));
  return out;
}
