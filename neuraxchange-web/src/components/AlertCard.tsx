'use client';

import { formatRelativeTime } from '@/lib/utils';
import { Bell, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface Alert {
  id: number;
  fromCoin: string;
  toCoin: string;
  targetRate: number;
  direction: string;
  isActive: boolean;
  triggered: boolean;
  createdAt: Date | string;
}

interface AlertCardProps {
  alert: Alert;
  onDelete?: (id: number) => void;
}

export default function AlertCard({ alert, onDelete }: AlertCardProps) {
  const isUSD = alert.toCoin.toLowerCase() === 'usdt' || alert.toCoin.toLowerCase() === 'usdc';
  
  return (
    <div className={`
      bg-white rounded-lg border p-4 
      ${alert.triggered ? 'border-green-300 bg-green-50' : 'border-gray-200'}
      ${!alert.isActive ? 'opacity-60' : ''}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`
            p-2 rounded-lg
            ${alert.direction === 'above' 
              ? 'bg-green-100 text-green-600' 
              : 'bg-red-100 text-red-600'
            }
          `}>
            {alert.direction === 'above' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {alert.fromCoin.toUpperCase()}/{isUSD ? 'USD' : alert.toCoin.toUpperCase()}
            </p>
            <p className="text-sm text-gray-500">
              {alert.direction === 'above' ? 'Above' : 'Below'}{' '}
              <span className="font-medium text-gray-700">
                {isUSD ? `$${alert.targetRate.toLocaleString()}` : alert.targetRate}
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {alert.triggered && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Triggered ✓
            </span>
          )}
          {!alert.isActive && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              Inactive
            </span>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(alert.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mt-3">
        Created {formatRelativeTime(alert.createdAt)}
      </p>
    </div>
  );
}
