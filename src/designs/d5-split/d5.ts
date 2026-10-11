// Design 5 · Split Scroll — entry points. Desktop lives in ./desktop.ts, mobile in ./mobile.ts; both share ./engine.ts
// (scroll list, active flyer, overview grid, saved store) and ./markup.ts (every piece of deal markup).
export { initDesktop } from './desktop';
export { initMobile } from './mobile';
