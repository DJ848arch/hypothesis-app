# End-to-End Testing Guide for Hypothesis App

## Overview
This guide covers testing the complete user journey from signup to creating and running hypotheses with Firebase authentication and Firestore persistence.

## Prerequisites
- Dev server running: `npm run dev`
- Firebase credentials configured in `.env.local` ✅
- Firestore database accessible

## Test Scenarios

### 1. User Authentication Flow

#### 1.1 Sign Up New User
**Steps:**
1. Navigate to `http://localhost:3000/auth`
2. Click "✨ Need an account? Sign up"
3. Enter email: `test-user-1@example.com`
4. Enter password: `TestPassword123!`
5. Click "🚀 Sign Up"

**Expected Results:**
- User is created in Firebase Authentication
- User is redirected to `/hypos` page
- User email displayed in navigation bar (top-right)
- No errors in console

**Verification in Firebase Console:**
- Go to Firebase Console > Authentication > Users
- Should see `test-user-1@example.com` with UID

---

#### 1.2 Login Existing User
**Steps:**
1. Navigate to `http://localhost:3000/auth`
2. Keep "🔐 Welcome Back" mode selected
3. Enter email: `test-user-1@example.com`
4. Enter password: `TestPassword123!`
5. Click "✨ Login"

**Expected Results:**
- User is logged in
- Redirected to `/hypos`
- User email shown in navigation

---

#### 1.3 Logout User
**Steps:**
1. While logged in, click "Logout" button in navigation (top-right)

**Expected Results:**
- User logged out
- Navigation shows "Login" link
- Redirected to home page (/)

---

### 2. Hypothesis Management Flow

#### 2.1 Create New Hypothesis
**Steps:**
1. Log in as test user
2. Click "✨ Create" in navigation
3. Navigate to `/hypos/new`
4. Fill in form:
   - Title: "Effect of Temperature on Enzyme Activity"
   - Domain: "Biology"
   - Hypothesis: "Increasing temperature from 20°C to 37°C will increase enzyme reaction rate"
   - Protocol: "Heat enzyme sample to different temperatures"
   - Expected Outcome: "Reaction rate increases with temperature"
   - Success Criteria: "Rate increases by at least 50%"
5. Click submit button

**Expected Results:**
- Hypothesis saved to Firestore
- User redirected to hypothesis detail page
- Hypothesis appears in `/hypos` list with user's name

**API Call Expected:**
```
POST /api/hypos
Headers: Authorization: Bearer {ID_TOKEN}
Body: {
  title: "...",
  domain: "...",
  hypothesisStatement: "...",
  protocol: "...",
  expectedOutcome: "...",
  successCriteria: "..."
}
Response: { id: "{HYPOTHESIS_ID}" }
```

**Firestore Verification:**
- Collection: `hypos/{HYPOTHESIS_ID}`
- Fields should include:
  - ownerId: user's UID
  - createdAt: timestamp
  - updatedAt: timestamp

---

#### 2.2 View Hypothesis Details
**Steps:**
1. From `/hypos` list, click on a hypothesis
2. Navigate to `/hypos/{id}`

**Expected Results:**
- Full hypothesis details displayed
- Runs list (initially empty)
- Button to create new run

**API Call Expected:**
```
GET /api/hypos/{id}
Response: { id, title, domain, ownerId, ... }
```

---

#### 2.3 Update Hypothesis (Owner Only)
**Steps:**
1. Navigate to created hypothesis detail page
2. Click "Edit" button (if available)
3. Modify fields
4. Click "Save"

**Expected Results:**
- Changes saved to Firestore
- updatedAt timestamp updated
- Non-owners cannot edit (403 error)

**API Call Expected:**
```
PUT /api/hypos/{id}
Headers: Authorization: Bearer {ID_TOKEN}
Body: { title: "...", /* other fields */ }
```

---

### 3. Hypothesis Run (Experiment) Flow

#### 3.1 Create New Run
**Steps:**
1. From hypothesis detail page, click "Create Run"
2. Navigate to `/hypos/{id}/run`
3. Fill in form:
   - Outcome: "Positive"
   - Observed Result: "Temperature increase from 20°C to 37°C showed 65% increase in reaction rate"
   - Run Notes: "Used enzyme from fresh batch. Temperature maintained ±0.5°C"
4. Click "Record Run"

**Expected Results:**
- Run created in Firestore subcollection
- Run appears in runs list
- runnerId set to current user
- runAt timestamp set

**API Call Expected:**
```
POST /api/hypos/{id}/runs
Headers: Authorization: Bearer {ID_TOKEN}
Body: {
  outcome: "positive",
  observedResult: "...",
  runNotes: "..."
}
Response: { id: "{RUN_ID}" }
```

**Firestore Verification:**
- Collection: `hypos/{HYPOTHESIS_ID}/runs/{RUN_ID}`
- Fields should include:
  - runnerId: current user's UID
  - outcome: "positive"
  - runAt: timestamp

---

#### 3.2 View Runs List
**Steps:**
1. Navigate to hypothesis detail page
2. View "Runs" section

**Expected Results:**
- List shows all runs for hypothesis
- Details: outcome, observed result, runner, timestamp
- Sorted by date (newest first)

**API Call Expected:**
```
GET /api/hypos/{id}/runs
Response: [{ id, outcome, observedResult, runnerId, runAt }, ...]
```

---

### 4. Security & Authorization Tests

#### 4.1 Unauthenticated User Cannot Create
**Steps:**
1. Log out user
2. Try to open `/hypos/new`
3. Try to submit POST request to `/api/hypos`

**Expected Results:**
- Request redirected to login
- API returns 401: "Missing authorization token"

---

#### 4.2 User Cannot Edit Others' Hypotheses
**Steps:**
1. Create hypothesis as User A
2. Log out, log in as User B
3. Try to navigate to User A's hypothesis
4. Try to PUT request to `/api/hypos/{A's_hypo_id}`

**Expected Results:**
- GET succeeds (public read)
- PUT fails with 403: "Forbidden: you do not own this hypo"

---

#### 4.3 Invalid Token Rejected
**Steps:**
1. Manually modify `Authorization` header to invalid value
2. Make API request

**Expected Results:**
- API returns 401: "Invalid or expired token"

---

### 5. Data Validation Tests

#### 5.1 Invalid Hypothesis Data
**Steps:**
1. Try to POST invalid data:
```json
{
  "title": "",
  "domain": "Science",
  "hypothesisStatement": "short"
}
```

**Expected Results:**
- API returns 400: "Validation failed"
- Error details show which fields failed

---

#### 5.2 Invalid Run Outcome
**Steps:**
1. Try to submit run with outcome: "maybe" (invalid enum)

**Expected Results:**
- API returns 400 validation error
- Accepted outcomes: "positive", "negative", "inconclusive", "pending"

---

### 6. Theme Switching Test

#### 6.1 Light/Dark Theme Toggle
**Steps:**
1. Navigate to any page
2. Click theme toggle button (top-right)
3. Switch between light and dark modes

**Expected Results:**
- Page colors switch appropriately
- Preference persists across page refreshes
- All components respond to theme

---

## Test Data Cleanup

After testing, clean up in Firebase Console:
1. **Delete Test Users:**
   - Console > Authentication > Users
   - Delete test-user-1@example.com

2. **Delete Test Documents:**
   - Console > Firestore > Collections
   - Delete documents created during tests

---

## Troubleshooting

### Issue: 401 Unauthorized on API Calls
**Solution:**
- Verify user is logged in
- Check ID token hasn't expired (max 1 hour)
- Verify FIREBASE_SERVICE_ACCOUNT_KEY in .env.local

### Issue: Hypothesis Not Saving
**Solution:**
- Check Firestore rules allow write
- Verify ownerId matches current user UID
- Check browser DevTools Network tab for API errors

### Issue: Firebase Auth Not Initializing
**Solution:**
- Verify NEXT_PUBLIC_FIREBASE_* variables in .env.local
- Clear browser localStorage and restart
- Check browser console for Firebase errors

---

## Performance Considerations

- **API Calls:** Each route includes minimal data validation
- **Firestore Queries:** Add pagination/filtering as dataset grows
- **Auth Tokens:** Cached in Firebase Auth, auto-refresh at 1 hour

---

## Next Steps After Testing

1. ✅ Deploy Firestore security rules: `firebase deploy --only firestore:rules`
2. ✅ Deploy to Firebase Hosting: `firebase deploy`
3. Set up Firestore composite indexes if needed
4. Add error tracking (Sentry, LogRocket)
5. Implement user profiles page
6. Add hypothesis favoriting/sharing
7. Implement progress charts for runs

---

## Test Completion Checklist

- [ ] User can sign up
- [ ] User can login
- [ ] User can logout
- [ ] User can create hypothesis
- [ ] User can view hypothesis details
- [ ] User can update own hypothesis
- [ ] User cannot update others' hypotheses
- [ ] User can create runs
- [ ] User can view runs
- [ ] API returns validation errors for bad data
- [ ] Unauthenticated requests rejected (401)
- [ ] Theme toggle works
- [ ] All data persists in Firestore

---
