"use client";

import Link from "next/link";
import { ChevronRight, HardDrive, Folder } from "lucide-react";

export interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  currentTitle?: string;
}

export function Breadcrumbs({ items, currentTitle }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 select-none overflow-x-auto py-1">
      <Link
        href="/drive"
        className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60"
      >
        <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold">My Drive</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1 && !currentTitle;

        return (
          <div key={item.id} className="flex items-center space-x-1.5 shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" />
            {isLast ? (
              <span className="font-semibold text-gray-900 dark:text-white px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 shadow-sm">
                {item.name}
              </span>
            ) : (
              <Link
                href={`/drive/folders/${item.id}`}
                className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60"
              >
                <Folder className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{item.name}</span>
              </Link>
            )}
          </div>
        );
      })}

      {currentTitle && (
        <div className="flex items-center space-x-1.5 shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" />
          <span className="font-semibold text-gray-900 dark:text-white px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 shadow-sm">
            {currentTitle}
          </span>
        </div>
      )}
    </nav>
  );
}
