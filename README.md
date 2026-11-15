<div align="center">

# Post it

**Une interface de réseau social open source** — vitrine HTML/CSS moderne,
sans framework ni étape de build.

[![CI](https://github.com/Balick/post-it/actions/workflows/ci.yml/badge.svg)](https://github.com/Balick/post-it/actions/workflows/ci.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)
![Sans framework](https://img.shields.io/badge/sans_framework-z%C3%A9ro_d%C3%A9pendance-2ea44f)
![HTML5](https://img.shields.io/badge/HTML5-s%C3%A9mantique-e34f26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-moderne-663399?logo=css&logoColor=white)

[**Voir la démo**](https://balick.github.io/post-it/) ·
[Contribuer](CONTRIBUTING.md) ·
[Signaler un bug](https://github.com/Balick/post-it/issues/new/choose)

</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshot-dark.webp">
  <img src="docs/screenshot-light.webp" alt="Interface de Post it : menu latéral, fil d'actualité avec publications colorées, stories, suggestions et recommandations">
</picture>

**Post it** est un template complet d'interface de réseau social — fil d'actualité, profil,
messagerie, forums, amis, agenda, paramètres, connexion… — pensé pour montrer tout ce que le HTML et
le CSS savent faire seuls aujourd'hui. Pas de React, pas de bundler, pas de dépendance à
l'exécution : des pages HTML, des feuilles de style et quelques lignes de JavaScript facultatives.
Le projet est ouvert à tous : servez-vous-en comme base, comme terrain d'apprentissage ou comme
référence.

> [!NOTE]
> La [démo en ligne](https://balick.github.io/post-it/) est active dès que GitHub
> Pages est activé sur le dépôt (**Settings → Pages → Source : « GitHub Actions »**). Le workflow
> `pages.yml` la redéploie ensuite à chaque push sur `main`.

## Les pages

| Page                                                                                                                                                                                                             | Contenu                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Fil d'actualité](https://balick.github.io/post-it/)                                                                                                                                                             | Fil filtrable sans JavaScript (`:has()`), publications avec galerie, réactions en popover, sondage en CSS pur, commentaires, compositeur, stories, suggestions |
| [Profil](https://balick.github.io/post-it/profil.html)                                                                                                                                                           | Couverture, statistiques, onglets 100 % CSS, modification du profil dans un `<dialog>`                                                                         |
| [Messages](https://balick.github.io/post-it/messages.html)                                                                                                                                                       | Conversations et fil de discussion, envoi de messages, liste / détail adaptés au mobile                                                                        |
| [Forums](https://balick.github.io/post-it/forums.html)                                                                                                                                                           | Catégories et filtres en CSS pur, liste de sujets, création d'un sujet dans un `<dialog>`                                                                      |
| [Sujet de forum](https://balick.github.io/post-it/forum-sujet.html)                                                                                                                                              | Fil d'Ariane, votes, blocs de code, réponse acceptée, formulaire de réponse                                                                                    |
| [Amis](https://balick.github.io/post-it/amis.html)                                                                                                                                                               | Demandes d'amis, recherche et tri, filtre « en ligne », suggestions, invitation                                                                                |
| [Agenda](https://balick.github.io/post-it/agenda.html)                                                                                                                                                           | Calendrier mensuel navigable au clavier, événements filtrables, création d'un événement                                                                        |
| [Paramètres](https://balick.github.io/post-it/parametres.html)                                                                                                                                                   | Compte, confidentialité, notifications, apparence (thème), interrupteurs natifs                                                                                |
| [Connexion](https://balick.github.io/post-it/connexion.html), [inscription](https://balick.github.io/post-it/inscription.html), [mot de passe oublié](https://balick.github.io/post-it/mot-de-passe-oublie.html) | Validation native avec `:user-invalid`, jauge de mot de passe, affichage du mot de passe                                                                       |
| [404](https://balick.github.io/post-it/404.html)                                                                                                                                                                 | Page d'erreur illustrée, servie automatiquement par GitHub Pages                                                                                               |
| [Composants](https://balick.github.io/post-it/composants.html)                                                                                                                                                   | Le guide du kit d'interface : couleurs, typographie, icônes, boutons, formulaires, menus…                                                                      |

Partout : **thème clair / sombre** (réglage du système ou choix manuel mémorisé), **responsive** du
mobile (360 px) au grand écran, et navigation complète **au clavier**.

## Ce que le projet démontre

- **Cascade layers** (`@layer`) — un ordre de priorité explicite, fini les guerres de spécificité.
- **Design tokens** en propriétés personnalisées — couleurs, espacements et rayons définis une fois.
- **OKLCH, `light-dark()`, `color-mix()`** — des couleurs cohérentes et un thème sombre sans doublon.
- **`:has()`** — le parent réagit à son contenu : filtres du fil et sondage sans JavaScript.
- **Container queries** — chaque composant s'adapte à la place dont il dispose, pas à la fenêtre.
- **API Popover + anchor positioning** — menus et réactions accessibles, placés par le CSS.
- **`<dialog>` + Invoker Commands** (`command` / `commandfor`, `closedby="any"`) — des boîtes de
  dialogue modales ouvertes et fermées sans JavaScript.
- **`:user-invalid`** — des formulaires validés nativement, qui n'affichent l'erreur qu'après saisie.
- **`@starting-style`** — des animations d'apparition, même depuis `display: none`.
- **`field-sizing: content`** — un champ de saisie qui grandit tout seul.
- **`<select>` personnalisable** (`appearance: base-select`) — stylé, mais toujours natif.
- **Nesting natif + nommage BEM** — un CSS lisible, sans préprocesseur.
- **Propriétés logiques** (`margin-inline`, `inset-block`…) — prêtes pour tous les sens d'écriture.
- **`clamp()`, `text-wrap: balance | pretty`** — une typographie fluide et des titres équilibrés.
- **`scroll-snap`** — un carrousel de stories natif, fluide au doigt comme à la souris.
- **HTML sémantique d'abord** — le JavaScript n'est qu'une amélioration progressive.

## Démarrer

Aucune installation n'est nécessaire pour voir le site. Au choix :

- ouvrez simplement `index.html` dans votre navigateur (double-clic : tout fonctionne en `file://`,
  y compris la navigation entre les pages) ;
- ou servez le dossier : `npx serve .` ;
- ou utilisez l'extension **Live Server** de VS Code.

`npm install` ne sert qu'aux outils de qualité (Node.js 22.22 ou plus récent) :

```bash
git clone https://github.com/Balick/post-it.git
cd post-it
npm install
npm run lint     # blocs partagés + stylelint + html-validate + prettier
npm run sync     # recopie les blocs partagés (tête, menu, icônes…) dans toutes les pages
npm run dev      # serveur local (équivaut à npx serve .)
```

## Structure du projet

```text
*.html                  une page par écran (index, profil, messages, forums, amis, agenda…)
partials/               blocs partagés : <head>, menu latéral, logo, lien d'évitement, toast
scripts/
  sync-partials.mjs     recopie les blocs partagés et le sprite d'icônes dans chaque page
assets/
  css/
    fonts.css           @font-face (Lexend variable, auto-hébergée)
    tokens.css          ordre des @layer + design tokens
    base.css            reset + styles de base
    layout.css          grille de l'application + responsive
    components/         un fichier par composant (@layer components)
                        partagés : button avatar tag card section-title page-header forms
                        tabs dialog popover sidebar toast
                        propres à une page : feed post composer chat forum calendar…
    utilities.css       .visually-hidden, data-tone, etc.
  js/
    app.js              script commun : thème, actions [data-action], commentaires, toast
    feed.js, forums.js… un script par page (amélioration progressive, chargés en defer)
  fonts/                Lexend (woff2) + licence OFL
  icons/                une icône par fichier SVG (Phosphor Icons) + licence
  images/               brand/, avatars/, posts/, stories/, topics/, events/ (WebP)
docs/                   captures d'écran du README
.github/                CI (lint), déploiement GitHub Pages, modèles d'issues et de PR
CONTRIBUTING.md         conventions, recettes et checklist
CREDITS.md              auteurs et licences des photos, icônes et polices
package.json            outils de lint uniquement (aucune dépendance à l'exécution)
```

## Compatibilité navigateurs

Navigateurs « evergreen », **deux dernières versions** : Chrome, Edge, Firefox, Safari (macOS et
iOS), Samsung Internet.

Les fonctionnalités les plus récentes sont des **améliorations progressives** : sans _anchor
positioning_, menus et réactions retombent sur un positionnement classique (`@supports`) ; sans
`<select>` personnalisable, le menu de visibilité reste un `<select>` natif parfaitement
fonctionnel.

## Accessibilité

- Repères sémantiques (`header`, `nav`, `main`, `aside`) et titres hiérarchisés
- Entièrement utilisable au clavier, avec un focus toujours visible (`:focus-visible`)
- Animations réduites quand `prefers-reduced-motion` est activé
- Contrastes de texte visés au niveau WCAG AA, dans les deux thèmes
- Thème initial selon `prefers-color-scheme`, modifiable manuellement
- HTML validé automatiquement (html-validate, règles d'accessibilité incluses) à chaque push

## Contribuer

Les contributions sont les bienvenues, quel que soit votre niveau ! Lisez le
[guide de contribution](CONTRIBUTING.md) (conventions, recettes, checklist) avant d'ouvrir une pull
request.

## Crédits

Photos [Unsplash](https://unsplash.com), icônes [Phosphor Icons](https://phosphoricons.com), police
[Lexend](https://www.lexend.com) : le détail des auteurs et des licences est dans
[CREDITS.md](CREDITS.md).

## Licence

Code sous licence [MIT](LICENSE) © 2022-2026 Théo Balick et les contributeurs de Post it. Les
photos, icônes et polices restent sous leur propre licence (voir [CREDITS.md](CREDITS.md)).

---

### English summary

**Post it** is an open-source social network interface built as a **modern HTML/CSS showcase**:
no framework, no build step, no runtime dependency. It ships a dozen pages (feed, profile,
messages, forums, friends, calendar, settings, sign-in and sign-up, 404 and a component gallery)
and features a feed filterable without JavaScript (`:has()`), popovers with CSS anchor
positioning, `<dialog>` with invoker commands, cascade layers, OKLCH colors with `light-dark()`,
container queries and a pure-CSS poll. Open `index.html` in any evergreen browser, or run
`npx serve .`. Contributions are
welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) (in French). Code licensed under MIT.
