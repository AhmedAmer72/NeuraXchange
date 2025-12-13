'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Shield, Clock, TrendingUp, Bell, Users, Sparkles, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen hex-bg text-white overflow-hidden">
      {/* Animated particles background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-pulse opacity-50" />
        <div className="absolute top-40 right-20 w-1 h-1 bg-fuchsia-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-fuchsia-400 rounded-full animate-pulse opacity-30" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <div className="flex items-center space-x-3">
          <div className="relative w-12 h-12 animate-logo-glow">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Neural network circle */}
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gradient1)" strokeWidth="2" opacity="0.3" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="url(#gradient2)" strokeWidth="1.5" opacity="0.5" />
              {/* Swap arrows */}
              <path d="M30 45 L50 30 L50 40 L70 40 L70 50 L50 50 L50 60 L30 45" fill="url(#gradient1)" opacity="0.8" />
              <path d="M70 55 L50 70 L50 60 L30 60 L30 50 L50 50 L50 40 L70 55" fill="url(#gradient2)" opacity="0.8" />
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d4ff" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d946ef" />
                  <stop offset="100%" stopColor="#00d4ff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-2xl font-bold text-gradient">NeuraXchange</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="btn-secondary flex items-center space-x-2">
            <span>Launch App</span>
            <ChevronRight size={18} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-24 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <div className="space-y-4 animate-fade-in-up">
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass border border-cyan-500/30">
                  <Sparkles className="text-cyan-400" size={16} />
                  <span className="text-sm text-cyan-300">AI-Powered Crypto Exchange</span>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="text-white">Swap Crypto</span>
                  <br />
                  <span className="text-gradient">Seamlessly</span>
                </h1>
                <p className="text-lg text-gray-400 max-w-lg">
                  Experience the future of crypto trading with natural language commands, 
                  intelligent automation, and lightning-fast swaps powered by AI.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-200">
                <a 
                  href="https://t.me/neuraxchange_bot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center justify-center space-x-2 text-lg px-8 py-4"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z"/>
                  </svg>
                  <span>Start on Telegram</span>
                  <ArrowRight size={20} />
                </a>
                <Link href="/login" className="btn-secondary flex items-center justify-center space-x-2 text-lg px-8 py-4">
                  <span>Web Dashboard</span>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 animate-fade-in-up animation-delay-300">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gradient">200+</p>
                  <p className="text-sm text-gray-500">Supported Coins</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gradient">$0</p>
                  <p className="text-sm text-gray-500">Platform Fees</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gradient">24/7</p>
                  <p className="text-sm text-gray-500">AI Support</p>
                </div>
              </div>
            </div>

            {/* Right - Logo/Visual */}
            <div className="flex justify-center lg:justify-end animate-fade-in-up animation-delay-200">
              <div className="relative">
                {/* Glowing background */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 blur-3xl rounded-full scale-150" />
                
                {/* Main logo container */}
                <div className="relative w-80 h-80 md:w-96 md:h-96 animate-float">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-spin" style={{ animationDuration: '20s' }} />
                  <div className="absolute inset-4 rounded-full border border-fuchsia-500/20 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
                  
                  {/* Center visualization */}
                  <div className="absolute inset-8 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-full h-full animate-logo-glow">
                      {/* Neural network nodes */}
                      <circle cx="100" cy="40" r="6" fill="#00d4ff" opacity="0.8">
                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="160" cy="100" r="6" fill="#d946ef" opacity="0.8">
                        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="100" cy="160" r="6" fill="#00d4ff" opacity="0.8">
                        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="40" cy="100" r="6" fill="#d946ef" opacity="0.8">
                        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
                      </circle>
                      
                      {/* Connection lines */}
                      <path d="M100 46 L100 80 M154 100 L120 100 M100 154 L100 120 M46 100 L80 100" 
                            stroke="url(#lineGrad)" strokeWidth="2" opacity="0.5" />
                      
                      {/* Center swap icon */}
                      <g transform="translate(70, 70)">
                        <path d="M10 20 L30 5 L30 15 L50 15 L50 25 L30 25 L30 35 L10 20" 
                              fill="#00d4ff" opacity="0.9">
                          <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite" />
                        </path>
                        <path d="M50 40 L30 55 L30 45 L10 45 L10 35 L30 35 L30 25 L50 40" 
                              fill="#d946ef" opacity="0.9">
                          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
                        </path>
                      </g>
                      
                      {/* Outer neural ring with particles */}
                      <circle cx="100" cy="100" r="85" fill="none" stroke="url(#ringGrad)" strokeWidth="2" strokeDasharray="10 5" opacity="0.3">
                        <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="30s" repeatCount="indefinite" />
                      </circle>
                      
                      <defs>
                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00d4ff" />
                          <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00d4ff" />
                          <stop offset="50%" stopColor="#d946ef" />
                          <stop offset="100%" stopColor="#00d4ff" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  
                  {/* Floating particles */}
                  <div className="absolute top-10 right-10 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                  <div className="absolute bottom-16 left-8 w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute top-1/2 right-4 w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-24 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Powered by </span>
              <span className="text-gradient">Intelligence</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              NeuraXchange combines cutting-edge AI with seamless crypto swapping technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="text-cyan-400" size={28} />,
                title: 'Natural Language',
                description: 'Just say "swap 0.1 BTC to ETH" and watch the magic happen',
                gradient: 'from-cyan-500/20 to-blue-500/20'
              },
              {
                icon: <TrendingUp className="text-fuchsia-400" size={28} />,
                title: 'Smart Automation',
                description: 'DCA orders, limit orders, and price alerts running 24/7',
                gradient: 'from-fuchsia-500/20 to-purple-500/20'
              },
              {
                icon: <Shield className="text-green-400" size={28} />,
                title: 'Non-Custodial',
                description: 'Your keys, your crypto. We never hold your funds',
                gradient: 'from-green-500/20 to-emerald-500/20'
              },
              {
                icon: <Clock className="text-yellow-400" size={28} />,
                title: 'Lightning Fast',
                description: 'Instant quotes and rapid swap execution',
                gradient: 'from-yellow-500/20 to-orange-500/20'
              },
              {
                icon: <Bell className="text-purple-400" size={28} />,
                title: 'Real-time Alerts',
                description: 'Get notified instantly when prices hit your targets',
                gradient: 'from-purple-500/20 to-pink-500/20'
              },
              {
                icon: <Users className="text-blue-400" size={28} />,
                title: 'Referral Rewards',
                description: 'Earn 5% commission on every swap from your referrals',
                gradient: 'from-blue-500/20 to-cyan-500/20'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`gradient-border animated-border p-6 card-hover animate-fade-in-up`}
                style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative z-10 px-6 py-24 md:px-12 lg:px-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect', desc: 'Start the bot on Telegram with one click' },
              { step: '02', title: 'Command', desc: 'Type naturally: "swap 100 USDT to SOL"' },
              { step: '03', title: 'Confirm', desc: 'Review the quote and send your crypto' }
            ].map((item, index) => (
              <div key={index} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 150}ms`, opacity: 0 }}>
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-full gradient-border flex items-center justify-center animate-pulse-glow">
                    <span className="text-2xl font-bold text-gradient">{item.step}</span>
                  </div>
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-border animated-border p-12 text-center glow-gradient">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Experience the Future?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of traders who have already discovered the power of AI-driven crypto swapping.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://t.me/neuraxchange_bot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary flex items-center justify-center space-x-2 text-lg px-8 py-4"
              >
                <span>Start Trading Now</span>
                <ArrowRight size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 md:px-12 lg:px-20 border-t border-cyan-500/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <span className="text-xl font-bold text-gradient">NeuraXchange</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2025 NeuraXchange. Powered by SideShift.ai
          </p>
        </div>
      </footer>
    </div>
  );
}
