import { getSessionUser, publicUser } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    const user = await getSessionUser(req);
    if (!user) { res.status(200).json({ authenticated: false }); return; }
    res.status(200).json({ authenticated: true, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur." });
  }
}
