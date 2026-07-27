import { useMemo } from "react";
import { CalendarDays, AlertTriangle, UserX, Clock, Dumbbell } from "lucide-react";
import { useLang } from "../lib/i18n";
import {
  Badge, aggregateMatches, isPlayerUnavailable, todayStr, formatDate, isMatchPlayed,
  computeACWR,
} from "../lib/shared";

const ZONE_COLORS = { low: "var(--chalk-dim)", optimal: "var(--gold)", watch: "var(--yellow)", high: "var(--red)" };
const ZONE_KEYS = { low: "zone_low", optimal: "zone_optimal", watch: "zone_watch", high: "zone_high" };

function resultOf(m) {
  const f = Number(m.scoreFor), a = Number(m.scoreAgainst);
  if (m.scoreFor === "" || m.scoreAgainst === "" || isNaN(f) || isNaN(a)) return null;
  if (f > a) return "W";
  if (f < a) return "L";
  return "D";
}

function daysSince(dateStr) {
  return Math.round((new Date() - new Date(dateStr)) / 86400000);
}

export function Dashboard({ players, matches, trainings, availabilities, setView }) {
  const { t } = useLang();
  const today = todayStr();
  const playedMatches = useMemo(() => matches.filter((m) => isMatchPlayed(m)), [matches]);

  const workload = useMemo(() => computeACWR(players, trainings, today).filter((w) => w.ratio !== null).sort((a, b) => b.ratio - a.ratio), [players, trainings, today]);

  const agg = useMemo(() => aggregateMatches(players, playedMatches), [players, playedMatches]);

  const nextMatch = [...matches].filter((m) => m.date >= today).sort((a, b) => (a.date > b.date ? 1 : -1))[0] || null;

  const unavailableNow = useMemo(() => {
    return (availabilities || [])
      .filter((a) => today >= a.startDate && today <= (a.endDate || a.startDate))
      .map((a) => ({ ...a, player: players.find((p) => p.id === a.playerId) }))
      .filter((a) => a.player);
  }, [availabilities, players, today]);

  const upcomingEvents = useMemo(() => {
    const inWindow = (d) => d >= today;
    const trainingEvents = (trainings || []).filter((tr) => inWindow(tr.date)).map((tr) => ({ id: "t-" + tr.id, type: "training", date: tr.date, label: tr.objective || t("entr_detail_default_title"), raw: tr }));
    const matchEvents = (matches || []).filter((m) => inWindow(m.date)).map((m) => ({ id: "m-" + m.id, type: "match", date: m.date, label: `${t("nav_matchs")} vs ${m.opponent}`, raw: m }));
    return [...trainingEvents, ...matchEvents].sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [trainings, matches, today, t]);

  const form = useMemo(() => {
    return [...playedMatches].filter((m) => resultOf(m)).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5).reverse();
  }, [playedMatches]);

  const alerts = useMemo(() => {
    const list = [];
    const sortedDesc = [...playedMatches].filter((m) => resultOf(m)).sort((a, b) => (a.date < b.date ? 1 : -1));
    let streak = 0;
    for (const m of sortedDesc) {
      if (resultOf(m) === "W") break;
      streak++;
    }
    if (streak >= 3) list.push({ icon: AlertTriangle, text: `${streak} ${t("alert_no_win_streak")}` });

    (availabilities || []).forEach((a) => {
      if ((a.status === "Absent" || a.status === "Blessé") && today >= a.startDate && today <= (a.endDate || a.startDate)) {
        const days = daysSince(a.startDate);
        if (days >= 14) {
          const p = players.find((x) => x.id === a.playerId);
          if (p) list.push({ icon: UserX, text: `${p.name} ${t("alert_player_absent")} ${days} ${t("days_short")}` });
        }
      }
    });

    agg.forEach((a) => {
      if (a.matchesPresent >= 3) {
        const matchesWithPlayer = playedMatches.filter((m) => m.squad?.includes(a.player.id));
        const totalDuration = matchesWithPlayer.reduce((s, m) => s + (Number(m.duration) || 90), 0);
        if (totalDuration > 0 && a.minutes >= totalDuration) {
          list.push({ icon: Clock, text: `${a.player.name} ${t("alert_full_minutes")}` });
        }
      }
    });

    return list;
  }, [playedMatches, availabilities, agg, players, today, t]);

  return (
    <div>
      <div className="pitch-hero">
        <svg className="pitch-lines" viewBox="0 0 400 120" preserveAspectRatio="none">
          <defs>
            <pattern id="analystGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--pitch-line)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="120" fill="url(#analystGrid)" />
          <path d="M8 2 L2 2 2 8" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6" />
          <path d="M392 2 L398 2 398 8" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6" />
          <path d="M8 118 L2 118 2 112" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6" />
          <path d="M392 118 L398 118 398 112" fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.6" />
        </svg>
        <div className="pitch-hero-content">
          <div className="eyebrow">{t("dash_eyebrow")}</div>
          <h1>{t("dash_title")}</h1>
          <p>{playedMatches.length} {playedMatches.length > 1 ? t("word_matches") : t("word_match")} · {trainings.length} {trainings.length > 1 ? t("word_sessions") : t("word_session")} · {players.length} {players.length > 1 ? t("word_players") : t("word_player")}</p>
        </div>
      </div>

      <div className="panel">
        <h3>{t("panel_upcoming_events")}</h3>
        {upcomingEvents.length === 0 && <p className="muted">{t("no_upcoming_events")}</p>}
        {upcomingEvents.length > 0 && (
          <div className="timeline-scroll">
            <div className="timeline-track">
              <div className="timeline-line" />
              {upcomingEvents.map((ev) => {
                const availableCount = ev.type === "training"
                  ? players.filter((p) => (ev.raw.attendance?.[p.id]?.present ?? true)).length
                  : players.filter((p) => !isPlayerUnavailable(availabilities, p.id, ev.date)).length;
                const Icon = ev.type === "match" ? CalendarDays : Dumbbell;
                const short = `${ev.date.slice(8, 10)}/${ev.date.slice(5, 7)}`;
                return (
                  <div key={ev.id} className="timeline-node">
                    <div className="timeline-count">{availableCount}/{players.length}</div>
                    <div className="timeline-dot" style={{ background: ev.type === "match" ? "var(--red)" : "var(--gold)" }}>
                      <Icon size={11} />
                    </div>
                    <div className="timeline-date mono">{short}</div>
                    <div className="timeline-label muted">{ev.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {unavailableNow.length > 0 && (
        <div className="panel" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <p className="muted mono" style={{ fontSize: 11, textTransform: "uppercase", marginBottom: 8 }}>{t("panel_unavailable_now")}</p>
          <div className="chip-grid">
            {unavailableNow.map((a) => (
              <span key={a.id} className="unavail-chip" title={t(`avail_${a.status}`)}>
                {a.player.name} <span className="muted">· {t(`avail_${a.status}`)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <h3>{t("panel_next_match")}</h3>
          {!nextMatch && <p className="muted">{t("no_next_match")}</p>}
          {nextMatch && (
            <div className="match-row" style={{ cursor: setView ? "pointer" : "default" }} onClick={() => setView && setView("match:" + nextMatch.id)}>
              <span className="mono muted">{formatDate(nextMatch.date)}</span>
              <span>vs {nextMatch.opponent}</span>
              <span className="muted">{nextMatch.homeAway === "domicile" ? t("home") : t("away")}</span>
            </div>
          )}
          <h3 style={{ marginTop: 18 }}>{t("panel_form")}</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {form.length === 0 && <p className="muted">{t("no_matches_yet")}</p>}
            {form.map((m) => {
              const r = resultOf(m);
              const label = r === "W" ? t("result_w") : r === "D" ? t("result_d") : t("result_l");
              const color = r === "W" ? "var(--gold)" : r === "D" ? "var(--chalk-dim)" : "var(--red)";
              return <span key={m.id} className="status-chip" style={{ background: color }} title={m.opponent}>{label}</span>;
            })}
          </div>
        </div>
        <div className="panel">
          <h3>{t("panel_alerts")}</h3>
          {alerts.length === 0 && <p className="muted">{t("no_alerts")}</p>}
          {alerts.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="match-row">
                <Icon size={16} style={{ color: "var(--yellow)", flexShrink: 0 }} />
                <span>{a.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <h3>{t("panel_workload_risk")}</h3>
        {workload.length === 0 && <p className="muted">{t("no_workload_data")}</p>}
        {workload.slice(0, 8).map((w, i) => (
          <div key={w.player.id} className="rank-card">
            <span className="rank-card-number">{i + 1}</span>
            <Badge number={w.player.number} size={34} />
            <div className="rank-card-info">
              <div className="rank-card-name">{w.player.name}</div>
              <div className="rank-card-sub mono">{t("ratio_label")} {w.ratio}</div>
            </div>
            <span className="status-chip" style={{ background: ZONE_COLORS[w.zone] }}>{t(ZONE_KEYS[w.zone])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
