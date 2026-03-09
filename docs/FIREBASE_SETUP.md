# Firebase Setup Guide

Step-by-step guide to set up Firebase for the Dart Tournament app. No prior Firebase knowledge required.

---

## Table of Contents

1. [Create a Google Account](#1-create-a-google-account)
2. [Create a Firebase Project](#2-create-a-firebase-project)
3. [Register a Web App](#3-register-a-web-app)
4. [Enable Authentication](#4-enable-authentication)
5. [Create Your Admin Account](#5-create-your-admin-account)
6. [Set Up Firestore Database](#6-set-up-firestore-database)
7. [Configure Security Rules](#7-configure-security-rules)
8. [Restrict Your API Key (Recommended)](#8-restrict-your-api-key-recommended)
9. [Configure the App](#9-configure-the-app)
10. [Verify Everything Works](#10-verify-everything-works)

---

## 1. Create a Google Account

If you already have a Google/Gmail account, skip this step. Firebase is a Google service and requires a Google account.

## 2. Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Enter a project name, e.g. `dart-tournament`
   - Firebase will generate a unique project ID below the name (e.g. `dart-tournament-abc12`)
   - You can edit this ID if you want, but the default is fine
4. Click **Continue**
5. **Google Analytics**: you can disable this toggle - it's not needed for this app
6. Click **Create project**
7. Wait for the project to be created, then click **Continue**

You'll be taken to your Firebase project dashboard.

## 3. Register a Web App

Firebase needs to know your app is a web application to give you the right configuration keys.

1. On the project dashboard, click the **web icon** (`</>`) to add a web app
   - It's in the center of the page, next to the iOS and Android icons
2. Enter an app nickname, e.g. `dart-tournament-web`
3. **Do NOT** check "Also set up Firebase Hosting" (we're using GitHub Pages instead)
4. Click **Register app**
5. You'll see a code snippet with your Firebase configuration. It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdefg",
  authDomain: "dart-tournament-abc12.firebaseapp.com",
  projectId: "dart-tournament-abc12",
  storageBucket: "dart-tournament-abc12.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

6. **Copy these values** - you'll need them in step 9
7. Click **Continue to console**

## 4. Enable Authentication

Authentication lets you create admin accounts that can manage tournaments.

1. In the left sidebar, click **Build** > **Authentication**
   - If you don't see "Build", click the gear/settings icon or look for "All products"
2. Click **Get started**
3. You'll see a list of sign-in providers. Click **Email/Password**
4. Toggle **Enable** to ON for "Email/Password"
   - Leave "Email link (passwordless sign-in)" disabled
5. Click **Save**

## 5. Create Your Admin Account

Now create the email/password account you'll use to log into the admin interface.

1. Still in **Authentication**, click the **Users** tab at the top
2. Click **Add user**
3. Enter:
   - **Email**: your email address (e.g. `admin@yourdomain.com` or any valid email)
   - **Password**: choose a strong password (at least 6 characters)
4. Click **Add user**

You'll see the user appear in the list with a unique **User UID**. This is your admin account.

> **Tip**: You can create multiple admin accounts by repeating this step. Anyone with an account in your Firebase Authentication can log into the admin panel.

## 6. Set Up Firestore Database

Firestore is the database that stores all your tournament data (players, games, tournaments).

1. In the left sidebar, click **Build** > **Firestore Database**
2. Click **Create database**
3. **Database location**: choose the region closest to your players
   - For Europe: `europe-west1` (Belgium) or `europe-west3` (Frankfurt)
   - For US: `us-central1` (Iowa) or `us-east1` (South Carolina)
   - For Asia: `asia-southeast1` (Singapore)
   - **This cannot be changed later**, so choose carefully
4. **Security rules**: select **"Start in test mode"**
   - We'll set up proper rules in the next step
5. Click **Create**

Wait a moment for the database to be provisioned. You'll see an empty Firestore console.

> **Note**: The app will create collections (`players`, `games`, `tournaments`) automatically when you first add data. You don't need to create them manually.

## 7. Configure Security Rules

Security rules control who can read and write data. We want:
- **Anyone** can read (so users can see leaderboards and tournaments)
- **Only logged-in admins** can write (create players, record scores, etc.)

1. In Firestore, click the **Rules** tab at the top
2. Replace the existing rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Players: anyone can read, only authenticated admins can write
    match /players/{playerId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Games: anyone can read, only authenticated admins can write
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Tournaments: anyone can read, only authenticated admins can write
    match /tournaments/{tournamentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

These rules match the `firestore.rules` file in the project repository.

## 8. Restrict Your API Key (Recommended)

Firebase API keys are **not secret** (they're visible in your frontend code), but you should restrict them so they can only be used from your website.

1. Go to [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   - Make sure your Firebase project is selected in the top dropdown
2. You'll see an API key listed (usually named "Browser key (auto created by Firebase)")
3. Click on the key name to edit it
4. Under **Application restrictions**, select **"HTTP referrers (websites)"**
5. Under **Website restrictions**, click **Add**
6. Add your GitHub Pages URL:
   ```
   https://YOUR-GITHUB-USERNAME.github.io/dart-tournament/*
   ```
   - Also add `http://localhost:*/*` if you want local development to work
7. Click **Save**

Now your API key will only work when requests come from your website.

## 9. Configure the App

Now connect the app to your Firebase project.

### For Local Development

1. In the project root, copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in the values from step 3:
   ```
   VITE_FIREBASE_API_KEY=AIzaSyB1234567890abcdefg
   VITE_FIREBASE_AUTH_DOMAIN=dart-tournament-abc12.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=dart-tournament-abc12
   VITE_FIREBASE_STORAGE_BUCKET=dart-tournament-abc12.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```

3. **Never commit** the `.env` file (it's already in `.gitignore`)

### For GitHub Pages Deployment

Since the Firebase config is not secret (see above), you can either:

**Option A: Hardcode the config (simplest)**

Edit `src/services/firebase.ts` and replace the `import.meta.env` values with your actual config:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyB1234567890abcdefg",
  authDomain: "dart-tournament-abc12.firebaseapp.com",
  projectId: "dart-tournament-abc12",
  storageBucket: "dart-tournament-abc12.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};
```

**Option B: Use GitHub Actions environment variables**

1. In your GitHub repo, go to **Settings** > **Secrets and variables** > **Actions**
2. Click **Variables** tab (not Secrets - these are not secret)
3. Click **New repository variable** for each:
   - `VITE_FIREBASE_API_KEY` = your API key
   - `VITE_FIREBASE_AUTH_DOMAIN` = your auth domain
   - `VITE_FIREBASE_PROJECT_ID` = your project ID
   - `VITE_FIREBASE_STORAGE_BUCKET` = your storage bucket
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` = your sender ID
   - `VITE_FIREBASE_APP_ID` = your app ID

4. Update `.github/workflows/deploy.yml` to pass the variables to the build:

```yaml
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ vars.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ vars.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ vars.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ vars.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ vars.VITE_FIREBASE_APP_ID }}
```

## 10. Verify Everything Works

### Local Verification

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Open the app in your browser (usually `http://localhost:5173/dart-tournament/`)
3. Navigate to **Admin Login**
4. Log in with the email and password from step 5
5. Go to **Manage Players** and add a test player
6. If the player appears, everything is working

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase: Error (auth/invalid-api-key)" | Double-check your `VITE_FIREBASE_API_KEY` in `.env` |
| "Firebase: Error (auth/user-not-found)" | Make sure you created a user in step 5 |
| "FirebaseError: Missing or insufficient permissions" | Check your Firestore rules (step 7) were published |
| Data doesn't appear | Open browser DevTools Console (F12) and look for red errors |
| Login works but can't write data | Make sure Firestore rules allow `write: if request.auth != null` |
| "Failed to get document because the client is offline" | Check your Firestore database was created (step 6) |

---

## Firebase Free Tier Limits

Firebase has a generous free tier ("Spark plan") that should be plenty for a dart tournament app:

| Resource | Free Limit |
|----------|-----------|
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Firestore storage | 1 GB |
| Authentication users | Unlimited |
| Bandwidth | 10 GB/month |

You won't need to enter a credit card unless you exceed these limits.

---

## Recap: What You've Created

| Firebase Service | Purpose | How the App Uses It |
|-----------------|---------|-------------------|
| **Authentication** | Admin login | Email/password login to access tournament management |
| **Firestore** | Database | Stores players, games, tournaments with real-time syncing |
| **Security Rules** | Access control | Anyone can view, only admins can modify data |
| **API Key Restriction** | Abuse prevention | Limits API usage to your website domain only |
