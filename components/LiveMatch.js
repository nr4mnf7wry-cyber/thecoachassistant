import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, Minus, Play, Pause, FileText } from "lucide-react";
import { useLang } from "../lib/i18n";
import {
  uid, Badge, formatDate, LIVE_ZONES, LIVE_TEAM_TAGS, LIVE_PLAYER_TAGS, LIVE_TAG_COLORS,
  newLiveSession, emptyLiveClock, currentLiveSeconds, formatLiveClock, computeLiveReport, GOAL_TYPE_GROUPS,
} from "../lib/shared";
import { CategoryList } from "./Concurrents";

const ZONE_LABEL_KEYS = Object.fromEntries(LIVE_ZONES.map((z) => [z, `zone_${z}`]));
const TAG_LABEL_KEYS = Object.fromEntries([...LIVE_TEAM_TAGS, ...LIVE_PLAYER_TAGS].map((tg) => [tg, `livetag_${tg}`]));

const ZONE_RECTS = {
  att_left: [0, 0, 100, 150], att_center: [100, 0, 100, 150], att_right: [200, 0, 100, 150],
  mid_left: [0, 150, 100, 150], mid_center: [100, 150, 100, 150], mid_right: [200, 150, 100, 150],
  def_left: [0, 300, 100, 150], def_center: [100, 300, 100, 150], def_right: [200, 300, 100, 150],
};

/* ---------------- terrain visuel (SVG, 9 zones) ---------------- */

export function LivePitch({ zone, onSelect }) {
  const { t } = useLang();
  const line = "#C3C9D3";
  return (
    <svg viewBox="0 0 300 450" className="live-pitch-svg">
      <rect x="0" y="0" width="300" height="450" fill="#FCFCFD" />
      <rect x="3" y="3" width="294" height="444" fill="none" stroke={line} strokeWidth="2" />
      <line x1="3" y1="225" x2="297" y2="225" stroke={line} strokeWidth="2" />
      <circle cx="150" cy="225" r="42" fill="none" stroke={line} strokeWidth="2" />
      <circle cx="150" cy="225" r="2.5" fill={line} />
      <rect x="65" y="3" width="170" height="55" fill="none" stroke={line} strokeWidth="2" />
      <rect x="112" y="3" width="76" height="22" fill="none" stroke={line} strokeWidth="2" />
      <rect x="65" y="392" width="170" height="55" fill="none" stroke={line} strokeWidth="2" />
      <rect x="112" y="425" width="76" height="22" fill="none" stroke={line} strokeWidth="2" />

      {Object.entries(ZONE_RECTS).map(([z, [x, y, w, h]]) => {
        const selected = zone === z;
        return (
          <g key={z} onClick={() => onSelect(z)} style={{ cursor: "pointer" }}>
            <rect
              x={x + 2} y={y + 2} width={w - 4} height={h - 4}
              fill={selected ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.015)"}
              stroke={selected ? "var(--gold)" : "rgba(15,23,42,0.10)"}
              strokeWidth={selected ? 2.5 : 1}
              rx="4"
            />
            <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="600" fill={selected ? "var(--gold)" : "#5B6472"}>
              {t(ZONE_LABEL_KEYS[z])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- coeur de capture réutilisable ---------------- */
// Utilisé à la fois par la page Live Match (scouting) et par l'onglet "Live" d'un de nos matchs.
export function LiveCaptureCore({
  title, ourLabel, theirLabel, ourRoster, theirRoster,
  scoreFor, scoreAgainst, onAdjustScore,
  clock, onClockPatch, events, onEventsChange,
  onGoalTagged, onGoalPlayerAttached, onGoalTypeSet, onEventRemoved,
  onShowReport, onBack, extraHeaderActions,
}) {
  const { t } = useLang();
  const [, forceTick] = useState(0);
  const [team, setTeam] = useState("own");
  const [zone, setZone] = useState(null);

  useEffect(() => {
    if (clock.clockStatus !== "running") return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [clock.clockStatus]);

  const seconds = currentLiveSeconds(clock);

  const addEvent = (tag) => {
    if (!zone) return;
    const newEvent = { id: uid(), atSeconds: seconds, zone, team, tag, player: "" };
    onEventsChange([...events, newEvent]);
    if (tag === "goal") {
      onAdjustScore(team, 1);
      onGoalTagged && onGoalTagged(team, newEvent);
    }
    setZone(null);
  };
  const attachPlayer = (eventId, playerName) => {
    const previous = events.find((e) => e.id === eventId)?.player || "";
    const nextEvents = events.map((e) => (e.id === eventId ? { ...e, player: e.player === playerName ? "" : playerName } : e));
    onEventsChange(nextEvents);
    const updated = nextEvents.find((e) => e.id === eventId);
    onGoalPlayerAttached && onGoalPlayerAttached(updated, previous);
  };
  const setGoalType = (eventId, category) => {
    const nextEvents = events.map((e) => (e.id === eventId ? { ...e, goalType: e.goalType === category ? "" : category } : e));
    onEventsChange(nextEvents);
    const updated = nextEvents.find((e) => e.id === eventId);
    onGoalTypeSet && onGoalTypeSet(updated);
  };
  const removeEvent = (id) => {
    const ev = events.find((e) => e.id === id);
    onEventsChange(events.filter((e) => e.id !== id));
    if (ev && ev.tag === "goal") onAdjustScore(ev.team, -1);
    onEventRemoved && onEventRemoved(ev);
  };

  const startMatch = () => onClockPatch({ clockStatus: "running", clockHalf: 1, clockElapsedBeforePause: 0, clockRunningSince: Date.now() });
  const pauseClock = () => onClockPatch({ clockStatus: "paused", clockElapsedBeforePause: currentLiveSeconds(clock), clockRunningSince: null });
  const resumeClock = () => onClockPatch({ clockStatus: "running", clockRunningSince: Date.now() });
  const goToHalftime = () => { onClockPatch({ clockStatus: "halftime", clockElapsedBeforePause: currentLiveSeconds(clock), clockRunningSince: null }); onShowReport(); };
  const resumeSecondHalf = () => onClockPatch({ clockStatus: "running", clockHalf: 2, clockRunningSince: Date.now() });
  const endMatch = () => { onClockPatch({ clockStatus: "ended", clockElapsedBeforePause: currentLiveSeconds(clock), clockRunningSince: null }); onShowReport(); };

  const lastEvent = events[events.length - 1];
  const lastEventRoster = lastEvent && (lastEvent.team === "own" ? ourRoster : theirRoster);

  return (
    <div>
      <div className="panel" style={{ position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            {title && <h3 style={{ margin: 0 }}>{title}</h3>}
            <p className="mono" style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: clock.clockStatus === "running" ? "var(--gold)" : "var(--chalk-dim)" }}>
              {formatLiveClock(seconds)} {clock.clockHalf === 2 && <span style={{ fontSize: 11 }}>· {t("live_second_half")}</span>}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div className="muted" style={{ fontSize: 11 }}>{ourLabel}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="icon-btn" onClick={() => onAdjustScore("own", -1)}><Minus size={12} /></button>
                <span className="mono" style={{ fontSize: 18, minWidth: 20, textAlign: "center" }}>{scoreFor}</span>
                <button className="icon-btn" onClick={() => onAdjustScore("own", 1)}><Plus size={12} /></button>
              </div>
            </div>
            <span className="muted">–</span>
            <div style={{ textAlign: "center" }}>
              <div className="muted" style={{ fontSize: 11 }}>{theirLabel}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className="icon-btn" onClick={() => onAdjustScore("against", -1)}><Minus size={12} /></button>
                <span className="mono" style={{ fontSize: 18, minWidth: 20, textAlign: "center" }}>{scoreAgainst}</span>
                <button className="icon-btn" onClick={() => onAdjustScore("against", 1)}><Plus size={12} /></button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {clock.clockStatus === "not_started" && (
            <button className="btn-gold" onClick={startMatch}><Play size={14} /> {t("live_start_match")}</button>
          )}
          {clock.clockStatus === "running" && (
            <>
              <button className="icon-btn" onClick={pauseClock}><Pause size={14} /> {t("live_pause")}</button>
              <button className="icon-btn" onClick={goToHalftime}>{t("live_go_halftime")}</button>
              <button className="icon-btn" onClick={endMatch}>{t("live_end_session")}</button>
            </>
          )}
          {clock.clockStatus === "paused" && (
            <>
              <button className="btn-gold" onClick={resumeClock}><Play size={14} /> {t("live_resume")}</button>
              <button className="icon-btn" onClick={endMatch}>{t("live_end_session")}</button>
            </>
          )}
          {clock.clockStatus === "halftime" && (
            <>
              <button className="btn-gold" onClick={resumeSecondHalf}><Play size={14} /> {t("live_resume_second_half")}</button>
              <button className="icon-btn" onClick={endMatch}>{t("live_end_session")}</button>
            </>
          )}
          {clock.clockStatus === "ended" && (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t("live_ended_note")}</p>
          )}
          <button className="icon-btn" onClick={onShowReport}><FileText size={14} /> {t("live_view_report")}</button>
          {extraHeaderActions}
          {onBack && <button className="icon-btn" onClick={onBack}>{t("matchdetail_back")}</button>}
        </div>
      </div>

      {lastEvent && lastEvent.tag === "goal" && (
        <div className="panel live-goal-prompt">
          <h3 style={{ color: "var(--gold)", marginBottom: 4 }}>⚽ {t("live_goal_prompt_title")} — {lastEvent.team === "own" ? ourLabel : theirLabel}</h3>
          <p className="muted mono" style={{ fontSize: 11, textTransform: "uppercase", margin: "12px 0 8px" }}>{t("live_attach_player")}</p>
          <div className="chip-grid">
            {(lastEvent.team === "own" ? ourRoster : theirRoster).map((p) => (
              <button key={p.id} className={"player-chip" + (lastEvent.player === p.name ? " selected" : "")} onClick={() => attachPlayer(lastEvent.id, p.name)}>
                {p.number && <Badge number={p.number} size={20} />} {p.name}
              </button>
            ))}
            {(lastEvent.team === "own" ? ourRoster : theirRoster).length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>{t("live_no_roster")}</p>}
          </div>
          <p className="muted mono" style={{ fontSize: 11, textTransform: "uppercase", margin: "16px 0 8px" }}>{t("live_goal_type")}</p>
          <div className="chip-grid">
            {Object.keys(GOAL_TYPE_GROUPS).map((cat) => (
              <button key={cat} className={"player-chip" + (lastEvent.goalType === cat ? " selected" : "")} onClick={() => setGoalType(lastEvent.id, cat)}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="live-team-toggle">
          <button className={"live-team-btn" + (team === "own" ? " active" : "")} onClick={() => setTeam("own")}>{ourLabel}</button>
          <button className={"live-team-btn" + (team === "against" ? " active" : "")} onClick={() => setTeam("against")}>{theirLabel}</button>
        </div>

        <p className="muted mono" style={{ fontSize: 11, textTransform: "uppercase", margin: "16px 0 8px" }}>{t("live_zone_prompt")}</p>
        <div className="live-pitch-wrap">
          <LivePitch zone={zone} onSelect={setZone} />
        </div>

        <p className="muted mono" style={{ fontSize: 11, textTransform: "uppercase", margin: "16px 0 8px" }}>{t("live_tag_prompt")}</p>
        {!zone && <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{t("live_zone_first")}</p>}

        <p className="live-tag-group-label">{t("live_team_facts")}</p>
        <div className="live-tag-grid">
          {LIVE_TEAM_TAGS.map((tg) => (
            <button key={tg} className="live-tag-btn" style={{ borderColor: LIVE_TAG_COLORS[tg] }} disabled={!zone} onClick={() => addEvent(tg)}>
              {t(TAG_LABEL_KEYS[tg])}
            </button>
          ))}
        </div>

        <p className="live-tag-group-label" style={{ marginTop: 14 }}>{t("live_player_facts")}</p>
        <div className="live-tag-grid">
          {LIVE_PLAYER_TAGS.map((tg) => (
            <button key={tg} className="live-tag-btn" style={{ borderColor: LIVE_TAG_COLORS[tg] }} disabled={!zone} onClick={() => addEvent(tg)}>
              {t(TAG_LABEL_KEYS[tg])}
            </button>
          ))}
        </div>
      </div>

      {lastEvent && lastEvent.tag !== "goal" && (
        <div className="panel">
          <p className="muted mono" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>{t("live_attach_player")}</p>
          <div className="chip-grid">
            {lastEventRoster.map((p) => (
              <button key={p.id} className={"player-chip" + (lastEvent.player === p.name ? " selected" : "")} onClick={() => attachPlayer(lastEvent.id, p.name)}>
                {p.number && <Badge number={p.number} size={20} />} {p.name}
              </button>
            ))}
            {lastEventRoster.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>{t("live_no_roster")}</p>}
          </div>
        </div>
      )}

      <div className="panel" style={{ overflowX: "auto" }}>
        <h3>{t("live_feed_title")}</h3>
        {events.length === 0 && <p className="muted">{t("live_feed_none")}</p>}
        {[...events].reverse().map((e) => (
          <div key={e.id} className="match-row">
            <span className="mono muted">{formatLiveClock(e.atSeconds || 0)}</span>
            <span className="status-chip" style={{ background: LIVE_TAG_COLORS[e.tag] }}>{t(TAG_LABEL_KEYS[e.tag])}</span>
            <span>{e.team === "own" ? ourLabel : theirLabel} · {t(ZONE_LABEL_KEYS[e.zone])}{e.goalType ? ` · ${e.goalType}` : ""}{e.player ? ` · ${e.player}` : ""}</span>
            <button className="icon-btn" onClick={() => removeEvent(e.id)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- rapport (mi-temps / fin de match) ---------------- */

export function LiveReport({ title, scoreFor, scoreAgainst, ourLabel, theirLabel, events, onBack }) {
  const { t } = useLang();
  const report = computeLiveReport({ events });

  return (
    <div>
      <button className="back-link" onClick={onBack}><ChevronLeft size={16} /> {t("live_back_to_capture")}</button>
      <div className="view-header">
        <h1>{t("live_report_title")}</h1>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>{title} · {scoreFor}-{scoreAgainst} · {report.total} {t("live_events_count")}</p>

      <div className="two-col">
        <div className="panel">
          <h3>{t("live_report_zones")} — {ourLabel}</h3>
          {report.topZonesOwn.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
          {report.topZonesOwn.map((r) => (
            <div key={r.zone} className="leaderboard-row"><span style={{ flex: 1 }}>{t(ZONE_LABEL_KEYS[r.zone])}</span><span className="mono">{r.count}</span></div>
          ))}
        </div>
        <div className="panel">
          <h3>{t("live_report_zones")} — {theirLabel}</h3>
          {report.topZonesAgainst.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
          {report.topZonesAgainst.map((r) => (
            <div key={r.zone} className="leaderboard-row"><span style={{ flex: 1 }}>{t(ZONE_LABEL_KEYS[r.zone])}</span><span className="mono">{r.count}</span></div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>{t("live_report_best")}</h3>
          {report.bestPlayers.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
          {report.bestPlayers.map((p, i) => (
            <div key={i} className="leaderboard-row">
              <span style={{ flex: 1 }}>{p.player} <span className="muted" style={{ fontSize: 11 }}>({p.team === "own" ? ourLabel : theirLabel})</span></span>
              <span className="mono" style={{ color: "var(--gold)" }}>+{p.score}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>{t("live_report_weak")}</h3>
          {report.weakPlayers.length === 0 && <p className="muted">{t("no_data_yet")}</p>}
          {report.weakPlayers.map((p, i) => (
            <div key={i} className="leaderboard-row">
              <span style={{ flex: 1 }}>{p.player} <span className="muted" style={{ fontSize: 11 }}>({p.team === "own" ? ourLabel : theirLabel})</span></span>
              <span className="mono" style={{ color: "var(--red)" }}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>

      {(report.goalsByCategoryOwn.length > 0 || report.goalsByCategoryAgainst.length > 0) && (
        <div className="two-col">
          <div className="panel"><CategoryList title={`${t("panel_goals_by_category")} — ${ourLabel}`} rows={report.goalsByCategoryOwn.map((r) => ({ cat: r.cat, count: r.count, pct: r.pct }))} /></div>
          <div className="panel"><CategoryList title={`${t("panel_goals_by_category")} — ${theirLabel}`} rows={report.goalsByCategoryAgainst.map((r) => ({ cat: r.cat, count: r.count, pct: r.pct }))} /></div>
        </div>
      )}

      <div className="panel">
        <h3>{t("live_report_summary")}</h3>
        {Object.keys(report.tagCounts).length === 0 && <p className="muted">{t("no_data_yet")}</p>}
        {[...LIVE_TEAM_TAGS, ...LIVE_PLAYER_TAGS].filter((tg) => report.tagCounts[tg]).map((tg) => (
          <div key={tg} className="leaderboard-row">
            <span className="status-chip" style={{ background: LIVE_TAG_COLORS[tg] }}>{t(TAG_LABEL_KEYS[tg])}</span>
            <span className="mono" style={{ marginLeft: "auto" }}>{report.tagCounts[tg]}</span>
          </div>
        ))}
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <h3>{t("live_feed_title")}</h3>
        {events.length === 0 && <p className="muted">{t("live_feed_none")}</p>}
        {[...events].reverse().map((e) => (
          <div key={e.id} className="match-row">
            <span className="mono muted">{formatLiveClock(e.atSeconds || 0)}</span>
            <span className="status-chip" style={{ background: LIVE_TAG_COLORS[e.tag] }}>{t(TAG_LABEL_KEYS[e.tag])}</span>
            <span>{e.team === "own" ? ourLabel : theirLabel} · {t(ZONE_LABEL_KEYS[e.zone])}{e.goalType ? ` · ${e.goalType}` : ""}{e.player ? ` · ${e.player}` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- création de session (scouting) ---------------- */

function NewSessionForm({ onCreate, onCancel }) {
  const { t } = useLang();
  const [ourTeam, setOurTeam] = useState("");
  const [opponentTeam, setOpponentTeam] = useState("");

  const create = () => {
    if (!ourTeam.trim() || !opponentTeam.trim()) return;
    onCreate(newLiveSession({
      contextType: "scout",
      opponentTeam: opponentTeam.trim(), ourTeam: ourTeam.trim(),
      label: `${ourTeam.trim()} vs ${opponentTeam.trim()}`,
    }));
  };

  return (
    <div className="panel">
      <h3>{t("live_new_session")}</h3>
      <div className="form-grid" style={{ marginBottom: 14 }}>
        <label>{t("live_team_a")}<input value={ourTeam} onChange={(e) => setOurTeam(e.target.value)} /></label>
        <label>{t("live_team_b")}<input value={opponentTeam} onChange={(e) => setOpponentTeam(e.target.value)} /></label>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-gold" onClick={create}>{t("live_start")}</button>
        <button className="icon-btn" onClick={onCancel}>{t("common_cancel")}</button>
      </div>
    </div>
  );
}

/* ---------------- page Live Match (scouting) ---------------- */

export function LiveMatch({ liveSessions, setLiveSessions, opponentProfiles }) {
  const { t } = useLang();
  const [activeId, setActiveId] = useState(null);
  const [subView, setSubView] = useState("capture");
  const [showNew, setShowNew] = useState(false);

  const active = liveSessions.find((s) => s.id === activeId);
  const patch = (fields) => setLiveSessions(liveSessions.map((s) => (s.id === activeId ? { ...s, ...fields } : s)));
  const createSession = (session) => { setLiveSessions([...liveSessions, session]); setActiveId(session.id); setSubView("capture"); setShowNew(false); };
  const removeSession = (id) => { if (confirm(t("confirm_delete_live_session"))) setLiveSessions(liveSessions.filter((s) => s.id !== id)); };

  const rosterFor = (teamName) => {
    const profile = (opponentProfiles || []).find((p) => p.teamName === teamName);
    return (profile?.appearances || []).filter((a) => a.team === "main").map((a) => ({ id: a.id, name: a.player, number: a.number }));
  };

  if (active) {
    const ourLabel = active.ourTeam || t("live_team_a");
    const theirLabel = active.opponentTeam || t("live_team_b");
    if (subView === "report") {
      return (
        <LiveReport
          title={active.label} scoreFor={active.scoreFor} scoreAgainst={active.scoreAgainst}
          ourLabel={ourLabel} theirLabel={theirLabel} events={active.events || []}
          onBack={() => setSubView("capture")}
        />
      );
    }
    return (
      <div>
        <LiveCaptureCore
          title={active.label}
          ourLabel={ourLabel} theirLabel={theirLabel}
          ourRoster={rosterFor(active.ourTeam)} theirRoster={rosterFor(active.opponentTeam)}
          scoreFor={active.scoreFor} scoreAgainst={active.scoreAgainst}
          onAdjustScore={(side, delta) => {
            const field = side === "own" ? "scoreFor" : "scoreAgainst";
            patch({ [field]: Math.max(0, (Number(active[field]) || 0) + delta) });
          }}
          clock={active} onClockPatch={patch}
          events={active.events || []} onEventsChange={(events) => patch({ events })}
          onShowReport={() => setSubView("report")}
          onBack={() => setActiveId(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="view-header">
        <h1>{t("nav_live")}</h1>
        <button className="btn-gold" onClick={() => setShowNew(true)}><Plus size={16} /> {t("live_new_session")}</button>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>{t("live_help_scout")}</p>

      {showNew && <NewSessionForm onCreate={createSession} onCancel={() => setShowNew(false)} />}

      {liveSessions.length === 0 && !showNew && <p className="muted">{t("live_sessions_none")}</p>}
      {liveSessions.length > 0 && (
        <div className="panel" style={{ padding: 0 }}>
          {[...liveSessions].sort((a, b) => (a.date < b.date ? 1 : -1)).map((s) => (
            <div key={s.id} className="match-list-row" style={{ gridTemplateColumns: "100px 1fr 100px 32px" }}>
              <span className="mono muted" style={{ cursor: "pointer" }} onClick={() => setActiveId(s.id)}>{formatDate(s.date)}</span>
              <span style={{ cursor: "pointer" }} onClick={() => setActiveId(s.id)}>{s.label} <span className="muted" style={{ fontSize: 11 }}>({(s.events || []).length} {t("live_events_count")})</span></span>
              <span className="mono" style={{ cursor: "pointer" }} onClick={() => setActiveId(s.id)}>{s.scoreFor}-{s.scoreAgainst}</span>
              <button className="icon-btn" onClick={() => removeSession(s.id)}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
