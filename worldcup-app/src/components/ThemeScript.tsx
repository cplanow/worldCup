/**
 * Inline theme-init script. Renders as a <script> in <head> BEFORE any React
 * hydration so the correct theme class is set on <html> before the page paints.
 * Prevents the flash-of-wrong-theme.
 *
 * Content is a static string literal — no user input, no template interpolation,
 * so no XSS surface.
 */
const INIT_CODE = `(function(){try{var t=localStorage.getItem('worldcup-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export function ThemeScript() {
  return <script>{INIT_CODE}</script>;
}
