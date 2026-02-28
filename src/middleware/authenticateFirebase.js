import { firebaseAuth } from "../lib/firebaseAdmin.js";

const extractBearerToken = (headerValue = "") => {
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
};

export const authenticateFirebase = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing Firebase bearer token." });
  }

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? decoded.email?.split("@")[0] ?? "User",
    };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid Firebase token." });
  }
};

