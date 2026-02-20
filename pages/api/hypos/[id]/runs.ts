import type { NextApiResponse } from 'next';
import { db } from '@/firebaseAdmin';
import { optionalAuth, requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { RunCreateSchema } from '@/lib/validation';

const handler = optionalAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });

  if (req.method === 'GET') {
    // List runs for this hypo (public)
    const snapshot = await db.collection('hypos').doc(id).collection('runs').get();
    const runs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(runs);
  } else if (req.method === 'POST') {
    // Create new run for this hypo (requires authentication)
    if (!(await requireAuth(req, res))) return;
    
    // Validate request body
    const validation = RunCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', issues: validation.error.flatten() });
    }
    
    const data = validation.data;
    const docRef = await db.collection('hypos').doc(id).collection('runs').add({
      ...data,
      runnerId: req.userId,
      runAt: new Date().toISOString(),
    });
    res.status(201).json({ id: docRef.id });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});

export default handler;
