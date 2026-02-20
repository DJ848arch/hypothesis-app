"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "../components/auth-context";
import { SearchHeader } from "@/components/search-header";


export function Navigation() {
  const pathname = usePathname() || "";
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { href: "/", label: "Hypothesis", icon: "🔬" },
    { href: "/discover", label: "Discover", icon: "🌟" },
    { href: "/explore", label: "Explore", icon: "🧭" },
    { href: "/new", label: "Create", icon: "✨" },
    { href: "/profile", label: "Profile", icon: "👤" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/30 dark:bg-slate-950/30 border-b border-white/20 dark:border-white/10 shadow-lg transition-all">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <div className="flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 text-sm font-medium transition-all duration-300 relative group ${
                isActive(item.href)
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              <span className={`text-lg transform transition-transform group-hover:scale-110 ${isActive(item.href) ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
              {isActive(item.href) && (
                <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 rounded-full"></span>
              )}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SearchHeader />
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-300/20 dark:border-blue-400/20">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate max-w-xs">{user.email}</span>
                <button 
                  onClick={handleLogout} 
                  className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link href="/auth" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition">
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

