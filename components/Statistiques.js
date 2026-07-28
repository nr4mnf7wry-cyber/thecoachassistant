import { useState, useMemo } from "react";
import { Target, Handshake, Award, BarChart3, ClipboardCheck, Gauge, Wind, Users, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { useLang } from "../lib/i18n";
import {
  Badge, MetricCard, aggregateMatches, aggregateTrainings, latestCardio, isMatchPlayed,
  POSITIONS, POSITION_KEYS, latestEvaluationBySource, overallAvg,
} from "../lib/shared";

function TrendPill({ current, previous }) {
  if (previous === null || previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={"trend-pill " + (up ? "trend-up" : "trend-down")}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{delta}
    </span>
  );
}

export function Statistiques({ players, matches, trainings, evaluations }) {
  const { t } = useLang();
  const [tab, setTab] = useState("overview");
  const agg = useMemo(() => aggregateMatches(players, matches), [players, matches]);
  const attendanceAgg = useMemo(() => aggregateTrainings(players, trainings), [players, trainings]);
  const totalButs = agg.reduce((s, a) => s + a.buts, 0);
  const goalsTrend = useMemo(() => {
    const played = [...matches].filter(isMatchPlayed).sort((a, b) => (a.date > b.date ? 1 : -1));
    if (played.length < 2) return null;
    const last5 = played.slice(-5);
    const prev5 = played.slice(-10, -5);
    if (prev5.length === 0) return null;
    const sum = (arr) => arr.reduce((s, m) => s + (Number(m.scoreFor) || 0), 0);
    return { current: sum(last5), previous: sum(prev5) };
  }, [matches]);
  const topScorerCard = [...agg].sort((a, b) => b.buts - a.buts)[0];
  const notedPlayers = agg.filter((a) => a.avgNote !== null);
  const bestAvgCard = notedPlayers.length ? [...notedPlayers].sort((a, b) => b.avgNote - a.avgNote)[0] : null;
  const topFive = [...agg].sort((a, b) => b.buts - a.buts || b.passes - a.passes).slice(0, 5);
  const trendData = [...matches].sort((a, b) => (a.date > b.date ? 1 : -1)).map((m) => ({
    name: m.opponent?.slice(0, 10) || "match",
    [t("legend_scored")]: Number(m.scoreFor) || 0,
    [t("legend_conceded")]: Number(m.scoreAgainst) || 0,
  }));
  const teamNoteEvolution = useMemo(() => {
    return [...matches].sort((a, b) => (a.date > b.date ? 1 : -1)).map((m) => {
      const notesArr = (m.squad || []).map((id) => Number(m.stats?.[id]?.note)).filter((n) => !isNaN(n) && n > 0);
      const avg = notesArr.length ? Math.round((notesArr.reduce((s, n) => s + n, 0) / notesArr.length) * 10) / 10 : null;
      return { name: m.opponent?.slice(0, 10) || "match", note: avg };
    }).filter((d) => d.note !== null);
  }, [matches]);

  const buteurs = [...agg].filter((a) => a.buts > 0).sort((a, b) => b.buts - a.buts).slice(0, 5);
  const passeurs = [...agg].filter((a) => a.passes > 0).sort((a, b) => b.passes - a.passes).slice(0, 5);
  const notes = [...agg].filter((a) => a.avgNote !== null).sort((a, b) => b.avgNote - a.avgNote).slice(0, 5);
  const cartons = [...agg].filter((a) => a.jaune + a.rouge > 0).sort((a, b) => (b.jaune + b.rouge * 2) - (a.jaune + a.rouge * 2)).slice(0, 5);
  const assiduite = [...attendanceAgg].filter((a) => a.rate !== null).sort((a, b) => b.rate - a.rate).slice(0, 5);
  const charge = [...attendanceAgg].filter((a) => a.avgRpe !== null).sort((a, b) => b.avgRpe - a.avgRpe).slice(0, 5);
  const vmaTop = useMemo(() => players.map((p) => ({ player: p, c: latestCardio(trainings, p.id) })).filter((x) => x.c?.vma).sort((a, b) => Number(b.c.vma) - Number(a.c.vma)).slice(0, 5), [players, trainings]);

  const bestByPosition = useMemo(() => {
    return POSITIONS.map((pos) => {
      const ranked = players.filter((p) => p.position === pos).map((p) => {
        const lastEval = latestEvaluationBySource(evaluations || [], p.id, "coach");
        const generalNote = lastEval ? overallAvg(lastEval.scores) : null;
        const m = agg.find((a) => a.player.id === p.id);
        return { player: p, generalNote, avgNote: m?.avgNote ?? null };
      })
        .filter((r) => r.generalNote !== null || r.avgNote !== null)
        .sort((a, b) => (b.generalNote ?? -1) - (a.generalNote ?? -1) || (b.avgNote ?? -1) - (a.avgNote ?? -1));
      return { position: pos, top: ranked.slice(0, 3) };
    });
  }, [players, evaluations, agg]);

  const Leaderboard = ({ title, icon: Icon, rows, valueFn }) => (
    <div>
      <h3><Icon size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{title}</h3>
      {rows.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
      {rows.map((r, i) => (
        <div key={r.player.id} className="rank-card">
          <span className="rank-card-number">{i + 1}</span>
          <Badge number={r.player.number} size={34} />
          <div className="rank-card-info">
            <div className="rank-card-name">{r.player.name}</div>
            {r.player.position && <div className="rank-card-sub">{t(POSITION_KEYS[r.player.position])}</div>}
          </div>
          <span className="rank-card-value">{valueFn(r)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="view-header"><h1>{t("stats_title")}</h1></div>

      <div className="tab-bar">
        <button className={"tab-btn" + (tab === "overview" ? " active" : "")} onClick={() => setTab("overview")}>{t("stats_tab_overview")}</button>
        <button className={"tab-btn" + (tab === "leaderboards" ? " active" : "")} onClick={() => setTab("leaderboards")}>{t("stats_tab_leaderboards")}</button>
        <button className={"tab-btn" + (tab === "position" ? " active" : "")} onClick={() => setTab("position")}>{t("stats_tab_position")}</button>
      </div>

      {tab === "overview" && (
        <>
          <div className="metric-grid">
            <MetricCard label={t("metric_matches_played")} value={matches.length} icon={CalendarDays} />
            <MetricCard label={t("metric_goals_scored")} value={totalButs} icon={Target} trend={goalsTrend && <TrendPill current={goalsTrend.current} previous={goalsTrend.previous} />} />
            <MetricCard label={t("metric_top_scorer")} value={topScorerCard && topScorerCard.buts > 0 ? `${topScorerCard.player.name} (${topScorerCard.buts})` : "—"} icon={Award} />
            <MetricCard label={t("metric_best_avg")} value={bestAvgCard ? `${bestAvgCard.player.name} (${bestAvgCard.avgNote})` : "—"} icon={BarChart3} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3>{t("panel_top5")}</h3>
            {topFive.length === 0 && <p className="muted">{t("no_stats_yet")}</p>}
            {topFive.map((a, i) => (
              <div key={a.player.id} className="rank-card">
                <span className="rank-card-number">{i + 1}</span>
                <Badge number={a.player.number} size={34} />
                <div className="rank-card-info">
                  <div className="rank-card-name">{a.player.name}</div>
                  {a.player.position && <div className="rank-card-sub">{t(POSITION_KEYS[a.player.position])}</div>}
                </div>
                <span className="rank-card-value" style={{ fontSize: 13 }}>{a.buts} {t("th_goals_short")} · {a.passes} {t("th_assists_short")}</span>
              </div>
            ))}
          </div>

          {matches.length > 0 && (
            <div className="two-col">
              <div className="panel">
                <h3>{t("chart_goals_title")}</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                      <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "var(--chalk-dim)" }} />
                      <Bar dataKey={t("legend_scored")} fill="var(--gold)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey={t("legend_conceded")} fill="var(--red)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {teamNoteEvolution.length > 1 && (
                <div className="panel">
                  <h3>{t("chart_team_note_evolution")}</h3>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={teamNoteEvolution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--pitch-line)" />
                        <XAxis dataKey="name" tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                        <YAxis domain={[0, 10]} tick={{ fill: "var(--chalk-dim)", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "var(--pitch-mid)", border: "1px solid var(--pitch-line)", color: "var(--chalk)" }} />
                        <Line type="monotone" dataKey="note" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "leaderboards" && (
        <div className="panel panel-sections">
          <div className="panel-section panel-sections-v" style={{ padding: 0 }}>
            <div className="panel-section"><Leaderboard title={t("lb_top_scorers")} icon={Target} rows={buteurs} valueFn={(r) => r.buts} /></div>
            <div className="panel-section"><Leaderboard title={t("lb_top_assists")} icon={Handshake} rows={passeurs} valueFn={(r) => r.passes} /></div>
          </div>
          <div className="panel-section panel-sections-v" style={{ padding: 0 }}>
            <div className="panel-section"><Leaderboard title={t("lb_best_avg")} icon={Award} rows={notes} valueFn={(r) => r.avgNote} /></div>
            <div className="panel-section"><Leaderboard title={t("lb_discipline")} icon={BarChart3} rows={cartons} valueFn={(r) => `${r.jaune} / ${r.rouge}`} /></div>
          </div>
          <div className="panel-section panel-sections-v" style={{ padding: 0 }}>
            <div className="panel-section"><Leaderboard title={t("lb_attendance")} icon={ClipboardCheck} rows={assiduite} valueFn={(r) => `${r.rate}% (${r.present}/${r.total})`} /></div>
            <div className="panel-section"><Leaderboard title={t("lb_rpe")} icon={Gauge} rows={charge} valueFn={(r) => r.avgRpe} /></div>
          </div>
          <div className="panel-section">
            <h3><Wind size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{t("lb_vma")}</h3>
            {vmaTop.length === 0 && <p className="muted">{t("no_vma_yet")}</p>}
            {vmaTop.map((r, i) => (
              <div key={r.player.id} className="rank-card">
                <span className="rank-card-number">{i + 1}</span>
                <Badge number={r.player.number} size={34} />
                <div className="rank-card-info">
                  <div className="rank-card-name">{r.player.name}</div>
                  {r.player.position && <div className="rank-card-sub">{t(POSITION_KEYS[r.player.position])}</div>}
                </div>
                <span className="rank-card-value">{r.c.vma} km/h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "position" && (
        <div className="panel">
          <h3><Users size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{t("panel_best_by_position")}</h3>
          <div className="two-col">
            {bestByPosition.map(({ position, top }) => (
              <div key={position}>
                <p className="muted mono" style={{ marginBottom: 6, fontSize: 11.5, textTransform: "uppercase" }}>{t(POSITION_KEYS[position])}</p>
                {top.length === 0 && <p className="muted" style={{ marginBottom: 14 }}>{t("no_position_data")}</p>}
                {top.map((r, i) => (
                  <div key={r.player.id} className="rank-card">
                    <span className="rank-card-number">{i + 1}</span>
                    <Badge number={r.player.number} size={30} />
                    <div className="rank-card-info">
                      <div className="rank-card-name">{r.player.name}</div>
                    </div>
                    <span className="rank-card-value">{r.generalNote ?? r.avgNote}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
