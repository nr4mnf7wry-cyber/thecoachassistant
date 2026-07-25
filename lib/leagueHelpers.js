import * as XLSX from "xlsx";
import { uid, normalizeDateValue, byTimeSlot, byCategory } from "./shared";

export function newTeamProfile(teamName) {
  return { id: uid(), teamName, roster: [], compositions: {} };
}

export function findTeamProfile(teamProfiles, teamName) {
  if (!teamName) return null;
  const target = teamName.trim().toLowerCase();
  return (teamProfiles || []).find((p) => (p.teamName || "").trim().toLowerCase() === target) || null;
}

export function newLeagueMatch(fields) {
  return {
    id: uid(), date: "", matchday: "", homeTeam: "", awayTeam: "",
    homeScore: "", awayScore: "", duration: "90",
    appearances: [], events: [], compositions: {},
    ...fields,
  };
}

// Calcule les minutes jouées à partir du statut titulaire/remplaçant et des changements enregistrés.
// Si aucun changement ne concerne ce joueur et qu'aucun statut n'est connu, on retombe sur la valeur saisie manuellement.
export function computeAppearanceMinutes(match, appearance, teamSide) {
  const duration = Number(match.duration) || 90;
  const subs = (match.events || []).filter((e) => e.type === "sub" && e.team === teamSide);
  const outEvent = subs.find((e) => e.player === appearance.player);
  const inEvent = subs.find((e) => e.playerIn === appearance.player);
  if (appearance.starter === true) {
    return outEvent ? Math.max(0, Number(outEvent.minute) || 0) : duration;
  }
  if (appearance.starter === false) {
    return inEvent ? Math.max(0, duration - (Number(inEvent.minute) || 0)) : 0;
  }
  return appearance.minutes !== "" && appearance.minutes !== undefined ? Number(appearance.minutes) || 0 : null;
}

export function emptyComposition() {
  return {
    base: { formation: "4-4-2", slots: [] },
    offensive: { formation: "4-4-2", slots: [] },
    defensive: { formation: "4-4-2", slots: [] },
  };
}

export function getTeamComposition(match, teamName) {
  return (match.compositions && match.compositions[teamName]) || emptyComposition();
}

function sideForTeam(match, teamName) {
  if (match.homeTeam === teamName) return "home";
  if (match.awayTeam === teamName) return "away";
  return null;
}

// Reprend l'effectif + composition de la dernière fois où cette équipe a été rencontrée,
// avec de nouveaux identifiants (pour ne pas partager de références avec l'ancien match).
// Reprend les N derniers effectifs connus d'une équipe (date, adversaire, liste de joueurs).
export function getRecentRosters(leagueMatches, teamName, n = 3) {
  const teamMatches = (leagueMatches || [])
    .filter((m) => (m.homeTeam === teamName || m.awayTeam === teamName) && (m.appearances || []).length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return teamMatches.slice(0, n).map((m) => {
    const side = sideForTeam(m, teamName);
    const opponent = side === "home" ? m.awayTeam : m.homeTeam;
    const roster = (m.appearances || []).filter((a) => a.team === side && a.player).map((a) => a.player);
    return { date: m.date, opponent, roster };
  });
}

export function findLatestTeamData(leagueMatches, teamName) {
  if (!teamName) return null;
  const matches = (leagueMatches || [])
    .filter((m) => m.homeTeam === teamName || m.awayTeam === teamName)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!matches.length) return null;
  const m = matches[0];
  const side = sideForTeam(m, teamName);
  const oldAppearances = (m.appearances || []).filter((a) => a.team === side);
  const idMap = {};
  const appearances = oldAppearances.map((a) => {
    const newId = uid();
    idMap[a.id] = newId;
    return { ...a, id: newId };
  });
  const comp = m.compositions && m.compositions[side];
  const composition = comp
    ? Object.fromEntries(Object.entries(comp).map(([variant, v]) => [variant, { ...v, slots: (v.slots || []).map((id) => (id ? idMap[id] || null : null)) }]))
    : null;
  return { appearances, composition };
}

// Détermine la formation la plus souvent utilisée (toutes variantes/matchs confondus) et,
// pour chaque poste, les joueurs qui reviennent le plus souvent dans les compositions enregistrées.
export function computeMostCommonComposition(leagueMatches, teamName) {
  const teamMatches = (leagueMatches || []).filter((m) => m.homeTeam === teamName || m.awayTeam === teamName);
  const formationCounts = {};
  const playerPositionCounts = {}; // { player: { position: count } }

  teamMatches.forEach((m) => {
    const side = m.homeTeam === teamName ? "home" : "away";
    const comp = getTeamComposition(m, side);
    const appearances = (m.appearances || []).filter((a) => a.team === side);
    const apById = Object.fromEntries(appearances.map((a) => [a.id, a]));
    const v = comp.base;
    if (!v || !v.formation) return;
    formationCounts[v.formation] = (formationCounts[v.formation] || 0) + 1;
    (v.slots || []).forEach((apId) => {
      if (!apId) return;
      const ap = apById[apId];
      if (!ap || !ap.player) return;
      const pos = ap.position || "";
      playerPositionCounts[ap.player] = playerPositionCounts[ap.player] || {};
      playerPositionCounts[ap.player][pos] = (playerPositionCounts[ap.player][pos] || 0) + 1;
    });
  });

  const formationEntries = Object.entries(formationCounts).sort((a, b) => b[1] - a[1]);
  if (!formationEntries.length) return null;
  const formation = formationEntries[0][0];

  // classe les joueurs par poste dominant, du plus utilisé au moins utilisé
  const byPosition = {};
  Object.entries(playerPositionCounts).forEach(([player, positions]) => {
    const [topPos, count] = Object.entries(positions).sort((a, b) => b[1] - a[1])[0];
    if (!topPos) return;
    byPosition[topPos] = byPosition[topPos] || [];
    byPosition[topPos].push({ player, count });
  });
  Object.keys(byPosition).forEach((pos) => byPosition[pos].sort((a, b) => b.count - a.count));

  return { formation, byPosition, sampleSize: formationEntries[0][1] };
}

// Répartition des formations de base utilisées au fil des matchs (variété = "changements").
export function computeFormationBreakdown(leagueMatches, teamName) {
  const teamMatches = (leagueMatches || []).filter((m) => m.homeTeam === teamName || m.awayTeam === teamName);
  const counts = {};
  teamMatches.forEach((m) => {
    const f = getTeamComposition(m, sideForTeam(m, teamName)).base?.formation;
    if (f) counts[f] = (counts[f] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([formation, count]) => ({ formation, count, pct: total ? Math.round((count / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.count - a.count);
}

// Formation de base utilisée match par match, dans l'ordre chronologique.
export function computeFormationTimeline(leagueMatches, teamName) {
  const teamMatches = (leagueMatches || [])
    .filter((m) => m.homeTeam === teamName || m.awayTeam === teamName)
    .sort((a, b) => (a.date > b.date ? 1 : -1));
  return teamMatches
    .map((m) => {
      const isHome = m.homeTeam === teamName;
      return { date: m.date, opponent: isHome ? m.awayTeam : m.homeTeam, formation: getTeamComposition(m, isHome ? "home" : "away").base?.formation || "" };
    })
    .filter((e) => e.formation);
}

// Paires de joueurs qui reviennent le plus souvent ensemble dans la composition de base.
export function computePlayerAssociations(leagueMatches, teamName) {
  const teamMatches = (leagueMatches || []).filter((m) => m.homeTeam === teamName || m.awayTeam === teamName);
  const pairCounts = {};
  teamMatches.forEach((m) => {
    const side = m.homeTeam === teamName ? "home" : "away";
    const appearances = (m.appearances || []).filter((a) => a.team === side);
    const apById = Object.fromEntries(appearances.map((a) => [a.id, a]));
    const slots = getTeamComposition(m, side).base?.slots || [];
    const names = [...new Set(slots.map((id) => id && apById[id]?.player).filter(Boolean))];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = [names[i], names[j]].sort().join(" ↔ ");
        pairCounts[key] = (pairCounts[key] || 0) + 1;
      }
    }
  });
  return Object.entries(pairCounts)
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function normalizeHeader(h) {
  return String(h || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
}

// Import simplifié : un seul onglet Joueur/Numero/Poste, pour l'effectif adverse d'un match précis.
export function parseSimpleRoster(wb) {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (!rows.length) return [];
  const header = rows[0].map((h) => normalizeHeader(h));
  const iPlayer = header.findIndex((h) => h.includes("joueur"));
  const iNumber = header.findIndex((h) => h.includes("numero"));
  const iPosition = header.findIndex((h) => h.includes("poste"));
  if (iPlayer === -1) return [];
  return rows.slice(1).filter((r) => r.length && r[iPlayer]).map((r) => ({
    id: uid(),
    player: String(r[iPlayer] || ""),
    number: iNumber >= 0 && r[iNumber] !== undefined ? String(r[iNumber]) : "",
    position: iPosition >= 0 ? String(r[iPosition] || "").trim() : "",
  }));
}

export function downloadSimpleRosterTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Joueur", "Numero", "Poste"],
    ["J. Martin", "9", "Attaquant"],
    ["L. Petit", "14", "Milieu"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Effectif");
  XLSX.writeFile(wb, "modele-effectif-adverse.xlsx");
}

function parseDateCell(raw) {
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (raw instanceof Date) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")}`;
  }
  return normalizeDateValue(raw);
}

function matchKey(date, home, away) {
  return `${date}|${(home || "").trim().toLowerCase()}|${(away || "").trim().toLowerCase()}`;
}

function sideFromLabel(raw) {
  const s = String(raw || "").toLowerCase();
  return (s.includes("ext") || s.includes("uit")) ? "away" : "home";
}

export function parseLeagueWorkbook(wb) {
  const sheetRows = (name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { header: 1 });
  };

  const matches = [];
  const byKey = {};

  const matchRows = sheetRows("Matchs");
  if (matchRows.length) {
    const header = matchRows[0].map(normalizeHeader);
    const idx = (candidates) => header.findIndex((h) => candidates.includes(h));
    const iDate = idx(["date"]);
    const iJournee = idx(["journee", "matchday", "speeldag"]);
    const iHome = idx(["equipedomicile", "domicile"]);
    const iAway = idx(["equipeexterieur", "exterieur", "equipeext"]);
    const iHS = idx(["scoredomicile", "butsdomicile"]);
    const iAS = idx(["scoreexterieur", "butsexterieur"]);

    matchRows.slice(1).filter((r) => r.length && r[iDate] && r[iHome]).forEach((r) => {
      const date = parseDateCell(r[iDate]);
      const homeTeam = String(r[iHome] || "").trim();
      const awayTeam = String(r[iAway] || "").trim();
      const m = {
        id: uid(), date, matchday: iJournee >= 0 ? String(r[iJournee] || "") : "",
        homeTeam, awayTeam,
        homeScore: iHS >= 0 && r[iHS] !== undefined ? String(r[iHS]) : "",
        awayScore: iAS >= 0 && r[iAS] !== undefined ? String(r[iAS]) : "",
        events: [], appearances: [],
      };
      matches.push(m);
      byKey[matchKey(date, homeTeam, awayTeam)] = m;
    });
  }

  const evRows = sheetRows("Evenements");
  if (evRows.length) {
    const header = evRows[0].map(normalizeHeader);
    const idx = (candidates) => header.findIndex((h) => candidates.includes(h));
    const iDate = idx(["date"]);
    const iHome = idx(["equipedomicile"]);
    const iAway = idx(["equipeexterieur"]);
    const iMin = idx(["minute"]);
    const iTeam = idx(["equipe"]);
    const iType = idx(["type"]);
    const iGoalType = idx(["typedebut"]);
    const iPlayer = idx(["joueur"]);
    const iPlayerIn = idx(["joueurentrant"]);

    evRows.slice(1).filter((r) => r.length && r[iDate]).forEach((r) => {
      const date = parseDateCell(r[iDate]);
      const homeTeam = String(r[iHome] || "").trim();
      const awayTeam = String(r[iAway] || "").trim();
      const m = byKey[matchKey(date, homeTeam, awayTeam)];
      if (!m) return;
      const team = sideFromLabel(iTeam >= 0 ? r[iTeam] : "");
      const typeRaw = String(iType >= 0 ? r[iType] || "" : "").toLowerCase();
      let type = null;
      if (typeRaw.includes("but") || typeRaw.includes("goal") || typeRaw.includes("doel")) type = "goal";
      else if (typeRaw.includes("jaune") || typeRaw.includes("geel")) type = "yellow";
      else if (typeRaw.includes("roug") || typeRaw.includes("rood")) type = "red";
      else if (typeRaw.includes("chang") || typeRaw.includes("wissel") || typeRaw.includes("sub")) type = "sub";
      if (!type) return;
      m.events.push({
        id: uid(),
        minute: iMin >= 0 && r[iMin] !== undefined ? String(r[iMin]) : "",
        team, type,
        goalType: iGoalType >= 0 ? String(r[iGoalType] || "").trim() : "",
        player: iPlayer >= 0 ? String(r[iPlayer] || "") : "",
        playerIn: iPlayerIn >= 0 ? String(r[iPlayerIn] || "") : "",
      });
    });
  }

  const appRows = sheetRows("Effectifs");
  if (appRows.length) {
    const header = appRows[0].map(normalizeHeader);
    const idx = (candidates) => header.findIndex((h) => candidates.includes(h));
    const iDate = idx(["date"]);
    const iHome = idx(["equipedomicile"]);
    const iAway = idx(["equipeexterieur"]);
    const iTeam = idx(["equipe"]);
    const iPlayer = idx(["joueur"]);
    const iNumber = idx(["numero"]);
    const iPosition = idx(["poste"]);
    const iStarter = idx(["titulaire"]);
    const iMinutes = idx(["minutes"]);

    appRows.slice(1).filter((r) => r.length && r[iDate]).forEach((r) => {
      const date = parseDateCell(r[iDate]);
      const homeTeam = String(r[iHome] || "").trim();
      const awayTeam = String(r[iAway] || "").trim();
      const m = byKey[matchKey(date, homeTeam, awayTeam)];
      if (!m) return;
      const starterRaw = iStarter >= 0 ? String(r[iStarter] || "").trim().toLowerCase() : "";
      m.appearances.push({
        id: uid(),
        team: sideFromLabel(iTeam >= 0 ? r[iTeam] : ""),
        player: iPlayer >= 0 ? String(r[iPlayer] || "") : "",
        number: iNumber >= 0 && r[iNumber] !== undefined ? String(r[iNumber]) : "",
        position: iPosition >= 0 ? String(r[iPosition] || "").trim() : "",
        starter: starterRaw === "oui" || starterRaw === "yes" ? true : (starterRaw === "non" || starterRaw === "no" ? false : null),
        minutes: iMinutes >= 0 && r[iMinutes] !== undefined ? String(r[iMinutes]) : "",
      });
    });
  }

  return matches;
}

export function downloadLeagueTemplate() {
  const wb = XLSX.utils.book_new();
  const wsMatches = XLSX.utils.aoa_to_sheet([
    ["Date", "Journee", "Equipe domicile", "Equipe exterieur", "Score domicile", "Score exterieur"],
    ["2026-08-15", "1", "FC Exemple A", "FC Exemple B", "2", "1"],
  ]);
  XLSX.utils.book_append_sheet(wb, wsMatches, "Matchs");

  const wsEv = XLSX.utils.aoa_to_sheet([
    ["Date", "Equipe domicile", "Equipe exterieur", "Minute", "Equipe", "Type", "Type de but", "Joueur", "Joueur entrant"],
    ["2026-08-15", "FC Exemple A", "FC Exemple B", "23", "Domicile", "But", "CA-BRILLIANCE", "J. Martin", ""],
    ["2026-08-15", "FC Exemple A", "FC Exemple B", "67", "Exterieur", "Carton Jaune", "", "P. Durand", ""],
    ["2026-08-15", "FC Exemple A", "FC Exemple B", "70", "Domicile", "Changement", "", "J. Martin", "L. Petit"],
  ]);
  XLSX.utils.book_append_sheet(wb, wsEv, "Evenements");

  const wsApp = XLSX.utils.aoa_to_sheet([
    ["Date", "Equipe domicile", "Equipe exterieur", "Equipe", "Joueur", "Numero", "Poste", "Titulaire", "Minutes"],
    ["2026-08-15", "FC Exemple A", "FC Exemple B", "Domicile", "J. Martin", "9", "Attaquant", "Oui", "70"],
    ["2026-08-15", "FC Exemple A", "FC Exemple B", "Domicile", "L. Petit", "14", "Milieu", "Non", "20"],
  ]);
  XLSX.utils.book_append_sheet(wb, wsApp, "Effectifs");

  XLSX.writeFile(wb, "modele-championnat.xlsx");
}

export function getTeamNames(leagueMatches) {
  const set = new Set();
  (leagueMatches || []).forEach((m) => {
    if (m.homeTeam) set.add(m.homeTeam);
    if (m.awayTeam) set.add(m.awayTeam);
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

function resultFor(m, teamName) {
  if (m.homeScore === "" || m.awayScore === "") return null;
  const isHome = m.homeTeam === teamName;
  const gf = Number(isHome ? m.homeScore : m.awayScore);
  const ga = Number(isHome ? m.awayScore : m.homeScore);
  if (isNaN(gf) || isNaN(ga)) return null;
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
}

export function computeTeamStats(leagueMatches, teamName) {
  const teamMatches = (leagueMatches || [])
    .filter((m) => m.homeTeam === teamName || m.awayTeam === teamName)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  const goalsFor = [], goalsAgainst = [], subs = [];
  const scorerCounts = {}, minutesTotals = {}, matchesCounts = {}, cardCounts = {}, subOutCounts = {}, subInCounts = {};

  teamMatches.forEach((m) => {
    const isHome = m.homeTeam === teamName;
    const side = isHome ? "home" : "away";
    const r = resultFor(m, teamName);
    if (r === "W") w++; else if (r === "D") d++; else if (r === "L") l++;
    if (m.homeScore !== "" && m.awayScore !== "") {
      gf += Number(isHome ? m.homeScore : m.awayScore) || 0;
      ga += Number(isHome ? m.awayScore : m.homeScore) || 0;
    }
    (m.events || []).forEach((ev) => {
      if (ev.team === side) {
        if (ev.type === "goal") { goalsFor.push(ev); scorerCounts[ev.player] = (scorerCounts[ev.player] || 0) + 1; }
        if (ev.type === "yellow") { cardCounts[ev.player] = cardCounts[ev.player] || { yellow: 0, red: 0 }; cardCounts[ev.player].yellow++; }
        if (ev.type === "red") { cardCounts[ev.player] = cardCounts[ev.player] || { yellow: 0, red: 0 }; cardCounts[ev.player].red++; }
        if (ev.type === "sub") {
          subs.push(ev);
          if (ev.player) subOutCounts[ev.player] = (subOutCounts[ev.player] || 0) + 1;
          if (ev.playerIn) subInCounts[ev.playerIn] = (subInCounts[ev.playerIn] || 0) + 1;
        }
      } else if (ev.type === "goal") {
        goalsAgainst.push(ev);
      }
    });
    (m.appearances || []).forEach((a) => {
      if (a.team !== side || !a.player) return;
      const mins = computeAppearanceMinutes(m, a, side);
      minutesTotals[a.player] = (minutesTotals[a.player] || 0) + (mins || 0);
      matchesCounts[a.player] = (matchesCounts[a.player] || 0) + 1;
    });
  });

  const topScorers = Object.entries(scorerCounts).map(([player, goals]) => ({ player, goals })).sort((a, b) => b.goals - a.goals).slice(0, 10);
  const topMinutes = Object.entries(minutesTotals).map(([player, minutes]) => ({ player, minutes, matches: matchesCounts[player] || 0 })).sort((a, b) => b.minutes - a.minutes).slice(0, 10);
  const cards = Object.entries(cardCounts).map(([player, c]) => ({ player, yellow: c.yellow, red: c.red })).sort((a, b) => (b.yellow + b.red * 2) - (a.yellow + a.red * 2)).slice(0, 10);
  const cardsTotal = Object.values(cardCounts).reduce((acc, c) => ({ yellow: acc.yellow + c.yellow, red: acc.red + c.red }), { yellow: 0, red: 0 });
  const subFreq = [...new Set([...Object.keys(subOutCounts), ...Object.keys(subInCounts)])]
    .map((player) => ({ player, out: subOutCounts[player] || 0, in: subInCounts[player] || 0 }))
    .sort((a, b) => (b.out + b.in) - (a.out + a.in)).slice(0, 10);

  const form = teamMatches.filter((m) => resultFor(m, teamName)).slice(-5).map((m) => resultFor(m, teamName));

  return {
    matchesCount: teamMatches.length, w, d, l, gf, ga,
    avgGf: teamMatches.length ? Math.round((gf / teamMatches.length) * 10) / 10 : 0,
    avgGa: teamMatches.length ? Math.round((ga / teamMatches.length) * 10) / 10 : 0,
    form, topScorers, topMinutes, cards, cardsTotal, subFreq,
    subsTiming: byTimeSlot(subs),
    goalsForTiming: byTimeSlot(goalsFor),
    goalsAgainstTiming: byTimeSlot(goalsAgainst),
    goalsForByCategory: byCategory(goalsFor.filter((g) => g.goalType).map((g) => ({ type: g.goalType }))),
    goalsAgainstByCategory: byCategory(goalsAgainst.filter((g) => g.goalType).map((g) => ({ type: g.goalType }))),
    matches: teamMatches,
  };
}
