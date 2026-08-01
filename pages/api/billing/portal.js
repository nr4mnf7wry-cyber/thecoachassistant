import { getSessionUser, getClub } from "../../../lib/auth";
import { stripeRequest } from "../../../lib/stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const user = await getSessionUser(req);
    if (!user) { res.status(401).json({ error: "Non connecté." }); return; }
    if (user.role !== "head") { res.status(403).json({ error: "Réservé à l'entraîneur principal." }); return; }
    if (!process.env.STRIPE_SECRET_KEY) {
      res.status(503).json({ error: "La facturation n'est pas encore configurée." });
      return;
    }

    const club = await getClub(user.clubId);
    if (!club || !club.stripeCustomerId) {
      res.status(400).json({ error: "Aucun abonnement associé à cette équipe pour l'instant." });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const session = await stripeRequest("/billing_portal/sessions", {
      customer: club.stripeCustomerId,
      return_url: `${baseUrl}/`,
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}
