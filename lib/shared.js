import { useEffect, useState } from "react";
import { X } from "lucide-react";

/* ---------------- constants ---------------- */

export const PLAYER_STATUSES = ["titulaire", "invite"];
export const PLAYER_STATUS_KEYS = { "titulaire": "player_status_titulaire", "invite": "player_status_invite" };

export const POSITIONS = ["Gardien", "Défenseur", "Milieu", "Attaquant"];

export const BODY_PARTS = ["Cheville", "Genou", "Cuisse", "Mollet", "Ischio-jambiers", "Hanche/Aine", "Dos", "Épaule", "Bras/Main", "Tête/Visage", "Autre"];
export const INJURY_TYPES = ["Entorse", "Déchirure/Élongation", "Contusion", "Fracture", "Tendinite", "Commotion", "Autre"];
export const INJURY_SEVERITIES = ["Légère", "Modérée", "Sévère"];
export const BODY_PART_KEYS = {
  "Cheville": "bodypart_cheville", "Genou": "bodypart_genou", "Cuisse": "bodypart_cuisse", "Mollet": "bodypart_mollet",
  "Ischio-jambiers": "bodypart_ischio", "Hanche/Aine": "bodypart_hanche", "Dos": "bodypart_dos", "Épaule": "bodypart_epaule",
  "Bras/Main": "bodypart_bras", "Tête/Visage": "bodypart_tete", "Autre": "bodypart_autre",
};
export const INJURY_TYPE_KEYS = {
  "Entorse": "injurytype_entorse", "Déchirure/Élongation": "injurytype_dechirure", "Contusion": "injurytype_contusion",
  "Fracture": "injurytype_fracture", "Tendinite": "injurytype_tendinite", "Commotion": "injurytype_commotion", "Autre": "injurytype_autre",
};
export const INJURY_SEVERITY_KEYS = { "Légère": "severity_legere", "Modérée": "severity_moderee", "Sévère": "severity_severe" };
export const GOAL_STATUSES = ["ongoing", "achieved", "abandoned"];

export const LIVE_ZONES = [
  "def_left", "def_center", "def_right",
  "mid_left", "mid_center", "mid_right",
  "att_left", "att_center", "att_right",
];
export const LIVE_TEAM_TAGS = ["goal", "danger", "turnover", "recovery", "error"];
export const LIVE_PLAYER_TAGS = ["duel_won", "duel_lost", "strength", "weakness", "yellow_card", "red_card"];
export const LIVE_TAGS = [...LIVE_TEAM_TAGS, ...LIVE_PLAYER_TAGS];
export const LIVE_TAG_COLORS = {
  goal: "var(--gold)", danger: "var(--yellow)", turnover: "var(--red)", recovery: "var(--gold)",
  error: "var(--red)", duel_won: "var(--gold)", duel_lost: "var(--red)",
  strength: "var(--gold)", weakness: "var(--red)", yellow_card: "var(--yellow)", red_card: "var(--red)",
};

export function emptyLiveClock() {
  return { clockStatus: "not_started", clockHalf: 1, clockElapsedBeforePause: 0, clockRunningSince: null, events: [] };
}

export function newLiveSession(fields) {
  return {
    id: uid(), date: todayStr(), contextType: "own", label: "",
    ourTeam: "", opponentTeam: "", scoreFor: 0, scoreAgainst: 0,
    clockStatus: "not_started", clockHalf: 1, clockElapsedBeforePause: 0, clockRunningSince: null,
    events: [],
    ...fields,
  };
}

// Temps de jeu écoulé (en secondes), en tenant compte des pauses/mi-temps.
export function currentLiveSeconds(session) {
  const base = session.clockElapsedBeforePause || 0;
  if (session.clockRunningSince) {
    return base + Math.max(0, Math.floor((Date.now() - session.clockRunningSince) / 1000));
  }
  return base;
}

export function formatLiveClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Analyse d'une session live : zones dangereuses, joueurs qui ressortent en bien/en mal, cartons, buts.
export function computeLiveReport(session) {
  const events = session.events || [];
  const byTeamZone = { own: {}, against: {} };
  events.forEach((e) => {
    if (e.tag === "danger" || e.tag === "goal") {
      byTeamZone[e.team][e.zone] = (byTeamZone[e.team][e.zone] || 0) + 1;
    }
  });
  const topZones = (team) => Object.entries(byTeamZone[team] || {}).map(([zone, count]) => ({ zone, count })).sort((a, b) => b.count - a.count).slice(0, 3);

  const playerStats = {};
  events.forEach((e) => {
    if (!e.player) return;
    const key = e.team + "|" + e.player;
    playerStats[key] = playerStats[key] || { player: e.player, team: e.team, strength: 0, weakness: 0, duelWon: 0, duelLost: 0 };
    if (e.tag === "strength") playerStats[key].strength++;
    if (e.tag === "weakness") playerStats[key].weakness++;
    if (e.tag === "duel_won") playerStats[key].duelWon++;
    if (e.tag === "duel_lost") playerStats[key].duelLost++;
  });
  const playerList = Object.values(playerStats).map((p) => ({ ...p, score: p.strength + p.duelWon - p.weakness - p.duelLost }));
  const bestPlayers = [...playerList].filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  const weakPlayers = [...playerList].filter((p) => p.score < 0).sort((a, b) => a.score - b.score).slice(0, 5);

  const tagCounts = {};
  events.forEach((e) => { tagCounts[e.tag] = (tagCounts[e.tag] || 0) + 1; });

  const goalsWithType = events.filter((e) => e.tag === "goal" && e.goalType);
  const goalsByCategoryOwn = byCategory(goalsWithType.filter((e) => e.team === "own").map((e) => ({ type: e.goalType })));
  const goalsByCategoryAgainst = byCategory(goalsWithType.filter((e) => e.team === "against").map((e) => ({ type: e.goalType })));

  return {
    topZonesOwn: topZones("own"), topZonesAgainst: topZones("against"),
    bestPlayers, weakPlayers, tagCounts,
    goalsByCategoryOwn, goalsByCategoryAgainst,
    cardEvents: events.filter((e) => e.tag === "yellow_card" || e.tag === "red_card"),
    goalEvents: events.filter((e) => e.tag === "goal"),
    total: events.length,
  };
}

export const POSITION_KEYS = { "Gardien": "pos_Gardien", "Défenseur": "pos_Défenseur", "Milieu": "pos_Milieu", "Attaquant": "pos_Attaquant" };
export const STRONG_FOOT = ["Gauche", "Droit", "Ambidextre"];
export const FOOT_KEYS = { "Gauche": "foot_Gauche", "Droit": "foot_Droit", "Ambidextre": "foot_Ambidextre" };
export const AVAILABILITY_STATUSES = ["Disponible", "Absent", "Blessé", "Suspendu", "Vacances", "Travail", "Autre"];
export const UNAVAILABILITY_STATUSES = AVAILABILITY_STATUSES.filter((s) => s !== "Disponible");
export const AVAILABILITY_KEYS = {
  "Disponible": "avail_Disponible", "Absent": "avail_Absent", "Blessé": "avail_Blessé",
  "Suspendu": "avail_Suspendu", "Vacances": "avail_Vacances", "Travail": "avail_Travail", "Autre": "avail_Autre",
};
export const EXERCISE_CATEGORIES = ["Technique", "Physique", "Tactique", "Transitions", "Finition"];
export const EXERCISE_CATEGORY_KEYS = {
  "Technique": "cat_Technique", "Physique": "cat_Physique", "Tactique": "cat_Tactique",
  "Transitions": "cat_Transitions", "Finition": "cat_Finition",
};

export const EVAL_CATEGORIES = {
  Physique: ["vitesse", "acceleration", "endurance", "force"],
  Technique: ["controle", "passe", "dribble", "frappe", "centre"],
  Defense: ["placement", "marquage", "tacle"],
  Mental: ["vision", "decision", "leadership", "concentration"],
};
export const EVAL_CATEGORIES_GK = {
  Physique: ["explosivite", "detente", "reflexes", "endurance"],
  Technique: ["jeu_pied", "relance", "controle"],
  Gardien: ["arrets", "plongeon", "sorties_aeriennes", "un_contre_un"],
  Mental: ["communication", "decision", "leadership", "concentration"],
};
export function evalCategoriesFor(position) {
  return position === "Gardien" ? EVAL_CATEGORIES_GK : EVAL_CATEGORIES;
}
export const EVAL_CATEGORY_KEYS = { Physique: "cat_Physique", Technique: "cat_Technique", Defense: "cat_Defense", Mental: "cat_Mental", Gardien: "cat_Gardien" };
export const EVAL_SKILL_KEYS = {
  vitesse: "skill_vitesse", acceleration: "skill_acceleration", endurance: "skill_endurance", force: "skill_force",
  controle: "skill_controle", passe: "skill_passe", dribble: "skill_dribble", frappe: "skill_frappe", centre: "skill_centre",
  placement: "skill_placement", marquage: "skill_marquage", tacle: "skill_tacle",
  vision: "skill_vision", decision: "skill_decision", leadership: "skill_leadership", concentration: "skill_concentration",
  explosivite: "skill_explosivite", detente: "skill_detente", reflexes: "skill_reflexes",
  jeu_pied: "skill_jeu_pied", relance: "skill_relance",
  arrets: "skill_arrets", plongeon: "skill_plongeon", sorties_aeriennes: "skill_sorties_aeriennes", un_contre_un: "skill_un_contre_un",
  communication: "skill_communication",
};
export const ALL_EVAL_SKILLS = [...new Set([...Object.values(EVAL_CATEGORIES).flat(), ...Object.values(EVAL_CATEGORIES_GK).flat()])];

export const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------- empty records ---------------- */

export const emptyMatchStat = () => ({
  buts: 0, passes: 0, jaune: 0, rouge: 0, minutes: 0, note: "", noteAssistants: {}, poste: "",
  tirs: 0, tirsCadres: 0, passesReussies: 0, passesCles: 0, centres: 0, dribbles: 0,
  ballonsRecuperes: 0, interceptions: 0, tacles: 0, duelsGagnes: 0, fautes: 0,
});

// La note finale d'un joueur mélange la note du principal et la moyenne des notes des adjoints,
// selon la pondération choisie par le principal (par défaut 50/50). Si un seul côté a noté,
// on garde simplement cette note-là plutôt que de forcer un mélange avec du vide.
export function computeBlendedNote(stat, weightHead = 0.5) {
  const headNote = stat?.note !== "" && stat?.note !== undefined && stat?.note !== null ? Number(stat.note) : null;
  const assistantValues = Object.values(stat?.noteAssistants || {}).filter((v) => v !== "" && v !== undefined && v !== null).map(Number);
  const assistantAvg = assistantValues.length ? assistantValues.reduce((a, b) => a + b, 0) / assistantValues.length : null;
  if (headNote !== null && assistantAvg !== null) {
    return Math.round((headNote * weightHead + assistantAvg * (1 - weightHead)) * 10) / 10;
  }
  if (headNote !== null) return headNote;
  if (assistantAvg !== null) return Math.round(assistantAvg * 10) / 10;
  return null;
}
export const emptyAttendance = () => ({ present: true, statut: "Présent", raison: "", rpe: "", vma: "", vo2max: "" });
export const emptyEvaluationScores = () => Object.fromEntries(ALL_EVAL_SKILLS.map((k) => [k, ""]));
export const emptyExercise = () => ({ id: uid(), name: "", description: "", category: EXERCISE_CATEGORIES[0], duration: "", rpe: "", players: "" });

/* ---------------- data hook ---------------- */

export function useTeamData() {
  const [players, setPlayers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [matches, setMatches] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [bodyMetrics, setBodyMetrics] = useState([]);
  const [leagueMatches, setLeagueMatches] = useState([]);
  const [opponentProfiles, setOpponentProfiles] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [developmentGoals, setDevelopmentGoals] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [teamName, setTeamName] = useState("Mon Équipe");
  const [seasons, setSeasons] = useState([DEFAULT_SEASON]);
  const [currentSeason, setCurrentSeason] = useState(DEFAULT_SEASON);
  const [noteWeightHead, setNoteWeightHead] = useState(0.5);
  const [testers, setTesters] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveState, setSaveState] = useState("idle");

  const loadData = () => {
    setLoadError(false);
    (async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        setPlayers(data.players || []);
        setStaff(data.staff || []);
        const sanitizeDate = (item) => (item.date ? { ...item, date: fixSwappedDate(normalizeDateValue(item.date)) } : item);
        setMatches((data.matches || []).map(sanitizeDate));
        setTrainings((data.trainings || []).map(sanitizeDate));
        setEvaluations(data.evaluations || []);
        setAvailabilities(data.availabilities || []);
        setExerciseLibrary(data.exerciseLibrary || []);
        setBodyMetrics(data.bodyMetrics || []);
        setLeagueMatches((data.leagueMatches || []).map(sanitizeDate));
        setOpponentProfiles(data.opponentProfiles || []);
        setInjuries((data.injuries || []).map(sanitizeDate));
        setDevelopmentGoals(data.developmentGoals || []);
        setLiveSessions(data.liveSessions || []);
        setTeamName(data.teamName || "Mon Équipe");
        setSeasons(data.seasons && data.seasons.length ? data.seasons : [DEFAULT_SEASON]);
        setCurrentSeason(data.currentSeason || DEFAULT_SEASON);
        setNoteWeightHead(typeof data.noteWeightHead === "number" ? data.noteWeightHead : 0.5);
        setTesters(data.testers || []);
        // Ne jamais activer la sauvegarde automatique tant que le chargement n'a pas réellement réussi :
        // c'est ce qui, en cas de panne du chargement, écraserait les vraies données par du vide.
        setLoaded(true);
      } catch (e) {
        console.error("Erreur de chargement", e);
        setLoadError(true);
      }
    })();
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const warnBeforeUnload = (e) => {
      if (saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [saveState]);

  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      (async () => {
        try {
          await fetch("/api/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              players, staff, matches, trainings, evaluations, availabilities, exerciseLibrary, bodyMetrics, leagueMatches, opponentProfiles,
              injuries, developmentGoals, liveSessions, teamName, seasons, currentSeason, noteWeightHead, testers,
            }),
          });
          setSaveState("saved");
        } catch (e) {
          console.error("Erreur de sauvegarde", e);
          setSaveState("error");
        }
      })();
    }, 500);
    return () => clearTimeout(t);
  }, [players, staff, matches, trainings, evaluations, availabilities, exerciseLibrary, bodyMetrics, leagueMatches, opponentProfiles, injuries, developmentGoals, liveSessions, teamName, seasons, currentSeason, noteWeightHead, testers, loaded]);

  return {
    players, setPlayers, staff, setStaff, matches, setMatches, trainings, setTrainings,
    evaluations, setEvaluations, availabilities, setAvailabilities,
    exerciseLibrary, setExerciseLibrary, bodyMetrics, setBodyMetrics,
    leagueMatches, setLeagueMatches, opponentProfiles, setOpponentProfiles,
    injuries, setInjuries, developmentGoals, setDevelopmentGoals, liveSessions, setLiveSessions,
    teamName, setTeamName, seasons, setSeasons, currentSeason, setCurrentSeason,
    noteWeightHead, setNoteWeightHead, testers, setTesters,
    loaded, saveState, loadError, retryLoad: loadData,
  };
}

/* ---------------- aggregation helpers ---------------- */

export function aggregateMatches(players, matches, weightHead = 0.5) {
  return players.map((p) => {
    let buts = 0, passes = 0, jaune = 0, rouge = 0, minutes = 0, matchesPresent = 0, noteSum = 0, noteCount = 0;
    matches.forEach((m) => {
      if (!m.squad?.includes(p.id)) return;
      const s = m.stats?.[p.id];
      if (!s) return;
      buts += Number(s.buts) || 0;
      passes += Number(s.passes) || 0;
      jaune += Number(s.jaune) || 0;
      rouge += Number(s.rouge) || 0;
      minutes += Number(s.minutes) || 0;
      matchesPresent += 1;
      const blended = computeBlendedNote(s, weightHead);
      if (blended !== null) {
        noteSum += blended;
        noteCount += 1;
      }
    });
    return {
      player: p, buts, passes, jaune, rouge, minutes, matchesPresent,
      avgNote: noteCount ? Math.round((noteSum / noteCount) * 10) / 10 : null,
    };
  });
}

export function aggregateTrainings(players, trainings) {
  return players.map((p) => {
    let present = 0, rpeSum = 0, rpeCount = 0;
    trainings.forEach((t) => {
      const a = t.attendance?.[p.id];
      if (a?.present) {
        present += 1;
        if (a.rpe !== "" && a.rpe !== undefined && a.rpe !== null) {
          rpeSum += Number(a.rpe);
          rpeCount += 1;
        }
      }
    });
    const total = trainings.length;
    return {
      player: p, present, total,
      rate: total ? Math.round((present / total) * 100) : null,
      avgRpe: rpeCount ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    };
  });
}

export function latestCardio(trainings, playerId) {
  const sorted = [...trainings].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const t of sorted) {
    const a = t.attendance?.[playerId];
    if (a && (a.vma || a.vo2max)) return { date: t.date, vma: a.vma, vo2max: a.vo2max };
  }
  return null;
}

export function cardioHistory(trainings, playerId) {
  return [...trainings]
    .filter((t) => t.attendance?.[playerId] && (t.attendance[playerId].vma || t.attendance[playerId].vo2max))
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((t) => ({ date: t.date, vma: t.attendance[playerId].vma, vo2max: t.attendance[playerId].vo2max }));
}

// starters + substitutions + duration -> minutes played per playerId
export function computeMinutes(match) {
  const duration = Number(match.duration) || 90;
  const subs = [...(match.substitutions || [])].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0));
  const starters = match.starters || [];

  // Reconstruit, pour chaque joueur, la liste chronologique de ses entrées/sorties — un joueur
  // peut sortir puis revenir plus tard, potentiellement plusieurs fois dans le même match.
  const events = {};
  const pushEvent = (id, minute, type) => {
    if (!id) return;
    if (!events[id]) events[id] = [];
    events[id].push({ minute, type });
  };
  starters.forEach((id) => pushEvent(id, 0, "in"));
  subs.forEach((s) => {
    const m = Number(s.minute) || 0;
    pushEvent(s.outId, m, "out");
    pushEvent(s.inId, m, "in");
  });

  const minutes = {};
  Object.keys(events).forEach((id) => {
    const evs = events[id].sort((a, b) => a.minute - b.minute);
    let total = 0;
    let openSince = null;
    evs.forEach((e) => {
      if (e.type === "in") {
        if (openSince === null) openSince = e.minute;
      } else if (openSince !== null) {
        total += Math.max(0, e.minute - openSince);
        openSince = null;
      }
    });
    if (openSince !== null) total += Math.max(0, duration - openSince);
    minutes[id] = total;
  });
  return minutes;
}

export function computeAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export function lastPresenceDate(trainings, playerId) {
  const sorted = [...trainings].filter((t) => t.attendance?.[playerId]?.present).sort((a, b) => (a.date < b.date ? 1 : -1));
  return sorted[0]?.date || null;
}

export const DEFAULT_SEASON = "2026-2027";

export function matchesAvailability(a, dateStr) {
  if (a.recurringDayOfWeek !== undefined && a.recurringDayOfWeek !== null && a.recurringDayOfWeek !== "") {
    const day = new Date(dateStr + "T00:00:00").getDay();
    if (day !== Number(a.recurringDayOfWeek)) return false;
    if (dateStr < a.startDate) return false;
    if (a.endDate && dateStr > a.endDate) return false;
    return true;
  }
  return dateStr >= a.startDate && dateStr <= (a.endDate || a.startDate);
}

export function isPlayerUnavailable(availabilities, playerId, dateStr) {
  if (!dateStr) return null;
  return (availabilities || []).find((a) => a.playerId === playerId && matchesAvailability(a, dateStr)) || null;
}

export function useSortState(defaultKey) {
  const [sort, setSort] = useState({ key: defaultKey, dir: "asc" });
  const toggleSort = (key) => setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const sortArrow = (key) => (
    <span className={"sort-arrow" + (sort.key === key ? "" : " inactive")}>
      {sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "▲"}
    </span>
  );
  return { sort, toggleSort, sortArrow };
}

export function compareValues(va, vb, dir) {
  const aNull = va === null || va === undefined || va === "";
  const bNull = vb === null || vb === undefined || vb === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  if (typeof va === "string") return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  return dir === "asc" ? va - vb : vb - va;
}

// Sélection multiple générique (cases à cocher + suppression groupée).
export function useSelection() {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clear = () => setSelected([]);
  return { selected, toggle, clear, setSelected };
}

export function clamp(value, min, max) {
  if (value === "" || value === null || value === undefined) return value;
  const n = Number(value);
  if (isNaN(n)) return value;
  return Math.min(max, Math.max(min, n));
}

export function isNumberTaken(players, number, excludeId) {
  if (number === "" || number === null || number === undefined) return false;
  return players.some((p) => p.id !== excludeId && String(p.number) === String(number));
}

export function getPlayerName(players, id, fallback = "—") {
  return players.find((p) => p.id === id)?.name || fallback;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return dateStr;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return dateStr;
  return `${m[3]}/${m[2]}`;
}

// Répare les dates déjà stockées avec jour/mois inversés (signature : un "mois" > 12,
// ce qui ne peut arriver que si le jour a été placé par erreur dans la position du mois).
export function fixSwappedDate(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return dateStr;
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month > 12 && day >= 1 && day <= 12) {
    return `${m[1]}-${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
  }
  return dateStr;
}

export function normalizeDateValue(raw) {
  if (raw === undefined || raw === null || raw === "") return "";
  if (typeof raw === "number") return raw; // laissé tel quel, traité par l'appelant (SSF)
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  let m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Arithmétique de date basée sur des chaînes ISO, ancrée en UTC pour éviter tout décalage de fuseau horaire.
export function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function isMatchPlayed(m) {
  return m.scoreFor !== undefined && m.scoreFor !== "" && m.scoreAgainst !== undefined && m.scoreAgainst !== "";
}

export function isTrainingPlayed(training, nowDate, nowTimeStr) {
  const today = nowDate || todayStr();
  if (!training.date) return false;
  if (training.date < today) return true;
  if (training.date > today) return false;
  if (!training.time) return false;
  const now = nowTimeStr || `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  return training.time <= now;
}

// Charge d'une séance pour un joueur (méthode RPE de séance : RPE x durée).
export function computeTrainingLoad(training, playerId) {
  const a = training.attendance?.[playerId];
  if (!a || !a.present) return 0;
  const rpe = Number(a.rpe) || 0;
  const duration = Number(training.duration) || 0;
  return rpe * duration;
}

// Ratio charge aiguë (7 derniers jours) / charge chronique (moyenne hebdo sur 28 jours).
// Repère de référence utilisé en préparation physique : <0.8 sous-charge, 0.8-1.3 zone optimale,
// 1.3-1.5 vigilance, >1.5 risque élevé de blessure.
export function computeACWR(players, trainings, nowDate) {
  const today = nowDate || todayStr();
  const sevenAgo = addDaysToDateStr(today, -7);
  const twentyEightAgo = addDaysToDateStr(today, -28);
  return players.map((p) => {
    let acute = 0, chronic = 0;
    (trainings || []).forEach((tr) => {
      if (!tr.date || tr.date > today) return;
      const load = computeTrainingLoad(tr, p.id);
      if (load <= 0) return;
      if (tr.date > sevenAgo) acute += load;
      if (tr.date > twentyEightAgo) chronic += load;
    });
    const chronicWeekly = chronic / 4;
    const ratio = chronicWeekly > 0 ? Math.round((acute / chronicWeekly) * 100) / 100 : null;
    let zone = null;
    if (ratio !== null) {
      if (ratio > 1.5) zone = "high";
      else if (ratio > 1.3) zone = "watch";
      else if (ratio >= 0.8) zone = "optimal";
      else zone = "low";
    }
    return { player: p, acute: Math.round(acute), chronicWeekly: Math.round(chronicWeekly * 10) / 10, ratio, zone };
  });
}

export const TIME_BUCKETS = ["0-15", "15-30", "30-45", "45-60", "60-75", "75-90", "90+"];

export function timeBucket(minute) {
  const m = Number(minute);
  if (isNaN(m) || minute === "") return null;
  if (m <= 15) return "0-15";
  if (m <= 30) return "15-30";
  if (m <= 45) return "30-45";
  if (m <= 60) return "45-60";
  if (m <= 75) return "60-75";
  if (m <= 90) return "75-90";
  return "90+";
}

export function byTimeSlot(items) {
  const counts = Object.fromEntries(TIME_BUCKETS.map((b) => [b, 0]));
  items.forEach((g) => { const b = timeBucket(g.minute); if (b) counts[b]++; });
  const total = items.length;
  return TIME_BUCKETS.map((slot) => ({ slot, count: counts[slot], pct: total ? Math.round((counts[slot] / total) * 1000) / 10 : 0 }));
}

export function typeToCategory(type) {
  if (GOAL_TYPE_GROUPS[type]) return type; // déjà une catégorie (ex. saisie rapide depuis Live Match)
  for (const [cat, types] of Object.entries(GOAL_TYPE_GROUPS)) {
    if (types.includes(type)) return cat;
  }
  return null;
}

export function byCategory(goals) {
  const counts = {};
  goals.forEach((g) => { const c = typeToCategory(g.type); if (c) counts[c] = (counts[c] || 0) + 1; });
  const total = goals.length;
  return Object.entries(counts).map(([cat, count]) => ({ cat, count, pct: total ? Math.round((count / total) * 1000) / 10 : 0 })).sort((a, b) => b.count - a.count);
}

export function byType(goals) {
  const counts = {};
  goals.forEach((g) => { if (g.type) counts[g.type] = (counts[g.type] || 0) + 1; });
  const total = goals.length;
  return Object.entries(counts).map(([type, count]) => ({ type, count, pct: total ? Math.round((count / total) * 1000) / 10 : 0 })).sort((a, b) => b.count - a.count);
}

export function sortByPosition(players) {
  return [...players].sort((a, b) => {
    const ia = POSITIONS.indexOf(a.position);
    const ib = POSITIONS.indexOf(b.position);
    const oa = ia === -1 ? 99 : ia;
    const ob = ib === -1 ? 99 : ib;
    if (oa !== ob) return oa - ob;
    return (a.name || "").localeCompare(b.name || "");
  });
}

export function aggregatePositionCounts(players) {
  const counts = {};
  POSITIONS.forEach((pos) => { counts[pos] = 0; });
  counts[""] = 0;
  (players || []).forEach((p) => { counts[p.position || ""] = (counts[p.position || ""] || 0) + 1; });
  return counts;
}

export const GOAL_TYPE_GROUPS = {
  "CONSTRUCTION": [
    "C-BALLS PLAYED BEHIND DEFENCE", "C-CENTRAL COMBINATION", "C-CROSSES LEFT", "C-CROSSES RIGHT",
    "C-LONG BALL + SECOND BALL", "C-DEEP POCKET RUNS", "C-BRILLIANCE",
  ],
  "COUNTER ATTACK": [
    "CA-BALLS PLAYED BEHIND DEFENCE", "CA-CENTRAL COMBINATION", "CA-CROSSES LEFT", "CA-CROSSES RIGHT",
    "CA-INDIVIDUAL MISTAKES", "CA-AFTER SET PIECES", "CA-BRILLIANCE",
  ],
  "SET PIECES": [
    "CORNER", "FREE KICK", "INDIRECT FREEKICK", "2ND BALLS : CORNER", "2ND BALLS : DIRECT FK", "2ND BALLS : INDIRECT FK",
  ],
  "INDIVIDUAL": ["BRILLIANCE", "LONG DISTANCE SHOTS", "PENALTY", "OWN GOAL", "MISTAKES"],
};

export const emptyGoalEntry = () => ({ id: uid(), minute: "", player: "", type: "" });

export const POSITION_SPECIFICITES = {
  "Gardien": ["G"],
  "Défenseur": ["DC", "DD", "DG", "DL"],
  "Milieu": ["MDC", "MC", "MOC", "MD", "MG"],
  "Attaquant": ["BU", "AD", "AG", "SA"],
};

export const FORMATIONS = {
  "4-4-2": [1, 4, 4, 2],
  "4-3-3": [1, 4, 3, 3],
  "4-2-3-1": [1, 4, 2, 3, 1],
  "3-5-2": [1, 3, 5, 2],
  "3-4-3": [1, 3, 4, 3],
  "5-3-2": [1, 5, 3, 2],
  "4-5-1": [1, 4, 5, 1],
};
export function formationSlotCount(formation) {
  return (FORMATIONS[formation] || FORMATIONS["4-4-2"]).reduce((a, b) => a + b, 0);
}

// Réaffecte les joueurs déjà placés vers la nouvelle formation, ligne par ligne (gardien, défense,
// milieu, attaque dans l'ordre), au lieu de tout vider. Les joueurs en surnombre dans une ligne
// redeviennent disponibles sur le banc plutôt que d'être perdus.
export function remapSlotsForFormation(oldRowSlices, oldSlots, newFormation) {
  const newRows = FORMATIONS[newFormation] || FORMATIONS["4-4-2"];
  const newTotal = newRows.reduce((a, b) => a + b, 0);
  const newSlots = Array(newTotal).fill(null);
  let cursor = 0;
  const newRowSlices = newRows.map((count) => {
    const idx = Array.from({ length: count }, (_, i) => cursor + i);
    cursor += count;
    return idx;
  });
  const oldByRow = oldRowSlices.map((indices) => indices.map((idx) => oldSlots[idx]).filter(Boolean));
  oldByRow.forEach((rowPlayers, rowIdx) => {
    const targetRow = newRowSlices[rowIdx];
    if (!targetRow) return;
    rowPlayers.forEach((id, i) => { if (i < targetRow.length) newSlots[targetRow[i]] = id; });
  });
  return newSlots;
}

function daysBetween(start, end) {
  const s = new Date(start), e = new Date(end || start);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

export function computeAbsenceRates(players, availabilities, trainings, matches) {
  const events = [...(trainings || []), ...(matches || [])];
  const total = events.length;
  return players.map((p) => {
    let absentCount = 0, injuredCount = 0;
    events.forEach((ev) => {
      const u = isPlayerUnavailable(availabilities, p.id, ev.date);
      if (u?.status === "Absent") absentCount++;
      if (u?.status === "Blessé") injuredCount++;
    });
    return {
      player: p,
      absenceRate: total ? Math.round((absentCount / total) * 1000) / 10 : 0,
      injuryRate: total ? Math.round((injuredCount / total) * 1000) / 10 : 0,
    };
  });
}

export function aggregateAvailability(players, availabilities) {
  const today = todayStr();
  return players.map((p) => {
    const entries = availabilities.filter((a) => a.playerId === p.id);
    const absences = entries.filter((a) => a.status === "Absent").length;
    const blessures = entries.filter((a) => a.status === "Blessé").length;
    const totalDaysUnavailable = entries.reduce((sum, a) => sum + daysBetween(a.startDate, a.endDate), 0);
    const current = entries.find((a) => today >= a.startDate && today <= (a.endDate || a.startDate)) || null;
    return { player: p, absences, blessures, totalDaysUnavailable, current };
  });
}

export function overallAvg(scores) {
  const vals = Object.values(scores || {}).map(Number).filter((v) => !isNaN(v) && v !== "");
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function categoryAvg(scores, keys) {
  const nums = keys.map((k) => scores?.[k]).filter((v) => v !== "" && v !== undefined && v !== null).map(Number);
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function latestEvaluation(evaluations, playerId) {
  return [...evaluations].filter((e) => e.playerId === playerId).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
}

// Les évaluations sans "source" enregistrée (créées avant cette fonctionnalité) sont considérées coach par défaut.
export function latestEvaluationBySource(evaluations, playerId, source) {
  return [...evaluations]
    .filter((e) => e.playerId === playerId && (e.source || "coach") === source)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
}

export function evaluationHistory(evaluations, playerId) {
  return [...evaluations].filter((e) => e.playerId === playerId).sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function newInjury(fields) {
  return { id: uid(), playerId: "", date: todayStr(), bodyPart: "", type: "", severity: "Modérée", expectedReturn: "", actualReturn: "", notes: "", ...fields };
}

export function injuryStatus(injury) {
  const today = todayStr();
  if (injury.actualReturn && injury.actualReturn <= today) return "recovered";
  if (injury.expectedReturn && injury.expectedReturn < today && !injury.actualReturn) return "overdue";
  return "ongoing";
}

export function playerInjuryHistory(injuries, playerId) {
  return [...(injuries || [])].filter((i) => i.playerId === playerId).sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function aggregateInjuries(injuries) {
  const byBodyPart = {};
  (injuries || []).forEach((i) => { if (i.bodyPart) byBodyPart[i.bodyPart] = (byBodyPart[i.bodyPart] || 0) + 1; });
  const bodyPartRanking = Object.entries(byBodyPart).map(([part, count]) => ({ part, count })).sort((a, b) => b.count - a.count);

  const byPlayer = {};
  (injuries || []).forEach((i) => { if (i.playerId) byPlayer[i.playerId] = (byPlayer[i.playerId] || 0) + 1; });

  return { bodyPartRanking, byPlayer };
}

export function newDevelopmentGoal(fields) {
  return { id: uid(), playerId: "", title: "", description: "", targetDate: "", status: "ongoing", createdDate: todayStr(), ...fields };
}

export function playerGoals(goals, playerId) {
  return [...(goals || [])].filter((g) => g.playerId === playerId).sort((a, b) => (a.targetDate < b.targetDate ? 1 : -1));
}

export function computeBMI(weight, height) {
  const w = Number(weight), h = Number(height);
  if (!w || !h) return null;
  return Math.round((w / ((h / 100) ** 2)) * 10) / 10;
}

export function bodyMetricsHistory(bodyMetrics, playerId) {
  return [...bodyMetrics].filter((b) => b.playerId === playerId).sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function latestBodyMetric(bodyMetrics, playerId) {
  return bodyMetricsHistory(bodyMetrics, playerId)[0] || null;
}

/* ---------------- small building blocks ---------------- */

export function Badge({ number, size = 40 }) {
  return (
    <div className="badge-number" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {number || "–"}
    </div>
  );
}

export function Avatar({ name, size = 40 }) {
  const initials = (name || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="badge-number badge-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials || "–"}
    </div>
  );
}

export function DateField({ value, onChange, style }) {
  const parts = value ? value.split("-") : ["", "", ""];
  const [y, setY] = useState(parts[0] || "");
  const [m, setM] = useState(parts[1] || "");
  const [d, setD] = useState(parts[2] || "");

  useEffect(() => {
    const p = value ? value.split("-") : ["", "", ""];
    setY(p[0] || ""); setM(p[1] || ""); setD(p[2] || "");
  }, [value]);

  const commit = (ny, nm, nd) => {
    const validMonth = nm.length >= 1 && Number(nm) >= 1 && Number(nm) <= 12;
    const validDay = nd.length >= 1 && Number(nd) >= 1 && Number(nd) <= 31;
    if (ny.length === 4 && validMonth && validDay) {
      onChange(`${ny}-${nm.padStart(2, "0")}-${nd.padStart(2, "0")}`);
    } else if (!ny && !nm && !nd) {
      onChange("");
    }
  };

  const digits = (v, max) => v.replace(/\D/g, "").slice(0, max);

  return (
    <div className="date-field" style={style}>
      <input type="text" inputMode="numeric" placeholder="JJ" maxLength={2} value={d}
        onChange={(e) => { const v = digits(e.target.value, 2); setD(v); commit(y, m, v); }} />
      <span className="date-field-sep">/</span>
      <input type="text" inputMode="numeric" placeholder="MM" maxLength={2} value={m}
        onChange={(e) => { const v = digits(e.target.value, 2); setM(v); commit(y, v, d); }} />
      <span className="date-field-sep">/</span>
      <input type="text" inputMode="numeric" placeholder="AAAA" maxLength={4} value={y}
        onChange={(e) => { const v = digits(e.target.value, 4); setY(v); commit(v, m, d); }} />
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={"modal-box" + (wide ? " modal-wide" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, help, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon"><Icon size={22} /></div>}
      <p className="empty-state-title">{title}</p>
      {help && <p className="empty-state-help">{help}</p>}
      {actionLabel && onAction && (
        <button className="btn-gold" onClick={onAction} style={{ marginTop: 12 }}>{actionLabel}</button>
      )}
    </div>
  );
}

export function MetricCard({ label, value, icon: Icon, trend }) {
  return (
    <div className="metric-card">
      <div className="metric-icon"><Icon size={16} /></div>
      <div>
        <div className="metric-value">{value} {trend}</div>
        <div className="metric-label">{label}</div>
      </div>
    </div>
  );
}
