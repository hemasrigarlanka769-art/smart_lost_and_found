import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  KeyRound, Mail, User as UserIcon, ShieldCheck, 
  Sparkles, AlertCircle, RefreshCw, LogIn
} from 'lucide-react';

export default function Login() {
  const { loginWithEmail, registerUser, signInWithGoogle, forgotPassword } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  // Form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student'); // 'student', 'faculty', 'admin'
  
  // UX states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      if (isForgot) {
        await forgotPassword(email);
        setInfoMsg("A mock password reset email has been sent successfully!");
        setIsForgot(false);
      } else if (isRegister) {
        if (!name || !email || !password) throw new Error("Please fill in all fields.");
        await registerUser(name, email, password, role);
      } else {
        if (!email || !password) throw new Error("Please fill in all fields.");
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 glass border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Left Side: Cool branding banner */}
        <div className="md:col-span-5 bg-gradient-to-br from-primary-700 via-indigo-600 to-indigo-800 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-200/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_40%)] pointer-events-none"></div>
          
          <div className="flex items-center gap-2 relative z-10">
            <div className="h-9 w-9 rounded-xl bg-white text-primary-600 flex items-center justify-center font-extrabold text-lg shadow-lg">S</div>
            <span className="font-extrabold tracking-wider text-sm uppercase">Smart Finder</span>
          </div>

          <div className="space-y-4 my-8 md:my-0 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              AI-Powered Campus Lost & Found
            </h2>
            <p className="text-primary-100 text-xs leading-relaxed max-w-sm">
              Helping students, faculty, and administrators recover lost items using advanced semantic text description matching and image analysis.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-primary-200 relative z-10 font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Google DeepMind Pairs
          </div>
        </div>

        {/* Right Side: Form Inputs */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
          
          <div>
            <h3 className="text-xl font-extrabold text-slate-850 dark:text-slate-100">
              {isForgot ? "Forgot Password" : isRegister ? "Create Campus Account" : "Access Platform"}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              {isForgot 
                ? "Enter your email to request recovery link." 
                : isRegister 
                  ? "Sign up with your college email to report items." 
                  : "Sign in using your student or admin credentials."
              }
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/15 border border-rose-200/50 dark:border-rose-800/40 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2 animate-slide-up">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-950/15 border border-primary-200/50 dark:border-primary-800/40 text-xs text-primary-600 dark:text-primary-400 flex items-start gap-2 animate-slide-up">
              <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegister && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Aravind Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>
            </div>

            {!isForgot && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    required={!isForgot}
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Select Role Permission</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="student">Student / User</option>
                  <option value="faculty">Faculty / Staff Member</option>
                  <option value="admin">Platform Administrator</option>
                </select>
              </div>
            )}

            {!isRegister && !isForgot && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgot(true)}
                  className="text-xs text-primary-500 hover:underline font-bold"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-650 to-indigo-650 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-primary-500/15 flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  {isForgot ? "Reset Password" : isRegister ? "Create Account" : "Access System"}
                </>
              )}
            </button>
          </form>

          {/* Social Sign In & Toggles */}
          {!isForgot && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850">
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-350 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.79 5.79 0 0 1-2.51 3.82v3.13h3.97c2.3-2.13 3.63-5.26 3.63-8.8Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.93l-3.97-3.13c-1.1.74-2.5 1.18-3.99 1.18-3.07 0-5.67-2.08-6.6-4.88H1.4v3.23A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.4 14.24a7.15 7.15 0 0 1 0-4.48V6.53H1.4a12 12 0 0 0 0 10.94l4-3.23Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.43-3.43A11.93 11.93 0 0 0 12 0 12 12 0 0 0 1.4 6.53l4 3.23c.93-2.8 3.53-4.8 6.6-4.8Z" />
                </svg>
                Sign in with Google
              </button>

              <div className="text-center text-xs">
                <button
                  type="button"
                  onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); setInfoMsg(''); }}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350"
                >
                  {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register Here"}
                </button>
              </div>
            </div>
          )}

          {isForgot && (
            <div className="text-center text-xs">
              <button
                type="button"
                onClick={() => { setIsForgot(false); setErrorMsg(''); setInfoMsg(''); }}
                className="text-primary-500 hover:underline font-bold"
              >
                Back to Sign In
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
