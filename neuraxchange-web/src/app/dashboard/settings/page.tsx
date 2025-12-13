'use client';

import { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Sliders, Save, Check, Wallet, Globe, Moon, Zap } from 'lucide-react';

interface UserSettings {
  defaultSlippage: number;
  notifications: boolean;
  autoConfirm: boolean;
  preferredNetwork: string;
  theme: string;
  language: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    defaultSlippage: 0.5,
    notifications: true,
    autoConfirm: false,
    preferredNetwork: 'ethereum',
    theme: 'dark',
    language: 'en'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const chatId = localStorage.getItem('chatId');
      const res = await fetch(`/api/settings?chatId=${chatId}`);
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, settings })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
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
    <div className="space-y-8 animate-fade-in-up max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Settings</h1>
          <p className="text-slate-400">Customize your trading experience</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`btn-primary flex items-center gap-2 ${saved ? 'bg-green-500 hover:bg-green-600' : ''}`}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Trading Settings */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Trading Settings</h2>
            <p className="text-sm text-slate-400">Configure your default trading preferences</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Slippage */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Default Slippage Tolerance
            </label>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0, 3.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSettings({ ...settings, defaultSlippage: value })}
                    className={`px-4 py-2 rounded-xl border transition-all duration-300 ${
                      settings.defaultSlippage === value
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                        : 'border-slate-700 hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <div className="flex-1 max-w-[120px]">
                <input
                  type="number"
                  value={settings.defaultSlippage}
                  onChange={(e) => setSettings({ ...settings, defaultSlippage: parseFloat(e.target.value) || 0 })}
                  step="0.1"
                  min="0.1"
                  max="50"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-white text-center focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Preferred Network */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Preferred Network
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'ethereum', name: 'Ethereum', color: 'from-blue-500/20 to-blue-500/5' },
                { id: 'polygon', name: 'Polygon', color: 'from-purple-500/20 to-purple-500/5' },
                { id: 'arbitrum', name: 'Arbitrum', color: 'from-cyan-500/20 to-cyan-500/5' },
                { id: 'optimism', name: 'Optimism', color: 'from-red-500/20 to-red-500/5' }
              ].map((network) => (
                <button
                  key={network.id}
                  onClick={() => setSettings({ ...settings, preferredNetwork: network.id })}
                  className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
                    settings.preferredNetwork === network.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${network.color} flex items-center justify-center`}>
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <span className={settings.preferredNetwork === network.id ? 'text-cyan-400' : 'text-slate-400'}>
                    {network.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
            <Bell className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            <p className="text-sm text-slate-400">Manage your notification preferences</p>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Push Notifications</p>
                <p className="text-sm text-slate-400">Receive alerts for swaps and price targets</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
              className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
                settings.notifications ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${
                settings.notifications ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 flex items-center justify-center">
            <Shield className="w-5 h-5 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Security & Confirmation</h2>
            <p className="text-sm text-slate-400">Control transaction confirmations</p>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white font-medium">Auto-Confirm Transactions</p>
                <p className="text-sm text-slate-400">Skip confirmation for small transactions</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, autoConfirm: !settings.autoConfirm })}
              className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
                settings.autoConfirm ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${
                settings.autoConfirm ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cyan-500/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
            <Moon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Appearance</h2>
            <p className="text-sm text-slate-400">Customize the look and feel</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'dark', name: 'Dark', icon: Moon },
                { id: 'light', name: 'Light', icon: Globe },
                { id: 'system', name: 'System', icon: Settings }
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSettings({ ...settings, theme: theme.id })}
                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                    settings.theme === theme.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <theme.icon className={`w-6 h-6 ${settings.theme === theme.id ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className={settings.theme === theme.id ? 'text-cyan-400' : 'text-slate-400'}>
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Language</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full md:w-64 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Connected Account</h2>
            <p className="text-sm text-slate-400">Your Telegram account connection</p>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 font-mono text-cyan-400">
          Chat ID: {typeof window !== 'undefined' ? localStorage.getItem('chatId') : '...'}
        </div>
      </div>
    </div>
  );
}
