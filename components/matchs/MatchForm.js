import { useState } from "react";
import { Save } from "lucide-react";
import { useLang } from "../../lib/i18n";
import { Modal, DateField } from "../../lib/shared";

export function MatchForm({ initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(initial || { date: "", opponent: "", homeAway: "domicile", competition: "", scoreFor: "", scoreAgainst: "" });
  return (
    <Modal title={initial ? t("matchform_edit_title") : t("matchs_add")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_date")}<DateField value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></label>
        <label>{t("field_opponent")}<input value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} /></label>
        <label>{t("field_venue")}
          <select value={form.homeAway} onChange={(e) => setForm({ ...form, homeAway: e.target.value })}>
            <option value="domicile">{t("home")}</option><option value="exterieur">{t("away")}</option>
          </select>
        </label>
        <label>{t("field_competition")}<input value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} /></label>
        <label>{t("field_score_for")}<input type="number" value={form.scoreFor} onChange={(e) => setForm({ ...form, scoreFor: e.target.value })} /></label>
        <label>{t("field_score_against")}<input type="number" value={form.scoreAgainst} onChange={(e) => setForm({ ...form, scoreAgainst: e.target.value })} /></label>
      </div>
      <button className="btn-gold" onClick={() => { if (form.date && form.opponent.trim()) onSave(form); }}><Save size={16} /> {t("common_save")}</button>
    </Modal>
  );
}
