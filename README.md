# Open Golf Connect

Maquette statique pour une compétition en shamble à 2 au Golf de Joyenval.

## Contenu

- Binômes préconfigurés : Lucho & Thib, Nanou & Pierrot.
- Connexion simple : administrateur ou joueur.
- Seul l'administrateur prépare et valide le parcours.
- Un joueur ne voit que son binôme pour la saisie et la synthèse.
- La saisie reste cloisonnée par binôme, mais la synthèse affiche les deux binômes, le cumul A+B et tous les joueurs.
- Chaque trou peut être validé depuis la carte de score avant de passer au suivant.
- La synthèse indique les trous validés et le trou en cours de chaque binôme, utile pour un départ en shotgun.
- Texte d'accueil inspiré de la communication officielle : shotgun à 13h et concours de trou en 1 pour un séjour en demi-pension au Dinarobin à l'île Maurice offert par Beachcomber.
- Synchronisation temps réel via Supabase : tous les profils connectés partagent l'état `open-golf-connect-2026`.
- Application installable sur l'écran d'accueil du téléphone grâce au manifest PWA, aux icônes et au service worker.
- Handicaps officiels modifiables avant le départ.
- Parcours composite Marly / Retz configurable trou par trou, avec par et SIF remplis automatiquement.
- Validation du parcours avant lancement de la carte de score.
- Auto-marquage par binôme avec choix du marqueur dans le binôme.
- Saisie avec drive retenu, score brut et nombre de putts.
- Synthèse : score du binôme A, score du binôme B, cumul A+B et statistiques individuelles.

## Accès maquette

- Administrateur : `admin2026`
- Lucho : `lucho2026`
- Thib : `thib2026`
- Nanou : `nanou2026`
- Pierrot : `pierrot2026`

## Lancement

Ouvrir `index.html` directement dans un navigateur, ou lancer un serveur statique dans ce dossier.
