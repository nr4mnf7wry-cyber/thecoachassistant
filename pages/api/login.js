export default function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const { password } = req.body || {};

  if (!process.env.SITE_PASSWORD) {
    res.status(500).json({ error: "SITE_PASSWORD n'est pas configuré sur le serveur." });
    return;
  }

  if (password && password === process.env.SITE_PASSWORD) {
    res.setHeader(
      "Set-Cookie",
      `auth=${process.env.SITE_PASSWORD}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax; Secure`
    );
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
}
