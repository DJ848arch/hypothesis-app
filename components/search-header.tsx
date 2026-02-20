"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function SearchHeader() {
  const [isExpanded, setIsExpanded] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = searchParams?.get("q") || "";

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle Escape key to collapse
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isExpanded && !target.closest("[data-search-header]")) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isExpanded]);

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value.trim()) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.push(`?${params.toString()}`);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("q");
    router.push(`?${params.toString()}`);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div data-search-header className="flex items-center">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Search"
          aria-label="Open search"
        >
          🔍
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600">
          <span className="text-lg flex-shrink-0">🔍</span>
          <input
            ref={inputRef}
            type="text"
            defaultValue={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search hypothesis..."
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none text-sm min-w-64"
          />
          {query && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg flex-shrink-0"
              title="Clear search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg flex-shrink-0"
            title="Close search"
            aria-label="Close search"
          >
            ╳
          </button>
        </div>
      )}
    </div>
  );
}
