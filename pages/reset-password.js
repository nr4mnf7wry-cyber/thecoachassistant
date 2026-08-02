import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ShieldHalf } from "lucide-react";
import { useLang } from "../lib/i18n";

export default function ResetPassword() {
  const { t } = useLang();
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError(t("reset_password_mismatch")); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) setDone(true);
      else setError(data.error || t("login_error"));
    } catch (e) {
      setError(t("login_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600&display=swap" rel="stylesheet" />
      </Head>
      <div style={styles.page}>
        <div style={styles.brand}>
          <div style={styles.brandMark}><ShieldHalf size={20} color="#F7F7F2" /></div>
          <span style={styles.brandName}>TheCoachAssistant</span>
        </div>

        <div style={styles.card}>
          <h1 style={styles.title}>{t("reset_password_title")}</h1>
          {done ? (
            <>
              <p style={styles.sub}>{t("reset_password_success")}</p>
              <button style={styles.button} onClick={() => router.push("/login")}>{t("login_link")}</button>
            </>
          ) : !token ? (
            <p style={styles.error}>{t("reset_password_invalid")}</p>
          ) : (
            <form onSubmit={submit}>
              <label style={styles.label}>{t("reset_password_new")}</label>
              <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
              <label style={styles.label}>{t("reset_password_confirm")}</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={styles.input} />
              <p style={styles.hint}>{t("bootstrap_password_hint")}</p>
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" disabled={loading} style={styles.button}>
                {loading ? t("login_verifying") : t("reset_password_button")}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F7F7F2", fontFamily: "'Inter', sans-serif", gap: 20 },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: { width: 40, height: 40, borderRadius: "50%", background: "#1E4A36", display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontFamily: "'Oswald', sans-serif", fontSize: "17px", fontWeight: 600, color: "#16201B", letterSpacing: "0.01em", textTransform: "uppercase" },
  card: { background: "#FFFFFF", padding: "32px", borderRadius: "14px", width: "340px", maxWidth: "90vw", border: "1px solid #E5E5DB", boxShadow: "0 8px 28px rgba(20,35,25,0.07)" },
  title: { fontFamily: "'Oswald', sans-serif", color: "#16201B", fontSize: "19px", fontWeight: 600, margin: "0 0 14px" },
  sub: { color: "#6B7568", fontSize: "13px", margin: "0 0 18px" },
  label: { display: "block", color: "#6B7568", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 13px", borderRadius: "7px", border: "1px solid #E5E5DB", background: "#FAFAF6", color: "#16201B", marginBottom: "16px", fontSize: "14px" },
  hint: { color: "#6B7568", fontSize: "12px", margin: "-10px 0 14px" },
  error: { color: "#B3261E", fontSize: "13px", margin: "0 0 14px" },
  button: { width: "100%", padding: "11px", borderRadius: "7px", border: "none", background: "#D9A62E", color: "#16201B", fontWeight: 700, cursor: "pointer", fontSize: "14px" },
};
