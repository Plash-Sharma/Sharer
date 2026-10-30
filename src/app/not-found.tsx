import Link from "next/link";
import { SharerLogo } from "@/components/layout/SharerLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="flex items-center gap-3 mb-6">
        <SharerLogo size="lg" />
        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Sharer</span>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
        <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">404</span>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-2 mb-2">Page Not Found</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          The file, folder, or page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/drive"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm"
        >
          Return to My Drive
        </Link>
      </div>
    </div>
  );
}
