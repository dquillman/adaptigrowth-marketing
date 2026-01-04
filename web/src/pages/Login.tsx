import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-800/50 backdrop-blur-md p-8 shadow-xl border border-slate-700">
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold font-display text-xl mb-4">
                        E
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white font-display">
                        {isLogin ? 'Welcome back' : 'Create an account'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        {isLogin ? 'Sign in to continue your mastery journey' : 'Start your path to certification today'}
                    </p>
                </div>

                {error && <div className="rounded-lg bg-red-900/20 p-4 text-sm text-red-200 border border-red-900/50">{error}</div>}

                <button
                    onClick={handleGoogleSignIn}
                    className="w-full flex justify-center items-center gap-3 rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
                    Sign in with Google
                </button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-slate-800 px-2 text-slate-500">Or continue with email</span>
                    </div>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
                            <input
                                type="email"
                                required
                                className="block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                className="block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-brand-500 sm:text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative flex w-full justify-center rounded-lg border border-transparent bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 shadow-lg shadow-brand-500/20 transition-all"
                        >
                            {isLogin ? 'Sign in' : 'Sign up'}
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <button
                        className="text-sm font-medium text-brand-400 hover:text-brand-300"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
