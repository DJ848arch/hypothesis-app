import type { NextApiResponse } from 'next';
import { db } from '@/firebaseAdmin';
import { optionalAuth, requireAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { HypoCreateSchema } from '@/lib/validation';

const handler = optionalAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // List all hypos (public)
    const snapshot = await db.collection('hypos').get();
    const hypos = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(hypos);
  } else if (req.method === 'POST') {
    // Create new hypo (requires authentication)
    if (!(await requireAuth(req, res))) return;
    
    // Validate request body
    const validation = HypoCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', issues: validation.error.flatten() });
    }
    
    const data = validation.data;
    const docRef = await db.collection('hypos').add({
      ...data,
      ownerId: req.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.status(201).json({ id: docRef.id });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});

export default handler;
