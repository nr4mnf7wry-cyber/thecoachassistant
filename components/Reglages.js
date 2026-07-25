import { useState, useRef } from "react";
import { Download, Upload } from "lucide-react";
import { useLang } from "../lib/i18n";
import { todayStr } from "../lib/shared";

export function Reglages({ data, setters, teamName }) {
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

      <div className="panel">
        <h3><Download size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{t("panel_backup")}</h3>
        <p className="muted" style={{ marginBottom: 14 }}>{t("backup_help")}</p>
        <button className="btn-gold" onClick={exportBackup}><Download size={16} /> {t("export_backup")}</button>
      </div>

      <div className="panel">
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
  );
}
