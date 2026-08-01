import crypto from "crypto";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const USERS_KEY = "app-users";
const CLUBS_KEY = "app-clubs";
const LEGACY_TEAM_DATA_KEY = "team-data";
const LEGACY_USERS_KEY = "team-users";
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

/* ---------------- clubs (un tiroir de données isolé par club) ---------------- */

export function teamDataKey(clubId) {
  return `team-data:${clubId}`;
}

export async function getClubs() {
  const clubs = await redis.get(CLUBS_KEY);
  return clubs || [];
}

export async function saveClubs(clubs) {
  await redis.set(CLUBS_KEY, clubs);
}

export async function createClub(name) {
  const clubs = await getClubs();
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 jours d'essai
  const club = {
    id: crypto.randomUUID(), name: name || "Mon Équipe", createdAt: new Date().toISOString(),
    subscriptionStatus: "trialing", trialEndsAt, stripeCustomerId: null, stripeSubscriptionId: null,
  };
  await saveClubs([...clubs, club]);
  return club;
}

export async function getClub(clubId) {
  const clubs = await getClubs();
  return clubs.find((c) => c.id === clubId) || null;
}

export async function updateClub(clubId, fields) {
  const clubs = await getClubs();
  const next = clubs.map((c) => (c.id === clubId ? { ...c, ...fields } : c));
  await saveClubs(next);
  return next.find((c) => c.id === clubId);
}

// Un club a accès tant qu'il est en période d'essai (30 jours) ou que son abonnement est actif.
export function clubHasAccess(club) {
  if (!club) return false;
  if (club.subscriptionStatus === "active") return true;
  if (club.subscriptionStatus === "trialing" && club.trialEndsAt && new Date(club.trialEndsAt) > new Date()) return true;
  return false;
}

/* ---------------- utilisateurs (un annuaire global, chacun rattaché à un club) ---------------- */

export async function getUsers() {
  const users = await redis.get(USERS_KEY);
  return users || [];
}

export async function saveUsers(users) {
  await redis.set(USERS_KEY, users);
}

export function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email || "", role: u.role, permissionLevel: u.permissionLevel || "readonly", clubId: u.clubId, createdAt: u.createdAt };
}

/* ---------------- migration transparente depuis l'ancien système à un seul club ---------------- */
// Si d'anciennes données/anciens comptes existent encore sous les anciennes clés (avant la
// gestion multi-clubs), on les rapatrie automatiquement sous un nouveau club, une seule fois.

export async function migrateLegacyIfNeeded() {
  const [users, legacyUsers] = await Promise.all([getUsers(), redis.get(LEGACY_USERS_KEY)]);
  if (users.length > 0 || !legacyUsers || legacyUsers.length === 0) return;

  const legacyData = await redis.get(LEGACY_TEAM_DATA_KEY);
  const club = await createClub((legacyData && legacyData.teamName) || "Mon Équipe");
  await redis.set(teamDataKey(club.id), legacyData || {});
  const migratedUsers = legacyUsers.map((u) => ({ ...u, clubId: club.id }));
  await saveUsers(migratedUsers);
}

/* ---------------- sessions (jeton aléatoire opaque, stocké sur l'utilisateur) ---------------- */

export function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function newResetToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function getUserBySession(token) {
  if (!token) return null;
  await migrateLegacyIfNeeded();
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
