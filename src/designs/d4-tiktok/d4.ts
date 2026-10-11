// Design 4 · TikTok Feed — entry points. Desktop lives in ./desktop.ts, mobile in ./mobile.ts; both share ./engine.ts
// (state, feed position, search/grid, saved store) and ./markup.ts (every piece of deal markup).
export { initDesktop } from './desktop';
export { initMobile } from './mobile';
