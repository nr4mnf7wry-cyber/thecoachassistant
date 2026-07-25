import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY = "team-data";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const data = await redis.get(KEY);
      res.status(200).json(data || {});
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Impossible de charger les données." });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      await redis.set(KEY, req.body);
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Impossible d'enregistrer les données." });
    }
    return;
  }

  res.status(405).end();
}
