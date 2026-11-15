# Contribuer à Post it

Merci de vouloir améliorer Post it ! Ce projet est une vitrine de HTML et de CSS modernes : chaque
contribution compte, de la correction d'une faute de frappe à un nouveau composant. Merci de rester
courtois et bienveillant dans les échanges.

## Prérequis

- **Un navigateur récent** : c'est tout ce qu'il faut pour modifier et tester le site.
- **Node.js 22.22 ou plus récent** (avec npm), uniquement pour lancer le lint.
- Conseillé : VS Code avec les extensions recommandées (`.vscode/extensions.json`) pour voir les
  erreurs de stylelint, html-validate et Prettier directement dans l'éditeur.

## Workflow

1. **Forkez** le dépôt puis clonez votre fork.
2. Créez une **branche** depuis `main`, nommée selon ce qu'elle apporte :
   ```bash
   git switch -c feat/sondage-multiple   # nouvelle fonctionnalité
   git switch -c fix/focus-menu          # correction
   ```
3. Codez, testez avec la [checklist](#checklist-avant-la-pull-request), puis lancez `npm run lint`.
4. Ouvrez une **pull request** vers `main` et remplissez le modèle proposé. La CI doit être verte.

Pour un changement important (nouveau composant, refonte d'une section), ouvrez d'abord une issue
pour en discuter.

## Messages de commit

Nous suivons les [Conventional Commits](https://www.conventionalcommits.org/fr/), en français ou
en anglais : `type(portée): description`.

```text
feat(post): ajoute les réactions en popover
fix(composer): rend le bouton Envoyer accessible au clavier
docs: complète la recette « Ajouter une icône »
```

Types courants : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `chore`, `ci`.

## Conventions

### Principes

- **Pas de framework, pas de build** : ce que vous écrivez est exactement ce que le navigateur
  reçoit. Aucune dépendance à l'exécution.
- **HTML sémantique d'abord** : le bon élément (`<button>`, `<a>`, `<article>`, `<time>`,
  `<fieldset>`…) avant tout attribut ARIA.
- Noms de classes, d'identifiants et de variables en **anglais** ; commentaires, documentation et
  interface en **français**.
- **Composants partagés d'abord** : avant de créer un style, regardez la page
  [`composants.html`](composants.html), qui présente tout le kit (boutons, cartes, champs, onglets,
  menus, dialogues…).

### Blocs partagés (`partials/`)

Le `<head>`, l'en-tête (`topbar` : logo, recherche, menus, notifications, compte), la colonne de
gauche (`sidebar` : profil, raccourcis), le lien d'évitement, le toast et le sprite d'icônes sont identiques
sur toutes les pages. Ils sont écrits **une seule fois** dans `partials/` puis recopiés dans chaque
page, entre deux marqueurs :

```html
<!-- partial:topbar -->
…contenu généré, ne pas modifier ici…
<!-- /partial:topbar -->
```

- Modifiez le fichier de `partials/` (ou une icône de `assets/icons/`), puis lancez
  **`npm run sync`** : toutes les pages sont mises à jour. Commitez le résultat.
- Le lien actif est déduit de `<body data-page="…">` (valeurs : `fil`, `profil`, `messages`,
  `forums`, `amis`, `agenda`, `parametres`, `composants`) : dans l'en-tête et la colonne de
  gauche, le script ajoute `aria-current="page"` aux liens dont le `data-nav` correspond.
- Un élément « collant » (`position: sticky`) doit tenir compte de l'en-tête :
  `inset-block-start: var(--sticky-offset)` (hauteur de l'en-tête, nulle sur mobile).
- La CI vérifie que les pages sont à jour (`npm run lint:sync`).
- Pourquoi pas un `fetch` ou des Web Components ? Pour que le site fonctionne en ouvrant les
  fichiers directement depuis le disque (`file://`), sans serveur.

### CSS

- **Cascade layers** : l'ordre est déclaré une seule fois, en tête de `assets/css/tokens.css` :
  `@layer reset, tokens, base, layout, components, utilities;`. Chaque fichier place ses règles
  dans sa couche.
- **Tokens uniquement** : couleurs, espacements, rayons (et ombres) passent par les variables de
  `assets/css/tokens.css` — jamais de valeur codée en dur dans un composant. Besoin d'une nouvelle
  valeur ? Ajoutez un token.
- **Nommage façon BEM** : `.post`, `.post__header`, `.post--featured`. Les états passent par des
  attributs ARIA ou `data-*` (`[aria-pressed="true"]`, `[data-tone="sky"]`) plutôt que par des
  classes.
- **Nesting natif**, sur **3 niveaux au maximum**.
- **Propriétés logiques** : `margin-inline`, `padding-block`, `inset-inline-start`,
  `inline-size`…
- **Couleurs en OKLCH avec `light-dark()`** : le thème sombre se règle dans les tokens, pas dans
  les composants.
- Les fonctionnalités récentes (anchor positioning, `<select>` personnalisable…) s'utilisent sous
  `@supports`, avec un repli fonctionnel.
- Toute animation respecte `prefers-reduced-motion`.

```css
/* utilities.css : l'attribut data-tone="mint" fournit la variable --tone… */
[data-tone='mint'] {
  --tone: var(--tone-mint);
}

/* …que le composant lit, avec une valeur par défaut */
@layer components {
  .post {
    padding: var(--space-5);
    background-color: var(--tone, var(--tone-sky));
    border-radius: var(--radius-lg);
  }
}
```

### JavaScript

- **Amélioration progressive uniquement** : la page doit rester utilisable sans JavaScript (les
  filtres, le sondage et les popovers fonctionnent en HTML/CSS).
- **Script classique** chargé avec `defer`, **pas de module ES** : le site doit fonctionner en
  ouvrant les pages directement (`file://`), où les modules sont bloqués.
- `assets/js/app.js` est commun à toutes les pages ; chaque page peut ajouter **son** script
  (`assets/js/forums.js`…), chargé après lui dans son `<head>`.
- JavaScript natif, sans dépendance. Jamais d'`innerHTML` avec un texte saisi : `textContent`.

`app.js` expose une petite API, `window.postit`, pour les scripts de page :

```js
;(() => {
  'use strict'
  const { notify, register, closePopover, prefersReducedMotion, ME } = window.postit

  // <button type="button" data-action="archive">Archiver</button>
  register('archive', (button, event) => {
    closePopover(button) // ferme le menu qui contient le bouton, s'il y en a un
    notify('Conversation archivée') // toast, aussi lu par les lecteurs d'écran
  })
})()
```

Actions déjà disponibles partout via `data-action` : `like`, `react`, `follow` (avec `data-name`),
`save`, `report`, `copy-link`, `notify` (avec `data-message`), `comment`, `reply`. Un lien de
démonstration `href="#quelque-chose"` sans cible affiche un toast « bientôt disponible ».

## Recettes

### Ajouter une publication

1. Dans `index.html`, copiez un bloc `<article class="post">` existant du fil.
2. Modifiez l'auteur, l'avatar, la date (`<time datetime="…">`) et le texte.
3. Choisissez la couleur de fond avec `data-tone` : `sky`, `cream`, `mint` ou `lilac`.
4. Réglez les filtres du fil :
   - `data-friend` : la publication apparaît dans l'onglet **Amis** ;
   - `data-popular` : elle apparaît dans l'onglet **Populaires** ;
   - sans ces attributs, elle n'apparaît que dans **Récents**.
5. Rendez les `id` uniques (menu, popover, `aria-labelledby`…) : html-validate vérifie que chaque
   référence pointe vers un `id` existant.

```html
<article class="post" data-tone="mint" data-friend data-popular>…</article>
```

### Ajouter une icône

1. Choisissez l'icône sur [Phosphor Icons](https://phosphoricons.com) (licence MIT), dans la même
   graisse que ses voisines (`fill`, `bold` ou `regular`).
2. Enregistrez le SVG dans `assets/icons/nom.svg`, au même format que ses voisins
   (`viewBox="0 0 256 256"`, `fill="currentColor"`).
3. Lancez `npm run sync` : l'icône est ajoutée au sprite intégré dans chaque page (une référence
   externe, `sprite.svg#icon-nom`, ne fonctionnerait pas en `file://`).
4. Utilisez-la ainsi (la page [`composants.html`](composants.html) liste toutes les icônes et
   copie ce code au clic) :

```html
<svg class="icon" aria-hidden="true"><use href="#icon-nom"></use></svg>
```

Une icône seule dans un bouton ou un lien est décorative : donnez au bouton un nom accessible
(`aria-label="Fermer"`).

### Ajouter une image

- Format **WebP**, **moins de 150 Ko**, aux dimensions réellement affichées (avatars en 160 × 160).
- **Licence libre uniquement** (Unsplash License, CC0…) : jamais d'image protégée par le droit
  d'auteur.
- Ajoutez une ligne dans [`CREDITS.md`](CREDITS.md) : auteur, lien et licence.
- Toujours `width` et `height` (pas de décalage de mise en page), et un `alt` qui décrit l'image —
  ou `alt=""` si elle est purement décorative. Ajoutez `loading="lazy"` sous la ligne de flottaison.
- Pour convertir et compresser sans rien installer : [Squoosh](https://squoosh.app).

### Ajouter un composant

1. Créez `assets/css/components/mon-composant.css` et placez toutes ses règles dans
   `@layer components { … }`. Vérifiez que le nom du bloc n'est pas déjà pris.
2. Composant **propre à une page** : liez-le dans le `<head>` de cette page, après le bloc
   `partial:head`. Composant **partagé** : ajoutez le lien dans `partials/head.html`, lancez
   `npm run sync`, et présentez-le dans `composants.html`.
3. Utilisez uniquement les tokens et vérifiez le rendu en clair comme en sombre.

### Ajouter une page

1. Copiez une page proche (par exemple `amis.html`) et changez `<title>`, la description et
   `<body data-page="…">`.
2. Gardez les marqueurs `<!-- partial:… -->` tels quels (même vides) et lancez `npm run sync`.
3. Gardez un seul `<h1>` (dans `<header class="page-header">`) et un `<main id="main" tabindex="-1">`,
   cible du lien d'évitement.
4. Sans colonne de droite (`<aside class="aside">`), la colonne de gauche et le contenu se
   partagent la largeur ; avec elle, la colonne de gauche n'apparaît qu'à partir de 80rem.
5. Pour l'ajouter aux menus, modifiez `partials/topbar.html` (ou les raccourcis de
   `partials/sidebar.html`) avec un `data-nav` unique, puis `npm run sync`.

## Lint

```bash
npm install            # une seule fois
npm run lint           # tout vérifier, comme la CI
npm run sync           # met à jour les blocs partagés dans toutes les pages
npm run lint:sync      # vérifie que les pages sont à jour
npm run lint:css       # stylelint (assets/css)
npm run lint:html      # html-validate (toutes les pages)
npm run lint:format    # Prettier en mode vérification
npm run format         # reformate CSS, JS, JSON, Markdown et YAML
npx stylelint "assets/css/**/*.css" --fix   # corrige automatiquement ce qui peut l'être
```

Quelques règles qui surprennent souvent :

- **CSS** : `oklch(70% 0.12 250deg)` (luminosité et alpha en `%`, teinte en `deg`), media queries
  en syntaxe d'intervalle (`@media (width >= 48rem)`), `currentcolor` en minuscules, une ligne vide
  entre deux règles. `--fix` corrige la plupart de ces points.
- **HTML** : chaque `<button>` a un `type`, les balises vides ne se ferment pas (`<img …>` et non
  `<img … />`), chaque contrôle a un `<label>`, un bouton icône a un `aria-label`, les titres ne
  sautent pas de niveau et `&` s'écrit `&amp;`.
- **Attribut `pattern`** : les navigateurs le lisent avec le drapeau `v` des expressions
  régulières, plus strict. Dans une classe de caractères, échappez `-`, `(`, `)`… ou préférez une
  classe simple (`\+?[0-9 ]{6,20}`), sinon la console affiche une erreur et le champ n'est pas
  validé.
- Un `<dialog>` est souvent hors de `<main>` : utilisez `<div class="dialog__header">` et non
  `<header>`, qui créerait un deuxième repère « bannière ».
- Le HTML n'est pas reformaté par Prettier : indentez-le à la main (2 espaces).

## Checklist avant la pull request

- [ ] Rendu vérifié de **360 px à 1600 px** de large
- [ ] Testé en thème **clair** et en thème **sombre**
- [ ] Tout est utilisable **au clavier**, avec un focus visible
- [ ] **Aucune erreur** dans la console du navigateur
- [ ] Le **mode sans JavaScript** reste utilisable (désactivez-le dans les outils de développement)
- [ ] **`npm run lint` passe**
- [ ] Les nouvelles images sont créditées dans `CREDITS.md`
