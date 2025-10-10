import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // This is the main fix:
  // It tells Vite that our frontend project lives entirely inside the 'client' folder.
  root: 'client',

  plugins: [react()],
  resolve: {
    alias: {
      // This ensures the '@' alias still works correctly from the new root.
      "@": path.resolve(__dirname, "./client"),
    },
  },
  build: {
    // This tells Vite where to put the final built files, relative to the new root.
    outDir: 'dist'
  }
})

