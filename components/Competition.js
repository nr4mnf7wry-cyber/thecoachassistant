import { useState, useRef, useMemo, useEffect } from "react";
import { Plus, Trash2, Pencil, ChevronLeft, ChevronDown, Upload, Download, Save } from "lucide-react";
import { useLang } from "../lib/i18n";
import * as XLSX from "xlsx";
import { Modal, DateField, formatDate, POSITIONS, POSITION_KEYS, GOAL_TYPE_GROUPS, FORMATIONS, formationSlotCount, Badge, uid } from "../lib/shared";
import { parseLeagueWorkbook, downloadLeagueTemplate, newLeagueMatch, getTeamComposition, findLatestTeamData, computeAppearanceMinutes } from "../lib/leagueHelpers";

/* ---------------- création / import ---------------- */

function MatchForm({ initial, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState(initial || { date: "", matchday: "", homeTeam: "", awayTeam: "", homeScore: "", awayScore: "", duration: "90" });
  return (
    <Modal title={t("competition_match_form_title")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_date")}<DateField value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></label>
        <label>{t("journee_label")}<input value={form.matchday} onChange={(e) => setForm({ ...form, matchday: e.target.value })} /></label>
        <label>{t("home")}<input value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} /></label>
        <label>{t("away")}<input value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} /></label>
        <label>{t("field_score_for")}<input type="number" value={form.homeScore} onChange={(e) => setForm({ ...form, homeScore: e.target.value })} /></label>
        <label>{t("field_score_against")}<input type="number" value={form.awayScore} onChange={(e) => setForm({ ...form, awayScore: e.target.value })} /></label>
        <label>{t("field_duration")}<input type="number" min="1" value={form.duration || "90"} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label>
      </div>
      <button className="btn-gold" onClick={() => { if (form.date && form.homeTeam.trim() && form.awayTeam.trim()) onSave(form); }}>
        <Save size={16} /> {t("common_save")}
      </button>
    </Modal>
  );
}

export function CompetitionList({ leagueMatches, setLeagueMatches, setView }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const fileRef = useRef(null);

  const saveMatch = (form) => {
    const appearances = [];
    const compositions = {};
    const homeTeam = form.homeTeam.trim();
    const awayTeam = form.awayTeam.trim();
    const homeData = findLatestTeamData(leagueMatches, homeTeam);
    if (homeData) {
      appearances.push(...homeData.appearances.map((a) => ({ ...a, team: "home" })));
      if (homeData.composition) compositions.home = homeData.composition;
    }
    const awayData = findLatestTeamData(leagueMatches, awayTeam);
    if (awayData) {
      appearances.push(...awayData.appearances.map((a) => ({ ...a, team: "away" })));
      if (awayData.composition) compositions.away = awayData.composition;
    }
    setLeagueMatches([...leagueMatches, newLeagueMatch({ ...form, appearances, compositions })]);
    setShowForm(false);
  };
  const removeMatch = (id) => { if (confirm(t("confirm_delete_match"))) setLeagueMatches(leagueMatches.filter((m) => m.id !== id)); };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        const imported = parseLeagueWorkbook(wb);
        if (!imported.length) { alert(t("league_import_error")); return; }
        const key = (m) => `${m.date}|${(m.homeTeam || "").trim().toLowerCase()}|${(m.awayTeam || "").trim().toLowerCase()}`;
        const untouched = leagueMatches.filter((m) => !imported.some((im) => key(im) === key(m)));
        setLeagueMatches([...untouched, ...imported]);
      } catch (err) {
        console.error(err);
        alert(t("league_import_fail"));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const groups = useMemo(() => {
    const map = {};
    leagueMatches.forEach((m) => {
      const key = m.matchday || "";
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return Object.entries(map)
      .map(([label, matches]) => ({ label, matches: matches.sort((a, b) => (a.date > b.date ? 1 : -1)) }))
      .sort((a, b) => {
        const da = a.matches[0]?.date || "";
        const db = b.matches[0]?.date || "";
        return da > db ? 1 : -1;
      });
  }, [leagueMatches]);

  const [collapsed, setCollapsed] = useState(null);
  useEffect(() => {
    if (collapsed !== null) return;
    setCollapsed(new Set(groups.slice(0, -2).map((g) => g.label)));
  }, [groups, collapsed]);
  const toggleGroup = (label) => {
    const next = new Set(collapsed);
    if (next.has(label)) next.delete(label); else next.add(label);
    setCollapsed(next);
  };

  return (
    <div>
      <div className="view-header">
        <h1>{t("competition_title")}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" onClick={downloadLeagueTemplate} title={t("matchs_template")}><Download size={16} /></button>
          <button
            className="btn-gold"
            style={{ background: "transparent", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }}
            onClick={() => fileRef.current.click()}
          >
            <Upload size={16} /> {t("league_import")}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
          <button className="btn-gold" onClick={() => setShowForm(true)}><Plus size={16} /> {t("competition_add_match")}</button>
        </div>
      </div>

      <p className="muted" style={{ marginBottom: 20 }}>{t("competition_help")}</p>

      {groups.length === 0 && <p className="muted">{t("journee_none")}</p>}

      {groups.map((g) => {
        const isCollapsed = collapsed?.has(g.label);
        return (
          <div key={g.label || "none"} className="panel" style={{ padding: 0 }}>
            <div className="journee-header" onClick={() => toggleGroup(g.label)}>
              <ChevronDown size={15} style={{ transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.12s ease" }} />
              <h3 style={{ margin: 0, flex: 1 }}>{g.label || t("journee_no_label")}</h3>
              <span className="muted mono" style={{ fontSize: 12 }}>{g.matches.length} {t("journee_match_count")}</span>
            </div>
            {!isCollapsed && g.matches.map((m) => (
              <div key={m.id} className="match-list-row" style={{ gridTemplateColumns: "100px 1fr 100px 32px" }}>
                <span className="mono muted" style={{ cursor: "pointer" }} onClick={() => setView("competition:" + m.id)}>{formatDate(m.date)}</span>
                <span style={{ cursor: "pointer" }} onClick={() => setView("competition:" + m.id)}>{m.homeTeam} — {m.awayTeam}</span>
                <span className="mono" style={{ cursor: "pointer" }} onClick={() => setView("competition:" + m.id)}>{m.homeScore !== "" ? m.homeScore : "–"}-{m.awayScore !== "" ? m.awayScore : "–"}</span>
                <button className="icon-btn" onClick={() => removeMatch(m.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        );
      })}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showManage ? 14 : 0 }}>
          <h3 style={{ margin: 0 }}>{t("league_manage_title")}</h3>
          <button className="icon-btn" onClick={() => setShowManage(!showManage)}>{showManage ? t("basic_stats") : t("league_manage_show")}</button>
        </div>
        {showManage && (
          <>
            {leagueMatches.length === 0 && <p className="muted">{t("league_none")}</p>}
            {leagueMatches.length > 0 && (
              <table className="stats-table">
                <thead><tr><th>{t("th_date")}</th><th>{t("home")}</th><th>{t("away")}</th><th>Score</th><th /></tr></thead>
                <tbody>
                  {[...leagueMatches].sort((a, b) => (a.date > b.date ? 1 : -1)).map((m) => (
                    <tr key={m.id}>
                      <td className="mono">{formatDate(m.date)}</td>
                      <td>{m.homeTeam}</td><td>{m.awayTeam}</td>
                      <td className="mono">{m.homeScore}-{m.awayScore}</td>
                      <td><button className="icon-btn" onClick={() => removeMatch(m.id)}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {showForm && <MatchForm onSave={saveMatch} onClose={() => setShowForm(false)} />}
    </div>
  );
}

/* ---------------- effectif ---------------- */

function AppearanceForm({ team, onSave, onClose }) {
  const { t } = useLang();
  const [form, setForm] = useState({ team, player: "", number: "", position: "", starter: null, minutes: "" });
  return (
    <Modal title={t("add_player_to_roster")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("field_name")}<input value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })} /></label>
        <label>{t("field_number")}<input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></label>
        <label>{t("field_position")}
          <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
            <option value="">{t("common_none")}</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{t(POSITION_KEYS[p])}</option>)}
          </select>
        </label>
        <label>{t("field_starter_status")}
          <select
            value={form.starter === null ? "" : form.starter ? "starter" : "sub"}
            onChange={(e) => setForm({ ...form, starter: e.target.value === "" ? null : e.target.value === "starter" })}
          >
            <option value="">{t("common_none")}</option>
            <option value="starter">{t("status_starter")}</option>
            <option value="sub">{t("status_sub")}</option>
          </select>
        </label>
        <label>{t("th_minutes_short")}<input type="number" min="0" max="120" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></label>
      </div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{t("starter_minutes_help")}</p>
      <button className="btn-gold" onClick={() => { if (form.player.trim()) onSave({ id: uid(), ...form }); }}><Save size={16} /> {t("common_save")}</button>
    </Modal>
  );
}

export function RosterColumn({ teamLabel, teamName, match, patch, showRating, allowImport = true }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef(null);
  const appearances = (match.appearances || []).filter((a) => a.team === teamName);

  const addAppearance = (entry) => { patch({ appearances: [...(match.appearances || []), entry] }); setShowForm(false); };
  const removeAppearance = (id) => patch({ appearances: (match.appearances || []).filter((a) => a.id !== id) });
  const updateRating = (id, rating) => patch({ appearances: (match.appearances || []).map((a) => (a.id === id ? { ...a, rating } : a)) });
  const updateStarter = (id, value) => patch({ appearances: (match.appearances || []).map((a) => (a.id === id ? { ...a, starter: value === "" ? null : value === "starter" } : a)) });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        const imported = parseLeagueWorkbook(wb);
        const same = imported.find((im) => im.date === match.date && im.homeTeam === match.homeTeam && im.awayTeam === match.awayTeam);
        const toAdd = same ? same.appearances.filter((a) => a.team === teamName) : [];
        if (toAdd.length) patch({ appearances: [...(match.appearances || []), ...toAdd] });
        else alert(t("league_import_error"));
      } catch (err) {
        console.error(err);
        alert(t("league_import_fail"));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const ratingBg = (r) => (r === "strength" ? "rgba(76,141,255,0.08)" : r === "weakness" ? "rgba(229,72,77,0.08)" : undefined);

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{teamLabel}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {allowImport && <button className="icon-btn" onClick={() => fileRef.current.click()}><Upload size={13} /> {t("league_import")}</button>}
          <button className="icon-btn" onClick={() => setShowForm(true)}><Plus size={14} /> {t("add_player_to_roster")}</button>
        </div>
        {allowImport && <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />}
      </div>
      {appearances.length === 0 && <p className="muted">{t("roster_none")}</p>}
      {appearances.length > 0 && (
        <table className="stats-table">
          <thead><tr><th>#</th><th>{t("field_name")}</th><th>{t("th_main_position")}</th><th>{t("field_starter_status")}</th>{!showRating && <th>{t("th_minutes_short")}</th>}{showRating && <th>{t("rating_label")}</th>}<th /></tr></thead>
          <tbody>
            {appearances.map((a) => (
              <tr key={a.id} style={{ background: showRating ? ratingBg(a.rating) : undefined }}>
                <td className="mono">{a.number || "—"}</td>
                <td>{a.player}</td>
                <td>{a.position ? t(POSITION_KEYS[a.position]) : "—"}</td>
                <td>
                  <select value={a.starter === null || a.starter === undefined ? "" : a.starter ? "starter" : "sub"} onChange={(e) => updateStarter(a.id, e.target.value)}>
                    <option value="">—</option>
                    <option value="starter">{t("status_starter")}</option>
                    <option value="sub">{t("status_sub")}</option>
                  </select>
                </td>
                {!showRating && <td className="mono">{(() => { const m = computeAppearanceMinutes(match, a, teamName); return m === null ? (a.minutes || "—") : `${m} min`; })()}</td>}
                {showRating && (
                  <td>
                    <select value={a.rating || ""} onChange={(e) => updateRating(a.id, e.target.value)}>
                      <option value="">—</option>
                      <option value="strength">{t("rating_strength")}</option>
                      <option value="weakness">{t("rating_weakness")}</option>
                    </select>
                  </td>
                )}
                <td><button className="icon-btn" onClick={() => removeAppearance(a.id)}><Trash2 size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && <AppearanceForm team={teamName} onSave={addAppearance} onClose={() => setShowForm(false)} />}
    </div>
  );
}

/* ---------------- composition (base / offensive / defensive) ---------------- */

export function CompositionBlock({ label, variant, teamName, match, patch, optional }) {
  const { t } = useLang();
  const [selected, setSelected] = useState(null); // {type:'slot',index} | {type:'bench', id}
  const appearances = (match.appearances || []).filter((a) => a.team === teamName);
  const comp = getTeamComposition(match, teamName);
  const current = comp[variant] || { formation: "4-4-2", slots: [] };
  const enabled = !optional || current.enabled;
  const formation = current.formation || "4-4-2";
  const rows = FORMATIONS[formation] || FORMATIONS["4-4-2"];
  const total = formationSlotCount(formation);
  const slots = current.slots && current.slots.length === total ? current.slots : Array(total).fill(null);
  const bench = appearances.filter((a) => !slots.includes(a.id));

  const updateVariant = (fields) => {
    const nextComp = { ...comp, [variant]: { ...current, ...fields } };
    patch({ compositions: { ...match.compositions, [teamName]: nextComp } });
  };

  const changeFormation = (f) => { updateVariant({ formation: f, slots: Array(formationSlotCount(f)).fill(null) }); setSelected(null); };

  const placeInSlot = (index, apId) => {
    const next = [...slots];
    const prevIndex = next.indexOf(apId);
    if (prevIndex !== -1) next[prevIndex] = null;
    next[index] = apId;
    updateVariant({ slots: next });
  };
  const swapSlots = (i, j) => {
    const next = [...slots];
    const tmp = next[i]; next[i] = next[j]; next[j] = tmp;
    updateVariant({ slots: next });
  };
  const clickSlot = (index) => {
    if (!selected) { setSelected({ type: "slot", index }); return; }
    if (selected.type === "slot") {
      if (selected.index === index) { setSelected(null); return; }
      swapSlots(selected.index, index);
      setSelected(null);
    } else {
      placeInSlot(index, selected.id);
      setSelected(null);
    }
  };
  const clickBench = (id) => {
    if (!selected) { setSelected({ type: "bench", id }); return; }
    if (selected.type === "bench") { setSelected(selected.id === id ? null : { type: "bench", id }); return; }
    placeInSlot(selected.index, id);
    setSelected(null);
  };

  let cursor = 0;
  const rowSlices = rows.map((count) => {
    const indices = Array.from({ length: count }, (_, i) => cursor + i);
    cursor += count;
    return indices;
  });

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
        {optional && (
          <label className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={!!current.enabled} onChange={(e) => updateVariant({ enabled: e.target.checked })} />
            {label}
          </label>
        )}
        {!optional && <p className="muted mono" style={{ margin: 0, fontSize: 11.5, textTransform: "uppercase" }}>{label}</p>}
        {enabled && (
          <label className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
            {t("field_formation")}
            <select value={formation} onChange={(e) => changeFormation(e.target.value)}>
              {Object.keys(FORMATIONS).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        )}
      </div>

      {enabled && appearances.length === 0 && <p className="muted">{t("roster_none")}</p>}
      {enabled && appearances.length > 0 && (
        <>
          <div className="pitch-board">
            {rowSlices.map((indices, rowIdx) => (
              <div key={rowIdx} className="pitch-row">
                {indices.map((index) => {
                  const apId = slots[index];
                  const ap = apId ? appearances.find((a) => a.id === apId) : null;
                  const isSelected = selected?.type === "slot" && selected.index === index;
                  return (
                    <button
                      key={index}
                      className={"pitch-chip" + (ap ? "" : " empty") + (isSelected ? " selected" : "")}
                      onClick={() => clickSlot(index)}
                    >
                      {ap ? (
                        <>
                          <Badge number={ap.number} size={24} />
                          <span>{ap.player}</span>
                        </>
                      ) : <span className="muted">+</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {bench.length > 0 && (
            <div className="chip-grid" style={{ marginTop: 10 }}>
              {bench.map((a) => {
                const isSelected = selected?.type === "bench" && selected.id === a.id;
                return (
                  <button key={a.id} className={"player-chip" + (isSelected ? " selected" : "")} onClick={() => clickBench(a.id)}>
                    <Badge number={a.number} size={20} /> {a.player}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- faits de jeu ---------------- */

function GoalTypeSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {Object.entries(GOAL_TYPE_GROUPS).map(([group, types]) => (
        <optgroup key={group} label={group}>
          {types.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function EventsTab({ match, patch }) {
  const { t } = useLang();
  const fileRef = useRef(null);
  const events = match.events || [];

  const addEvent = (type) => patch({ events: [...events, { id: uid(), minute: "", team: "home", type, goalType: "", player: "", playerIn: "" }] });
  const updateEvent = (id, field, value) => patch({ events: events.map((e) => (e.id === id ? { ...e, [field]: value } : e)) });
  const removeEvent = (id) => patch({ events: events.filter((e) => e.id !== id) });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        const imported = parseLeagueWorkbook(wb);
        const same = imported.find((im) => im.date === match.date && im.homeTeam === match.homeTeam && im.awayTeam === match.awayTeam);
        if (same && same.events.length) patch({ events: [...events, ...same.events] });
        else alert(t("league_import_error"));
      } catch (err) {
        console.error(err);
        alert(t("league_import_fail"));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{t("tab_events")}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" onClick={() => addEvent("goal")}><Plus size={13} /> {t("event_add_goal")}</button>
          <button className="icon-btn" onClick={() => addEvent("yellow")}><Plus size={13} /> {t("event_add_card")}</button>
          <button className="icon-btn" onClick={() => addEvent("sub")}><Plus size={13} /> {t("event_add_sub")}</button>
          <button className="icon-btn" onClick={() => fileRef.current.click()}><Upload size={13} /> {t("league_import")}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
        </div>
      </div>
      {events.length === 0 && <p className="muted">{t("no_events_yet")}</p>}
      {events.length > 0 && (
        <table className="stats-table">
          <thead><tr><th>{t("th_minute")}</th><th>{t("field_venue")}</th><th>{t("th_type")}</th><th>{t("field_scorer")}</th><th>{t("sub_in_label")}</th><th /></tr></thead>
          <tbody>
            {events.map((ev) => {
              const teamAppearances = (match.appearances || []).filter((a) => a.team === ev.team);
              return (
                <tr key={ev.id}>
                  <td><input className="cell-input" type="number" value={ev.minute} onChange={(e) => updateEvent(ev.id, "minute", e.target.value)} /></td>
                  <td>
                    <select value={ev.team} onChange={(e) => updateEvent(ev.id, "team", e.target.value)}>
                      <option value="home">{t("home")}</option>
                      <option value="away">{t("away")}</option>
                    </select>
                  </td>
                  <td>
                    {ev.type === "goal" ? <GoalTypeSelect value={ev.goalType} onChange={(v) => updateEvent(ev.id, "goalType", v)} /> : (
                      ev.type === "sub" ? t("event_add_sub") : (
                        <select value={ev.type} onChange={(e) => updateEvent(ev.id, "type", e.target.value)}>
                          <option value="yellow">{t("th_yellow")}</option>
                          <option value="red">{t("th_red")}</option>
                        </select>
                      )
                    )}
                  </td>
                  <td>
                    <select value={ev.player} onChange={(e) => updateEvent(ev.id, "player", e.target.value)}>
                      <option value="">—</option>
                      {teamAppearances.map((a) => <option key={a.id} value={a.player}>{a.player}</option>)}
                    </select>
                  </td>
                  <td>
                    {ev.type === "sub" && (
                      <select value={ev.playerIn} onChange={(e) => updateEvent(ev.id, "playerIn", e.target.value)}>
                        <option value="">—</option>
                        {teamAppearances.map((a) => <option key={a.id} value={a.player}>{a.player}</option>)}
                      </select>
                    )}
                  </td>
                  <td><button className="icon-btn" onClick={() => removeEvent(ev.id)}><Trash2 size={13} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------------- détail du match ---------------- */

export function CompetitionMatchDetail({ matchId, leagueMatches, setLeagueMatches, setView }) {
  const { t } = useLang();
  const [tab, setTab] = useState("roster");
  const [showEditInfo, setShowEditInfo] = useState(false);
  const match = leagueMatches.find((m) => m.id === matchId);

  if (!match) return <p className="muted">—</p>;

  const patch = (fields) => setLeagueMatches(leagueMatches.map((m) => (m.id === matchId ? { ...m, ...fields } : m)));
  const saveEditInfo = (form) => { patch(form); setShowEditInfo(false); };

  return (
    <div>
      <button className="back-link" onClick={() => setView("competition")}><ChevronLeft size={16} /> {t("matchdetail_back")}</button>
      <div className="view-header">
        <div>
          <h1 style={{ marginBottom: 2 }}>{match.homeTeam} — {match.awayTeam}</h1>
          <p className="muted mono">{formatDate(match.date)} {match.matchday && `· ${match.matchday}`} · {match.homeScore || "–"}-{match.awayScore || "–"}</p>
        </div>
        <button className="icon-btn" onClick={() => setShowEditInfo(true)}><Pencil size={16} /> {t("common_edit")}</button>
      </div>

      <div className="tab-bar">
        <button className={"tab-btn" + (tab === "roster" ? " active" : "")} onClick={() => setTab("roster")}>{t("tab_roster")}</button>
        <button className={"tab-btn" + (tab === "composition" ? " active" : "")} onClick={() => setTab("composition")}>{t("tab_composition")}</button>
        <button className={"tab-btn" + (tab === "events" ? " active" : "")} onClick={() => setTab("events")}>{t("tab_events")}</button>
      </div>

      {tab === "roster" && (
        <div className="two-col">
          <RosterColumn teamLabel={match.homeTeam} teamName="home" match={match} patch={patch} />
          <RosterColumn teamLabel={match.awayTeam} teamName="away" match={match} patch={patch} />
        </div>
      )}

      {tab === "composition" && (
        <div className="two-col">
          <div className="panel">
            <h3>{match.homeTeam}</h3>
            <CompositionBlock label={t("comp_base")} variant="base" teamName="home" match={match} patch={patch} />
            <CompositionBlock label={t("comp_offensive")} variant="offensive" teamName="home" match={match} patch={patch} optional />
            <CompositionBlock label={t("comp_defensive")} variant="defensive" teamName="home" match={match} patch={patch} optional />
          </div>
          <div className="panel">
            <h3>{match.awayTeam}</h3>
            <CompositionBlock label={t("comp_base")} variant="base" teamName="away" match={match} patch={patch} />
            <CompositionBlock label={t("comp_offensive")} variant="offensive" teamName="away" match={match} patch={patch} optional />
            <CompositionBlock label={t("comp_defensive")} variant="defensive" teamName="away" match={match} patch={patch} optional />
          </div>
        </div>
      )}

      {tab === "events" && <EventsTab match={match} patch={patch} />}

      {showEditInfo && <MatchForm initial={match} onSave={saveEditInfo} onClose={() => setShowEditInfo(false)} />}
    </div>
  );
}
