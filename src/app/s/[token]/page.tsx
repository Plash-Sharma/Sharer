"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Download,
  Folder,
  File,
  FileText,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";
import { SharerLogo } from "@/components/layout/SharerLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ShareChildItem {
  id: string;
  name: string;
  type: "FILE" | "FOLDER";
  size?: string | null;
}

interface ShareData {
  link: { id: string; role: string; expiresAt: string };
  node: { id: string; name: string; type: "FILE" | "FOLDER" };
  children?: ShareChildItem[];
}

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<{ message: string; statusCode?: number } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const loadLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${token}`);
      const result = await res.json();

      if (!res.ok) {
        setError({
          message: result.error?.message || "Failed to resolve link",
          statusCode: res.status,
        });
        return;
      }

      setData(result);
    } catch (err: unknown) {
      setError({ message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const handleDownload = async (targetFileId?: string) => {
    setDownloading(true);
    try {
      const url = new URL(`/api/share/${token}/download-url`, window.location.origin);
      if (targetFileId) url.searchParams.set("fileId", targetFileId);

      const res = await fetch(url.toString());
      const result = await res.json();

      if (res.ok && result.url) {
        const a = document.createElement("a");
        a.href = result.url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <span className="text-xs">Resolving secure share link...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 max-w-md w-full p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800/60">
            {error.statusCode === 410 ? <Clock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {error.statusCode === 410 ? "Link Expired or Revoked" : "Unavailable Link"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{error.message}</p>
          <a
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Go to Sharer
          </a>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { node, link, children } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center py-12 px-4 sm:px-6 relative transition-colors duration-150">
      {/* Light / Dark Mode Toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* Brand */}
      <div className="flex items-center space-x-3 mb-8">
        <SharerLogo size="md" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Sharer</span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">Drive Suite</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 max-w-2xl w-full rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {node.type === "FOLDER" ? <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate max-w-md">{node.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[10px] text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800/60">
                  {link.role}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" /> Valid until {new Date(link.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {node.type === "FILE" && (
            <button
              onClick={() => handleDownload()}
              disabled={downloading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download</span>
            </button>
          )}
        </div>

        {/* Folder items listing */}
        {node.type === "FOLDER" && (
          <div className="pt-6">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Contents</h3>
            {!children || children.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 py-8 text-center">This shared folder is empty</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-950">
                {children.map((child: ShareChildItem) => (
                  <div key={child.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-gray-100 dark:hover:bg-gray-850/60 transition-colors">
                    <div className="flex items-center gap-2.5 truncate">
                      {child.type === "FOLDER" ? (
                        <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <File className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{child.name}</span>
                    </div>

                    {child.type === "FILE" && (
                      <button
                        onClick={() => handleDownload(child.id)}
                        className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
