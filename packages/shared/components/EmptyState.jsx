import React from 'react';

export function EmptyState({ illustration: Illustration, title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 gap-5 text-center ${className}`}>
      {typeof Illustration === 'string' ? (
        <img src={Illustration} alt={title || 'Empty state'} className="w-48 h-48 max-w-full object-contain" />
      ) : typeof Illustration === 'function' ? (
        <Illustration className="w-48 h-48 max-w-full" />
      ) : Illustration ? (
        Illustration
      ) : null}
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onPress || action.onClick}
          className="mt-1 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
