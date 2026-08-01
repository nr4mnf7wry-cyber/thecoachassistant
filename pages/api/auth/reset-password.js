import { getUsers, saveUsers, hashPassword } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 8) {
      res.status(400).json({ error: "Lien invalide ou mot de passe trop court (8 caractères minimum)." });
      return;
    }
    const users = await getUsers();
    const user = users.find((u) => u.resetToken && u.resetToken === token);
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < Date.now()) {
      res.status(400).json({ error: "Ce lien de réinitialisation est invalide ou a expiré. Refais une demande." });
      return;
    }
    await saveUsers(users.map((u) => (
      u.id === user.id
        ? { ...u, passwordHash: hashPassword(password), resetToken: null, resetTokenExpiresAt: null, sessionToken: null }
        : u
    )));
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
