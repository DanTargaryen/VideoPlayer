type ItemWithId = {
  id: number | string;
};

export function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function takeRandomItems<T>(items: T[], count: number) {
  return shuffleItems(items).slice(0, count);
}

export function mergeUniqueById<T extends ItemWithId>(groups: T[][]) {
  const seen = new Set<T['id']>();
  const merged: T[] = [];

  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.id)) {
        continue;
      }
      seen.add(item.id);
      merged.push(item);
    }
  }

  return merged;
}
