import { useState } from "react";
import { useRouter } from "next/router";
import { ShieldHalf } from "lucide-react";
import { useLang } from "../lib/i18n";

export default function Login() {
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [teamName, setTeamName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body = mode === "signup" ? { teamName, username, password, accessCode } : { username, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/");
      } else {
        setError(data.error || t("login_error"));
      }
    } catch (e) {
      setError(t("login_error"));
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

      <div style={styles.brand}>
        <div style={styles.brandMark}><ShieldHalf size={20} color="#FFFFFF" /></div>
        <span style={styles.brandName}>TheCoachAssistant</span>
      </div>

      <form onSubmit={submit} style={styles.card}>
        <h1 style={styles.title}>{mode === "signup" ? t("signup_title") : t("login_title")}</h1>
        <p style={styles.sub}>{mode === "signup" ? t("signup_sub") : t("login_sub")}</p>

        {mode === "signup" && (
          <>
            <label style={styles.label}>{t("field_team_name")}</label>
            <input
              type="text" autoFocus value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={t("team_name_placeholder")}
              style={styles.input}
            />
            <label style={styles.label}>{t("field_access_code")}</label>
            <input
              type="text" value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder={t("access_code_placeholder")}
              style={styles.input}
            />
          </>
        )}
        <label style={styles.label}>{t("field_username")}</label>
        <input
          type="text"
          autoFocus={mode === "login"}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("username_placeholder")}
          style={styles.input}
        />
        <label style={styles.label}>{t("field_password")}</label>
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("login_placeholder")}
          style={styles.input}
        />
        {mode === "signup" && <p style={styles.hint}>{t("bootstrap_password_hint")}</p>}
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? t("login_verifying") : mode === "signup" ? t("bootstrap_button") : t("login_button")}
        </button>

        <p style={styles.switchRow}>
          {mode === "login" ? t("no_team_yet") : t("already_have_team")}{" "}
          <button type="button" style={styles.switchLink} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? t("create_team_link") : t("login_link")}
          </button>
        </p>
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
    gap: 20,
  },
  langSwitch: { display: "flex", gap: 6, position: "absolute", top: 24, right: 24 },
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
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: { width: 40, height: 40, borderRadius: "50%", background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: "18px", fontWeight: 700, color: "#14171F", letterSpacing: "-0.01em" },
  card: {
    background: "#FFFFFF",
    padding: "32px",
    borderRadius: "12px",
    width: "340px",
    maxWidth: "90vw",
    border: "1px solid #E2E5EA",
    boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
  },
  title: { color: "#14171F", fontSize: "19px", margin: "0 0 6px" },
  sub: { color: "#667085", fontSize: "13px", margin: "0 0 18px" },
  label: { display: "block", color: "#667085", fontSize: "11.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "5px" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #E2E5EA",
    background: "#FAFBFC",
    color: "#14171F",
    marginBottom: "14px",
    fontSize: "14px",
  },
  hint: { color: "#667085", fontSize: "12px", margin: "-8px 0 12px" },
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
  switchRow: { textAlign: "center", fontSize: "12.5px", color: "#667085", margin: "16px 0 0" },
  switchLink: { background: "none", border: "none", color: "#2563EB", fontWeight: 600, cursor: "pointer", fontSize: "12.5px", padding: 0 },
};
