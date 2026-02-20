// Core data models for Hypos and Runs
export type Hypo = {
  id: string;
  title: string;
  domain: string;
  ownerId: string;
  hypothesisStatement: string;
  protocol: string;
  expectedOutcome: string;
  successCriteria: string;
  createdAt: string;
  updatedAt: string;
};

export type Run = {
  id: string;
  hypoId: string;
  runnerId: string;
  outcome: 'success' | 'fail' | 'inconclusive';
  observedResult: string;
  runNotes: string;
  runAt: string;
};

export type CommentReaction = {
  emoji: '👍' | '❤️' | '🎯' | '💡' | '⚠️';
  users: string[];
};

export type Comment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  reactions?: CommentReaction[];
};
