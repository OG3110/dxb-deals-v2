import type { ClientDeal } from '../deals';
export function readDeals(): ClientDeal[] {
  const el = document.getElementById('deals-data');
  try { return el ? JSON.parse(el.textContent || '[]') : []; } catch { return []; }
}
