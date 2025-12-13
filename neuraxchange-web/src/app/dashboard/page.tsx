'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Bell, 
  Clock, 
  Target,
  Zap,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface Stats {
  totalSwaps: number;
  completedSwaps: number;
  activeAlerts: number;
  activeDCA: number;
  activeLimits: number;
}

interface Swap {
  id: number;
  shiftId: string;
  fromCoin: string;
  toCoin: string;
  depositAmount: string;
  settleAmount: string | null;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSwaps, setRecentSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('neuraxchange_user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const { chatId, firstName } = JSON.parse(userData);
    setUserName(firstName || 'Trader');
    fetchDashboardData(chatId);
  }, [router]);

  const fetchDashboardData = async (chatId: string) => {
    try {
      const [statsRes, swapsRes] = await Promise.all([
        fetch(`/api/stats?chatId=${chatId}`),
        fetch(`/api/swaps?chatId=${chatId}&limit=5`),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (swapsRes.ok) {
        const swapsData = await swapsRes.json();
        setRecentSwaps(swapsData.swaps || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return 'status-complete';
      case 'pending':
      case 'waiting':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      default:
        return 'status-error';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, <span className="text-gradient">{userName}</span>! 👋
        </h1>
        <p className="text-gray-400">Here&apos;s an overview of your trading activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Swaps', 
            value: stats?.totalSwaps || 0, 
            icon: <TrendingUp size={24} />,
            color: 'cyan',
            trend: '+12%'
          },
          { 
            label: 'Completed', 
            value: stats?.completedSwaps || 0, 
            icon: <ArrowUpRight size={24} />,
            color: 'green',
            trend: null
          },
          { 
            label: 'Active Alerts', 
            value: stats?.activeAlerts || 0, 
            icon: <Bell size={24} />,
            color: 'purple',
            trend: null
          },
          { 
            label: 'Automation', 
            value: (stats?.activeDCA || 0) + (stats?.activeLimits || 0), 
            icon: <Zap size={24} />,
            color: 'fuchsia',
            trend: 'Active'
          },
        ].map((stat, index) => (
          <div 
            key={index}
            className="gradient-border p-6 card-hover animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                {stat.trend && (
                  <span className={`text-xs mt-2 inline-block px-2 py-0.5 rounded-full ${
                    stat.trend.startsWith('+') 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}>
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className={`p-3 rounded-xl bg-${stat.color}-500/20`}>
                <div className={`text-${stat.color}-400`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Automation Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/dashboard/dca"
          className="gradient-border p-6 card-hover group animate-fade-in-up"
          style={{ animationDelay: '400ms', opacity: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <Clock className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-white font-semibold">DCA Orders</p>
                <p className="text-gray-400 text-sm">{stats?.activeDCA || 0} active strategies</p>
              </div>
            </div>
            <ChevronRight className="text-gray-500 group-hover:text-cyan-400 transition-colors" size={20} />
          </div>
        </Link>

        <Link 
          href="/dashboard/limits"
          className="gradient-border p-6 card-hover group animate-fade-in-up"
          style={{ animationDelay: '500ms', opacity: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20">
                <Target className="text-fuchsia-400" size={24} />
              </div>
              <div>
                <p className="text-white font-semibold">Limit Orders</p>
                <p className="text-gray-400 text-sm">{stats?.activeLimits || 0} pending orders</p>
              </div>
            </div>
            <ChevronRight className="text-gray-500 group-hover:text-fuchsia-400 transition-colors" size={20} />
          </div>
        </Link>
      </div>

      {/* Recent Swaps */}
      <div className="gradient-border p-6 animate-fade-in-up" style={{ animationDelay: '600ms', opacity: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Recent Swaps</h2>
          <Link 
            href="/dashboard/history" 
            className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center space-x-1"
          >
            <span>View all</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {recentSwaps.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <TrendingUp className="text-gray-500" size={24} />
            </div>
            <p className="text-gray-400">No swaps yet</p>
            <p className="text-gray-500 text-sm mt-1">Start trading on Telegram to see your history here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSwaps.map((swap, index) => (
              <div 
                key={swap.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                      {swap.fromCoin.charAt(0)}
                    </div>
                    <ArrowDownRight className="text-gray-500" size={16} />
                    <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-sm font-bold text-fuchsia-400">
                      {swap.toCoin.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {swap.fromCoin.toUpperCase()} → {swap.toCoin.toUpperCase()}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {parseFloat(swap.depositAmount).toFixed(6)} {swap.fromCoin.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClasses(swap.status)}`}>
                    {swap.status}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">{formatTimeAgo(swap.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="gradient-border animated-border p-8 text-center animate-fade-in-up" style={{ animationDelay: '700ms', opacity: 0 }}>
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Zap className="text-cyan-400" size={24} />
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        </div>
        <p className="text-gray-400 mb-6">Execute trades and manage your portfolio via Telegram</p>
        <a
          href="https://t.me/neuraxchange_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center space-x-2"
        >
          <span>Open NeuraXchange Bot</span>
          <ExternalLink size={18} />
        </a>
      </div>
    </div>
  );
}
