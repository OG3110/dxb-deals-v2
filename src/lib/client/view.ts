export type View = 'desktop' | 'mobile';
export function pickView(search: string, width: number): View {
  const v = new URLSearchParams(search).get('view');
  if (v === 'mobile' || v === 'desktop') return v;
  return width < 768 ? 'mobile' : 'desktop';
}
