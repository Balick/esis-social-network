/*
 * Post it — pages d'authentification : connexion, inscription, mot de passe oublié.
 *
 * Amélioration progressive : sans JavaScript, les formulaires restent valides
 * grâce à la validation native (required, type="email", pattern, minlength).
 * Ce script ajoute :
 *   1. le bouton « Afficher le mot de passe » (aria-pressed) ;
 *   2. la simulation d'envoi des formulaires (toast puis redirection) ;
 *   3. l'inscription : nom d'utilisateur en minuscules, force du mot de passe
 *      et vérification de la confirmation ;
 *   4. le mot de passe oublié : écran de confirmation à la place du formulaire.
 *
 * Les formulaires concernés portent data-auth="login" | "signup" | "reset".
 */

;(() => {
  'use strict'

  const { notify, register } = window.postit ?? {}
  if (!notify) return

  const REDIRECT_DELAY = 800

  /* ------------------------------------------------------------------------
   * 1. Afficher / masquer le mot de passe
   * <button data-action="toggle-password" aria-controls="id-du-champ" aria-pressed="false">
   * ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-action="toggle-password"]').forEach((button) => {
    button.hidden = false
  })

  register('toggle-password', (button) => {
    const input = document.getElementById(button.getAttribute('aria-controls'))
    if (!input) return
    const visible = button.getAttribute('aria-pressed') !== 'true'
    input.type = visible ? 'text' : 'password'
    button.setAttribute('aria-pressed', String(visible))
    button.querySelector('use')?.setAttribute('href', visible ? '#icon-eye-slash' : '#icon-eye')
  })

  /* ------------------------------------------------------------------------
   * 2. Lien de connexion par e-mail (connexion)
   * ---------------------------------------------------------------------- */
  register('magic-link', () => {
    const email = document.querySelector('[data-auth="login"] input[type="email"]')
    if (!email) return
    if (!email.checkValidity()) {
      email.focus()
      email.reportValidity()
      return
    }
    notify(`Lien de connexion envoyé à ${email.value} ✉️`)
  })

  /* ------------------------------------------------------------------------
   * 3. Inscription : nom d'utilisateur, force du mot de passe, confirmation
   * ---------------------------------------------------------------------- */
  const signup = document.querySelector('[data-auth="signup"]')

  if (signup) {
    const username = signup.querySelector('[data-username]')
    const password = signup.querySelector('[data-password]')
    const confirm = signup.querySelector('[data-password-confirm]')
    const meter = signup.querySelector('[data-meter]')
    const meterText = signup.querySelector('[data-meter-text]')
    const rules = signup.querySelectorAll('[data-rule]')

    // Le nom d'utilisateur n'accepte que des minuscules : on convertit à la volée.
    username?.addEventListener('input', () => {
      const lower = username.value.toLowerCase()
      if (lower !== username.value) username.value = lower
    })

    const RULES = {
      length: (value) => value.length >= 8,
      case: (value) => /\p{Ll}/u.test(value) && /\p{Lu}/u.test(value),
      digit: (value) => /\d/.test(value),
      symbol: (value) => /[^\p{L}\d]/u.test(value),
    }
    const LEVELS = ['à saisir', 'faible', 'moyen', 'bon', 'excellent']
    let currentLevel = 0

    const checkPassword = () => {
      const value = password.value
      let met = 0
      rules.forEach((rule) => {
        const ok = RULES[rule.dataset.rule]?.(value) ?? false
        rule.toggleAttribute('data-met', ok)
        const state = rule.querySelector('[data-rule-state]')
        if (state) state.textContent = ok ? ' (respectée)' : ' (à respecter)'
        if (ok) met += 1
      })
      // Vide : 0. Trop court : « faible » au mieux, quels que soient les caractères.
      let level = 0
      if (value) level = RULES.length(value) ? Math.max(met, 1) : 1
      // On ne met à jour le texte (zone aria-live) que si le niveau change : pas d'annonce à chaque touche.
      if (meter && level !== currentLevel) {
        currentLevel = level
        meter.dataset.level = String(level)
        meterText.textContent = LEVELS[level]
      }
    }

    const checkConfirm = () => {
      const mismatch = confirm.value !== '' && confirm.value !== password.value
      confirm.setCustomValidity(mismatch ? 'Les deux mots de passe doivent être identiques.' : '')
    }

    if (meter) meter.hidden = false
    password?.addEventListener('input', () => {
      checkPassword()
      if (confirm?.value) checkConfirm()
    })
    confirm?.addEventListener('input', checkConfirm)
    if (password) checkPassword()
  }

  /* ------------------------------------------------------------------------
   * 4. Mot de passe oublié : la confirmation remplace le formulaire
   * ---------------------------------------------------------------------- */
  const steps = document.querySelectorAll('[data-reset-step]')
  const showStep = (name) => {
    steps.forEach((step) => {
      step.hidden = step.dataset.resetStep !== name
    })
  }

  const showResetSuccess = (form) => {
    const email = form.querySelector('input[type="email"]').value
    document.querySelectorAll('[data-reset-email]').forEach((target) => {
      target.textContent = email // textContent : aucun HTML injecté
    })
    showStep('done')
    // Le bouton « Envoyer » vient de disparaître : on place le focus sur le titre de la confirmation.
    document.querySelector('[data-reset-step="done"] [tabindex="-1"]')?.focus()
  }

  // « Renvoyer » : petit délai d'attente pour éviter les envois répétés.
  let cooldownTimer
  register('resend-reset', (button) => {
    if (button.getAttribute('aria-disabled') === 'true') return
    const email = document.querySelector('[data-reset-email]')?.textContent ?? ''
    notify(`Nouvel e-mail envoyé à ${email}`)

    const label = button.querySelector('[data-resend-label]')
    const original = label.textContent
    let seconds = 30
    button.setAttribute('aria-disabled', 'true')
    clearInterval(cooldownTimer)
    const tick = () => {
      label.textContent = `${original} (${seconds} s)`
      seconds -= 1
      if (seconds < 0) {
        clearInterval(cooldownTimer)
        label.textContent = original
        button.removeAttribute('aria-disabled')
      }
    }
    tick()
    cooldownTimer = setInterval(tick, 1000)
  })

  // « Utiliser une autre adresse » : retour au formulaire.
  register('edit-reset', () => {
    showStep('form')
    document.querySelector('[data-auth="reset"] input[type="email"]')?.focus()
  })

  /* ------------------------------------------------------------------------
   * 5. Envoi des formulaires (déclenché seulement si la validation native réussit)
   * ---------------------------------------------------------------------- */
  const MESSAGES = {
    login: () => 'Connexion réussie, bon retour parmi nous ! 👋',
    signup: (form) => {
      const firstName = form.querySelector('[autocomplete="given-name"]')?.value.trim()
      return `Bienvenue sur Post it${firstName ? `, ${firstName}` : ''} ! 🎉`
    },
  }
  const PENDING_LABELS = { login: 'Connexion…', signup: 'Création du compte…' }

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('form[data-auth]')
    if (!form) return
    event.preventDefault()

    const kind = form.dataset.auth
    if (kind === 'reset') {
      showResetSuccess(form)
      return
    }
    if (form.hasAttribute('data-pending')) return
    form.setAttribute('data-pending', '')

    const submit = form.querySelector('[type="submit"]')
    submit?.setAttribute('aria-disabled', 'true')
    const label = submit?.querySelector('[data-submit-label]')
    if (label && PENDING_LABELS[kind]) label.textContent = PENDING_LABELS[kind]

    notify(MESSAGES[kind]?.(form) ?? 'C’est fait !')
    setTimeout(() => location.assign(form.getAttribute('action') ?? 'index.html'), REDIRECT_DELAY)
  })
})()
