import { getSessionUser, getClub, updateClub } from "../../../lib/auth";
import { stripeRequest } from "../../../lib/stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const user = await getSessionUser(req);
    if (!user) { res.status(401).json({ error: "Non connecté." }); return; }
    if (user.role !== "head") { res.status(403).json({ error: "Réservé à l'entraîneur principal." }); return; }
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      res.status(503).json({ error: "La facturation n'est pas encore configurée." });
      return;
    }

    const club = await getClub(user.clubId);
    if (!club) { res.status(404).json({ error: "Équipe introuvable." }); return; }

    let customerId = club.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeRequest("/customers", {
        email: user.email || undefined,
        name: club.name,
        metadata: { clubId: club.id },
      });
      customerId = customer.id;
      await updateClub(club.id, { stripeCustomerId: customerId });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const session = await stripeRequest("/checkout/sessions", {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancelled`,
      client_reference_id: club.id,
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erreur serveur." });
  }
}
