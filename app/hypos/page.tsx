"use client";

import { useEffect, useState } from 'react';
import { Hypo, Run } from '../../models';
import Link from 'next/link';
import { apiClient } from '../../lib/api-client';

function getStats(hypoId: string, runs: Run[]) {
  const relevant = runs.filter(r => r.hypoId === hypoId);
  const total = relevant.length;
  const success = relevant.filter(r => r.outcome === 'success').length;
  return total === 0 ? { text: 'No runs yet', success: 0, total: 0 } : { text: `${success}/${total} successful`, success, total };
}

export default function HyposPage() {
  const [hypos, setHypos] = useState<Hypo[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const hyposResult = await apiClient.get<Hypo[]>('/api/hypos');
        
        if (hyposResult.error) {
          setError(hyposResult.error);
          return;
        }
        
        setHypos(hyposResult.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load hypotheses');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return (
    <main className="p-8 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400 animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading hypotheses...</p>
      </div>
    </main>
  );

  if (error) return (
    <main className="p-8 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Hypotheses</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">Back to home</Link>
      </div>
    </main>
  );

  return (
    <main className="p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-12">
        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-2">All Hypotheses</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          {hypos.length === 0 ? "No hypotheses yet. Be the first to contribute!" : `Exploring ${hypos.length} hypothesis${hypos.length !== 1 ? 'es' : ''}`}
        </p>
      </div>

      {hypos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">No hypotheses created yet.</p>
          <Link href="/hypos/new" className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105">
            Create the first one →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {hypos.map((h, idx) => {
            const stats = getStats(h.id, runs);
            const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
            
            return (
              <>
                {/* eslint-disable-next-line @next/next/no-inline-styles */}
                <div
                  key={h.id}
                  className={`group relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-700/60 hover:border-blue-400/60 dark:hover:border-blue-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:scale-105 animate-slide-up ${
                    idx === 0 ? '' : idx === 1 ? 'animation-delay-50' : idx === 2 ? 'animation-delay-100' : 'animation-delay-150'
                  }`}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 transition duration-300"></div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <Link href={`/hypos/${h.id}`} className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                        {h.title}
                      </h2>
                    </Link>
                    <span className="text-2xl flex-shrink-0">🔬</span>
                  </div>

                  {/* Domain badge */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300 border border-blue-300/30 dark:border-blue-400/30">
                      {h.domain}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{successRate}%</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-gray-300/50 dark:bg-gray-700/50 overflow-hidden">
                      {/* eslint-disable @next/next/no-inline-styles */}
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${successRate}%` }}
                      ></div>
                    </div>

                    {/* Run count */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{stats.text}</span>
                      <span className="text-gray-500 dark:text-gray-500">by {h.ownerId}</span>
                    </div>
                  </div>

                  {/* Footer button */}
                  <Link
                    href={`/hypos/${h.id}`}
                    className="mt-4 inline-block w-full text-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-700 dark:text-blue-300 font-semibold hover:from-blue-600/40 hover:to-purple-600/40 transition duration-300 border border-blue-400/30"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
              </>
            );
          })}
        </div>
      )}
    </main>
  );
}
