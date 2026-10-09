import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { onSyncResult } from './store';
import {
  LayoutDashboard,
  Sliders,
  MessageSquare,
  Sticker,
  Settings,
  Eye,
  LogOut,
  Inbox,
} from 'lucide-react';

const navLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/slides', label: 'Slides', icon: Sliders },
  { to: '/admin/stickers', label: 'Stickers', icon: Sticker },
  { to: '/admin/hot-takes', label: 'Hot Takes', icon: MessageSquare },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/inbox', label: 'Inbox', icon: Inbox },
];

export default function AdminLayout({ onLogout }: { onLogout?: () => void }) {
  // Every editor saves locally then syncs to the cloud; surface the outcome here once.
  useEffect(
    () =>
      onSyncResult(({ ok, error }) => {
        if (!ok) toast.error('Cloud save failed: ' + (error || 'unknown error'), { id: 'sync-err' });
      }),
    [],
  );
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-white font-mono">
      <Toaster theme="dark" position="bottom-right" />
      <aside className="md:fixed md:top-0 md:left-0 md:h-screen w-full md:w-64 bg-black border-b md:border-b-0 md:border-r border-white/10 flex md:flex-col z-50">
        <div className="p-4 md:p-6 border-b md:border-b border-white/10 flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold tracking-tight">NJ's Home</h1>
          <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest bg-white/10 text-white/60 rounded">
            Admin
          </span>
        </div>

        <nav className="flex md:flex-col flex-1 p-2 md:p-4 gap-1 overflow-x-auto md:overflow-y-auto">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-xs md:text-sm transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block p-4 border-t border-white/10 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-200"
          >
            <Eye size={18} />
            View Site
          </a>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors duration-200 w-full cursor-pointer"
            >
              <LogOut size={18} />
              Logout
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 md:ml-64">
        <Outlet />
      </main>
    </div>
  );
}
