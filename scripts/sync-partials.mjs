/*
 * Synchronise les blocs HTML partagés entre toutes les pages du site.
 *
 * Le site reste du HTML statique (aucune étape de build pour le voir) : ce script
 * sert seulement à ne pas recopier à la main la barre latérale ou les icônes
 * dans chaque page. Chaque page contient des marqueurs :
 *
 *   <!-- partial:sidebar -->
 *   …contenu généré, ne pas modifier à la main…
 *   <!-- /partial:sidebar -->
 *
 * Fragments disponibles :
 *   head       partials/head.html : métas, styles et scripts communs
 *   skip-link  partials/skip-link.html : lien d'évitement
 *   sprite     généré : logo (partials/logo.html) + une icône par fichier assets/icons/*.svg
 *   sidebar    partials/sidebar.html : le lien dont data-nav vaut le data-page
 *              de <body> reçoit aria-current="page"
 *   toast      partials/toast.html : zone des messages éphémères
 *
 * Utilisation :
 *   npm run sync                          met à jour toutes les pages
 *   npm run sync -- --check               vérifie sans écrire (utilisé par la CI)
 *   npm run sync -- --only=messages.html  ne traite qu'une page
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const only = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)

const read = (file) => readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n').trimEnd()

/** <path … /> → <path …></path> : le projet n'utilise pas de balises auto-fermantes. */
const closeTags = (markup) => markup.replace(/<([a-z][\w-]*)([^>]*?)\s*\/>/g, '<$1$2></$1>')

let spriteCache
function sprite() {
  spriteCache ??= (() => {
    const icons = readdirSync(join(root, 'assets/icons'))
      .filter((file) => file.endsWith('.svg'))
      .sort()
      .map((file) => {
        const svg = read(`assets/icons/${file}`)
        const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 256 256'
        const inner = closeTags(
          svg
            .replace(/^[\s\S]*?<svg[^>]*>/, '')
            .replace(/<\/svg>\s*$/, '')
            .trim(),
        )
        return `  <symbol id="icon-${file.slice(0, -4)}" viewBox="${viewBox}">${inner}</symbol>`
      })
    const logo = read('partials/logo.html')
      .split('\n')
      .map((line) => (line ? `  ${line}` : line))
    return [
      '<!-- Icônes (Phosphor Icons, MIT) générées depuis assets/icons/ par « npm run sync » -->',
      '<svg class="sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
      ...logo,
      ...icons,
      '</svg>',
    ].join('\n')
  })()
  return spriteCache
}

const partials = {
  head: () => read('partials/head.html'),
  'skip-link': () => read('partials/skip-link.html'),
  sprite,
  toast: () => read('partials/toast.html'),
  sidebar: (page) =>
    read('partials/sidebar.html').replace(/ data-nav="([^"]+)"/g, (match, nav) =>
      nav === page ? `${match} aria-current="page"` : match,
    ),
}

const indent = (text, prefix) =>
  text
    .split('\n')
    .map((line) => (line ? prefix + line : line))
    .join('\n')

const MARKERS = /^([ \t]*)<!-- partial:([\w-]+) -->\n[\s\S]*?^[ \t]*<!-- \/partial:\2 -->$/gm

const pages = readdirSync(root)
  .filter((file) => file.endsWith('.html'))
  .filter((file) => !only || file === only)

if (only && pages.length === 0) {
  console.error(`Page introuvable : ${only}`)
  process.exit(1)
}

const stale = []
for (const file of pages) {
  const current = read(file) + '\n'
  const page = current.match(/<body[^>]*\sdata-page="([^"]+)"/)?.[1] ?? ''

  const next = current.replace(MARKERS, (_, space, name) => {
    const build = partials[name]
    if (!build) throw new Error(`${file} : fragment inconnu « ${name} »`)
    return [
      `${space}<!-- partial:${name} -->`,
      indent(build(page), space),
      `${space}<!-- /partial:${name} -->`,
    ].join('\n')
  })

  if (next === current) continue
  stale.push(file)
  if (!checkOnly) writeFileSync(join(root, file), next)
}

if (checkOnly && stale.length > 0) {
  console.error(`Blocs partagés pas à jour dans : ${stale.join(', ')}`)
  console.error('Lancez « npm run sync » puis committez le résultat.')
  process.exit(1)
}

console.log(
  checkOnly
    ? `Blocs partagés à jour (${pages.length} page·s).`
    : `${stale.length} page·s mise·s à jour sur ${pages.length}.`,
)
