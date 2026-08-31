# Ma 3e - prototype GitHub Pages

Prototype statique responsive d'une application de professeur principal / espace élève.

## Mise en ligne sur GitHub Pages
1. Créer un dépôt GitHub, par exemple `ma-3e`.
2. Déposer tous les fichiers de ce dossier à la racine du dépôt.
3. Dans GitHub : **Settings > Pages**.
4. Choisir **Deploy from a branch** puis `main` / `/root`.
5. Enregistrer.

## Fichiers
- `index.html` : structure de l'application
- `styles.css` : charte graphique et responsive
- `app.js` : navigation et interactions
- `manifest.webmanifest` : installation en PWA
- `sw.js` : cache hors ligne minimal

## Couleurs utilisées
- #96C22B : vert principal
- #E0ECC4 : vert clair
- #378EC6 : bleu secondaire
- #0076AC : bleu principal
- #E67D19 : orange
- #F8D8C0 : orange clair

## À connecter ensuite
Ce prototype n'a pas encore de backend. Pour une vraie version multi-utilisateurs / RGPD, il faudra ajouter :
- authentification,
- base de données,
- stockage sécurisé des documents,
- rôles professeur / élève / parent,
- synchronisation du calendrier Apple/iCloud,
- espace d'administration professeur.
