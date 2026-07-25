import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useLang } from "../lib/i18n";
import { formatDate } from "../lib/shared";
import { getTeamNames } from "../lib/leagueHelpers";

export function GlobalSearch({ players, staff, matches, trainings, leagueMatches, setView }) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];

    (players || []).forEach((p) => {
      if (p.name.toLowerCase().includes(q)) out.push({ label: p.name, sub: t("nav_effectif"), view: "joueur:" + p.id });
    });
    (staff || []).forEach((s) => {
      if ((s.name || "").toLowerCase().includes(q)) out.push({ label: s.name, sub: t("nav_staff"), view: "staff" });
    });
    (matches || []).forEach((m) => {
      if ((m.opponent || "").toLowerCase().includes(q)) out.push({ label: `vs ${m.opponent}`, sub: formatDate(m.date), view: "match:" + m.id });
    });
    (trainings || []).forEach((tr) => {
      if ((tr.objective || "").toLowerCase().includes(q)) out.push({ label: tr.objective, sub: formatDate(tr.date), view: "entrainements:" + tr.id });
    });
    getTeamNames(leagueMatches).forEach((name) => {
      if (name.toLowerCase().includes(q)) out.push({ label: name, sub: t("nav_competitors"), view: "competitors:" + name });
    });

    return out.slice(0, 12);
  }, [query, players, staff, matches, trainings, leagueMatches, t]);

  const pick = (r) => {
    setView(r.view);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="global-search">
      <Search size={14} className="global-search-icon" />
      <input
        className="global-search-input"
        placeholder={t("search_placeholder")}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && query.trim().length >= 2 && (
        <div className="search-dropdown">
          {results.length === 0 && <p className="muted" style={{ padding: "10px 12px", fontSize: 12.5, margin: 0 }}>{t("search_no_results")}</p>}
          {results.map((r, i) => (
            <button key={i} className="search-result" onMouseDown={() => pick(r)}>
              <span>{r.label}</span>
              <span className="muted mono">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
