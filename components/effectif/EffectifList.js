import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Save, Users } from "lucide-react";
import { useLang } from "../../lib/i18n";
import {
  Badge, MetricCard, EmptyState, Modal, POSITIONS, POSITION_KEYS,
  aggregateMatches, aggregateTrainings, latestCardio, computeAge,
  overallAvg, latestEvaluationBySource, compareValues, useSortState, aggregatePositionCounts,
} from "../../lib/shared";
import { PlayerBulkForm } from "./PlayerForms";

const DEFAULT_COLUMNS = ["name", "position", "age", "goals", "assists", "yellowCards", "redCards", "generalNote", "lastVma", "minutes", "nbMatches", "nbTrainings"];
const DEFAULT_VISIBLE = ["name", "position", "age", "nbMatches", "goals"];
const COLUMNS_STORAGE_KEY = "effectif_columns_v1";

const columnLabels = (t) => ({
  name: t("field_name"), position: t("th_main_position"), age: t("th_age"),
  goals: t("th_goals"), assists: t("th_assists"), yellowCards: t("th_yellow_cards"), redCards: t("th_red_cards"),
  generalNote: t("th_general_note"), lastVma: t("th_last_vma"), minutes: t("th_playtime_season"),
  nbMatches: t("th_nb_matches"), nbTrainings: t("th_nb_trainings"),
});

function ColumnsModal({ columns, hidden, onSave, onClose }) {
  const { t } = useLang();
  const [order, setOrder] = useState(columns);
  const [hiddenSet, setHiddenSet] = useState(hidden);
  const labels = columnLabels(t);
  const move = (i, dir) => {
    const next = [...order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  const toggleHidden = (key) => setHiddenSet(hiddenSet.includes(key) ? hiddenSet.filter((k) => k !== key) : [...hiddenSet, key]);

  return (
    <Modal title={t("columns_customize_title")} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {order.map((key, i) => (
          <div key={key} className="player-row-card" style={{ border: "1px solid var(--pitch-line)", borderRadius: 8, padding: "6px 10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, fontSize: 13 }}>
              <input type="checkbox" checked={!hiddenSet.includes(key)} onChange={() => toggleHidden(key)} />
              {labels[key] || key}
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === order.length - 1}>↓</button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-gold" onClick={() => onSave(order, hiddenSet)}><Save size={16} /> {t("common_save")}</button>
    </Modal>
  );
}

export function Effectif({
  players, setPlayers, matches, trainings, evaluations, setEvaluations,
  availabilities, setAvailabilities, bodyMetrics, setBodyMetrics,
  allMatches, setMatches, allTrainings, setTrainings, setView,
}) {
  const { t } = useLang();
  const [showBulk, setShowBulk] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const { sort, toggleSort, sortArrow } = useSortState("name");
  const positionCounts = useMemo(() => aggregatePositionCounts(players), [players]);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [hiddenCols, setHiddenCols] = useState(DEFAULT_COLUMNS.filter((c) => !DEFAULT_VISIBLE.includes(c)));
  const [groupByPosition, setGroupByPosition] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(COLUMNS_STORAGE_KEY) || "null");
      if (saved?.order) setColumns(saved.order);
      if (saved?.hidden) setHiddenCols(saved.hidden);
    } catch (e) { /* préférence locale absente */ }
  }, []);
  const saveColumns = (order, hidden) => {
    setColumns(order); setHiddenCols(hidden); setShowColumns(false);
    try { window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify({ order, hidden })); } catch (e) { /* ignore */ }
  };

  const addBulk = (newPlayers) => { setPlayers([...players, ...newPlayers]); setShowBulk(false); };
  const removePlayer = (p) => {
    if (!confirm(t("confirm_delete_player"))) return;
    setPlayers(players.filter((x) => x.id !== p.id));

    setMatches(allMatches.map((m) => {
      if (!m.squad?.includes(p.id)) return m;
      const squad = m.squad.filter((id) => id !== p.id);
      const starters = (m.starters || []).filter((id) => id !== p.id);
      const lineupSlots = (m.lineupSlots || []).map((id) => (id === p.id ? null : id));
      const substitutions = (m.substitutions || []).filter((s) => s.outId !== p.id && s.inId !== p.id);
      const stats = { ...m.stats };
      delete stats[p.id];
      const captain = m.captain === p.id ? "" : m.captain;
      return { ...m, squad, starters, lineupSlots, substitutions, stats, captain };
    }));

    setTrainings(allTrainings.map((tr) => {
      if (!tr.attendance || !(p.id in tr.attendance)) return tr;
      const attendance = { ...tr.attendance };
      delete attendance[p.id];
      return { ...tr, attendance };
    }));

    setEvaluations(evaluations.filter((e) => e.playerId !== p.id));
    setAvailabilities(availabilities.filter((a) => a.playerId !== p.id));
    setBodyMetrics(bodyMetrics.filter((b) => b.playerId !== p.id));
  };

  const matchAgg = useMemo(() => aggregateMatches(players, matches), [players, matches]);
  const trainAgg = useMemo(() => aggregateTrainings(players, trainings), [players, trainings]);

  const rowFor = (p) => {
    const m = matchAgg.find((a) => a.player.id === p.id);
    const tr = trainAgg.find((a) => a.player.id === p.id);
    const lastVma = latestCardio(trainings, p.id)?.vma;
    const lastEval = latestEvaluationBySource(evaluations || [], p.id, "coach");
    return {
      age: computeAge(p.birthDate),
      lastVma: lastVma ? Number(lastVma) : null,
      minutes: m?.minutes ?? 0,
      nbMatches: m?.matchesPresent ?? 0,
      nbTrainings: tr?.present ?? 0,
      goals: m?.buts ?? 0,
      assists: m?.passes ?? 0,
      yellowCards: m?.jaune ?? 0,
      redCards: m?.rouge ?? 0,
      generalNote: lastEval ? overallAvg(lastEval.scores) : null,
    };
  };

  const rows = useMemo(() => {
    const base = players.map((p) => ({ player: p, r: rowFor(p) }));
    const { key, dir } = sort;
    return base.sort((a, b) => {
      let va, vb;
      if (key === "name") { va = a.player.name; vb = b.player.name; }
      else if (key === "position") { va = a.player.position ? t(POSITION_KEYS[a.player.position]) : ""; vb = b.player.position ? t(POSITION_KEYS[b.player.position]) : ""; }
      else { va = a.r[key]; vb = b.r[key]; }
      return compareValues(va, vb, dir);
    });
  }, [players, sort, matchAgg, trainAgg, trainings, evaluations]);

  const visibleColumns = columns.filter((c) => !hiddenCols.includes(c));
  const labels = columnLabels(t);
  const columnCell = (key, p, r) => {
    if (key === "name") return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Badge number={p.number} size={34} /><span className="player-name">{p.name}</span>
        {p.status === "invite" && <span className="status-chip" style={{ background: "var(--chalk-dim)" }}>{t("badge_guest")}</span>}
      </div>
    );
    if (key === "position") return p.position ? t(POSITION_KEYS[p.position]) : "—";
    if (key === "age") return r.age ?? "—";
    if (key === "goals") return r.goals;
    if (key === "assists") return r.assists;
    if (key === "yellowCards") return r.yellowCards;
    if (key === "redCards") return r.redCards;
    if (key === "generalNote") return r.generalNote ?? "—";
    if (key === "lastVma") return r.lastVma ?? "—";
    if (key === "minutes") return `${r.minutes} min`;
    if (key === "nbMatches") return r.nbMatches;
    if (key === "nbTrainings") return r.nbTrainings;
    return "—";
  };

  const groupedRows = useMemo(() => {
    if (!groupByPosition) return [{ position: null, rows }];
    const groups = [...POSITIONS, ""].map((pos) => ({
      position: pos,
      rows: rows.filter(({ player: p }) => (p.position || "") === pos),
    })).filter((g) => g.rows.length > 0);
    return groups;
  }, [rows, groupByPosition]);

  return (
    <div>
      <div className="view-header">
        <h1>{t("effectif_title")}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={"icon-btn" + (groupByPosition ? " active" : "")} onClick={() => setGroupByPosition(!groupByPosition)}>{t("effectif_group_by_position")}</button>
          <button className="icon-btn" onClick={() => setShowColumns(true)}>{t("columns_customize")}</button>
          <button className="btn-gold" onClick={() => setShowBulk(true)}><Plus size={16} /> {t("effectif_add")}</button>
        </div>
      </div>

      <p className="effectif-composition-line">
        {[...POSITIONS, ""].filter((pos) => positionCounts[pos]).map((pos) => (
          <span key={pos || "none"}><strong>{positionCounts[pos]}</strong> {pos ? t(POSITION_KEYS[pos]) : t("column_no_position")}</span>
        ))}
      </p>

      {players.length === 0 && (
        <EmptyState
          icon={Users}
          title={t("effectif_empty_title")}
          actionLabel={t("effectif_add")}
          onAction={() => setShowBulk(true)}
        />
      )}

      {players.length > 0 && (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="stats-table effectif-table">
            <thead>
              <tr>
                {visibleColumns.map((key) => (
                  <th key={key} className={key === "name" ? "sortable-th" : "sortable-th mono"} onClick={() => toggleSort(key)}>{labels[key] || key}{sortArrow(key)}</th>
                ))}
                <th />
              </tr>
            </thead>
            {groupedRows.map((group) => (
              <tbody key={group.position ?? "all"}>
                {groupByPosition && (
                  <tr className="table-group-row">
                    <td colSpan={visibleColumns.length + 1}>{group.position ? t(POSITION_KEYS[group.position]) : t("column_no_position")}</td>
                  </tr>
                )}
                {group.rows.map(({ player: p, r }) => (
                  <tr key={p.id} className="hover-reveal-row">
                    {visibleColumns.map((key) => (
                      <td key={key} className={key === "name" ? "" : "mono"} onClick={key === "name" ? () => setView("joueur:" + p.id) : undefined} style={key === "name" ? { cursor: "pointer" } : undefined}>
                        {columnCell(key, p, r)}
                      </td>
                    ))}
                    <td><button className="icon-btn hover-reveal" onClick={() => removePlayer(p)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {showBulk && <PlayerBulkForm existingPlayers={players} onSave={addBulk} onClose={() => setShowBulk(false)} />}
      {showColumns && <ColumnsModal columns={columns} hidden={hiddenCols} onSave={saveColumns} onClose={() => setShowColumns(false)} />}
    </div>
  );
}
