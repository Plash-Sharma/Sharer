"use client";

import { useState, useEffect } from "react";
import { FileTable, NodeItem } from "@/components/explorer/FileTable";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export default function TrashPage() {
  const [items, setItems] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load trash:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: NodeItem) => {
    try {
      const res = await fetch(`/api/nodes/${item.id}/restore`, { method: "POST" });
      if (res.ok) {
        loadTrash();
      }
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handlePurge = async (item: NodeItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/nodes/${item.id}/purge`, { method: "POST" });
      if (res.ok) {
        loadTrash();
      }
    } catch (err) {
      console.error("Purge failed:", err);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Trash</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Soft-deleted items pending restoration or permanent purge.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-3.5 py-2 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>Purging permanently deletes data from MinIO S3 storage</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs">Loading trash...</span>
        </div>
      ) : (
        <FileTable
          items={items}
          isTrashView={true}
          onRestore={handleRestore}
          onPurge={handlePurge}
        />
      )}
    </div>
  );
}
