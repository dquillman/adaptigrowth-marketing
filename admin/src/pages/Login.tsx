import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate('/');
        } catch (err: any) {
            console.error("Login failed:", err);
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            console.error("Login failed:", err);
            let message = "Invalid email or password.";
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                message = "Invalid email or password.";
            } else if (err.code === 'auth/too-many-requests') {
                message = "Too many failed attempts. Please try again later.";
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
            {/* Background effects */}
            <div className="absolute inset-0">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-brand-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <img src="/favicon.png" alt="Admin Console Logo" className="w-16 h-16 rounded-2xl mx-auto mb-6 shadow-[0_0_20px_rgba(2,132,199,0.4)] object-contain" />
                        <h1 className="text-3xl font-bold text-white font-display tracking-tight mb-2">Admin Console</h1>
                        <p className="text-slate-400">Sign in to manage your platform</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                                placeholder="admin@example.com"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                        >
                            {loading ? 'Verifying...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-slate-900/50 px-3 text-slate-500 uppercase tracking-widest bg-slate-900 px-4">Or</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white/5 text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
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
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Admin SSO
                    </button>
                </div>
            </div>
        </div>
    );
}
