'use client';

import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown, X, Check } from 'lucide-react';

interface Alert {
  id: string;
  pair: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
  createdAt: string;
  triggeredAt: string | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    pair: 'BTC/USDT',
    targetPrice: '',
    condition: 'above' as 'above' | 'below'
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const chatId = localStorage.getItem('chatId');
      const res = await fetch(`/api/alerts?chatId=${chatId}`);
      const data = await res.json();
      if (data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.targetPrice) return;
    
    try {
      const chatId = localStorage.getItem('chatId');
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          pair: newAlert.pair,
          targetPrice: parseFloat(newAlert.targetPrice),
          condition: newAlert.condition
        })
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setNewAlert({ pair: 'BTC/USDT', targetPrice: '', condition: 'above' });
        fetchAlerts();
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch(`/api/alerts?chatId=${chatId}&alertId=${alertId}`, {
        method: 'DELETE'
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const activeAlerts = alerts.filter(a => a.isActive);
  const triggeredAlerts = alerts.filter(a => a.triggeredAt);

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
          <h1 className="text-3xl font-bold text-gradient mb-2">Price Alerts</h1>
          <p className="text-slate-400">Get notified when prices hit your targets</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Alert
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-xl p-6 gradient-border card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
              <Bell className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Alerts</p>
              <p className="text-2xl font-bold text-white">{alerts.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-white">{activeAlerts.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-magenta-500/20 to-magenta-500/5 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Triggered</p>
              <p className="text-2xl font-bold text-white">{triggeredAlerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Your Alerts
          </h2>
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Bell className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 mb-4">No alerts configured yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-secondary"
            >
              Create Your First Alert
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {alerts.map((alert, index) => (
              <div
                key={alert.id}
                className="p-6 hover:bg-slate-800/30 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      alert.condition === 'above' 
                        ? 'bg-gradient-to-br from-green-500/20 to-green-500/5' 
                        : 'bg-gradient-to-br from-red-500/20 to-red-500/5'
                    }`}>
                      {alert.condition === 'above' ? (
                        <TrendingUp className="w-6 h-6 text-green-400" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{alert.pair}</p>
                      <p className="text-sm text-slate-400">
                        Alert when price goes {alert.condition}{' '}
                        <span className="text-cyan-400 font-mono">${alert.targetPrice.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.triggeredAt
                        ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30'
                        : alert.isActive
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                      {alert.triggeredAt ? 'Triggered' : alert.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {alert.triggeredAt && (
                  <div className="mt-3 pl-16">
                    <p className="text-sm text-slate-500">
                      Triggered on {new Date(alert.triggeredAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up">
          <div className="glass rounded-2xl p-8 w-full max-w-md gradient-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gradient">Create Price Alert</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Trading Pair</label>
                <select
                  value={newAlert.pair}
                  onChange={(e) => setNewAlert({ ...newAlert, pair: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value="BTC/USDT">BTC/USDT</option>
                  <option value="ETH/USDT">ETH/USDT</option>
                  <option value="SOL/USDT">SOL/USDT</option>
                  <option value="XAI/USDT">XAI/USDT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Price</label>
                <input
                  type="number"
                  value={newAlert.targetPrice}
                  onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Condition</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setNewAlert({ ...newAlert, condition: 'above' })}
                    className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                      newAlert.condition === 'above'
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-slate-700 hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    Above
                  </button>
                  <button
                    onClick={() => setNewAlert({ ...newAlert, condition: 'below' })}
                    className={`p-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                      newAlert.condition === 'below'
                        ? 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-slate-700 hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    Below
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreateAlert}
                disabled={!newAlert.targetPrice}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
