import * as XLSX from "xlsx";
import { uid, formationSlotCount, normalizeDateValue, emptyMatchStat } from "./shared";

// Garde match.stats[joueur].buts aligné sur le contenu réel de goalsScored,
// pour que les classements/statistiques de saison (qui lisent stats.buts) restent exacts
// quelle que soit la page où le but a été saisi (onglet Buts ou Live).
export function syncGoalsToStats(stats, players, goalsScored) {
  const counts = {};
  (goalsScored || []).forEach((g) => { if (g.player) counts[g.player] = (counts[g.player] || 0) + 1; });
  const next = { ...stats };
  players.forEach((p) => {
    const count = counts[p.name] || 0;
    const current = next[p.id] || emptyMatchStat();
    if ((Number(current.buts) || 0) !== count) next[p.id] = { ...current, buts: count };
  });
  return next;
}

export function normalizeHeader(h) {
  return String(h || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
}

export function newMatch(fields) {
  return {
    id: uid(), squad: [], starters: [], formation: "4-4-2", lineupSlots: Array(formationSlotCount("4-4-2")).fill(null),
    substitutions: [], duration: 90, captain: "", summary: "",
    teamStats: { possession: "", tirs: "", corners: "", cpa: "", xg: "", occasions: "", ballonsPerdus: "", ballonsRecuperes: "" },
    goalsScored: [], goalsConceded: [],
    stats: {}, ...fields,
  };
}

export function parseMatchSheet(rows) {
  if (!rows.length) return [];
  const headerRow = rows[0].map(normalizeHeader);
  const idx = (candidates) => headerRow.findIndex((h) => candidates.includes(h));
  const iDate = idx(["date"]);
  const iOpp = idx(["adversaire", "opposant", "equipe"]);
  const iLieu = idx(["lieu", "domicileexterieur", "domicile"]);
  const iComp = idx(["competition"]);
  const iFor = idx(["scorepour", "butspour", "pour"]);
  const iAgainst = idx(["scorecontre", "butscontre", "contre"]);

  return rows.slice(1).filter((r) => r.length && r[iDate]).map((r) => {
    let date = r[iDate];
    if (typeof date === "number") {
      const d = XLSX.SSF.parse_date_code(date);
      date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    } else if (date instanceof Date) {
      date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    } else {
      date = normalizeDateValue(date);
    }
    const lieuRaw = String(iLieu >= 0 ? r[iLieu] || "" : "").toLowerCase();
    return newMatch({
      date,
      opponent: iOpp >= 0 ? String(r[iOpp] || "") : "",
      homeAway: lieuRaw.includes("ext") || lieuRaw.includes("uit") ? "exterieur" : "domicile",
      competition: iComp >= 0 ? String(r[iComp] || "") : "",
      scoreFor: iFor >= 0 && r[iFor] !== undefined ? String(r[iFor]) : "",
      scoreAgainst: iAgainst >= 0 && r[iAgainst] !== undefined ? String(r[iAgainst]) : "",
    });
  }).filter((m) => m.opponent);
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Date", "Adversaire", "Lieu", "Competition", "Score pour", "Score contre"],
    ["2026-08-15", "FC Exemple", "Domicile", "Championnat", "", ""],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Matchs");
  XLSX.writeFile(wb, "modele-matchs.xlsx");
}
