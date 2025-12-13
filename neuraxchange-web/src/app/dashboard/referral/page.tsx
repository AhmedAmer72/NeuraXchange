'use client';

import { useState, useEffect } from 'react';
import { Users, Copy, Gift, TrendingUp, DollarSign, Share2, Check, Sparkles, Trophy } from 'lucide-react';

interface ReferralData {
  referralCode: string;
  referralCount: number;
  totalEarnings: number;
  pendingRewards: number;
  referrals: Array<{
    id: string;
    username: string;
    joinedAt: string;
    totalVolume: number;
    earned: number;
  }>;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const chatId = localStorage.getItem('chatId');
      const res = await fetch(`/api/referral?chatId=${chatId}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(`https://t.me/NeuraXchangeBot?start=${data.referralCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient mb-2">Referral Program</h1>
        <p className="text-slate-400">Invite friends and earn rewards on their trades</p>
      </div>

      {/* Referral Link Card */}
      <div className="glass rounded-2xl p-8 gradient-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center animate-pulse-glow">
              <Share2 className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Your Referral Link</h2>
              <p className="text-slate-400 text-sm">Share this link to earn rewards</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-800/50 border border-cyan-500/30 rounded-xl px-6 py-4 font-mono text-cyan-400">
              https://t.me/NeuraXchangeBot?start={data?.referralCode || 'LOADING'}
            </div>
            <button
              onClick={handleCopyCode}
              className={`p-4 rounded-xl transition-all duration-300 ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
              }`}
            >
              {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Earn <span className="text-cyan-400 font-semibold">10%</span> of trading fees from your referrals!</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass rounded-xl p-6 gradient-border card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Referrals</p>
              <p className="text-2xl font-bold text-white">{data?.referralCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Earned</p>
              <p className="text-2xl font-bold text-white">${(data?.totalEarnings || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
              <Gift className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Pending Rewards</p>
              <p className="text-2xl font-bold text-white">${(data?.pendingRewards || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Commission Rate</p>
              <p className="text-2xl font-bold text-white">10%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referrals List */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Your Referrals
          </h2>
        </div>

        {!data?.referrals || data.referrals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No referrals yet</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Share your referral link with friends to start earning rewards on their trades
            </p>
            <button onClick={handleCopyCode} className="btn-primary flex items-center gap-2 mx-auto">
              <Copy className="w-5 h-5" />
              Copy Referral Link
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-400 font-medium">User</th>
                  <th className="text-left px-6 py-4 text-slate-400 font-medium">Joined</th>
                  <th className="text-right px-6 py-4 text-slate-400 font-medium">Trading Volume</th>
                  <th className="text-right px-6 py-4 text-slate-400 font-medium">Your Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.referrals.map((referral, index) => (
                  <tr
                    key={referral.id}
                    className="hover:bg-slate-800/30 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center">
                          <span className="text-cyan-400 font-semibold">
                            {referral.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-medium">{referral.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(referral.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                      ${referral.totalVolume.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-400 font-mono font-semibold">
                        +${referral.earned.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="glass rounded-xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
              <span className="text-2xl font-bold text-cyan-400">1</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Share Your Link</h3>
            <p className="text-slate-400 text-sm">
              Copy your unique referral link and share it with friends
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 flex items-center justify-center">
              <span className="text-2xl font-bold text-fuchsia-400">2</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Friends Join & Trade</h3>
            <p className="text-slate-400 text-sm">
              When they sign up and start trading, you get credited
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-400">3</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Earn Rewards</h3>
            <p className="text-slate-400 text-sm">
              Receive 10% of trading fees from all your referrals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
