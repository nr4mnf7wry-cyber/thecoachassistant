import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { ShieldHalf, Users, UserCheck, BarChart3 } from "lucide-react";
import { useLang } from "../lib/i18n";

export default function Login() {
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [teamName, setTeamName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        setNotice(data.message || t("forgot_password_sent"));
        setLoading(false);
        return;
      }
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body = mode === "signup" ? { teamName, username, password, accessCode, email } : { username, password };
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

  const valueProps = [
    { Icon: Users, text: t("login_value_1") },
    { Icon: UserCheck, text: t("login_value_2") },
    { Icon: BarChart3, text: t("login_value_3") },
  ];

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="lp-page">
        <div className="lp-turf">
          <svg className="lp-turf-texture" viewBox="0 0 600 900" preserveAspectRatio="none">
            <defs>
              <pattern id="stripes" width="80" height="900" patternUnits="userSpaceOnUse">
                <rect width="40" height="900" fill="rgba(255,255,255,0.025)" />
              </pattern>
            </defs>
            <rect width="600" height="900" fill="url(#stripes)" />
            <circle cx="600" cy="900" r="130" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" />
            <path d="M 0 300 A 300 300 0 0 1 300 0" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <line x1="0" y1="620" x2="600" y2="620" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          </svg>

          <div className="lp-turf-content">
            <div className="lp-brand">
              <div className="lp-brand-mark"><ShieldHalf size={20} color="#173A29" /></div>
              <span className="lp-brand-name">TheCoachAssistant</span>
            </div>

            <h1 className="lp-headline">{t("login_hero_headline")}</h1>

            <ul className="lp-values">
              {valueProps.map(({ Icon, text }, i) => (
                <li key={i}><Icon size={17} /><span>{text}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lp-form-panel">
          <div className="lp-lang-switch">
            <button className={"lp-lang-btn" + (lang === "fr" ? " active" : "")} onClick={() => setLang("fr")}>FR</button>
            <button className={"lp-lang-btn" + (lang === "nl" ? " active" : "")} onClick={() => setLang("nl")}>NL</button>
          </div>

          <form onSubmit={submit} className="lp-card">
            <h2 className="lp-title">{mode === "signup" ? t("signup_title") : mode === "forgot" ? t("forgot_password_title") : t("login_title")}</h2>
            <p className="lp-sub">{mode === "signup" ? t("signup_sub") : mode === "forgot" ? t("forgot_password_sub") : t("login_sub")}</p>

            {mode === "signup" && (
              <>
                <label className="lp-label">{t("field_team_name")}</label>
                <input type="text" autoFocus value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t("team_name_placeholder")} className="lp-input" />
                <label className="lp-label">{t("field_email")}</label>
                <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder={t("email_placeholder")} className="lp-input" />
                <label className="lp-label">{t("field_access_code")}</label>
                <input type="text" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder={t("access_code_placeholder")} className="lp-input" />
              </>
            )}
            <label className="lp-label">{t("field_username")}</label>
            <input
              type="text" autoFocus={mode !== "signup"} autoComplete="username" value={username}
              onChange={(e) => setUsername(e.target.value)} placeholder={t("username_placeholder")} className="lp-input"
            />
            {mode !== "forgot" && (
              <>
                <label className="lp-label">{t("field_password")}</label>
                <input
                  type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder={t("login_placeholder")} className="lp-input"
                />
              </>
            )}
            {mode === "signup" && <p className="lp-hint">{t("bootstrap_password_hint")}</p>}
            {mode === "login" && (
              <p style={{ textAlign: "right", margin: "-8px 0 14px" }}>
                <button type="button" className="lp-link" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>
                  {t("forgot_password_link")}
                </button>
              </p>
            )}
            {error && <p className="lp-error">{error}</p>}
            {notice && <p className="lp-notice">{notice}</p>}
            <button type="submit" disabled={loading} className="lp-button">
              {loading ? t("login_verifying") : mode === "signup" ? t("bootstrap_button") : mode === "forgot" ? t("forgot_password_button") : t("login_button")}
            </button>

            <p className="lp-switch-row">
              {mode === "forgot" ? (
                <button type="button" className="lp-link" onClick={() => { setMode("login"); setError(""); setNotice(""); }}>{t("login_link")}</button>
              ) : (
                <>
                  {mode === "login" ? t("no_team_yet") : t("already_have_team")}{" "}
                  <button type="button" className="lp-link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
                    {mode === "login" ? t("create_team_link") : t("login_link")}
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </div>

      <style jsx>{`
        .lp-page { min-height: 100vh; display: flex; font-family: 'Inter', sans-serif; }

        .lp-turf {
          flex: 1.1; position: relative; overflow: hidden;
          background: linear-gradient(160deg, #1E4A36 0%, #173A29 60%, #122E20 100%);
          display: flex; align-items: center; padding: 56px;
        }
        .lp-turf-texture { position: absolute; inset: 0; width: 100%; height: 100%; }
        .lp-turf-content { position: relative; z-index: 1; max-width: 420px; }
        .lp-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 48px; }
        .lp-brand-mark { width: 34px; height: 34px; border-radius: 50%; background: #F7F7F2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .lp-brand-name { font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600; color: #F7F7F2; letter-spacing: 0.01em; text-transform: uppercase; }
        .lp-headline {
          font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 40px; line-height: 1.12;
          color: #FAFAF6; margin: 0 0 32px; letter-spacing: -0.01em;
        }
        .lp-values { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
        .lp-values li { display: flex; align-items: center; gap: 12px; color: rgba(250,250,246,0.88); font-size: 14.5px; }
        .lp-values li svg { color: #D9A62E; flex-shrink: 0; }

        .lp-form-panel { flex: 1; background: #F7F7F2; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; position: relative; }
        .lp-lang-switch { position: absolute; top: 24px; right: 24px; display: flex; gap: 6px; }
        .lp-lang-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #DEDED4; background: transparent; color: #5B6459; font-weight: 600; font-size: 12px; cursor: pointer; }
        .lp-lang-btn.active { background: #1E4A36; border-color: #1E4A36; color: #FAFAF6; }

        .lp-card { background: #FFFFFF; padding: 36px; border-radius: 14px; width: 360px; max-width: 100%; border: 1px solid #E5E5DB; box-shadow: 0 8px 28px rgba(20,35,25,0.07); }
        .lp-title { font-family: 'Oswald', sans-serif; color: #16201B; font-size: 21px; font-weight: 600; margin: 0 0 6px; }
        .lp-sub { color: #6B7568; font-size: 13px; margin: 0 0 22px; line-height: 1.4; }
        .lp-label { display: block; color: #6B7568; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
        .lp-input {
          width: 100%; padding: 10px 13px; border-radius: 7px; border: 1px solid #E5E5DB; background: #FAFAF6;
          color: #16201B; margin-bottom: 16px; font-size: 14px; font-family: inherit;
        }
        .lp-input:focus { outline: none; border-color: #1E4A36; box-shadow: 0 0 0 3px rgba(30,74,54,0.1); }
        .lp-hint { color: #6B7568; font-size: 12px; margin: -10px 0 14px; }
        .lp-error { color: #B3261E; font-size: 13px; margin: 0 0 14px; }
        .lp-notice { color: #1E4A36; font-size: 13px; margin: 0 0 14px; }
        .lp-button {
          width: 100%; padding: 11px; border-radius: 7px; border: none; background: #D9A62E; color: #16201B;
          font-weight: 700; cursor: pointer; font-size: 14px; transition: background-color 0.12s ease;
        }
        .lp-button:hover { background: #C79523; }
        .lp-button:disabled { opacity: 0.6; cursor: default; }
        .lp-switch-row { text-align: center; font-size: 12.5px; color: #6B7568; margin: 18px 0 0; }
        .lp-link { background: none; border: none; color: #1E4A36; font-weight: 700; cursor: pointer; font-size: 12.5px; padding: 0; }

        @media (max-width: 860px) {
          .lp-page { flex-direction: column; }
          .lp-turf { flex: none; padding: 32px 24px; }
          .lp-brand { margin-bottom: 20px; }
          .lp-headline { font-size: 26px; margin-bottom: 20px; }
          .lp-values { display: none; }
          .lp-form-panel { flex: none; padding: 32px 20px 48px; }
          .lp-lang-switch { top: 16px; }
        }
      `}</style>
    </>
  );
}
