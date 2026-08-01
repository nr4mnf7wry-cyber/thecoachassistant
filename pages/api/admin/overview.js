import { Redis } from "@upstash/redis";
import { getSessionUser, getUsers, getClubs, teamDataKey } from "../../../lib/auth";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  try {
    const user = await getSessionUser(req);
    if (!user) { res.status(401).json({ error: "Non connecté." }); return; }
    if (!process.env.SUPER_ADMIN_USERNAME || user.username !== process.env.SUPER_ADMIN_USERNAME) {
      res.status(403).json({ error: "Accès réservé." });
      return;
    }

    const [clubs, allUsers, feedback] = await Promise.all([
      getClubs(),
      getUsers(),
      redis.get("app-feedback"),
    ]);

    const clubDetails = await Promise.all(clubs.map(async (club) => {
      const usersInClub = allUsers.filter((u) => u.clubId === club.id);
      let teamData = null;
      try { teamData = await redis.get(teamDataKey(club.id)); } catch (e) { teamData = null; }
      return {
        id: club.id,
        name: club.name,
        createdAt: club.createdAt,
        userCount: usersInClub.length,
        headCoach: usersInClub.find((u) => u.role === "head")?.username || "—",
        playersCount: teamData?.players?.length || 0,
        matchesCount: teamData?.matches?.length || 0,
        trainingsCount: teamData?.trainings?.length || 0,
      };
    }));

    res.status(200).json({
      clubs: clubDetails.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      feedback: (feedback || []).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 100),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
}
