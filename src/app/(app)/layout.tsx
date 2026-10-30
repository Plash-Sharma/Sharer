"use client";

import { useState, useRef } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CreateFolderDialog } from "@/components/explorer/CreateFolderDialog";
import { InAppEditorDialog } from "@/components/explorer/InAppEditorDialog";
import { UploadDropzone, UploadDropzoneRef } from "@/components/explorer/UploadDropzone";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const uploadDropzoneRef = useRef<UploadDropzoneRef>(null);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [createdFileNodeId, setCreatedFileNodeId] = useState<string | null>(null);
  const [createdFileName, setCreatedFileName] = useState("document.md");

  const handleCreateNewFile = async () => {
    try {
      // Step 1: Create a pending text file through upload init
      const res = await fetch("/api/uploads/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "untitled.md",
          size: 14,
          mimeType: "text/markdown",
        }),
      });

      if (!res.ok) return;
      const data = await res.json();

      // Step 2: Upload initial placeholder via direct PUT
      await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "text/markdown" },
        body: "# New Document\n",
      });

      // Step 3: Complete upload
      const compRes = await fetch(`/api/uploads/${data.nodeId}/complete`, {
        method: "POST",
      });

      if (compRes.ok) {
        setCreatedFileNodeId(data.nodeId);
        setCreatedFileName(data.name || "untitled.md");
        setIsNewFileModalOpen(true);
        window.dispatchEvent(new CustomEvent("refresh-nodes"));
      }
    } catch (err) {
      console.error("Failed to create new markdown file:", err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden transition-colors duration-150">
      <Sidebar
        onNewFolder={() => setIsFolderModalOpen(true)}
        onUploadClick={() => uploadDropzoneRef.current?.openFilePicker()}
        onNewFile={handleCreateNewFile}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onSearch={(query) => {
            window.dispatchEvent(new CustomEvent("search-query", { detail: query }));
          }}
        />

        <main className="flex-1 overflow-y-auto p-6 relative">
          {children}

          <UploadDropzone
            ref={uploadDropzoneRef}
            onUploadSuccess={() => {
              window.dispatchEvent(new CustomEvent("refresh-nodes"));
            }}
          />
        </main>
      </div>

      <CreateFolderDialog
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("refresh-nodes"));
        }}
      />

      <InAppEditorDialog
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        nodeId={createdFileNodeId}
        filename={createdFileName}
        onSaved={() => {
          window.dispatchEvent(new CustomEvent("refresh-nodes"));
        }}
      />
    </div>
  );
}
