export type FoldResult = { key: string; label: string; ok: boolean; bottom: number | null; limit: number };

export const foldTargets = [
  { key: 'book-from', label: 'From field' },
  { key: 'book-to', label: 'To field' },
  { key: 'trip', label: 'Trips / check-in' },
  { key: 'status', label: 'Flight status' },
  { key: 'ad-headline', label: 'Card ad headline' },
];

/** PRD FR-1–FR-3: each task entry point and the full ad headline sit inside the initial viewport, clear of fixed UI. */
export function measureFold(doc: Document, win: Window): FoldResult[] {
  const height = win.innerHeight;
  const width = win.innerWidth;
  const obstruction = doc.querySelector('[data-fold-obstruction]');
  const obstructionTop = obstruction ? obstruction.getBoundingClientRect().top : height;
  return foldTargets.map(({ key, label }) => {
    const element = doc.querySelector<HTMLElement>(`[data-fold="${key}"]`);
    const inObstruction = Boolean(obstruction && element && obstruction.contains(element));
    const limit = inObstruction ? height : Math.min(height, obstructionTop);
    if (!element) return { key, label, ok: false, bottom: null, limit };
    const rect = element.getBoundingClientRect();
    const ok = rect.height > 0 && rect.top >= 0 && rect.bottom <= limit + 0.5 && rect.left >= 0 && rect.right <= width + 0.5;
    return { key, label, ok, bottom: Math.round(rect.bottom), limit: Math.round(limit) };
  });
}
