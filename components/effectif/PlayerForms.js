import { useState } from "react";
import { Save } from "lucide-react";
import { useLang } from "../../lib/i18n";
import { uid, Modal, DateField, POSITIONS, POSITION_KEYS, POSITION_SPECIFICITES, STRONG_FOOT, FOOT_KEYS, PLAYER_STATUSES, PLAYER_STATUS_KEYS, isNumberTaken } from "../../lib/shared";

/* ---------------- bulk add (by position) ---------------- */

export function PlayerBulkForm({ existingPlayers, onSave, onClose }) {
  const { t } = useLang();
  const [position, setPosition] = useState(POSITIONS[0]);
  const [status, setStatus] = useState("titulaire");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const newPlayers = lines.map((line) => {
      const [name, number] = line.split(",").map((x) => (x || "").trim());
      return { id: uid(), name, number: number || "", position, status, specificite: "", secondaryPositions: [], birthDate: "", height: "", weight: "", strongFoot: "" };
    }).filter((p) => p.name);

    const seen = [];
    for (const p of newPlayers) {
      if (!p.number) continue;
      if (isNumberTaken(existingPlayers || [], p.number) || seen.includes(p.number)) {
        setError(`${t("number_already_taken")} : ${p.number} (${p.name})`);
        return;
      }
      seen.push(p.number);
    }
    setError("");
    if (newPlayers.length) onSave(newPlayers);
  };

  return (
    <Modal title={t("bulk_form_title")} onClose={onClose}>
      <div className="form-grid" style={{ marginBottom: 8 }}>
        <label>{t("bulk_form_position_label")}
          <select value={position} onChange={(e) => setPosition(e.target.value)}>
            {POSITIONS.map((p) => <option key={p} value={p}>{t(POSITION_KEYS[p])}</option>)}
          </select>
        </label>
        <label>{t("field_player_status")}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {PLAYER_STATUSES.map((s) => <option key={s} value={s}>{t(PLAYER_STATUS_KEYS[s])}</option>)}
          </select>
        </label>
      </div>
      <p className="muted" style={{ marginBottom: 10 }}>{t("bulk_form_help")}</p>
      <textarea
        className="bulk-textarea"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Jean Dupont, 10\nMarc Lambert, 4\nSofiane Aït\n..."}
      />
      {error && <p className="mono" style={{ color: "var(--red)", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
      <button className="btn-gold" style={{ marginTop: 14 }} onClick={submit}>
        <Save size={16} /> {t("bulk_form_submit")}
      </button>
    </Modal>
  );
}

/* ---------------- edit form ---------------- */

export function PlayerEditForm({ initial, existingPlayers, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState({ secondaryPositions: [], height: "", weight: "", strongFoot: "", birthDate: "", status: "titulaire", ...initial });
  const [error, setError] = useState("");

  const toggleSecondary = (pos) => {
    const has = form.secondaryPositions.includes(pos);
    setForm({
      ...form,
      secondaryPositions: has ? form.secondaryPositions.filter((p) => p !== pos) : [...form.secondaryPositions, pos],
    });
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (isNumberTaken(existingPlayers || [], form.number, form.id)) {
      setError(`${t("number_already_taken")} : ${form.number}`);
      return;
    }
    setError("");
    onSave(form);
  };

  return (
    <Modal title={t("edit_form_title")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_name")}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>{t("field_player_status")}
          <select value={form.status || "titulaire"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PLAYER_STATUSES.map((s) => <option key={s} value={s}>{t(PLAYER_STATUS_KEYS[s])}</option>)}
          </select>
        </label>
        <label>{t("field_number")}<input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></label>
        <label>{t("field_position")}
          <select value={form.position || ""} onChange={(e) => setForm({ ...form, position: e.target.value })}>
            <option value="">{t("common_none")}</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{t(POSITION_KEYS[p])}</option>)}
          </select>
        </label>
        <label>{t("field_specificite")}
          <input value={form.specificite || ""} onChange={(e) => setForm({ ...form, specificite: e.target.value })} list="spec-list" placeholder="DC, MC, BU..." />
          <datalist id="spec-list">
            {(POSITION_SPECIFICITES[form.position] || []).map((s) => <option key={s} value={s} />)}
          </datalist>
        </label>
        <label>{t("field_secondary_positions")}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {POSITIONS.filter((p) => p !== form.position).map((p) => (
              <label key={p} style={{ display: "flex", alignItems: "center", gap: 4, flexDirection: "row", fontSize: 12.5 }}>
                <input type="checkbox" checked={form.secondaryPositions.includes(p)} onChange={() => toggleSecondary(p)} /> {t(POSITION_KEYS[p])}
              </label>
            ))}
          </div>
        </label>
        <label>{t("field_birthyear")}<DateField value={form.birthDate || ""} onChange={(v) => setForm({ ...form, birthDate: v })} /></label>
        <label>{t("field_strong_foot")}
          <select value={form.strongFoot || ""} onChange={(e) => setForm({ ...form, strongFoot: e.target.value })}>
            <option value="">{t("common_none")}</option>
            {STRONG_FOOT.map((f) => <option key={f} value={f}>{t(FOOT_KEYS[f])}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="mono" style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 8 }}>{error}</p>}
      <button className="btn-gold" onClick={submit}>
        <Save size={16} /> {t("common_save")}
      </button>
    </Modal>
  );
}
