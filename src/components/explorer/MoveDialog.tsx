"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderInput, X, Loader2, Folder, HardDrive } from "lucide-react";

interface MoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodeName: string;
  onSuccess: () => void;
}

interface FolderOption {
  id: string;
  name: string;
  path: string;
  type: string;
}

export function MoveDialog({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  onSuccess,
}: MoveDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nodes?limit=100");
      const data = await res.json();
      if (res.ok) {
        const folderOnly = (data.items || []).filter(
          (item: FolderOption) => item.type === "FOLDER" && item.id !== nodeId
        );
        setFolders(folderOnly);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen, loadFolders]);

  if (!isOpen || !nodeId) return null;

  const handleMove = async () => {
    setMoving(true);
    setError(null);

    try {
      const res = await fetch(`/api/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newParentId: selectedParentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to move item");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Move &ldquo;{nodeName}&rdquo;</h3>
              <p className="text-[11px] text-gray-400">Select a destination folder in Sharer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-1.5 my-2 border border-gray-800 rounded-xl p-2 bg-gray-950">
          <button
            type="button"
            onClick={() => setSelectedParentId(null)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              selectedParentId === null
                ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                : "text-gray-300 hover:bg-gray-850 hover:text-white"
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>My Drive (Root)</span>
          </button>

          {loading ? (
            <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Loading folders...</span>
            </div>
          ) : (
            folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedParentId(f.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                  selectedParentId === f.id
                    ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                    : "text-gray-300 hover:bg-gray-850 hover:text-white"
                }`}
              >
                <Folder className="w-4 h-4 text-blue-400" />
                <span className="truncate">{f.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={moving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-800 hover:bg-gray-750 border border-gray-750 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={moving}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {moving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Move here</span>
          </button>
        </div>
      </div>
    </div>
  );
}
