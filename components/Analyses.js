import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { useLang } from "../lib/i18n";
import { aggregateMatches, aggregateTrainings, GOAL_TYPE_GROUPS, formatDate, byTimeSlot, byCategory, byType } from "../lib/shared";

function resultOf(m) {
  const f = Number(m.scoreFor), a = Number(m.scoreAgainst);
  if (m.scoreFor === "" || m.scoreAgainst === "" || isNaN(f) || isNaN(a)) return null;
  if (f > a) return "W";
  if (f < a) return "L";
  return "D";
}

function downloadCSV(rows, filename) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadExcel(rows, filename) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export");
  XLSX.writeFile(wb, filename);
}

export function Analyses({ players, matches, trainings }) {
  const { t } = useLang();
  const seasonAgg = useMemo(() => aggregateMatches(players, matches), [players, matches]);
  const seasonTrainAgg = useMemo(() => aggregateTrainings(players, trainings), [players, trainings]);
  const seasonSummary = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    matches.forEach((m) => {
      const r = resultOf(m);
      if (r === "W") w++; else if (r === "D") d++; else if (r === "L") l++;
      gf += Number(m.scoreFor) || 0;
      ga += Number(m.scoreAgainst) || 0;
    });
    const scorers = [...seasonAgg].filter((a) => a.buts > 0).sort((a, b) => b.buts - a.buts)[0] || null;
    const assisters = [...seasonAgg].filter((a) => a.passes > 0).sort((a, b) => b.passes - a.passes)[0] || null;
    const noted = [...seasonAgg].filter((a) => a.avgNote !== null).sort((a, b) => b.avgNote - a.avgNote)[0] || null;
    const attendees = [...seasonTrainAgg].filter((a) => a.rate !== null).sort((a, b) => b.rate - a.rate)[0] || null;
    return { count: matches.length, w, d, l, gf, ga, scorers, assisters, noted, attendees };
  }, [matches, seasonAgg, seasonTrainAgg]);

  const [competition, setCompetition] = useState("");
  const [opponent, setOpponent] = useState("");
  const [venue, setVenue] = useState("");
  const [formation, setFormation] = useState("");
  const [playerA, setPlayerA] = useState(players[0]?.id || "");
  const [playerB, setPlayerB] = useState(players[1]?.id || "");
  const [tab, setTab] = useState("filters");

  const competitions = useMemo(() => [...new Set(matches.map((m) => m.competition).filter(Boolean))], [matches]);
  const opponents = useMemo(() => [...new Set(matches.map((m) => m.opponent).filter(Boolean))], [matches]);
  const formations = useMemo(() => [...new Set(matches.map((m) => m.formation).filter(Boolean))], [matches]);

  const filtered = useMemo(() => matches.filter((m) =>
    (!competition || m.competition === competition) &&
    (!opponent || m.opponent === opponent) &&
    (!venue || m.homeAway === venue) &&
    (!formation || m.formation === formation)
  ), [matches, competition, opponent, venue, formation]);

  const summary = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    filtered.forEach((m) => {
      const r = resultOf(m);
      if (r === "W") w++; else if (r === "D") d++; else if (r === "L") l++;
      gf += Number(m.scoreFor) || 0;
      ga += Number(m.scoreAgainst) || 0;
    });
    return { count: filtered.length, w, d, l, gf, ga, avg: filtered.length ? Math.round((gf / filtered.length) * 10) / 10 : 0 };
  }, [filtered]);

  const homeAway = useMemo(() => {
    const home = filtered.filter((m) => m.homeAway === "domicile");
    const away = filtered.filter((m) => m.homeAway === "exterieur");
    const sum = (list, field) => list.reduce((s, m) => s + (Number(m[field]) || 0), 0);
    return [
      { name: t("home"), scored: sum(home, "scoreFor"), conceded: sum(home, "scoreAgainst") },
      { name: t("away"), scored: sum(away, "scoreFor"), conceded: sum(away, "scoreAgainst") },
    ];
  }, [filtered, t]);

  const byFormation = useMemo(() => {
    const map = {};
    filtered.forEach((m) => {
      const f = m.formation || "—";
      if (!map[f]) map[f] = { formation: f, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      map[f].played += 1;
      const r = resultOf(m);
      if (r === "W") map[f].w++; else if (r === "D") map[f].d++; else if (r === "L") map[f].l++;
      map[f].gf += Number(m.scoreFor) || 0;
      map[f].ga += Number(m.scoreAgainst) || 0;
    });
    return Object.values(map).sort((a, b) => (b.w / (b.played || 1)) - (a.w / (a.played || 1)));
  }, [filtered]);

  const matchAgg = useMemo(() => aggregateMatches(players, matches), [players, matches]);
  const trainAgg = useMemo(() => aggregateTrainings(players, trainings), [players, trainings]);

  const allScored = useMemo(() => filtered.flatMap((m) => m.goalsScored || []), [filtered]);
  const allConceded = useMemo(() => filtered.flatMap((m) => m.goalsConceded || []), [filtered]);
  const scoredBySlot = useMemo(() => byTimeSlot(allScored), [allScored]);
  const concededBySlot = useMemo(() => byTimeSlot(allConceded), [allConceded]);
  const scoredByCat = useMemo(() => byCategory(allScored), [allScored]);
  const concededByCat = useMemo(() => byCategory(allConceded), [allConceded]);
  const scoredByType = useMemo(() => byType(allScored).slice(0, 3), [allScored]);
  const concededByType = useMemo(() => byType(allConceded).slice(0, 3), [allConceded]);

  const compareRow = (playerId) => ({
    m: matchAgg.find((a) => a.player.id === playerId),
    tr: trainAgg.find((a) => a.player.id === playerId),
  });
  const rowA = compareRow(playerA);
  const rowB = compareRow(playerB);

  const exportRows = () => [
    ["Date", "Adversaire", "Lieu", "Compétition", "Formation", "Score pour", "Score contre"],
    ...filtered.map((m) => [m.date, m.opponent, m.homeAway === "domicile" ? t("home") : t("away"), m.competition, m.formation || "", m.scoreFor, m.scoreAgainst]),
  ];

  return (
    <div>
      <div className="view-header"><h1>{t("analyses_title")}</h1></div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{t("panel_season_summary")}</h3>
          <button className="icon-btn" onClick={() => window.print()}><Printer size={14} /> {t("print_summary")}</button>
        </div>
        <p className="muted" style={{ marginBottom: 14 }}>{t("summary_intro")}</p>
        <div className="metric-grid">
          <div className="metric-card"><div><div className="metric-value">{seasonSummary.count}</div><div className="metric-label">{t("summary_matches_count")}</div></div></div>
          <div className="metric-card"><div><div className="metric-value">{seasonSummary.w}-{seasonSummary.d}-{seasonSummary.l}</div><div className="metric-label">{t("summary_record")}</div></div></div>
          <div className="metric-card"><div><div className="metric-value">{seasonSummary.gf} / {seasonSummary.ga}</div><div className="metric-label">{t("summary_goals_for")} / {t("summary_goals_against")}</div></div></div>
        </div>
        <div className="metric-grid" style={{ marginTop: 14 }}>
          <div className="metric-card"><div><div className="metric-value">{seasonSummary.scorers ? `${seasonSummary.scorers.player.name} (${seasonSummary.scorers.buts})` : "—"}</div><div className="metric-label">{t("summary_top_scorer")}</div></div></div>
          <div className="metric-card"><div><div className="metric-value">{seasonSummary.assisters ? `${seasonSummary.assisters.player.name} (${seasonSummary.assisters.passes})` : "—"}</div><div className="metric-label">{t("summary_top_assist")}</div></div></div>
          <div className="metric-card"><div><div className="metric-value">{seasonSummary.noted ? `${seasonSummary.noted.player.name} (${seasonSummary.noted.avgNote})` : "—"}</div><div className="metric-label">{t("summary_top_note")}</div></div></div>
          <div className="metric-card"><div><div className="metric-value">{seasonSummary.attendees ? `${seasonSummary.attendees.player.name} (${seasonSummary.attendees.rate}%)` : "—"}</div><div className="metric-label">{t("summary_top_attendance")}</div></div></div>
        </div>
      </div>

      <div className="tab-bar">
        <button className={"tab-btn" + (tab === "filters" ? " active" : "")} onClick={() => setTab("filters")}>{t("analyses_tab_filters")}</button>
        <button className={"tab-btn" + (tab === "goals" ? " active" : "")} onClick={() => setTab("goals")}>{t("analyses_tab_goals")}</button>
        <button className={"tab-btn" + (tab === "compare" ? " active" : "")} onClick={() => setTab("compare")}>{t("analyses_tab_compare")}</button>
      </div>

      {tab === "filters" && (
        <>
      <div className="panel">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          <label className="muted" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 5 }}>{t("filter_competition")}
            <select value={competition} onChange={(e) => setCompetition(e.target.value)}>
              <option value="">{t("filter_all")}</option>
              {competitions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="muted" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 5 }}>{t("filter_opponent")}
            <select value={opponent} onChange={(e) => setOpponent(e.target.value)}>
              <option value="">{t("filter_all")}</option>
              {opponents.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="muted" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 5 }}>{t("filter_venue")}
            <select value={venue} onChange={(e) => setVenue(e.target.value)}>
              <option value="">{t("filter_all")}</option>
              <option value="domicile">{t("home")}</option>
              <option value="exterieur">{t("away")}</option>
            </select>
          </label>
          <label className="muted" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 5 }}>{t("filter_formation")}
            <select value={formation} onChange={(e) => setFormation(e.target.value)}>
              <option value="">{t("filter_all")}</option>
              {formations.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card"><div><div className="metric-value">{summary.count}</div><div className="metric-label">{t("summary_matches_count")}</div></div></div>
        <div className="metric-card"><div><div className="metric-value">{summary.w}-{summary.d}-{summary.l}</div><div className="metric-label">{t("summary_record")}</div></div></div>
        <div className="metric-card"><div><div className="metric-value">{summary.gf} / {summary.ga}</div><div className="metric-label">{t("summary_goals_for")} / {t("summary_goals_against")}</div></div></div>
        <div className="metric-card"><div><div className="metric-value">{summary.avg}</div><div className="metric-label">{t("summary_avg_goals")}</div></div></div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>{t("panel_home_away_split")}</h3>
          <table className="stats-table">
            <thead><tr><th /><th>{t("legend_scored")}</th><th>{t("legend_conceded")}</th></tr></thead>
            <tbody>
              {homeAway.map((row) => (
                <tr key={row.name}><td>{row.name}</td><td className="mono">{row.scored}</td><td className="mono">{row.conceded}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h3>{t("panel_formation_performance")}</h3>
          {byFormation.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
          {byFormation.length > 0 && (
            <table className="stats-table">
              <thead><tr><th>{t("th_formation")}</th><th>{t("th_wins")}</th><th>{t("th_draws")}</th><th>{t("th_losses")}</th><th>{t("summary_goals_for")}/{t("summary_goals_against")}</th></tr></thead>
              <tbody>
                {byFormation.map((f) => (
                  <tr key={f.formation}><td>{f.formation}</td><td className="mono">{f.w}</td><td className="mono">{f.d}</td><td className="mono">{f.l}</td><td className="mono">{f.gf}/{f.ga}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="panel" style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0 }}>{t("panel_filtered_matches")}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" onClick={() => downloadCSV(exportRows(), "matchs.csv")}><Download size={14} /> {t("export_csv")}</button>
            <button className="icon-btn" onClick={() => downloadExcel(exportRows(), "matchs.xlsx")}><FileSpreadsheet size={14} /> {t("export_excel")}</button>
            <button className="icon-btn" onClick={() => window.print()}><Printer size={14} /> {t("export_pdf")}</button>
          </div>
        </div>
        <p className="muted" style={{ marginBottom: 10 }}>{t("analyses_pdf_note")}</p>
        {filtered.length === 0 && <p className="muted">{t("no_matches_for_filter")}</p>}
        {filtered.length > 0 && (
          <table className="stats-table">
            <thead><tr><th>{t("th_date")}</th><th>{t("th_opponent")}</th><th>{t("field_venue")}</th><th>{t("field_competition")}</th><th>{t("th_formation")}</th><th>Score</th></tr></thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td className="mono">{formatDate(m.date)}</td><td>{m.opponent}</td>
                  <td>{m.homeAway === "domicile" ? t("home") : t("away")}</td>
                  <td>{m.competition || "—"}</td><td>{m.formation || "—"}</td>
                  <td className="mono">{m.scoreFor !== "" ? m.scoreFor : "–"}-{m.scoreAgainst !== "" ? m.scoreAgainst : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}

      {tab === "goals" && (
        <>

      <div className="two-col">
        <div className="panel">
          <h3>{t("panel_goals_by_timeslot")}</h3>
          {allScored.length === 0 && allConceded.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
          {(allScored.length > 0 || allConceded.length > 0) && (
            <table className="stats-table">
              <thead><tr><th /><th>{t("panel_goals_scored")}</th><th>%</th><th>{t("panel_goals_conceded")}</th><th>%</th></tr></thead>
              <tbody>
                {scoredBySlot.map((s, i) => (
                  <tr key={s.slot}><td>{s.slot}</td><td className="mono">{s.count}</td><td className="mono">{s.pct}%</td><td className="mono">{concededBySlot[i].count}</td><td className="mono">{concededBySlot[i].pct}%</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel">
          <h3>{t("panel_goals_by_category")}</h3>
          {scoredByCat.length === 0 && concededByCat.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
          <div className="two-col" style={{ gap: 10 }}>
            <div>
              <p className="muted" style={{ marginBottom: 6 }}>{t("panel_goals_scored")}</p>
              {scoredByCat.map((c) => (
                <div key={c.cat} className="leaderboard-row"><span style={{ flex: 1 }}>{c.cat}</span><span className="mono">{c.count} ({c.pct}%)</span></div>
              ))}
            </div>
            <div>
              <p className="muted" style={{ marginBottom: 6 }}>{t("panel_goals_conceded")}</p>
              {concededByCat.map((c) => (
                <div key={c.cat} className="leaderboard-row"><span style={{ flex: 1 }}>{c.cat}</span><span className="mono">{c.count} ({c.pct}%)</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>{t("panel_goals_top_types")}</h3>
        {scoredByType.length === 0 && concededByType.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
        <div className="two-col" style={{ gap: 10 }}>
          <div>
            <p className="muted" style={{ marginBottom: 6 }}>{t("panel_goals_scored")}</p>
            {scoredByType.map((ty, i) => (
              <div key={ty.type} className="leaderboard-row"><span className="rank">{i + 1}</span><span style={{ flex: 1 }}>{ty.type}</span><span className="mono">{ty.count} ({ty.pct}%)</span></div>
            ))}
          </div>
          <div>
            <p className="muted" style={{ marginBottom: 6 }}>{t("panel_goals_conceded")}</p>
            {concededByType.map((ty, i) => (
              <div key={ty.type} className="leaderboard-row"><span className="rank">{i + 1}</span><span style={{ flex: 1 }}>{ty.type}</span><span className="mono">{ty.count} ({ty.pct}%)</span></div>
            ))}
          </div>
        </div>
      </div>

        </>
      )}

      {tab === "compare" && (
        <>
      <div className="panel">
        <h3>{t("panel_player_comparison")}</h3>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
          <label className="muted" style={{ fontSize: 12.5 }}>{t("compare_player_a")}
            <select value={playerA} onChange={(e) => setPlayerA(e.target.value)} style={{ display: "block", marginTop: 4 }}>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="muted" style={{ fontSize: 12.5 }}>{t("compare_player_b")}
            <select value={playerB} onChange={(e) => setPlayerB(e.target.value)} style={{ display: "block", marginTop: 4 }}>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        {players.length >= 2 && (
          <table className="stats-table">
            <thead><tr><th /><th>{players.find((p) => p.id === playerA)?.name}</th><th>{players.find((p) => p.id === playerB)?.name}</th></tr></thead>
            <tbody>
              <tr><td>{t("metric_goals")}</td><td className="mono">{rowA.m?.buts ?? 0}</td><td className="mono">{rowB.m?.buts ?? 0}</td></tr>
              <tr><td>{t("th_assists_short")}</td><td className="mono">{rowA.m?.passes ?? 0}</td><td className="mono">{rowB.m?.passes ?? 0}</td></tr>
              <tr><td>{t("metric_avg_note")}</td><td className="mono">{rowA.m?.avgNote ?? "—"}</td><td className="mono">{rowB.m?.avgNote ?? "—"}</td></tr>
              <tr><td>{t("th_minutes_short")}</td><td className="mono">{rowA.m?.minutes ?? 0}</td><td className="mono">{rowB.m?.minutes ?? 0}</td></tr>
              <tr><td>{t("metric_matches_played")}</td><td className="mono">{rowA.m?.matchesPresent ?? 0}</td><td className="mono">{rowB.m?.matchesPresent ?? 0}</td></tr>
              <tr><td>{t("metric_avg_rpe")}</td><td className="mono">{rowA.tr?.avgRpe ?? "—"}</td><td className="mono">{rowB.tr?.avgRpe ?? "—"}</td></tr>
            </tbody>
          </table>
        )}
      </div>

        </>
      )}
    </div>
  );
}
