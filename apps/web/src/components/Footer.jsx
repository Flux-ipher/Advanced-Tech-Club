import React from 'react';
import { Heart, Github, Globe, Shield, Smartphone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-white py-12 text-sm text-neutral-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-xs">
              ATC
            </div>
            <div>
              <p className="font-semibold text-neutral-900">Advanced Tech Club</p>
              <p className="text-xs text-neutral-400">Unified Web & Mobile Campus Platform · VooDoo Design System</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-neutral-600">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-primary-500" />
              Android APK Build Ready
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-warning-600" />
              Role-Gated Supabase RLS
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-success-600" />
              Realtime WebSocket Push
            </span>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1 text-xs text-neutral-400">
            <p>
              Built by <span className="font-medium text-neutral-700">Ritesh Mishra</span> & ATC Core Team
            </p>
            <p>
              <a
                href="https://storyset.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600 underline transition-colors"
              >
                Illustrations by Storyset
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
