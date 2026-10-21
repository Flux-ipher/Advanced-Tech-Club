import React from 'react';
import { Link } from 'react-router-dom';
import error404Svg from '@atc/shared/assets/illustrations/error-404.svg';

export function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 px-6 py-16 text-center font-voodoo">
      <img
        src={error404Svg}
        alt="Page not found"
        className="w-72 h-72 max-w-full object-contain animate-fade-in"
      />
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Page not found
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
          The page you are looking for doesn't exist, was removed, or the link has expired.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/25 active:scale-95"
      >
        Go back home
      </Link>
    </div>
  );
}

export default NotFound;
