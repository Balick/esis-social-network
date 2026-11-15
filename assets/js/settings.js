/*
 * Post it — page « Paramètres » (amélioration progressive).
 *
 * Sans JavaScript, la page reste utilisable : les ancres du sommaire mènent aux
 * sections, la validation des champs est native (:user-invalid) et le thème suit
 * le système. Ce script ajoute :
 *   1. la section visible signalée dans le sommaire (aria-current) ;
 *   2. l'enregistrement simulé des formulaires (toast) ;
 *   3. l'aperçu de la photo de profil et le compteur de la bio ;
 *   4. le mot de passe : afficher/masquer, force, règles, confirmation ;
 *   5. « Tout désactiver » pour les notifications, taille du texte ;
 *   6. la boîte de suppression du compte (bouton actif après « SUPPRIMER »).
 *
 * Le choix du thème (input[name="theme"]) est déjà géré par app.js.
 */

;(() => {
  'use strict'

  const { notify, register, prefersReducedMotion } = window.postit
  const byId = (id) => document.getElementById(id)

  /* ------------------------------------------------------------------------
   * 1. Sommaire : la section visible reçoit aria-current="true"
   * ---------------------------------------------------------------------- */
  const navList = document.querySelector('.settings__nav-list')
  const navLinks = [...document.querySelectorAll('.settings__nav-link')]
  const sections = navLinks.map((link) => byId(link.hash.slice(1))).filter(Boolean)

  // Barre de pastilles (mobile) : centre la pastille active sans faire défiler la page.
  const revealLink = (link) => {
    if (!navList || navList.scrollWidth <= navList.clientWidth) return
    const item = link.parentElement
    const offset = item.getBoundingClientRect().left - navList.getBoundingClientRect().left
    navList.scrollTo({
      left: navList.scrollLeft + offset - (navList.clientWidth - item.offsetWidth) / 2,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
    })
  }

  let currentId
  const setCurrent = (id) => {
    if (!id || id === currentId) return
    currentId = id
    navLinks.forEach((link) => {
      const current = link.hash === `#${id}`
      if (current) {
        link.setAttribute('aria-current', 'true')
        revealLink(link)
      } else {
        link.removeAttribute('aria-current')
      }
    })
  }

  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Set()
    const atBottom = () => innerHeight + scrollY >= document.documentElement.scrollHeight - 2

    const update = () => {
      // En bas de page, la dernière section (courte) ne peut plus monter : on la choisit.
      if (atBottom()) return setCurrent(sections.at(-1).id)
      // Sinon : la dernière section (dans l'ordre de la page) entrée dans le haut de l'écran.
      const last = sections.findLast((section) => visible.has(section))
      if (last) setCurrent(last.id)
    }

    // Bande observée : les 40 % supérieurs de la fenêtre.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target),
        )
        update()
      },
      { rootMargin: '0px 0px -60% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    addEventListener('scrollend', update)
  }

  /* ------------------------------------------------------------------------
   * 2. Formulaires : le navigateur valide les champs (required, type, pattern…)
   * avant d'émettre « submit » ; on simule alors l'enregistrement.
   * ---------------------------------------------------------------------- */
  const forms = document.querySelectorAll('form[data-settings-form]')
  const resetHandlers = []

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      notify('Modifications enregistrées')
    })
    // « reset » survient AVANT le retour aux valeurs d'origine : on attend la tâche suivante.
    form.addEventListener('reset', () => setTimeout(() => resetHandlers.forEach((fn) => fn(form))))
  })

  /* ------------------------------------------------------------------------
   * 3. Profil : aperçu de la photo et compteur de la bio
   * ---------------------------------------------------------------------- */
  const avatarInput = byId('avatar')
  const avatarPreview = byId('avatar-preview')
  const MAX_PHOTO_SIZE = 2 * 1024 * 1024

  if (avatarInput && avatarPreview) {
    const original = { src: avatarPreview.getAttribute('src'), alt: avatarPreview.alt }
    let objectUrl

    const restore = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      objectUrl = undefined
      avatarPreview.src = original.src
      avatarPreview.alt = original.alt
    }

    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files[0]
      if (!file) return
      if (!file.type.startsWith('image/') || file.size > MAX_PHOTO_SIZE) {
        avatarInput.value = ''
        notify('Choisissez une image JPG, PNG ou WebP de 2 Mo maximum')
        return
      }
      restore()
      objectUrl = URL.createObjectURL(file) // fichier local : rien n'est envoyé
      avatarPreview.src = objectUrl
      avatarPreview.alt = 'Aperçu de votre nouvelle photo de profil'
      notify('Nouvelle photo prête : enregistrez pour la garder')
    })

    resetHandlers.push((form) => form.contains(avatarInput) && restore())
  }

  const bio = byId('bio')
  const bioCount = byId('bio-count')
  const bioLive = byId('bio-live')

  if (bio && bioCount) {
    const max = bio.maxLength
    let liveTimer

    const renderCount = (announce) => {
      const left = max - bio.value.length
      bioCount.textContent = `${bio.value.length} / ${max}`
      if (left <= 10) bioCount.dataset.state = 'warn'
      else delete bioCount.dataset.state
      if (!announce || !bioLive) return
      // Annonce aux lecteurs d'écran seulement quand la frappe marque une pause.
      clearTimeout(liveTimer)
      liveTimer = setTimeout(() => {
        bioLive.textContent = left > 1 ? `${left} caractères restants` : `${left} caractère restant`
      }, 700)
    }

    bio.addEventListener('input', () => renderCount(true))
    resetHandlers.push(() => renderCount(false))
    renderCount(false)
  }

  /* ------------------------------------------------------------------------
   * 4. Mot de passe
   * ---------------------------------------------------------------------- */
  register('toggle-password', (button) => {
    const input = button.parentElement.querySelector('input')
    const show = button.getAttribute('aria-pressed') !== 'true'
    input.type = show ? 'text' : 'password'
    button.setAttribute('aria-pressed', String(show))
    button.querySelector('use').setAttribute('href', show ? '#icon-eye-slash' : '#icon-eye')
  })

  const toggles = document.querySelectorAll('[data-action="toggle-password"]')
  toggles.forEach((button) => (button.hidden = false))

  const currentPassword = byId('current-password')
  const newPassword = byId('new-password')
  const confirmPassword = byId('confirm-password')
  const strength = document.querySelector('.settings__strength')
  const strengthLabel = byId('password-strength')
  const rules = document.querySelectorAll('.settings__rule')

  const RULES = {
    length: (value) => value.length >= 8,
    case: (value) => /\p{Ll}/u.test(value) && /\p{Lu}/u.test(value),
    digit: (value) => /\p{N}/u.test(value),
    symbol: (value) => /[^\p{L}\p{N}\s]/u.test(value),
  }
  const LEVELS = ['à saisir', 'faible', 'moyen', 'bon', 'excellent']

  const renderPassword = () => {
    const value = newPassword.value
    let score = 0

    rules.forEach((rule) => {
      const valid = RULES[rule.dataset.rule](value)
      if (valid) score++
      rule.dataset.valid = String(valid)
      rule
        .querySelector('use')
        .setAttribute('href', valid ? '#icon-check-circle' : '#icon-x-circle')
      rule.querySelector('[data-rule-state]').textContent = valid
        ? 'Respecté : '
        : 'Non respecté : '
    })
    // Dès le premier caractère : au moins « faible » ; trop court : jamais mieux.
    if (value) score = RULES.length(value) ? Math.max(score, 1) : 1
    else score = 0

    strength.dataset.strength = String(score)
    const label = `Force du mot de passe : ${LEVELS[score]}`
    if (strengthLabel.textContent !== label) strengthLabel.textContent = label

    // Messages de la validation native : affichés via :user-invalid (forms.css).
    newPassword.setCustomValidity(
      value && score < 3 ? 'Ce mot de passe est trop faible : suivez les règles ci-dessous.' : '',
    )
    confirmPassword.setCustomValidity(
      confirmPassword.value !== value ? 'Les deux mots de passe ne correspondent pas.' : '',
    )
    // Changer de mot de passe demande l'actuel.
    currentPassword.required = Boolean(value || confirmPassword.value)
  }

  if (currentPassword && newPassword && confirmPassword && strength && strengthLabel) {
    strength.hidden = false
    newPassword.addEventListener('input', renderPassword)
    confirmPassword.addEventListener('input', renderPassword)
    resetHandlers.push((form) => {
      if (!form.contains(newPassword)) return
      toggles.forEach((button) => {
        if (button.getAttribute('aria-pressed') === 'true') button.click()
      })
      renderPassword()
    })
    renderPassword()
  }

  /* ------------------------------------------------------------------------
   * 5. Notifications et apparence
   * ---------------------------------------------------------------------- */
  const notificationSwitches = [...document.querySelectorAll('#notifications .switch')]
  const toggleAll = document.querySelector('[data-action="toggle-notifications"]')

  const renderToggleAll = () => {
    if (!toggleAll) return
    const anyOn = notificationSwitches.some((input) => input.checked)
    toggleAll.querySelector('[data-notifications-label]').textContent = anyOn
      ? 'Tout désactiver'
      : 'Tout activer'
    toggleAll.querySelector('use').setAttribute('href', anyOn ? '#icon-bell-slash' : '#icon-bell')
  }

  register('toggle-notifications', () => {
    const anyOn = notificationSwitches.some((input) => input.checked)
    notificationSwitches.forEach((input) => (input.checked = !anyOn))
    renderToggleAll()
    notify(anyOn ? 'Notifications toutes désactivées' : 'Notifications toutes activées')
  })

  if (toggleAll) {
    toggleAll.hidden = false
    notificationSwitches.forEach((input) => input.addEventListener('change', renderToggleAll))
    renderToggleAll()
  }

  const textSize = byId('text-size')
  textSize?.addEventListener('change', () =>
    notify(`Taille du texte : ${textSize.selectedOptions[0].text} (démonstration)`),
  )

  /* ------------------------------------------------------------------------
   * 6. Suppression du compte : <dialog> ouvert par command="show-modal"
   * ---------------------------------------------------------------------- */
  const deleteDialog = byId('delete-account')
  const deleteForm = byId('delete-account-form')
  const deleteInput = byId('delete-confirm')
  const deleteButton = deleteDialog?.querySelector('[data-delete-submit]')

  if (deleteDialog && deleteForm && deleteInput && deleteButton) {
    const CONFIRM_WORD = 'SUPPRIMER'
    const syncDeleteButton = () => {
      deleteButton.disabled = deleteInput.value !== CONFIRM_WORD
    }

    deleteInput.addEventListener('input', syncDeleteButton)
    syncDeleteButton()

    // method="dialog" : le bouton « Supprimer définitivement » ferme la boîte avec returnValue = "delete".
    deleteDialog.addEventListener('close', () => {
      if (deleteDialog.returnValue === 'delete') {
        notify('Compte supprimé… pour de faux : ceci est une démonstration')
      }
      deleteDialog.returnValue = ''
      deleteForm.reset()
      syncDeleteButton()
    })
  }
})()
