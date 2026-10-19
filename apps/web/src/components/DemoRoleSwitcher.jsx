import React, { useState } from 'react';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { initialProfiles } from '@atc/shared/mockData';
import { mockDb, supabase } from '@atc/shared/supabaseClient';
import { Shield, UserCheck, ChevronDown, Sparkles, Check, Clock } from 'lucide-react';

export function DemoRoleSwitcher() {
  const { user, switchDemoUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Read current profiles from mockDb if in mock mode
  const currentProfiles = supabase.isMock ? mockDb.storage.profiles : initialProfiles;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 transition-colors text-xs font-medium text-neutral-800"
        title="Switch demo persona to test verification gate and permissions"
      >
        <span className="flex items-center gap-1.5 text-primary-600 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Persona:
        </span>
        <span className="font-semibold text-neutral-900">
          {user ? user.full_name?.split(' ')[0] : 'Guest'}
        </span>
        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
          user?.is_verified ? 'bg-primary-100 text-primary-700' : user ? 'bg-warning-100 text-warning-800' : 'bg-neutral-200 text-neutral-600'
        }`}>
          {user ? (user.is_verified ? (user.role === 'super_admin' || user.role === 'admin' ? 'Admin' : 'Member') : 'Pending') : 'Logged Out'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-modal z-50 p-2 divide-y divide-neutral-100">
            <div className="px-3 py-2">
              <p className="text-xs font-bold text-neutral-900">Switch Demo Persona</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Simulate verification levels & role access:
              </p>
            </div>

            <div className="py-1 space-y-0.5">
              {currentProfiles.map((p) => {
                const isCurrent = user?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchDemoUser(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-colors ${
                      isCurrent ? 'bg-primary-50 text-primary-900 font-semibold' : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                        alt={p.full_name}
                        className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                      />
                      <div>
                        <p className="font-semibold leading-none">{p.full_name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                            {p.role === 'super_admin' || p.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            p.is_verified ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800'
                          }`}>
                            {p.is_verified ? 'Verified' : 'Pending Review'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-primary-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DemoRoleSwitcher;
