"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, FileText, AlertTriangle } from "lucide-react";

interface InAppEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  filename: string;
  onSaved?: () => void;
}

export function InAppEditorDialog({
  isOpen,
  onClose,
  nodeId,
  filename,
  onSaved,
}: InAppEditorDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && nodeId) {
      loadContent(nodeId);
    }
  }, [isOpen, nodeId]);

  const loadContent = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nodes/${id}/content`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to load file content");
      }
      setContent(data.text || "");
      setUpdatedAt(data.node?.updatedAt || null);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nodeId) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/nodes/${nodeId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          clientUpdatedAt: updatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save file");
      }

      setUpdatedAt(data.node.updatedAt);
      onSaved?.();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 bg-gray-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-md">{filename}</h3>
              <span className="text-[10px] text-gray-400 font-medium">In-App Text & Markdown Editor</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-950/40 border-b border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Editor */}
        <div className="flex-1 p-4 bg-gray-950 flex flex-col relative overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span>Loading file content...</span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your markdown or text here..."
              className="w-full h-full p-4 bg-gray-900 border border-gray-800 rounded-xl text-gray-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none selection:bg-blue-600/30"
            />
          )}
        </div>
      </div>
    </div>
  );
}
