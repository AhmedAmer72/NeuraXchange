'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Pause, Play, Trash2, Calendar, X, TrendingUp, DollarSign, Clock } from 'lucide-react';

interface DCAOrder {
  id: string;
  fromToken: string;
  toToken: string;
  amount: number;
  frequency: string;
  isActive: boolean;
  nextExecutionAt: string | null;
  lastExecutedAt: string | null;
  totalExecutions: number;
  createdAt: string;
}

export default function DCAPage() {
  const [orders, setOrders] = useState<DCAOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    fromToken: 'USDT',
    toToken: 'BTC',
    amount: '',
    frequency: 'daily'
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const chatId = localStorage.getItem('chatId');
      const res = await fetch(`/api/dca?chatId=${chatId}`);
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch DCA orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = async (orderId: string, isActive: boolean) => {
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch('/api/dca', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, orderId, isActive: !isActive })
      });
      fetchOrders();
    } catch (error) {
      console.error('Failed to toggle order:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch(`/api/dca?chatId=${chatId}&orderId=${orderId}`, {
        method: 'DELETE'
      });
      fetchOrders();
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.amount) return;
    
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch('/api/dca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          ...newOrder,
          amount: parseFloat(newOrder.amount)
        })
      });
      setShowCreateModal(false);
      setNewOrder({ fromToken: 'USDT', toToken: 'BTC', amount: '', frequency: 'daily' });
      fetchOrders();
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  const activeOrders = orders.filter(o => o.isActive);
  const totalInvested = orders.reduce((sum, o) => sum + (o.amount * o.totalExecutions), 0);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">DCA Orders</h1>
          <p className="text-slate-400">Dollar-cost averaging made simple</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New DCA
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass rounded-xl p-6 gradient-border card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">{orders.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
              <Play className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Invested</p>
              <p className="text-2xl font-bold text-white">${totalInvested.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Executions</p>
              <p className="text-2xl font-bold text-white">
                {orders.reduce((sum, o) => sum + o.totalExecutions, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            Your DCA Orders
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-4">No DCA orders yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-secondary"
            >
              Create Your First DCA
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {orders.map((order, index) => (
              <div
                key={order.id}
                className="p-6 hover:bg-slate-800/30 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      order.isActive 
                        ? 'bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 animate-pulse-glow' 
                        : 'bg-slate-800/50'
                    }`}>
                      <RefreshCw className={`w-7 h-7 ${order.isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">
                        {order.fromToken} → {order.toToken}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-cyan-400 font-mono text-lg">${order.amount}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400 capitalize">{order.frequency}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{order.totalExecutions} executions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {order.nextExecutionAt && order.isActive && (
                      <div className="text-right mr-4">
                        <p className="text-xs text-slate-500">Next execution</p>
                        <p className="text-sm text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.nextExecutionAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleToggleOrder(order.id, order.isActive)}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        order.isActive
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {order.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-3 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-300"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {order.lastExecutedAt && (
                  <div className="mt-4 pl-18 flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    Last executed: {new Date(order.lastExecutedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up">
          <div className="glass rounded-2xl p-8 w-full max-w-md gradient-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gradient">Create DCA Order</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Token</label>
                  <select
                    value={newOrder.fromToken}
                    onChange={(e) => setNewOrder({ ...newOrder, fromToken: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Token</label>
                  <select
                    value={newOrder.toToken}
                    onChange={(e) => setNewOrder({ ...newOrder, toToken: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                    <option value="XAI">XAI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  value={newOrder.amount}
                  onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                  placeholder="100"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Frequency</label>
                <div className="grid grid-cols-3 gap-3">
                  {['daily', 'weekly', 'monthly'].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setNewOrder({ ...newOrder, frequency: freq })}
                      className={`p-3 rounded-xl border transition-all duration-300 capitalize ${
                        newOrder.frequency === freq
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                          : 'border-slate-700 hover:border-slate-600 text-slate-400'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={!newOrder.amount}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create DCA Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
