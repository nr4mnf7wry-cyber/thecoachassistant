import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, Pencil, Download, Upload, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { useLang } from "../../lib/i18n";
import {
  uid, Badge, POSITIONS, POSITION_KEYS,
  emptyMatchStat, computeMinutes, FORMATIONS, formationSlotCount, GOAL_TYPE_GROUPS, emptyGoalEntry,
  isPlayerUnavailable, formatDate, clamp, sortByPosition, emptyLiveClock,
} from "../../lib/shared";
import {
  getTeamNames, computeTeamStats, computeMostCommonComposition,
  findTeamProfile, getRecentRosters, parseSimpleRoster, downloadSimpleRosterTemplate, findLatestTeamData,
} from "../../lib/leagueHelpers";
import { OpponentProfileContent } from "../OpponentProfile";
import { syncGoalsToStats } from "../../lib/matchHelpers";
import { LiveCaptureCore, LiveReport } from "../LiveMatch";
import { MatchForm } from "./MatchForm";

function SubstitutionForm({ starters, bench, players, onAdd }) {
  const { t } = useLang();
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "—";
  const [outId, setOutId] = useState(starters[0] || "");
  const [inId, setInId] = useState(bench[0] || "");
  const [minute, setMinute] = useState("");

  return (
    <div className="form-grid" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 140 }}>{t("sub_out_label")}
          <select value={outId} onChange={(e) => setOutId(e.target.value)}>
            {starters.map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}
          </select>
        </label>
        <label style={{ flex: 1, minWidth: 140 }}>{t("sub_in_label")}
          <select value={inId} onChange={(e) => setInId(e.target.value)}>
            {bench.map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}
          </select>
        </label>
        <label style={{ width: 90 }}>{t("sub_minute_label")}
          <input type="number" min="0" max="120" value={minute} onChange={(e) => setMinute(e.target.value)} />
        </label>
        <button className="btn-gold" style={{ height: 36 }} onClick={() => { if (outId && inId && minute !== "") { onAdd({ id: uid(), outId, inId, minute }); setMinute(""); } }}>
          {t("sub_add")}
        </button>
      </div>
    </div>
  );
}

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

function TacticalPitch({ rowSlices, slots, positions, players, selected, onSlotClick, onDragEnd, subsMap, captainId }) {
  const line = "var(--pitch-line)";
  const nRows = rowSlices.length;
  const rowY = (rowIdx) => (nRows <= 1 ? 220 : 400 - rowIdx * (360 / (nRows - 1)));
  const colX = (i, k) => (k <= 0 ? 150 : ((i + 1) * 300) / (k + 1));
  const svgRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const movedRef = useRef(false);

  const toSvgPoint = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 300, 18, 282);
    const y = clamp(((clientY - rect.top) / rect.height) * 450, 18, 432);
    return { x, y };
  };

  const startDrag = (e, index) => {
    e.target.setPointerCapture?.(e.pointerId);
    movedRef.current = false;
    setDragIndex(index);
  };
  const onMove = (e) => {
    if (dragIndex === null) return;
    movedRef.current = true;
    setDragPos(toSvgPoint(e.clientX, e.clientY));
  };
  const endDrag = () => {
    if (dragIndex !== null && movedRef.current && dragPos) {
      const id = slots[dragIndex];
      if (id) onDragEnd(id, dragPos.x, dragPos.y);
    }
    setDragIndex(null);
    setDragPos(null);
  };

  return (
    <svg
      viewBox="0 0 300 450" className="tactical-pitch-svg" ref={svgRef}
      onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={() => dragIndex !== null && endDrag()}
    >
      <rect x="0" y="0" width="300" height="450" fill="var(--pitch-mid)" />
      <rect x="3" y="3" width="294" height="444" fill="none" stroke={line} strokeWidth="2" />
      <line x1="3" y1="225" x2="297" y2="225" stroke={line} strokeWidth="2" />
      <circle cx="150" cy="225" r="42" fill="none" stroke={line} strokeWidth="2" />
      <rect x="65" y="3" width="170" height="55" fill="none" stroke={line} strokeWidth="2" />
      <rect x="65" y="392" width="170" height="55" fill="none" stroke={line} strokeWidth="2" />

      {rowSlices.map((indices, rowIdx) => {
        const y = rowY(rowIdx);
        return indices.map((index, i) => {
          const id = slots[index];
          const p = id ? players.find((x) => x.id === id) : null;
          const isSelected = selected?.type === "slot" && selected.index === index;
          const defaultX = colX(i, indices.length);
          const isDragging = dragIndex === index && movedRef.current;
          const custom = id ? positions?.[id] : null;
          const x = isDragging ? dragPos.x : (custom ? custom.x : defaultX);
          const cy = isDragging ? dragPos.y : (custom ? custom.y : y);
          return (
            <g
              key={index}
              onClick={() => onSlotClick(index)}
              onPointerDown={id ? (e) => startDrag(e, index) : undefined}
              style={{ cursor: id ? "grab" : "pointer", touchAction: "none" }}
            >
              <circle
                cx={x} cy={cy} r="17"
                fill={isSelected ? "var(--gold)" : p ? "rgba(var(--gold-rgb),0.12)" : "var(--hover-tint)"}
                stroke={isSelected ? "var(--gold)" : p ? "var(--gold)" : "var(--pitch-line)"}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {p ? (
                <text x={x} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={isSelected ? "var(--on-accent)" : "var(--gold)"} style={{ pointerEvents: "none" }}>{p.number || "?"}</text>
              ) : (
                <text x={x} y={cy + 4} textAnchor="middle" fontSize="13" fill="var(--chalk-dim)" style={{ pointerEvents: "none" }}>+</text>
              )}
              {p && (
                <text x={x} y={cy + 30} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--chalk-dim)" style={{ pointerEvents: "none" }}>
                  {(p.name.length > 12 ? p.name.slice(0, 11) + "…" : p.name)}{captainId === p.id ? " (C)" : ""}
                </text>
              )}
              {p && subsMap?.[p.id] && (
                <text x={x + 16} y={cy - 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--red)" style={{ pointerEvents: "none" }}>
                  ↓{subsMap[p.id].minute}'
                </text>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}

function TacticalVariantBlock({ label, variant, match, patch, squad, players, optional }) {
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const variants = match.tacticalVariants || {};
  const current = variants[variant] || { formation: "4-4-2", slots: [], enabled: false };
  const enabled = !optional || current.enabled;
  const formation = current.formation || "4-4-2";
  const rows = FORMATIONS[formation] || FORMATIONS["4-4-2"];
  const total = formationSlotCount(formation);
  const slots = current.slots && current.slots.length === total ? current.slots : Array(total).fill(null);
  const positions = current.positions || {};
  let cursor = 0;
  const rowSlices = rows.map((count) => {
    const idx = Array.from({ length: count }, (_, i) => cursor + i);
    cursor += count;
    return idx;
  });
  const poolPlayers = squad.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  const bench = poolPlayers.filter((p) => !slots.includes(p.id));

  const updateVariant = (fields) => patch({ tacticalVariants: { ...variants, [variant]: { ...current, ...fields } } });
  const changeFormation = (f) => {
    const nextSlots = remapSlotsForFormation(rowSlices, slots, f);
    updateVariant({ formation: f, slots: nextSlots });
    setSelected(null);
  };
  const dragEnd = (id, x, y) => updateVariant({ positions: { ...positions, [id]: { x, y } } });
  const placeInSlot = (index, id) => {
    const next = [...slots];
    const prevIdx = next.indexOf(id);
    if (prevIdx !== -1) next[prevIdx] = null;
    next[index] = id;
    updateVariant({ slots: next });
  };
  const swapSlots = (i, j) => { const next = [...slots]; [next[i], next[j]] = [next[j], next[i]]; updateVariant({ slots: next }); };
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
    if (selected.type === "slot") { placeInSlot(selected.index, id); setSelected(null); }
  };

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
      {enabled && poolPlayers.length === 0 && <p className="muted">{t("no_squad_yet")}</p>}
      {enabled && poolPlayers.length > 0 && (
        <>
          <p className="muted" style={{ marginBottom: 10, fontSize: 12.5 }}>{t("swap_hint")}</p>
          <div className="tactical-pitch-wrap">
            <TacticalPitch rowSlices={rowSlices} slots={slots} positions={positions} players={players} selected={selected} onSlotClick={clickSlot} onDragEnd={dragEnd} />
          </div>
          <div className="chip-grid" style={{ marginTop: 10 }}>
            {bench.map((p) => {
              const isSelected = selected?.type === "bench" && selected.id === p.id;
              return (
                <button key={p.id} className={"player-chip" + (isSelected ? " selected" : "")} onClick={() => clickBench(p.id)}>
                  <Badge number={p.number} size={20} /> {p.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function OpponentLineupPanel({ teamName, opponentProfiles, setOpponentProfiles, leagueMatches }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ player: "", number: "", position: "" });
  const fileRef = useRef(null);

  const profile = opponentProfiles.find((p) => p.teamName === teamName) || { id: uid(), teamName, appearances: [], compositions: {} };
  const exists = opponentProfiles.some((p) => p.id === profile.id);
  const lineup = (profile.appearances || []).filter((a) => a.team === "main");

  const patch = (fields) => {
    const next = { ...profile, ...fields };
    setOpponentProfiles(exists ? opponentProfiles.map((p) => (p.id === profile.id ? next : p)) : [...opponentProfiles, next]);
  };

  // Auto-population une seule fois : si aucun joueur n'est encore renseigné pour cet adversaire,
  // on reprend son dernier effectif connu dans Compétition (toujours modifiable ensuite).
  useEffect(() => {
    if (!teamName || lineup.length > 0) return;
    const latest = findLatestTeamData(leagueMatches, teamName);
    if (latest && latest.appearances.length) {
      patch({ appearances: latest.appearances.map((a) => ({ ...a, team: "main" })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName]);

  const recentRosters = useMemo(() => (teamName ? getRecentRosters(leagueMatches, teamName, 3) : []), [leagueMatches, teamName]);
  const freq = useMemo(() => {
    const f = {};
    recentRosters.forEach((r) => r.roster.forEach((name) => { f[name] = (f[name] || 0) + 1; }));
    return f;
  }, [recentRosters]);

  const addPlayer = () => {
    if (!form.player.trim()) return;
    patch({ appearances: [...(profile.appearances || []), { id: uid(), team: "main", ...form }] });
    setForm({ player: "", number: "", position: "" });
    setShowForm(false);
  };
  const removePlayer = (id) => patch({ appearances: (profile.appearances || []).filter((a) => a.id !== id) });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary", cellDates: false });
        const imported = parseSimpleRoster(wb).map((a) => ({ ...a, team: "main" }));
        if (imported.length) patch({ appearances: [...(profile.appearances || []), ...imported] });
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
    <div className="panel-section" style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{t("opponent_lineup_title")}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="icon-btn" onClick={downloadSimpleRosterTemplate} title={t("matchs_template")}><Download size={13} /></button>
          <button className="icon-btn" onClick={() => fileRef.current.click()}><Upload size={13} /> {t("league_import")}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
          <button className="icon-btn" onClick={() => setShowForm(!showForm)}><Plus size={13} /> {t("add_player_to_roster")}</button>
        </div>
      </div>

      {showForm && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <label className="muted" style={{ fontSize: 12 }}>{t("field_name")}<input value={form.player} onChange={(e) => setForm({ ...form, player: e.target.value })} /></label>
          <label className="muted" style={{ fontSize: 12 }}>{t("field_number")}<input type="number" style={{ width: 70 }} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></label>
          <label className="muted" style={{ fontSize: 12 }}>{t("field_position")}
            <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{t(POSITION_KEYS[p])}</option>)}
            </select>
          </label>
          <button className="btn-gold" onClick={addPlayer}><Save size={14} /> {t("common_add")}</button>
        </div>
      )}

      {lineup.length === 0 && <p className="muted">{t("opponent_lineup_none")}</p>}
      {lineup.length > 0 && (
        <table className="stats-table">
          <thead><tr><th>#</th><th>{t("field_name")}</th><th>{t("th_main_position")}</th><th>{t("opponent_lineup_known")}</th><th /></tr></thead>
          <tbody>
            {lineup.map((p) => {
              const count = freq[p.player] || 0;
              const color = count === 0 ? "var(--red)" : count >= recentRosters.length && recentRosters.length > 0 ? "var(--chalk-dim)" : "var(--yellow)";
              const label = count === 0 ? t("opponent_lineup_new") : `${count}/${recentRosters.length} ${t("opponent_lineup_recent")}`;
              return (
                <tr key={p.id}>
                  <td className="mono">{p.number || "—"}</td>
                  <td>{p.player}</td>
                  <td>{p.position ? t(POSITION_KEYS[p.position]) : "—"}</td>
                  <td>{recentRosters.length > 0 && <span className="status-chip" style={{ background: color }}>{label}</span>}</td>
                  <td><button className="icon-btn" onClick={() => removePlayer(p.id)}><Trash2 size={13} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {recentRosters.length === 0 && lineup.length > 0 && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>{t("opponent_lineup_no_history")}</p>
      )}
    </div>
  );
}

function RecentRostersComparison({ leagueMatches, teamName, todayNames }) {
  const { t } = useLang();
  const rosters = useMemo(() => (teamName ? getRecentRosters(leagueMatches, teamName, 3) : []), [leagueMatches, teamName]);

  if (!rosters.length) return null;

  return (
    <div className="panel-section" style={{ overflowX: "auto" }}>
      <h3>{t("recent_rosters_title")}</h3>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{t("recent_rosters_help")}</p>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {rosters.map((r, idx) => (
          <div key={idx} style={{ minWidth: 160, flex: 1 }}>
            <p className="muted mono" style={{ fontSize: 11.5, marginBottom: 8 }}>{formatDate(r.date)} · vs {r.opponent}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {r.roster.map((name) => {
                const inToday = todayNames.has(name);
                return (
                  <span key={name} className="status-chip" style={{ background: inToday ? "var(--gold)" : "var(--pitch-line)", color: inToday ? "var(--pitch-dark)" : "var(--chalk-dim)", textAlign: "left" }}>{name}</span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompositionChangeLog({ match, patch }) {
  const { t } = useLang();
  const changes = match.compositionChanges || [];
  const [minute, setMinute] = useState("");
  const [variant, setVariant] = useState("base");
  const [note, setNote] = useState("");
  const add = () => {
    if (minute === "") return;
    patch({ compositionChanges: [...changes, { id: uid(), minute, variant, note }] });
    setMinute(""); setNote("");
  };
  const remove = (id) => patch({ compositionChanges: changes.filter((c) => c.id !== id) });
  const sorted = [...changes].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0));
  const variantLabel = (v) => (v === "offensive" ? t("comp_offensive") : v === "defensive" ? t("comp_defensive") : t("comp_base"));

  return (
    <div className="panel">
      <h3>{t("panel_composition_changes")}</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
        <label className="muted" style={{ fontSize: 12 }}>{t("th_minute")}<input className="cell-input" style={{ width: 60 }} type="number" min="0" max="120" value={minute} onChange={(e) => setMinute(e.target.value)} /></label>
        <label className="muted" style={{ fontSize: 12 }}>{t("tab_composition")}
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="base">{t("comp_base")}</option>
            <option value="offensive">{t("comp_offensive")}</option>
            <option value="defensive">{t("comp_defensive")}</option>
          </select>
        </label>
        <label className="muted" style={{ fontSize: 12, flex: 1, minWidth: 140 }}>{t("field_note_optional")}<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <button className="icon-btn" onClick={add}><Plus size={13} /> {t("common_add")}</button>
      </div>
      {sorted.length === 0 && <p className="muted">{t("no_composition_changes")}</p>}
      {sorted.map((c) => (
        <div key={c.id} className="match-row">
          <span className="mono muted">{c.minute}'</span>
          <span>{variantLabel(c.variant)}{c.note ? ` — ${c.note}` : ""}</span>
          <button className="icon-btn" onClick={() => remove(c.id)}><Trash2 size={13} /></button>
        </div>
      ))}
    </div>
  );
}

function MatchLiveTab({ match, patch, squad, players, opponentProfiles }) {
  const { t } = useLang();
  const [showReport, setShowReport] = useState(false);
  const clock = match.liveSession || emptyLiveClock();
  const events = clock.events || [];

  const ourRoster = squad.map((id) => players.find((p) => p.id === id)).filter(Boolean).map((p) => ({ id: p.id, name: p.name, number: p.number }));
  const opponentProfile = (opponentProfiles || []).find((p) => p.teamName === match.opponent);
  const theirRoster = (opponentProfile?.appearances || []).filter((a) => a.team === "main").map((a) => ({ id: a.id, name: a.player, number: a.number }));

  const patchClock = (fields) => patch({ liveSession: { ...clock, ...fields } });

  const onGoalTagged = (team, event) => {
    const entry = { id: event.id, minute: String(Math.floor(event.atSeconds / 60)), player: "", type: "" };
    if (team === "own") patch({ goalsScored: [...(match.goalsScored || []), entry] });
    else patch({ goalsConceded: [...(match.goalsConceded || []), entry] });
  };
  const onGoalPlayerAttached = (event, previousPlayer) => {
    if (!event) return;
    if (event.tag === "goal") {
      const listKey = event.team === "own" ? "goalsScored" : "goalsConceded";
      const nextList = (match[listKey] || []).map((g) => (g.id === event.id ? { ...g, player: event.player } : g));
      const patchFields = { [listKey]: nextList };
      if (listKey === "goalsScored") patchFields.stats = syncGoalsToStats(match.stats, players, nextList);
      patch(patchFields);
    } else if (event.tag === "yellow_card" || event.tag === "red_card") {
      onCardPlayerAttached(event, previousPlayer);
    }
  };
  const onGoalTypeSet = (event) => {
    if (!event || event.tag !== "goal") return;
    const listKey = event.team === "own" ? "goalsScored" : "goalsConceded";
    patch({ [listKey]: (match[listKey] || []).map((g) => (g.id === event.id ? { ...g, type: event.goalType || "" } : g)) });
  };
  const onCardPlayerAttached = (event, previousPlayer) => {
    if (!event || (event.tag !== "yellow_card" && event.tag !== "red_card") || event.team !== "own") return;
    const field = event.tag === "yellow_card" ? "jaune" : "rouge";
    let stats = { ...match.stats };
    if (previousPlayer) {
      const prevP = players.find((pl) => pl.name === previousPlayer);
      if (prevP) {
        const current = stats[prevP.id] || emptyMatchStat();
        stats = { ...stats, [prevP.id]: { ...current, [field]: Math.max(0, (Number(current[field]) || 0) - 1) } };
      }
    }
    if (event.player) {
      const p = players.find((pl) => pl.name === event.player);
      if (p) {
        const current = stats[p.id] || emptyMatchStat();
        stats = { ...stats, [p.id]: { ...current, [field]: (Number(current[field]) || 0) + 1 } };
      }
    }
    patch({ stats });
  };
  const onEventRemoved = (event) => {
    if (!event) return;
    if (event.tag === "goal") {
      const listKey = event.team === "own" ? "goalsScored" : "goalsConceded";
      const nextList = (match[listKey] || []).filter((g) => g.id !== event.id);
      const patchFields = { [listKey]: nextList };
      if (listKey === "goalsScored") patchFields.stats = syncGoalsToStats(match.stats, players, nextList);
      patch(patchFields);
    } else if ((event.tag === "yellow_card" || event.tag === "red_card") && event.player) {
      onCardPlayerAttached({ ...event, player: "" }, event.player);
    }
  };

  if (showReport) {
    return (
      <LiveReport
        title={`vs ${match.opponent}`} scoreFor={match.scoreFor || 0} scoreAgainst={match.scoreAgainst || 0}
        ourLabel={t("live_us")} theirLabel={match.opponent || t("live_team_b")}
        events={events} onBack={() => setShowReport(false)}
      />
    );
  }

  return (
    <>
      <p className="muted" style={{ marginBottom: 14, fontSize: 12.5 }}>{t("live_help_own")}</p>
      <LiveCaptureCore
        ourLabel={t("live_us")} theirLabel={match.opponent || t("live_team_b")}
        ourRoster={ourRoster} theirRoster={theirRoster}
        scoreFor={match.scoreFor || 0} scoreAgainst={match.scoreAgainst || 0}
        onAdjustScore={(side, delta) => {
          const field = side === "own" ? "scoreFor" : "scoreAgainst";
          patch({ [field]: Math.max(0, (Number(match[field]) || 0) + delta) });
        }}
        clock={clock} onClockPatch={patchClock}
        events={events} onEventsChange={(ev) => patchClock({ events: ev })}
        onGoalTagged={onGoalTagged} onGoalPlayerAttached={onGoalPlayerAttached} onGoalTypeSet={onGoalTypeSet} onEventRemoved={onEventRemoved}
        onShowReport={() => setShowReport(true)}
      />
    </>
  );
}

export function MatchDetail({ matchId, players, matches, setMatches, availabilities, leagueMatches, opponentProfiles, setOpponentProfiles, setView }) {
  const { t } = useLang();
  const [tab, setTab] = useState("composition");
  const [selected, setSelected] = useState(null); // {type:'slot',index} | {type:'bench', id}
  const [showEditInfo, setShowEditInfo] = useState(false);
  const match = matches.find((m) => m.id === matchId);

  const opponentRoster = useMemo(() => {
    const profile = match ? findTeamProfile(opponentProfiles, match.opponent) : null;
    return (profile?.appearances || []).map((a) => a.player).filter(Boolean);
  }, [opponentProfiles, match?.opponent]);

  const knownOpponent = useMemo(() => {
    if (!match || !leagueMatches || !leagueMatches.length || !match.opponent) return null;
    const target = match.opponent.trim().toLowerCase();
    return getTeamNames(leagueMatches).find((n) => n.trim().toLowerCase() === target) || null;
  }, [leagueMatches, match?.opponent]);

  const opponentStats = useMemo(() => (knownOpponent ? computeTeamStats(leagueMatches, knownOpponent) : null), [leagueMatches, knownOpponent]);

  const mostCommonLineup = useMemo(() => {
    if (!knownOpponent) return null;
    const common = computeMostCommonComposition(leagueMatches, knownOpponent);
    if (!common) return null;
    const shape = FORMATIONS[common.formation] || FORMATIONS["4-4-2"];
    const rowPositions = shape.length === 5 ? ["Gardien", "Défenseur", "Milieu", "Milieu", "Attaquant"] : ["Gardien", "Défenseur", "Milieu", "Attaquant"];
    const used = new Set();
    const rows = shape.map((count, rowIdx) => {
      const pos = rowPositions[rowIdx] || "";
      const pool = (common.byPosition[pos] || []).filter((p) => !used.has(p.player));
      const picked = pool.slice(0, count);
      picked.forEach((p) => used.add(p.player));
      const cells = Array.from({ length: count }, (_, i) => picked[i] || null);
      return cells;
    });
    return { formation: common.formation, sampleSize: common.sampleSize, rows };
  }, [leagueMatches, match?.opponent]);

  if (!match) return <p className="muted">—</p>;

  const patch = (fields) => setMatches(matches.map((m) => (m.id === matchId ? { ...m, ...fields } : m)));
  const squad = match.squad || [];
  const selectablePlayers = sortByPosition(players.filter((p) => !isPlayerUnavailable(availabilities, p.id, match.date)));
  const excludedCount = players.length - selectablePlayers.length;
  const formation = match.formation || "4-4-2";
  const rows = FORMATIONS[formation] || FORMATIONS["4-4-2"];
  const total = formationSlotCount(formation);
  const slots = match.lineupSlots && match.lineupSlots.length === total ? match.lineupSlots : Array(total).fill(null);
  const positions = match.lineupPositions || {};
  const dragEnd = (id, x, y) => patch({ lineupPositions: { ...positions, [id]: { x, y } } });
  const starters = slots.filter(Boolean);
  const bench = sortByPosition(squad.filter((id) => !slots.includes(id)).map((id) => players.find((p) => p.id === id)).filter(Boolean)).map((p) => p.id);
  const subs = match.substitutions || [];
  const usedInIds = subs.map((s) => s.inId);
  const availableBench = bench.filter((id) => !usedInIds.includes(id));

  const lastComposedMatch = [...matches]
    .filter((m) => m.id !== match.id && m.date < match.date && (m.lineupSlots || []).some(Boolean))
    .sort((a, b) => (a.date > b.date ? -1 : 1))[0] || null;
  const composeFromLast = () => {
    if (!lastComposedMatch) return;
    const prevFormation = lastComposedMatch.formation || "4-4-2";
    const filteredSlots = (lastComposedMatch.lineupSlots || []).map((id) => (id && squad.includes(id) ? id : null));
    const prevPositions = lastComposedMatch.lineupPositions || {};
    const filteredPositions = {};
    Object.keys(prevPositions).forEach((id) => { if (squad.includes(id)) filteredPositions[id] = prevPositions[id]; });
    patch({ formation: prevFormation, lineupSlots: filteredSlots, starters: filteredSlots.filter(Boolean), lineupPositions: filteredPositions });
  };

  const toggleSquad = (playerId) => {
    const inSquad = squad.includes(playerId);
    const nextSquad = inSquad ? squad.filter((id) => id !== playerId) : [...squad, playerId];
    const nextSlots = slots.map((id) => (id === playerId ? null : id));
    const nextSubs = subs.filter((s) => nextSquad.includes(s.outId) && nextSquad.includes(s.inId));
    const stats = { ...match.stats };
    if (!inSquad && !stats[playerId]) stats[playerId] = emptyMatchStat();
    patch({
      squad: nextSquad, lineupSlots: nextSlots, starters: nextSlots.filter(Boolean),
      substitutions: nextSubs, stats, captain: nextSquad.includes(match.captain) ? match.captain : "",
    });
    setSelected(null);
  };

  const changeFormation = (f) => {
    const nextSlots = remapSlotsForFormation(rowSlices, slots, f);
    patch({ formation: f, lineupSlots: nextSlots, starters: nextSlots.filter(Boolean) });
    setSelected(null);
  };

  const placeInSlot = (index, playerId) => {
    const nextSlots = [...slots];
    // si ce joueur occupe déjà un autre emplacement, on le retire de là
    const prevIndex = nextSlots.indexOf(playerId);
    if (prevIndex !== -1) nextSlots[prevIndex] = null;
    nextSlots[index] = playerId;
    patch({ lineupSlots: nextSlots, starters: nextSlots.filter(Boolean) });
  };

  const swapSlots = (i, j) => {
    const nextSlots = [...slots];
    const tmp = nextSlots[i];
    nextSlots[i] = nextSlots[j];
    nextSlots[j] = tmp;
    patch({ lineupSlots: nextSlots, starters: nextSlots.filter(Boolean) });
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
    if (selected.type === "slot") { placeInSlot(selected.index, id); setSelected(null); }
  };

  const addSub = (sub) => patch({ substitutions: [...subs, sub] });
  const removeSub = (id) => patch({ substitutions: subs.filter((s) => s.id !== id) });

  const goalsScored = match.goalsScored || [];
  const goalsConceded = match.goalsConceded || [];
  const addGoalScored = () => patch({ goalsScored: [...goalsScored, emptyGoalEntry()] });
  const updateGoalScored = (id, field, value) => {
    const next = goalsScored.map((g) => (g.id === id ? { ...g, [field]: value } : g));
    patch(field === "player" ? { goalsScored: next, stats: syncGoalsToStats(match.stats, players, next) } : { goalsScored: next });
  };
  const removeGoalScored = (id) => {
    const next = goalsScored.filter((g) => g.id !== id);
    patch({ goalsScored: next, stats: syncGoalsToStats(match.stats, players, next) });
  };
  const addGoalConceded = () => patch({ goalsConceded: [...goalsConceded, emptyGoalEntry()] });
  const updateGoalConceded = (id, field, value) => patch({ goalsConceded: goalsConceded.map((g) => (g.id === id ? { ...g, [field]: value } : g)) });
  const removeGoalConceded = (id) => patch({ goalsConceded: goalsConceded.filter((g) => g.id !== id) });

  const saveEditInfo = (form) => { patch(form); setShowEditInfo(false); };

  const minutesMap = computeMinutes({ ...match, starters });
  const goalsPerPlayer = {};
  goalsScored.forEach((g) => { if (g.player) goalsPerPlayer[g.player] = (goalsPerPlayer[g.player] || 0) + 1; });

  const updateStat = (playerId, field, value) => {
    const v = field === "note" ? clamp(value, 0, 10) : value;
    const stats = { ...match.stats, [playerId]: { ...(match.stats[playerId] || emptyMatchStat()), [field]: v } };
    patch({ stats });
  };
  const updateTeamStat = (field, value) => patch({ teamStats: { ...match.teamStats, [field]: value } });

  const showDetailed = match.showDetailedStats;
  const setShowDetailedState = (v) => patch({ showDetailedStats: v });

  // construit les indices de chaque ligne de la formation (GK en premier)
  let cursor = 0;
  const rowSlices = rows.map((count) => {
    const indices = Array.from({ length: count }, (_, i) => cursor + i);
    cursor += count;
    return indices;
  });

  return (
    <div>
      <button className="back-link" onClick={() => setView("matchs")}><ChevronLeft size={16} /> {t("matchdetail_back")}</button>
      <div className="view-header">
        <div>
          <h1 style={{ marginBottom: 2 }}>vs {match.opponent}</h1>
          <p className="muted mono">{formatDate(match.date)} · {match.homeAway === "domicile" ? t("home") : t("away")} · {match.competition || "—"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="icon-btn" onClick={() => setShowEditInfo(true)}><Pencil size={16} /> {t("common_edit")}</button>
          <button className="icon-btn" onClick={() => { if (confirm(t("confirm_delete_match"))) { setMatches(matches.filter((m) => m.id !== matchId)); setView("matchs"); } }}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="tab-bar">
        <button className={"tab-btn" + (tab === "prep" ? " active" : "")} onClick={() => setTab("prep")}>{t("tab_prep")}</button>
        <button className={"tab-btn" + (tab === "composition" ? " active" : "")} onClick={() => setTab("composition")}>{t("tab_composition")}</button>
        <button className={"tab-btn" + (tab === "live" ? " active" : "")} onClick={() => setTab("live")}>{t("tab_live")}</button>
        <button className={"tab-btn" + (tab === "score" ? " active" : "")} onClick={() => setTab("score")}>{t("tab_score")}</button>
        <button className={"tab-btn" + (tab === "opponent" ? " active" : "")} onClick={() => setTab("opponent")}>{t("opponent_profile_title")}</button>
        <button className={"tab-btn" + (tab === "goals" ? " active" : "")} onClick={() => setTab("goals")}>{t("tab_goals")}</button>
      </div>

      {tab === "prep" && (
        <>
          {opponentStats && (
            <div className="panel panel-sections">
              <div className="panel-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <h3 style={{ margin: 0 }}>{t("prep_opponent_stats")}</h3>
                  <button className="icon-btn" onClick={() => setView("competitors:" + match.opponent)}>{t("go_to_competitors")}</button>
                </div>
                <div className="metric-grid" style={{ marginBottom: 14 }}>
                  <div className="metric-card"><div><div className="metric-value">{opponentStats.matchesCount}</div><div className="metric-label">{t("summary_matches_count")}</div></div></div>
                  <div className="metric-card"><div><div className="metric-value">{opponentStats.w}-{opponentStats.d}-{opponentStats.l}</div><div className="metric-label">{t("summary_record")}</div></div></div>
                  <div className="metric-card"><div><div className="metric-value">{opponentStats.gf} / {opponentStats.ga}</div><div className="metric-label">{t("summary_goals_for")} / {t("summary_goals_against")}</div></div></div>
                  <div className="metric-card"><div><div className="metric-value">{opponentStats.topScorers[0] ? `${opponentStats.topScorers[0].player} (${opponentStats.topScorers[0].goals})` : "—"}</div><div className="metric-label">{t("league_top_scorers")}</div></div></div>
                </div>
                <p className="muted mono" style={{ marginBottom: 6, fontSize: 11.5, textTransform: "uppercase" }}>{t("panel_form")}</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  {opponentStats.form.length === 0 && <p className="muted">{t("no_matches_yet")}</p>}
                  {opponentStats.form.map((r, i) => (
                    <span key={i} className="status-chip" style={{ background: r === "W" ? "var(--gold)" : r === "D" ? "var(--chalk-dim)" : "var(--red)" }}>{t(r === "W" ? "result_w" : r === "D" ? "result_d" : "result_l")}</span>
                  ))}
                </div>
                <p className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>{t("prep_see_more_hint")}</p>
              </div>

              <OpponentLineupPanel teamName={match.opponent} opponentProfiles={opponentProfiles} setOpponentProfiles={setOpponentProfiles} leagueMatches={leagueMatches} />
              <RecentRostersComparison
                leagueMatches={leagueMatches} teamName={match.opponent}
                todayNames={new Set((opponentProfiles.find((p) => p.teamName === match.opponent)?.appearances || []).filter((a) => a.team === "main").map((a) => a.player))}
              />

              {mostCommonLineup && (
                <div className="panel-section">
                  <h3>{t("prep_common_lineup")}</h3>
                  <p className="muted mono" style={{ marginBottom: 10, fontSize: 12.5 }}>{mostCommonLineup.formation} ({mostCommonLineup.sampleSize}×)</p>
                  <div className="pitch-board">
                    {mostCommonLineup.rows.map((rowPlayers, rowIdx) => (
                      <div key={rowIdx} className="pitch-row">
                        {rowPlayers.map((p, i) => (
                          <div key={i} className={"pitch-chip" + (p ? "" : " empty")}>
                            {p ? <span>{p.player}</span> : <span className="muted">?</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!opponentStats && leagueMatches && leagueMatches.length > 0 && (
            <p className="muted" style={{ marginBottom: 14 }}>{t("prep_opponent_not_found")}</p>
          )}

          <div className="panel">
            <h3>{t("panel_opponent_prep")}</h3>
            <textarea
              className="bulk-textarea"
              rows={10}
              value={match.opponentNotes || ""}
              onChange={(e) => patch({ opponentNotes: e.target.value })}
              placeholder={t("opponent_prep_placeholder")}
            />
          </div>
        </>
      )}

      {tab === "composition" && (
        <>
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{t("panel_convocation")}</h3>
              <span className="status-chip" style={{ background: "var(--gold)" }}>{squad.length} {t("convocation_selected_count")}</span>
            </div>
            {players.length === 0 && <p className="muted">{t("no_players_first")}</p>}
            {[...POSITIONS, ""].map((pos) => {
              const group = selectablePlayers.filter((p) => (p.position || "") === pos);
              if (group.length === 0) return null;
              return (
                <div key={pos || "none"} className="position-group">
                  <div className="position-group-label">{pos ? t(POSITION_KEYS[pos]) : t("column_no_position")}</div>
                  <div className="chip-grid">
                    {group.map((p) => {
                      const isSelected = squad.includes(p.id);
                      const isGuest = (p.status || "titulaire") === "invite";
                      return (
                        <button key={p.id} className={"player-chip" + (isSelected ? " selected" : "")} onClick={() => toggleSquad(p.id)}>
                          <Badge number={p.number} size={22} /> {p.name}{isGuest && <span className="mono" style={{ fontSize: 10, opacity: 0.8 }}> ({t("badge_guest")})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {excludedCount > 0 && <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>{excludedCount} {t("excluded_unavailable")}</p>}
          </div>

          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{t("panel_composition_pitch")}</h3>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                {lastComposedMatch && (
                  <button className="icon-btn" onClick={composeFromLast}>{t("compose_from_last")}</button>
                )}
                <label className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {t("field_formation")}
                  <select value={formation} onChange={(e) => changeFormation(e.target.value)}>
                    {Object.keys(FORMATIONS).map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {t("field_duration")}
                  <input className="cell-input" style={{ width: 60 }} type="number" value={match.duration} onChange={(e) => patch({ duration: e.target.value })} />
                </label>
                <label className="muted" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {t("field_captain")}
                  <select value={match.captain || ""} onChange={(e) => patch({ captain: e.target.value })}>
                    <option value="">—</option>
                    {squad.map((id) => <option key={id} value={id}>{players.find((p) => p.id === id)?.name}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {squad.length === 0 && <p className="muted">{t("no_squad_yet")}</p>}
            <p className="muted" style={{ marginBottom: 10 }}>{t("swap_hint")}</p>

            {squad.length > 0 && (
              <div className="tactical-pitch-wrap">
                <TacticalPitch
                  rowSlices={rowSlices} slots={slots} positions={positions} players={players} selected={selected}
                  onSlotClick={clickSlot} onDragEnd={dragEnd}
                  subsMap={Object.fromEntries(subs.map((s) => [s.outId, s]))} captainId={match.captain}
                />
              </div>
            )}

            <h3 style={{ marginTop: 18 }}>{t("panel_bench")}</h3>
            {bench.length === 0 && <p className="muted">—</p>}
            {[...POSITIONS, ""].map((pos) => {
              const group = bench.map((id) => players.find((x) => x.id === id)).filter((p) => p && (p.position || "") === pos);
              if (group.length === 0) return null;
              return (
                <div key={pos || "none"} className="position-group">
                  <div className="position-group-label">{pos ? t(POSITION_KEYS[pos]) : t("column_no_position")}</div>
                  <div className="chip-grid">
                    {group.map((p) => {
                      const usedAsSub = usedInIds.includes(p.id);
                      const isSelected = selected?.type === "bench" && selected.id === p.id;
                      return (
                        <button key={p.id} className={"player-chip" + (usedAsSub || isSelected ? " selected" : "")} onClick={() => clickBench(p.id)}>
                          <Badge number={p.number} size={22} /> {p.name}{usedAsSub && " ↑"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel">
            <h3>{t("panel_substitutions")}</h3>
            {starters.length > 0 && availableBench.length > 0 && (
              <SubstitutionForm starters={starters} bench={availableBench} players={players} onAdd={addSub} />
            )}
            {subs.length === 0 && <p className="muted">{t("sub_none")}</p>}
            {subs.map((s) => (
              <div key={s.id} className="match-row">
                <span className="mono muted">{s.minute}'</span>
                <span>{players.find((p) => p.id === s.outId)?.name} ↓ / {players.find((p) => p.id === s.inId)?.name} ↑</span>
                <button className="icon-btn" onClick={() => removeSub(s.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>{t("panel_tactical_variants")}</h3>
            <TacticalVariantBlock label={t("comp_offensive")} variant="offensive" match={match} patch={patch} squad={squad} players={players} optional />
            <TacticalVariantBlock label={t("comp_defensive")} variant="defensive" match={match} patch={patch} squad={squad} players={players} optional />
          </div>

          <CompositionChangeLog match={match} patch={patch} />
        </>
      )}

      {tab === "live" && (
        <MatchLiveTab match={match} patch={patch} squad={squad} players={players} opponentProfiles={opponentProfiles} />
      )}

      {tab === "score" && (
        <>
          <div className="panel panel-sections">
            <div className="panel-section">
              <h3>{t("panel_score")}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input className="cell-input" style={{ width: 60 }} type="number" min="0" value={match.scoreFor} onChange={(e) => patch({ scoreFor: clamp(e.target.value, 0, 99) })} />
                <span className="muted">–</span>
                <input className="cell-input" style={{ width: 60 }} type="number" min="0" value={match.scoreAgainst} onChange={(e) => patch({ scoreAgainst: clamp(e.target.value, 0, 99) })} />
              </div>
            </div>

            <div className="panel-section">
              <h3>{t("panel_team_stats")}</h3>
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
                {[
                  ["possession", "field_possession"], ["tirs", "th_shots"], ["corners", "field_corners"], ["cpa", "field_cpa"],
                  ["xg", "field_xg"], ["occasions", "field_occasions"], ["ballonsPerdus", "field_ballons_perdus"], ["ballonsRecuperes", "field_ballons_recuperes"],
                ].map(([key, labelKey]) => (
                  <label key={key}>{t(labelKey)}
                    <input type="number" value={match.teamStats?.[key] ?? ""} onChange={(e) => updateTeamStat(key, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="panel" style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>{t("panel_match_stats")}</h3>
              <button className="icon-btn" onClick={() => setShowDetailedState(!showDetailed)}>{showDetailed ? t("basic_stats") : t("more_stats")}</button>
            </div>
            {squad.length === 0 && <p className="muted">{t("select_squad_first")}</p>}
            {squad.length > 0 && (
              <table className="stats-table entry-table">
                <thead>
                  <tr>
                    <th>{t("th_player")}</th><th>{t("th_position_played")}</th>
                    <th>{t("th_goals_short")}</th><th>{t("th_assists_short")}</th>
                    <th>{t("th_yellow")}</th><th>{t("th_red")}</th><th>{t("th_minutes_short")}</th><th>{t("th_note10")}</th>
                    {showDetailed && (
                      <>
                        <th>{t("th_shots")}</th><th>{t("th_shots_on_target")}</th><th>{t("th_passes_completed")}</th>
                        <th>{t("th_key_passes")}</th><th>{t("th_crosses")}</th><th>{t("th_dribbles")}</th>
                        <th>{t("th_recoveries")}</th><th>{t("th_interceptions")}</th><th>{t("th_tackles")}</th>
                        <th>{t("th_duels_won")}</th><th>{t("th_fouls")}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {sortByPosition(squad.map((id) => players.find((x) => x.id === id)).filter(Boolean)).map((p) => {
                    const playerId = p.id;
                    const s = match.stats[playerId] || emptyMatchStat();
                    const minutesVal = s.minutes !== undefined && s.minutes !== "" && s.minutes !== 0 ? s.minutes : (minutesMap[playerId] ?? 0);
                    return (
                      <tr key={playerId}>
                        <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge number={p.number} size={26} /><span>{p.name}</span></div></td>
                        <td>
                          <select value={s.poste || p.position || ""} onChange={(e) => updateStat(playerId, "poste", e.target.value)}>
                            <option value="">—</option>
                            {POSITIONS.map((pos) => <option key={pos} value={pos}>{t(POSITION_KEYS[pos])}</option>)}
                          </select>
                        </td>
                        <td className="mono" title={t("goals_from_tab_hint")}>{goalsPerPlayer[p.name] || 0}</td>
                        <td><input className="cell-input" type="number" min="0" value={s.passes} onChange={(e) => updateStat(playerId, "passes", e.target.value)} /></td>
                        <td><input className="cell-input" type="number" min="0" value={s.jaune} onChange={(e) => updateStat(playerId, "jaune", e.target.value)} /></td>
                        <td><input className="cell-input" type="number" min="0" value={s.rouge} onChange={(e) => updateStat(playerId, "rouge", e.target.value)} /></td>
                        <td><input className="cell-input" type="number" min="0" value={minutesVal} onChange={(e) => updateStat(playerId, "minutes", e.target.value)} /></td>
                        <td><input className="cell-input" type="number" min="0" max="10" step="0.5" value={s.note} onChange={(e) => updateStat(playerId, "note", e.target.value)} /></td>
                        {showDetailed && (
                          <>
                            <td><input className="cell-input" type="number" min="0" value={s.tirs} onChange={(e) => updateStat(playerId, "tirs", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.tirsCadres} onChange={(e) => updateStat(playerId, "tirsCadres", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.passesReussies} onChange={(e) => updateStat(playerId, "passesReussies", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.passesCles} onChange={(e) => updateStat(playerId, "passesCles", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.centres} onChange={(e) => updateStat(playerId, "centres", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.dribbles} onChange={(e) => updateStat(playerId, "dribbles", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.ballonsRecuperes} onChange={(e) => updateStat(playerId, "ballonsRecuperes", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.interceptions} onChange={(e) => updateStat(playerId, "interceptions", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.tacles} onChange={(e) => updateStat(playerId, "tacles", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.duelsGagnes} onChange={(e) => updateStat(playerId, "duelsGagnes", e.target.value)} /></td>
                            <td><input className="cell-input" type="number" min="0" value={s.fautes} onChange={(e) => updateStat(playerId, "fautes", e.target.value)} /></td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel">
            <h3>{t("panel_summary")}</h3>
            <textarea className="bulk-textarea" rows={5} value={match.summary || ""} onChange={(e) => patch({ summary: e.target.value })} placeholder={t("summary_placeholder")} />
          </div>
        </>
      )}

      {tab === "opponent" && (
        <>
          {!match.opponent && <p className="muted">{t("no_players_first")}</p>}
          {match.opponent && (
            <OpponentProfileContent teamName={match.opponent} opponentProfiles={opponentProfiles} setOpponentProfiles={setOpponentProfiles} leagueMatches={leagueMatches} />
          )}
        </>
      )}

      {tab === "goals" && (
        <>
          <div className="panel panel-sections panel-sections-v">
            <div className="panel-section" style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>{t("panel_goals_scored")}</h3>
                <button className="btn-gold" onClick={addGoalScored}><Plus size={16} /> {t("goal_add")}</button>
              </div>
              {goalsScored.length === 0 && <p className="muted">{t("no_goals_scored")}</p>}
              {goalsScored.length > 0 && (
                <table className="stats-table entry-table">
                  <thead><tr><th>{t("th_minute")}</th><th>{t("field_scorer")}</th><th>{t("th_type")}</th><th /></tr></thead>
                  <tbody>
                    {goalsScored.map((g) => (
                      <tr key={g.id}>
                        <td><input className="cell-input" type="number" min="0" max="120" value={g.minute} onChange={(e) => updateGoalScored(g.id, "minute", e.target.value)} /></td>
                        <td>
                          <select value={g.player} onChange={(e) => updateGoalScored(g.id, "player", e.target.value)}>
                            <option value="">—</option>
                          {players.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </td>
                      <td><GoalTypeSelect value={g.type} onChange={(v) => updateGoalScored(g.id, "type", v)} /></td>
                      <td><button className="icon-btn" onClick={() => removeGoalScored(g.id)}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>

            <div className="panel-section" style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0 }}>{t("panel_goals_conceded")}</h3>
                <button className="btn-gold" onClick={addGoalConceded}><Plus size={16} /> {t("goal_add")}</button>
              </div>
              {goalsConceded.length === 0 && <p className="muted">{t("no_goals_conceded")}</p>}
              {goalsConceded.length > 0 && (
                <table className="stats-table entry-table">
                  <thead><tr><th>{t("th_minute")}</th><th>{t("field_conceded_player")}</th><th>{t("th_type")}</th><th /></tr></thead>
                  <tbody>
                    {goalsConceded.map((g) => (
                      <tr key={g.id}>
                        <td><input className="cell-input" type="number" min="0" max="120" value={g.minute} onChange={(e) => updateGoalConceded(g.id, "minute", e.target.value)} /></td>
                        <td><input className="cell-input" style={{ width: 140 }} list="opponent-roster-list" value={g.player} onChange={(e) => updateGoalConceded(g.id, "player", e.target.value)} /></td>
                        <td><GoalTypeSelect value={g.type} onChange={(v) => updateGoalConceded(g.id, "type", v)} /></td>
                        <td><button className="icon-btn" onClick={() => removeGoalConceded(g.id)}><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      <datalist id="opponent-roster-list">
        {opponentRoster.map((name) => <option key={name} value={name} />)}
      </datalist>

      {showEditInfo && <MatchForm initial={match} onSave={saveEditInfo} onClose={() => setShowEditInfo(false)} />}
    </div>
  );
}
