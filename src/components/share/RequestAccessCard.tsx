"use client";

import { useState } from "react";
import { Lock, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface RequestAccessCardProps {
  nodeId: string;
  nodeName?: string;
  ownerName?: string;
  onSuccess?: () => void;
}

export function RequestAccessCard({
  nodeId,
  nodeName = "Shared Resource",
  ownerName = "the owner",
  onSuccess,
}: RequestAccessCardProps) {
  const [requestedRole, setRequestedRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/nodes/${nodeId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedRole,
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit request");
      }

      setSubmitted(true);
      onSuccess?.();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-gray-900 border border-gray-800 max-w-md w-full p-8 rounded-2xl shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Request Submitted</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Your access request for <strong className="text-gray-200">{nodeName}</strong> has been sent to {ownerName}.
          You will receive an in-app notification as soon as it is approved.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 max-w-md w-full p-8 rounded-2xl shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Access Required</h2>
          <p className="text-xs text-gray-400">You need permission to access &ldquo;{nodeName}&rdquo;</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Request Role</label>
          <select
            value={requestedRole}
            onChange={(e) => setRequestedRole(e.target.value as "VIEWER" | "EDITOR")}
            className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="VIEWER">Viewer (view and download files)</option>
            <option value="EDITOR">Editor (view, edit, and upload files)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Message to owner (optional)</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi, I'm collaborating on this project and need access..."
            className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>Request Access</span>
        </button>
      </form>
    </div>
  );
}
