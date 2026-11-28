# MA 3E · Livraison du 28 novembre 2026

## Interfaces et identité

L’accueil présente la prochaine échéance, un rappel avec expiration et les trois dernières publications. Le vert collège #8CBE1B et le blanc dominent. Le bleu #1F72A4 identifie les liens, l’azur #3D8EC7 l’orientation et les focus, et l’orange #E87920 les rappels. Le logo BS fourni est servi à ses proportions d’origine. La navigation passe en bas sur les petits écrans.

## Administration

Ouvrir « Espace enseignant », valider son code e-mail puis le code de l’application d’authentification. Au premier accès, enregistrer la clé TOTP dans cette application et conserver son moyen de récupération en lieu sûr. Les droits de publication sont vérifiés dans la base pour le compte autorisé avec une session de niveau AAL2.

Déposer un PDF de 5 Mo maximum, choisir sa rubrique, sa date et son état. Le brouillon est l’état initial. Un PDF publié pour une date future devient accessible à l’heure programmée. Les PDF du dépôt enseignant sont consultables avec le lien de classe. Pour modifier un fichier, le choisir dans la liste puis sélectionner le nouveau PDF. Pour le retirer de la liste publique, choisir « Archivé ». Les PDF historiques publiés sur GitHub restent à leurs adresses d’origine.

Le formulaire « Échéances et rappels » permet d’ajouter un événement ou un rappel, ses dates incluses et sa rubrique. Le réglage prioritaire sélectionne une échéance pour l’accueil. Un rappel expiré disparaît.

## Déploiement et récupération

La branche main déclenche la publication GitHub Pages. La branche live-data fournit le calendrier collectif et les ressources historiques. APPLE_CALENDAR_URL est configuré côté GitHub Actions. ORIENTATION_CALENDAR_URL est facultatif et accepte un second flux iCloud publié. Vérifier que les titres du flux sont collectifs. Les notes et listes de participants ne sont pas exportées par la synchronisation.

Les branches sauvegarde/avant-studio-20261128 et sauvegarde/donnees-avant-studio-20261128 conservent respectivement le code et les données Git antérieurs. Restaurer les fichiers nécessaires dans une nouvelle branche puis valider et fusionner le correctif. Les sauvegardes Git ne couvrent pas les dépôts Supabase. Les SQL dans backend sont les migrations complémentaires appliquées au schéma privé existant.

## Audit

Tests exécutés sous Chromium 133 sur les quatre écrans aux largeurs 320, 375, 390, 430, 768, 1024, 1280, 1440 et 1920 px. Vérifications du chargement des trois derniers documents, du DNB comme échéance, de la navigation, du filtre DNB, de la recherche « planning », des erreurs JavaScript et du débordement horizontal. Le test utilise les données du dépôt et la date du 28 novembre. Les maquettes ne contiennent pas d’élèves fictifs.

À vérifier avec le titulaire : réception du code e-mail, enrôlement TOTP, dépôt et consultation depuis un second appareil. Safari, Firefox, les appareils physiques, l’installation PWA et la restauration de la base n’ont pas été validés. Les mentions légales, les durées de conservation et le dispositif de sauvegarde doivent être validés avec l’établissement.
