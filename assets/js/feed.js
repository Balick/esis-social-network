/*
 * Fil d'actualité (index.html) : compositeur de publication et lecteur de stories.
 * Dépend de app.js (chargé avant, objet global « postit »).
 */

;(() => {
  'use strict'

  const { notify, register, closePopover, prefersReducedMotion } = window.postit

  /* ------------------------------------------------------------------------
   * 1. Compositeur
   * ---------------------------------------------------------------------- */
  const composer = document.querySelector('.composer')
  if (composer) {
    const input = composer.querySelector('.composer__input')
    const audience = composer.querySelector('.composer__select')
    const fileInput = composer.querySelector('[data-kind="file"]')
    const imageInput = composer.querySelector('[data-kind="image"]')
    const locationButton = composer.querySelector('[data-action="toggle-location"]')
    const attachments = composer.querySelector('.composer__attachments')
    const feedList = document.querySelector('.feed__list')
    const template = document.getElementById('post-template')
    const TONES = ['mint', 'sky', 'lilac', 'cream']
    const LOCATION = 'Lubumbashi, RDC'
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

    const renderAttachments = () => {
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

    register('insert-emoji', (button) => {
      input.setRangeText(button.textContent, input.selectionStart, input.selectionEnd, 'end')
      closePopover(button)
      input.focus()
    })

    register('toggle-location', (button) => {
      const active = button.getAttribute('aria-pressed') !== 'true'
      button.setAttribute('aria-pressed', String(active))
      renderAttachments()
    })

    register('remove-attachment', (button) => {
      const kind = button.dataset.kind
      if (kind === 'location') locationButton.setAttribute('aria-pressed', 'false')
      else composer.querySelector(`[data-kind="${kind}"]`).value = ''
      renderAttachments()
      input.focus()
    })

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

      // Identifiants uniques pour la zone de commentaires du modèle
      const comments = post.querySelector('.comments')
      comments.id = `${id}-comments`
      const commentInput = comments.querySelector('.comment-form__input')
      commentInput.id = `${id}-comment`
      comments.querySelector('.comment-form label').htmlFor = commentInput.id

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
  }

  /* ------------------------------------------------------------------------
   * 2. Lecteur de stories
   * Sans JavaScript, chaque story est un simple lien vers son image.
   * Avec : une boîte de dialogue plein écran, défilement automatique,
   * flèches du clavier, pause au survol.
   * ---------------------------------------------------------------------- */
  const viewer = document.querySelector('.story-viewer')
  const storyLinks = [...document.querySelectorAll('.story__link')]
  if (!viewer || storyLinks.length === 0) return

  const image = viewer.querySelector('.story-viewer__image')
  const avatar = viewer.querySelector('.story-viewer__avatar')
  const name = viewer.querySelector('.story-viewer__name')
  const progress = viewer.querySelector('.story-viewer__progress')
  const stories = storyLinks.map((link) => ({
    src: link.getAttribute('href'),
    alt: link.dataset.alt ?? '',
    name: link.querySelector('.story__name').lastChild.textContent.trim(),
    avatar: link.querySelector('.avatar').getAttribute('src'),
  }))

  // Une barre de progression par story
  progress.replaceChildren(
    ...stories.map(() => {
      const bar = document.createElement('span')
      bar.className = 'story-viewer__bar'
      return bar
    }),
  )
  const bars = [...progress.children]
  let current = 0

  const show = (index) => {
    if (index < 0) index = 0
    if (index >= stories.length) return viewer.close()
    current = index
    const story = stories[index]
    image.src = story.src
    image.alt = story.alt
    avatar.src = story.avatar
    name.textContent = story.name
    bars.forEach((bar, i) => {
      bar.dataset.state = i < index ? 'done' : i === index ? 'active' : 'todo'
      // Relance l'animation de la barre active
      bar.getAnimations?.().forEach((animation) => animation.cancel())
    })
    bars[index].style.animation = 'none'
    void bars[index].offsetWidth
    bars[index].style.animation = ''
  }

  // Fin de la barre active → story suivante (sauf si l'utilisateur limite les animations)
  progress.addEventListener('animationend', (event) => {
    if (prefersReducedMotion.matches) return
    if (event.target.dataset.state === 'active') show(current + 1)
  })

  storyLinks.forEach((link, index) =>
    link.addEventListener('click', (event) => {
      event.preventDefault()
      viewer.showModal()
      show(index)
    }),
  )

  register('story-prev', () => show(current - 1))
  register('story-next', () => show(current + 1))

  viewer.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(current + 1)
    if (event.key === 'ArrowLeft') show(current - 1)
  })
})()
