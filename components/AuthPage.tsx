import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, linkWithPopup, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

type Mode = 'login' | 'register';

const AuthPage: React.FC<{ onSignedIn?: () => void }> = ({ onSignedIn }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      onSignedIn?.();
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSignedIn?.();
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestToggle = async (checked: boolean) => {
    setError(null);
    setGuest(checked);
    setLoading(true);
    try {
      if (checked) {
        await signInAnonymously(auth);
        onSignedIn?.();
      } else {
        await signOut(auth);
      }
    } catch (e: any) {
      setError(e.message || 'Guest sign-in failed');
      // revert toggle if failed
      setGuest(!checked);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // If the user is currently anonymous, link the Google credential to preserve the anonymous account
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
      onSignedIn?.();
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-5xl bg-slate-800 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Branding panel */}
          <div className="p-8 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col justify-center">
            <h1 className="text-4xl font-extrabold text-emerald-400">NutriSnap AI</h1>
            <p className="text-slate-400 mt-3">AI-powered food logging that follows you across devices.</p>

            <ul className="mt-6 space-y-3 text-slate-300">
              <li className="flex items-start gap-3"><span className="text-emerald-400 font-bold">•</span> Fast photo-based logging</li>
              <li className="flex items-start gap-3"><span className="text-emerald-400 font-bold">•</span> Sync across devices</li>
              <li className="flex items-start gap-3"><span className="text-emerald-400 font-bold">•</span> Private & secure</li>
            </ul>

            <div className="mt-8 text-xs text-slate-500">By signing in you agree to sync your logs to your account.</div>
          </div>

          {/* Form panel */}
          <div className="p-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-300">Welcome back</h2>
                  <p className="text-slate-300 text-sm mt-1">Create an account or sign in to sync your food logs.</p>
                </div>
                <div className="text-sm text-slate-400">Secure · Fast · Private</div>
              </div>

              {mode === 'register' && (
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full p-3 rounded-lg bg-slate-800 text-white border border-slate-700" />
              )}

              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="w-full p-3 rounded-lg bg-slate-800 text-white border border-slate-700" />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-3 rounded-lg bg-slate-800 text-white border border-slate-700" />

              {error && <div className="text-sm text-red-400">{error}</div>}

              <div className="flex gap-3">
                {mode === 'login' ? (
                  <button onClick={handleLogin} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg">Sign in</button>
                ) : (
                  <button onClick={handleRegister} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg">Create account</button>
                )}

                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg">
                  {mode === 'login' ? 'Create account' : 'Back to sign in'}
                </button>
              </div>

              <div className="text-center text-slate-400">or</div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    aria-label="Continue as guest"
                    role="switch"
                    type="checkbox"
                    checked={guest}
                    onChange={(e) => handleGuestToggle(e.target.checked)}
                    disabled={loading}
                    className="sr-only"
                  />
                  <span className={`w-11 h-6 rounded-full p-1 ${guest ? 'bg-emerald-500' : 'bg-slate-700'} transition-colors`}> 
                    <span className={`block w-4 h-4 bg-white rounded-full transform ${guest ? 'translate-x-5' : ''} transition-transform`} />
                  </span>
                  <span className="text-slate-300">Continue as guest</span>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 py-3 rounded-lg shadow">
                  <svg className="w-5 h-5" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                    <path d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272v95.2h147.4c-6.4 34.4-25.4 63.5-54.2 83v68h87.4c51.2-47.1 81.9-116.7 81.9-195.8z" fill="#4285f4"/>
                    <path d="M272 544.3c73.6 0 135.4-24.6 180.6-66.8l-87.4-68c-24.3 16.3-55.4 26-93.2 26-71.6 0-132.4-48.3-154.2-113.2H25.7v71.1C70.9 493.2 164.5 544.3 272 544.3z" fill="#34a853"/>
                    <path d="M117.8 323.6c-11.9-35.1-11.9-72.8 0-107.9V144.6H25.7c-39.3 76.7-39.3 169.3 0 246l92.1-66.9z" fill="#fbbc04"/>
                    <path d="M272 107.7c39.9-.6 78.1 14.5 106.9 41.8l80.1-80.1C407.3 24.2 344.9 0 272 0 164.5 0 70.9 51.1 25.7 144.6l92.1 71.1C139.7 156 200.4 107.7 272 107.7z" fill="#ea4335"/>
                  </svg>
                  <span className="text-sm font-semibold">Continue with Google</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
