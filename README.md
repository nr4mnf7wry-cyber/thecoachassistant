# Site de l'équipe — guide de mise en ligne

Ce dossier contient un vrai site web (Next.js) avec :
- Toutes les vues que tu connais déjà (effectif, matchs, entraînements, cardio, statistiques)
- Une vraie base de données en ligne (tes données ne dépendent plus de Claude)
- Une page de connexion par mot de passe pour que le site reste privé

Tu n'as **aucune installation à faire sur ton ordinateur**. Tout se passe dans le navigateur, via deux sites gratuits : GitHub (pour héberger le code) et Vercel (pour le mettre en ligne).

Compte 15-20 minutes pour l'ensemble.

---

## Étape 1 — Créer un compte GitHub

1. Va sur [github.com](https://github.com) et clique sur **Sign up**.
2. Choisis un nom d'utilisateur, ton email, un mot de passe. Le plan gratuit suffit largement.

## Étape 2 — Mettre le code sur GitHub

1. Une fois connecté, clique sur le **+** en haut à droite puis **New repository**.
2. Nom du repository : `equipe-stats`. Coche **Private** (pour que le code ne soit pas public). Clique **Create repository**.
3. Sur la page qui s'affiche, cherche le lien **uploading an existing file** (ou **Add file → Upload files**).
4. Ouvre le dossier `equipe-site` que je t'ai fourni sur ton ordinateur, sélectionne **tout son contenu** (tous les fichiers et dossiers : `pages`, `middleware.js`, `package.json`, etc.) et glisse-les dans la zone de dépôt GitHub.
5. Descends en bas de page, laisse le message par défaut, clique **Commit changes**.

## Étape 3 — Créer un compte Vercel et connecter le projet

1. Va sur [vercel.com](https://vercel.com) et clique **Sign Up** → choisis **Continue with GitHub**. Ça relie directement les deux comptes.
2. Sur ton tableau de bord Vercel, clique **Add New… → Project**.
3. Tu vois apparaître le repository `equipe-stats` → clique **Import**.
4. Vercel détecte automatiquement qu'il s'agit d'un projet Next.js. Laisse tous les réglages par défaut.
5. Clique **Deploy**. Le premier déploiement prend une à deux minutes. (Le site affichera une erreur sur les pages de données tant que les étapes 4 et 5 ci-dessous ne sont pas faites — c'est normal.)

## Étape 4 — Créer la base de données (via le Marketplace Vercel)

Vercel a retiré son ancien produit "KV" ; la base de données se crée maintenant via le **Marketplace**, mais le résultat est identique et gratuit pour ce genre d'usage.

1. Dans ton projet Vercel, va dans l'onglet **Storage**.
2. Clique **Create Database** (ou **Browse Marketplace**).
3. Choisis le fournisseur **Upstash** (base Redis) — cherche "Redis" ou "Upstash" si tu ne le vois pas directement.
4. Suis l'assistant : choisis le plan **gratuit** (Free), donne un nom (ex. `equipe-db`), clique **Continue/Create**.
5. Quand on te demande à quel(s) projet(s) connecter la base, sélectionne `equipe-stats` → confirme.
6. Vercel ajoute automatiquement les variables nécessaires à ton projet (tu n'as rien à copier toi-même).

## Étape 5 — Définir ton mot de passe d'accès

1. Toujours dans ton projet Vercel, va dans **Settings → Environment Variables**.
2. Ajoute une variable :
   - **Name** : `SITE_PASSWORD`
   - **Value** : le mot de passe que tu veux utiliser (choisis quelque chose que tu peux partager facilement si besoin, mais pas trivial)
3. Clique **Save**.

## Étape 6 — Relancer le déploiement

1. Va dans l'onglet **Deployments**.
2. Sur le déploiement le plus récent, clique le menu **⋯ → Redeploy** pour que les nouvelles variables (base de données + mot de passe) soient prises en compte.

## Étape 7 — C'est en ligne

1. En haut de la page projet, Vercel affiche ton URL, du type `https://equipe-stats-xxxx.vercel.app`.
2. Ouvre-la, entre ton mot de passe, et retrouve ton site — cette fois avec une vraie adresse que tu peux ouvrir depuis ton téléphone, au bord du terrain.

---

## Pour la suite

- **Mettre à jour le design ou ajouter une fonctionnalité** : redemande-moi le code modifié, puis remplace les fichiers concernés directement dans GitHub (ouvre le fichier dans le repository, clique le crayon **Edit**, colle le nouveau contenu, **Commit**). Vercel redéploie automatiquement à chaque modification.
- **Nom de domaine personnalisé** (ex. `monequipe.be`) : achète-le chez un registrar (ex. combell.com, one.com), puis dans Vercel va dans **Settings → Domains**, ajoute ton domaine et suis les instructions DNS affichées.
- **Sécurité** : la protection par mot de passe ici est volontairement simple (adaptée à un usage d'équipe amateur). Si tu veux un jour un vrai système de comptes par joueur, on pourra passer à une solution d'authentification plus poussée.
