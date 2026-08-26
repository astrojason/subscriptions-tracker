import { getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// The Firebase Auth JS SDK relies on browser storage and isn't meant to run
// during server-side rendering. Only initialize it in the browser so builds
// and SSR passes don't fail when real Firebase credentials aren't present.
export const auth: Auth =
  typeof window === "undefined" ? (undefined as unknown as Auth) : getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
