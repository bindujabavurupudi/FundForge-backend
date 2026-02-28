import admin from "firebase-admin";
import { env } from "../config/env.js";

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  if (env.firebaseServiceAccountJson) {
    const serviceAccount = JSON.parse(env.firebaseServiceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.initializeApp({
    projectId: env.firebaseProjectId || undefined,
  });
};

initializeFirebaseAdmin();

export const firebaseAuth = admin.auth();

