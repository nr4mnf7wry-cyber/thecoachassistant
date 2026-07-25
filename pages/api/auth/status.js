import { getUsers } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    const users = await getUsers();
    res.status(200).json({ hasUsers: users.length > 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Impossible de vérifier l'état des comptes." });
  }
}
