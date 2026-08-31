# Ma 3e — V5 · Apple Calendar + ÉcoleDirecte

Application PWA responsive pour GitHub Pages. Apple Calendar alimente l’agenda général et ÉcoleDirecte alimente une rubrique séparée « Mon emploi du temps ».

## Mise en ligne sur GitHub

1. Créer un dépôt GitHub et déposer **tout le contenu de ce dossier à la racine du dépôt**, y compris le dossier caché `.github`.
2. Dans GitHub, ouvrir **Settings → Secrets and variables → Actions**.
3. Créer le secret `APPLE_CALENDAR_URL`, puis y coller le lien `webcal://` du calendrier Apple public.
4. Créer un second secret nommé `ECOLEDIRECTE_ICAL_URL`, puis y coller le lien `.ics` ÉcoleDirecte.
5. Ouvrir **Settings → Pages** et choisir **GitHub Actions** comme source.
6. Ouvrir **Actions → Synchroniser les calendriers et publier**, puis cliquer une première fois sur **Run workflow**.

Le site se republie ensuite automatiquement toutes les 15 minutes. Les deux calendriers sont aussi resynchronisés après chaque modification envoyée sur la branche `main`.

> Sur Mac, le raccourci `⌘ + ⇧ + .` permet d’afficher le dossier caché `.github` si nécessaire.

## Rubrique « Mon emploi du temps »

- semaine scolaire présentée sous forme de grille sur ordinateur ;
- cartes quotidiennes lisibles sur téléphone ;
- boutons semaine précédente, aujourd’hui et semaine suivante ;
- horaires, matières et salles récupérés depuis ÉcoleDirecte ;
- actualisation automatique et bouton d’actualisation manuelle ;
- dernière version conservée sur l’appareil pour la consultation hors connexion.

## Agenda Apple

- prochaine échéance affichée sur l’accueil ;
- trois prochains rendez-vous dans « Ma semaine » ;
- agenda complet regroupé par mois ;
- ajout, modification et suppression répercutés depuis Apple Calendar.

## Confidentialité

Les deux adresses de calendrier restent dans les secrets GitHub et ne sont jamais inscrites dans le code public. En revanche, `calendar.json` et `timetable.json` sont servis par GitHub Pages : les événements affichés sur le site sont donc accessibles à toute personne qui connaît l’adresse du site.

Utiliser uniquement un emploi du temps de classe et un calendrier Apple dédié, sans note, appréciation, donnée médicale ni information nominative concernant un élève.

## Contenu de l’application

- accueil dynamique vert dominant ;
- agenda Apple automatique ;
- emploi du temps ÉcoleDirecte dans une rubrique dédiée ;
- parcours : vie de classe, orientation, DNB, stage et certifications ;
- espace de documents individuels en maquette ;
- responsive mobile, tablette et ordinateur ;
- PWA installable et utilisable hors connexion après une première ouverture.
