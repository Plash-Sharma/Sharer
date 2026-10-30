"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardDrive,
  Users,
  Bell,
  Trash2,
  Plus,
  FolderPlus,
  UploadCloud,
  FileCode,
  CheckCircle,
  Sun,
  Moon,
} from "lucide-react";
import { SharerLogo } from "@/components/layout/SharerLogo";
import { useTheme } from "@/contexts/ThemeContext";

interface SidebarProps {
  onNewFolder?: () => void;
  onNewFile?: () => void;
  onUploadClick?: () => void;
}

export function Sidebar({ onNewFolder, onNewFile, onUploadClick }: SidebarProps) {
  const pathname = usePathname();
  const { isDarkMode, mounted, toggleDarkMode } = useTheme();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.notifications?.length || 0);
        }
      } catch {
        // Silently ignore polling failure
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: "My Drive", href: "/drive", icon: HardDrive },
    { label: "Shared with me", href: "/shared-with-me", icon: Users },
    { label: "Access Requests", href: "/requests", icon: Bell, badge: unreadCount },
    { label: "Trash", href: "/trash", icon: Trash2 },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 flex flex-col h-screen shrink-0 select-none transition-colors">
      {/* Brand Header */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <SharerLogo size="md" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Sharer</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">Drive Suite</span>
          </div>
        </Link>
      </div>

      {/* Action / New Button */}
      <div className="p-4 relative">
        <button
          onClick={() => setShowNewMenu(!showNewMenu)}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New item</span>
        </button>

        {showNewMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowNewMenu(false)} />
            <div className="absolute left-4 right-4 top-16 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewFolder?.();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>New folder</span>
              </button>

              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onUploadClick?.();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Upload files</span>
              </button>

              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewFile?.();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors"
              >
                <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>New Markdown / Text file</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/80 shadow-sm font-semibold"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle Button in Sidebar */}
      <div className="px-3 py-1">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-xl bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-750 transition-all border border-gray-200 dark:border-gray-700/60 shadow-sm"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="flex items-center gap-2.5">
            {!mounted ? (
              <span className="w-4 h-4 inline-block" />
            ) : isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600" />
            )}
            <span>{!mounted ? "Toggle Theme" : isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">{!mounted ? "" : isDarkMode ? "Dark" : "Light"}</span>
        </button>
      </div>

      {/* Storage Indicator */}
      <div className="p-4 m-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Storage Engine</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> MinIO S3
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <div className="h-full bg-blue-600 w-1/4 rounded-full" />
        </div>
        <p className="text-[11px] text-gray-500 mt-2">Flat UUID immutable objects</p>
      </div>
    </aside>
  );
}
