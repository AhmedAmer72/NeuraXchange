'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ExternalLink, ArrowRight, TrendingUp } from 'lucide-react';

interface Swap {
  id: number;
  shiftId: string;
  fromCoin: string;
  toCoin: string;
  depositAmount: string;
  settleAmount: string | null;
  status: string;
  rate: string | null;
  createdAt: string;
}

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'complete', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'expired', label: 'Expired' },
];

export default function HistoryPage() {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('neuraxchange_user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const { chatId } = JSON.parse(userData);
    fetchSwaps(chatId);
  }, [filter, router]);

  const fetchSwaps = async (chatId: string) => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      const res = await fetch(`/api/swaps?chatId=${chatId}&limit=50${statusParam}`);
      
      if (res.ok) {
        const data = await res.json();
        setSwaps(data.swaps || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching swaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSwaps = swaps.filter(swap => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      swap.shiftId.toLowerCase().includes(searchLower) ||
      swap.fromCoin.toLowerCase().includes(searchLower) ||
      swap.toCoin.toLowerCase().includes(searchLower)
    );
  });

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Swap History</h1>
        <p className="text-gray-400 mt-1">View all your past and pending swaps</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Search by ID or coin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={20} className="text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-all"
          >
            {statusFilters.map(f => (
              <option key={f.value} value={f.value} className="bg-slate-800">{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-400">
        Showing <span className="text-cyan-400">{filteredSwaps.length}</span> of <span className="text-cyan-400">{total}</span> swaps
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : filteredSwaps.length === 0 ? (
        <div className="gradient-border p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <TrendingUp className="text-gray-500" size={24} />
          </div>
          <p className="text-gray-400">No swaps found</p>
          <p className="text-gray-500 text-sm mt-1">Start swapping via the Telegram bot!</p>
        </div>
      ) : (
        <div className="gradient-border overflow-hidden animate-fade-in-up animation-delay-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-cyan-500/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pair</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Receive</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">TX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {filteredSwaps.map((swap) => (
                  <tr key={swap.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs px-2 py-1 rounded bg-slate-700/50 text-cyan-400 font-mono">
                        {swap.shiftId.substring(0, 8)}...
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                          {swap.fromCoin.charAt(0)}
                        </span>
                        <span className="font-medium text-white">{swap.fromCoin.toUpperCase()}</span>
                        <ArrowRight className="text-gray-500" size={14} />
                        <span className="w-6 h-6 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-xs font-bold text-fuchsia-400">
                          {swap.toCoin.charAt(0)}
                        </span>
                        <span className="font-medium text-white">{swap.toCoin.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {parseFloat(swap.depositAmount).toFixed(6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {swap.settleAmount ? parseFloat(swap.settleAmount).toFixed(6) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClasses(swap.status)}`}>
                        {swap.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(swap.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="p-2 text-gray-500 hover:text-cyan-400 transition-colors">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
