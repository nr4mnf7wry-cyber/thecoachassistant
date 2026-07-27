import { useState, useMemo, useEffect } from "react";
import { useLang } from "../lib/i18n";
import { formatDate, FORMATIONS, Badge, Avatar, POSITION_KEYS } from "../lib/shared";
import { getTeamNames, computeTeamStats, computeMostCommonComposition, computeFormationBreakdown, computeFormationTimeline, computePlayerAssociations, findTeamProfile } from "../lib/leagueHelpers";

const RESULT_KEYS = { W: "result_w", D: "result_d", L: "result_l" };
const RESULT_COLORS = { W: "var(--gold)", D: "var(--chalk-dim)", L: "var(--red)" };

export function Leaderboard({ title, rows, columns, icon: Icon, valueFn }) {
  const { t } = useLang();
  const valueOf = (r) => {
    if (valueFn) return valueFn(r);
    if (columns) return columns.map((c) => `${r[c.key]} ${c.label}`).join(" · ");
    return "";
  };
  return (
    <div>
      <h3>{Icon && <Icon size={14} style={{ marginRight: 6, verticalAlign: -2 }} />}{title}</h3>
      {rows.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
      {rows.map((r, i) => {
        const isPlayerObj = r.player && typeof r.player === "object";
        const name = isPlayerObj ? r.player.name : r.player;
        return (
          <div key={(isPlayerObj ? r.player.id : r.player) + i} className="rank-card">
            <span className="rank-card-number">{i + 1}</span>
            {isPlayerObj ? <Badge number={r.player.number} size={34} /> : <Avatar name={name} size={34} />}
            <div className="rank-card-info">
              <div className="rank-card-name">{name}</div>
              {isPlayerObj && r.player.position && <div className="rank-card-sub">{t(POSITION_KEYS[r.player.position])}</div>}
            </div>
            <span className="rank-card-value" style={{ fontSize: 13 }}>{valueOf(r)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TimeSlotTable({ title, rows }) {
  const { t } = useLang();
  return (
    <div>
      <p className="muted mono" style={{ marginBottom: 6, fontSize: 11.5, textTransform: "uppercase" }}>{title}</p>
      <table className="stats-table">
        <thead><tr><th />{rows.map((r) => <th key={r.slot}>{r.slot}</th>)}</tr></thead>
        <tbody>
          <tr>
            <td className="muted">{t("th_goals_short")}</td>
            {rows.map((r) => <td key={r.slot} className="mono">{r.count}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function CategoryList({ title, rows }) {
  const { t } = useLang();
  return (
    <div>
      <p className="muted mono" style={{ marginBottom: 6, fontSize: 11.5, textTransform: "uppercase" }}>{title}</p>
      {rows.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
      {rows.map((r) => (
        <div key={r.cat} className="leaderboard-row">
          <span style={{ flex: 1 }}>{r.cat}</span><span className="mono">{r.count} ({r.pct}%)</span>
        </div>
      ))}
    </div>
  );
}

export function FormationTimeline({ rows }) {
  const { t } = useLang();
  return (
    <div className="panel" style={{ overflowX: "auto" }}>
      <h3>{t("panel_formation_timeline")}</h3>
      {rows.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
      {rows.length > 0 && (
        <table className="stats-table">
          <thead><tr><th>{t("th_date")}</th><th>{t("th_opponent")}</th><th>{t("field_formation")}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="mono">{formatDate(r.date)}</td>
                <td>{r.opponent}</td>
                <td className="mono">{r.formation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AssociationsList({ rows }) {
  const { t } = useLang();
  return (
    <div className="panel">
      <h3>{t("panel_associations")}</h3>
      {rows.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
      {rows.map((r, i) => (
        <div key={i} className="leaderboard-row">
          <span style={{ flex: 1 }}>{r.pair}</span><span className="mono">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export function Concurrents({ leagueMatches, opponentProfiles, initialTeam }) {
  const { t } = useLang();
  const [selectedTeam, setSelectedTeam] = useState(initialTeam || "");
  const [tab, setTab] = useState("bilan");
  useEffect(() => { if (initialTeam) setSelectedTeam(initialTeam); }, [initialTeam]);

  const teamNames = useMemo(() => getTeamNames(leagueMatches), [leagueMatches]);
  const stats = useMemo(() => (selectedTeam ? computeTeamStats(leagueMatches, selectedTeam) : null), [leagueMatches, selectedTeam]);
  const profile = useMemo(() => findTeamProfile(opponentProfiles, selectedTeam), [opponentProfiles, selectedTeam]);
  const profileAppearances = (profile?.appearances || []);
  const profileBase = profile?.compositions?.main?.base;
  const profileRows = useMemo(() => {
    if (!profileBase?.formation) return null;
    const shape = FORMATIONS[profileBase.formation] || FORMATIONS["4-4-2"];
    let cursor = 0;
    return shape.map((count) => {
      const indices = Array.from({ length: count }, (_, i) => cursor + i);
      cursor += count;
      return indices.map((i) => {
        const apId = (profileBase.slots || [])[i];
        return apId ? profileAppearances.find((a) => a.id === apId) : null;
      });
    });
  }, [profileBase, profileAppearances]);

  const mostCommonLineup = useMemo(() => {
    if (!selectedTeam) return null;
    const common = computeMostCommonComposition(leagueMatches, selectedTeam);
    if (!common) return null;
    const shape = FORMATIONS[common.formation] || FORMATIONS["4-4-2"];
    const rowPositions = shape.length === 5 ? ["Gardien", "Défenseur", "Milieu", "Milieu", "Attaquant"] : ["Gardien", "Défenseur", "Milieu", "Attaquant"];
    const used = new Set();
    const rows = shape.map((count, rowIdx) => {
      const pos = rowPositions[rowIdx] || "";
      const pool = (common.byPosition[pos] || []).filter((p) => !used.has(p.player));
      const picked = pool.slice(0, count);
      picked.forEach((p) => used.add(p.player));
      return Array.from({ length: count }, (_, i) => picked[i] || null);
    });
    return { formation: common.formation, sampleSize: common.sampleSize, rows };
  }, [leagueMatches, selectedTeam]);

  const formationBreakdown = useMemo(() => (selectedTeam ? computeFormationBreakdown(leagueMatches, selectedTeam) : []), [leagueMatches, selectedTeam]);
  const formationTimeline = useMemo(() => (selectedTeam ? computeFormationTimeline(leagueMatches, selectedTeam) : []), [leagueMatches, selectedTeam]);
  const associations = useMemo(() => (selectedTeam ? computePlayerAssociations(leagueMatches, selectedTeam) : []), [leagueMatches, selectedTeam]);

  return (
    <div>
      <div className="view-header">
        <h1>{t("competitors_title")}</h1>
      </div>

      <div className="panel">
        <label className="muted" style={{ fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
          {t("league_select_team")}
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            <option value="">{t("filter_all")}</option>
            {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {!selectedTeam && teamNames.length === 0 && <p className="muted">{t("league_none")}</p>}
      {!selectedTeam && teamNames.length > 0 && <p className="muted">{t("league_pick_team")}</p>}

      {selectedTeam && stats && (
        <div className="tab-bar">
          <button className={"tab-btn" + (tab === "bilan" ? " active" : "")} onClick={() => setTab("bilan")}>{t("concurrents_tab_bilan")}</button>
          <button className={"tab-btn" + (tab === "tactique" ? " active" : "")} onClick={() => setTab("tactique")}>{t("concurrents_tab_tactique")}</button>
          <button className={"tab-btn" + (tab === "timing" ? " active" : "")} onClick={() => setTab("timing")}>{t("concurrents_tab_timing")}</button>
        </div>
      )}

      {selectedTeam && stats && tab === "bilan" && (
        <>
          <div className="metric-grid">
            <div className="metric-card"><div><div className="metric-value">{stats.matchesCount}</div><div className="metric-label">{t("summary_matches_count")}</div></div></div>
            <div className="metric-card"><div><div className="metric-value">{stats.w}-{stats.d}-{stats.l}</div><div className="metric-label">{t("summary_record")}</div></div></div>
            <div className="metric-card"><div><div className="metric-value">{stats.gf} / {stats.ga}</div><div className="metric-label">{t("summary_goals_for")} / {t("summary_goals_against")}</div></div></div>
            <div className="metric-card"><div><div className="metric-value">{stats.avgGf} / {stats.avgGa}</div><div className="metric-label">{t("league_avg_goals")}</div></div></div>
          </div>

          <div className="panel panel-sections">
            <div className="panel-section">
              <h3>{t("panel_form")}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {stats.form.length === 0 && <p className="muted">{t("no_matches_yet")}</p>}
                {stats.form.map((r, i) => (
                  <span key={i} className="status-chip" style={{ background: RESULT_COLORS[r] }}>{t(RESULT_KEYS[r])}</span>
                ))}
              </div>
            </div>

            <div className="panel-section panel-sections-v" style={{ padding: 0 }}>
              <div className="panel-section">
                <Leaderboard title={t("league_top_scorers")} rows={stats.topScorers} columns={[{ key: "goals", label: t("th_goals_short") }]} />
              </div>
              <div className="panel-section">
                <Leaderboard title={t("league_top_minutes")} rows={stats.topMinutes} columns={[{ key: "minutes", label: t("th_minutes_short") }, { key: "matches", label: t("th_nb_matches") }]} />
              </div>
            </div>

            <div className="panel-section panel-sections-v" style={{ padding: 0 }}>
              <div className="panel-section">
                <Leaderboard title={t("league_cards")} rows={stats.cards} columns={[{ key: "yellow", label: t("th_yellow_short") }, { key: "red", label: t("th_red_short") }]} />
              </div>
              <div className="panel-section">
                <Leaderboard title={t("league_sub_freq")} rows={stats.subFreq} columns={[{ key: "out", label: t("sub_out_label") }, { key: "in", label: t("sub_in_label") }]} />
              </div>
            </div>
          </div>

          <div className="panel" style={{ overflowX: "auto" }}>
            <h3>{t("panel_filtered_matches")}</h3>
            {stats.matches.length === 0 && <p className="muted">{t("no_matches_for_filter")}</p>}
            {stats.matches.length > 0 && (
              <table className="stats-table">
                <thead><tr><th>{t("th_date")}</th><th>{t("th_opponent")}</th><th>Score</th></tr></thead>
                <tbody>
                  {stats.matches.map((m) => {
                    const isHome = m.homeTeam === selectedTeam;
                    const opponent = isHome ? m.awayTeam : m.homeTeam;
                    return (
                      <tr key={m.id}>
                        <td className="mono">{formatDate(m.date)}</td>
                        <td>{opponent} {!isHome && `(${t("home")})`}</td>
                        <td className="mono">{isHome ? `${m.homeScore}-${m.awayScore}` : `${m.awayScore}-${m.homeScore}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {selectedTeam && tab === "tactique" && (
        <>
      {selectedTeam && profile && (profileAppearances.length > 0 || profileRows) && (
        <div className="panel" style={{ overflowX: "auto" }}>
          <h3>{t("opponent_profile_title")}</h3>
          {profileAppearances.length > 0 && (
            <table className="stats-table" style={{ marginBottom: profileRows ? 18 : 0 }}>
              <thead><tr><th>#</th><th>{t("field_name")}</th><th>{t("th_main_position")}</th><th>{t("rating_label")}</th></tr></thead>
              <tbody>
                {profileAppearances.map((a) => (
                  <tr key={a.id} style={{ background: a.rating === "strength" ? "rgba(76,141,255,0.08)" : a.rating === "weakness" ? "rgba(229,72,77,0.08)" : undefined }}>
                    <td className="mono">{a.number || "—"}</td>
                    <td>{a.player}</td>
                    <td>{a.position || "—"}</td>
                    <td>{a.rating === "strength" ? t("rating_strength") : a.rating === "weakness" ? t("rating_weakness") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {profileRows && (
            <div className="pitch-board">
              {profileRows.map((rowPlayers, rowIdx) => (
                <div key={rowIdx} className="pitch-row">
                  {rowPlayers.map((a, i) => (
                    <div key={i} className={"pitch-chip" + (a ? "" : " empty")}>
                      {a ? <span>{a.player}</span> : <span className="muted">?</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

          {stats && (
            <>
          {mostCommonLineup && (
            <div className="panel">
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

          <div className="two-col">
            <div className="panel"><CategoryList title={t("panel_formation_breakdown")} rows={formationBreakdown.map((r) => ({ cat: r.formation, count: r.count, pct: r.pct }))} /></div>
            <AssociationsList rows={associations} />
          </div>

          <FormationTimeline rows={formationTimeline} />

            </>
          )}
        </>
      )}

      {selectedTeam && stats && tab === "timing" && (
        <>
          <div className="panel">
            <h3>{t("league_timing")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowX: "auto" }}>
              <TimeSlotTable title={t("panel_goals_scored")} rows={stats.goalsForTiming} />
              <TimeSlotTable title={t("panel_goals_conceded")} rows={stats.goalsAgainstTiming} />
              <TimeSlotTable title={t("panel_substitutions")} rows={stats.subsTiming} />
            </div>
          </div>

          <div className="panel">
            <h3>{t("panel_goals_by_category")}</h3>
            <div className="two-col">
              <CategoryList title={t("panel_goals_scored")} rows={stats.goalsForByCategory} />
              <CategoryList title={t("panel_goals_conceded")} rows={stats.goalsAgainstByCategory} />
            </div>
          </div>

        </>
      )}

    </div>
  );
}
