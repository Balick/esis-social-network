/*
 * Post it — page « Composants » (composants.html).
 * Amélioration progressive : sans JavaScript, la page montre un aperçu des icônes.
 *   1. Catalogue complet des icônes, construit à partir du sprite de la page,
 *      avec recherche et copie du code d'une icône au clic.
 *   2. Sommaire : met en évidence la section visible.
 *   3. Formulaire de démonstration : rien n'est envoyé, un toast le confirme.
 */

;(() => {
  'use strict'

  const { notify, register } = window.postit

  /* ------------------------------------------------------------------------
   * 1. Catalogue des icônes
   * ---------------------------------------------------------------------- */
  const grid = document.querySelector('[data-icon-grid]')
  const template = document.querySelector('[data-icon-template]')
  const finder = document.querySelector('.icon-finder')
  const search = document.querySelector('#icon-search')
  const status = document.querySelector('[data-icon-status]')

  const names = [...document.querySelectorAll('.sprite symbol[id^="icon-"]')]
    .map((symbol) => symbol.id.slice('icon-'.length))
    .sort((a, b) => a.localeCompare(b))

  const pluralize = (count) => `${count} icône${count > 1 ? 's' : ''}`

  if (grid && template && names.length) {
    const items = names.map((name) => {
      const item = template.content.firstElementChild.cloneNode(true)
      const button = item.querySelector('button')
      button.dataset.icon = name
      button.setAttribute('aria-label', `Copier le code de l’icône ${name}`)
      item.querySelector('use').setAttribute('href', `#icon-${name}`)
      item.querySelector('code').textContent = name
      return item
    })
    grid.replaceChildren(...items)
    finder.hidden = false
    status.textContent = pluralize(names.length)

    // Recherche : on masque les icônes dont le nom ne contient pas le texte saisi
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase()
      let visible = 0
      items.forEach((item) => {
        const match = item.querySelector('button').dataset.icon.includes(query)
        item.hidden = !match
        if (match) visible += 1
      })
      status.textContent = visible ? pluralize(visible) : 'Aucune icône ne correspond'
    })
  }

  register('copy-icon', async (button) => {
    const code = `<svg class="icon" aria-hidden="true"><use href="#icon-${button.dataset.icon}"></use></svg>`
    try {
      await navigator.clipboard.writeText(code)
      notify(`Code de l’icône « ${button.dataset.icon} » copié`)
    } catch {
      notify('Impossible de copier sur ce navigateur')
    }
  })

  /* ------------------------------------------------------------------------
   * 2. Sommaire : lien de la section visible en surbrillance
   * ---------------------------------------------------------------------- */
  const links = new Map(
    [...document.querySelectorAll('.toc__link')].map((link) => [link.hash.slice(1), link]),
  )
  const setCurrent = (id) => {
    links.forEach((link, key) => {
      if (key === id) {
        link.setAttribute('aria-current', 'true')
        // Garde le lien actif visible dans le sommaire qui défile (mobile)
        link.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      } else {
        link.removeAttribute('aria-current')
      }
    })
  }

  if ('IntersectionObserver' in window && links.size) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((e) => e.isIntersecting)
        if (entry) setCurrent(entry.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    links.forEach((_, id) => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })
  }

  /* ------------------------------------------------------------------------
   * 3. Formulaire de démonstration
   * ---------------------------------------------------------------------- */
  document.querySelector('[data-demo-form]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    notify('Formulaire valide ! (démonstration : rien n’a été envoyé)')
  })
})()
