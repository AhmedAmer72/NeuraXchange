'use client';

import { formatRelativeTime, formatDate } from '@/lib/utils';
import { RefreshCw, Pause, Play, Trash2 } from 'lucide-react';

interface DCAOrder {
  id: number;
  fromCoin: string;
  toCoin: string;
  amount: string;
  frequency: string;
  isActive: boolean;
  totalExecutions: number;
  maxExecutions: number | null;
  lastExecutedAt: Date | string | null;
  nextExecutionAt: Date | string;
  createdAt: Date | string;
}

interface DCACardProps {
  order: DCAOrder;
  onToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const frequencyLabels: Record<string, string> = {
  hourly: 'Every Hour',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export default function DCACard({ order, onToggle, onDelete }: DCACardProps) {
  return (
    <div className={`
      bg-white rounded-lg border p-4
      ${!order.isActive ? 'border-gray-200 opacity-60' : 'border-blue-200'}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`
            p-2 rounded-lg
            ${order.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
          `}>
            <RefreshCw size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {order.fromCoin.toUpperCase()} → {order.toCoin.toUpperCase()}
            </p>
            <p className="text-sm text-gray-500">
              {order.amount} {order.fromCoin.toUpperCase()} • {frequencyLabels[order.frequency]}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`
            text-xs px-2 py-1 rounded-full
            ${order.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
          `}>
            {order.isActive ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Executions</p>
          <p className="font-medium text-gray-900">
            {order.totalExecutions}
            {order.maxExecutions && ` / ${order.maxExecutions}`}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Next Run</p>
          <p className="font-medium text-gray-900">
            {order.isActive ? formatRelativeTime(order.nextExecutionAt) : '—'}
          </p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <p className="text-xs text-gray-400">
          Created {formatRelativeTime(order.createdAt)}
        </p>
        <div className="flex items-center space-x-2">
          {onToggle && (
            <button 
              onClick={() => onToggle(order.id)}
              className={`
                p-1.5 rounded transition-colors
                ${order.isActive 
                  ? 'text-yellow-600 hover:bg-yellow-100' 
                  : 'text-green-600 hover:bg-green-100'
                }
              `}
              title={order.isActive ? 'Pause' : 'Resume'}
            >
              {order.isActive ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(order.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
