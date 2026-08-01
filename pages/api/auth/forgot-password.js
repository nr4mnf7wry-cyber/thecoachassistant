import { getUsers, saveUsers, newResetToken } from "../../../lib/auth";

async function sendResetEmail(to, username, resetUrl) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY manquant : impossible d'envoyer l'e-mail de réinitialisation.");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "TheCoachAssistant <onboarding@resend.dev>",
      to: [to],
      subject: "Réinitialise ton mot de passe",
      html: `<p>Bonjour ${username},</p><p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le lien ci-dessous (valable 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.</p>`,
    }),
  });
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const { username } = req.body || {};
    const cleanUsername = String(username || "").trim();
    // Réponse volontairement identique que le compte existe ou non, pour ne pas
    // révéler quels noms d'utilisateur sont enregistrés.
    const genericMessage = "Si ce compte existe, un e-mail de réinitialisation vient d'être envoyé.";
    if (!cleanUsername) { res.status(200).json({ message: genericMessage }); return; }

    const users = await getUsers();
    const user = users.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (!user || !user.email) { res.status(200).json({ message: genericMessage }); return; }

    const token = newResetToken();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 heure
    await saveUsers(users.map((u) => (u.id === user.id ? { ...u, resetToken: token, resetTokenExpiresAt: expiresAt } : u)));

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const sent = await sendResetEmail(user.email, user.username, resetUrl);
    if (!sent) {
      res.status(200).json({ message: "Le service d'e-mail n'est pas encore configuré (RESEND_API_KEY manquant). Contacte l'administrateur." });
      return;
    }
    res.status(200).json({ message: genericMessage });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
