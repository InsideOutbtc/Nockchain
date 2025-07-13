"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Pickaxe, 
  Bridge, 
  TrendingUp, 
  Settings, 
  User, 
  LogOut,
  Menu,
  X,
  Zap,
  Shield,
  BarChart3,
  Bell,
  Search,
  ChevronDown,
  Activity,
  Cpu,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'Mining', href: '/mining', icon: Pickaxe, badge: { count: 8, color: 'success' } },
    { name: 'Bridge', href: '/bridge', icon: Bridge, badge: null },
    { name: 'Trading', href: '/trading', icon: TrendingUp, badge: { count: 2, color: 'warning' } },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Auto-close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setSearchOpen(true);
            break;
          case 'b':
            e.preventDefault();
            setSidebarOpen(!sidebarOpen);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative flex w-full max-w-xs flex-1 flex-col"
            >
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <SidebarContent navigation={navigation} pathname={pathname} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <SidebarContent navigation={navigation} pathname={pathname} />
      </div>

      {/* Main content */}
      <div className="lg:pl-80 flex flex-col flex-1">
        {/* Top navigation */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-nav sticky top-0 z-30 flex h-20 flex-shrink-0 items-center gap-x-4 px-4 shadow-lg sm:gap-x-6 sm:px-6 lg:px-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Separator */}
          <div className="h-6 w-px bg-white/20 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            {/* Page title and breadcrumb */}
            <div className="relative flex flex-1 items-center">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {navigation.find(nav => nav.href === pathname)?.name || 'NOCKCHAIN'}
                </h1>
                {pathname !== '/dashboard' && (
                  <Badge variant="outline" size="sm">
                    {navigation.find(nav => nav.href === pathname)?.name || 'Page'}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Search */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchOpen(true)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>

              {/* Status indicators */}
              <div className="hidden md:flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge variant="success" size="sm">
                    <Zap className="h-3 w-3 mr-1" />
                    15.7% Boost
                  </Badge>
                </motion.div>
                <Badge variant="info" size="sm">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure
                </Badge>
                <Badge variant="outline" size="sm">
                  <Activity className="h-3 w-3 mr-1" />
                  22ms
                </Badge>
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <span className="text-xs font-bold text-white">
                        {notifications > 9 ? '9+' : notifications}
                      </span>
                    </motion.div>
                  )}
                </Button>
              </div>

              {/* Profile dropdown */}
              <div className="flex items-center gap-x-4">
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                  <p className="text-sm font-semibold text-white">
                    {user?.profile?.name || user?.email || user?.walletAddress?.slice(0, 8) + '...'}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-white/70 capitalize">{user?.role}</p>
                    {user?.isVerified && (
                      <Badge variant="success" size="sm">
                        <Shield className="h-2 w-2 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-2 w-48 glass-dropdown opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <Link
                        href="/settings"
                        className="glass-dropdown-item flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <Link
                        href="/profile"
                        className="glass-dropdown-item flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <div className="h-px bg-white/10 my-1" />
                      <button
                        onClick={handleLogout}
                        className="glass-dropdown-item flex items-center gap-2 text-red-400 hover:text-red-300 w-full text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Page content */}
        <main className="flex-1">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="py-8"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </motion.div>
        </main>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
          >
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -20 }}
              className="relative w-full max-w-2xl glass-modal p-6"
            >
              <div className="flex items-center gap-4">
                <Search className="h-5 w-5 text-white/70" />
                <Input
                  placeholder="Search dashboard, mining data, transactions..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-lg"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchOpen(false)}
                  className="text-white/70 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-4 text-sm text-white/60">
                Press <kbd className="px-2 py-1 bg-white/10 rounded">⌘K</kbd> to search anytime
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced Sidebar Content Component
function SidebarContent({ 
  navigation, 
  pathname 
}: { 
  navigation: any[], 
  pathname: string 
}) {
  const [stats, setStats] = useState({
    hashrate: 156.7,
    efficiency: 15.7,
    workers: 8,
    earnings: 0.0847,
    zkSpeed: 8.5,
    apiResponse: 22,
    uptime: 99.9,
    aiOptimization: 100
  });

  // Simulate real-time stats updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        hashrate: prev.hashrate + (Math.random() - 0.5) * 2,
        earnings: prev.earnings + Math.random() * 0.001,
        apiResponse: Math.max(18, Math.min(28, prev.apiResponse + (Math.random() - 0.5) * 2))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-sidebar flex min-h-0 flex-1 flex-col">
      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-shrink-0 items-center px-6 py-6"
      >
        <div className="flex items-center">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 180 }}
            transition={{ duration: 0.3 }}
            className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg"
          >
            <Zap className="h-6 w-6 text-white" />
          </motion.div>
          <div className="ml-4">
            <span className="text-2xl font-bold gradient-text">NOCKCHAIN</span>
            <p className="text-xs text-white/60 mt-1">Revolutionary Mining</p>
          </div>
        </div>
      </motion.div>

      {/* Live Stats Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-6 mb-6 p-4 glass-card-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-white">NOCK Engine</span>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Badge variant="success" size="sm" pulse>
              <Activity className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white/70">Hashrate</span>
              <span className="font-bold text-[#ff8c42]">
                {stats.hashrate.toFixed(1)}MH/s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Efficiency</span>
              <span className="font-bold text-[#ff8c42]">
                +{stats.efficiency}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Workers</span>
              <span className="font-bold text-[#ff8c42]">
                {stats.workers}/8
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Earnings</span>
              <span className="font-bold text-[#ff8c42]">
                {stats.earnings.toFixed(4)}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white/70">ZK Speed</span>
              <span className="font-bold text-cyan-400">
                {stats.zkSpeed}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">API</span>
              <span className="font-bold text-green-400">
                {stats.apiResponse.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Uptime</span>
              <span className="font-bold text-green-400">
                {stats.uptime}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">AI Boost</span>
              <span className="font-bold text-blue-400">
                {stats.aiOptimization}%
              </span>
            </div>
          </div>
        </div>

        {/* Performance Bar */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between text-xs text-white/70 mb-2">
            <span>Performance</span>
            <span>98.5%</span>
          </div>
          <div className="glass-progress">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '98.5%' }}
              transition={{ duration: 2, delay: 0.5 }}
              className="glass-progress-fill"
            />
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 pb-4">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link
                href={item.href}
                className={`glass-interactive group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'glass-button-primary text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center">
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                    }`}
                  />
                  {item.name}
                </div>
                
                {item.badge && (
                  <Badge 
                    variant={item.badge.color as any} 
                    size="sm"
                    className="ml-2"
                  >
                    {item.badge.count}
                  </Badge>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom Performance Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex-shrink-0 border-t border-white/10 p-6"
      >
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <Cpu className="h-3 w-3 mr-1" />
              Optimize
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              Withdraw
            </Button>
          </div>
          
          {/* System Status */}
          <div className="text-xs text-white/60 space-y-2">
            <div className="flex justify-between items-center">
              <span>System Status</span>
              <Badge variant="success" size="sm">
                Optimal
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">99.9%</div>
                <div className="text-white/50">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">21/21</div>
                <div className="text-white/50">Agents</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}