/*
 * Messagerie (messages.html) : changement de conversation, recherche, envoi de
 * messages avec réponse simulée, pièce jointe, emojis et « Nouveau message ».
 * Dépend de app.js (chargé avant, objet global « postit »).
 *
 * Sans JavaScript, la page reste lisible : les volets s'empilent et chaque lien de
 * la liste affiche sa conversation grâce à :target (voir chat.css).
 */

;(() => {
  'use strict'

  const { notify, register, closePopover, prefersReducedMotion } = window.postit

  const messenger = document.querySelector('.messenger')
  if (!messenger) return

  const list = messenger.querySelector('.messenger__conversations')
  const chatPane = messenger.querySelector('.messenger__chat')
  const form = messenger.querySelector('.chat-form')
  const input = form.querySelector('.chat-form__input')
  const inputLabel = form.querySelector('[data-chat-label]')
  const fileInput = form.querySelector('input[type="file"]')
  const attachments = form.querySelector('.chat-form__attachments')
  const search = messenger.querySelector('.messenger__search')
  const empty = messenger.querySelector('.messenger__empty')
  const summary = messenger.querySelector('[data-unread-summary]')
  const navBadge = document.querySelector('[data-nav="messages"] .badge')

  // Sous 64rem, un seul volet est affiché à la fois (voir chat.css).
  const compact = matchMedia('(width < 64rem)')

  // Date du jour fictive du contenu de démonstration.
  const TODAY = '2026-11-14'
  const JUST_NOW = 'À l’instant'
  const REPLIES = [
    'Ça marche ! 👍',
    'Haha, carrément 😄',
    'Bonne idée, je te redis ça très vite.',
    'Merci, c’est noté 🙏',
    'Trop bien ! On en reparle ce soir ?',
  ]
  let replyIndex = 0

  // Avec JS : la liste d'abord sur petit écran, et nous validons nous-mêmes le formulaire
  // (une pièce jointe seule suffit pour envoyer).
  messenger.dataset.view = 'list'
  form.noValidate = true

  /* ------------------------------------------------------------------------
   * Outils
   * ---------------------------------------------------------------------- */
  const activeChat = () => chatPane.querySelector('.chat[data-active]')
  const linkFor = (chat) => list.querySelector(`.conversation[href="#${chat.id}"]`)
  const firstName = (name) => name.split(' ')[0]
  const behavior = (smooth) => (smooth && !prefersReducedMotion.matches ? 'smooth' : 'auto')
  const numberIn = (element) => Number(element?.textContent.replace(/\D/g, '') || 0)

  /** Fait défiler la conversation jusqu'au dernier message (le fil, ou la page sur mobile). */
  const scrollToEnd = (chat, smooth = false) => {
    const thread = chat.querySelector('.chat__thread')
    if (getComputedStyle(thread).overflowY !== 'visible') {
      thread.scrollTo({ top: thread.scrollHeight, behavior: behavior(smooth) })
    } else if (compact.matches && messenger.dataset.view === 'chat') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: behavior(smooth) })
    }
  }

  /* ------------------------------------------------------------------------
   * Messages non lus : pastille de la conversation, sous-titre et menu latéral
   * ---------------------------------------------------------------------- */
  const updateSummary = () => {
    const total = [...list.querySelectorAll('.conversation__unread')].reduce(
      (sum, badge) => sum + numberIn(badge),
      0,
    )
    const plural = total > 1 ? 's' : ''
    summary.textContent = total ? `${total} message${plural} non lu${plural}` : 'Tout est lu 🎉'
    if (navBadge) {
      navBadge.hidden = total === 0
      navBadge.innerHTML = `<span class="visually-hidden">, </span>${total}<span class="visually-hidden"> non lu${plural}</span>`
    }
  }

  const setUnread = (link, count) => {
    let badge = link.querySelector('.conversation__unread')
    if (count === 0) {
      if (badge) {
        badge.remove()
        updateSummary()
      }
      return
    }
    if (!badge) {
      badge = document.createElement('span')
      badge.className = 'conversation__unread'
      link.append(badge)
    }
    badge.innerHTML = `<span class="visually-hidden">, </span>${count}<span class="visually-hidden"> non lu${count > 1 ? 's' : ''}</span>`
    updateSummary()
  }

  /** Met à jour l'aperçu d'une conversation et la remonte en tête de liste. */
  const updatePreview = (chat, text) => {
    const link = linkFor(chat)
    if (!link) return
    link.querySelector('.conversation__preview').textContent = text
    const time = link.querySelector('.conversation__time')
    time.dateTime = new Date().toISOString()
    time.textContent = JUST_NOW
    list.prepend(link.closest('li'))
  }

  /* ------------------------------------------------------------------------
   * Changer de conversation
   * ---------------------------------------------------------------------- */
  const openChat = (chat, { focus = true } = {}) => {
    activeChat()?.removeAttribute('data-active')
    chat.setAttribute('data-active', '')

    list.querySelectorAll('.conversation[aria-current]').forEach((link) => {
      link.removeAttribute('aria-current')
    })
    const link = linkFor(chat)
    if (link) {
      link.setAttribute('aria-current', 'true')
      setUnread(link, 0)
    }

    // Le champ de saisie s'adresse à la conversation ouverte.
    const name = chat.dataset.name
    inputLabel.textContent = `Message à ${name}`
    input.placeholder = chat.hasAttribute('data-group')
      ? 'Écrire au groupe…'
      : `Écrire à ${firstName(name)}…`

    messenger.dataset.view = 'chat'
    // Petit écran : le volet change, on y amène le focus (titre de la conversation).
    if (compact.matches && focus) chat.querySelector('.chat__name').focus({ preventScroll: true })
    scrollToEnd(chat)
  }

  register('open-conversation', (link, event) => {
    const chat = document.getElementById(link.hash.slice(1))
    if (!chat) return
    event.preventDefault()
    openChat(chat)
  })

  // Bouton « retour » (petit écran) : on revient à la liste, sur la conversation quittée.
  register('close-conversation', (link, event) => {
    event.preventDefault()
    messenger.dataset.view = 'list'
    const chat = activeChat()
    const current = chat && linkFor(chat)
    if (current) current.focus()
    else window.scrollTo({ top: 0 })
  })

  /* ------------------------------------------------------------------------
   * Construire les bulles (textContent uniquement : aucun HTML injecté)
   * ---------------------------------------------------------------------- */
  const ensureToday = (messages) => {
    const days = messages.querySelectorAll('.chat__day time')
    if (days[days.length - 1]?.dateTime === TODAY) return
    const day = document.createElement('li')
    day.className = 'chat__day'
    day.innerHTML = `<time datetime="${TODAY}">Aujourd’hui</time>`
    messages.append(day)
  }

  const createGroup = ({ sent, name, avatar, showAuthor }) => {
    const group = document.createElement('li')
    group.className = sent ? 'message-group message-group--sent' : 'message-group'
    group.dataset.new = ''
    if (!sent) {
      const img = document.createElement('img')
      img.className = 'avatar avatar--sm message-group__avatar'
      img.src = avatar
      img.alt = ''
      img.width = 160
      img.height = 160
      group.append(img)
    }
    const stack = document.createElement('div')
    stack.className = 'message-group__stack'
    stack.innerHTML = `
      <p class="message-group__author${showAuthor ? '' : ' visually-hidden'}"></p>
      <p class="message-group__meta"><time></time></p>`
    stack.querySelector('.message-group__author').textContent = sent ? 'Vous' : name
    group.append(stack)
    return group
  }

  const createFileBubble = (file) => {
    if (file.type.startsWith('image/')) {
      const bubble = document.createElement('div')
      bubble.className = 'message message--media'
      const img = document.createElement('img')
      img.className = 'message__image'
      img.src = URL.createObjectURL(file)
      img.alt = `Image envoyée : ${file.name}`
      bubble.append(img)
      return bubble
    }
    const bubble = document.createElement('p')
    bubble.className = 'message message--file'
    bubble.innerHTML =
      '<svg class="icon" aria-hidden="true"><use href="#icon-paperclip"></use></svg><span></span>'
    bubble.querySelector('span').textContent = file.name
    return bubble
  }

  /** Accusé de lecture d'un groupe envoyé : « sent » (✓) ou « read » (✓✓). */
  const setReceipt = (meta, status) => {
    if (!meta.querySelector('.message-group__receipt')) {
      meta.insertAdjacentHTML(
        'beforeend',
        '<svg class="icon message-group__receipt" aria-hidden="true"><use href=""></use></svg><span class="visually-hidden"></span>',
      )
    }
    meta.dataset.status = status
    const read = status === 'read'
    meta.querySelector('use').setAttribute('href', read ? '#icon-checks' : '#icon-check')
    meta.querySelector('.visually-hidden').textContent = read ? 'Lu' : 'Envoyé'
  }

  /** Ajoute un message au fil, dans le dernier groupe s'il vient de la même personne. */
  const appendMessage = (chat, { sent, text = '', file }) => {
    const messages = chat.querySelector('.chat__messages')
    ensureToday(messages)

    const name = chat.dataset.replyName ?? chat.dataset.name
    const last = messages.lastElementChild
    const sameAuthor =
      last?.matches('.message-group') &&
      last.matches('.message-group--sent') === sent &&
      (sent || last.querySelector('.message-group__author').textContent === name)

    const group = sameAuthor
      ? last
      : createGroup({
          sent,
          name,
          avatar: chat.dataset.avatar,
          showAuthor: chat.hasAttribute('data-group'),
        })
    if (!sameAuthor) messages.append(group)

    const meta = group.querySelector('.message-group__meta')
    const bubbles = []
    if (file) bubbles.push(createFileBubble(file))
    if (text) {
      const bubble = document.createElement('p')
      bubble.className = 'message'
      bubble.textContent = text
      bubbles.push(bubble)
    }
    bubbles.forEach((bubble) => {
      if (sameAuthor) bubble.dataset.new = ''
      meta.before(bubble)
    })

    const time = meta.querySelector('time')
    time.dateTime = new Date().toISOString()
    time.textContent = JUST_NOW
    if (sent) setReceipt(meta, 'sent')
  }

  /* ------------------------------------------------------------------------
   * Réponse simulée : « en train d'écrire… » puis un message
   * ---------------------------------------------------------------------- */
  const timers = new Map()

  const receive = (chat, text) => {
    const typing = chat.querySelector('.typing')
    typing.hidden = true
    appendMessage(chat, { sent: false, text })

    const author = chat.dataset.replyName ?? chat.dataset.name
    updatePreview(chat, chat.hasAttribute('data-group') ? `${firstName(author)} : ${text}` : text)

    if (chat === activeChat()) {
      scrollToEnd(chat, true)
    } else {
      const link = linkFor(chat)
      if (link) setUnread(link, numberIn(link.querySelector('.conversation__unread')) + 1)
      notify(`Nouveau message de ${author}`)
    }
  }

  const simulateReply = (chat) => {
    timers.get(chat)?.forEach(clearTimeout)
    const typing = chat.querySelector('.typing')
    const text = REPLIES[replyIndex++ % REPLIES.length]

    const showTyping = setTimeout(() => {
      // Elle ou il a lu nos messages : ✓✓
      chat.querySelectorAll('.message-group__meta[data-status="sent"]').forEach((meta) => {
        setReceipt(meta, 'read')
      })
      typing.hidden = false
      if (chat === activeChat()) scrollToEnd(chat, true)
    }, 500)
    const reply = setTimeout(() => receive(chat, text), 2000)
    timers.set(chat, [showTyping, reply])
  }

  // Grâce est déjà en train d'écrire à l'ouverture de la page.
  const initialTyping = chatPane.querySelector('[data-typing-initial]')
  if (initialTyping) {
    const chat = initialTyping.closest('.chat')
    const reply = setTimeout(
      () => receive(chat, 'Le bus de 6 h 40 passe juste à côté de chez toi 🚌'),
      3500,
    )
    timers.set(chat, [reply])
  }

  /* ------------------------------------------------------------------------
   * Zone de saisie : envoi, Entrée / Maj + Entrée, emojis, pièce jointe
   * ---------------------------------------------------------------------- */
  let thumbUrl = ''

  const renderAttachment = () => {
    if (thumbUrl) URL.revokeObjectURL(thumbUrl)
    thumbUrl = ''
    const file = fileInput.files[0]
    attachments.hidden = !file
    if (!file) return attachments.replaceChildren()

    const chip = document.createElement('li')
    chip.className = 'chip'
    if (file.type.startsWith('image/')) {
      thumbUrl = URL.createObjectURL(file)
      const thumb = document.createElement('img')
      thumb.className = 'chip__thumb'
      thumb.src = thumbUrl
      thumb.alt = ''
      chip.append(thumb)
    }
    const label = document.createElement('span')
    label.className = 'chip__label'
    label.textContent = file.name
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'chip__remove'
    remove.dataset.action = 'remove-attachment'
    remove.setAttribute('aria-label', `Retirer « ${file.name} »`)
    remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-x"></use></svg>'
    chip.append(label, remove)
    attachments.replaceChildren(chip)
  }

  fileInput.addEventListener('change', renderAttachment)

  register('remove-attachment', () => {
    fileInput.value = ''
    renderAttachment()
    input.focus()
  })

  register('insert-emoji', (button) => {
    input.setRangeText(button.textContent, input.selectionStart, input.selectionEnd, 'end')
    closePopover(button)
    input.focus()
  })

  // Entrée envoie, Maj + Entrée va à la ligne (sauf pendant une saisie IME).
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
    event.preventDefault()
    form.requestSubmit()
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const chat = activeChat()
    const text = input.value.trim()
    const file = fileInput.files[0]
    if (!chat || (!text && !file)) {
      input.value = ''
      input.focus()
      return
    }

    appendMessage(chat, { sent: true, text, file })
    updatePreview(chat, `Vous : ${text || `📎 ${file.name}`}`)
    form.reset()
    renderAttachment()
    input.focus()
    scrollToEnd(chat, true)
    simulateReply(chat)
  })

  /* ------------------------------------------------------------------------
   * Recherche dans la liste (insensible aux accents et à la casse)
   * ---------------------------------------------------------------------- */
  const normalize = (text) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim()

  if (search) {
    search.hidden = false
    const searchInput = search.querySelector('input')
    searchInput.addEventListener('input', () => {
      const query = normalize(searchInput.value)
      let visible = 0
      list.querySelectorAll(':scope > li').forEach((item) => {
        // Premier nœud du nom = le nom seul (sans le « , en ligne » réservé aux lecteurs d'écran)
        const name = item.querySelector('.conversation__name').firstChild.textContent
        const match = normalize(name).includes(query)
        item.hidden = !match
        if (match) visible += 1
      })
      empty.hidden = visible > 0
    })
  }

  /* ------------------------------------------------------------------------
   * « Nouveau message » : boîte de dialogue → conversation existante ou nouvelle
   * ---------------------------------------------------------------------- */

  /** Crée une conversation (volet + ligne de liste) sur le modèle de la première. */
  const createChat = (id, name, avatar) => {
    const chat = chatPane.querySelector('.chat').cloneNode(true)
    const titleId = `conversation-${id}-name`
    chat.id = `conversation-${id}`
    chat.removeAttribute('data-active')
    chat.removeAttribute('data-group')
    chat.removeAttribute('data-reply-name')
    chat.dataset.name = name
    chat.dataset.avatar = avatar
    chat.setAttribute('aria-labelledby', titleId)

    const avatarImg = document.createElement('img')
    avatarImg.className = 'avatar avatar--md'
    avatarImg.src = avatar
    avatarImg.alt = ''
    avatarImg.width = 160
    avatarImg.height = 160
    const presence = chat.querySelector('.chat__header .presence')
    presence.replaceChildren(avatarImg)
    presence.setAttribute('data-online', '')

    const title = chat.querySelector('.chat__name')
    title.id = titleId
    title.textContent = name
    const status = chat.querySelector('.chat__status')
    status.setAttribute('data-online', '')
    status.textContent = 'En ligne'

    const [call, video] = chat.querySelectorAll('.chat__actions [data-message]')
    call.dataset.message = `Appel vocal avec ${name}… (démo)`
    video.dataset.message = `Appel vidéo avec ${name}… (démo)`

    chat.querySelector('.chat__thread').setAttribute('aria-labelledby', titleId)
    chat.querySelector('.chat__messages').replaceChildren()
    const typing = chat.querySelector('.typing')
    typing.hidden = true
    typing.removeAttribute('data-typing-initial')
    typing.querySelector('img').src = avatar
    typing.querySelector('.visually-hidden').textContent = `${name} est en train d’écrire…`
    form.before(chat)

    // Ligne de la liste
    const item = list.querySelector('li').cloneNode(true)
    item.hidden = false
    const link = item.querySelector('.conversation')
    link.href = `#${chat.id}`
    link.removeAttribute('aria-current')
    link.querySelector('.conversation__unread')?.remove()
    const linkPresence = link.querySelector('.presence')
    linkPresence.replaceChildren(avatarImg.cloneNode())
    linkPresence.setAttribute('data-online', '')
    const linkName = link.querySelector('.conversation__name')
    linkName.textContent = name
    linkName.insertAdjacentHTML('beforeend', '<span class="visually-hidden">, en ligne</span>')
    list.prepend(item)
    return chat
  }

  const dialog = document.getElementById('new-message')
  const dialogForm = document.getElementById('new-message-form')
  if (dialog && dialogForm) {
    // Le formulaire (method="dialog") n'est soumis que si les champs requis sont remplis.
    dialogForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const { to, message } = dialogForm.elements
      const text = message.value.trim()
      if (!text) {
        message.value = ''
        message.focus()
        return
      }
      const option = to.selectedOptions[0]
      const name = option.textContent
      const chat =
        document.getElementById(`conversation-${to.value}`) ??
        createChat(to.value, name, option.dataset.avatar)

      dialog.close()
      dialogForm.reset()
      if (search) {
        // La nouvelle conversation doit être visible : on vide la recherche.
        const searchInput = search.querySelector('input')
        searchInput.value = ''
        searchInput.dispatchEvent(new Event('input'))
      }
      openChat(chat)
      appendMessage(chat, { sent: true, text })
      updatePreview(chat, `Vous : ${text}`)
      scrollToEnd(chat)
      notify(`Message envoyé à ${name}`)
      simulateReply(chat)
    })
  }

  /* ------------------------------------------------------------------------
   * Ouverture de la page
   * ---------------------------------------------------------------------- */
  const target = location.hash ? document.getElementById(location.hash.slice(1)) : null
  if (target?.matches('.chat')) {
    openChat(target, { focus: false })
  } else {
    const chat = activeChat()
    if (chat) scrollToEnd(chat)
  }
})()
