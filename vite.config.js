import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  base: './', // Use relative paths for GitHub Pages
  build: {
    target: 'esnext' // Ensure support for modern features
  }
});
