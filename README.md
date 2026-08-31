# Ma 3e — V4 · Calendrier Apple

Application PWA responsive pour GitHub Pages. Apple Calendar reste le calendrier maître : les événements sont synchronisés automatiquement vers l’accueil et l’agenda du site.

## Mise en ligne sur GitHub

1. Créer un dépôt GitHub et déposer **tout le contenu de ce dossier à la racine du dépôt**, y compris le dossier caché `.github`.
2. Dans GitHub, ouvrir **Settings → Secrets and variables → Actions**.
3. Cliquer sur **New repository secret**.
4. Nom du secret : `APPLE_CALENDAR_URL`.
5. Valeur : coller le lien `webcal://` du calendrier public Apple, puis enregistrer.
6. Ouvrir **Settings → Pages** et choisir **GitHub Actions** comme source.
7. Ouvrir **Actions → Synchroniser Apple Calendar et publier**, puis cliquer une première fois sur **Run workflow**.

Le site se republie ensuite automatiquement toutes les 15 minutes. Les événements Apple sont aussi resynchronisés à chaque modification envoyée sur la branche `main`.

> Sur Mac, le raccourci `⌘ + ⇧ + .` permet d’afficher le dossier caché `.github` si nécessaire.

## Fonctionnement de l’agenda

- prochaine échéance affichée sur l’accueil ;
- trois prochains rendez-vous dans « Ma semaine » ;
- agenda complet regroupé par mois ;
- ajout, modification et suppression répercutés depuis Apple Calendar ;
- bouton d’actualisation dans l’application ;
- dernière version conservée sur l’appareil pour la consultation hors connexion ;
- aucune adresse iCloud inscrite dans le code public.

## Confidentialité

Le fichier `calendar.json` publié contient uniquement les informations visibles dans l’agenda du site. Le calendrier Apple dédié ne doit donc contenir aucune note, appréciation, donnée médicale ou information nominative concernant un élève.

## Contenu de l’application

- accueil dynamique vert dominant ;
- agenda Apple automatique ;
- parcours : vie de classe, orientation, DNB, stage et certifications ;
- espace de documents individuels en maquette ;
- responsive mobile, tablette et ordinateur ;
- PWA installable et utilisable hors connexion après une première ouverture.
