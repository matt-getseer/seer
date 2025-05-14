import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        hmr: {
            // Increase delay to prevent too frequent updates
            timeout: 1000,
            // Set overlay to false to avoid UI distraction
            overlay: false
        }
    },
    preview: {
        port: 5173,
    },
    resolve: {
        alias: {
            // eslint-disable-next-line no-undef
            '@': path.resolve(__dirname, './src')
        }
    }
});
