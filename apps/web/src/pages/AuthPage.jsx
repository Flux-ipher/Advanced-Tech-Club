import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { Lock, Mail, User, Sparkles, Shield, ArrowRight } from 'lucide-react';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const queryMode = searchParams.get('mode');
  const initialMode = queryMode === 'register' || location.state?.mode === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (queryMode === 'register' || location.state?.mode === 'register') {
      setMode('register');
    }
  }, [queryMode, location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        navigate('/portal');
      } else {
        const res = await signUpWithEmail(email, password, fullName);
        if (res?.profile?.role === 'super_admin' || res?.profile?.role === 'admin') {
          navigate('/portal');
        } else {
          // Take new member signups directly to the Apply page to fill up their data
          navigate('/apply');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      // If user is super_admin or admin, route straight to portal
      if (res?.profile?.role === 'super_admin' || res?.profile?.role === 'admin') {
        navigate('/portal');
      } else if (res?.isNewUser || !res?.profile?.student_id) {
        // If user has not completed their application details, route to apply page
        navigate('/apply');
      } else {
        navigate('/portal');
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
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

          {/* Google Sign In Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-800 text-sm font-semibold shadow-xs transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="inline-flex items-center gap-2 text-neutral-600">
                  <svg className="animate-spin h-4 w-4 text-primary-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting to Google...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-3 text-neutral-400 font-bold tracking-wider">
                  Or continue with email
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
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
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
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
              {loading
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In'
                : 'Sign Up & Continue to Application'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/apply"
              className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
            >
              Applying directly? Open student application form →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
