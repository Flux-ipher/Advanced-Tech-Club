// packages/shared/firebaseClient.js
// Firebase App & Auth Initializer for ATC Platform
// Supports Web & React Native environments with graceful mock fallback

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const getEnvVar = (webKey, expoKey) => {
  if (typeof process !== 'undefined' && process?.env) {
    if (process.env[webKey]) return process.env[webKey];
    if (process.env[expoKey]) return process.env[expoKey];
  }
  try {
    const meta = (new Function('return typeof import.meta !== "undefined" ? import.meta : {}'))();
    if (meta?.env && meta.env[webKey]) return meta.env[webKey];
  } catch (e) {
    // import.meta not available in Hermes / Node
  }
  return '';
};

export const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID')
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your-api-key')
);

let app = null;
let firebaseAuth = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
  } catch (err) {
    console.warn('[ATC Firebase] Could not initialize Firebase client:', err);
  }
}

export { app, firebaseAuth };
export default app;
