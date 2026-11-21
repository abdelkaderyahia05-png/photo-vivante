# Photo Vivante — mode d'emploi (prototype)

Une photo devient une vidéo verticale qui bouge doucement, à mettre en fond d'écran du téléphone.

## Ouvrir l'appli
- **Sur le PC** : double-clic sur `Lancer Photo Vivante.bat` → la page s'ouvre sur http://127.0.0.1:5660.
  Pour essayer sans choisir de photo : http://127.0.0.1:5660/?demo
- **Sur le téléphone** : l'appli doit être en ligne en **https** (sinon le téléphone bloque l'inclinaison et l'installation).
  Le plus simple : la mettre gratuitement sur GitHub Pages ou Netlify (il faut un compte, à décider par vous).
  Une fois en ligne : ouvrir le lien dans Chrome (Android) ou Safari (iPhone) → « Ajouter à l'écran d'accueil ».

## Utiliser
1. **Choisis une photo** (homme, animal, paysage). Plus elle est grande et nette, plus la vidéo est belle.
2. **Aperçu animé** :
   - **Effet 3D · gratuit** : l'appli devine la profondeur de la photo (le sujet devant, le fond derrière) et fait bouger la scène en 3D lente.
     La première fois, elle télécharge son IA de profondeur (quelques dizaines de Mo, une seule fois). Tout se calcule sur l'appareil : la photo ne part nulle part.
     Réglages : force du mouvement, durée de la boucle (5, 8 ou 10 s), type de mouvement (cercle, balancier, zoom qui respire), suivi de l'inclinaison du téléphone (aperçu seulement).
   - **Animation IA · payant** : la personne cligne des yeux, sourit, bouge la tête. Passe par le service **fal.ai** (payant à chaque vidéo, prix affiché sur leur site selon le modèle).
     Il faut un compte fal.ai et une clé API à coller dans l'appli. **Rien n'est envoyé sans clé et sans appui sur le bouton.**
     ⚠️ Cette partie n'a pas encore été testée (pas de clé). La clé reste dans le téléphone ; pour vendre l'appli, il faudra un petit serveur qui garde la clé à l'abri.
3. **Fabriquer la vidéo verticale** → **Enregistrer la vidéo** : un MP4 1080×1920 qui tourne en boucle sans à-coup.

## Mettre en fond d'écran
**Android**
- Samsung : Galerie → ouvrir la vidéo → ⋮ → *Définir comme fond d'écran* → *Écran de verrouillage*.
- Autres marques : selon le modèle, menu Fond d'écran → « Vidéo » ou « Animé ». Sinon, une appli gratuite de fond d'écran vidéo.

**iPhone**
- L'iPhone n'accepte pas une vidéo directement : la transformer en **Live Photo** (ex. appli gratuite « intoLive »).
- Réglages → Fond d'écran → Ajouter → choisir la Live Photo. Selon la version d'iOS, elle bouge en appuyant longtemps sur l'écran verrouillé.
- Une appli ne peut pas changer le fond d'écran d'un iPhone toute seule : c'est toujours la personne qui le règle.

## Fichiers
- `index.html`, `style.css`, `app.js` : l'appli. `sw.js` + `manifest.webmanifest` + `icones/` : appli installable (PWA).
- `test/photo-test.png` : photo de test (copie de la photo du formateur du kit de marque).
- Outils utilisés : Transformers.js + modèle Depth Anything V2 Small (gratuits, chargés depuis Internet la première fois).
