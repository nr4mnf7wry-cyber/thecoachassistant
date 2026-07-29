import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, UserCog, CalendarDays, BarChart3,
  ShieldHalf, ClipboardCheck, UserCheck, LineChart, Plus, Pencil, Settings, Trophy, Layers, HeartPulse, Radio, LogOut,
  ChevronLeft, ChevronRight, Sun, Moon,
} from "lucide-react";
import { useLang } from "../lib/i18n";
import { useTeamData, Modal, DEFAULT_SEASON, todayStr, isMatchPlayed, isTrainingPlayed } from "../lib/shared";
import { Dashboard } from "../components/Dashboard";
import { Effectif } from "../components/effectif/EffectifList";
import { FicheJoueur } from "../components/effectif/FicheJoueur";
import { LiveMatch } from "../components/LiveMatch";
import { Injuries } from "../components/Injuries";
import { Staff } from "../components/Staff";
import { Disponibilites } from "../components/Disponibilites";
import { Entrainements, EntrainementDetail } from "../components/Entrainements";
import { Matchs } from "../components/matchs/MatchsList";
import { MatchDetail } from "../components/matchs/MatchDetail";
import { Statistiques } from "../components/Statistiques";
import { Analyses } from "../components/Analyses";
import { Concurrents } from "../components/Concurrents";
import { CompetitionList, CompetitionMatchDetail } from "../components/Competition";
import { OpponentProfile } from "../components/OpponentProfile";
import { GlobalSearch } from "../components/GlobalSearch";
import { Reglages } from "../components/Reglages";

function buildNavGroups(t) {
  return [
    {
      label: t("nav_group_team"),
      color: "#2563EB",
      items: [
        { id: "dashboard", label: t("nav_dashboard"), icon: LayoutDashboard },
        { id: "effectif", label: t("nav_effectif"), icon: Users, detailPrefix: "joueur:" },
        { id: "injuries", label: t("nav_injuries"), icon: HeartPulse },
        { id: "staff", label: t("nav_staff"), icon: UserCog },
      ],
    },
    {
      label: t("nav_group_planning"),
      color: "#0F766E",
      items: [
        { id: "disponibilites", label: t("nav_disponibilites"), icon: UserCheck },
        { id: "entrainements", label: t("nav_entrainements"), icon: ClipboardCheck, detailPrefix: "entrainements:" },
        { id: "matchs", label: t("nav_matchs"), icon: CalendarDays, detailPrefix: "match:" },
        { id: "live", label: t("nav_live"), icon: Radio },
      ],
    },
    {
      label: t("nav_group_performance"),
      color: "#7C3AED",
      items: [
        { id: "stats", label: t("nav_stats"), icon: BarChart3 },
        { id: "analyses", label: t("nav_analyses"), icon: LineChart },
      ],
    },
    {
      label: t("nav_group_league"),
      color: "#C2410C",
      items: [
        { id: "competition", label: t("nav_competition"), icon: Layers, detailPrefix: "competition:" },
        { id: "competitors", label: t("nav_competitors"), icon: Trophy, detailPrefix: "competitors:" },
      ],
    },
    {
      label: t("nav_settings"),
      items: [
        { id: "reglages", label: t("nav_settings"), icon: Settings },
      ],
    },
  ];
}

function pageTitle(view, t) {
  const groups = buildNavGroups(t);
  for (const g of groups) {
    for (const it of g.items) {
      if (view === it.id || (it.detailPrefix && view.startsWith(it.detailPrefix))) return it.label;
    }
  }
  return "";
}

function suggestNextSeason(season) {
  const m = /^(\d{4})-(\d{4})$/.exec(season || "");
  if (!m) return "";
  return `${parseInt(m[1], 10) + 1}-${parseInt(m[2], 10) + 1}`;
}

function NewSeasonModal({ suggestion, onCreate, onClose }) {
  const { t } = useLang();
  const [label, setLabel] = useState(suggestion);
  return (
    <Modal title={t("season_new_title")} onClose={onClose}>
      <div className="form-grid">
        <label>{t("season_label")}<input value={label} onChange={(e) => setLabel(e.target.value)} /></label>
      </div>
      <button className="btn-gold" onClick={() => { if (label.trim()) onCreate(label.trim()); }}>{t("season_create")}</button>
    </Modal>
  );
}

function Sidebar({ view, setView, teamName, setTeamName, seasons, currentSeason, setCurrentSeason, onCreateSeason, currentUser, collapsed, toggleCollapsed }) {
  const { t, lang, setLang } = useLang();
  const NAV_GROUPS = buildNavGroups(t);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(teamName);
  const [showNewSeason, setShowNewSeason] = useState(false);
  useEffect(() => { setNameDraft(teamName); }, [teamName]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <nav className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <button className="sidebar-collapse-btn" onClick={toggleCollapsed} data-label={collapsed ? t("sidebar_expand") : t("sidebar_collapse")}>
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
      <div className="brand">
        <div className="brand-mark"><ShieldHalf size={22} /></div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <input
                className="brand-name-input" autoFocus value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => { setTeamName(nameDraft.trim() || teamName); setEditingName(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
              />
            ) : (
              <div className="brand-title" onClick={() => setEditingName(true)} title={t("edit_team_name_hint")}>
                {teamName} <Pencil size={11} style={{ opacity: 0.5 }} />
              </div>
            )}
            <div className="season-row">
              <select value={currentSeason} onChange={(e) => setCurrentSeason(e.target.value)}>
                {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="season-add-btn" onClick={() => setShowNewSeason(true)} title={t("season_new")}><Plus size={12} /></button>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="lang-switch">
          <button className={"lang-btn" + (lang === "fr" ? " active" : "")} onClick={() => setLang("fr")}>FR</button>
          <button className={"lang-btn" + (lang === "nl" ? " active" : "")} onClick={() => setLang("nl")}>NL</button>
        </div>
      )}

      <div className="nav-list">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 6 }}>
            {!collapsed && (
              <div className="nav-group-label">
                {group.color && <span className="nav-group-dot" style={{ background: group.color }} />}
                {group.label}
              </div>
            )}
            {group.items.map((it) => {
              const Icon = it.icon;
              const active = view === it.id || (it.detailPrefix && view.startsWith(it.detailPrefix));
              return (
                <button
                  key={it.id} className={"nav-item" + (active ? " active" : "")} onClick={() => setView(it.id)}
                  data-label={collapsed ? it.label : undefined}
                  style={active && group.color ? { borderLeft: `2px solid ${group.color}` } : undefined}
                >
                  <Icon size={18} />{!collapsed && <span>{it.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {currentUser && (
        <div className="account-block">
          {!collapsed && (
            <div className="account-info">
              <div className="account-name">{currentUser.username}</div>
              <div className="account-role">{t(currentUser.role === "head" ? "role_head" : "role_assistant")}</div>
            </div>
          )}
          <button className="icon-btn" onClick={logout} data-label={collapsed ? t("nav_logout") : undefined}><LogOut size={14} /></button>
        </div>
      )}

      {showNewSeason && (
        <NewSeasonModal
          suggestion={suggestNextSeason(currentSeason)}
          onCreate={(label) => { onCreateSeason(label); setShowNewSeason(false); }}
          onClose={() => setShowNewSeason(false)}
        />
      )}
    </nav>
  );
}

export default function App() {
  const teamData = useTeamData();
  const {
    players, staff, matches, trainings, evaluations, availabilities,
    exerciseLibrary, bodyMetrics, leagueMatches, opponentProfiles,
    injuries, developmentGoals, liveSessions, teamName, seasons, currentSeason,
    loaded, saveState, loadError, retryLoad,
  } = teamData;

  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => { if (localStorage.getItem("dark_mode") === "1") setDarkMode(true); }, []);
  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("dark_mode", next ? "1" : "0");
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => { if (localStorage.getItem("sidebar_collapsed") === "1") setSidebarCollapsed(true); }, []);
  const toggleSidebarCollapsed = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar_collapsed", next ? "1" : "0");
  };
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated) setCurrentUser(data.user);
      } catch (e) {
        console.error(e);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const isReadOnly = currentUser?.role === "assistant";
  const noop = () => {};
  const setPlayers = isReadOnly ? noop : teamData.setPlayers;
  const setStaff = isReadOnly ? noop : teamData.setStaff;
  const setMatches = isReadOnly ? noop : teamData.setMatches;
  const setTrainings = isReadOnly ? noop : teamData.setTrainings;
  const setEvaluations = isReadOnly ? noop : teamData.setEvaluations;
  const setAvailabilities = isReadOnly ? noop : teamData.setAvailabilities;
  const setExerciseLibrary = isReadOnly ? noop : teamData.setExerciseLibrary;
  const setBodyMetrics = isReadOnly ? noop : teamData.setBodyMetrics;
  const setLeagueMatches = isReadOnly ? noop : teamData.setLeagueMatches;
  const setOpponentProfiles = isReadOnly ? noop : teamData.setOpponentProfiles;
  const setInjuries = isReadOnly ? noop : teamData.setInjuries;
  const setDevelopmentGoals = isReadOnly ? noop : teamData.setDevelopmentGoals;
  const setLiveSessions = isReadOnly ? noop : teamData.setLiveSessions;
  const setTeamName = isReadOnly ? noop : teamData.setTeamName;
  const setSeasons = isReadOnly ? noop : teamData.setSeasons;
  const setCurrentSeason = isReadOnly ? noop : teamData.setCurrentSeason;

  const { t } = useLang();
  const [view, setView] = useState("dashboard");

  const today = todayStr();
  const seasonMatches = matches.filter((m) => (m.season || DEFAULT_SEASON) === currentSeason);
  const seasonTrainings = trainings.filter((tr) => (tr.season || DEFAULT_SEASON) === currentSeason);
  const playedSeasonMatches = seasonMatches.filter((m) => isMatchPlayed(m));
  const playedSeasonTrainings = seasonTrainings.filter((tr) => isTrainingPlayed(tr, today));

  const handleCreateSeason = (label) => {
    if (!seasons.includes(label)) setSeasons([...seasons, label]);
    setCurrentSeason(label);
    setView("dashboard");
  };

  let content = null;
  if (view === "dashboard") content = <Dashboard players={players} matches={seasonMatches} trainings={seasonTrainings} availabilities={availabilities} setView={setView} />;
  else if (view === "effectif") content = (
    <Effectif
      players={players} setPlayers={setPlayers}
      matches={playedSeasonMatches} trainings={playedSeasonTrainings}
      evaluations={evaluations} setEvaluations={setEvaluations}
      availabilities={availabilities} setAvailabilities={setAvailabilities}
      bodyMetrics={bodyMetrics} setBodyMetrics={setBodyMetrics}
      allMatches={matches} setMatches={setMatches}
      allTrainings={trainings} setTrainings={setTrainings}
      setView={setView}
    />
  );
  else if (view.startsWith("joueur:")) content = (
    <FicheJoueur
      playerId={view.split(":")[1]} players={players} setPlayers={setPlayers}
      matches={playedSeasonMatches} trainings={playedSeasonTrainings} evaluations={evaluations} setEvaluations={setEvaluations}
      bodyMetrics={bodyMetrics} setBodyMetrics={setBodyMetrics}
      developmentGoals={developmentGoals} setDevelopmentGoals={setDevelopmentGoals}
      setView={setView}
    />
  );
  else if (view === "staff") content = <Staff staff={staff} setStaff={setStaff} />;
  else if (view === "injuries") content = <Injuries players={players} injuries={injuries} setInjuries={setInjuries} availabilities={availabilities} setAvailabilities={setAvailabilities} />;
  else if (view === "live") content = <LiveMatch liveSessions={liveSessions} setLiveSessions={setLiveSessions} opponentProfiles={opponentProfiles} />;
  else if (view === "stats") content = <Statistiques players={players} matches={playedSeasonMatches} trainings={playedSeasonTrainings} evaluations={evaluations} />;
  else if (view === "analyses") content = <Analyses players={players} matches={playedSeasonMatches} trainings={playedSeasonTrainings} />;
  else if (view === "competitors" || view.startsWith("competitors:")) content = <Concurrents leagueMatches={leagueMatches} opponentProfiles={opponentProfiles} initialTeam={view.startsWith("competitors:") ? view.slice("competitors:".length) : ""} setView={setView} />;
  else if (view === "competition") content = <CompetitionList leagueMatches={leagueMatches} setLeagueMatches={setLeagueMatches} setView={setView} />;
  else if (view.startsWith("competition:")) content = <CompetitionMatchDetail matchId={view.split(":")[1]} leagueMatches={leagueMatches} setLeagueMatches={setLeagueMatches} setView={setView} />;
  else if (view.startsWith("opponent:")) content = <OpponentProfile teamName={view.slice("opponent:".length)} opponentProfiles={opponentProfiles} setOpponentProfiles={setOpponentProfiles} setView={setView} />;
  else if (view === "disponibilites") content = <Disponibilites players={players} availabilities={availabilities} setAvailabilities={setAvailabilities} matches={seasonMatches} trainings={seasonTrainings} />;
  else if (view === "entrainements") content = <Entrainements players={players} trainings={trainings} setTrainings={setTrainings} availabilities={availabilities} currentSeason={currentSeason} setView={setView} />;
  else if (view.startsWith("entrainements:")) content = (
    <EntrainementDetail
      trainingId={view.split(":")[1]} players={players} trainings={trainings} setTrainings={setTrainings}
      exerciseLibrary={exerciseLibrary} setExerciseLibrary={setExerciseLibrary} availabilities={availabilities} setView={setView}
    />
  );
  else if (view === "matchs") content = <Matchs matches={matches} setMatches={setMatches} currentSeason={currentSeason} setView={setView} />;
  else if (view.startsWith("match:")) content = <MatchDetail matchId={view.split(":")[1]} players={players} matches={matches} setMatches={setMatches} availabilities={availabilities} leagueMatches={leagueMatches} opponentProfiles={opponentProfiles} setOpponentProfiles={setOpponentProfiles} setView={setView} />;
  else if (view === "reglages") content = (
    <Reglages
      teamName={teamName}
      currentUser={currentUser}
      data={{ players, staff, matches, trainings, evaluations, availabilities, exerciseLibrary, bodyMetrics, leagueMatches, opponentProfiles, injuries, developmentGoals, liveSessions, teamName, seasons, currentSeason }}
      setters={{
        setPlayers, setStaff, setMatches, setTrainings, setEvaluations, setAvailabilities,
        setExerciseLibrary, setBodyMetrics, setLeagueMatches, setOpponentProfiles,
        setInjuries, setDevelopmentGoals, setLiveSessions, setTeamName, setSeasons, setCurrentSeason,
      }}
    />
  );

  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F6F8", fontFamily: "sans-serif", padding: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E2E5EA", borderRadius: 12, padding: 32, maxWidth: 420, textAlign: "center" }}>
          <h2 style={{ color: "#14171F", margin: "0 0 10px" }}>{t("load_error_title")}</h2>
          <p style={{ color: "#667085", fontSize: 14, margin: "0 0 20px" }}>{t("load_error_help")}</p>
          <button className="btn-gold" style={{ margin: "0 auto" }} onClick={retryLoad}>{t("load_error_retry")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={"app-root" + (darkMode ? " dark" : "")}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .app-root { --pitch-dark:#F5F6F8; --pitch-mid:#FFFFFF; --pitch-line:#E2E5EA; --chalk:#14171F; --chalk-dim:#667085; --gold:#2563EB; --gold-rgb:37,99,235; --red:#DC2626; --red-rgb:220,38,38; --yellow:#B45309; --yellow-rgb:180,83,7; --on-accent:#FFFFFF; --hover-tint:color-mix(in srgb, var(--chalk) 4.5%, transparent);
          font-family:'Inter',sans-serif; background:var(--pitch-dark); color:var(--chalk); min-height:100vh; display:flex; }
        .app-root.dark { --pitch-dark:#14171C; --pitch-mid:#1C2028; --pitch-line:rgba(255,255,255,0.09); --chalk:#F2F3F5; --chalk-dim:#8B93A1; --gold:#4C8DFF; --gold-rgb:76,141,255; --red:#EF4444; --red-rgb:239,68,68; --yellow:#F59E0B; --yellow-rgb:245,158,11; --on-accent:#0A0E14; --hover-tint:rgba(255,255,255,0.07); }
        .app-root * { box-sizing:border-box; }
        .sidebar { width:230px; flex-shrink:0; background:var(--pitch-mid); padding:24px 14px; border-right:1px solid var(--pitch-line); display:flex; flex-direction:column; gap:16px; position:relative; transition:width 0.15s ease; }
        .sidebar.collapsed { width:68px; padding:24px 10px; align-items:center; }
        .sidebar-collapse-btn { position:absolute; top:20px; right:-11px; width:22px; height:22px; border-radius:50%; background:var(--pitch-mid); border:1px solid var(--pitch-line); color:var(--chalk-dim); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:5; }
        .sidebar-collapse-btn:hover { color:var(--gold); border-color:var(--gold); }
        .sidebar.collapsed .brand { justify-content:center; }
        .sidebar.collapsed .nav-item { justify-content:center; padding:9px; }
        .sidebar.collapsed .nav-list > div { display:flex; flex-direction:column; align-items:center; }
        .sidebar.collapsed [data-label] { position:relative; }
        .sidebar.collapsed [data-label]:hover::after {
          content:attr(data-label); position:absolute; left:calc(100% + 10px); top:50%; transform:translateY(-50%);
          background:var(--chalk); color:var(--pitch-mid); font-size:12px; font-weight:600; padding:5px 10px; border-radius:6px;
          white-space:nowrap; z-index:20; pointer-events:none; box-shadow:0 2px 8px color-mix(in srgb, var(--chalk) 15%, transparent);
        }
        .brand { display:flex; align-items:center; gap:10px; padding:0 6px; }
        .brand-mark { width:36px; height:36px; border-radius:50%; background:var(--gold); color:var(--on-accent); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .brand-title { font-family:'Space Grotesk',sans-serif; font-size:15px; letter-spacing:0.01em; cursor:pointer; display:flex; align-items:center; gap:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .brand-name-input { font-family:'Space Grotesk',sans-serif; font-size:15px; background:color-mix(in srgb, var(--chalk) 6%, transparent); border:1px solid var(--gold); border-radius:4px; padding:2px 6px; color:var(--chalk); width:100%; }
        .brand-sub { font-size:11px; color:var(--chalk-dim); }
        .season-row { display:flex; align-items:center; gap:4px; margin-top:4px; }
        .season-row select { background:transparent; border:none; color:var(--chalk-dim); font-size:11px; font-family:'IBM Plex Mono',monospace; padding:0; cursor:pointer; }
        .season-add-btn { background:color-mix(in srgb, var(--chalk) 6%, transparent); border:1px solid var(--pitch-line); color:var(--chalk-dim); border-radius:4px; width:16px; height:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
        .season-add-btn:hover { color:var(--gold); border-color:var(--gold); }
        .lang-switch { display:flex; gap:6px; padding:0 6px; }
        .lang-btn { flex:1; padding:5px 0; border-radius:6px; border:1px solid var(--pitch-line); background:transparent; color:var(--chalk-dim); font-size:11px; font-weight:600; cursor:pointer; }
        .lang-btn.active { background:var(--gold); border-color:var(--gold); color:var(--on-accent); }
        .nav-list { display:flex; flex-direction:column; }
        .account-block { display:flex; align-items:center; gap:8px; padding:12px 14px; margin-top:auto; border-top:1px solid var(--pitch-line); }
        .account-info { flex:1; min-width:0; }
        .account-name { font-size:12.5px; font-weight:600; color:var(--chalk); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .account-role { font-size:11px; color:var(--chalk-dim); }
        .readonly-badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:6px; background:rgba(var(--yellow-rgb),0.1); border:1px solid rgba(var(--yellow-rgb),0.25); color:var(--yellow); font-size:11.5px; font-weight:600; }
        .nav-group-label { font-family:'IBM Plex Mono',monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; color:var(--chalk-dim); padding:8px 12px 4px; display:flex; align-items:center; gap:6px; }
        .nav-group-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:6px; background:transparent; border:none; border-left:2px solid transparent; color:var(--chalk-dim); font-family:'Inter',sans-serif; font-size:13.5px; cursor:pointer; text-align:left; width:100%; transition:background-color 0.12s ease, color 0.12s ease; }
        .nav-item:hover { background:var(--hover-tint); color:var(--chalk); }
        .nav-item.active { background:var(--hover-tint); color:var(--chalk); font-weight:600; }
        .main-col { flex:1; display:flex; flex-direction:column; min-width:0; }
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:14px 40px; border-bottom:1px solid var(--pitch-line); background:color-mix(in srgb, var(--chalk) 1.5%, transparent); gap:20px; }
        .topbar-title { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; letter-spacing:0.02em; color:var(--chalk-dim); flex-shrink:0; }
        .global-search { position:relative; flex:1; max-width:340px; display:flex; align-items:center; }
        .global-search-icon { position:absolute; left:10px; color:var(--chalk-dim); pointer-events:none; }
        .global-search-input { width:100%; background:color-mix(in srgb, var(--chalk) 5%, transparent); border:1px solid var(--pitch-line); border-radius:7px; padding:7px 10px 7px 32px; font-size:12.5px; font-family:'Inter',sans-serif; color:var(--chalk); }
        .global-search-input:focus { outline:none; border-color:var(--gold); box-shadow:0 0 0 3px rgba(var(--gold-rgb),0.18); }
        .search-dropdown { position:absolute; top:calc(100% + 6px); left:0; right:0; background:var(--pitch-mid); border:1px solid var(--pitch-line); border-radius:8px; box-shadow:0 8px 24px color-mix(in srgb, var(--chalk) 12%, transparent); z-index:50; max-height:320px; overflow-y:auto; }
        .search-result { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; padding:9px 12px; background:transparent; border:none; border-bottom:1px solid var(--pitch-line); color:var(--chalk); font-size:13px; text-align:left; cursor:pointer; }
        .search-result:last-child { border-bottom:none; }
        .search-result:hover { background:rgba(var(--gold-rgb),0.08); }
        .main { flex:1; padding:32px 40px; max-width:1080px; transition:max-width 0.15s ease; }
        .sidebar-is-collapsed .main { max-width:1400px; }
        .save-status { text-align:right; font-size:11px; display:flex; align-items:center; gap:6px; }
        .save-dot { width:6px; height:6px; border-radius:50%; background:var(--gold); display:inline-block; }
        h1 { font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:600; letter-spacing:-0.01em; margin:0; }
        h3 { font-family:'Space Grotesk',sans-serif; font-size:12.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--chalk-dim); margin:0 0 14px; }
        .eyebrow { font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--gold); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
        .muted { color:var(--chalk-dim); font-size:13.5px; }
        .mono { font-family:'IBM Plex Mono',monospace; }
        .view-header { display:flex; align-items:center; justify-content:space-between; margin:8px 0 22px; gap:12px; flex-wrap:wrap; }
        .pitch-hero { position:relative; background:var(--pitch-mid); border-radius:12px; padding:28px 30px; margin-bottom:24px; overflow:hidden; border:1px solid var(--pitch-line); }
        .pitch-lines { position:absolute; inset:0; width:100%; height:100%; opacity:0.9; }
        .pitch-hero-content { position:relative; }
        .pitch-hero-content p { color:var(--chalk-dim); font-size:13.5px; margin:6px 0 0; }
        .metric-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-bottom:24px; }
        .metric-card { background:var(--pitch-mid); border:1px solid var(--pitch-line); border-radius:10px; padding:16px; display:flex; align-items:flex-start; gap:12px; box-shadow:0 1px 2px color-mix(in srgb, var(--chalk) 5%, transparent); }
        .metric-icon { color:var(--gold); margin-top:0; background:rgba(var(--gold-rgb),0.12); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .metric-value { font-family:'Space Grotesk',sans-serif; font-size:18px; font-weight:600; }
        .metric-label { font-size:11.5px; color:var(--chalk-dim); text-transform:uppercase; letter-spacing:0.03em; margin-top:2px; }
        .panel { background:var(--pitch-mid); border:1px solid var(--pitch-line); border-radius:10px; padding:20px; margin-bottom:20px; box-shadow:0 1px 2px color-mix(in srgb, var(--chalk) 4%, transparent); }
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .match-row { display:flex; align-items:center; gap:12px; padding:9px 0; border-bottom:1px solid var(--pitch-line); font-size:13.5px; }
        .match-row:last-child { border-bottom:none; }
        .match-row span:nth-child(2) { flex:1; }
        .match-list-row { display:grid; grid-template-columns:100px 1fr 100px 120px 80px; align-items:center; gap:12px; padding:13px 20px; border-bottom:1px solid var(--pitch-line); font-size:13.5px; cursor:pointer; }
        .match-list-row:hover { background:color-mix(in srgb, var(--chalk) 4%, transparent); }
        .match-list-row:last-child { border-bottom:none; }
        .badge-number { border-radius:50%; background:var(--gold); color:var(--on-accent); display:flex; align-items:center; justify-content:center; font-family:'Space Grotesk',sans-serif; font-weight:600; flex-shrink:0; }
        .badge-avatar { background:var(--chalk-dim); }
        .btn-gold { display:inline-flex; align-items:center; gap:6px; background:var(--gold); color:var(--on-accent); border:none; padding:9px 16px; border-radius:7px; font-family:'Inter',sans-serif; font-weight:600; font-size:13px; cursor:pointer; white-space:nowrap; transition:filter 0.12s ease, transform 0.05s ease; }
        .btn-gold:hover { filter:brightness(1.12); }
        .btn-gold:active { transform:translateY(1px); }
        .icon-btn { background:transparent; border:1px solid var(--pitch-line); color:var(--chalk-dim); border-radius:7px; padding:6px 10px; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:12.5px; transition:background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease; }
        .icon-btn:hover { color:var(--chalk); border-color:var(--chalk-dim); background:var(--hover-tint); }
        .back-link { display:inline-flex; align-items:center; gap:4px; background:none; border:none; color:var(--chalk-dim); font-size:13px; cursor:pointer; margin-bottom:14px; padding:0; }
        .back-link:hover { color:var(--chalk); }
        .position-columns { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:16px; align-items:start; }
        .position-column { background:var(--pitch-mid); border:1px solid var(--pitch-line); border-radius:10px; padding:14px; }
        .position-column-header { font-family:'Space Grotesk',sans-serif; font-size:12.5px; text-transform:uppercase; letter-spacing:0.03em; color:var(--chalk); margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--pitch-line); }
        .player-row-card { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 0; }
        .player-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
        .player-card { background:var(--pitch-mid); border:1px solid var(--pitch-line); border-radius:10px; padding:14px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .player-card-main { display:flex; align-items:center; gap:12px; cursor:pointer; flex:1; }
        .player-name { font-weight:600; font-size:14px; white-space:nowrap; }
        .effectif-table th:first-child, .effectif-table td:first-child { min-width:200px; white-space:nowrap; }
        .table-group-row td { background:color-mix(in srgb, var(--chalk) 3%, transparent); font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:var(--chalk-dim); padding:7px 10px; }
        .table-group-row-muted td { background:rgba(var(--red-rgb),0.05); color:var(--red); }
        .hover-reveal { opacity:0; transition:opacity 0.12s ease; }
        .hover-reveal-row:hover .hover-reveal { opacity:1; }
        .icon-btn.active { background:rgba(var(--gold-rgb),0.1); border-color:var(--gold); color:var(--gold); }
        .player-card-actions { display:flex; gap:6px; }
        .stats-table { width:100%; border-collapse:collapse; font-size:13px; }
        .stats-table th { text-align:left; color:var(--chalk-dim); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; padding:9px 8px; border-bottom:1px solid var(--pitch-line); white-space:nowrap; }
        .stats-table td { padding:9px 8px; border-bottom:1px solid var(--pitch-line); }
        .stats-table tbody tr { transition:background-color 0.1s ease; }
        .stats-table tbody tr:nth-child(even) { background:color-mix(in srgb, var(--chalk) 1.5%, transparent); }
        .stats-table tbody tr:hover { background:rgba(var(--gold-rgb),0.06); }
        .entry-table th:first-child, .entry-table td:first-child { min-width:150px; }
        .cell-input { width:56px; background:color-mix(in srgb, var(--chalk) 5%, transparent); border:1px solid var(--pitch-line); color:var(--chalk); border-radius:4px; padding:4px 6px; font-family:'IBM Plex Mono',monospace; font-size:12px; }
        .cell-input:disabled { opacity:0.3; }
        .sortable-th { cursor:pointer; user-select:none; }
        .sortable-th .sort-arrow { margin-left:4px; }
        .sortable-th:hover { color:var(--chalk); }
        .leaderboard-row { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--pitch-line); font-size:13.5px; }
        .leaderboard-row:last-child { border-bottom:none; }
        .rank { width:16px; color:var(--gold); font-family:'IBM Plex Mono',monospace; font-size:12px; }

        .rank-card { display:flex; align-items:center; gap:12px; padding:10px 8px; border-radius:10px; transition:background 0.12s ease; max-width:420px; }
        .rank-card-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:0 24px; }
        .rank-card-grid .rank-card { max-width:none; }
        .rank-card:hover { background:rgba(var(--gold-rgb),0.05); }
        .rank-card + .rank-card { margin-top:2px; }
        .rank-card-number { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:600; color:var(--chalk-dim); background:color-mix(in srgb, var(--chalk) 5%, transparent); flex-shrink:0; }
        .rank-card:nth-child(1) .rank-card-number { background:var(--gold); color:var(--on-accent); }
        .rank-card-info { flex:1; min-width:0; }
        .rank-card-name { font-weight:600; color:var(--chalk); font-size:13.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rank-card-sub { color:var(--chalk-dim); font-size:11.5px; margin-top:1px; }
        .rank-card-value { font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:15px; color:var(--chalk); flex-shrink:0; }

        .empty-state { display:flex; flex-direction:column; align-items:center; text-align:center; padding:36px 20px; }
        .empty-state-icon { width:48px; height:48px; border-radius:50%; background:color-mix(in srgb, var(--chalk) 4%, transparent); color:var(--chalk-dim); display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
        .empty-state-title { font-weight:600; color:var(--chalk); font-size:14.5px; margin:0 0 4px; }
        .empty-state-help { color:var(--chalk-dim); font-size:13px; margin:0; max-width:340px; }

        .skeleton { background:linear-gradient(90deg, color-mix(in srgb, var(--chalk) 5%, transparent) 25%, color-mix(in srgb, var(--chalk) 9%, transparent) 37%, color-mix(in srgb, var(--chalk) 5%, transparent) 63%); background-size:400% 100%; animation:skeleton-pulse 1.4s ease infinite; border-radius:6px; }
        @keyframes skeleton-pulse { 0% { background-position:100% 50%; } 100% { background-position:0% 50%; } }
        .skeleton-line { height:14px; margin-bottom:8px; }
        .skeleton-card { height:76px; border-radius:10px; margin-bottom:12px; }

        .sortable-th .sort-arrow { display:inline-block; width:12px; text-align:center; color:var(--gold); font-size:10px; }
        .sortable-th .sort-arrow.inactive { color:var(--pitch-line); }

        .trend-up { color:#0F6E56; }
        .trend-down { color:var(--red); }
        .trend-pill { display:inline-flex; align-items:center; gap:2px; font-size:11.5px; font-weight:600; }
        .live-feed-icon { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .exercise-cat-icon { width:28px; height:28px; border-radius:8px; background:rgba(var(--gold-rgb),0.1); color:var(--gold); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .journee-header { display:flex; align-items:center; gap:10px; padding:14px 20px; cursor:pointer; background:color-mix(in srgb, var(--chalk) 2%, transparent); border-bottom:1px solid var(--pitch-line); color:var(--chalk-dim); }
        .journee-header:hover { background:color-mix(in srgb, var(--chalk) 3.5%, transparent); }
        .journee-header h3 { color:var(--chalk); }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
        .cal-grid-head { margin-bottom:4px; }
        .cal-weekday { text-align:center; font-size:11px; font-weight:600; color:var(--chalk-dim); text-transform:uppercase; padding:4px 0; }
        .cal-cell { min-height:56px; border:1px solid var(--pitch-line); border-radius:8px; padding:6px; }
        .cal-cell-empty { border:none; }
        .cal-cell-today { border-color:var(--gold); border-width:2px; }
        .cal-day-num { font-size:12px; font-weight:600; color:var(--chalk); }
        .cal-dots { display:flex; flex-wrap:wrap; gap:3px; margin-top:6px; }
        .cal-dot { width:7px; height:7px; border-radius:50%; }
        .cal-dot-more { font-size:9.5px; color:var(--chalk-dim); font-family:'IBM Plex Mono',monospace; }
        .player-identity-card { border-top:3px solid var(--gold); }
        .player-identity-stats { display:flex; gap:28px; margin-top:18px; padding-top:16px; border-top:1px solid var(--pitch-line); }
        .player-identity-stat { display:flex; flex-direction:column; }
        .player-identity-stat-value { font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:20px; color:var(--chalk); }
        .player-identity-stat-label { font-size:11.5px; color:var(--chalk-dim); }
        .dash-greeting { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
        .dash-grid-top { display:grid; grid-template-columns:2fr 1fr; gap:32px; margin-bottom:24px; }
        .dash-next-title { font-size:19px; font-weight:600; color:var(--chalk); }
        .dash-stat-value { font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:22px; color:var(--chalk); }
        .dash-plain { padding:0; }
        .dash-alerts-card.has-alerts { border-left:2px solid var(--red); padding-left:14px; }
        .dash-alerts-count { display:flex; align-items:center; gap:8px; font-weight:600; font-size:15px; color:var(--red); }
        .dash-alerts-card p { color:var(--chalk); }
        .dash-metrics-row { display:flex; gap:28px; flex-wrap:wrap; margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--pitch-line); }
        .dash-metrics-num { font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:17px; color:var(--chalk); }
        .dash-grid-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:14px; }
        .effectif-composition-line { color:var(--chalk-dim); font-size:13.5px; margin:0 0 20px; display:flex; gap:18px; flex-wrap:wrap; }
        .effectif-composition-line strong { color:var(--chalk); font-family:'IBM Plex Mono',monospace; }
        .flat-cols { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:24px; }
        .recurring-badge { display:inline-flex; align-items:center; gap:5px; color:var(--gold); font-size:12px; }
        .flat-cols-divided { gap:0; }
        .flat-cols-divided > *:not(:last-child) { padding-right:32px; }
        .flat-cols-divided > *:last-child { border-left:1px solid var(--pitch-line); padding-left:32px; }
        @media (max-width:720px) { .flat-cols { grid-template-columns:1fr; gap:20px; } .flat-cols-divided > *:last-child { border-left:none; padding-left:0; } .flat-cols-divided > *:not(:last-child) { padding-right:0; } }
        .panel-sections { padding:0; }
        .panel-section { padding:18px 20px; }
        .panel-section + .panel-section { border-top:1px solid var(--pitch-line); }
        .panel-section h3 { margin-top:0; }
        .panel-sections-v { display:grid; grid-template-columns:1fr 1fr; }
        .panel-sections-v .panel-section + .panel-section { border-top:none; border-left:1px solid var(--pitch-line); }
        @media (max-width:720px) { .panel-sections-v { grid-template-columns:1fr; } .panel-sections-v .panel-section + .panel-section { border-left:none; border-top:1px solid var(--pitch-line); } }
        .tactical-pitch-wrap { display:flex; justify-content:center; }
        .tactical-pitch-svg { width:100%; max-width:320px; height:auto; border-radius:10px; border:1px solid var(--pitch-line); box-shadow:0 2px 8px color-mix(in srgb, var(--chalk) 6%, transparent); }
        .chip-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .position-group { margin-bottom: 14px; }
        .position-group-label { font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--gold); margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid var(--pitch-line); }
        .player-chip { display:flex; align-items:center; gap:8px; background:color-mix(in srgb, var(--chalk) 5%, transparent); border:1px solid var(--pitch-line); color:var(--chalk-dim); border-radius:6px; padding:5px 12px 5px 5px; font-size:13px; cursor:pointer; }
        .player-chip.selected { background:var(--gold); border-color:var(--gold); color:var(--on-accent); font-weight:600; }
        .player-chip .badge-number { background:rgba(0,0,0,0.15); color:inherit; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; }
        .modal-box { background:var(--pitch-mid); border:1px solid var(--pitch-line); border-radius:10px; padding:22px; width:380px; max-width:90vw; max-height:85vh; overflow-y:auto; }
        .modal-wide { width:560px; }
        .modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
        .modal-header h3 { margin:0; }
        .form-grid { display:flex; flex-direction:column; gap:12px; margin-bottom:18px; }
        .form-grid label { display:flex; flex-direction:column; gap:5px; font-size:12.5px; color:var(--chalk-dim); }
        .form-grid input, .form-grid select { background:color-mix(in srgb, var(--chalk) 6%, transparent); border:1px solid var(--pitch-line); color:var(--chalk); border-radius:6px; padding:8px 10px; font-family:'Inter',sans-serif; font-size:13.5px; transition:border-color 0.12s ease; }
        .date-field { display:flex; align-items:center; gap:4px; }
        .date-field input { width:44px; text-align:center; background:color-mix(in srgb, var(--chalk) 6%, transparent); border:1px solid var(--pitch-line); color:var(--chalk); border-radius:6px; padding:8px 4px; font-family:'IBM Plex Mono',monospace; font-size:13.5px; }
        .date-field input:nth-child(5) { width:60px; }
        .date-field input:focus { outline:none; border-color:var(--gold); box-shadow:0 0 0 3px rgba(var(--gold-rgb),0.18); }
        .date-field-sep { color:var(--chalk-dim); }
        .form-grid input:focus, .form-grid select:focus, .cell-input:focus, .filter-row select:focus { outline:none; border-color:var(--gold); box-shadow:0 0 0 3px rgba(var(--gold-rgb),0.18); }
        .bulk-textarea { width:100%; background:color-mix(in srgb, var(--chalk) 6%, transparent); border:1px solid var(--pitch-line); color:var(--chalk); border-radius:6px; padding:10px; font-family:'IBM Plex Mono',monospace; font-size:13px; resize:vertical; }
        .tab-bar { display:flex; gap:6px; margin-bottom:20px; border-bottom:1px solid var(--pitch-line); }
        .tab-btn { padding:9px 16px; background:transparent; border:none; color:var(--chalk-dim); font-family:'Space Grotesk',sans-serif; font-size:12.5px; text-transform:uppercase; letter-spacing:0.03em; cursor:pointer; border-bottom:2px solid transparent; }
        .tab-btn.active { color:var(--gold); border-bottom-color:var(--gold); }
        .pitch-board { background:repeating-linear-gradient(0deg, color-mix(in srgb, var(--chalk) 1.5%, transparent) 0px, color-mix(in srgb, var(--chalk) 1.5%, transparent) 1px, transparent 1px, transparent 24px); border:1px dashed var(--pitch-line); border-radius:10px; padding:16px; display:flex; flex-direction:column-reverse; gap:10px; }

        .live-team-toggle { display:flex; gap:10px; }
        .live-team-btn { flex:1; padding:16px; border-radius:10px; border:1px solid var(--pitch-line); background:color-mix(in srgb, var(--chalk) 4%, transparent); color:var(--chalk-dim); font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.12s ease; }
        .live-team-btn.active { background:rgba(var(--gold-rgb),0.15); border-color:var(--gold); color:var(--chalk); }
        .live-pitch-wrap { display:flex; justify-content:center; }
        .live-pitch-svg { width:100%; max-width:340px; height:auto; border-radius:10px; border:1px solid var(--pitch-line); box-shadow:0 2px 8px color-mix(in srgb, var(--chalk) 8%, transparent); }
        .live-tag-group-label { font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:var(--gold); margin-bottom:8px; }
        .live-tag-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; }
        .live-tag-btn { padding:14px 10px; border-radius:8px; border:2px solid var(--pitch-line); background:color-mix(in srgb, var(--chalk) 3%, transparent); color:var(--chalk); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.12s ease; }
        .live-tag-btn:hover:not(:disabled) { background:color-mix(in srgb, var(--chalk) 7%, transparent); }
        .live-tag-btn:disabled { opacity:0.35; cursor:not-allowed; }
        .live-goal-prompt { border:2px solid var(--gold); background:rgba(var(--gold-rgb),0.04); }
        .pitch-row { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; padding:8px 0; }
        .pitch-chip { display:flex; align-items:center; gap:6px; background:color-mix(in srgb, var(--chalk) 6%, transparent); border:1px solid var(--pitch-line); color:var(--chalk); border-radius:6px; padding:5px 12px 5px 5px; font-size:12.5px; cursor:pointer; position:relative; }
        .pitch-chip:hover { border-color:var(--gold); }
        .pitch-chip.empty { background:color-mix(in srgb, var(--chalk) 2%, transparent); border-style:dashed; padding:8px 14px; color:var(--chalk-dim); }
        .pitch-chip.selected { border-color:var(--gold); box-shadow:0 0 0 2px rgba(var(--gold-rgb),0.35); }
        .pitch-sub-tag { color:var(--red); font-size:11px; font-family:'IBM Plex Mono',monospace; }
        .timeline-scroll { overflow-x:auto; padding-bottom:4px; }
        .timeline-track { position:relative; display:flex; gap:28px; padding:8px 10px 4px; min-width:min-content; }
        .timeline-line { position:absolute; top:52px; left:16px; right:16px; height:2px; background:var(--pitch-line); }
        .timeline-node { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:6px; flex:0 0 auto; width:88px; }
        .timeline-count { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; color:var(--chalk); }
        .timeline-dot { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--on-accent); box-shadow:0 0 0 4px var(--pitch-mid); }
        .timeline-date { font-size:11px; color:var(--chalk-dim); }
        .timeline-label { font-size:11px; text-align:center; max-width:88px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .status-chip { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11.5px; font-weight:600; color:var(--on-accent); }
        .unavail-chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:6px; font-size:11.5px; background:rgba(var(--red-rgb),0.1); border:1px solid rgba(var(--red-rgb),0.25); color:var(--chalk); }
        .status-dot { display:inline-block; width:14px; height:14px; border-radius:50%; }
        .eval-cat-label { font-family:'Space Grotesk',sans-serif; font-size:12px; text-transform:uppercase; letter-spacing:0.03em; color:var(--gold); margin-bottom:8px; }
        .eval-legend-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:5px; }
        .eval-skill-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; }
        .eval-skill-input { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--chalk-dim); }
        .eval-skill-input input { background:color-mix(in srgb, var(--chalk) 6%, transparent); border:1px solid var(--pitch-line); color:var(--chalk); border-radius:6px; padding:6px 8px; font-family:'IBM Plex Mono',monospace; font-size:13px; }
        @media (max-width:720px) {
          .app-root { flex-direction:column; }
          .sidebar { width:100%; padding:12px 16px; }
          .sidebar.collapsed { width:100%; padding:12px 16px; }
          .sidebar-collapse-btn { display:none; }
          .nav-list { flex-direction:row; flex-wrap:wrap; }
          .nav-group-label { width:100%; }
          .main { padding:20px; }
          .topbar { padding:12px 20px; flex-wrap:wrap; }
          .global-search { max-width:none; order:3; flex-basis:100%; }
          .two-col { grid-template-columns:1fr; }
          .dash-grid-top { grid-template-columns:1fr; }
          .dash-grid-metrics { grid-template-columns:1fr 1fr; }
          .match-list-row { grid-template-columns:1fr; gap:4px; }
        }
      `}</style>
      <Sidebar
        view={view} setView={setView}
        teamName={teamName} setTeamName={setTeamName}
        seasons={seasons} currentSeason={currentSeason} setCurrentSeason={setCurrentSeason}
        onCreateSeason={handleCreateSeason}
        currentUser={currentUser}
        collapsed={sidebarCollapsed} toggleCollapsed={toggleSidebarCollapsed}
      />
      <div className={"main-col" + (sidebarCollapsed ? " sidebar-is-collapsed" : "")}>
        <div className="topbar">
          <span className="topbar-title">{pageTitle(view, t)}</span>
          <GlobalSearch players={players} staff={staff} matches={matches} trainings={trainings} leagueMatches={leagueMatches} setView={setView} />
          {isReadOnly && <span className="readonly-badge">{t("readonly_badge")}</span>}
          <button className="icon-btn" onClick={toggleDarkMode} title={darkMode ? t("light_mode") : t("dark_mode")}>
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <span className="save-status muted mono">
            {saveState === "saving" && t("save_status_saving")}
            {saveState === "error" && t("save_status_error")}
          </span>
        </div>
        <div className="main">
          {!loaded ? <p className="muted">…</p> : content}
        </div>
      </div>
    </div>
  );
}
