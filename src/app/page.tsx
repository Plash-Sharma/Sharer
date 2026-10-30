import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, FolderTree, Database, Lock, CloudUpload } from "lucide-react";
import { SharerLogo } from "@/components/layout/SharerLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between selection:bg-blue-600/30 transition-colors duration-150">
      {/* Navbar */}
      <nav className="h-16 border-b border-gray-200 dark:border-gray-800 px-6 sm:px-12 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center space-x-3">
          <SharerLogo size="md" />
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white tracking-tight text-base leading-tight">Sharer</span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-600 dark:text-blue-400">Drive Suite</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/login"
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>Sign up</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400 text-xs font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
          <span>Full-Stack Enterprise Cloud Storage</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
          High-Speed File Management <br className="hidden sm:inline" />
          powered by{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-400 dark:via-blue-200 dark:to-indigo-300">
            MinIO & PostgreSQL
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          Direct browser-to-storage pre-signed transfers, unlimited folder hierarchies, granular role inheritance, 
          and unguessable 256-bit time-bound sharing. Zero server buffering.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/drive"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Launch My Drive</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-semibold text-sm transition-all shadow-sm"
          >
            Create Free Account
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700/80 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Direct S3 Transfers</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Uploads and downloads flow directly between browser and storage via pre-signed URLs with real progress feedback.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700/80 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <FolderTree className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Composite Path Tree</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Single-table composite model with materialized paths, atomic moves, cycle check protection, and instant breadcrumbs.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700/80 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Central Permission Matrix</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Nearest-ancestor overrides, time-bound unguessable share links, and owner approval access workflows.
            </p>
          </div>
        </div>

        {/* Technical Capabilities Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-around gap-6 text-xs text-gray-600 dark:text-gray-400 shadow-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">PostgreSQL 16 Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">MinIO High-Throughput S3</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">Argon2id & JWT Auth</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 px-6 text-center text-xs text-gray-500">
        <p>Sharer &bull; S3 Object Storage &bull; PostgreSQL Materialized Path &bull; Next.js 15 App Router</p>
      </footer>
    </div>
  );
}
