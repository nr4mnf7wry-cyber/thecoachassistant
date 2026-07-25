import { getSessionUser, getUsers, saveUsers, clearSessionCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    const user = await getSessionUser(req);
    if (user) {
      const users = await getUsers();
      await saveUsers(users.map((u) => (u.id === user.id ? { ...u, sessionToken: null } : u)));
    }
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  }
}
