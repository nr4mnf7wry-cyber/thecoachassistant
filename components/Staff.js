import { useState } from "react";
import { Plus, Trash2, Pencil, Save } from "lucide-react";
import { useLang } from "../lib/i18n";
import { uid, Avatar, Modal } from "../lib/shared";

function StaffForm({ initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(initial || { name: "", role: "", phone: "", email: "" });
  return (
    <Modal title={initial ? t("staff_form_title_edit") : t("staff_form_title_add")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_name")}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>{t("field_role")}
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} list="roles-list" />
          <datalist id="roles-list">
            <option value="Coach principal" /><option value="Assistant coach" /><option value="Préparateur physique" />
            <option value="Kinésithérapeute" /><option value="Délégué" /><option value="Gardien coach" />
          </datalist>
        </label>
        <label>{t("field_phone")}<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+32..." /></label>
        <label>{t("field_email")}<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.be" /></label>
      </div>
      <button className="btn-gold" onClick={() => { if (form.name.trim()) onSave(form); }}>
        <Save size={16} /> {t("common_save")}
      </button>
    </Modal>
  );
}

export function Staff({ staff, setStaff }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const save = (form) => {
    if (editing) setStaff(staff.map((s) => (s.id === editing.id ? { ...s, ...form } : s)));
    else setStaff([...staff, { id: uid(), ...form }]);
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div>
      <div className="view-header">
        <h1>{t("staff_title")}</h1>
        <button className="btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> {t("staff_add")}</button>
      </div>
      {staff.length === 0 && <p className="muted">{t("staff_none")}</p>}
      <div className="player-grid">
        {staff.map((s) => (
          <div key={s.id} className="player-card">
            <div className="player-card-main" style={{ cursor: "default" }}>
              <Avatar name={s.name} size={40} />
              <div>
                <div className="player-name">{s.name}</div>
                <div className="muted">{s.role || "—"}{s.phone ? ` · ${s.phone}` : ""}</div>
              </div>
            </div>
            <div className="player-card-actions">
              <button className="icon-btn" onClick={() => { setEditing(s); setShowForm(true); }}><Pencil size={15} /></button>
              <button className="icon-btn" onClick={() => { if (confirm(t("confirm_delete_staff"))) setStaff(staff.filter((x) => x.id !== s.id)); }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {showForm && <StaffForm initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
