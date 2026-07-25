import { getUsers, saveUsers, verifyPassword, newSessionToken, setSessionCookie, publicUser, migrateLegacyIfNeeded } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    await migrateLegacyIfNeeded();
    const { username, password } = req.body || {};
    const users = await getUsers();
    const user = users.find((u) => u.username.toLowerCase() === String(username || "").trim().toLowerCase());
    if (!user || !verifyPassword(password || "", user.passwordHash)) {
      res.status(401).json({ error: "Identifiants incorrects." });
      return;
    }
    const sessionToken = newSessionToken();
    const nextUsers = users.map((u) => (u.id === user.id ? { ...u, sessionToken } : u));
    await saveUsers(nextUsers);
    setSessionCookie(res, sessionToken);
    res.status(200).json({ ok: true, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible de se connecter." });
  }
}
