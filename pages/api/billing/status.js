import { getSessionUser, getClub } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    const user = await getSessionUser(req);
    if (!user) { res.status(401).json({ error: "Non connecté." }); return; }
    const club = await getClub(user.clubId);
    if (!club) { res.status(404).json({ error: "Équipe introuvable." }); return; }
    res.status(200).json({
      subscriptionStatus: club.subscriptionStatus || "trialing",
      trialEndsAt: club.trialEndsAt || null,
      hasStripeCustomer: !!club.stripeCustomerId,
      billingConfigured: !!process.env.STRIPE_SECRET_KEY,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
