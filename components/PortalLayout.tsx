"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { User } from "@/lib/types";

interface PortalLayoutProps {
  children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    }
    loadUser();
  }, []);

  async function handleLogout() {
    const result = await signOut();
    if (result.success) {
      router.push("/auth/login");
      router.refresh();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const navItems = [
    { href: "/portal", label: "Dashboard", icon: "📊" },
    { href: "/portal/clients", label: "Clients", icon: "🏢" },
    { href: "/portal/leads", label: "Leads", icon: "👥" },
    { href: "/portal/followups", label: "Follow-ups", icon: "📞" },
    { href: "/portal/tasks", label: "Tasks", icon: "✅" },
    { href: "/portal/billing", label: "Billing", icon: "💰" },
    { href: "/portal/ventures", label: "Ventures", icon: "🚀" },
  ];

  const isActive = (href: string) => {
    if (href === "/portal") {
      return pathname === "/portal";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-[#0b0a08] border-r border-amber-300/10 transition-all duration-300 z-40 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-amber-300/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/nayab-labs-logo.jpeg"
              alt="Nayab Labs"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover border border-amber-300/20"
              priority
            />
            {sidebarOpen && <h1 className="text-xl font-bold truncate">Nayab Labs</h1>}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-amber-300/10 rounded-lg transition"
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(item.href)
                  ? "bg-amber-300/20 text-amber-300 border border-amber-300/50"
                  : "text-gray-400 hover:bg-amber-300/5"
              }`}
              title={item.label}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-6 left-0 right-0 px-4">
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
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        {/* Top Bar */}
        <header className="bg-[#0b0a08] border-b border-amber-300/10 px-8 py-4 flex items-center justify-between">
          <h2 className="text-sm text-gray-400">
            Welcome, <span className="text-white font-semibold">{user?.email?.split("@")[0]}</span>
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{new Date().toLocaleDateString()}</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
