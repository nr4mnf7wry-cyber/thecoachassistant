import { Redis } from "@upstash/redis";
import { getSessionUser, teamDataKey } from "../../lib/auth";

const redis = Redis.fromEnv();

// Sections qu'un assistant "peut modifier" est autorisé à toucher. Tout le reste du site
// (effectif, réglages, comptes, staff, saisons...) doit rester strictement identique
// dans sa requête, sinon la sauvegarde est refusée.
const EDITOR_ALLOWED_KEYS = new Set(["trainings", "availabilities", "injuries", "matches", "currentSeason", "testers"]);

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Détecte toute suppression, à n'importe quel niveau d'imbrication (un but, un exercice,
// un remplaçant à l'intérieur d'un match ou d'une séance compte comme une suppression,
// pas seulement un enregistrement complet retiré).
// Champs qui peuvent librement rétrécir même pour un assistant éditeur : les propositions de
// convocation sont normalement retirées une fois traitées (acceptées, refusées, ou annulées
// par leur auteur), ce n'est pas une suppression de donnée à protéger.
const DELETION_EXEMPT_KEYS = new Set(["proposedSquadChanges"]);

function hasDeletion(oldVal, newVal) {
  if (Array.isArray(oldVal)) {
    const newArr = Array.isArray(newVal) ? newVal : [];
    const oldHasIds = oldVal.every((item) => item && typeof item === "object" && "id" in item);
    if (oldHasIds) {
      const newById = new Map(newArr.filter((item) => item && item.id).map((item) => [item.id, item]));
      for (const item of oldVal) {
        if (!newById.has(item.id)) return true;
        if (hasDeletion(item, newById.get(item.id))) return true;
      }
      return false;
    }
    return newArr.length < oldVal.length;
  }
  if (oldVal && typeof oldVal === "object" && newVal && typeof newVal === "object") {
    for (const k of Object.keys(oldVal)) {
      if (DELETION_EXEMPT_KEYS.has(k)) continue;
      if (hasDeletion(oldVal[k], newVal[k])) return true;
    }
    return false;
  }
  return false;
}

// Un assistant "peut modifier" peut ajouter/modifier dans les sections autorisées, mais jamais
// rien y supprimer (à aucun niveau d'imbrication). Toute autre section doit rester identique.
function validateEditorWrite(oldData, newData) {
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  for (const key of allKeys) {
    const oldVal = oldData ? oldData[key] : undefined;
    const newVal = newData ? newData[key] : undefined;
    if (EDITOR_ALLOWED_KEYS.has(key)) {
      if (hasDeletion(oldVal, newVal)) return false;
    } else if (!deepEqual(oldVal, newVal)) {
      return false;
    }
  }
  return true;
}

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Non connecté." }); return; }
  if (!user.clubId) { res.status(409).json({ error: "Compte non rattaché à une équipe." }); return; }
  const key = teamDataKey(user.clubId);

  if (req.method === "GET") {
    try {
      const data = await redis.get(key);
      res.status(200).json(data || {});
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Impossible de charger les données." });
    }
    return;
  }

  if (req.method === "POST") {
    const isEditor = user.role === "assistant" && user.permissionLevel === "editor";
    if (user.role !== "head" && !isEditor) {
      res.status(403).json({ error: "Lecture seule : tu n'as pas les droits pour modifier." });
      return;
    }
    try {
      if (isEditor) {
        const current = (await redis.get(key)) || {};
        if (!validateEditorWrite(current, req.body)) {
          res.status(403).json({ error: "Cette modification (probablement une suppression) dépasse les droits accordés à ton compte." });
          return;
        }
      }
      await redis.set(key, req.body);
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Impossible d'enregistrer les données." });
    }
    return;
  }

  res.status(405).end();
}
