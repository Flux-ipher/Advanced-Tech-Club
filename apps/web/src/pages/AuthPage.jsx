import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { supabase } from '@atc/shared/supabaseClient';
import { initialProfiles } from '@atc/shared/mockData';
import { RoleBadge } from '../components/RoleBadge';
import { Lock, Mail, User, Sparkles, Shield, ArrowRight, Check } from 'lucide-react';

export function AuthPage() {
  const navigate = useNavigate();
  const { setUser, switchDemoUser } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser(data.user);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, department }
          }
        });
        if (error) throw error;
        setUser(data.user);
      }
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (userProfile) => {
    switchDemoUser(userProfile.id);
    navigate('/');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-sm font-voodoo">
            ATC
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {mode === 'login' ? 'Sign into ATC Hub' : 'Create Member Account'}
          </h1>
          <p className="text-xs text-neutral-500">
            Advanced Tech Club Unified Web & Mobile Platform
          </p>
        </div>

        {/* Auth Box */}
        <div className="voodoo-card p-6 shadow-sm">
          {/* Mode Tabs */}
          <div className="flex border-b border-neutral-200 mb-6 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`flex-1 pb-2.5 text-center border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-primary-500 text-primary-600 font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`flex-1 pb-2.5 text-center border-b-2 transition-colors ${
                mode === 'register'
                  ? 'border-primary-500 text-primary-600 font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Register (New Student)
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 text-danger-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Johnson"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Student Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="student@techclub.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-sm py-2.5 mt-2"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Complete Registration'}
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-neutral-200">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              1-Click Demo Personas
            </p>

            <div className="space-y-1.5">
              {initialProfiles.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleQuickDemoLogin(p)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-left text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div>
                      <span className="font-semibold text-neutral-900 block leading-tight">{p.full_name}</span>
                      <span className="text-[10px] text-neutral-400 capitalize">{p.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
