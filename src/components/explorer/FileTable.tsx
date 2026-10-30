"use client";

import { useState } from "react";
import {
  Folder,
  FileText,
  FileCode,
  Image as ImageIcon,
  FileArchive,
  File,
  Download,
  Share2,
  Edit2,
  Trash2,
  MoreVertical,
  FolderInput,
  ExternalLink,
} from "lucide-react";

export interface NodeItem {
  id: string;
  name: string;
  type: "FILE" | "FOLDER";
  size?: string | null;
  mimeType?: string | null;
  updatedAt: string;
  deletedAt?: string | null;
  permissionRole?: string;
  ownerEmail?: string;
}

interface FileTableProps {
  items: NodeItem[];
  onOpenFolder?: (id: string) => void;
  onDownload?: (item: NodeItem) => void;
  onEditContent?: (item: NodeItem) => void;
  onShare?: (item: NodeItem) => void;
  onRename?: (item: NodeItem) => void;
  onMove?: (item: NodeItem) => void;
  onDelete?: (item: NodeItem) => void;
  onRestore?: (item: NodeItem) => void;
  onPurge?: (item: NodeItem) => void;
  isTrashView?: boolean;
}

export function FileTable({
  items,
  onOpenFolder,
  onDownload,
  onEditContent,
  onShare,
  onRename,
  onMove,
  onDelete,
  onRestore,
  onPurge,
  isTrashView = false,
}: FileTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const getFileIcon = (item: NodeItem) => {
    if (item.type === "FOLDER") {
      return <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-blue-500/20" />;
    }

    const lower = item.name.toLowerCase();
    if (lower.endsWith(".md") || lower.endsWith(".txt")) {
      return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-blue-500/10" />;
    }
    if (lower.endsWith(".js") || lower.endsWith(".ts") || lower.endsWith(".json")) {
      return <FileCode className="w-5 h-5 text-cyan-600 dark:text-cyan-400 fill-cyan-500/10" />;
    }
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
      return <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-500/10" />;
    }
    if (lower.endsWith(".zip") || lower.endsWith(".tar") || lower.endsWith(".gz")) {
      return <FileArchive className="w-5 h-5 text-gray-500 dark:text-gray-300 fill-gray-500/10" />;
    }

    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytesStr?: string | null) => {
    if (!bytesStr) return "-";
    const bytes = Number(bytesStr);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isEditableInApp = (item: NodeItem) => {
    if (item.type !== "FILE") return false;
    const lower = item.name.toLowerCase();
    return lower.endsWith(".md") || lower.endsWith(".txt") || lower.endsWith(".json");
  };

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-500 dark:text-gray-400 space-y-3 shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Folder className="w-6 h-6 stroke-[1.75]" />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">This folder is empty</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Drop files directly anywhere on this window or click &ldquo;New item&rdquo; to create folders and markdown docs.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 w-12 text-center">Type</th>
              <th className="py-3.5 px-4">Name</th>
              <th className="py-3.5 px-4 w-32 hidden sm:table-cell">Size</th>
              <th className="py-3.5 px-4 w-40 hidden md:table-cell">Last modified</th>
              <th className="py-3.5 px-4 w-14 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50/80 dark:hover:bg-gray-850/60 group transition-colors relative"
              >
                {/* Icon */}
                <td className="py-3 px-4 shrink-0 text-center">
                  <div className="flex items-center justify-center">{getFileIcon(item)}</div>
                </td>

                {/* Name */}
                <td className="py-3 px-4 font-medium">
                  {item.type === "FOLDER" ? (
                    <button
                      onClick={() => onOpenFolder?.(item.id)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 text-gray-900 dark:text-white font-semibold transition-colors flex items-center gap-2 text-left"
                    >
                      <span>{item.name}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-gray-100">{item.name}</span>
                      {isEditableInApp(item) && (
                        <button
                          onClick={() => onEditContent?.(item)}
                          className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-900/80 font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                </td>

                {/* Size */}
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell font-mono">
                  {formatFileSize(item.size)}
                </td>

                {/* Modified Date */}
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                  {new Date(item.updatedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>

                {/* Action Menu */}
                <td className="py-3 px-4 text-right relative">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                      aria-label="Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {activeMenuId === item.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)} />
                      <div className="absolute right-4 top-10 z-40 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-1.5 animate-in fade-in duration-100">
                        {isTrashView ? (
                          <>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onRestore?.(item);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2"
                            >
                              <span>Restore item</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onPurge?.(item);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2"
                            >
                              <span>Delete permanently</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {item.type === "FOLDER" && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onOpenFolder?.(item.id);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Open folder</span>
                              </button>
                            )}

                            {item.type === "FILE" && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDownload?.(item);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Download</span>
                              </button>
                            )}

                            {isEditableInApp(item) && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditContent?.(item);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Edit content</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onShare?.(item);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                            >
                              <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Share</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onRename?.(item);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                              <span>Rename</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onMove?.(item);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                            >
                              <FolderInput className="w-3.5 h-3.5 text-gray-400" />
                              <span>Move to...</span>
                            </button>

                            <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDelete?.(item);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-rose-50 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Move to trash</span>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
