import { getClubs, saveClubs } from "../../../lib/auth";
import { verifyStripeSignature, readRawBody } from "../../../lib/stripe";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (!process.env.STRIPE_WEBHOOK_SECRET) { res.status(503).json({ error: "Webhook non configuré." }); return; }

  const rawBody = await readRawBody(req);
  const signature = req.headers["stripe-signature"];
  if (!verifyStripeSignature(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
    res.status(400).json({ error: "Signature invalide." });
    return;
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    res.status(400).json({ error: "Corps invalide." });
    return;
  }

  try {
    const obj = event.data?.object;
    const clubs = await getClubs();

    const findByCustomer = (customerId) => clubs.find((c) => c.stripeCustomerId === customerId);
    const findByClientRef = (ref) => clubs.find((c) => c.id === ref);

    if (event.type === "checkout.session.completed") {
      const club = findByClientRef(obj.client_reference_id) || findByCustomer(obj.customer);
      if (club) {
        await saveClubs(clubs.map((c) => (c.id === club.id
          ? { ...c, stripeCustomerId: obj.customer, stripeSubscriptionId: obj.subscription, subscriptionStatus: "active" }
          : c)));
      }
    } else if (event.type === "customer.subscription.updated") {
      const club = findByCustomer(obj.customer);
      if (club) {
        const status = obj.status === "active" || obj.status === "trialing" ? "active" : obj.status;
        await saveClubs(clubs.map((c) => (c.id === club.id ? { ...c, subscriptionStatus: status } : c)));
      }
    } else if (event.type === "customer.subscription.deleted") {
      const club = findByCustomer(obj.customer);
      if (club) {
        await saveClubs(clubs.map((c) => (c.id === club.id ? { ...c, subscriptionStatus: "cancelled" } : c)));
      }
    }

    res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
