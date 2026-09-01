import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length) {
    app = existing[0]!;
    return app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase admin credentials are not set");
  }

  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return app;
}

export async function verifyIdToken(token: string) {
  return getAuth(getAdminApp()).verifyIdToken(token);
}

export async function createSessionCookie(idToken: string, expiresInMs: number) {
  return getAuth(getAdminApp()).createSessionCookie(idToken, { expiresIn: expiresInMs });
}

export async function verifySessionCookie(cookie: string) {
  return getAuth(getAdminApp()).verifySessionCookie(cookie, true);
}
