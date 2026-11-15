/*
 * Page « Amis » : script propre à amis.html, chargé après app.js.
 *
 * Sans JavaScript, la page reste utilisable : le filtre « Tous / En ligne » est en CSS,
 * les menus « … » sont des popovers HTML et le lien d'invitation se sélectionne à la main.
 * Ce script ajoute :
 *   1. Accepter / Refuser une demande d'ami (animation, compteurs, carte ajoutée à la grille) ;
 *   2. la recherche par nom (avec annonce du nombre de résultats) et le tri de la grille ;
 *   3. « Retirer des amis » et « Bloquer » dans le menu de chaque carte ;
 *   4. le bouton « Copier » du lien d'invitation.
 */

;(() => {
  'use strict'

  const { notify, register, closePopover, prefersReducedMotion } = window.postit

  const grid = document.querySelector('.friends-grid')
  if (!grid) return

  const requestsList = document.querySelector('.friend-requests')
  const requestsTitle = document.querySelector('#requests-title')
  const template = document.querySelector('#friend-card-template')
  const tools = document.querySelector('[data-friends-tools]')
  const search = document.querySelector('#friends-search')
  const sort = document.querySelector('#friends-sort')
  const status = document.querySelector('[data-friends-status]')
  const empty = document.querySelector('[data-friends-empty]')
  const onlineFilter = document.querySelector('.friend-filter__input[value="online"]')
  const onlineList = document.querySelector('[data-online-list]')

  const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`
  const friendItems = () => [...grid.querySelectorAll('.friends-grid__item')]
  const isShown = (element) => element.checkVisibility?.() ?? element.offsetParent !== null

  /* ------------------------------------------------------------------------
   * Compteurs : en-tête de page, titres de section, filtre et badge de la navigation
   * ---------------------------------------------------------------------- */
  const setText = (selector, value) =>
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value
    })

  const updateCounters = () => {
    const friends = friendItems()
    const online = friends.filter((item) => item.hasAttribute('data-online')).length
    const requests = requestsList?.querySelectorAll('.friend-request').length ?? 0

    setText('[data-friends-count]', friends.length)
    setText('[data-online-count]', online)
    setText('[data-requests-count]', requests)
    setText(
      '[data-friends-summary]',
      [
        plural(friends.length, 'ami'),
        `${online} en ligne`,
        requests ? `${plural(requests, 'demande')} en attente` : 'aucune demande en attente',
      ].join(' · '),
    )

    // Badge « Amis » de la barre latérale : <span class="badge">…3<span> demandes</span></span>
    const badge = document.querySelector('.nav__link[data-nav="amis"] .badge')
    if (badge) {
      const number = [...badge.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
      )
      if (number) number.textContent = requests
      if (badge.lastElementChild) {
        badge.lastElementChild.textContent = requests > 1 ? ' demandes' : ' demande'
      }
      badge.hidden = requests === 0
    }
  }

  /* ------------------------------------------------------------------------
   * Animations : sortie d'un élément, réorganisation de la grille
   * (toujours ignorées si l'utilisateur préfère réduire les animations)
   * ---------------------------------------------------------------------- */
  const animate = (element, keyframes, options) =>
    prefersReducedMotion.matches || !element.animate
      ? Promise.resolve()
      : element.animate(keyframes, {
          duration: 250,
          easing: 'ease-out',
          fill: 'forwards',
          ...options,
        }).finished

  // Ligne de liste : glisse vers la droite, puis la place se referme en douceur.
  const collapseOut = async (element) => {
    const gap = getComputedStyle(element.parentElement).rowGap
    element.style.overflow = 'hidden'
    await animate(element, [
      { opacity: 1, translate: '0 0' },
      { opacity: 0, translate: '2rem 0' },
    ])
    await animate(
      element,
      [
        { blockSize: `${element.offsetHeight}px` },
        { blockSize: '0px', paddingBlock: '0px', marginBlockEnd: `calc(${gap} * -1)` },
      ],
      { duration: 200 },
    )
    element.remove()
  }

  // Changement de la grille (tri, retrait d'une carte) : View Transitions si possible,
  // chaque carte glisse alors vers sa nouvelle place.
  const transitionGrid = (update) => {
    if (!document.startViewTransition || prefersReducedMotion.matches) return update()
    const items = friendItems()
    items.forEach((item, index) =>
      item.style.setProperty('view-transition-name', `friend-${index}`),
    )
    const transition = document.startViewTransition(update)
    transition.finished.finally(() =>
      items.forEach((item) => item.style.removeProperty('view-transition-name')),
    )
    return transition.updateCallbackDone
  }

  /* ------------------------------------------------------------------------
   * Recherche, filtre et tri
   * ---------------------------------------------------------------------- */
  const normalize = (text) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()

  let statusTimer
  const announce = (message) => {
    if (!status) return
    clearTimeout(statusTimer)
    // Petit délai : on n'annonce pas chaque frappe aux lecteurs d'écran.
    statusTimer = setTimeout(() => {
      status.textContent = message
    }, 500)
  }

  const applyFilters = ({ silent = false } = {}) => {
    const query = normalize(search?.value ?? '')
    const onlineOnly = onlineFilter?.checked ?? false
    let visible = 0

    friendItems().forEach((item) => {
      const match = normalize(item.dataset.name ?? '').includes(query)
      item.hidden = !match
      if (match && (!onlineOnly || item.hasAttribute('data-online'))) visible += 1
    })

    if (empty) empty.hidden = visible > 0
    if (!silent) {
      announce(
        visible
          ? `${plural(visible, 'ami')} ${visible > 1 ? 'affichés' : 'affiché'}`
          : 'Aucun ami trouvé',
      )
    }
  }

  const collator = new Intl.Collator('fr', { sensitivity: 'base' })
  const sortGrid = () => {
    const recentFirst = sort?.value === 'recent'
    const sorted = friendItems().sort((a, b) =>
      recentFirst
        ? (b.dataset.added ?? '').localeCompare(a.dataset.added ?? '')
        : collator.compare(a.dataset.name ?? '', b.dataset.name ?? ''),
    )
    grid.append(...sorted)
  }

  if (tools) tools.hidden = false
  search?.addEventListener('input', () => applyFilters())
  sort?.addEventListener('change', () => transitionGrid(sortGrid))
  document
    .querySelectorAll('.friend-filter__input')
    .forEach((input) => input.addEventListener('change', () => applyFilters()))

  /* ------------------------------------------------------------------------
   * Demandes d'amis
   * ---------------------------------------------------------------------- */
  let newFriendId = 0

  // Nouvelle carte d'ami, construite à partir du <template> (textContent : aucun HTML injecté).
  const createFriendCard = ({ name, info, avatar, profile, online }) => {
    const item = template.content.firstElementChild.cloneNode(true)
    const menuId = `friend-new-${(newFriendId += 1)}-menu`

    item.dataset.name = name
    item.dataset.added = new Date().toISOString().slice(0, 10)
    item.toggleAttribute('data-online', online)
    if (!online) item.querySelector('.friend-card__status').remove()

    item.querySelector('.friend-card__avatar').setAttribute('src', avatar)
    item.querySelector('.friend-card__name a').textContent = name
    item.querySelector('.friend-card__info').textContent = info ?? ''
    item.querySelector('[data-slot="message-to"]').textContent = ` à ${name}`
    item.querySelectorAll('a[href="#profil"]').forEach((link) => link.setAttribute('href', profile))

    const more = item.querySelector('.friend-card__more')
    more.setAttribute('popovertarget', menuId)
    more.setAttribute('aria-label', `Plus d'options pour ${name}`)
    item.querySelector('[popover]').id = menuId
    return item
  }

  // Un nouvel ami en ligne apparaît aussi dans la colonne « Amis en ligne ».
  const addToOnlineList = ({ name, avatar }) => {
    if (!onlineList) return
    const item = document.createElement('li')
    item.className = 'mini-person'
    item.dataset.name = name
    item.innerHTML = `
      <a class="mini-person__link" href="messages.html">
        <span class="mini-person__media">
          <img class="avatar avatar--sm" alt="" width="160" height="160">
        </span>
        <span class="mini-person__name"><span class="visually-hidden">, en ligne : écrire un message</span></span>
      </a>`
    item.querySelector('img').setAttribute('src', avatar)
    item.querySelector('.mini-person__name').prepend(name)
    onlineList.prepend(item)
  }

  // Après la disparition d'une demande, le focus va à la suivante (ou au titre de la section).
  const focusAfterRequest = (request) => {
    const sibling = request.nextElementSibling ?? request.previousElementSibling
    return sibling?.querySelector('.button') ?? requestsTitle
  }

  const handleRequest = async (button, accepted) => {
    const request = button.closest('.friend-request')
    if (!request || request.inert) return
    request.inert = true // pas de double clic pendant l'animation

    const { name, info } = request.dataset
    const next = focusAfterRequest(request)
    const friend = {
      name,
      info,
      avatar: request.querySelector('.friend-request__avatar').getAttribute('src'),
      profile: request.querySelector('.friend-request__name a').getAttribute('href'),
      online: request.hasAttribute('data-online'),
    }

    await collapseOut(request)

    if (accepted) {
      const card = createFriendCard(friend)
      grid.append(card)
      sortGrid()
      if (friend.online) addToOnlineList(friend)
      animate(
        card,
        [
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1 },
        ],
        { duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'none' },
      )
    }

    updateCounters()
    applyFilters({ silent: true })
    next?.focus()
    notify(
      accepted ? `${name} fait maintenant partie de vos amis 🎉` : `Demande de ${name} refusée`,
    )
  }

  register('accept-request', (button) => handleRequest(button, true))
  register('decline-request', (button) => handleRequest(button, false))

  /* ------------------------------------------------------------------------
   * Menu « … » d'une carte : retirer, bloquer
   * ---------------------------------------------------------------------- */
  register('remove-friend', async (button) => {
    const item = button.closest('.friends-grid__item')
    if (!item) return
    const { name } = item.dataset
    closePopover(button)

    // Le focus passe à la carte voisine encore affichée, sinon au champ de recherche.
    const shown = friendItems().filter((other) => other === item || isShown(other))
    const index = shown.indexOf(item)
    const neighbour = shown[index + 1] ?? shown[index - 1]
    const next = neighbour?.querySelector('.friend-card__name a') ?? search ?? grid

    await transitionGrid(() => item.remove())
    onlineList?.querySelector(`[data-name="${CSS.escape(name)}"]`)?.remove()

    updateCounters()
    applyFilters({ silent: true })
    next.focus()
    notify(`${name} ne fait plus partie de vos amis`)
  })

  register('block-friend', (button) => {
    const name = button.closest('.friends-grid__item')?.dataset.name ?? ''
    closePopover(button)
    notify(`${name} est bloqué·e et ne pourra plus vous écrire`)
  })

  /* ------------------------------------------------------------------------
   * Lien d'invitation
   * ---------------------------------------------------------------------- */
  const inviteInput = document.querySelector('#invite-link')
  const copyButton = document.querySelector('[data-action="copy-invite"]')

  if (inviteInput && copyButton) {
    copyButton.hidden = false
    // Un clic dans le champ sélectionne tout le lien (repli si la copie échoue).
    inviteInput.addEventListener('focus', () => inviteInput.select())

    register('copy-invite', async () => {
      try {
        await navigator.clipboard.writeText(inviteInput.value)
        notify('Lien d’invitation copié dans le presse-papiers')
      } catch {
        inviteInput.focus()
        inviteInput.select()
        notify('Copie impossible : le lien est sélectionné, utilisez Ctrl + C')
      }
    })
  }
})()
