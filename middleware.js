import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  if (token) {
    try {
      const redis = Redis.fromEnv();
      const [users, legacyUsers] = await Promise.all([
        redis.get("app-users"),
        redis.get("team-users"),
      ]);
      const allUsers = [...(users || []), ...(legacyUsers || [])];
      if (allUsers.some((u) => u.sessionToken === token)) {
        return NextResponse.next();
      }
    } catch (e) {
      console.error("Erreur de vérification de session", e);
    }
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
