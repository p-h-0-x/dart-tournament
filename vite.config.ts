import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages deployment, set base to the repo name
  // Change 'dart-tournament' to your actual repo name if different
  base: '/dart-tournament/',
})
