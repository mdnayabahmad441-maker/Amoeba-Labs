"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
interface PortalLayoutProps {
  children: React.ReactNode;
  userEmail: string;
  currentDateLabel: string;
}

export default function PortalLayout({ children, userEmail, currentDateLabel }: PortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(() =>
    ["/portal/employees", "/portal/tasks", "/portal/followups", "/portal/ventures", "/portal/settings"]
      .some((href) => pathname.startsWith(href))
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncSidebar = () => setSidebarOpen(mediaQuery.matches);

    syncSidebar();
    mediaQuery.addEventListener("change", syncSidebar);

    return () => mediaQuery.removeEventListener("change", syncSidebar);
  }, []);

  async function handleLogout() {
    const result = await signOut();
    if (result.success) {
      router.push("/auth/login");
      router.refresh();
    }
  }

  const primaryNavItems = [
    { href: "/portal/today", label: "Today", icon: "Now" },
    { href: "/portal/leads", label: "Leads", icon: "L" },
    { href: "/portal/calendar", label: "Calendar", icon: "Cal" },
    { href: "/portal/clients", label: "Clients", icon: "C" },
    { href: "/portal/proposals", label: "Proposals", icon: "P" },
    { href: "/portal/projects", label: "Projects", icon: "Pr" },
    { href: "/portal/billing", label: "Billing", icon: "₹" },
    { href: "/portal/expenses", label: "Expenses", icon: "Ex" },
    { href: "/portal/reports", label: "Reports", icon: "R" },
  ];

  const secondaryNavItems = [
    { href: "/portal/daily-checklist", label: "Daily checklist" },
    { href: "/portal/employees", label: "Employees" },
    { href: "/portal/tasks", label: "Tasks" },
    { href: "/portal/followups", label: "Follow-ups" },
    { href: "/portal/field-visits", label: "Field visits" },
      { href: "/portal/ventures", label: "Business units" },
    { href: "/portal/settings", label: "Business settings" },
  ];

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  const secondaryActive = secondaryNavItems.some((item) => isActive(item.href));

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white md:flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col overflow-hidden bg-[#0b0a08] border-r border-amber-300/10 transition-all duration-300 ${
          sidebarOpen
            ? "w-72 translate-x-0 md:w-64"
            : "w-72 -translate-x-full md:w-20 md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-center justify-between border-b border-amber-300/10 p-4 sm:p-6">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/groenics-logo.jpeg"
              alt="Groenics"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover border border-amber-300/20"
              priority
            />
            {sidebarOpen && <h1 className="text-xl font-bold truncate">Groenics</h1>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-amber-300/10 rounded-lg transition"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 pb-4 sm:p-4">
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(item.href)
                  ? "bg-amber-300/20 text-amber-300 border border-amber-300/50"
                  : "text-gray-400 hover:bg-amber-300/5"
              }`}
              title={item.label}
            >
              <span className="flex h-7 min-w-7 items-center justify-center rounded-md border border-amber-300/10 bg-amber-300/5 px-1 text-[10px] font-bold uppercase tracking-wide">
                {item.icon}
              </span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (!sidebarOpen) setSidebarOpen(true);
                setMoreOpen((open) => !open);
              }}
              aria-expanded={moreOpen}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                secondaryActive
                  ? "border border-amber-300/30 bg-amber-300/10 text-amber-200"
                  : "text-gray-400 hover:bg-amber-300/5"
              }`}
              title="More"
            >
              <span className="flex h-6 w-6 items-center justify-center text-lg">•••</span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-sm">More</span>
                  <span className="text-xs" aria-hidden="true">{moreOpen ? "▲" : "▼"}</span>
                </>
              )}
            </button>

            {sidebarOpen && moreOpen && (
              <div className="ml-5 mt-2 space-y-1 border-l border-amber-300/10 pl-3">
                {secondaryNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
                      isActive(item.href)
                        ? "bg-amber-300/15 text-amber-200"
                        : "text-gray-500 hover:bg-amber-300/5 hover:text-gray-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-amber-300/10 bg-[#0b0a08] p-3 sm:p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/20 transition"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`min-w-0 flex-1 transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-[#0b0a08]/95 border-b border-amber-300/10 px-4 py-3 backdrop-blur sm:px-6 md:px-8 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/10 bg-amber-300/5 text-lg text-amber-200 transition hover:bg-amber-300/10 md:hidden"
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <h2 className="min-w-0 flex-1 truncate text-sm text-gray-400">
              Welcome, <span className="text-white font-semibold">{userEmail.split("@")[0]}</span>
            </h2>
            <div className="flex items-center gap-4">
              <span className="whitespace-nowrap text-xs text-gray-400 sm:text-sm">{currentDateLabel}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
