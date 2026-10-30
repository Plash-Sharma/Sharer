"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut, Bell, User, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface TopbarProps {
  onSearch?: (query: string) => void;
}

interface NotificationPayload {
  nodeName?: string;
  status?: string;
}

export function Topbar({ onSearch }: TopbarProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name?: string | null; email: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; type: string; payload: NotificationPayload; createdAt: string }>
  >([]);
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleDismissNotification = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md px-6 flex items-center justify-between gap-4 shrink-0 transition-colors">
      {/* Search Bar */}
      <div className="flex-1 max-w-lg relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder="Search files and folders in Sharer..."
          className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        />
      </div>

      {/* User, Theme Toggle & Notification Controls */}
      <div className="flex items-center gap-3">
        {/* Light / Dark Mode Toggle */}
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors relative shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-2 right-2 ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{notifications.length} unread</span>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No new notifications</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="text-gray-800 dark:text-gray-200 font-medium leading-snug">
                            {n.type === "access_request.created" && `Access request on "${n.payload?.nodeName}"`}
                            {n.type === "access_request.resolved" &&
                              `Request for "${n.payload?.nodeName}" was ${n.payload?.status?.toLowerCase()}`}
                          </p>
                          <span className="text-[10px] text-gray-500">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDismissNotification(n.id)}
                          className="text-gray-400 hover:text-emerald-500 p-1"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-2 border-l border-gray-200 dark:border-gray-800">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {currentUser?.name ? currentUser.name[0].toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <span className="block text-xs font-semibold text-gray-900 dark:text-white">{currentUser?.name || "User"}</span>
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">{currentUser?.email}</span>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="w-8 h-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 text-gray-400 flex items-center justify-center transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
