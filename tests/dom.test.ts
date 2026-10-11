import { describe, it, expect } from 'vitest';
import { cssUrl } from '../src/lib/client/dom';

describe('cssUrl', () => {
  it('percent-encodes quotes and parentheses', () => {
    const out = cssUrl("/a'b(c).webp");
    expect(out).not.toMatch(/['"()\\]/);
    expect(out).toBe('/a%27b%28c%29.webp');
  });
  it('neutralises attempts to break out of url() and the style attribute', () => {
    const out = cssUrl(`x');background:red;" onerror="alert(1)`);
    expect(out).not.toMatch(/['"()\\]/);
    expect(out).not.toContain(' ');
  });
  it('passes a normal asset path through unchanged', () => {
    expect(cssUrl('/_astro/flyer.abc.webp')).toBe('/_astro/flyer.abc.webp');
  });
  it('html-escapes ampersands', () => {
    expect(cssUrl('/a.webp?x=1&y=2')).toBe('/a.webp?x=1&amp;y=2');
  });
});
