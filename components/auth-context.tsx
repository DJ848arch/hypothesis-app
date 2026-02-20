"use client";

import { useEffect, useState, createContext, useContext } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type AuthUser = {
  id: string;
  email: string;
};

const AuthContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string>;
}>({
  user: null,
  loading: true,
  error: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  getIdToken: async () => '',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        try {
          if (fbUser) {
            setFirebaseUser(fbUser);
            setUser({
              id: fbUser.uid,
              email: fbUser.email || '',
            });
            setError(null);
          } else {
            setFirebaseUser(null);
            setUser(null);
            setError(null);
          }
        } catch (err: any) {
          setError(err?.message || 'Failed to process auth state');
        }
        setLoading(false);
      }, (err: any) => {
        setError(err?.message || 'Firebase auth initialization failed');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize auth listener');
      setLoading(false);
    }
  }, []);

  async function signup(email: string, password: string) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      setFirebaseUser(result.user);
      setUser({
        id: result.user.uid,
        email: result.user.email || '',
      });
      setError(null);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign up';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async function login(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(result.user);
      setUser({
        id: result.user.uid,
        email: result.user.email || '',
      });
      setError(null);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to login';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setUser(null);
      setError(null);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to logout';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async function getIdToken(): Promise<string> {
    if (!firebaseUser) {
      throw new Error('User not authenticated');
    }
    return await firebaseUser.getIdToken();
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
