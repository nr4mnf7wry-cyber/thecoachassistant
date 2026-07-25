import crypto from "crypto";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const USERS_KEY = "team-users";
export const SESSION_COOKIE = "session";

/* ---------------- mots de passe (scrypt natif Node, sans dépendance) ---------------- */

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ---------------- utilisateurs (stockés dans Redis, clé séparée des données d'équipe) ---------------- */

export async function getUsers() {
  const users = await redis.get(USERS_KEY);
  return users || [];
}

export async function saveUsers(users) {
  await redis.set(USERS_KEY, users);
}

export function publicUser(u) {
  return { id: u.id, username: u.username, role: u.role, createdAt: u.createdAt };
}

/* ---------------- sessions (jeton aléatoire opaque, stocké sur l'utilisateur) ---------------- */

export function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function getUserBySession(token) {
  if (!token) return null;
  const users = await getUsers();
  return users.find((u) => u.sessionToken === token) || null;
}

export function parseCookies(cookieHeader) {
  const out = {};
  (cookieHeader || "").split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

export async function getSessionUser(req) {
  const cookies = parseCookies(req.headers.cookie);
  return getUserBySession(cookies[SESSION_COOKIE]);
}

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax; Secure`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
}
