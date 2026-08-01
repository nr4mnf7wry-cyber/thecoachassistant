import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { getSessionUser } from "../../lib/auth";

const redis = Redis.fromEnv();
const KEY = "app-feedback";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const user = await getSessionUser(req);
    if (!user) { res.status(401).json({ error: "Non connecté." }); return; }
    const { message } = req.body || {};
    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) { res.status(400).json({ error: "Message vide." }); return; }

    const existing = (await redis.get(KEY)) || [];
    const entry = {
      id: crypto.randomUUID(),
      clubId: user.clubId,
      username: user.username,
      message: cleanMessage.slice(0, 2000),
      at: new Date().toISOString(),
    };
    await redis.set(KEY, [...existing, entry].slice(-500));
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
