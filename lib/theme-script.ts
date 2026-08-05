// The no-FOUC theme script, shared by app/layout.tsx and app/global-error.tsx.
//
// It runs before first paint: applies the saved theme (or the OS preference) so
// the .dark class is present before the body renders — no flash of the wrong
// theme — and keeps a matchMedia listener live so a "system" preference tracks
// the OS in real time. Kept as a raw string so it ships inline in <head>.
// See ThemePicker.
//
// It lives in its own module because the CSP (issue #60) admits it by HASH, and
// a hash only holds if both call sites ship byte-identical source. global-error
// is a Client Component and cannot read a per-request nonce at all, so the hash
// — not a nonce — is what makes this script run under `script-src` with no
// 'unsafe-inline'.
export const THEME_SCRIPT = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');function a(){var t=localStorage.getItem('theme');var d=t==='dark'||((t==='system'||!t)&&m.matches);document.documentElement.classList.toggle('dark',d);}a();m.addEventListener('change',a);}catch(e){}})();`;

/**
 * base64 sha256 of THEME_SCRIPT, in CSP source form.
 *
 * Hardcoded rather than computed: the policy is built in the edge runtime on
 * every request, where hashing is async, and re-hashing per request would burn
 * work to reproduce a constant. `tests/security-headers.test.ts` recomputes it
 * from THEME_SCRIPT and fails if the two ever drift — so editing the script
 * without editing this line breaks the build, not production.
 */
export const THEME_SCRIPT_SHA256 =
  "sha256-7N/VFWnx6Y6k8RjgMd1OxIfX+fNSOwJMNF7JH2ERCZY=";
