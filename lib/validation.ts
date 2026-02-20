import { z } from 'zod';

// Outcome enum for runs
export const OutcomeEnum = z.enum(['positive', 'negative', 'inconclusive', 'pending']);
export type Outcome = z.infer<typeof OutcomeEnum>;

// Hypothesis schema
export const HypoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  domain: z.string().min(1, 'Domain is required').max(100, 'Domain must be under 100 characters'),
  ownerId: z.string(),
  hypothesisStatement: z.string().min(10, 'Hypothesis statement must be at least 10 characters'),
  protocol: z.string().optional().default(''),
  expectedOutcome: z.string().optional().default(''),
  successCriteria: z.string().optional().default(''),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const HypoCreateSchema = HypoSchema.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});

export const HypoUpdateSchema = HypoSchema.partial().omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});

export type Hypo = z.infer<typeof HypoSchema>;
export type HypoCreate = z.infer<typeof HypoCreateSchema>;
export type HypoUpdate = z.infer<typeof HypoUpdateSchema>;

// Run schema
export const RunSchema = z.object({
  id: z.string().optional(),
  hypoId: z.string(),
  runnerId: z.string(),
  outcome: OutcomeEnum,
  observedResult: z.string().min(1, 'Observed result is required'),
  runNotes: z.string().optional().default(''),
  runAt: z.string().datetime().optional(),
});

export const RunCreateSchema = RunSchema.omit({
  id: true,
  runnerId: true,
  runAt: true,
});

export const RunUpdateSchema = RunSchema.partial().omit({
  id: true,
  runnerId: true,
  runAt: true,
  hypoId: true,
});

export type Run = z.infer<typeof RunSchema>;
export type RunCreate = z.infer<typeof RunCreateSchema>;
export type RunUpdate = z.infer<typeof RunUpdateSchema>;

// User profile schema
export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  bio: z.string().optional().default(''),
  createdAt: z.string().datetime().optional(),
});

export const UserProfileUpdateSchema = UserProfileSchema.partial().omit({
  uid: true,
  email: true,
  createdAt: true,
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
