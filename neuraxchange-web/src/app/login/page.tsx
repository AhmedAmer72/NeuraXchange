'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogIn, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) {
      setError('Please enter your Telegram Chat ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/user?chatId=${chatId}`);
      
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem('neuraxchange_user', JSON.stringify({
          chatId,
          username: user.username,
          firstName: user.firstName,
        }));
        router.push('/dashboard');
      } else {
        setError('User not found. Please start the bot on Telegram first.');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hex-bg flex items-center justify-center px-4 py-12">
      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-pulse opacity-50" />
        <div className="absolute top-40 right-20 w-1 h-1 bg-fuchsia-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back link */}
        <Link 
          href="/" 
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>Back to home</span>
        </Link>

        {/* Login card */}
        <div className="gradient-border animated-border p-8 glow-gradient animate-fade-in-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-20 h-20 mx-auto animate-logo-glow">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#loginGrad1)" strokeWidth="2" opacity="0.3" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="url(#loginGrad2)" strokeWidth="1.5" opacity="0.5" />
                  <path d="M30 45 L50 30 L50 40 L70 40 L70 50 L50 50 L50 60 L30 45" fill="url(#loginGrad1)" opacity="0.8" />
                  <path d="M70 55 L50 70 L50 60 L30 60 L30 50 L50 50 L50 40 L70 55" fill="url(#loginGrad2)" opacity="0.8" />
                  <defs>
                    <linearGradient id="loginGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d4ff" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="loginGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#00d4ff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2">Welcome Back</h1>
            <p className="text-gray-400">Access your NeuraXchange dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Telegram Chat ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Enter your Chat ID"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Access Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Help section */}
          <div className="mt-8 pt-6 border-t border-cyan-500/20">
            <div className="flex items-start space-x-3 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <Sparkles className="text-cyan-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-gray-300 font-medium mb-1">How to get your Chat ID?</p>
                <p className="text-sm text-gray-500">
                  Send <code className="px-2 py-0.5 rounded bg-slate-700/50 text-cyan-400">/start</code> to{' '}
                  <a 
                    href="https://t.me/neuraxchange_bot" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline"
                  >
                    @NeuraXchange_bot
                  </a>{' '}
                  on Telegram. Your Chat ID will be displayed in the welcome message.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Don&apos;t have an account?{' '}
          <a 
            href="https://t.me/neuraxchange_bot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300"
          >
            Start the bot
          </a>
        </p>
      </div>
    </div>
  );
}
