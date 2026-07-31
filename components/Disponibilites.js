import { useState, useMemo } from "react";
import { Plus, Trash2, Dumbbell, CalendarDays, ChevronLeft, ChevronRight, List, Grid3x3 } from "lucide-react";
import { useLang } from "../lib/i18n";
import { uid, Modal, DateField, UNAVAILABILITY_STATUSES, AVAILABILITY_KEYS, todayStr, formatDate, addDaysToDateStr, matchesAvailability } from "../lib/shared";

const STATUS_COLORS = {
  "Disponible": "var(--gold)", "Absent": "#DC2626", "Vacances": "#EA580C",
  "Blessé": "#A16207", "Suspendu": "#7C3AED", "Travail": "#475569", "Autre": "#6B7280",
};
const statusChipStyle = (status) => ({
  background: STATUS_COLORS[status] || STATUS_COLORS.Autre,
  color: "var(--on-accent)",
  border: "1px solid rgba(15,23,42,0.08)",
});

function statusForDate(availabilities, playerId, dateStr) {
  const matches = availabilities.filter((a) => a.playerId === playerId && matchesAvailability(a, dateStr));
  if (!matches.length) return null; // pas d'entrée = disponible par défaut
  return matches.sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
}

function getUpcomingEvents(matches, trainings) {
  const today = todayStr();
  const in30 = addDaysToDateStr(today, 30);
  const inWindow = (d) => d >= today && d <= in30;
  const trainingEvents = (trainings || []).filter((tr) => inWindow(tr.date)).map((tr) => ({ id: "t-" + tr.id, date: tr.date, type: "training" }));
  const matchEvents = (matches || []).filter((m) => inWindow(m.date)).map((m) => ({ id: "m-" + m.id, date: m.date, type: "match" }));
  return [...trainingEvents, ...matchEvents].sort((a, b) => (a.date > b.date ? 1 : -1));
}

function DispoForm({ players, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    playerId: players[0]?.id || "",
    status: UNAVAILABILITY_STATUSES[0],
    startDate: todayStr(),
    endDate: "",
    note: "",
    recurring: false,
  });
  const weekdayLabel = form.startDate
    ? new Date(form.startDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" })
    : "";
  return (
    <Modal title={t("dispo_form_title")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("th_player")}
          <select value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>{t("field_status")}
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {UNAVAILABILITY_STATUSES.map((s) => <option key={s} value={s}>{t(AVAILABILITY_KEYS[s])}</option>)}
          </select>
        </label>
        <label>{t("field_start_date")}<DateField value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} /></label>
        <label>{form.recurring ? t("field_recur_until") : t("field_end_date")}<DateField value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} /></label>
        <label>{t("field_note")}<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
          {t("dispo_recurring_label")}
        </label>
      </div>
      {form.recurring && form.startDate && <p className="muted" style={{ fontSize: 12.5, marginTop: -8, marginBottom: 14 }}>{t("dispo_recurring_hint")} {weekdayLabel}.</p>}
      <button
        className="btn-gold"
        onClick={() => {
          if (!form.playerId) return;
          const { recurring, ...base } = form;
          const entry = recurring
            ? { id: uid(), ...base, recurringDayOfWeek: new Date(form.startDate + "T00:00:00").getDay() }
            : { id: uid(), ...base };
          onSave(entry);
        }}
      >
        {t("common_save")}
      </button>
    </Modal>
  );
}

function MonthCalendar({ players, availabilities }) {
  const { t } = useLang();
  const [monthOffset, setMonthOffset] = useState(0);

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

  const affectedByDay = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dateStr(d);
      map[d] = availabilities.filter((a) => matchesAvailability(a, ds));
    }
    return map;
  }, [availabilities, year, month]);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => setMonthOffset(monthOffset - 1)}><ChevronLeft size={15} /></button>
        <span style={{ fontWeight: 600, fontSize: 13.5, textTransform: "capitalize" }}>{monthLabel}</span>
        <button className="icon-btn" onClick={() => setMonthOffset(monthOffset + 1)}><ChevronRight size={15} /></button>
      </div>
      <div className="cal-grid cal-grid-head">
        {[t("cal_mon"), t("cal_tue"), t("cal_wed"), t("cal_thu"), t("cal_fri"), t("cal_sat"), t("cal_sun")].map((d) => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={"pad" + i} className="cal-cell cal-cell-empty" />;
          const affected = affectedByDay[d] || [];
          const isToday = dateStr(d) === todayStr();
          return (
            <div key={d} className={"cal-cell" + (isToday ? " cal-cell-today" : "")}>
              <span className="cal-day-num">{d}</span>
              <div className="cal-dots">
                {affected.slice(0, 4).map((a) => (
                  <span key={a.id} className="cal-dot" style={{ background: STATUS_COLORS[a.status] }} title={`${players.find((p) => p.id === a.playerId)?.name || "?"} · ${t(AVAILABILITY_KEYS[a.status])}`} />
                ))}
                {affected.length > 4 && <span className="cal-dot-more">+{affected.length - 4}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Disponibilites({ players, availabilities, setAvailabilities, matches, trainings }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [historyMode, setHistoryMode] = useState("list");
  const upcomingEvents = useMemo(() => getUpcomingEvents(matches, trainings), [matches, trainings]);
  const today = todayStr();
  const isRecurringEntry = (a) => a.recurringDayOfWeek !== undefined && a.recurringDayOfWeek !== null && a.recurringDayOfWeek !== "";
  const isExpiredRecurring = (a) => isRecurringEntry(a) && a.endDate && a.endDate < today;
  const activeRecurring = availabilities.filter((a) => isRecurringEntry(a) && !isExpiredRecurring(a));
  const history = [...availabilities]
    .filter((a) => !isRecurringEntry(a) || isExpiredRecurring(a))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
    .slice(0, 40);

  const save = (entry) => { setAvailabilities([...availabilities, entry]); setShowForm(false); };
  const remove = (id) => setAvailabilities(availabilities.filter((a) => a.id !== id));

  return (
    <div>
      <div className="view-header">
        <h1>{t("dispo_title")}</h1>
        <button className="btn-gold" onClick={() => setShowForm(true)}><Plus size={16} /> {t("dispo_add")}</button>
      </div>

      {players.length === 0 && <p className="muted">{t("no_players_first")}</p>}

      {players.length > 0 && (
        <div className="panel" style={{ overflowX: "auto" }}>
          <h3>{t("dispo_calendar_title")}</h3>
          {upcomingEvents.length === 0 && <p className="muted">{t("no_upcoming_events")}</p>}
          {upcomingEvents.length > 0 && (
            <table className="stats-table">
              <thead>
                <tr>
                  <th>{t("th_player")}</th>
                  {upcomingEvents.map((ev) => {
                    const Icon = ev.type === "match" ? CalendarDays : Dumbbell;
                    return (
                      <th key={ev.id}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <Icon size={12} />
                          <span className="mono">{formatDate(ev.date).slice(0, 5)}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    {upcomingEvents.map((ev) => {
                      const entry = statusForDate(availabilities, p.id, ev.date);
                      const status = entry?.status || "Disponible";
                      return (
                        <td key={ev.id} style={{ textAlign: "center" }}>
                          <span className="status-dot" style={{ background: STATUS_COLORS[status] }} title={t(AVAILABILITY_KEYS[status])} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeRecurring.length > 0 && (
        <div className="panel">
          <h3>{t("dispo_active_rules_title")}</h3>
          {activeRecurring.map((a) => {
            const p = players.find((x) => x.id === a.playerId);
            const weekdayName = new Date(a.startDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" });
            return (
              <div key={a.id} className="match-row">
                <span style={{ flex: 1 }}>{p?.name || "—"}</span>
                <span className="status-chip" style={statusChipStyle(a.status)}>{t(AVAILABILITY_KEYS[a.status])}</span>
                <span className="muted mono" style={{ fontSize: 12.5 }}>{t("dispo_recurring_every")} {weekdayName}</span>
                <button className="icon-btn" onClick={() => remove(a.id)}><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>{t("dispo_history_title")}</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button className={"icon-btn" + (historyMode === "list" ? " active" : "")} onClick={() => setHistoryMode("list")}><List size={14} /></button>
            <button className={"icon-btn" + (historyMode === "calendar" ? " active" : "")} onClick={() => setHistoryMode("calendar")}><Grid3x3 size={14} /></button>
          </div>
        </div>
        {historyMode === "calendar" && <MonthCalendar players={players} availabilities={availabilities} />}
        {historyMode === "list" && (
          <>
            {history.length === 0 && <p className="muted">{t("dispo_none")}</p>}
            {history.length > 0 && (
              <table className="stats-table">
                <thead><tr><th>{t("th_player")}</th><th>{t("field_status")}</th><th>{t("field_start_date")}</th><th>{t("field_end_date")}</th><th>{t("field_note")}</th><th /></tr></thead>
                <tbody>
                  {history.map((a) => {
                    const p = players.find((x) => x.id === a.playerId);
                    const isRecurring = a.recurringDayOfWeek !== undefined && a.recurringDayOfWeek !== null && a.recurringDayOfWeek !== "";
                    const weekdayName = isRecurring
                      ? new Date(a.startDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" })
                      : "";
                    return (
                      <tr key={a.id}>
                        <td>{p?.name || "—"}</td>
                        <td><span className="status-chip" style={statusChipStyle(a.status)}>{t(AVAILABILITY_KEYS[a.status])}</span></td>
                        <td className="mono">
                          {isRecurring ? (
                            <span className="recurring-badge"><CalendarDays size={11} /> {t("dispo_recurring_every")} {weekdayName}</span>
                          ) : formatDate(a.startDate)}
                        </td>
                        <td className="mono">{a.endDate ? formatDate(a.endDate) : (isRecurring ? t("dispo_recurring_ongoing") : "—")}</td>
                        <td className="muted">{a.note || "—"}</td>
                        <td><button className="icon-btn" onClick={() => remove(a.id)}><Trash2 size={13} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {showForm && <DispoForm players={players} onSave={save} onClose={() => setShowForm(false)} />}
    </div>
  );
}
