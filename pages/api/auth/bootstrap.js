import crypto from "crypto";
import { getUsers, saveUsers, hashPassword, newSessionToken, setSessionCookie, publicUser } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const users = await getUsers();
    if (users.length > 0) {
      res.status(409).json({ error: "Un compte existe déjà." });
      return;
    }
    const { username, password } = req.body || {};
    const cleanUsername = String(username || "").trim();
    if (!cleanUsername || !password || password.length < 8) {
      res.status(400).json({ error: "Nom d'utilisateur requis et mot de passe d'au moins 8 caractères." });
      return;
    }
    const sessionToken = newSessionToken();
    const user = {
      id: crypto.randomUUID(),
      username: cleanUsername,
      passwordHash: hashPassword(password),
      role: "head",
      createdAt: new Date().toISOString(),
      sessionToken,
    };
    await saveUsers([user]);
    setSessionCookie(res, sessionToken);
    res.status(200).json({ ok: true, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible de créer le compte." });
  }
}
