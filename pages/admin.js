import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Admin() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) { setError(json.error || "Erreur"); return; }
        setData(json);
      })
      .catch(() => setError("Erreur de connexion."));
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", fontFamily: "sans-serif", color: "#14171F" }}>
      <h1 style={{ marginBottom: 4 }}>Administration</h1>
      <p style={{ color: "#667085", marginBottom: 24 }}>
        <button onClick={() => router.push("/")} style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", padding: 0 }}>← Retour au site</button>
      </p>

      {error && <p style={{ color: "#DC2626" }}>{error}</p>}
      {!data && !error && <p style={{ color: "#667085" }}>Chargement…</p>}

      {data && (
        <>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Équipes ({data.clubs.length})</h2>
          <div style={{ overflowX: "auto", marginBottom: 32 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #E2E5EA" }}>
                  {["Équipe", "Créée le", "Entraîneur principal", "Comptes", "Joueurs", "Matchs", "Séances"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", color: "#667085", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clubs.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #E2E5EA" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: "8px 10px" }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{c.headCoach}</td>
                    <td style={{ padding: "8px 10px" }}>{c.userCount}</td>
                    <td style={{ padding: "8px 10px" }}>{c.playersCount}</td>
                    <td style={{ padding: "8px 10px" }}>{c.matchesCount}</td>
                    <td style={{ padding: "8px 10px" }}>{c.trainingsCount}</td>
                  </tr>
                ))}
                {data.clubs.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "12px 10px", color: "#667085" }}>Aucune équipe encore inscrite.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Signalements récents ({data.feedback.length})</h2>
          {data.feedback.length === 0 && <p style={{ color: "#667085" }}>Aucun signalement.</p>}
          {data.feedback.map((f) => (
            <div key={f.id} style={{ padding: "10px 0", borderBottom: "1px solid #E2E5EA", fontSize: 13.5 }}>
              <div style={{ color: "#667085", fontSize: 12, marginBottom: 3 }}>
                {f.username} · {new Date(f.at).toLocaleString()}
              </div>
              <div>{f.message}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
