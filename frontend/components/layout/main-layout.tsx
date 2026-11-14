import { ReactNode } from "react";
import { Navbar } from "./navbar";

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-sm md:px-8">
          <p className="font-medium text-slate-700 dark:text-slate-200">BidFlow</p>

          <p className="text-slate-400">
            © 2026 BidFlow
          </p>
        </div>
      </footer>
    </div>
  );
}
