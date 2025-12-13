import Link from 'next/link';
import { 
  Home, 
  History, 
  Bell, 
  Star, 
  TrendingUp, 
  RefreshCw, 
  Gift, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/history', label: 'Swap History', icon: History },
  { href: '/dashboard/alerts', label: 'Price Alerts', icon: Bell },
  { href: '/dashboard/favorites', label: 'Favorites', icon: Star },
  { href: '/dashboard/dca', label: 'DCA Orders', icon: RefreshCw },
  { href: '/dashboard/limits', label: 'Limit Orders', icon: TrendingUp },
  { href: '/dashboard/referral', label: 'Referral', icon: Gift },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose, currentPath }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="text-2xl">🔄</span>
            <span className="text-xl font-bold">NeuraXchange</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-700 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg
                  transition-colors duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <Link 
            href="/"
            className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
