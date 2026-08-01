import { useState } from "react";
import { useRouter } from "next/router";
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
    <div style={styles.page}>
      <div style={styles.brand}>
        <div style={styles.brandMark}><ShieldHalf size={20} color="#FFFFFF" /></div>
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
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F6F8", fontFamily: "sans-serif", gap: 20 },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: { width: 40, height: 40, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: "18px", fontWeight: 700, color: "#14171F", letterSpacing: "-0.01em" },
  card: { background: "#FFFFFF", padding: "32px", borderRadius: "12px", width: "340px", maxWidth: "90vw", border: "1px solid #E2E5EA", boxShadow: "0 4px 16px rgba(15,23,42,0.06)" },
  title: { color: "#14171F", fontSize: "19px", margin: "0 0 14px" },
  sub: { color: "#667085", fontSize: "13px", margin: "0 0 18px" },
  label: { display: "block", color: "#667085", fontSize: "11.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "5px" },
  input: { width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #E2E5EA", background: "#FAFBFC", color: "#14171F", marginBottom: "14px", fontSize: "14px" },
  hint: { color: "#667085", fontSize: "12px", margin: "-8px 0 12px" },
  error: { color: "#DC2626", fontSize: "13px", margin: "0 0 12px" },
  button: { width: "100%", padding: "10px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFFFFF", fontWeight: 600, cursor: "pointer", fontSize: "14px" },
};
