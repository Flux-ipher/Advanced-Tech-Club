import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env from project root and apps/web
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const localEnv = loadEnv(mode, __dirname, '');
  const env = { ...rootEnv, ...localEnv };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@atc/shared': path.resolve(__dirname, '../../packages/shared'),
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
      'process.env.VITE_ADMIN_EMAIL': JSON.stringify(env.VITE_ADMIN_EMAIL || ''),
      'process.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_FIREBASE_API_KEY': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(''),
      'process.env.EXPO_PUBLIC_FIREBASE_APP_ID': JSON.stringify('')
    },
    server: {
      port: 5173,
      host: true
    }
  };
});
