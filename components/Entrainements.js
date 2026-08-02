import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, Save, Gauge, Pencil, UserCheck, Zap, Dumbbell, Compass, ArrowLeftRight, Crosshair } from "lucide-react";
import { useLang } from "../lib/i18n";
import {
  uid, Badge, Modal, MetricCard,
  EXERCISE_CATEGORIES, EXERCISE_CATEGORY_KEYS, emptyAttendance, emptyExercise, aggregateTrainings,
  isPlayerUnavailable, DEFAULT_SEASON, addDaysToDateStr, formatDate, DateField, useSelection, clamp, todayStr,
  POSITIONS, POSITION_KEYS,
} from "../lib/shared";

const EXERCISE_CATEGORY_ICONS = {
  Technique: Zap, Physique: Dumbbell, Tactique: Compass, Transitions: ArrowLeftRight, Finition: Crosshair,
};

const STATUSES = ["Présent", "Absent", "Blessé"];
const STATUS_LABEL_KEYS = { "Présent": "status_present", "Absent": "status_absent", "Blessé": "status_blessé" };

/* ---------------- training creation form ---------------- */

export function TrainingForm({ initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(initial || {
    date: "", time: "", duration: "", opponent: "", objective: "", isPhysicalTest: false, coachRpe: "",
    recurring: false, recurUntil: "",
  });
  return (
    <Modal title={initial ? t("entr_edit") : t("entr_add")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_date")}<DateField value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></label>
        <label>{t("field_time")}<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
        <label>{t("field_duration_min")}<input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label>
        <label>{t("field_opponent_optional")}<input value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} /></label>
        <label>{t("field_objective")}<input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.isPhysicalTest} onChange={(e) => setForm({ ...form, isPhysicalTest: e.target.checked })} />
          {t("training_physical_test_label")}
        </label>
        <label>{t("field_coach_rpe")}<input type="number" min="0" max="10" value={form.coachRpe} onChange={(e) => setForm({ ...form, coachRpe: clamp(e.target.value, 0, 10) })} /></label>
        {!initial && (
          <>
            <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={!!form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
              {t("training_recurring_label")}
            </label>
            {form.recurring && (
              <label>{t("training_recur_until")}<DateField value={form.recurUntil || ""} onChange={(v) => setForm({ ...form, recurUntil: v })} /></label>
            )}
          </>
        )}
      </div>
      <button className="btn-gold" onClick={() => { if (form.date) onSave(form); }}><Save size={16} /> {t("common_save")}</button>
    </Modal>
  );
}

/* ---------------- exercise picker / creator ---------------- */

function ExerciseForm({ onSave, onClose }) {
  const { t } = useLang();
  const [ex, setEx] = useState(emptyExercise());
  const [addToLibrary, setAddToLibrary] = useState(true);
  return (
    <Modal title={t("exercise_form_title")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_exercise_name")}<input value={ex.name} onChange={(e) => setEx({ ...ex, name: e.target.value })} /></label>
        <label>{t("field_description")}<input value={ex.description} onChange={(e) => setEx({ ...ex, description: e.target.value })} /></label>
        <label>{t("field_category")}
          <select value={ex.category} onChange={(e) => setEx({ ...ex, category: e.target.value })}>
            {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{t(EXERCISE_CATEGORY_KEYS[c])}</option>)}
          </select>
        </label>
        <label>{t("field_duration_min")}<input type="number" value={ex.duration} onChange={(e) => setEx({ ...ex, duration: e.target.value })} /></label>
        <label>{t("th_rpe")}<input type="number" min="0" max="10" value={ex.rpe} onChange={(e) => setEx({ ...ex, rpe: e.target.value })} /></label>
        <label>{t("field_nb_players")}<input type="number" value={ex.players} onChange={(e) => setEx({ ...ex, players: e.target.value })} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={addToLibrary} onChange={(e) => setAddToLibrary(e.target.checked)} />
          {t("exercise_library_title")}
        </label>
      </div>
      <button className="btn-gold" onClick={() => { if (ex.name.trim()) onSave(ex, addToLibrary); }}><Save size={16} /> {t("common_save")}</button>
    </Modal>
  );
}

function LibraryPicker({ exerciseLibrary, onPick, onClose }) {
  const { t } = useLang();
  return (
    <Modal title={t("exercise_add_from_library")} onClose={onClose}>
      {exerciseLibrary.length === 0 && <p className="muted">{t("no_exercises_yet")}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
        {exerciseLibrary.map((ex) => {
          const CatIcon = EXERCISE_CATEGORY_ICONS[ex.category];
          return (
            <button key={ex.id} className="player-row-card" style={{ width: "100%", border: "1px solid var(--pitch-line)", borderRadius: 8, cursor: "pointer" }} onClick={() => onPick(ex)}>
              <div className="exercise-cat-icon">{CatIcon && <CatIcon size={15} />}</div>
              <div>
                <div className="player-name">{ex.name}</div>
                <div className="muted">{t(EXERCISE_CATEGORY_KEYS[ex.category])} · {ex.duration || "—"} min · RPE {ex.rpe || "—"}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* ---------------- list ---------------- */

export function Entrainements({ players, trainings, setTrainings, availabilities, currentSeason, setView, canDelete = true }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [subTab, setSubTab] = useState("upcoming");
  const { selected, toggle: toggleSelect, clear: clearSelection } = useSelection();
  const save = (form) => {
    const { recurring, recurUntil, ...base } = form;
    const dates = [];
    if (recurring && recurUntil && recurUntil >= base.date) {
      let current = base.date;
      while (current <= recurUntil) {
        dates.push(current);
        current = addDaysToDateStr(current, 7);
      }
    } else {
      dates.push(base.date);
    }
    const newTrainings = dates.map((date) => {
      const attendance = {};
      players.filter((p) => (p.status || "titulaire") !== "invite").forEach((p) => {
        const unavail = isPlayerUnavailable(availabilities, p.id, date);
        attendance[p.id] = unavail
          ? { ...emptyAttendance(), present: false, statut: "Absent", raison: t(`avail_${unavail.status}`) }
          : emptyAttendance();
      });
      return { id: uid(), ...base, date, season: currentSeason, attendance, exercises: [] };
    });
    setTrainings([...trainings, ...newTrainings]);
    setShowForm(false);
  };
  const sorted = [...trainings]
    .filter((t2) => (t2.season || DEFAULT_SEASON) === currentSeason)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  const today = todayStr();
  const upcoming = sorted.filter((t2) => t2.date >= today);
  const past = [...sorted].filter((t2) => t2.date < today).reverse();
  const visibleSessions = subTab === "upcoming" ? upcoming : past;

  const removeOne = (id) => { if (confirm(t("confirm_delete_session"))) setTrainings(trainings.filter((t2) => t2.id !== id)); };
  const removeSelected = () => {
    if (!selected.length) return;
    if (confirm(t("confirm_delete_selection"))) {
      setTrainings(trainings.filter((t2) => !selected.includes(t2.id)));
      clearSelection();
    }
  };

  return (
    <div>
      <div className="view-header">
        <h1>{t("entr_title")}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {selected.length > 0 && (
            <button className="icon-btn" onClick={removeSelected}><Trash2 size={14} /> {t("delete_selection")} ({selected.length})</button>
          )}
          <button className="btn-gold" onClick={() => setShowForm(true)}><Plus size={16} /> {t("entr_add")}</button>
        </div>
      </div>
      <div className="tab-bar">
        <button className={"tab-btn" + (subTab === "upcoming" ? " active" : "")} onClick={() => setSubTab("upcoming")}>{t("entr_tab_upcoming")} ({upcoming.length})</button>
        <button className={"tab-btn" + (subTab === "past" ? " active" : "")} onClick={() => setSubTab("past")}>{t("entr_tab_past")} ({past.length})</button>
      </div>
      {visibleSessions.length === 0 && <p className="muted">{subTab === "upcoming" ? t("entr_none_upcoming") : t("entr_none_past")}</p>}
      <div className="panel" style={{ padding: 0 }}>
        {visibleSessions.map((t2) => {
          const trackedPlayers = players.filter((p) => (p.status || "titulaire") !== "invite" || t2.attendance?.[p.id]);
          const presentCount = trackedPlayers.filter((p) => (t2.attendance?.[p.id]?.present ?? true)).length;
          const trackedCount = trackedPlayers.length;
          return (
            <div key={t2.id} className="match-list-row" style={{ gridTemplateColumns: "24px 100px 1fr 140px 32px" }}>
              <input type="checkbox" checked={selected.includes(t2.id)} onChange={(e) => { e.stopPropagation(); toggleSelect(t2.id); }} onClick={(e) => e.stopPropagation()} />
              <span className="mono muted" style={{ cursor: "pointer" }} onClick={() => setView("entrainements:" + t2.id)}>{formatDate(t2.date)}</span>
              <span style={{ cursor: "pointer" }} onClick={() => setView("entrainements:" + t2.id)}>{t2.objective || t("entr_detail_default_title")}</span>
              <span className="muted mono" style={{ cursor: "pointer" }} onClick={() => setView("entrainements:" + t2.id)}>{presentCount}/{trackedCount} {t("entr_present_count")}</span>
              {canDelete && <button className="icon-btn" onClick={() => removeOne(t2.id)}><Trash2 size={13} /></button>}
            </div>
          );
        })}
      </div>
      {showForm && <TrainingForm onSave={save} onClose={() => setShowForm(false)} />}
    </div>
  );
}

/* ---------------- detail ---------------- */

export function EntrainementDetail({ trainingId, players, trainings, setTrainings, exerciseLibrary, setExerciseLibrary, availabilities, setView }) {
  const { t } = useLang();
  const training = trainings.find((t2) => t2.id === trainingId);
  const [attendance, setAttendance] = useState(training?.attendance || {});
  const [showLibrary, setShowLibrary] = useState(false);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [guestToAdd, setGuestToAdd] = useState("");
  useEffect(() => { setAttendance(training?.attendance || {}); }, [trainingId]);

  if (!training) return <p className="muted">—</p>;

  const patch = (fields) => setTrainings(trainings.map((t2) => (t2.id === trainingId ? { ...t2, ...fields } : t2)));
  const saveEditInfo = (form) => { patch(form); setShowEditInfo(false); };

  const update = (playerId, field, value) => {
    const current = attendance[playerId] || emptyAttendance();
    const v = field === "rpe" ? clamp(value, 0, 10) : value;
    let next = { ...current, [field]: v };
    if (field === "statut") next.present = value === "Présent";
    const nextAll = { ...attendance, [playerId]: next };
    setAttendance(nextAll);
    patch({ attendance: nextAll });
  };

  const trackedPlayers = players.filter((p) => (p.status || "titulaire") !== "invite" || attendance[p.id]);
  const presentCount = trackedPlayers.filter((p) => (attendance[p.id]?.present ?? true)).length;
  const availableGuests = players.filter((p) => (p.status || "titulaire") === "invite" && !attendance[p.id]);

  const addGuestToSession = () => {
    const id = guestToAdd || availableGuests[0]?.id;
    if (!id) return;
    const nextAll = { ...attendance, [id]: emptyAttendance() };
    setAttendance(nextAll);
    patch({ attendance: nextAll });
    setGuestToAdd("");
  };

  const removeGuestFromSession = (playerId) => {
    const nextAll = { ...attendance };
    delete nextAll[playerId];
    setAttendance(nextAll);
    patch({ attendance: nextAll });
  };

  // Synchronisation automatique avec les disponibilités : seulement pour les joueurs qui n'ont
  // encore aucune entrée de présence pour cette séance (nouvelle séance, ou joueur ajouté après
  // coup). Ne touche jamais une entrée déjà existante, pour ne jamais écraser une correction
  // manuelle du coach.
  useEffect(() => {
    const additions = {};
    let changed = false;
    players.forEach((p) => {
      if (attendance[p.id]) return;
      const unavail = isPlayerUnavailable(availabilities, p.id, training.date);
      if (unavail) {
        additions[p.id] = { ...emptyAttendance(), present: false, statut: "Absent", raison: t(`avail_${unavail.status}`) };
        changed = true;
      }
    });
    if (changed) {
      const nextAll = { ...attendance, ...additions };
      setAttendance(nextAll);
      patch({ attendance: nextAll });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [training.id, availabilities, players.length]);

  const exercises = training.exercises || [];
  const addExercise = (ex, saveToLibrary) => {
    const entry = { ...ex, id: uid() };
    const nextExercises = [...exercises, entry];
    patch({ exercises: nextExercises });
    if (saveToLibrary) setExerciseLibrary([...exerciseLibrary, { ...ex, id: uid() }]);
    setShowNewExercise(false);
  };
  const pickFromLibrary = (ex) => {
    patch({ exercises: [...exercises, { ...ex, id: uid() }] });
    setShowLibrary(false);
  };
  const removeExercise = (id) => patch({ exercises: exercises.filter((e) => e.id !== id) });

  const sessionLoad = exercises.reduce((sum, e) => sum + (Number(e.duration) || 0) * (Number(e.rpe) || 0), 0);
  const exercisesDuration = exercises.reduce((sum, e) => sum + (Number(e.duration) || 0), 0);
  const computedCoachRpe = exercisesDuration > 0 ? Math.round((sessionLoad / exercisesDuration) * 10) / 10 : null;
  const hasManualCoachRpe = training.coachRpe !== "" && training.coachRpe !== undefined && training.coachRpe !== null;
  const coachRpeDisplay = hasManualCoachRpe ? training.coachRpe : computedCoachRpe;
  const rpeValues = players.map((p) => Number(attendance[p.id]?.rpe)).filter((v) => !isNaN(v) && v > 0);
  const playersAvgRpe = rpeValues.length ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10 : null;

  return (
    <div>
      <button className="back-link" onClick={() => setView("entrainements")}><ChevronLeft size={16} /> {t("entr_detail_back")}</button>
      <div className="view-header">
        <div>
          <h1 style={{ marginBottom: 2 }}>{training.objective || t("entr_detail_default_title")}</h1>
          <p className="muted mono">{formatDate(training.date)} {training.time || ""} {training.duration ? `· ${training.duration} min` : ""} {training.opponent ? `· vs ${training.opponent}` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" onClick={() => setShowEditInfo(true)}><Pencil size={16} /> {t("common_edit")}</button>
          <button className="icon-btn" onClick={() => { if (confirm(t("confirm_delete_session"))) { setTrainings(trainings.filter((t2) => t2.id !== trainingId)); setView("entrainements"); } }}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label={t("entr_present_count")} value={`${presentCount}/${trackedPlayers.length}`} icon={UserCheck} />
        <MetricCard label={t("session_load_total")} value={sessionLoad || "—"} icon={Gauge} />
        <MetricCard
          label={t("field_coach_rpe") + (!hasManualCoachRpe && computedCoachRpe !== null ? ` (${t("auto_computed_short")})` : "")}
          value={coachRpeDisplay ?? "—"}
          icon={Gauge}
        />
        <MetricCard label={t("players_avg_rpe")} value={playersAvgRpe ?? "—"} icon={Gauge} />
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{t("panel_exercises")}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" onClick={() => setShowLibrary(true)}>{t("exercise_add_from_library")}</button>
            <button className="btn-gold" onClick={() => setShowNewExercise(true)}><Plus size={16} /> {t("exercise_add_new")}</button>
          </div>
        </div>
        {exercises.length === 0 && <p className="muted">{t("no_exercises_yet")}</p>}
        {exercises.length > 0 && (
          <table className="stats-table">
            <thead><tr><th>{t("field_exercise_name")}</th><th>{t("field_category")}</th><th>{t("field_duration_min")}</th><th>{t("th_rpe")}</th><th>Load</th><th /></tr></thead>
            <tbody>
              {exercises.map((ex) => {
                const CatIcon = EXERCISE_CATEGORY_ICONS[ex.category];
                return (
                <tr key={ex.id}>
                  <td>{ex.name}</td>
                  <td>{CatIcon && <CatIcon size={13} style={{ marginRight: 5, verticalAlign: -2, color: "var(--chalk-dim)" }} />}{t(EXERCISE_CATEGORY_KEYS[ex.category])}</td>
                  <td className="mono">{ex.duration || "—"}</td>
                  <td className="mono">{ex.rpe || "—"}</td>
                  <td className="mono">{(Number(ex.duration) || 0) * (Number(ex.rpe) || 0)}</td>
                  <td><button className="icon-btn" onClick={() => removeExercise(ex.id)}><Trash2 size={13} /></button></td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>{t("entr_table_title")}</h3>
          {availableGuests.length > 0 && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select value={guestToAdd} onChange={(e) => setGuestToAdd(e.target.value)}>
                {availableGuests.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="icon-btn" onClick={addGuestToSession}><Plus size={14} /> {t("add_guest_to_session")}</button>
            </div>
          )}
        </div>
        <p className="muted" style={{ marginBottom: 10 }}>{t("uncheck_hint")}</p>
        {trackedPlayers.length === 0 && <p className="muted">{t("no_players_first")}</p>}
        {trackedPlayers.length > 0 && (() => {
          const rowsWithAttendance = trackedPlayers.map((p) => ({ p, a: attendance[p.id] || emptyAttendance() }));
          const presentRows = rowsWithAttendance.filter((r) => r.a.present);
          const absentRows = rowsWithAttendance.filter((r) => !r.a.present);
          const presentGroups = [...POSITIONS, ""].map((pos) => ({
            position: pos,
            rows: presentRows.filter((r) => (r.p.position || "") === pos),
          })).filter((g) => g.rows.length > 0);
          const renderRow = ({ p, a }) => {
            const isGuest = (p.status || "titulaire") === "invite";
            return (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge number={p.number} size={26} /><span>{p.name}</span>
                    {isGuest && <span className="status-chip" style={{ background: "var(--chalk-dim)" }}>{t("badge_guest")}</span>}
                  </div>
                </td>
                <td>
                  <select value={a.statut || "Présent"} onChange={(e) => update(p.id, "statut", e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_LABEL_KEYS[s])}</option>)}
                  </select>
                </td>
                <td><input className="cell-input" type="number" min="0" max="10" disabled={!a.present} value={a.rpe} onChange={(e) => update(p.id, "rpe", e.target.value)} /></td>
                {training.isPhysicalTest && (
                  <td><input className="cell-input" type="number" step="0.1" disabled={!a.present} value={a.vma} onChange={(e) => update(p.id, "vma", e.target.value)} /></td>
                )}
                <td><input className="cell-input" style={{ width: 140 }} disabled={a.present} value={a.raison} onChange={(e) => update(p.id, "raison", e.target.value)} placeholder="—" /></td>
                <td>{isGuest && <button className="icon-btn" onClick={() => removeGuestFromSession(p.id)}><Trash2 size={13} /></button>}</td>
              </tr>
            );
          };
          return (
            <table className="stats-table entry-table">
              <thead>
                <tr>
                  <th>{t("th_player")}</th><th>{t("field_status")}</th><th>{t("th_rpe")}</th>
                  {training.isPhysicalTest && <th>{t("th_vma_kmh")}</th>}
                  <th>{t("th_reason")}</th><th />
                </tr>
              </thead>
              {presentGroups.map((g) => (
                <tbody key={g.position || "none"}>
                  <tr className="table-group-row">
                    <td colSpan={training.isPhysicalTest ? 6 : 5}>{g.position ? t(POSITION_KEYS[g.position]) : t("column_no_position")}</td>
                  </tr>
                  {g.rows.map(renderRow)}
                </tbody>
              ))}
              {absentRows.length > 0 && (
                <tbody>
                  <tr className="table-group-row table-group-row-muted">
                    <td colSpan={training.isPhysicalTest ? 6 : 5}>{t("attendance_absent_group")}</td>
                  </tr>
                  {absentRows.map(renderRow)}
                </tbody>
              )}
            </table>
          );
        })()}
        <p className="muted" style={{ marginTop: 10 }}>{t("autosave_note")}</p>
      </div>

      {showLibrary && <LibraryPicker exerciseLibrary={exerciseLibrary} onPick={pickFromLibrary} onClose={() => setShowLibrary(false)} />}
      {showNewExercise && <ExerciseForm onSave={addExercise} onClose={() => setShowNewExercise(false)} />}
      {showEditInfo && <TrainingForm initial={training} onSave={saveEditInfo} onClose={() => setShowEditInfo(false)} />}
    </div>
  );
}
