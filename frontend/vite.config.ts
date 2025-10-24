import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  // Environment-specific configuration
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  
  return {
    server: {
      host: "::",
      port: 8080,
      cors: {
        origin: [
          "http://localhost:8034",
          "http://localhost:8080",
          "http://127.0.0.1:8034",
          "http://127.0.0.1:8080",
          "https://194.163.134.129:8034",
        ],
        credentials: true,
      },
    },
    plugins: [
      react(),
      isDevelopment && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Define environment variables for build-time
      __DEV__: isDevelopment,
      __PROD__: isProduction,
    },
    build: {
      // Environment-specific build settings
      sourcemap: isDevelopment,
      minify: isProduction ? 'esbuild' : false,
      esbuild: {
        drop: isProduction ? ['console', 'debugger'] : [],
      },
      rollupOptions: {
        output: {
          // Add environment suffix to build files in development
          entryFileNames: isDevelopment ? 'assets/[name]-dev.[hash].js' : 'assets/[name].[hash].js',
          chunkFileNames: isDevelopment ? 'assets/[name]-dev.[hash].js' : 'assets/[name].[hash].js',
          assetFileNames: isDevelopment ? 'assets/[name]-dev.[hash].[ext]' : 'assets/[name].[hash].[ext]',
        },
      },
    },
    // Environment-specific environment variables
    envPrefix: 'VITE_',
  };
});