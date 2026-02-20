import type { NextApiResponse } from 'next';
import { db } from '@/firebaseAdmin';
import { optionalAuth, requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

const handler = optionalAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });

  if (req.method === 'GET') {
    // Get hypo detail (public)
    const doc = await db.collection('hypos').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } else if (req.method === 'PUT') {
    // Update hypo (requires authentication and ownership)
    if (!(await requireAuth(req, res))) return;
    
    const doc = await db.collection('hypos').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    if (doc.data()?.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: you do not own this hypo' });
    }
    const data = req.body;
    await db.collection('hypos').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
    res.status(204).end();
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});

export default handler;
