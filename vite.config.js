import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // sockjs-client (used by services/socket.js for the real STOMP
  // connection) references Node's bare `global` object at module scope.
  // Browsers don't have `global` — only `globalThis` — so without this,
  // importing sockjs-client throws immediately on page load and the
  // whole app fails to render (blank page, "global is not defined" in
  // the console). This is the standard fix for that class of library.
  define: {
    global: 'globalThis',
  },
});
