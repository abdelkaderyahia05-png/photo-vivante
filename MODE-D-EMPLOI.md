# Photo Vivante — mode d'emploi (prototype)

Une photo devient une vidéo verticale qui bouge doucement, à mettre en fond d'écran du téléphone.

## Ouvrir l'appli
- **Sur le PC** : double-clic sur `Lancer Photo Vivante.bat` → la page s'ouvre sur http://127.0.0.1:5660.
  Pour essayer sans choisir de photo : http://127.0.0.1:5660/?demo
- **Sur le téléphone** : **https://abdelkaderyahia05-png.github.io/photo-vivante/** (en ligne depuis le 21/11/2026, gratuit, GitHub Pages).
  Ouvrir le lien dans **Chrome** (Android) ou **Safari** (iPhone) → « Ajouter à l'écran d'accueil » pour l'avoir comme une appli.
  (`?demo` ne marche que sur le PC : la photo de test n'est pas publiée.)
- **Mettre à jour la version en ligne** (après une modification) : dans ce dossier, `git add -A`, `git commit -m "…"`, `git push`.
  En ligne 1 à 2 minutes après. Dépôt public : github.com/abdelkaderyahia05-png/photo-vivante (le dossier `test/` et le `.bat` ne sont pas publiés).
  Penser à changer le numéro `photo-vivante-vN` dans `sw.js` pour que les téléphones prennent la nouvelle version.

## Utiliser
1. **Choisis une photo** (homme, animal, paysage). Plus elle est grande et nette, plus la vidéo est belle.
2. **Aperçu animé** :
   - **Effet 3D · gratuit** : l'appli devine la profondeur de la photo (le sujet devant, le fond derrière) et fait bouger la scène en 3D lente.
     La première fois, elle télécharge son IA de profondeur (quelques dizaines de Mo, une seule fois). Tout se calcule sur l'appareil : la photo ne part nulle part.
     Réglages : force du mouvement, durée de la boucle (5, 8 ou 10 s), type de mouvement (cercle, balancier, zoom qui respire), suivi de l'inclinaison du téléphone (aperçu seulement).
   - **Animation IA · payant** : la personne cligne des yeux, sourit, bouge la tête. Passe par le service **fal.ai** (payant à chaque vidéo, prix affiché sur leur site selon le modèle).
     Il faut un compte fal.ai et une clé API à coller dans l'appli. **Rien n'est envoyé sans clé et sans appui sur le bouton.**
     ⚠️ Cette partie n'a pas encore été testée (pas de clé). La clé reste dans le téléphone ; pour vendre l'appli, il faudra un petit serveur qui garde la clé à l'abri.
3. **Fabriquer la vidéo verticale** : un MP4 1080×1920 qui tourne en boucle sans à-coup.
   **Garder l'appli ouverte et l'écran allumé** pendant la fabrication (5 à 10 s), sinon la vidéo est vide (un message le dit).
   - **Enregistrer dans Photos / Galerie** (sur téléphone) : ouvre le partage → *Enregistrer la vidéo*. Sur iPhone, c'est le seul moyen de la mettre dans Photos.
   - **Enregistrer la vidéo** : téléchargement simple (Android : dossier Téléchargements ; iPhone : appli Fichiers).

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
- `.gitignore`, `.nojekyll` : réglages de la publication GitHub Pages.
- `test/photo-test.png` : photo de test (non publiée) — copie de la photo du formateur du kit de marque.
- Outils utilisés : Transformers.js + modèle Depth Anything V2 Small (gratuits, chargés depuis Internet la première fois).

## Test sur téléphone (à cocher)
| Étape | Android | iPhone |
|---|---|---|
| Le lien s'ouvre, police et couleurs OK | ☐ | ☐ |
| Choix d'une photo (homme ou animal) | ☐ | ☐ |
| Effet 3D : téléchargement de l'IA puis mouvement | ☐ | ☐ |
| Suivi de l'inclinaison (iPhone : accepter l'autorisation) | ☐ | ☐ |
| Fabriquer la vidéo → MP4 de plus de 0,5 Mo | ☐ | ☐ |
| Vidéo enregistrée dans Galerie / Photos | ☐ | ☐ |
| Mise en fond d'écran | ☐ | ☐ |
