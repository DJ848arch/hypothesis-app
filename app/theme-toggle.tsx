"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌓</span>
          <label className="text-sm text-var(--text-secondary)">Theme</label>
        </div>
        <button
          disabled
          title="Loading theme selector..."
          aria-label="Theme toggle loading"
          className="h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-600"
        />
      </div>
    );
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg">🌓</span>
        <label className="text-sm text-gray-700 dark:text-gray-300">Theme</label>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {theme === "light" ? "☀️ Light" : "🌙 Dark"}
        </span>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          aria-label={`Toggle ${theme === "dark" ? "light" : "dark"} theme`}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            theme === "dark"
              ? "bg-green-primary dark:bg-green-600"
              : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              theme === "dark" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

