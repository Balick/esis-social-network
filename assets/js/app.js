/*
 * Post it — améliorations progressives, en JavaScript « vanilla » (aucune dépendance).
 *
 * La page fonctionne SANS ce fichier : filtres du fil, sondage, menus et sélecteurs
 * d'emojis (popover), stories… sont en HTML/CSS. Ce script ajoute seulement ce que
 * le CSS ne peut pas faire seul :
 *   1. choisir et mémoriser le thème clair/sombre ;
 *   2. « J'aime », réactions, « Suivre », actions du menu ;
 *   3. le compositeur : emojis, lieu, pièces jointes, publication ;
 *   4. un message (toast) pour les liens de démonstration sans page.
 *
 * C'est un script classique (et non un module ES) pour que le site marche aussi
 * en ouvrant index.html directement depuis le disque (file://).
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
   * 1. Thème clair / sombre
   * Le choix est mémorisé ; sans choix, on suit le réglage du système.
   * ---------------------------------------------------------------------- */
  const THEME_KEY = 'postit-theme'
  const themeSwitch = document.querySelector('.theme-switch')
  const systemDark = matchMedia('(prefers-color-scheme: dark)')

  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches)

  const renderThemeSwitch = () => {
    const dark = isDark()
    themeSwitch.setAttribute('aria-checked', String(dark))
    themeSwitch.querySelector('use').setAttribute('href', dark ? '#icon-sun' : '#icon-moon')
  }

  const applyTheme = (theme) => {
    root.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Stockage indisponible (navigation privée…) : le thème vaut pour cette visite.
    }
    renderThemeSwitch()
  }

  if (themeSwitch) {
    themeSwitch.hidden = false
    renderThemeSwitch()
    systemDark.addEventListener('change', renderThemeSwitch)

    themeSwitch.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark'
      // Fondu entre les deux thèmes là où l'API View Transitions existe.
      if (document.startViewTransition && !prefersReducedMotion.matches) {
        document.startViewTransition(() => applyTheme(next))
      } else {
        applyTheme(next)
      }
    })
  }

  /* ------------------------------------------------------------------------
   * 2. Actions des boutons [data-action]
   * Un seul écouteur sur le document (délégation) : il fonctionne aussi pour
   * les publications ajoutées plus tard par le compositeur.
   * ---------------------------------------------------------------------- */
  const closePopover = (element) => element.closest('[popover]')?.hidePopover()

  const actions = {
    like(button) {
      const liked = button.getAttribute('aria-pressed') !== 'true'
      button.setAttribute('aria-pressed', String(liked))
      button.classList.remove('is-popping')
      if (liked) {
        void button.offsetWidth // relance l'animation CSS
        button.classList.add('is-popping')
      }
    },

    react(button) {
      const reaction = button.closest('.reaction')
      const label = button.getAttribute('aria-label')
      reaction.querySelector('.reaction__emoji').textContent = button.dataset.emoji
      reaction.querySelector('.reaction__label').textContent = label
      reaction.dataset.reacted = ''
      closePopover(button)
      reaction.querySelector('.reaction__trigger').focus()
    },

    follow(button) {
      const following = !button.hasAttribute('data-following')
      const name = button.closest('.suggestion').querySelector('.suggestion__name').textContent
      button.toggleAttribute('data-following', following)
      button.querySelector('.suggestion__follow-label').textContent = following
        ? 'Abonné·e'
        : 'Suivre'
      notify(following ? `Vous suivez ${name}` : `Vous ne suivez plus ${name}`)
    },

    save(button) {
      closePopover(button)
      notify('Publication enregistrée')
    },

    report(button) {
      closePopover(button)
      notify('Merci ! La publication a été signalée à la modération.')
    },

    async 'copy-link'(button) {
      const post = button.closest('.post')
      const url = new URL(`#${post.id}`, location.href).href
      closePopover(button)
      try {
        await navigator.clipboard.writeText(url)
        notify('Lien copié dans le presse-papiers')
      } catch {
        notify('Impossible de copier le lien sur ce navigateur')
      }
    },

    'insert-emoji'(button) {
      const input = document.querySelector('.composer__input')
      input.setRangeText(button.textContent, input.selectionStart, input.selectionEnd, 'end')
      closePopover(button)
      input.focus()
    },

    'toggle-location'(button) {
      const active = button.getAttribute('aria-pressed') !== 'true'
      button.setAttribute('aria-pressed', String(active))
      renderAttachments()
    },

    'remove-attachment'(button) {
      const kind = button.dataset.kind
      if (kind === 'location') {
        document
          .querySelector('[data-action="toggle-location"]')
          .setAttribute('aria-pressed', 'false')
      } else {
        document.querySelector(`.composer [data-kind="${kind}"]`).value = ''
      }
      renderAttachments()
      document.querySelector('.composer__input').focus()
    },
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]')
    if (trigger) {
      actions[trigger.dataset.action]?.(trigger, event)
      return
    }

    // Liens de démonstration (#profil, #messages…) : la page n'existe pas encore.
    const link = event.target.closest('a[href^="#"]')
    if (link && link.hash.length > 1 && !document.getElementById(link.hash.slice(1))) {
      event.preventDefault()
      notify('Cette page arrive bientôt sur Post it ✨')
    }
  })

  /* ------------------------------------------------------------------------
   * 3. Compositeur
   * ---------------------------------------------------------------------- */
  const composer = document.querySelector('.composer')
  if (!composer) return

  const input = composer.querySelector('.composer__input')
  const audience = composer.querySelector('.composer__select')
  const fileInput = composer.querySelector('[data-kind="file"]')
  const imageInput = composer.querySelector('[data-kind="image"]')
  const locationButton = composer.querySelector('[data-action="toggle-location"]')
  const attachments = composer.querySelector('.composer__attachments')
  const feedList = document.querySelector('.feed__list')
  const template = document.getElementById('post-template')
  const TONES = ['mint', 'sky', 'lilac', 'cream']
  const LOCATION = 'Campus ESIS, Lubumbashi'
  let imageUrl = ''
  let postCount = 0

  /** Petite pastille « pièce jointe » avec un bouton pour la retirer. */
  const createChip = ({ kind, label, thumb }) => {
    const item = document.createElement('li')
    item.className = 'chip'
    if (thumb) {
      const img = document.createElement('img')
      img.className = 'chip__thumb'
      img.src = thumb
      img.alt = ''
      item.append(img)
    }
    const text = document.createElement('span')
    text.className = 'chip__label'
    text.textContent = label
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'chip__remove'
    remove.dataset.action = 'remove-attachment'
    remove.dataset.kind = kind
    remove.setAttribute('aria-label', `Retirer « ${label} »`)
    remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-x"></use></svg>'
    item.append(text, remove)
    return item
  }

  function renderAttachments() {
    const file = fileInput.files[0]
    const image = imageInput.files[0]

    if (imageUrl && !image) URL.revokeObjectURL(imageUrl)
    imageUrl = image ? imageUrl || URL.createObjectURL(image) : ''

    const chips = []
    if (image) chips.push(createChip({ kind: 'image', label: image.name, thumb: imageUrl }))
    if (file) chips.push(createChip({ kind: 'file', label: file.name }))
    if (locationButton.getAttribute('aria-pressed') === 'true') {
      chips.push(createChip({ kind: 'location', label: LOCATION }))
    }

    attachments.replaceChildren(...chips)
    attachments.hidden = chips.length === 0
  }

  fileInput.addEventListener('change', renderAttachments)
  imageInput.addEventListener('change', () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    imageUrl = ''
    renderAttachments()
  })

  // Ctrl/Cmd + Entrée pour publier.
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) composer.requestSubmit()
  })

  composer.addEventListener('submit', (event) => {
    event.preventDefault()
    const message = input.value.trim()
    if (!message) {
      input.value = ''
      input.focus()
      return
    }

    postCount += 1
    const post = template.content.firstElementChild.cloneNode(true)
    const id = `post-new-${postCount}`
    post.id = id
    post.dataset.tone = TONES[(postCount - 1) % TONES.length]
    post.setAttribute('aria-labelledby', `${id}-author`)
    post.querySelector('.post__author').id = `${id}-author`
    post.querySelector('time').dateTime = new Date().toISOString()
    post.querySelector('.post__text').textContent = message
    post.querySelector('.post__audience').textContent =
      `· ${audience.options[audience.selectedIndex].text}`

    if (locationButton.getAttribute('aria-pressed') === 'true') {
      post.querySelector('.post__place').hidden = false
    }

    const image = imageInput.files[0]
    if (image) {
      const gallery = post.querySelector('.gallery')
      const img = gallery.querySelector('img')
      img.src = imageUrl
      img.alt = 'Image jointe à la publication'
      img.removeAttribute('width')
      img.removeAttribute('height')
      gallery.hidden = false
      imageUrl = '' // l'URL appartient désormais à la publication
    }

    const file = fileInput.files[0]
    if (file) {
      const fileRow = post.querySelector('.post__file')
      fileRow.querySelector('span').textContent = file.name
      fileRow.hidden = false
    }

    // La nouvelle publication doit être visible : on revient sur « Récents ».
    const recent = document.querySelector('.feed-filter__input[value="recent"]')
    if (recent) recent.checked = true

    feedList.prepend(post)
    composer.reset()
    locationButton.setAttribute('aria-pressed', 'false')
    renderAttachments()

    post.scrollIntoView({
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      block: 'center',
    })
    notify('Publication envoyée 🎉')
  })
})()
