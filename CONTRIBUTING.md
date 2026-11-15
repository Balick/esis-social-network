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
- **Script classique** chargé avec `<script src="assets/js/app.js" defer>`, **pas de module ES** :
  le site doit fonctionner en ouvrant `index.html` directement (`file://`), où les modules sont
  bloqués.
- JavaScript natif, sans dépendance.

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
2. Enregistrez le SVG source dans `assets/icons/`.
3. Ajoutez un `<symbol id="icon-nom" viewBox="0 0 256 256">` (tracés en `fill="currentColor"`)
   **dans `assets/icons/sprite.svg` et dans le sprite intégré en haut de `index.html`**. C'est la
   copie intégrée que la page utilise : une référence externe (`sprite.svg#icon-nom`) ne fonctionne
   pas en `file://`.
4. Utilisez-la ainsi :

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

1. Créez `assets/css/components/mon-composant.css`.
2. Placez toutes ses règles dans `@layer components { … }`.
3. Liez-le dans le `<head>` de `index.html`, après les autres composants :
   `<link rel="stylesheet" href="assets/css/components/mon-composant.css">`.
4. Utilisez uniquement les tokens et vérifiez le rendu en clair comme en sombre.

## Lint

```bash
npm install            # une seule fois
npm run lint           # tout vérifier, comme la CI
npm run lint:css       # stylelint (assets/css)
npm run lint:html      # html-validate (index.html)
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
- Le HTML n'est pas reformaté par Prettier : indentez-le à la main (2 espaces).

## Checklist avant la pull request

- [ ] Rendu vérifié de **360 px à 1600 px** de large
- [ ] Testé en thème **clair** et en thème **sombre**
- [ ] Tout est utilisable **au clavier**, avec un focus visible
- [ ] **Aucune erreur** dans la console du navigateur
- [ ] **`npm run lint` passe**
- [ ] Les nouvelles images sont créditées dans `CREDITS.md`
