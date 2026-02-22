// Browser no-op stub for Node.js built-ins (path, fs) and source-map-js.
// PostCSS pulls these in transitively via @wordpress/components but never
// actually exercises them at runtime in a browser context. Aliasing to this
// file silences the "Module has been externalized" Vite warnings.
export default {}
