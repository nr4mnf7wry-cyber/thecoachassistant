import { useState } from "react";
import { useRouter } from "next/router";
import { useLang } from "../lib/i18n";

export default function Login() {
  const { t, lang, setLang } = useLang();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        setError(t("login_error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.langSwitch}>
        <button style={styles.langBtn(lang === "fr")} onClick={() => setLang("fr")}>FR</button>
        <button style={styles.langBtn(lang === "nl")} onClick={() => setLang("nl")}>NL</button>
      </div>
      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>{t("login_title")}</h1>
        <p style={styles.sub}>{t("login_sub")}</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("login_placeholder")}
          style={styles.input}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? t("login_verifying") : t("login_button")}
        </button>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#F5F6F8",
    fontFamily: "sans-serif",
    gap: 16,
  },
  langSwitch: { display: "flex", gap: 6 },
  langBtn: (active) => ({
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid #E2E5EA",
    background: active ? "#2563EB" : "transparent",
    color: active ? "#FFFFFF" : "#667085",
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
  }),
  card: {
    background: "#FFFFFF",
    padding: "32px",
    borderRadius: "12px",
    width: "320px",
    maxWidth: "90vw",
    border: "1px solid #E2E5EA",
    boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
  },
  title: { color: "#14171F", fontSize: "19px", margin: "0 0 6px" },
  sub: { color: "#667085", fontSize: "13px", margin: "0 0 18px" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #E2E5EA",
    background: "#FAFBFC",
    color: "#14171F",
    marginBottom: "12px",
    fontSize: "14px",
  },
  error: { color: "#DC2626", fontSize: "13px", margin: "0 0 12px" },
  button: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    background: "#2563EB",
    color: "#FFFFFF",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },
};
