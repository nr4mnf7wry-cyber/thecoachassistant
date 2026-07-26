import crypto from "crypto";
import { getUsers, saveUsers, hashPassword, newSessionToken, setSessionCookie, publicUser, createClub, migrateLegacyIfNeeded } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    await migrateLegacyIfNeeded();
    const { teamName, username, password, accessCode } = req.body || {};

    if (!process.env.SIGNUP_CODE) {
      res.status(503).json({ error: "Les inscriptions ne sont pas encore ouvertes." });
      return;
    }
    if (!accessCode || accessCode !== process.env.SIGNUP_CODE) {
      res.status(403).json({ error: "Code d'accès incorrect." });
      return;
    }

    const cleanTeamName = String(teamName || "").trim();
    const cleanUsername = String(username || "").trim();
    if (!cleanTeamName || !cleanUsername || !password || password.length < 8) {
      res.status(400).json({ error: "Nom d'équipe et nom d'utilisateur requis, mot de passe d'au moins 8 caractères." });
      return;
    }
    const users = await getUsers();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      res.status(409).json({ error: "Ce nom d'utilisateur existe déjà. Choisis-en un autre." });
      return;
    }

    const club = await createClub(cleanTeamName);
    const sessionToken = newSessionToken();
    const user = {
      id: crypto.randomUUID(),
      clubId: club.id,
      username: cleanUsername,
      passwordHash: hashPassword(password),
      role: "head",
      createdAt: new Date().toISOString(),
      sessionToken,
    };
    await saveUsers([...users, user]);
    setSessionCookie(res, sessionToken);
    res.status(200).json({ ok: true, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible de créer l'équipe." });
  }
}
