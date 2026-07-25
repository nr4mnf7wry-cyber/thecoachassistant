import crypto from "crypto";
import { getSessionUser, getUsers, saveUsers, hashPassword, publicUser } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) { res.status(401).json({ error: "Non connecté." }); return; }
    if (sessionUser.role !== "head") { res.status(403).json({ error: "Réservé à l'entraîneur principal." }); return; }

    const users = await getUsers();

    if (req.method === "GET") {
      res.status(200).json({ users: users.map(publicUser) });
      return;
    }

    if (req.method === "POST") {
      const { username, password } = req.body || {};
      const cleanUsername = String(username || "").trim();
      if (!cleanUsername || !password || password.length < 8) {
        res.status(400).json({ error: "Nom d'utilisateur requis et mot de passe d'au moins 8 caractères." });
        return;
      }
      if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
        res.status(409).json({ error: "Ce nom d'utilisateur existe déjà." });
        return;
      }
      const newUser = {
        id: crypto.randomUUID(),
        username: cleanUsername,
        passwordHash: hashPassword(password),
        role: "assistant",
        createdAt: new Date().toISOString(),
        sessionToken: null,
      };
      await saveUsers([...users, newUser]);
      res.status(200).json({ ok: true, user: publicUser(newUser) });
      return;
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) { res.status(400).json({ error: "id requis." }); return; }
      const target = users.find((u) => u.id === id);
      if (target && target.role === "head") { res.status(400).json({ error: "Impossible de supprimer le compte entraîneur principal." }); return; }
      await saveUsers(users.filter((u) => u.id !== id));
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
