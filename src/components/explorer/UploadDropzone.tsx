"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { UploadCloud, X, CheckCircle, AlertCircle } from "lucide-react";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  error?: string;
  xhr?: XMLHttpRequest;
  nodeId?: string;
}

export interface UploadDropzoneRef {
  openFilePicker: () => void;
}

interface UploadDropzoneProps {
  parentId?: string | null;
  onUploadSuccess: () => void;
}

export const UploadDropzone = forwardRef<UploadDropzoneRef, UploadDropzoneProps>(
  ({ parentId, onUploadSuccess }, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    useImperativeHandle(ref, () => ({
      openFilePicker: () => {
        fileInputRef.current?.click();
      },
    }));

    const uploadFileDirect = useCallback(async (file: File, uploadItemId: string) => {
      try {
        // Step 1: Init with Next.js API
        const initRes = await fetch("/api/uploads/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            mimeType: file.type || "application/octet-stream",
            parentId: parentId || null,
          }),
        });

        if (!initRes.ok) {
          const errData = await initRes.json();
          throw new Error(errData.error?.message || "Failed to initialize upload");
        }

        const { nodeId, uploadUrl } = await initRes.json();

        // Step 2: Browser directly PUTs to MinIO via pre-signed URL with XMLHttpRequest
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadItemId
                ? { ...u, status: "uploading", nodeId, xhr }
                : u
            )
          );

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploads((prev) =>
                prev.map((u) => (u.id === uploadItemId ? { ...u, progress: percent } : u))
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Storage rejected upload with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Direct upload to storage failed"));
          xhr.onabort = () => reject(new Error("Upload cancelled"));

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.send(file);
        });

        // Step 3: Complete upload via Next.js API (HEAD verification)
        const completeRes = await fetch(`/api/uploads/${nodeId}/complete`, {
          method: "POST",
        });

        if (!completeRes.ok) {
          const errData = await completeRes.json();
          throw new Error(errData.error?.message || "Storage verification failed");
        }

        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadItemId ? { ...u, status: "completed", progress: 100 } : u
          )
        );

        onUploadSuccess();
      } catch (err: unknown) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === uploadItemId
              ? { ...u, status: "error", error: (err as Error).message }
              : u
          )
        );
      }
    }, [parentId, onUploadSuccess]);

    const handleFilesSelected = useCallback((files: File[]) => {
      const newItems: UploadItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        progress: 0,
        status: "pending",
      }));

      setUploads((prev) => [...prev, ...newItems]);

      newItems.forEach((item, index) => {
        uploadFileDirect(files[index], item.id);
      });
    }, [uploadFileDirect]);

    // Window drag and drop handlers
    useEffect(() => {
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        if (e.relatedTarget === null) {
          setIsDragging(false);
        }
      };

      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          handleFilesSelected(Array.from(e.dataTransfer.files));
        }
      };

      window.addEventListener("dragover", handleDragOver);
      window.addEventListener("dragleave", handleDragLeave);
      window.addEventListener("drop", handleDrop);

      return () => {
        window.removeEventListener("dragover", handleDragOver);
        window.removeEventListener("dragleave", handleDragLeave);
        window.removeEventListener("drop", handleDrop);
      };
    }, [handleFilesSelected]);

    const cancelUpload = async (item: UploadItem) => {
      if (item.xhr) {
        item.xhr.abort();
      }
      if (item.nodeId) {
        try {
          await fetch(`/api/uploads/${item.nodeId}/abort`, { method: "POST" });
        } catch {}
      }
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: "cancelled" } : u))
      );
    };

    const dismissUpload = (id: string) => {
      setUploads((prev) => prev.filter((u) => u.id !== id));
    };

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFilesSelected(Array.from(e.target.files));
            }
          }}
        />

        {/* Fullscreen drag overlay */}
        {isDragging && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md border-4 border-dashed border-blue-500 flex flex-col items-center justify-center p-8 select-none animate-in fade-in duration-100">
            <UploadCloud className="w-16 h-16 text-blue-400 animate-bounce mb-4" />
            <h2 className="text-2xl font-bold text-white tracking-tight">Drop files to upload to Sharer</h2>
            <p className="text-sm text-blue-300 mt-2 font-medium">
              Files stream directly to MinIO high-throughput S3 storage
            </p>
          </div>
        )}

        {/* Floating Upload Queue Modal */}
        {uploads.length > 0 && (
          <div className="fixed bottom-6 right-6 z-40 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">
                  Uploads ({uploads.filter((u) => u.status === "completed").length}/{uploads.length})
                </span>
              </div>
              <button
                onClick={() => setUploads([])}
                className="text-gray-400 hover:text-white text-xs p-1"
                title="Clear all"
              >
                Clear
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-800 p-2 space-y-2">
              {uploads.map((u) => (
                <div key={u.id} className="p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-white truncate">{u.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {u.status === "completed" && (
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      )}
                      {u.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      {u.status === "uploading" && (
                        <button
                          onClick={() => cancelUpload(u)}
                          className="text-gray-400 hover:text-rose-400 p-0.5"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(u.status === "completed" || u.status === "error" || u.status === "cancelled") && (
                        <button
                          onClick={() => dismissUpload(u.id)}
                          className="text-gray-500 hover:text-gray-300 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden mb-1">
                    <div
                      className={`h-full transition-all duration-150 ${
                        u.status === "error"
                          ? "bg-rose-500"
                          : u.status === "completed"
                          ? "bg-blue-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>
                      {u.status === "uploading" && `${u.progress}%`}
                      {u.status === "completed" && "Uploaded"}
                      {u.status === "error" && (u.error || "Failed")}
                      {u.status === "cancelled" && "Cancelled"}
                    </span>
                    <span>{(u.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }
);

UploadDropzone.displayName = "UploadDropzone";
