import { describe, it, expect } from 'vitest';
import { pickView } from '../src/lib/client/view';
describe('pickView', () => {
  it('uses width by default', () => {
    expect(pickView('', 390)).toBe('mobile');
    expect(pickView('', 1440)).toBe('desktop');
    expect(pickView('', 767)).toBe('mobile');
    expect(pickView('', 768)).toBe('desktop');
  });
  it('query param wins', () => {
    expect(pickView('?view=mobile', 1440)).toBe('mobile');
    expect(pickView('?view=desktop&x=1', 390)).toBe('desktop');
    expect(pickView('?view=banana', 390)).toBe('mobile');
  });
});
