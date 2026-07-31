import crypto from "crypto";
import { getSessionUser, getUsers, saveUsers, hashPassword, publicUser } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) { res.status(401).json({ error: "Non connecté." }); return; }
    if (sessionUser.role !== "head") { res.status(403).json({ error: "Réservé à l'entraîneur principal." }); return; }

    const allUsers = await getUsers();
    // Cloisonnement strict : on ne travaille jamais que sur les comptes du même club que le demandeur.
    const clubUsers = allUsers.filter((u) => u.clubId === sessionUser.clubId);
    const otherUsers = allUsers.filter((u) => u.clubId !== sessionUser.clubId);

    if (req.method === "GET") {
      res.status(200).json({ users: clubUsers.map(publicUser) });
      return;
    }

    if (req.method === "POST") {
      const { username, password, permissionLevel } = req.body || {};
      const cleanUsername = String(username || "").trim();
      if (!cleanUsername || !password || password.length < 8) {
        res.status(400).json({ error: "Nom d'utilisateur requis et mot de passe d'au moins 8 caractères." });
        return;
      }
      if (allUsers.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
        res.status(409).json({ error: "Ce nom d'utilisateur existe déjà." });
        return;
      }
      const newUser = {
        id: crypto.randomUUID(),
        clubId: sessionUser.clubId,
        username: cleanUsername,
        passwordHash: hashPassword(password),
        role: "assistant",
        permissionLevel: permissionLevel === "editor" ? "editor" : "readonly",
        createdAt: new Date().toISOString(),
        sessionToken: null,
      };
      await saveUsers([...allUsers, newUser]);
      res.status(200).json({ ok: true, user: publicUser(newUser) });
      return;
    }

    if (req.method === "PATCH") {
      const { id, permissionLevel } = req.body || {};
      if (!id || (permissionLevel !== "editor" && permissionLevel !== "readonly")) {
        res.status(400).json({ error: "Paramètres invalides." });
        return;
      }
      const target = clubUsers.find((u) => u.id === id);
      if (!target) { res.status(404).json({ error: "Compte introuvable." }); return; }
      if (target.role === "head") { res.status(400).json({ error: "Le niveau de l'entraîneur principal ne se modifie pas." }); return; }
      const updated = clubUsers.map((u) => (u.id === id ? { ...u, permissionLevel } : u));
      await saveUsers([...otherUsers, ...updated]);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) { res.status(400).json({ error: "id requis." }); return; }
      const target = clubUsers.find((u) => u.id === id);
      if (!target) { res.status(404).json({ error: "Compte introuvable." }); return; }
      if (target.role === "head") { res.status(400).json({ error: "Impossible de supprimer le compte entraîneur principal." }); return; }
      await saveUsers([...otherUsers, ...clubUsers.filter((u) => u.id !== id)]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
