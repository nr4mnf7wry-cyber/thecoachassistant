import { useState, useMemo } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useLang } from "../lib/i18n";
import {
  Badge, Modal, DateField,
  BODY_PARTS, INJURY_TYPES, INJURY_SEVERITIES, BODY_PART_KEYS, INJURY_TYPE_KEYS, INJURY_SEVERITY_KEYS,
  newInjury, injuryStatus, aggregateInjuries, formatDate,
} from "../lib/shared";

const SEVERITY_COLORS = { "Légère": "var(--gold)", "Modérée": "var(--yellow)", "Sévère": "var(--red)" };
const STATUS_COLORS = { ongoing: "var(--yellow)", overdue: "var(--red)", recovered: "var(--chalk-dim)" };
const STATUS_KEYS = { ongoing: "injury_status_ongoing", overdue: "injury_status_overdue", recovered: "injury_status_recovered" };

function InjuryForm({ players, initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(initial || newInjury());
  const linkAvailability = !initial;

  return (
    <Modal title={initial ? t("injury_edit_title") : t("injury_new_title")} onClose={onClose} wide>
      <div className="form-grid">
        <label>{t("field_player")}
          <select value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}>
            <option value="">—</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>{t("field_date")}<DateField value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></label>
        <label>{t("injury_body_part")}
          <select value={form.bodyPart} onChange={(e) => setForm({ ...form, bodyPart: e.target.value })}>
            <option value="">—</option>
            {BODY_PARTS.map((b) => <option key={b} value={b}>{t(BODY_PART_KEYS[b])}</option>)}
          </select>
        </label>
        <label>{t("injury_type")}
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="">—</option>
            {INJURY_TYPES.map((ty) => <option key={ty} value={ty}>{t(INJURY_TYPE_KEYS[ty])}</option>)}
          </select>
        </label>
        <label>{t("injury_severity")}
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {INJURY_SEVERITIES.map((s) => <option key={s} value={s}>{t(INJURY_SEVERITY_KEYS[s])}</option>)}
          </select>
        </label>
        <label>{t("injury_expected_return")}<DateField value={form.expectedReturn} onChange={(v) => setForm({ ...form, expectedReturn: v })} /></label>
        <label>{t("injury_actual_return")}<DateField value={form.actualReturn} onChange={(v) => setForm({ ...form, actualReturn: v })} /></label>
      </div>
      <label style={{ display: "block", marginBottom: 14 }}>{t("field_notes")}
        <textarea className="bulk-textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </label>
      <button className="btn-gold" onClick={() => { if (form.playerId && form.date) onSave(form, linkAvailability); }}>{t("common_save")}</button>
    </Modal>
  );
}

export function Injuries({ players, injuries, setInjuries, availabilities, setAvailabilities }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const sorted = useMemo(() => [...injuries].sort((a, b) => (a.date < b.date ? 1 : -1)), [injuries]);
  const { bodyPartRanking, byPlayer } = useMemo(() => aggregateInjuries(injuries), [injuries]);
  const topPlayers = useMemo(() => {
    return Object.entries(byPlayer)
      .map(([playerId, count]) => ({ player: players.find((p) => p.id === playerId), count }))
      .filter((r) => r.player)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [byPlayer, players]);

  const save = (form, linkAvailability) => {
    const exists = injuries.some((i) => i.id === form.id);
    setInjuries(exists ? injuries.map((i) => (i.id === form.id ? form : i)) : [...injuries, form]);
    const linkedAvId = form.id + "-av";
    if (!exists && linkAvailability && form.playerId && form.date) {
      setAvailabilities([...availabilities, {
        id: linkedAvId, playerId: form.playerId, status: "Blessé",
        startDate: form.date, endDate: form.expectedReturn || "", note: t("injury_auto_note"),
      }]);
    } else if (exists && availabilities.some((a) => a.id === linkedAvId)) {
      // La blessure a une disponibilité liée (créée automatiquement) : on la garde synchronisée
      // avec les dates de la blessure quand celles-ci sont modifiées.
      setAvailabilities(availabilities.map((a) => (
        a.id === linkedAvId ? { ...a, startDate: form.date, endDate: form.expectedReturn || "" } : a
      )));
    }
    setShowForm(false);
    setEditing(null);
  };
  const remove = (id) => {
    if (!confirm(t("confirm_delete_injury"))) return;
    setInjuries(injuries.filter((i) => i.id !== id));
    const linkedAvId = id + "-av";
    if (availabilities.some((a) => a.id === linkedAvId)) {
      setAvailabilities(availabilities.filter((a) => a.id !== linkedAvId));
    }
  };

  return (
    <div>
      <div className="view-header">
        <h1>{t("injuries_title")}</h1>
        <button className="btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> {t("injury_new_title")}</button>
      </div>

      {injuries.length > 0 && (
        <div className="flat-cols">
          <div>
            <h3>{t("injury_by_body_part")}</h3>
            {bodyPartRanking.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
            {bodyPartRanking.map((r, i) => (
              <div key={r.part} className="rank-card">
                <span className="rank-card-number">{i + 1}</span>
                <div className="rank-card-info"><div className="rank-card-name">{t(BODY_PART_KEYS[r.part]) || r.part}</div></div>
                <span className="rank-card-value">{r.count}</span>
              </div>
            ))}
          </div>
          <div>
            <h3>{t("injury_most_affected")}</h3>
            {topPlayers.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
            {topPlayers.map((r, i) => (
              <div key={r.player.id} className="rank-card">
                <span className="rank-card-number">{i + 1}</span>
                <Badge number={r.player.number} size={34} />
                <div className="rank-card-info"><div className="rank-card-name">{r.player.name}</div></div>
                <span className="rank-card-value">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ overflowX: "auto" }}>
        <h3>{t("injury_history")}</h3>
        {sorted.length === 0 && <p className="muted">{t("injuries_none")}</p>}
        {sorted.length > 0 && (
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t("field_player")}</th><th>{t("th_date")}</th><th>{t("injury_body_part")}</th>
                <th>{t("injury_type")}</th><th>{t("injury_severity")}</th><th>{t("injury_expected_return")}</th>
                <th>{t("field_status")}</th><th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => {
                const p = players.find((x) => x.id === i.playerId);
                const status = injuryStatus(i);
                return (
                  <tr key={i.id}>
                    <td>{p ? p.name : "—"}</td>
                    <td className="mono">{formatDate(i.date)}</td>
                    <td>{i.bodyPart ? t(BODY_PART_KEYS[i.bodyPart]) : "—"}</td>
                    <td>{i.type ? t(INJURY_TYPE_KEYS[i.type]) : "—"}</td>
                    <td><span className="status-chip" style={{ background: SEVERITY_COLORS[i.severity] }}>{t(INJURY_SEVERITY_KEYS[i.severity])}</span></td>
                    <td className="mono">{i.expectedReturn ? formatDate(i.expectedReturn) : "—"}</td>
                    <td><span className="status-chip" style={{ background: STATUS_COLORS[status] }}>{t(STATUS_KEYS[status])}</span></td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button className="icon-btn" onClick={() => { setEditing(i); setShowForm(true); }}><Pencil size={13} /></button>
                      <button className="icon-btn" onClick={() => remove(i.id)}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <InjuryForm players={players} initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
