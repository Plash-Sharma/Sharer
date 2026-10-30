"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs, BreadcrumbItem } from "@/components/explorer/Breadcrumbs";
import { FileTable, NodeItem } from "@/components/explorer/FileTable";
import { RenameDialog } from "@/components/explorer/RenameDialog";
import { MoveDialog } from "@/components/explorer/MoveDialog";
import { ShareDialog } from "@/components/share/ShareDialog";
import { InAppEditorDialog } from "@/components/explorer/InAppEditorDialog";
import { RequestAccessCard } from "@/components/share/RequestAccessCard";
import { ArrowUpDown, Loader2, Folder } from "lucide-react";

export default function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = use(params);
  const router = useRouter();

  const [currentFolder, setCurrentFolder] = useState<NodeItem | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [items, setItems] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [sort, setSort] = useState<"name_asc" | "name_desc" | "updated_desc" | "size_desc">("name_asc");

  // Modals
  const [activeShareItem, setActiveShareItem] = useState<NodeItem | null>(null);
  const [activeRenameItem, setActiveRenameItem] = useState<NodeItem | null>(null);
  const [activeMoveItem, setActiveMoveItem] = useState<NodeItem | null>(null);
  const [activeEditorItem, setActiveEditorItem] = useState<NodeItem | null>(null);

  const fetchFolderData = useCallback(async () => {
    setLoading(true);
    setForbidden(false);

    try {
      // 1. Fetch current folder metadata & breadcrumbs
      const metaRes = await fetch(`/api/nodes/${folderId}`);
      if (metaRes.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (!metaRes.ok) throw new Error("Folder not found");
      const metaData = await metaRes.json();
      setCurrentFolder(metaData.node);
      setBreadcrumbs(metaData.breadcrumbs || []);

      // 2. Fetch children items
      const url = new URL("/api/nodes", window.location.origin);
      url.searchParams.set("parentId", folderId);
      url.searchParams.set("sort", sort);

      const itemsRes = await fetch(url.toString());
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      }
    } catch (err) {
      console.error("Failed to load folder data:", err);
    } finally {
      setLoading(false);
    }
  }, [folderId, sort]);

  useEffect(() => {
    fetchFolderData();

    const handleRefresh = () => fetchFolderData();
    window.addEventListener("refresh-nodes", handleRefresh);

    return () => {
      window.removeEventListener("refresh-nodes", handleRefresh);
    };
  }, [fetchFolderData]);

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

  const handleDelete = async (item: NodeItem) => {
    if (!confirm(`Move "${item.name}" to trash?`)) return;
    try {
      const res = await fetch(`/api/nodes/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchFolderData();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (forbidden) {
    return (
      <div className="flex items-center justify-center py-20">
        <RequestAccessCard
          nodeId={folderId}
          nodeName="Restricted Folder"
          onSuccess={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate max-w-md">
              {currentFolder?.name || "Folder"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage folder contents, nested items, and collaborative share links.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Sort:
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "name_asc" | "name_desc" | "updated_desc" | "size_desc")}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="updated_desc">Recently modified</option>
            <option value="size_desc">File size</option>
          </select>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="px-1">
        <Breadcrumbs items={breadcrumbs} currentTitle={currentFolder?.name} />
      </div>

      {/* Explorer Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs">Loading items...</span>
        </div>
      ) : (
        <FileTable
          items={items}
          onOpenFolder={(id) => router.push(`/drive/folders/${id}`)}
          onDownload={handleDownload}
          onEditContent={(item) => setActiveEditorItem(item)}
          onShare={(item) => setActiveShareItem(item)}
          onRename={(item) => setActiveRenameItem(item)}
          onMove={(item) => setActiveMoveItem(item)}
          onDelete={handleDelete}
        />
      )}

      {/* Modals */}
      <ShareDialog
        isOpen={activeShareItem !== null}
        onClose={() => setActiveShareItem(null)}
        nodeId={activeShareItem?.id || null}
        nodeName={activeShareItem?.name || ""}
      />

      <RenameDialog
        isOpen={activeRenameItem !== null}
        onClose={() => setActiveRenameItem(null)}
        nodeId={activeRenameItem?.id || null}
        currentName={activeRenameItem?.name || ""}
        onSuccess={fetchFolderData}
      />

      <MoveDialog
        isOpen={activeMoveItem !== null}
        onClose={() => setActiveMoveItem(null)}
        nodeId={activeMoveItem?.id || null}
        nodeName={activeMoveItem?.name || ""}
        onSuccess={fetchFolderData}
      />

      <InAppEditorDialog
        isOpen={activeEditorItem !== null}
        onClose={() => setActiveEditorItem(null)}
        nodeId={activeEditorItem?.id || null}
        filename={activeEditorItem?.name || ""}
        onSaved={fetchFolderData}
      />
    </div>
  );
}
