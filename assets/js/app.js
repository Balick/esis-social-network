/*
 * Post it — script commun à toutes les pages (JavaScript « vanilla », sans dépendance).
 *
 * Le site fonctionne SANS JavaScript : filtres, onglets, sondage, menus (popover),
 * boîtes de dialogue (command/commandfor)… sont en HTML/CSS. Ce script ajoute
 * seulement ce que le CSS ne peut pas faire seul :
 *   1. le thème clair / sombre / système, mémorisé ;
 *   2. les actions des boutons [data-action] (J'aime, réactions, Suivre, menus…) ;
 *   3. les commentaires des publications ;
 *   4. un repli pour les boîtes de dialogue et un toast pour les liens de démonstration ;
 *   5. l'en-tête : notifications et recherche.
 *
 * Chaque page peut ajouter ses propres actions dans son script (ex. feed.js) :
 *   postit.register('mon-action', (bouton, événement) => { … })
 *   <button type="button" data-action="mon-action">…</button>
 *
 * Scripts classiques (et non modules ES) pour que le site marche aussi en
 * ouvrant les pages directement depuis le disque (file://).
 */

;(() => {
  'use strict'

  const root = document.documentElement
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

  /* ------------------------------------------------------------------------
   * Toast : message visuel, également lu par les lecteurs d'écran (role="status")
   * ---------------------------------------------------------------------- */
  const toast = document.querySelector('.toast')
  let toastTimer

  const notify = (message) => {
    if (!toast) return
    clearTimeout(toastTimer)
    toast.textContent = message
    toast.classList.add('is-visible')
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200)
  }

  /* ------------------------------------------------------------------------
   * 1. Thème : « light », « dark » ou « system » (suit le réglage de l'appareil)
   * ---------------------------------------------------------------------- */
  const THEME_KEY = 'postit-theme'
  const themeSwitch = document.querySelector('.theme-switch')
  const themeInputs = document.querySelectorAll('input[name="theme"]')
  const systemDark = matchMedia('(prefers-color-scheme: dark)')

  const currentPreference = () => root.dataset.theme ?? 'system'
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches)

  const renderTheme = () => {
    if (themeSwitch) {
      const dark = isDark()
      themeSwitch.setAttribute('aria-checked', String(dark))
      themeSwitch.querySelector('use').setAttribute('href', dark ? '#icon-sun' : '#icon-moon')
    }
    themeInputs.forEach((input) => {
      input.checked = input.value === currentPreference()
    })
  }

  const applyTheme = (theme) => {
    const update = () => {
      if (theme === 'system') delete root.dataset.theme
      else root.dataset.theme = theme
      try {
        if (theme === 'system') localStorage.removeItem(THEME_KEY)
        else localStorage.setItem(THEME_KEY, theme)
      } catch {
        // Stockage indisponible (navigation privée…) : le thème vaut pour cette visite.
      }
      renderTheme()
    }
    // Fondu entre les deux thèmes là où l'API View Transitions existe.
    if (document.startViewTransition && !prefersReducedMotion.matches) {
      document.startViewTransition(update)
    } else {
      update()
    }
  }

  if (themeSwitch) {
    themeSwitch.hidden = false
    themeSwitch.addEventListener('click', () => applyTheme(isDark() ? 'light' : 'dark'))
  }
  themeInputs.forEach((input) =>
    input.addEventListener('change', () => input.checked && applyTheme(input.value)),
  )
  systemDark.addEventListener('change', renderTheme)
  renderTheme()

  /* ------------------------------------------------------------------------
   * 2. Actions des boutons [data-action]
   * Un seul écouteur sur le document (délégation) : il fonctionne aussi pour
   * les éléments ajoutés plus tard (nouvelle publication, nouveau commentaire…).
   * ---------------------------------------------------------------------- */
  const closePopover = (element) => element.closest('[popover]')?.hidePopover()
  const actions = new Map()
  const register = (name, handler) => actions.set(name, handler)

  register('like', (button) => {
    const liked = button.getAttribute('aria-pressed') !== 'true'
    button.setAttribute('aria-pressed', String(liked))
    button.classList.remove('is-popping')
    if (liked) {
      void button.offsetWidth // relance l'animation CSS
      button.classList.add('is-popping')
    }
  })

  register('react', (button) => {
    const reaction = button.closest('.reaction')
    reaction.querySelector('.reaction__emoji').textContent = button.dataset.emoji
    reaction.querySelector('.reaction__label').textContent = button.getAttribute('aria-label')
    reaction.dataset.reacted = ''
    closePopover(button)
    reaction.querySelector('.reaction__trigger').focus()
  })

  // <button data-action="follow" data-name="Nicolas"><span data-follow-label>Suivre</span></button>
  register('follow', (button) => {
    const following = !button.hasAttribute('data-following')
    const name = button.dataset.name ?? ''
    button.toggleAttribute('data-following', following)
    const label = button.querySelector('[data-follow-label]')
    if (label) label.textContent = following ? 'Abonné·e' : 'Suivre'
    notify(following ? `Vous suivez ${name}` : `Vous ne suivez plus ${name}`)
  })

  register('save', (button) => {
    closePopover(button)
    notify('Publication enregistrée')
  })

  register('report', (button) => {
    closePopover(button)
    notify('Merci ! La publication a été signalée à la modération.')
  })

  register('copy-link', async (button) => {
    const target = button.closest('[id]')
    const url = new URL(target ? `#${target.id}` : '', location.href).href
    closePopover(button)
    try {
      await navigator.clipboard.writeText(url)
      notify('Lien copié dans le presse-papiers')
    } catch {
      notify('Impossible de copier le lien sur ce navigateur')
    }
  })

  // Simple message de confirmation : <button data-action="notify" data-message="…">
  register('notify', (button) => {
    closePopover(button)
    notify(button.dataset.message ?? 'C’est noté !')
  })

  /* ------------------------------------------------------------------------
   * 3. Commentaires : <details class="comments"> sous chaque publication
   * ---------------------------------------------------------------------- */
  const ME = { name: 'Ben Uzan', avatar: 'assets/images/avatars/ben-uzan.webp' }

  const openComments = (comments) => {
    if (!comments) return
    const focusField = () => comments.querySelector('.comment-form__input')?.focus()
    if (comments.open) return focusField()
    // Le contenu d'un <details> ne devient focalisable qu'à l'image suivante après l'ouverture.
    comments.addEventListener('toggle', () => requestAnimationFrame(focusField), { once: true })
    comments.open = true
  }

  // Lien « Commenter » : ouvre la zone de commentaires et place le curseur.
  register('comment', (link, event) => {
    event.preventDefault()
    openComments(link.closest('.post')?.querySelector('.comments'))
  })

  // « Répondre » : ouvre le champ pré-rempli avec la mention de l'auteur.
  register('reply', (button) => {
    const comments = button.closest('.comments')
    const input = comments.querySelector('.comment-form__input')
    const author = button.closest('.comment').querySelector('.comment__author').textContent
    input.value = `@${author.split(' ')[0]} `
    openComments(comments)
  })

  const pluralize = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('.comment-form')
    if (!form) return
    event.preventDefault()

    const input = form.querySelector('.comment-form__input')
    const text = input.value.trim()
    if (!text) return input.focus()

    const comments = form.closest('.comments')
    const list = comments.querySelector('.comments__list')
    const item = document.createElement('li')
    item.className = 'comment'
    item.innerHTML = `
      <img class="avatar avatar--sm" src="${ME.avatar}" alt="" width="160" height="160">
      <div class="comment__body">
        <div class="comment__bubble">
          <p class="comment__meta"><a class="comment__author" href="profil.html"></a><time>à l’instant</time></p>
          <p class="comment__text"></p>
        </div>
        <div class="comment__actions">
          <button class="comment__action" type="button" aria-pressed="false" data-action="like">J’aime</button>
          <button class="comment__action" type="button" data-action="reply">Répondre</button>
        </div>
      </div>`
    item.querySelector('.comment__author').textContent = ME.name
    item.querySelector('.comment__text').textContent = text // textContent : aucun HTML injecté
    item.querySelector('time').dateTime = new Date().toISOString()
    list.append(item)

    const count = list.children.length
    const counter = comments.querySelector('.comments__count')
    if (counter) counter.textContent = pluralize(count, 'commentaire')
    form.reset()
    input.focus()
    notify('Commentaire publié')
  })

  /* ------------------------------------------------------------------------
   * 4. Clics : actions, liens de démonstration, repli des boîtes de dialogue
   * ---------------------------------------------------------------------- */

  // Navigateurs sans Invoker Commands : on interprète command/commandfor nous-mêmes.
  const supportsCommands = 'command' in HTMLButtonElement.prototype
  const runCommand = (button) => {
    const target = document.getElementById(button.getAttribute('commandfor'))
    const command = button.getAttribute('command')
    if (target instanceof HTMLDialogElement) {
      if (command === 'show-modal') target.showModal()
      if (command === 'close') target.close()
    } else if (target?.popover !== undefined) {
      if (command === 'toggle-popover') target.togglePopover()
      if (command === 'show-popover') target.showPopover()
      if (command === 'hide-popover') target.hidePopover()
    }
  }

  document.addEventListener('click', (event) => {
    const commandButton = !supportsCommands && event.target.closest('button[commandfor]')
    if (commandButton) runCommand(commandButton)

    const trigger = event.target.closest('[data-action]')
    if (trigger) {
      actions.get(trigger.dataset.action)?.(trigger, event)
      return
    }

    // Liens de démonstration (#profil, #application…) : la page n'existe pas.
    const link = event.target.closest('a[href^="#"]')
    if (link && link.hash.length > 1 && !document.getElementById(link.hash.slice(1))) {
      event.preventDefault()
      notify('Cette page arrive bientôt sur Post it ✨')
    }
  })

  /* ------------------------------------------------------------------------
   * 5. En-tête : notifications et recherche
   * ---------------------------------------------------------------------- */

  // « Tout marquer comme lu » : retire les pastilles et met à jour le bouton
  register('mark-all-read', (button) => {
    const panel = button.closest('.notifications')
    panel.querySelectorAll('[data-unread]').forEach((item) => item.removeAttribute('data-unread'))
    panel.querySelectorAll('.notifications__unread').forEach((label) => label.remove())
    const trigger = document.querySelector(`[popovertarget="${panel.id}"]`)
    trigger?.querySelector('.badge')?.remove()
    trigger?.setAttribute('aria-label', 'Notifications')
    button.disabled = true
    notify('Toutes les notifications sont lues')
  })

  // Recherche de démonstration : il n'y a pas encore de page de résultats
  document.querySelector('[data-search]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const query = event.target.elements.q.value.trim()
    notify(
      query
        ? `La recherche « ${query} » arrive bientôt sur Post it ✨`
        : 'Saisissez un nom, un sujet ou un #hashtag',
    )
  })

  // API publique pour les scripts de page (feed.js, messages.js…)
  window.postit = Object.freeze({ notify, register, closePopover, prefersReducedMotion, ME })
})()
