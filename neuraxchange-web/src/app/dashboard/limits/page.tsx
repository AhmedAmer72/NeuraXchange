'use client';

import { useState, useEffect } from 'react';
import { Target, Plus, X, Trash2, Check, Clock, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

interface LimitOrder {
  id: string;
  fromToken: string;
  toToken: string;
  amount: number;
  targetPrice: number;
  orderType: 'buy' | 'sell';
  isActive: boolean;
  executedAt: string | null;
  createdAt: string;
}

export default function LimitsPage() {
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    fromToken: 'USDT',
    toToken: 'BTC',
    amount: '',
    targetPrice: '',
    orderType: 'buy' as 'buy' | 'sell'
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const chatId = localStorage.getItem('chatId');
      const res = await fetch(`/api/limits?chatId=${chatId}`);
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch limit orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch(`/api/limits?chatId=${chatId}&orderId=${orderId}`, {
        method: 'DELETE'
      });
      fetchOrders();
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.amount || !newOrder.targetPrice) return;
    
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch('/api/limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          ...newOrder,
          amount: parseFloat(newOrder.amount),
          targetPrice: parseFloat(newOrder.targetPrice)
        })
      });
      setShowCreateModal(false);
      setNewOrder({ fromToken: 'USDT', toToken: 'BTC', amount: '', targetPrice: '', orderType: 'buy' });
      fetchOrders();
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  const activeOrders = orders.filter(o => o.isActive);
  const executedOrders = orders.filter(o => o.executedAt);
  const totalVolume = orders.filter(o => o.executedAt).reduce((sum, o) => sum + o.amount, 0);

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
          <h1 className="text-3xl font-bold text-gradient mb-2">Limit Orders</h1>
          <p className="text-slate-400">Set your price, we&apos;ll handle the rest</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Limit Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass rounded-xl p-6 gradient-border card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
              <Target className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-white">{orders.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Executed</p>
              <p className="text-2xl font-bold text-white">{executedOrders.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Volume Executed</p>
              <p className="text-2xl font-bold text-white">${totalVolume.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Your Limit Orders
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Target className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-4">No limit orders yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-secondary"
            >
              Create Your First Limit Order
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
                      order.orderType === 'buy'
                        ? 'bg-gradient-to-br from-green-500/20 to-green-500/5'
                        : 'bg-gradient-to-br from-red-500/20 to-red-500/5'
                    }`}>
                      {order.orderType === 'buy' ? (
                        <TrendingUp className="w-7 h-7 text-green-400" />
                      ) : (
                        <TrendingDown className="w-7 h-7 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white text-lg">
                          {order.fromToken} → {order.toToken}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                          order.orderType === 'buy'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {order.orderType}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-slate-400">Amount:</span>
                        <span className="text-cyan-400 font-mono">${order.amount.toLocaleString()}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">Target:</span>
                        <span className="text-fuchsia-400 font-mono">${order.targetPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      order.executedAt
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : order.isActive
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {order.executedAt ? 'Executed' : order.isActive ? 'Pending' : 'Cancelled'}
                    </span>
                    {!order.executedAt && (
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-3 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-300"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pl-18 text-sm text-slate-500">
                  {order.executedAt ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-400" />
                      Executed on {new Date(order.executedAt).toLocaleString()}
                    </span>
                  ) : (
                    <span>Created on {new Date(order.createdAt).toLocaleString()}</span>
                  )}
                </div>
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
              <h2 className="text-xl font-bold text-gradient">Create Limit Order</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Order Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setNewOrder({ ...newOrder, orderType: 'buy' })}
                    className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                      newOrder.orderType === 'buy'
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-slate-700 hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    Buy
                  </button>
                  <button
                    onClick={() => setNewOrder({ ...newOrder, orderType: 'sell' })}
                    className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                      newOrder.orderType === 'sell'
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-slate-700 hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    Sell
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Token</label>
                  <select
                    value={newOrder.fromToken}
                    onChange={(e) => setNewOrder({ ...newOrder, fromToken: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
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
                    <option value="USDT">USDT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  value={newOrder.amount}
                  onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                  placeholder="1000"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Price</label>
                <input
                  type="number"
                  value={newOrder.targetPrice}
                  onChange={(e) => setNewOrder({ ...newOrder, targetPrice: e.target.value })}
                  placeholder="50000"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={!newOrder.amount || !newOrder.targetPrice}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Limit Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
