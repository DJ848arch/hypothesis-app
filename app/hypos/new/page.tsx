"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/auth-context';
import { apiClient } from '../../../lib/api-client';

export default function NewHypoPage() {
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [protocol, setProtocol] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to create a hypo');
      return;
    }
    if (!title || !domain || !hypothesis || !protocol || !expectedOutcome || !successCriteria) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.post('/api/hypos', {
        title,
        domain,
        hypothesisStatement: hypothesis,
        protocol,
        expectedOutcome,
        successCriteria,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Navigate to the newly created hypothesis
      const newHypo = result.data as any;
      router.push(`/hypos/${newHypo.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create hypothesis');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Hypo</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <input className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Domain/Topic" value={domain} onChange={e => setDomain(e.target.value)} required />
        <textarea className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Hypothesis Statement (If X, then Y)" value={hypothesis} onChange={e => setHypothesis(e.target.value)} required />
        <textarea className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Protocol / Steps" value={protocol} onChange={e => setProtocol(e.target.value)} required />
        <textarea className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Expected Outcome" value={expectedOutcome} onChange={e => setExpectedOutcome(e.target.value)} required />
        <textarea className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" placeholder="Success Criteria" value={successCriteria} onChange={e => setSuccessCriteria(e.target.value)} required />
        {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400" disabled={loading}>
          {loading ? 'Creating...' : 'Create Hypo'}
        </button>
      </form>
      <div className="mt-4">
        <Link href="/hypos" className="text-blue-600 hover:underline">Back to all hypos</Link>
      </div>
    </main>
  );
}