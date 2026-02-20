"use client";

import { useEffect, useState } from 'react';
import { Hypo, Run } from '../../../../models';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../components/auth-context';
import { apiClient } from '../../../../lib/api-client';

export default function RunHypoPage({ params }: { params: { id: string } }) {
  const [hypo, setHypo] = useState<Hypo | null>(null);
  const [outcome, setOutcome] = useState<'success' | 'fail' | 'inconclusive'>('success');
  const [observedResult, setObservedResult] = useState('');
  const [runNotes, setRunNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchHypo() {
      try {
        const result = await apiClient.get<Hypo>(`/api/hypos/${params.id}`);
        if (result.error) {
          setError(result.error);
        } else {
          setHypo(result.data || null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load hypothesis');
      }
    }
    fetchHypo();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to submit a run');
      return;
    }
    if (!hypo) {
      setError('Hypo not found');
      return;
    }
    if (!observedResult) {
      setError('Observed result is required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.post(`/api/hypos/${hypo.id}/runs`, {
        outcome,
        observedResult,
        runNotes,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push(`/hypos/${hypo.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit run');
    } finally {
      setLoading(false);
    }
  }

  if (!hypo) return <main className="p-8">Loading...</main>;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Run Hypo</h1>
      <div className="mb-6 border rounded p-4 bg-gray-50 dark:bg-gray-800">
        <div className="font-semibold text-gray-900 dark:text-white">{hypo.title}</div>
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{hypo.hypothesisStatement}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Protocol: {hypo.protocol}</div>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="block mb-1 font-medium">Outcome</span>
          <select className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" value={outcome} onChange={e => setOutcome(e.target.value as any)}>
            <option value="success">Success</option>
            <option value="fail">Fail</option>
            <option value="inconclusive">Inconclusive</option>
          </select>
        </label>
        <label className="block">
          <span className="block mb-1 font-medium">Observed Result</span>
          <input className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="e.g. p=0.04, mean=5.2" value={observedResult} onChange={e => setObservedResult(e.target.value)} required />
        </label>
        <label className="block">
          <span className="block mb-1 font-medium">Run Notes</span>
          <textarea className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Any notes about this run..." value={runNotes} onChange={e => setRunNotes(e.target.value)} />
        </label>
        {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Run'}
        </button>
      </form>
      <div className="mt-4">
        <Link href={`/hypos/${hypo.id}`} className="text-blue-600 hover:underline">Back to hypo</Link>
      </div>
    </main>
  );
}
