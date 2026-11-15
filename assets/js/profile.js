/*
 * Post it — script de la page de profil (amélioration progressive).
 *
 * Sans JavaScript, la page reste complète : les onglets sont en CSS, chaque vignette
 * est un lien vers sa photo et « Modifier le profil » ouvre la boîte en HTML
 * (command/commandfor). Ce script ajoute :
 *   1. la modification du profil : aperçu de la photo, compteur de la bio,
 *      mise à jour du texte visible à l'enregistrement ;
 *   2. la visionneuse de photos (onglet Médias et « Photos récentes ») ;
 *   3. le lien « Tout voir » qui ouvre l'onglet Médias.
 */

;(() => {
  'use strict'

  const { notify, register, prefersReducedMotion } = window.postit

  /* ------------------------------------------------------------------------
   * 1. Modifier le profil
   * ---------------------------------------------------------------------- */
  const dialog = document.getElementById('edit-profile')
  const form = document.getElementById('edit-profile-form')

  if (dialog && form) {
    const fields = form.elements
    const preview = form.querySelector('.profile-edit__preview')
    const counter = form.querySelector('.profile-edit__counter')
    const bioMax = Number(fields.bio.maxLength) || 160

    // Les éléments de la page qui affichent une information du profil
    const targets = (key) => document.querySelectorAll(`[data-profile="${key}"]`)
    const sidebarName = document.querySelector('.sidebar .profile__name')
    const sidebarAvatar = document.querySelector('.sidebar .profile__avatar')

    // État courant du profil, lu une fois dans le HTML
    const state = {
      name: targets('name')[0]?.textContent.trim() ?? '',
      bio: targets('bio')[0]?.textContent.trim() ?? '',
      location: targets('location')[0]?.textContent.trim() ?? '',
      website: fields.website.value,
      avatar: targets('avatar')[0]?.getAttribute('src') ?? '',
    }
    let pendingAvatar = null

    // « https://exemple.dev/ » → « exemple.dev »
    const displayUrl = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

    const updateCounter = () => {
      const length = fields.bio.value.length
      counter.textContent = `${length} / ${bioMax}`
      counter.toggleAttribute('data-state', false)
      if (bioMax - length <= 10) counter.dataset.state = 'limit'
    }

    // Remet le formulaire dans l'état du profil (ouverture, annulation)
    const fillForm = () => {
      fields.name.value = state.name
      fields.bio.value = state.bio
      fields.location.value = state.location
      fields.website.value = state.website
      fields.avatar.value = ''
      if (pendingAvatar) URL.revokeObjectURL(pendingAvatar)
      pendingAvatar = null
      preview.src = state.avatar
      updateCounter()
    }

    // Affiche le texte (textContent : aucun HTML injecté) et masque la ligne si elle est vide
    const render = (key, value, hideTarget) => {
      targets(key).forEach((element) => {
        element.textContent = value
        const container = hideTarget ? element.closest(hideTarget) : element
        if (container) container.hidden = value === ''
      })
    }

    const applyProfile = () => {
      state.name = fields.name.value.trim() || state.name
      state.bio = fields.bio.value.trim()
      state.location = fields.location.value.trim()
      state.website = fields.website.value.trim()
      if (pendingAvatar) {
        if (state.avatar.startsWith('blob:')) URL.revokeObjectURL(state.avatar)
        state.avatar = pendingAvatar
        pendingAvatar = null // désormais affichée : on ne la libère plus
      }

      render('name', state.name)
      render('bio', state.bio)
      render('location', state.location, 'li, .profile-info__row')
      render('website', displayUrl(state.website), 'li')

      targets('avatar').forEach((img) => {
        img.src = state.avatar
        img.alt = `Photo de profil de ${state.name}`
      })
      if (sidebarName) sidebarName.textContent = state.name
      if (sidebarAvatar) sidebarAvatar.src = state.avatar
      document.title = `${state.name} (@buzan) — Post it`
    }

    fields.bio.addEventListener('input', updateCounter)

    // Aperçu immédiat de la nouvelle photo (elle ne quitte jamais l'appareil)
    fields.avatar.addEventListener('change', () => {
      const [file] = fields.avatar.files
      if (!file) return
      if (!file.type.startsWith('image/')) {
        fields.avatar.value = ''
        notify('Choisissez un fichier image (JPG, PNG ou WebP)')
        return
      }
      if (pendingAvatar) URL.revokeObjectURL(pendingAvatar)
      pendingAvatar = URL.createObjectURL(file)
      preview.src = pendingAvatar
    })

    // Le formulaire est valide (sinon le navigateur bloque l'envoi) : method="dialog" fermera la boîte.
    form.addEventListener('submit', () => {
      applyProfile()
      notify('Profil mis à jour')
    })

    // Fermeture (Enregistrer, Annuler, Échap, clic à l'extérieur) : on repart de l'état enregistré.
    dialog.addEventListener('close', fillForm)
    fillForm()
  }

  /* ------------------------------------------------------------------------
   * 2. Visionneuse de photos
   * Les liens <a data-lightbox="groupe"> d'un même groupe défilent ensemble.
   * ---------------------------------------------------------------------- */
  const lightbox = document.getElementById('profile-lightbox')

  if (lightbox) {
    const image = lightbox.querySelector('.profile-lightbox__image')
    const caption = lightbox.querySelector('.profile-lightbox__text')
    const counter = lightbox.querySelector('.profile-lightbox__counter')
    let group = []
    let current = 0

    const show = (index) => {
      current = (index + group.length) % group.length
      const link = group[current]
      const thumb = link.querySelector('img')
      // Dimensions de la miniature : la photo garde ses proportions dès l'affichage
      image.width = Number(thumb.getAttribute('width'))
      image.height = Number(thumb.getAttribute('height'))
      image.src = link.getAttribute('href')
      image.alt = thumb.alt
      caption.textContent = thumb.alt
      counter.textContent = `${current + 1} / ${group.length}`
    }

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-lightbox]')
      // Ctrl/Cmd + clic, clic molette… : on laisse le navigateur ouvrir l'image
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return
      event.preventDefault()
      group = [...document.querySelectorAll(`a[data-lightbox="${link.dataset.lightbox}"]`)]
      lightbox.dataset.count = String(group.length)
      show(group.indexOf(link))
      lightbox.showModal()
    })

    register('lightbox-prev', () => show(current - 1))
    register('lightbox-next', () => show(current + 1))

    lightbox.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') show(current - 1)
      if (event.key === 'ArrowRight') show(current + 1)
    })
  }

  /* ------------------------------------------------------------------------
   * 3. « Tout voir » : coche l'onglet visé puis fait défiler jusqu'aux onglets
   * <a href="#profile-tab-media" data-action="show-tab" data-tab="profile-tab-media">
   * ---------------------------------------------------------------------- */
  register('show-tab', (link, event) => {
    const radio = document.getElementById(link.dataset.tab)
    if (!radio) return
    event.preventDefault()
    radio.checked = true
    radio.closest('.tabs')?.scrollIntoView({
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    })
    radio.focus({ preventScroll: true })
  })
})()
