# Horloges SD · Nexus

Application web pour préparer l'ordre du jour d'une **session de dialogue (SD)** et l'afficher en grand sur l'écran de la salle : heure en direct, point en cours, temps restant, dépassements et programme complet.

## Lancer l'application

**Le plus simple :** double-cliquez sur `index.html`. Tout fonctionne en local, sans installation ni serveur.

**Avec un petit serveur local** (recommandé si vous partagez l'app en réseau) :

```bash
npm start          # ouvre http://localhost:8080 (nécessite Node.js)
# ou, sans Node :
python3 -m http.server 8080
```

**Vérifications :**

```bash
npm test          # 10 tests sur la logique (horaires, pauses, dépassements, modifications en direct)
```

## Utilisation en séance

1. Ouvrez `index.html` sur votre ordinateur et préparez la session : titre, date, heure de début, points et durées. Cochez « Pause » pour les pauses.
2. Cliquez sur **Ouvrir l'affichage de salle**. Placez la nouvelle fenêtre sur l'écran de la salle, puis cliquez sur **Plein écran** (ou touche `F`).
3. Deux façons de suivre la séance :
   - **Sans démarrer** : l'affichage suit l'horaire prévu, comme une horloge.
   - **Avec ▶ Démarrer** : chaque point dure jusqu'à ce que vous passiez au suivant. Les horaires à venir sont recalculés et un dépassement s'affiche en rouge. Cochez « Avance automatique » pour enchaîner sans cliquer.
4. Pendant la séance, modifiez librement le programme : l'affichage de salle se met à jour en une à deux secondes. Le bouton ▶ d'une ligne démarre ou reprend la séance à ce point.

Raccourcis sur l'affichage de salle : `F` plein écran, `→` point suivant, `←` point précédent, `Espace` pause / reprise.

## Fonctionnalités

- Préparation : sessions multiples, ajout / suppression / réordonnancement des points, durée par point, pauses, notes.
- Horaire de début et de fin de chaque point calculé automatiquement.
- Chronomètre : démarrer, pause / reprise, point suivant / précédent, réinitialiser, avance automatique.
- Affichage de salle : grande horloge, date, point en cours, barre de progression, temps restant, point suivant, programme complet (point en cours mis en avant, points terminés grisés, pauses en couleur), dépassement signalé.
- Deux thèmes : **Sombre** et **Nexus** (avec « Powered by Nexus »).
- Écran maintenu allumé avec l'API Wake Lock, et message clair si le navigateur ne la prend pas en charge.
- Enregistrement automatique dans le navigateur, export / import en JSON.
- Deux exemples modifiables : « SD du 12.10 » (08:30 – 11:50, thème sombre) et « SD du 15.10 » (thème Nexus, avec les changements faits en direct notés dans la session).

## Personnaliser les thèmes

Toutes les couleurs et polices sont dans **`css/themes.css`**, un bloc par thème (`[data-theme="nexus"]`, `[data-theme="sombre"]`). Modifiez uniquement les valeurs des variables. Le thème Nexus reprend les couleurs et la police (Manrope) de nexus-lab.ch. Les polices sont chargées depuis Google Fonts ; sans connexion, une police système de repli est utilisée.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page de préparation et de pilotage |
| `salle.html` | Affichage de salle (plein écran) |
| `js/core.js` | Logique pure : horaires, chronomètre, dépassements (testée) |
| `js/store.js` | Enregistrement local et exemples |
| `js/prep.js` | Interface de préparation |
| `js/salle.js` | Interface de salle, plein écran, Wake Lock |
| `css/themes.css` | Couleurs et polices des deux thèmes |
| `css/base.css`, `css/prep.css`, `css/salle.css` | Mise en page |
| `tests/core.test.js` | Vérifications (`npm test`) |

## Choix technique

HTML, CSS et JavaScript sans framework ni étape de compilation. L'app s'ouvre d'un double-clic, fonctionne hors ligne et reste facile à modifier par toute l'équipe. La logique est isolée dans `js/core.js` pour pouvoir la tester avec Node.js.

## Limites connues

- Les données sont stockées dans le navigateur (localStorage) : la préparation et l'affichage doivent être ouverts **dans le même navigateur, sur le même ordinateur**. Pour changer d'ordinateur, utilisez Exporter / Importer.
- La synchronisation entre les deux fenêtres prend jusqu'à 2 secondes.
- Le blocage de la veille dépend du navigateur (Chrome et Edge récents oui ; certains navigateurs non). En cas de doute, désactivez la mise en veille dans les réglages de l'ordinateur.
- Les durées sont des durées réelles : lors d'un changement d'heure en pleine session (nuit du dimanche), l'heure affichée suit l'horloge de l'ordinateur.

## Publier sur GitHub

```bash
cd horloges-sd-nexus
git init && git add . && git commit -m "Horloges SD · première version"
gh repo create horloges-sd-nexus --public --source=. --push
# sans l'outil gh : créez un dépôt vide « horloges-sd-nexus » sur github.com, puis
# git remote add origin https://github.com/<votre-compte>/horloges-sd-nexus.git
# git branch -M main && git push -u origin main
```

Pour la mettre en ligne gratuitement : sur GitHub, ouvrez **Settings → Pages**, choisissez la branche `main` et le dossier `/ (root)`. L'app sera disponible à `https://<votre-compte>.github.io/horloges-sd-nexus/`.
