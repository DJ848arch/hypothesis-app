import { NextApiRequest, NextApiResponse } from 'next';
import { auth as adminAuth } from '../firebaseAdmin';

export interface AuthenticatedRequest extends NextApiRequest {
  userId?: string;
}

export async function verifyToken(token: string): Promise<string | null> {
  if (!token) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    return null;
  }
}

export function extractToken(req: AuthenticatedRequest): string | null {
  return req.headers.authorization?.replace('Bearer ', '') || null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<boolean> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return false;
  }

  const userId = await verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return false;
  }

  req.userId = userId;
  return true;
}

export function optionalAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const token = extractToken(req);
    if (token) {
      const userId = await verifyToken(token);
      if (userId) {
        req.userId = userId;
      }
    }
    return handler(req, res);
  };
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!(await requireAuth(req, res))) {
      return;
    }
    return handler(req, res);
  };
}
