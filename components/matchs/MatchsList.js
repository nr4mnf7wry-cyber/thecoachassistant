import { useState, useRef, useMemo } from "react";
import { Plus, Trash2, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useLang } from "../../lib/i18n";
import { DEFAULT_SEASON, formatDate, compareValues, useSortState, useSelection } from "../../lib/shared";
import { parseMatchSheet, downloadTemplate, newMatch } from "../../lib/matchHelpers";
import { MatchForm } from "./MatchForm";

export function Matchs({ matches, setMatches, currentSeason, setView }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const { selected, toggle: toggleSelect, clear: clearSelection } = useSelection();
  const { sort, toggleSort, sortArrow } = useSortState("date");
  const fileRef = useRef(null);

  const saveMatch = (form) => { setMatches([...matches, newMatch({ ...form, season: currentSeason })]); setShowForm(false); };

  const removeOne = (id) => { if (confirm(t("confirm_delete_match"))) setMatches(matches.filter((m) => m.id !== id)); };
  const removeSelected = () => {
    if (!selected.length) return;
    if (confirm(t("confirm_delete_selection"))) {
      setMatches(matches.filter((m) => !selected.includes(m.id)));
      clearSelection();
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const imported = parseMatchSheet(rows).map((m) => ({ ...m, season: currentSeason }));
        if (imported.length) setMatches([...matches, ...imported]);
        else alert(t("matchs_import_error"));
      } catch (err) {
        console.error(err);
        alert(t("matchs_import_fail"));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const sorted = useMemo(() => {
    const base = matches.filter((m) => (m.season || DEFAULT_SEASON) === currentSeason);
    const { key, dir } = sort;
    return [...base].sort((a, b) => {
      let va, vb;
      if (key === "venue") { va = a.homeAway === "domicile" ? t("home") : t("away"); vb = b.homeAway === "domicile" ? t("home") : t("away"); }
      else if (key === "score") { va = Number(a.scoreFor) || 0; vb = Number(b.scoreFor) || 0; }
      else { va = a[key] || ""; vb = b[key] || ""; }
      return compareValues(va, vb, dir);
    });
  }, [matches, currentSeason, sort, t]);

  return (
    <div>
      <div className="view-header">
        <h1>{t("matchs_title")}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {selected.length > 0 && (
            <button className="icon-btn" onClick={removeSelected}><Trash2 size={14} /> {t("delete_selection")} ({selected.length})</button>
          )}
          <button className="icon-btn" onClick={downloadTemplate} title={t("matchs_template")}><Download size={16} /></button>
          <button className="btn-gold" style={{ background: "transparent", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} onClick={() => fileRef.current.click()}>
            <Upload size={16} /> {t("matchs_import")}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
          <button className="btn-gold" onClick={() => setShowForm(true)}><Plus size={16} /> {t("matchs_add")}</button>
        </div>
      </div>

      {sorted.length === 0 && <p className="muted">{t("matchs_none")}</p>}

      {sorted.length > 0 && (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="stats-table">
            <thead>
              <tr>
                <th />
                <th className="sortable-th" onClick={() => toggleSort("date")}>{t("th_date")}{sortArrow("date")}</th>
                <th className="sortable-th" onClick={() => toggleSort("opponent")}>{t("th_opponent")}{sortArrow("opponent")}</th>
                <th className="sortable-th" onClick={() => toggleSort("venue")}>{t("field_venue")}{sortArrow("venue")}</th>
                <th className="sortable-th" onClick={() => toggleSort("competition")}>{t("field_competition")}{sortArrow("competition")}</th>
                <th className="sortable-th" onClick={() => toggleSort("score")}>Score{sortArrow("score")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id}>
                  <td><input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                  <td className="mono" style={{ cursor: "pointer" }} onClick={() => setView("match:" + m.id)}>{formatDate(m.date)}</td>
                  <td style={{ cursor: "pointer" }} onClick={() => setView("match:" + m.id)}>{m.opponent}</td>
                  <td className="muted" style={{ cursor: "pointer" }} onClick={() => setView("match:" + m.id)}>{m.homeAway === "domicile" ? t("home") : t("away")}</td>
                  <td className="muted" style={{ cursor: "pointer" }} onClick={() => setView("match:" + m.id)}>{m.competition || "—"}</td>
                  <td className="mono" style={{ cursor: "pointer" }} onClick={() => setView("match:" + m.id)}>{m.scoreFor !== "" ? m.scoreFor : "–"} - {m.scoreAgainst !== "" ? m.scoreAgainst : "–"}</td>
                  <td><button className="icon-btn" onClick={() => removeOne(m.id)}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <MatchForm onSave={saveMatch} onClose={() => setShowForm(false)} />}
    </div>
  );
}
