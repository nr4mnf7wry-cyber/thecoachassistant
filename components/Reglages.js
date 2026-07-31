import { useState, useRef, useEffect } from "react";
import { Download, Upload, Users, UserPlus, Trash2 } from "lucide-react";
import { useLang } from "../lib/i18n";
import { todayStr } from "../lib/shared";

export function Reglages({ data, setters, teamName, currentUser }) {
  const { t } = useLang();
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);

  const exportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      exportedBy: teamName,
      appVersion: 1,
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (teamName || "equipe").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `sauvegarde-${safeName}-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const payload = parsed && parsed.data ? parsed.data : parsed;
        if (!payload || !Array.isArray(payload.players)) {
          setMessage({ type: "error", text: t("restore_invalid") });
          return;
        }
        if (!confirm(t("restore_confirm"))) return;

        setters.setPlayers(payload.players || []);
        setters.setStaff(payload.staff || []);
        setters.setMatches(payload.matches || []);
        setters.setTrainings(payload.trainings || []);
        setters.setEvaluations(payload.evaluations || []);
        setters.setAvailabilities(payload.availabilities || []);
        setters.setExerciseLibrary(payload.exerciseLibrary || []);
        setters.setBodyMetrics(payload.bodyMetrics || []);
        setters.setLeagueMatches(payload.leagueMatches || []);
        setters.setOpponentProfiles(payload.opponentProfiles || []);
        setters.setInjuries(payload.injuries || []);
        setters.setDevelopmentGoals(payload.developmentGoals || []);
        setters.setLiveSessions(payload.liveSessions || []);
        setters.setTeamName(payload.teamName || teamName);
        setters.setSeasons(payload.seasons && payload.seasons.length ? payload.seasons : ["2026-2027"]);
        setters.setCurrentSeason(payload.currentSeason || "2026-2027");

        setMessage({ type: "success", text: t("restore_success") });
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: t("restore_invalid") });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <div className="view-header"><h1>{t("settings_title")}</h1></div>

      {currentUser?.role === "head" && <AccountsPanel />}

      <div className="panel panel-sections panel-sections-v">
        <div className="panel-section">
        <h3><Download size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{t("panel_backup")}</h3>
        <button className="btn-gold" onClick={exportBackup}><Download size={16} /> {t("export_backup")}</button>
        </div>

        <div className="panel-section">
        <h3><Upload size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{t("panel_restore")}</h3>
        <p className="muted" style={{ marginBottom: 14 }}>{t("restore_help")}</p>
        <button
          className="btn-gold"
          style={{ background: "transparent", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }}
          onClick={() => fileRef.current.click()}
        >
          <Upload size={16} /> {t("import_backup")}
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFile} />
        {message && (
          <p className="mono" style={{ marginTop: 12, fontSize: 12.5, color: message.type === "error" ? "var(--red)" : "var(--gold)" }}>
            {message.text}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}

function AccountsPanel() {
  const { t } = useLang();
  const [users, setUsers] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permissionLevel, setPermissionLevel] = useState("readonly");
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/auth/users").then((r) => r.json()).then((data) => setUsers(data.users || [])).catch(() => setUsers([]));
  };
  useEffect(() => { load(); }, []);

  const addAssistant = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, permissionLevel }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || t("account_error")); return; }
    setUsername(""); setPassword(""); setPermissionLevel("readonly"); setShowForm(false);
    load();
  };

  const changePermission = async (id, level) => {
    await fetch("/api/auth/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, permissionLevel: level }),
    });
    load();
  };

  const removeUser = async (id) => {
    if (!confirm(t("confirm_delete_account"))) return;
    await fetch(`/api/auth/users?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}><Users size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{t("panel_accounts")}</h3>
        <button className="btn-gold" onClick={() => setShowForm(!showForm)}><UserPlus size={16} /> {t("add_assistant")}</button>
      </div>

      {showForm && (
        <form onSubmit={addAssistant} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <label className="muted" style={{ fontSize: 12 }}>{t("field_username")}<input value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label className="muted" style={{ fontSize: 12 }}>{t("field_password")}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
          <label className="muted" style={{ fontSize: 12 }}>{t("field_permission_level")}
            <select value={permissionLevel} onChange={(e) => setPermissionLevel(e.target.value)}>
              <option value="readonly">{t("permission_readonly")}</option>
              <option value="editor">{t("permission_editor")}</option>
            </select>
          </label>
          <button type="submit" className="btn-gold">{t("common_add")}</button>
        </form>
      )}
      {error && <p className="mono" style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

      {users === null && <p className="muted">…</p>}
      {users && users.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
      {users && users.map((u) => (
        <div key={u.id} className="match-row">
          <span>{u.username}</span>
          <span className="status-chip" style={{ background: u.role === "head" ? "var(--gold)" : "var(--chalk-dim)" }}>
            {t(u.role === "head" ? "role_head" : "role_assistant")}
          </span>
          {u.role !== "head" && (
            <select value={u.permissionLevel || "readonly"} onChange={(e) => changePermission(u.id, e.target.value)} style={{ fontSize: 12.5 }}>
              <option value="readonly">{t("permission_readonly")}</option>
              <option value="editor">{t("permission_editor")}</option>
            </select>
          )}
          {u.role !== "head" && <button className="icon-btn" onClick={() => removeUser(u.id)}><Trash2 size={13} /></button>}
        </div>
      ))}
    </div>
  );
}
