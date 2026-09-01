# Ma 3e — V6 · Calendriers et ressources communes

Application PWA responsive publiée sur GitHub Pages pour la 3e Antonio Gaudí. Apple Calendar alimente l’agenda général, ÉcoleDirecte alimente l’emploi du temps et les ressources communes sont publiées au moyen d’un formulaire enseignant.

## Synchronisation des calendriers

- Apple Calendar et ÉcoleDirecte sont vérifiés automatiquement toutes les 5 minutes ;
- les adresses privées restent dans les secrets GitHub `APPLE_CALENDAR_URL` et `ECOLEDIRECTE_ICAL_URL` ;
- le bouton « Vérifier les nouveautés » recharge la dernière version publiée et indique clairement s’il n’y a aucun changement ;
- si le lien iCal ÉcoleDirecte est valide mais vide, le site l’indique au lieu de laisser croire que la synchronisation est en attente ;
- les dernières données reçues restent disponibles hors connexion après une première visite.

Le bouton du site ne peut pas lancer directement une GitHub Action sans exposer un accès privé. La vérification côté serveur est donc automatique, au maximum toutes les 5 minutes selon la disponibilité de GitHub Actions.

## Publier un PDF, un Canva, un formulaire, une vidéo ou un lien

1. Sur le site, ouvrir **Ressources**, puis cliquer sur **Espace enseignant · publier**.
2. Donner un titre à la publication.
3. Choisir sa rubrique et son type.
4. Coller un lien public HTTPS. Pour un PDF commun, glisser le fichier dans la zone « Lien ou fichier » et attendre la fin du téléversement.
5. Vérifier que la ressource ne contient aucune donnée personnelle, puis envoyer le formulaire.

La publication apparaît automatiquement après le prochain déploiement. Pour la modifier, éditer la demande correspondante dans l’onglet **Issues**. Pour la retirer du site, fermer cette demande. Seules les publications créées par le propriétaire du dépôt sont affichées.

## Documents individuels

Les évaluations, fiches personnelles, documents nominatifs et mots de passe ne sont jamais stockés sur ce site. La rubrique **ÉcoleDirecte** renvoie les élèves vers l’espace sécurisé déjà fourni par l’établissement.

## Confidentialité

GitHub Pages est un site public. Utiliser uniquement :

- un calendrier Apple dédié à la classe ;
- un emploi du temps collectif ;
- des PDF et liens destinés à l’ensemble de la classe ;
- des contenus sans nom d’élève, note, appréciation, donnée médicale ou information familiale.

Les fichiers générés `calendar.json`, `timetable.json` et `resources.json` sont publics avec le site. La balise `noindex` limite leur référencement par les moteurs de recherche, mais ne constitue pas un contrôle d’accès.

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` se déclenche :

- après une modification de la branche `main` ;
- après l’ouverture, la modification, la fermeture ou la réouverture d’une publication ;
- automatiquement toutes les 5 minutes ;
- manuellement depuis l’onglet **Actions**.

La source GitHub Pages doit rester réglée sur **GitHub Actions**.
