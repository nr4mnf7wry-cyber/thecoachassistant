import { useLang } from "../lib/i18n";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { uid } from "../lib/shared";
import { findLatestTeamData } from "../lib/leagueHelpers";
import { RosterColumn, CompositionBlock } from "./Competition";

function findOrCreateProfile(profiles, teamName) {
  return profiles.find((p) => p.teamName === teamName) || { id: uid(), teamName, appearances: [], compositions: {} };
}

export function OpponentProfileContent({ teamName, opponentProfiles, setOpponentProfiles, leagueMatches }) {
  const { t } = useLang();
  const profile = findOrCreateProfile(opponentProfiles, teamName);
  const exists = opponentProfiles.some((p) => p.id === profile.id);

  const patch = (fields) => {
    const next = { ...profile, ...fields };
    setOpponentProfiles(exists ? opponentProfiles.map((p) => (p.id === profile.id ? next : p)) : [...opponentProfiles, next]);
  };

  const refreshFromCompetition = () => {
    const latest = findLatestTeamData(leagueMatches, teamName);
    if (!latest) { alert(t("no_recent_competition_data")); return; }
    const appearances = latest.appearances.map((a) => ({ ...a, team: "main" }));
    patch({ appearances, compositions: latest.composition ? { main: latest.composition } : profile.compositions });
  };

  return (
    <div>
      {leagueMatches && leagueMatches.length > 0 && (
        <button className="icon-btn" style={{ marginBottom: 16 }} onClick={refreshFromCompetition}>
          <RefreshCw size={13} /> {t("refresh_from_competition")}
        </button>
      )}

      <RosterColumn teamLabel={teamName} teamName="main" match={profile} patch={patch} showRating allowImport={false} />

      <div className="panel">
        <h3>{t("tab_composition")}</h3>
        <CompositionBlock label={t("comp_base")} variant="base" teamName="main" match={profile} patch={patch} />
        <CompositionBlock label={t("comp_offensive")} variant="offensive" teamName="main" match={profile} patch={patch} optional />
        <CompositionBlock label={t("comp_defensive")} variant="defensive" teamName="main" match={profile} patch={patch} optional />
      </div>
    </div>
  );
}

export function OpponentProfile({ teamName, opponentProfiles, setOpponentProfiles, leagueMatches, setView }) {
  const { t } = useLang();
  return (
    <div>
      <button className="back-link" onClick={() => setView("matchs")}><ChevronLeft size={16} /> {t("matchdetail_back")}</button>
      <div className="view-header">
        <h1>{teamName}</h1>
      </div>
      <OpponentProfileContent teamName={teamName} opponentProfiles={opponentProfiles} setOpponentProfiles={setOpponentProfiles} leagueMatches={leagueMatches} />
    </div>
  );
}
