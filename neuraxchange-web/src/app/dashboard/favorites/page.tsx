'use client';

import { useState, useEffect } from 'react';
import { Star, Plus, Trash2, X, ArrowRightLeft, Zap, TrendingUp, Sparkles } from 'lucide-react';

interface FavoritePair {
  id: string;
  fromToken: string;
  toToken: string;
  nickname: string | null;
  usageCount: number;
  createdAt: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoritePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFavorite, setNewFavorite] = useState({
    fromToken: 'BTC',
    toToken: 'ETH',
    nickname: ''
  });

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const chatId = localStorage.getItem('chatId');
      const res = await fetch(`/api/favorites?chatId=${chatId}`);
      const data = await res.json();
      if (data.favorites) {
        setFavorites(data.favorites);
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavorite = async () => {
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          ...newFavorite
        })
      });
      setShowAddModal(false);
      setNewFavorite({ fromToken: 'BTC', toToken: 'ETH', nickname: '' });
      fetchFavorites();
    } catch (error) {
      console.error('Failed to add favorite:', error);
    }
  };

  const handleDeleteFavorite = async (favoriteId: string) => {
    try {
      const chatId = localStorage.getItem('chatId');
      await fetch(`/api/favorites?chatId=${chatId}&favoriteId=${favoriteId}`, {
        method: 'DELETE'
      });
      fetchFavorites();
    } catch (error) {
      console.error('Failed to delete favorite:', error);
    }
  };

  const totalSwaps = favorites.reduce((sum, f) => sum + f.usageCount, 0);
  const mostUsed = favorites.reduce((max, f) => f.usageCount > max.usageCount ? f : max, favorites[0]);

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
          <h1 className="text-3xl font-bold text-gradient mb-2">Favorite Pairs</h1>
          <p className="text-slate-400">Quick access to your most-used trading pairs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Pair
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-xl p-6 gradient-border card-hover">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Favorite Pairs</p>
              <p className="text-2xl font-bold text-white">{favorites.length}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Swaps</p>
              <p className="text-2xl font-bold text-white">{totalSwaps}</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6 gradient-border card-hover" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Most Used</p>
              <p className="text-2xl font-bold text-white">
                {mostUsed ? `${mostUsed.fromToken}/${mostUsed.toToken}` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Favorites Grid */}
      {favorites.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
            <Star className="w-10 h-10 text-yellow-500/50" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No favorites yet</h3>
          <p className="text-slate-400 mb-6">Add your frequently used trading pairs for quick access</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-secondary"
          >
            Add Your First Favorite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((favorite, index) => (
            <div
              key={favorite.id}
              className="glass rounded-xl p-6 gradient-border card-hover group animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">
                      {favorite.fromToken}/{favorite.toToken}
                    </p>
                    {favorite.nickname && (
                      <p className="text-sm text-slate-400">{favorite.nickname}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFavorite(favorite.id)}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-slate-400 text-sm">{favorite.usageCount} swaps</span>
                </div>
                <button className="text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <ArrowRightLeft className="w-4 h-4" />
                  Quick Swap
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up">
          <div className="glass rounded-2xl p-8 w-full max-w-md gradient-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gradient">Add Favorite Pair</h2>
              <button
                onClick={() => setShowAddModal(false)}
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
                    value={newFavorite.fromToken}
                    onChange={(e) => setNewFavorite({ ...newFavorite, fromToken: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="XAI">XAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Token</label>
                  <select
                    value={newFavorite.toToken}
                    onChange={(e) => setNewFavorite({ ...newFavorite, toToken: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="ETH">ETH</option>
                    <option value="BTC">BTC</option>
                    <option value="SOL">SOL</option>
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="XAI">XAI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nickname <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newFavorite.nickname}
                  onChange={(e) => setNewFavorite({ ...newFavorite, nickname: e.target.value })}
                  placeholder="e.g., My Trading Pair"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <button
                onClick={handleAddFavorite}
                className="w-full btn-primary"
              >
                Add to Favorites
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
