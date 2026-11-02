# Firebase Google sign-in and sync setup

The app supports two modes:

- **Guest mode:** the existing IndexedDB/localStorage browser persistence continues to work when Firebase variables are empty.
- **Google sync:** when all public Firebase variables are configured, users can sign in with Google and sync their challenge records across devices.

The app uses Firebase Authentication and Cloud Firestore only. Progress-photo image data stays in the browser; only the photo date and note are synchronized. Firebase Storage is intentionally not required.

## 1. Create the Firebase project

1. Create or select a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. Add a Web app and copy its configuration values.
3. Enable **Authentication → Sign-in method → Google**.
4. Add these authorized domains under **Authentication → Settings → Authorized domains**:
   - `offlany.github.io`
   - `localhost`
   - any local hostname used for development
5. Create a Cloud Firestore database. The rules in `firestore.rules` are the required baseline.

The browser app uses `signInWithPopup` because GitHub Pages cannot proxy Firebase's redirect helper path. If a browser blocks pop-ups, allow them for the Pages domain and retry. Firebase documents the redirect and popup trade-offs in its [redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices) guide.

## 2. Local configuration

Copy `.env.example` to `.env.local` and fill in the six `NEXT_PUBLIC_FIREBASE_*` values. Leave them empty to keep guest-only mode.

The values are public web-app configuration values. Access control comes from Authentication and Firestore Security Rules, not from hiding these values in the frontend.

## 3. Deploy rules

Install or use the repository's Firebase CLI dependency, authenticate, select the project, then deploy only Firestore rules and indexes:

```bash
npx firebase login
npx firebase use YOUR_FIREBASE_PROJECT_ID
npx firebase deploy --only firestore:rules,firestore:indexes
```

The rules scope every document to `users/{uid}/...` and require `request.auth.uid == uid`. Clients cannot delete documents; the app writes tombstones so offline deletions cannot reappear after reconnecting. Review the rules before deploying any project-specific extension.

## 4. GitHub Pages

Add these repository Actions secrets with the exact names below:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

The Pages workflow passes them only to the static build. If they are absent, the deployed app remains guest-only instead of failing to build.

## 5. Migration and privacy behavior

When a signed-in account has no cloud data but the browser has a meaningful challenge, the app asks before uploading it and offers a JSON backup download. If both local and cloud data exist and differ, the app offers cloud, local upload, or a safe ID-based merge. A failed migration leaves the local state untouched.

Sign-out returns the browser to the pre-login guest state, so one account's cloud data is not left visible to the next guest or account. Firestore's web offline cache is enabled when supported; it improves offline resilience but should only be used on a trusted device because cached cloud data can remain in the browser. See Firebase's [web offline persistence guidance](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

## 6. Emulator tests

Start the Firestore emulator through the test script:

```bash
npm run test:firebase
```

The rules tests verify that an authenticated owner can read/write only their own path and that another authenticated user cannot access it. The emulator is not required for the normal unit test command.

## 7. Data model

Each signed-in user's data is split into granular documents under:

```text
users/{uid}/meta/settings
users/{uid}/logs/{date}
users/{uid}/recipes/{recipeId}
users/{uid}/batches/{batchId}
users/{uid}/assignments/{assignmentId}
users/{uid}/photos/{photoId}
users/{uid}/groceryStatus/{key}
users/{uid}/manualGroceries/{itemId}
```

Every signed-in document carries a schema version, owner UID, stable record ID, client ID, client timestamp, server timestamp, deletion flag, and payload. Record-level last-write-wins behavior is deterministic; migration is explicit when the local and cloud snapshots differ.
