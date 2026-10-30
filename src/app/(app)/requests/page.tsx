"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X, Loader2 } from "lucide-react";

interface RequestItem {
  id: string;
  status: string;
  requestedRole: string;
  message?: string | null;
  createdAt: string;
  requester?: { id: string; email: string; name?: string | null };
  node?: { id: string; name: string };
}

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [incoming, setIncoming] = useState<RequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        setIncoming(data.incoming || []);
        setOutgoing(data.outgoing || []);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (requestId: string, decision: "APPROVED" | "DENIED") => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        await loadRequests();
      }
    } catch (err) {
      console.error("Failed to resolve request:", err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center gap-3.5 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Access Requests</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Review, grant, or decline folder and document permissions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("incoming")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "incoming"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-bold"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Incoming Requests ({incoming.filter((r) => r.status === "PENDING").length})
        </button>
        <button
          onClick={() => setActiveTab("outgoing")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "outgoing"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-bold"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          My Outgoing Requests ({outgoing.length})
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-xs">Loading requests...</span>
        </div>
      ) : activeTab === "incoming" ? (
        <div className="space-y-3">
          {incoming.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
              <p className="text-sm font-semibold text-white">No incoming requests</p>
              <p className="text-xs text-gray-500 mt-1">When teammates request access to your files, they will appear here.</p>
            </div>
          ) : (
            incoming.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-gray-900 border border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs hover:border-gray-700/80 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{req.requester?.email}</span>
                    <span className="text-gray-400">requests</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 font-semibold text-[11px] border border-blue-800/60">
                      {req.requestedRole}
                    </span>
                    <span className="text-gray-400">on</span>
                    <span className="font-semibold text-gray-200 truncate max-w-xs">&ldquo;{req.node?.name}&rdquo;</span>
                  </div>

                  {req.message && (
                    <p className="text-gray-300 text-xs italic bg-gray-800/60 p-2.5 rounded-xl border border-gray-750 my-1">
                      &ldquo;{req.message}&rdquo;
                    </p>
                  )}

                  <span className="text-[10px] text-gray-500 block">
                    Received on {new Date(req.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => handleResolve(req.id, "APPROVED")}
                        disabled={processingId === req.id}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                      >
                        {processingId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleResolve(req.id, "DENIED")}
                        disabled={processingId === req.id}
                        className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white border border-gray-700 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Deny</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        req.status === "APPROVED"
                          ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                          : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                      }`}
                    >
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {outgoing.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
              <p className="text-sm font-semibold text-white">No outgoing requests</p>
              <p className="text-xs text-gray-500 mt-1">You have not submitted any access requests.</p>
            </div>
          ) : (
            outgoing.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-gray-900 border border-gray-800 shadow-sm flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400">Requested</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 font-semibold text-[11px] border border-blue-800/60">
                      {req.requestedRole}
                    </span>
                    <span className="text-gray-400">on</span>
                    <span className="font-semibold text-gray-200 truncate max-w-xs">&ldquo;{req.node?.name}&rdquo;</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block">
                    Requested on {new Date(req.createdAt).toLocaleString()}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    req.status === "APPROVED"
                      ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                      : req.status === "DENIED"
                      ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                      : "bg-gray-800 text-gray-300 border border-gray-700"
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
