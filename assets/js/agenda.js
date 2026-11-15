/*
 * Post it — page Agenda (amélioration progressive, chargé après app.js).
 *
 * Sans JavaScript, la page affiche déjà le calendrier de novembre 2026, les
 * événements du jour sélectionné, la liste des événements à venir et son filtre
 * (100 % CSS). Ce script ajoute :
 *   1. la navigation dans le calendrier (mois précédent / suivant, flèches du clavier) ;
 *   2. le panneau « événements du jour » quand on choisit une date ;
 *   3. le bouton « Participer » (compteur + « Mes prochains événements ») ;
 *   4. la création d'un événement depuis la boîte de dialogue.
 *
 * Les événements sont décrits UNE fois, dans le tableau EVENTS ci-dessous :
 * le calendrier de n'importe quel mois est recalculé à partir de ces données.
 */

;(() => {
  'use strict'

  const calendar = document.querySelector('.calendar')
  if (!calendar || !window.postit) return

  const { notify, register } = window.postit

  /* ------------------------------------------------------------------------
   * Données de démonstration
   * ---------------------------------------------------------------------- */

  // Date du jour fictive du template
  const TODAY = '2026-11-14'

  // Catégories : libellé, ton de l'étiquette (data-tone) et icône du sprite
  const CATEGORIES = {
    culture: { label: 'Culture', tone: 'rose', icon: 'music-notes' },
    tech: { label: 'Tech', tone: 'azure', icon: 'code' },
    'plein-air': { label: 'Plein air', tone: 'mint', icon: 'mountains' },
    cuisine: { label: 'Cuisine', tone: 'sun', icon: 'cooking-pot' },
    fete: { label: 'Fête', tone: 'lilac', icon: 'gift' },
  }

  // people : nombre de participants (vous compris si going vaut true)
  const EVENTS = [
    {
      id: 'cine-club',
      date: '2026-11-05',
      start: '18:00',
      end: '20:30',
      title: 'Ciné-club : courts métrages',
      place: 'Médiathèque de quartier',
      category: 'culture',
      people: 21,
      going: false,
    },
    {
      id: 'lever-soleil',
      date: '2026-11-07',
      start: '05:30',
      end: '10:00',
      title: 'Randonnée au lever du soleil',
      place: 'Collines de la Kafubu',
      category: 'plein-air',
      people: 8,
      going: true,
    },
    {
      id: 'meetup-js',
      date: '2026-11-11',
      start: '19:00',
      end: '21:00',
      title: 'Meetup JavaScript',
      place: 'Tiers-lieu Mwangaza, Lubumbashi',
      category: 'tech',
      people: 34,
      going: false,
    },
    {
      id: 'atelier-css',
      date: '2026-11-14',
      start: '10:00',
      end: '12:30',
      title: 'Atelier code : CSS moderne',
      place: 'Tiers-lieu Mwangaza, Lubumbashi',
      category: 'tech',
      people: 18,
      going: true,
    },
    {
      id: 'concert-jazz',
      date: '2026-11-14',
      start: '20:00',
      end: '23:00',
      title: 'Concert jazz en plein air',
      place: 'Jardin public, Lubumbashi',
      category: 'culture',
      people: 42,
      going: false,
    },
    {
      id: 'atelier-cuisine',
      date: '2026-11-17',
      start: '18:30',
      end: '21:00',
      title: 'Atelier cuisine : saveurs du monde',
      place: 'La Cuisine partagée',
      category: 'cuisine',
      people: 12,
      going: false,
    },
    {
      id: 'randonnee-lac',
      date: '2026-11-21',
      start: '07:00',
      end: '15:00',
      title: 'Randonnée et pique-nique au lac',
      place: 'Lac de Tshangalele',
      category: 'plein-air',
      people: 9,
      going: false,
    },
    {
      id: 'jeux-societe',
      date: '2026-11-26',
      start: '19:00',
      end: '22:00',
      title: 'Soirée jeux de société',
      place: 'Café Le Baobab',
      category: 'fete',
      people: 15,
      going: false,
    },
    {
      id: 'hackathon',
      date: '2026-11-28',
      start: '09:00',
      end: '21:00',
      title: 'Hackathon « Villes durables »',
      place: 'Tiers-lieu Mwangaza, Lubumbashi',
      category: 'tech',
      people: 64,
      going: true,
    },
    {
      id: 'anniversaire-grace',
      date: '2026-12-03',
      start: '19:00',
      end: '23:00',
      title: 'Anniversaire surprise de Grâce',
      place: 'Chez Sarah',
      category: 'fete',
      people: 11,
      going: true,
    },
    {
      id: 'meetup-design',
      date: '2026-12-10',
      start: '18:00',
      end: '20:00',
      title: 'Meetup design UI/UX',
      place: 'Espace coworking Kipushi',
      category: 'tech',
      people: 23,
      going: false,
    },
    {
      id: 'marche-noel',
      date: '2026-12-12',
      start: '09:00',
      end: '13:00',
      title: 'Marché des saveurs de Noël',
      place: 'Place du marché',
      category: 'cuisine',
      people: 57,
      going: false,
    },
    {
      id: 'chorale',
      date: '2026-12-19',
      start: '20:00',
      end: '22:30',
      title: 'Concert de la chorale',
      place: 'Salle des fêtes',
      category: 'culture',
      people: 76,
      going: false,
    },
  ]

  /* ------------------------------------------------------------------------
   * Outils de dates : on manipule des chaînes « AAAA-MM-JJ » et des Date
   * locales (new Date('2026-11-14') serait interprété en UTC → décalages).
   * ---------------------------------------------------------------------- */
  const toDate = (iso) => {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const toIso = (date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

  const addDays = (iso, days) => {
    const date = toDate(iso)
    date.setDate(date.getDate() + days)
    return toIso(date)
  }

  // Même jour du mois précédent / suivant, ramené au dernier jour si besoin (31 → 30)
  const addMonths = (iso, months) => {
    const date = toDate(iso)
    const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    target.setDate(Math.min(date.getDate(), lastDay))
    return toIso(target)
  }

  const formatter = (options) => new Intl.DateTimeFormat('fr-FR', options)
  const longDate = formatter({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dayTitle = formatter({ weekday: 'long', day: 'numeric', month: 'long' })
  const shortDate = formatter({ weekday: 'short', day: 'numeric', month: 'short' })
  const monthTitle = formatter({ month: 'long', year: 'numeric' })
  const monthShort = formatter({ month: 'short' })
  const weekday = formatter({ weekday: 'long' })

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)
  const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`
  const byDate = (a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)
  const eventsOn = (iso) => EVENTS.filter((event) => event.date === iso).sort(byDate)
  const cardOf = (event) => document.getElementById(`event-${event.id}`)

  // Clone le contenu d'un <template> de la page
  const fromTemplate = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true)

  /* ------------------------------------------------------------------------
   * 1. Calendrier
   * ---------------------------------------------------------------------- */
  const grid = calendar.querySelector('.calendar__grid')
  const caption = grid.querySelector('caption')
  const status = calendar.querySelector('[data-calendar-status]')

  let selected = TODAY
  let shown = toDate(TODAY) // n'importe quel jour du mois affiché
  shown.setDate(1)

  const sameMonth = (iso) => {
    const date = toDate(iso)
    return date.getFullYear() === shown.getFullYear() && date.getMonth() === shown.getMonth()
  }

  const dayButton = (iso) => {
    const date = toDate(iso)
    const events = eventsOn(iso)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'calendar__day'
    button.dataset.date = iso
    button.tabIndex = -1
    button.setAttribute(
      'aria-label',
      events.length
        ? `${longDate.format(date)}, ${plural(events.length, 'événement')}`
        : longDate.format(date),
    )
    button.setAttribute('aria-pressed', String(iso === selected))
    if (iso === TODAY) button.setAttribute('aria-current', 'date')
    if (!sameMonth(iso)) button.dataset.outside = ''

    const number = document.createElement('span')
    number.className = 'calendar__number'
    number.textContent = date.getDate()
    button.append(number)

    if (events.length) {
      const dots = document.createElement('span')
      dots.className = 'calendar__dots'
      events.slice(0, 3).forEach((event) => {
        const dot = document.createElement('span')
        dot.className = 'calendar__dot'
        dot.dataset.category = event.category
        dots.append(dot)
      })
      button.append(dots)
    }
    return button
  }

  // Une seule date atteignable par Tab (« roving tabindex ») : les flèches font le reste.
  const updateTabStop = () => {
    const buttons = [...grid.querySelectorAll('.calendar__day')]
    const firstOfMonth = toIso(shown)
    const target = sameMonth(selected) ? selected : firstOfMonth
    buttons.forEach((button) => {
      button.tabIndex = button.dataset.date === target ? 0 : -1
    })
  }

  const renderMonth = () => {
    const year = shown.getFullYear()
    const month = shown.getMonth()
    const offset = (new Date(year, month, 1).getDay() + 6) % 7 // lundi = 0
    const days = new Date(year, month + 1, 0).getDate()
    const weeks = Math.ceil((offset + days) / 7)
    let day = toIso(new Date(year, month, 1 - offset))

    const rows = []
    for (let week = 0; week < weeks; week += 1) {
      const row = document.createElement('tr')
      for (let column = 0; column < 7; column += 1) {
        const cell = document.createElement('td')
        cell.append(dayButton(day))
        row.append(cell)
        day = addDays(day, 1)
      }
      rows.push(row)
    }
    grid.tBodies[0].replaceChildren(...rows)
    caption.textContent = capitalize(monthTitle.format(shown))
    updateTabStop()
  }

  const showMonthOf = (iso) => {
    if (sameMonth(iso)) return false
    shown = toDate(iso)
    shown.setDate(1)
    renderMonth()
    if (status) status.textContent = caption.textContent
    return true
  }

  const focusDay = (iso) => grid.querySelector(`[data-date="${iso}"]`)?.focus()

  /* ------------------------------------------------------------------------
   * 2. Panneau « événements du jour »
   * ---------------------------------------------------------------------- */
  const panelTitle = calendar.querySelector('.calendar__panel-title')
  const panelList = calendar.querySelector('.calendar__events')
  const panelEmpty = calendar.querySelector('.calendar__empty')

  const dayEvent = (event) => {
    const item = fromTemplate('day-event-template')
    item.dataset.category = event.category
    const time = item.querySelector('time')
    time.dateTime = `${event.date}T${event.start}`
    time.textContent = `${event.start} – ${event.end}`
    const link = item.querySelector('.calendar__link')
    link.textContent = event.title
    if (cardOf(event)) link.href = `#event-${event.id}`
    else link.removeAttribute('href') // événement passé : pas de carte dans la liste
    item.querySelector('.calendar__place-name').textContent = event.place
    return item
  }

  const renderPanel = () => {
    const events = eventsOn(selected)
    panelTitle.textContent = capitalize(dayTitle.format(toDate(selected)))
    panelList.replaceChildren(...events.map(dayEvent))
    panelEmpty.hidden = events.length > 0
  }

  const select = (iso) => {
    selected = iso
    const moved = showMonthOf(iso)
    if (!moved) {
      grid.querySelectorAll('.calendar__day').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.date === iso))
      })
      updateTabStop()
    }
    renderPanel()
  }

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.calendar__day')
    if (!button) return
    select(button.dataset.date)
    focusDay(button.dataset.date)
  })

  // Clavier (motif « grille de dates » de l'APG) : flèches, Début/Fin, Page préc./suiv.
  grid.addEventListener('keydown', (event) => {
    const button = event.target.closest('.calendar__day')
    if (!button || event.altKey || event.ctrlKey || event.metaKey) return
    const iso = button.dataset.date
    const column = (toDate(iso).getDay() + 6) % 7
    const moves = {
      ArrowLeft: () => addDays(iso, -1),
      ArrowRight: () => addDays(iso, 1),
      ArrowUp: () => addDays(iso, -7),
      ArrowDown: () => addDays(iso, 7),
      Home: () => addDays(iso, -column),
      End: () => addDays(iso, 6 - column),
      PageUp: () => addMonths(iso, -1),
      PageDown: () => addMonths(iso, 1),
    }
    if (!moves[event.key]) return
    event.preventDefault()
    const target = moves[event.key]()
    if (!grid.querySelector(`[data-date="${target}"]`) || event.key.startsWith('Page')) {
      showMonthOf(target)
    }
    grid.querySelectorAll('.calendar__day').forEach((day) => {
      day.tabIndex = day.dataset.date === target ? 0 : -1
    })
    focusDay(target)
  })

  register('calendar-prev', () => {
    showMonthOf(addMonths(toIso(shown), -1))
  })

  register('calendar-next', () => {
    showMonthOf(addMonths(toIso(shown), 1))
  })

  register('calendar-today', () => {
    select(TODAY)
    focusDay(TODAY)
  })

  // Sans JavaScript, ces boutons ne feraient rien : ils restent masqués.
  calendar.querySelectorAll('.calendar__nav [hidden]').forEach((button) => {
    button.hidden = false
  })

  // Lien d'un événement du panneau : on lève le filtre pour que la carte soit visible.
  panelList.addEventListener('click', (event) => {
    if (!event.target.closest('.calendar__link[href]')) return
    const all = document.querySelector('.event-filter__input[value="all"]')
    if (all) all.checked = true
  })

  /* ------------------------------------------------------------------------
   * 3. « Participer » et « Mes prochains événements »
   * ---------------------------------------------------------------------- */
  const myList = document.querySelector('.my-events__list')
  const myEmpty = document.querySelector('.my-events__empty')

  const fillBadge = (badge, event) => {
    const date = toDate(event.date)
    badge.dateTime = event.date
    badge.dataset.tone = CATEGORIES[event.category].tone
    badge.querySelector('.date-badge__day').textContent = date.getDate()
    badge.querySelector('.date-badge__month').textContent = monthShort.format(date)
  }

  const renderMine = () => {
    if (!myList) return
    const mine = EVENTS.filter((event) => event.going && event.date >= TODAY)
      .sort(byDate)
      .slice(0, 4)
    myList.replaceChildren(
      ...mine.map((event) => {
        const item = fromTemplate('my-event-template')
        fillBadge(item.querySelector('.date-badge'), event)
        const link = item.querySelector('.my-event__title')
        link.textContent = event.title
        link.href = `#event-${event.id}`
        item.querySelector('.my-event__info').textContent =
          `${capitalize(shortDate.format(toDate(event.date)))} · ${event.start}`
        return item
      }),
    )
    if (myEmpty) myEmpty.hidden = mine.length > 0
  }

  register('join-event', (button) => {
    const joined = button.getAttribute('aria-pressed') !== 'true'
    button.setAttribute('aria-pressed', String(joined))

    const card = button.closest('.event')
    const event = EVENTS.find((item) => `event-${item.id}` === card.id)
    const counter = card.querySelector('.event__count')
    const count = Math.max(0, Number(counter.dataset.count) + (joined ? 1 : -1))
    counter.dataset.count = count
    counter.textContent = plural(count, 'participant')
    if (event) {
      event.going = joined
      event.people = count
    }
    renderMine()

    const title = card.querySelector('.event__title').textContent.trim()
    notify(joined ? `Vous participez à « ${title} »` : `Vous ne participez plus à « ${title} »`)
  })

  /* ------------------------------------------------------------------------
   * 4. Créer un événement
   * ---------------------------------------------------------------------- */
  const dialog = document.getElementById('event-dialog')
  const form = document.getElementById('event-form')
  const list = document.querySelector('.events__list')

  const buildCard = (event) => {
    const category = CATEGORIES[event.category]
    const date = toDate(event.date)
    const item = fromTemplate('event-template')
    item.dataset.category = event.category
    item.dataset.start = `${event.date}T${event.start}`

    const card = item.querySelector('.event')
    card.id = `event-${event.id}`
    card.setAttribute('aria-labelledby', `event-${event.id}-title`)
    item.querySelector('.event__cover').dataset.tone = category.tone
    item.querySelector('.event__cover use').setAttribute('href', `#icon-${category.icon}`)
    fillBadge(item.querySelector('.date-badge'), event)

    const tag = item.querySelector('.tag')
    tag.dataset.tone = category.tone
    tag.textContent = category.label

    const title = item.querySelector('.event__title')
    title.id = `event-${event.id}-title`
    title.textContent = event.title

    const time = item.querySelector('.event__time time')
    time.dateTime = `${event.date}T${event.start}`
    time.textContent = `${capitalize(weekday.format(date))}, ${event.start} – ${event.end}`
    item.querySelector('.event__place-name').textContent = event.place
    item.querySelector('.event__visibility').hidden = event.visibility === 'public'
    item.querySelector('.event__visibility-label').textContent =
      event.visibility === 'amis' ? 'Visible par vos amis' : 'Sur invitation'
    item.querySelector('.event__join-name').textContent = ` à ${event.title}`
    return item
  }

  if (dialog && form && list) {
    const { start, end, date } = form.elements

    // L'heure de fin doit suivre l'heure de début : message natif via setCustomValidity.
    const checkTimes = () => {
      const invalid = start.value && end.value && end.value <= start.value
      end.setCustomValidity(invalid ? 'L’heure de fin doit être après l’heure de début.' : '')
    }
    start.addEventListener('input', checkTimes)
    end.addEventListener('input', checkTimes)

    // Les boutons « Créer un événement » préremplissent la date choisie dans le calendrier.
    register('new-event', () => {
      if (!date.value) date.value = selected >= TODAY ? selected : TODAY
    })

    form.addEventListener('submit', (submitEvent) => {
      checkTimes()
      if (!form.checkValidity()) return
      submitEvent.preventDefault()

      const data = new FormData(form)
      const event = {
        id: `perso-${Date.now()}`,
        date: data.get('date'),
        start: data.get('start'),
        end: data.get('end'),
        title: data.get('title').trim(),
        place: data.get('place').trim() || 'Lieu à préciser',
        category: data.get('category'),
        visibility: data.get('visibility'),
        people: 1,
        going: true,
      }
      EVENTS.push(event)

      // Carte insérée à sa place chronologique dans la liste
      const card = buildCard(event)
      const next = [...list.children].find((item) => item.dataset.start > card.dataset.start)
      list.insertBefore(card, next ?? null)

      select(event.date)
      renderMine()
      form.reset()
      dialog.close()
      notify(`Événement « ${event.title} » ajouté à votre agenda`)
    })
  }

  // Premier rendu : identique au HTML statique, mais avec les tabindex « roving ».
  renderMonth()
  renderPanel()
  renderMine()
})()
