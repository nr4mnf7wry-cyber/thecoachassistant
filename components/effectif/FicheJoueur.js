import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, Save, CalendarDays, Target, BarChart3, ClipboardCheck, Gauge, Wind } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { useLang } from "../../lib/i18n";
import {
  POSITION_KEYS, FOOT_KEYS, EVAL_CATEGORIES, EVAL_CATEGORY_KEYS, EVAL_SKILL_KEYS, ALL_EVAL_SKILLS, evalCategoriesFor,
  uid, Badge, Modal, MetricCard,
  aggregateMatches, aggregateTrainings, latestCardio, cardioHistory,
  overallAvg, categoryAvg, evaluationHistory, latestEvaluationBySource, emptyEvaluationScores,
  computeBMI, bodyMetricsHistory, formatDate, formatDateShort, todayStr, DateField, clamp,
  newDevelopmentGoal, playerGoals, GOAL_STATUSES,
} from "../../lib/shared";
import { PlayerEditForm } from "./PlayerForms";

/* ---------------- évaluation ---------------- */

function EvaluationForm({ playerId, position, initial, onSave, onClose }) {
  const { t } = useLang();
  const [date, setDate] = useState(initial?.date || todayStr());
  const [source, setSource] = useState(initial?.source || "coach");
  const [scores, setScores] = useState(initial?.scores || emptyEvaluationScores());
  const categories = evalCategoriesFor(position);

  const setScore = (skill, value) => setScores({ ...scores, [skill]: clamp(value, 1, 10) });

  return (
    <Modal title={initial ? t("eval_edit_title") : t("eval_form_title")} onClose={onClose} wide>
      <div className="form-grid" style={{ marginBottom: 8 }}>
        <label>{t("field_date")}<DateField value={date} onChange={setDate} /></label>
        <label>{t("eval_source")}
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="coach">{t("eval_source_coach")}</option>
            <option value="player">{t("eval_source_player")}</option>
          </select>
        </label>
      </div>
      {Object.entries(categories).map(([cat, skills]) => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <div className="eval-cat-label">{t(EVAL_CATEGORY_KEYS[cat])}</div>
          <div className="eval-skill-grid">
            {skills.map((skill) => (
              <label key={skill} className="eval-skill-input">
                {t(EVAL_SKILL_KEYS[skill])}
                <input type="number" min="1" max="10" value={scores[skill]} onChange={(e) => setScore(skill, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="btn-gold" onClick={() => onSave({ id: initial?.id || uid(), playerId, date, source, scores })}>
        <Save size={16} /> {t("common_save")}
      </button>
    </Modal>
  );
}

function BodyMetricForm({ playerId, initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(initial || { date: todayStr(), height: "", weight: "", bodyFatPct: "" });
  return (
    <Modal title={initial ? t("body_edit_title") : t("body_form_title")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_date")}<DateField value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></label>
        <label>{t("field_height")}<input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} /></label>
        <label>{t("field_weight")}<input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></label>
        <label>{t("field_body_fat_pct")}<input type="number" step="0.1" value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} /></label>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>{t("metric_bmi")}: <span className="mono" style={{ color: "var(--chalk)" }}>{computeBMI(form.weight, form.height) ?? "—"}</span></p>
      <button className="btn-gold" onClick={() => { if (form.date) onSave({ id: uid(), playerId, ...form }); }}>
        <Save size={16} /> {t("common_save")}
      </button>
    </Modal>
  );
}

function GoalForm({ playerId, initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(initial || newDevelopmentGoal({ playerId }));
  return (
    <Modal title={initial ? t("goal_edit_title") : t("goal_new_title")} onClose={onClose}>
      <div className="form-grid">
        <label style={{ gridColumn: "1 / -1" }}>{t("goal_field_title")}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>{t("goal_field_target_date")}<DateField value={form.targetDate} onChange={(v) => setForm({ ...form, targetDate: v })} /></label>
        <label>{t("field_status")}
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {GOAL_STATUSES.map((s) => <option key={s} value={s}>{t(`goal_status_${s}`)}</option>)}
          </select>
        </label>
      </div>
      <label style={{ display: "block", marginBottom: 14 }}>{t("goal_field_description")}
        <textarea className="bulk-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <button className="btn-gold" onClick={() => { if (form.title.trim()) onSave(form); }}><Save size={16} /> {t("common_save")}</button>
    </Modal>
  );
}

/* ---------------- fiche joueur ---------------- */

export function FicheJoueur({ playerId, players, setPlayers, matches, trainings, evaluations, setEvaluations, bodyMetrics, setBodyMetrics, developmentGoals, setDevelopmentGoals, setView }) {
  const { t } = useLang();
  const [showEdit, setShowEdit] = useState(false);
  const [showEval, setShowEval] = useState(false);
  const [editingEval, setEditingEval] = useState(null);
  const [showBody, setShowBody] = useState(false);
  const [editingBody, setEditingBody] = useState(null);
  const [showGoal, setShowGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const player = players.find((p) => p.id === playerId);
  const goals = useMemo(() => playerGoals(developmentGoals, playerId), [developmentGoals, playerId]);
  const [agg] = useMemo(() => aggregateMatches(players, matches).filter((a) => a.player.id === playerId), [players, matches, playerId]);
  const attendance = useMemo(() => aggregateTrainings(players, trainings).find((a) => a.player.id === playerId), [players, trainings, playerId]);
  const lastCardio = useMemo(() => latestCardio(trainings, playerId), [trainings, playerId]);
  const cardioSeries = useMemo(() => cardioHistory(trainings, playerId), [trainings, playerId]);
  const evalHistory = useMemo(() => evaluationHistory(evaluations, playerId), [evaluations, playerId]);
  const lastCoachEval = useMemo(() => latestEvaluationBySource(evaluations, playerId, "coach"), [evaluations, playerId]);
  const lastPlayerEval = useMemo(() => latestEvaluationBySource(evaluations, playerId, "player"), [evaluations, playerId]);
  const lastEval = lastCoachEval || lastPlayerEval;
  const bodyHistory = useMemo(() => bodyMetricsHistory(bodyMetrics, playerId), [bodyMetrics, playerId]);
  const lastBody = bodyHistory[0] || null;

  const matchHistory = useMemo(() => {
    return [...matches]
      .filter((m) => m.squad?.includes(playerId))
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((m) => ({ ...(m.stats?.[playerId] || {}), date: m.date, opponent: m.opponent }));
  }, [matches, playerId]);

  const noteData = matchHistory.filter((h) => h.note !== "" && h.note !== undefined).map((h) => ({ name: formatDateShort(h.date), note: Number(h.note) }));
  const vmaData = cardioSeries.filter((c) => c.vma !== "" && c.vma !== undefined).map((c) => ({ name: formatDateShort(c.date), VMA: Number(c.vma) }));
  const vo2Data = cardioSeries.filter((c) => c.vo2max !== "" && c.vo2max !== undefined).map((c) => ({ name: formatDateShort(c.date), VO2max: Number(c.vo2max) }));
  const evalEvolution = [...evalHistory].reverse().map((e) => ({ name: formatDateShort(e.date), moyenne: overallAvg(e.scores) }));
  const playerEvalSkills = useMemo(() => Object.values(evalCategoriesFor(player?.position)).flat(), [player?.position]);
  const radarData = (lastCoachEval || lastPlayerEval) ? playerEvalSkills.map((skill) => ({
    skill: t(EVAL_SKILL_KEYS[skill]),
    coach: lastCoachEval ? Number(lastCoachEval.scores[skill]) || 0 : null,
    joueur: lastPlayerEval ? Number(lastPlayerEval.scores[skill]) || 0 : null,
  })) : [];
  const bmiEvolution = [...bodyHistory].reverse().map((b) => ({ name: formatDateShort(b.date), imc: computeBMI(b.weight, b.height) })).filter((d) => d.imc !== null);
  const bodyCompEvolution = [...bodyHistory].reverse().map((b) => ({
    name: formatDateShort(b.date),
    [t("legend_fat")]: b.bodyFatPct !== "" ? Number(b.bodyFatPct) : null,
  })).filter((d) => d[t("legend_fat")] !== null);

  const saveEdit = (form) => { setPlayers(players.map((p) => (p.id === form.id ? form : p))); setShowEdit(false); };
  const saveGoal = (entry) => {
    const exists = developmentGoals.some((g) => g.id === entry.id);
    setDevelopmentGoals(exists ? developmentGoals.map((g) => (g.id === entry.id ? entry : g)) : [...developmentGoals, entry]);
    setShowGoal(false);
    setEditingGoal(null);
  };
  const removeGoal = (id) => { if (confirm(t("confirm_delete_goal"))) setDevelopmentGoals(developmentGoals.filter((g) => g.id !== id)); };
  const saveEval = (entry) => {
    const exists = evaluations.some((e) => e.id === entry.id);
    setEvaluations(exists ? evaluations.map((e) => (e.id === entry.id ? entry : e)) : [...evaluations, entry]);
    setShowEval(false);
    setEditingEval(null);
  };
  const saveBody = (entry) => {
    const exists = bodyMetrics.some((b) => b.id === entry.id);
    setBodyMetrics(exists ? bodyMetrics.map((b) => (b.id === entry.id ? entry : b)) : [...bodyMetrics, entry]);
    setShowBody(false);
    setEditingBody(null);
  };

  if (!player) return <p className="muted">—</p>;

  return (
    <div>
      <button className="back-link" onClick={() => setView("effectif")}><ChevronLeft size={16} /> {t("fiche_back")}</button>

      <div className="panel player-identity-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Badge number={player.number} size={64} />
            <div>
              <h1 style={{ marginBottom: 2, display: "flex", alignItems: "center", gap: 10 }}>
                {player.name}
                {player.status === "invite" && <span className="status-chip" style={{ background: "var(--chalk-dim)", fontSize: 11 }}>{t("badge_guest")}</span>}
              </h1>
              <p className="muted">
                {player.position ? t(POSITION_KEYS[player.position]) : t("position_not_set")}
                {player.specificite ? ` (${player.specificite})` : ""}
                {player.secondaryPositions?.length ? ` · ${player.secondaryPositions.map((p) => t(POSITION_KEYS[p])).join(", ")}` : ""}
                {player.strongFoot ? ` · ${t(FOOT_KEYS[player.strongFoot])}` : ""}
                {player.height ? ` · ${player.height} cm` : ""}
                {player.weight ? ` · ${player.weight} kg` : ""}
                {player.birthDate ? ` · ${t("born_on")} ${formatDate(player.birthDate)}` : ""}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {player.status === "invite" && (
              <button className="icon-btn" onClick={() => { if (confirm(t("confirm_promote"))) setPlayers(players.map((p) => (p.id === player.id ? { ...p, status: "titulaire" } : p))); }}>
                {t("action_promote")}
              </button>
            )}
            <button className="icon-btn" onClick={() => setShowEdit(true)}><Pencil size={16} /></button>
          </div>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label={t("metric_matches_played")} value={agg?.matchesPresent ?? 0} icon={CalendarDays} />
        <MetricCard label={t("metric_goals")} value={agg?.buts ?? 0} icon={Target} />
        <MetricCard label={t("metric_avg_note")} value={agg?.avgNote ?? "—"} icon={BarChart3} />
        <MetricCard label={t("metric_general_note")} value={lastCoachEval ? (overallAvg(lastCoachEval.scores) ?? "—") : "—"} icon={BarChart3} />
        <MetricCard label={t("metric_sessions_done")} value={`${attendance?.present ?? 0}/${attendance?.total ?? 0}`} icon={ClipboardCheck} />
        <MetricCard label={t("metric_avg_rpe")} value={attendance?.avgRpe ?? "—"} icon={Gauge} />
        <MetricCard label={t("metric_last_cardio")} value={lastCardio ? `${lastCardio.vma || "—"} km/h · ${lastCardio.vo2max || "—"}` : "—"} icon={Wind} />
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{t("panel_goals")}</h3>
          <button className="btn-gold" onClick={() => { setEditingGoal(null); setShowGoal(true); }}><Plus size={16} /> {t("goal_new_title")}</button>
        </div>
        {goals.length === 0 && <p className="muted">{t("goals_none")}</p>}
        {goals.map((g) => (
          <div key={g.id} className="match-row">
            <span className="status-chip" style={{ background: g.status === "achieved" ? "var(--gold)" : g.status === "abandoned" ? "var(--chalk-dim)" : "var(--yellow)" }}>{t(`goal_status_${g.status}`)}</span>
            <div style={{ flex: 1 }}>
              <div>{g.title}</div>
              {g.description && <div className="muted" style={{ fontSize: 12 }}>{g.description}</div>}
            </div>
            <span className="mono muted">{g.targetDate ? formatDate(g.targetDate) : "—"}</span>
            <button className="icon-btn" onClick={() => { setEditingGoal(g); setShowGoal(true); }}><Pencil size={13} /></button>
            <button className="icon-btn" onClick={() => removeGoal(g.id)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{t("panel_evaluation")}</h3>
          <button className="btn-gold" onClick={() => { setEditingEval(null); setShowEval(true); }}><Plus size={16} /> {t("eval_new")}</button>
        </div>
        {!lastCoachEval && !lastPlayerEval && <p className="muted">{t("eval_none")}</p>}
        {(lastCoachEval || lastPlayerEval) && (
          <>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
              <p className="muted" style={{ margin: 0 }}>
                <span className="eval-legend-dot" style={{ background: "var(--gold)" }} /> {t("eval_source_coach")}: <span className="mono" style={{ color: "var(--chalk)" }}>{lastCoachEval ? overallAvg(lastCoachEval.scores) : "—"}</span> {lastCoachEval && `(${formatDate(lastCoachEval.date)})`}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                <span className="eval-legend-dot" style={{ background: "var(--yellow)" }} /> {t("eval_source_player")}: <span className="mono" style={{ color: "var(--chalk)" }}>{lastPlayerEval ? overallAvg(lastPlayerEval.scores) : "—"}</span> {lastPlayerEval && `(${formatDate(lastPlayerEval.date)})`}
              </p>
            </div>
            <div style={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="var(--pitch-line)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--chalk-dim)", fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: "var(--chalk-dim)", fontSize: 9 }} />
                  {lastCoachEval && <Radar name={t("eval_source_coach")} dataKey="coach" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.3} />}
                  {lastPlayerEval && <Radar name={t("eval_source_player")} dataKey="joueur" stroke="var(--yellow)" fill="var(--yellow)" fillOpacity={0.25} />}
                  {(lastCoachEval && lastPlayerEval) && <Legend wrapperStyle={{ fontSize: 12, color: "var(--chalk-dim)" }} />}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        {evalEvolution.length > 1 && (
          <div style={{ height: 170, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evalEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                <Line type="monotone" dataKey="moyenne" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {evalHistory.length > 0 && (
          <table className="stats-table" style={{ marginTop: 14 }}>
            <thead><tr><th>{t("th_date")}</th><th>{t("eval_source")}</th>{Object.keys(evalCategoriesFor(player.position)).map((c) => <th key={c}>{t(EVAL_CATEGORY_KEYS[c])}</th>)}<th>{t("eval_overall")}</th><th /></tr></thead>
            <tbody>
              {evalHistory.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{formatDate(e.date)}</td>
                  <td><span className="status-chip" style={{ background: (e.source || "coach") === "coach" ? "var(--gold)" : "var(--yellow)" }}>{t((e.source || "coach") === "coach" ? "eval_source_coach" : "eval_source_player")}</span></td>
                  {Object.entries(evalCategoriesFor(player.position)).map(([c, skills]) => <td key={c} className="mono">{categoryAvg(e.scores, skills) ?? "—"}</td>)}
                  <td className="mono">{overallAvg(e.scores) ?? "—"}</td>
                  <td style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" onClick={() => { setEditingEval(e); setShowEval(true); }}><Pencil size={13} /></button>
                    <button className="icon-btn" onClick={() => { if (confirm(t("confirm_delete_eval"))) setEvaluations(evaluations.filter((x) => x.id !== e.id)); }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{t("panel_body_composition")}</h3>
          <button className="btn-gold" onClick={() => { setEditingBody(null); setShowBody(true); }}><Plus size={16} /> {t("body_new_measure")}</button>
        </div>
        {!lastBody && <p className="muted">{t("body_none")}</p>}
        {lastBody && (
          <div className="metric-grid" style={{ marginBottom: 14 }}>
            <MetricCard label={t("metric_bmi")} value={computeBMI(lastBody.weight, lastBody.height) ?? "—"} icon={Gauge} />
            <MetricCard label={t("metric_fat_pct")} value={lastBody.bodyFatPct !== "" ? `${lastBody.bodyFatPct}%` : "—"} icon={Gauge} />
          </div>
        )}
        <div className="two-col">
          {bmiEvolution.length > 1 && (
            <div>
              <h3>{t("chart_bmi_evolution")}</h3>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bmiEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                    <Line type="monotone" dataKey="imc" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {bodyHistory.length > 1 && (
            <div>
              <h3>{t("chart_body_comp_evolution")}</h3>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bodyCompEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                    <Line type="monotone" dataKey={t("legend_fat")} stroke="var(--red)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
        {bodyHistory.length > 0 && (
          <table className="stats-table" style={{ marginTop: 14 }}>
            <thead><tr><th>{t("th_date")}</th><th>{t("field_height")}</th><th>{t("field_weight")}</th><th>{t("th_bmi")}</th><th>{t("th_fat_pct")}</th><th /></tr></thead>
            <tbody>
              {bodyHistory.map((b) => (
                <tr key={b.id}>
                  <td className="mono">{formatDate(b.date)}</td>
                  <td className="mono">{b.height || "—"}</td>
                  <td className="mono">{b.weight || "—"}</td>
                  <td className="mono">{computeBMI(b.weight, b.height) ?? "—"}</td>
                  <td className="mono">{b.bodyFatPct !== "" ? `${b.bodyFatPct}%` : "—"}</td>
                  <td style={{ display: "flex", gap: 4 }}>
                    <button className="icon-btn" onClick={() => { setEditingBody(b); setShowBody(true); }}><Pencil size={13} /></button>
                    <button className="icon-btn" onClick={() => { if (confirm(t("confirm_delete_body"))) setBodyMetrics(bodyMetrics.filter((x) => x.id !== b.id)); }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {noteData.length > 1 && (
        <div className="panel">
          <h3>{t("chart_note_evolution")}</h3>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={noteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                <Line type="monotone" dataKey="note" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="two-col">
        {vmaData.length > 1 && (
          <div className="panel">
            <h3>{t("chart_vma_evolution")}</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vmaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                  <Line type="monotone" dataKey="VMA" stroke="var(--yellow)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {vo2Data.length > 1 && (
          <div className="panel">
            <h3>{t("chart_vo2_evolution")}</h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vo2Data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                  <Line type="monotone" dataKey="VO2max" stroke="var(--red)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>{t("panel_match_history")}</h3>
        {matchHistory.length === 0 && <p className="muted">{t("no_match_history")}</p>}
        {matchHistory.length > 0 && (
          <table className="stats-table">
            <thead><tr><th>{t("th_date")}</th><th>{t("th_opponent")}</th><th>{t("th_position_played")}</th><th>{t("th_goals_short")}</th><th>{t("th_assists_short")}</th><th>{t("th_minutes_short")}</th><th>{t("th_note")}</th></tr></thead>
            <tbody>
              {matchHistory.map((h, i) => (
                <tr key={i}>
                  <td className="mono">{formatDate(h.date)}</td><td>{h.opponent}</td>
                  <td>{h.poste ? t(POSITION_KEYS[h.poste]) : "—"}</td>
                  <td className="mono">{h.buts || 0}</td><td className="mono">{h.passes || 0}</td>
                  <td className="mono">{h.minutes || 0}</td><td className="mono">{h.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>{t("panel_cardio_history")}</h3>
        {cardioSeries.length === 0 && <p className="muted">{t("no_cardio_history")}</p>}
        {cardioSeries.length > 0 && (
          <table className="stats-table">
            <thead><tr><th>{t("th_date")}</th><th>{t("th_vma")}</th><th>{t("th_vo2max")}</th></tr></thead>
            <tbody>
              {cardioSeries.map((c, i) => (
                <tr key={i}><td className="mono">{formatDate(c.date)}</td><td className="mono">{c.vma || "—"}</td><td className="mono">{c.vo2max || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && <PlayerEditForm initial={player} existingPlayers={players} onSave={saveEdit} onClose={() => setShowEdit(false)} />}
      {showGoal && <GoalForm playerId={playerId} initial={editingGoal} onSave={saveGoal} onClose={() => { setShowGoal(false); setEditingGoal(null); }} />}
      {showEval && <EvaluationForm playerId={playerId} position={player.position} initial={editingEval} onSave={saveEval} onClose={() => { setShowEval(false); setEditingEval(null); }} />}
      {showBody && <BodyMetricForm playerId={playerId} initial={editingBody} onSave={saveBody} onClose={() => { setShowBody(false); setEditingBody(null); }} />}
    </div>
  );
}
