"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Share2,
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Loader2,
  Clock,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string | null;
  nodeName: string;
}

interface Grant {
  id: string;
  userId: string;
  email: string;
  name?: string | null;
  role: "VIEWER" | "EDITOR";
}

interface ShareLinkItem {
  id: string;
  role: "VIEWER" | "EDITOR";
  expiresAt: string;
  revokedAt?: string | null;
  useCount: number;
}

export function ShareDialog({ isOpen, onClose, nodeId, nodeName }: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<"users" | "links">("users");

  // User sharing state
  const [grants, setGrants] = useState<Grant[]>([]);
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [granting, setGranting] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; name?: string | null }>>([]);

  // Link state
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [linkRole, setLinkRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [linkTtl, setLinkTtl] = useState<number>(86400); // 1 day
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadGrants = useCallback(async () => {
    if (!nodeId) return;
    setLoadingGrants(true);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/permissions`);
      const data = await res.json();
      if (res.ok) setGrants(data.grants || []);
    } catch {
    } finally {
      setLoadingGrants(false);
    }
  }, [nodeId]);

  const loadLinks = useCallback(async () => {
    if (!nodeId) return;
    try {
      const res = await fetch(`/api/nodes/${nodeId}/links`);
      const data = await res.json();
      if (res.ok) setLinks(data.links || []);
    } catch {}
  }, [nodeId]);

  useEffect(() => {
    if (isOpen && nodeId) {
      loadGrants();
      loadLinks();
    }
  }, [isOpen, nodeId, loadGrants, loadLinks]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId || !targetEmail.trim()) return;

    setGranting(true);
    setError(null);

    try {
      const res = await fetch(`/api/nodes/${nodeId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: targetEmail.trim(), role: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to grant permission");
      }

      setTargetEmail("");
      setSearchResults([]);
      await loadGrants();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeGrant = async (userId: string) => {
    if (!nodeId) return;
    try {
      const res = await fetch(`/api/nodes/${nodeId}/permissions?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setGrants((prev) => prev.filter((g) => g.userId !== userId));
      }
    } catch {}
  };

  const handleGenerateLink = async () => {
    if (!nodeId) return;
    setGeneratingLink(true);
    setError(null);

    try {
      const res = await fetch(`/api/nodes/${nodeId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: linkRole, ttlSeconds: linkTtl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to generate link");
      }

      const fullUrl = `${window.location.origin}${data.link.url}`;
      setGeneratedUrl(fullUrl);
      await loadLinks();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!nodeId) return;
    try {
      const res = await fetch(`/api/nodes/${nodeId}/links/${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadLinks();
      }
    } catch {}
  };

  const copyToClipboard = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !nodeId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Share &ldquo;{nodeName}&rdquo;</h3>
              <p className="text-[11px] text-gray-400">Manage collaborative grants & time-bound access links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-800 mb-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Direct Access
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`pb-2.5 px-3.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "links"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Time-bound Links
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Tab 1: Direct Sharing with Users */}
        {activeTab === "users" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <form onSubmit={handleGrant} className="space-y-3 relative">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Add people</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      placeholder="Enter user email..."
                      className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />

                    {/* Autocomplete dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-11 z-20 bg-gray-950 border border-gray-800 rounded-xl shadow-xl p-1 max-h-40 overflow-y-auto">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setTargetEmail(user.email);
                              setSearchResults([]);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-gray-850 text-gray-200 flex items-center justify-between"
                          >
                            <span>{user.email}</span>
                            {user.name && <span className="text-[10px] text-gray-400">{user.name}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as "VIEWER" | "EDITOR")}
                    className="px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>

                  <button
                    type="submit"
                    disabled={granting || !targetEmail.trim()}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  >
                    {granting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Invite</span>
                  </button>
                </div>
              </div>
            </form>

            <div className="pt-2">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">People with access</h4>
              {loadingGrants ? (
                <div className="p-4 text-center text-xs text-gray-500">Loading permissions...</div>
              ) : grants.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">Only you currently have access</p>
              ) : (
                <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden bg-gray-950">
                  {grants.map((grant) => (
                    <div key={grant.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white block">{grant.email}</span>
                        {grant.name && <span className="text-[10px] text-gray-400">{grant.name}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-[10px] text-blue-300 font-semibold border border-blue-800/60">
                          {grant.role}
                        </span>
                        <button
                          onClick={() => handleRevokeGrant(grant.userId)}
                          className="text-gray-400 hover:text-rose-400 p-1 rounded-md"
                          title="Remove access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Time-bound Links */}
        {activeTab === "links" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Create time-bound share link</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">Permission Role</label>
                  <select
                    value={linkRole}
                    onChange={(e) => setLinkRole(e.target.value as "VIEWER" | "EDITOR")}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white"
                  >
                    <option value="VIEWER">Can View & Download</option>
                    <option value="EDITOR">Can Edit / Upload</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">Expiration Period</label>
                  <select
                    value={linkTtl}
                    onChange={(e) => setLinkTtl(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white"
                  >
                    <option value={3600}>1 Hour</option>
                    <option value={86400}>1 Day (24 Hours)</option>
                    <option value={604800}>7 Days</option>
                    <option value={2592000}>30 Days</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {generatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                <span>Generate link</span>
              </button>

              {generatedUrl && (
                <div className="p-2.5 rounded-xl bg-gray-900 border border-blue-800/60 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedUrl}
                    className="bg-transparent text-xs text-blue-300 font-mono flex-1 outline-none truncate"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Active links</h4>
              {links.length === 0 ? (
                <p className="text-xs text-gray-500 py-2 text-center">No links generated yet</p>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => {
                    const isRevoked = link.revokedAt != null;
                    const isExpired = new Date(link.expiresAt).getTime() <= Date.now();
                    const statusText = isRevoked ? "Revoked" : isExpired ? "Expired" : "Active";

                    return (
                      <div
                        key={link.id}
                        className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{link.role}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                statusText === "Active"
                                  ? "bg-blue-950/60 text-blue-300 border border-blue-800/60"
                                  : "bg-gray-800 text-gray-400"
                              }`}
                            >
                              {statusText}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" /> Expires: {new Date(link.expiresAt).toLocaleDateString()} (
                            {link.useCount} accesses)
                          </span>
                        </div>

                        {!isRevoked && !isExpired && (
                          <button
                            onClick={() => handleRevokeLink(link.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/60 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
