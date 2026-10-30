"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileTable, NodeItem } from "@/components/explorer/FileTable";
import { InAppEditorDialog } from "@/components/explorer/InAppEditorDialog";
import { Users, Loader2 } from "lucide-react";

export default function SharedWithMePage() {
  const router = useRouter();
  const [items, setItems] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEditorItem, setActiveEditorItem] = useState<NodeItem | null>(null);

  useEffect(() => {
    loadSharedItems();
  }, []);

  const loadSharedItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shared-with-me");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load shared items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item: NodeItem) => {
    try {
      const res = await fetch(`/api/nodes/${item.id}/download-url`);
      const data = await res.json();
      if (res.ok && data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = data.filename || item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-3.5 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Shared with me</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Files and folders other teammates and collaborators have granted you direct access to.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs">Loading shared items...</span>
        </div>
      ) : (
        <FileTable
          items={items}
          onOpenFolder={(id) => router.push(`/drive/folders/${id}`)}
          onDownload={handleDownload}
          onEditContent={(item) => setActiveEditorItem(item)}
        />
      )}

      <InAppEditorDialog
        isOpen={activeEditorItem !== null}
        onClose={() => setActiveEditorItem(null)}
        nodeId={activeEditorItem?.id || null}
        filename={activeEditorItem?.name || ""}
        onSaved={loadSharedItems}
      />
    </div>
  );
}
