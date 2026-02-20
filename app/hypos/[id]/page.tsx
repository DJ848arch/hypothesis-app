"use client";

import { useEffect, useState } from 'react';
import { Hypo, Run } from '../../../models';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';

export default function HypoDetailPage({ params }: { params: { id: string } }) {
  const [hypo, setHypo] = useState<Hypo | null>(null);
  const [hypoRuns, setHypoRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch hypothesis details
        const hypoResult = await apiClient.get<Hypo>(`/api/hypos/${params.id}`);
        if (hypoResult.error) {
          setError(hypoResult.error);
          return;
        }
        setHypo(hypoResult.data || null);

        // Fetch runs for this hypothesis
        const runsResult = await apiClient.get<Run[]>(`/api/hypos/${params.id}/runs`);
        if (!runsResult.error) {
          setHypoRuns(runsResult.data || []);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load hypothesis');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  if (loading) return <main className="p-8">Loading...</main>;
  if (error) return <main className="p-8"><div className="text-red-600 dark:text-red-400">Error: {error}</div></main>;
  if (!hypo) return <main className="p-8">Hypo not found</main>;

  const success = hypoRuns.filter(r => r.outcome === 'success').length;
  const total = hypoRuns.length;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{hypo.title}</h1>
      <div className="mb-4 text-gray-700 dark:text-gray-300">by {hypo.ownerId} | {hypo.domain}</div>
      <div className="mb-4 text-gray-800 dark:text-gray-200">
        <div><span className="font-semibold">Hypothesis:</span> {hypo.hypothesisStatement}</div>
        <div><span className="font-semibold">Protocol:</span> {hypo.protocol}</div>
        <div><span className="font-semibold">Expected Outcome:</span> {hypo.expectedOutcome}</div>
        <div><span className="font-semibold">Success Criteria:</span> {hypo.successCriteria}</div>
      </div>
      <div className="mb-6">
        <span className="font-semibold">Replication summary:</span> {success}/{total} successful
      </div>
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Runs</h2>
        {hypoRuns.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">No runs yet.</p>
        ) : (
          <ul className="space-y-2">
            {hypoRuns.map(run => (
              <li key={run.id} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{run.outcome.toUpperCase()}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{run.runAt} by {run.runnerId}</span>
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200">Result: {run.observedResult}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Notes: {run.runNotes}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href={`/hypos/${hypo.id}/run`} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Run this hypo</Link>
    </main>
  );
}
