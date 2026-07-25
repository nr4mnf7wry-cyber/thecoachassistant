import { Redis } from "@upstash/redis";
import { getSessionUser, teamDataKey } from "../../lib/auth";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Non connecté." }); return; }
  if (!user.clubId) { res.status(409).json({ error: "Compte non rattaché à une équipe." }); return; }
  const key = teamDataKey(user.clubId);

  if (req.method === "GET") {
    try {
      const data = await redis.get(key);
      res.status(200).json(data || {});
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Impossible de charger les données." });
    }
    return;
  }

  if (req.method === "POST") {
    if (user.role !== "head") { res.status(403).json({ error: "Lecture seule : réservé à l'entraîneur principal." }); return; }
    try {
      await redis.set(key, req.body);
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Impossible d'enregistrer les données." });
    }
    return;
  }

  res.status(405).end();
}
