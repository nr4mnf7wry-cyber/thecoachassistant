import crypto from "crypto";

const STRIPE_API = "https://api.stripe.com/v1";

// Convertit un objet (éventuellement imbriqué) au format x-www-form-urlencoded attendu par
// l'API Stripe, ex. { line_items: [{ price: "x" }] } -> line_items[0][price]=x
function toFormBody(obj, prefix = "") {
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object") parts.push(toFormBody(item, `${fullKey}[${i}]`));
        else parts.push(`${encodeURIComponent(`${fullKey}[${i}]`)}=${encodeURIComponent(item)}`);
      });
    } else if (typeof value === "object") {
      parts.push(toFormBody(value, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join("&");
}

export async function stripeRequest(endpoint, params, method = "POST") {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY manquant.");
  const url = method === "GET" ? `${STRIPE_API}${endpoint}?${toFormBody(params || {})}` : `${STRIPE_API}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : toFormBody(params || {}),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || "Erreur Stripe";
    throw new Error(message);
  }
  return data;
}

// Vérifie manuellement la signature d'un webhook Stripe (pas de SDK disponible ici).
export function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")));
  const timestamp = parts.t;
  const receivedSig = parts.v1;
  if (!timestamp || !receivedSig) return false;
  const expectedSig = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expectedSig, "hex");
  const b = Buffer.from(receivedSig, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString("utf8");
}
