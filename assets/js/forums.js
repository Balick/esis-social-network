/*
 * Post it — forums (forums.html et forum-sujet.html).
 *
 * Sans JavaScript, tout reste utilisable : les filtres sont en CSS (:has()),
 * la boîte « Nouveau sujet » s'ouvre avec command/commandfor, « Répondre » est
 * un lien vers le formulaire. Ce script ajoute :
 *   1. le vote (aria-pressed + compteur) et le suivi d'un sujet ;
 *   2. « Répondre » : place le curseur dans le formulaire, avec la mention de l'auteur ;
 *   3. forums.html : message « aucun sujet », lien vers une catégorie (#categorie-web),
 *      publication d'un nouveau sujet ;
 *   4. forum-sujet.html : publication d'une réponse.
 * Le texte saisi est toujours inséré avec textContent (jamais innerHTML).
 */

;(() => {
  'use strict'

  const { notify, register, prefersReducedMotion } = window.postit

  const pluralize = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`
  const readNumber = (element) => Number(element.textContent.replace(/\D/g, '')) || 0
  const scrollBehavior = () => (prefersReducedMotion.matches ? 'auto' : 'smooth')

  /* ------------------------------------------------------------------------
   * 1. Vote et suivi du sujet
   * ---------------------------------------------------------------------- */
  register('forum-vote', (button) => {
    const voted = button.getAttribute('aria-pressed') !== 'true'
    const counter = button.querySelector('.forum-vote__count')
    button.setAttribute('aria-pressed', String(voted))
    if (counter) counter.textContent = String(readNumber(counter) + (voted ? 1 : -1))
  })

  register('follow-topic', (button) => {
    const following = button.getAttribute('aria-pressed') !== 'true'
    button.setAttribute('aria-pressed', String(following))
    button.querySelector('use')?.setAttribute('href', following ? '#icon-check' : '#icon-bell')
    notify(
      following
        ? 'Sujet suivi : vous serez prévenu·e des nouvelles réponses'
        : 'Vous ne suivez plus ce sujet',
    )
  })

  /* ------------------------------------------------------------------------
   * 2. « Répondre » : curseur dans le formulaire, pré-rempli avec @Prénom
   * ---------------------------------------------------------------------- */
  const replyField = document.getElementById('reply-message')

  register('forum-reply', (link, event) => {
    if (!replyField) return
    event.preventDefault()
    const author = link.closest('.forum-post')?.querySelector('.forum-post__author a')?.textContent
    // On ne remplace que le champ vide ou une simple mention (pas un texte en cours).
    if (author && /^(@\S+\s*)?$/.test(replyField.value)) {
      replyField.value = `@${author.trim().split(' ')[0]} `
    }
    replyField.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
    replyField.focus({ preventScroll: true })
    replyField.setSelectionRange(replyField.value.length, replyField.value.length)
  })

  /* ------------------------------------------------------------------------
   * 3. Liste des sujets (forums.html)
   * ---------------------------------------------------------------------- */
  const forum = document.querySelector('.forum')
  const topicList = document.querySelector('.forum-topics')

  if (forum && topicList) {
    const empty = document.querySelector('.forum-topics__empty')
    const checkedValue = (name) => forum.querySelector(`[name="${name}"]:checked`)?.value

    // Même logique que les règles :has() de forum.css, pour savoir si la liste est vide.
    const isVisible = (topic) => {
      const filter = checkedValue('topic-filter') ?? 'recent'
      const category = checkedValue('forum-category') ?? 'all'
      return (
        (filter === 'recent' || topic.hasAttribute(`data-${filter}`)) &&
        (category === 'all' || topic.dataset.category === category)
      )
    }

    const updateEmptyState = () => {
      if (empty) empty.hidden = [...topicList.children].some(isVisible)
    }

    forum.addEventListener('change', (event) => {
      if (event.target.matches('[name="topic-filter"], [name="forum-category"]')) updateEmptyState()
    })

    // Liens vers une catégorie (#categorie-web) : on coche la carte correspondante.
    const selectCategory = (radio, { scroll = true } = {}) => {
      radio.checked = true
      updateEmptyState()
      if (scroll) {
        radio
          .closest('.forum__section')
          ?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
      }
    }

    const categoryFromHash = () => {
      const id = decodeURIComponent(location.hash.slice(1))
      const target = id ? document.getElementById(id) : null
      if (target?.matches('[name="forum-category"]')) selectCategory(target)
    }
    categoryFromHash()
    addEventListener('hashchange', categoryFromHash)

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#categorie-"]')
      const radio = link && document.getElementById(link.hash.slice(1))
      if (!radio?.matches('[name="forum-category"]')) return
      event.preventDefault()
      history.replaceState(null, '', link.hash)
      selectCategory(radio)
    })

    /* ---------- Nouveau sujet ---------- */
    const dialog = document.getElementById('new-topic')
    const form = document.getElementById('new-topic-form')
    const template = document.getElementById('topic-template')

    const slugify = (text) =>
      text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    const createTag = (text, href, tone) => {
      const item = document.createElement('li')
      const tag = document.createElement('a')
      tag.className = 'tag'
      tag.href = href
      tag.textContent = text
      if (tone) tag.dataset.tone = tone
      item.append(tag)
      return item
    }

    form?.addEventListener('submit', (event) => {
      // L'événement n'arrive qu'une fois la validation native passée (required, minlength…).
      event.preventDefault()
      if (!template) return

      const option = form.elements.category.selectedOptions[0]
      const radio = forum.querySelector(`[name="forum-category"][value="${option.value}"]`)
      const topic = template.content.firstElementChild.cloneNode(true)

      topic.dataset.category = option.value
      topic.querySelector('.forum-topic__link').textContent = form.elements.title.value.trim()
      topic.querySelector('.forum-topic__excerpt').textContent = form.elements.message.value
        .trim()
        .replace(/\s+/g, ' ')
      topic.querySelector('time').dateTime = new Date().toISOString()

      const tags = topic.querySelector('.forum-topic__tags')
      tags.append(createTag(option.textContent, `#${radio?.id ?? ''}`, option.dataset.tone))
      form.elements.tags.value
        .split(',')
        .map((tag) => tag.trim().replace(/^#+/, '').slice(0, 24))
        .filter(Boolean)
        .slice(0, 3)
        .forEach((tag) => tags.append(createTag(`#${tag}`, `#tag-${slugify(tag)}`)))

      // On réaffiche tous les sujets pour que le nouveau soit visible.
      forum.querySelector('[name="topic-filter"][value="recent"]').checked = true
      forum.querySelector('[name="forum-category"][value="all"]').checked = true

      topicList.prepend(topic)
      const count = radio?.closest('.forum-category')?.querySelector('[data-count]')
      if (count) count.textContent = (readNumber(count) + 1).toLocaleString('fr-FR')
      updateEmptyState()

      form.reset()
      dialog?.close()
      const link = topic.querySelector('.forum-topic__link')
      link.focus({ preventScroll: true })
      topic.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
      notify('Sujet publié ! Vous serez prévenu·e des réponses.')
    })
  }

  /* ------------------------------------------------------------------------
   * 4. Page d'un sujet : publier une réponse
   * ---------------------------------------------------------------------- */
  const replyForm = document.getElementById('reply-form')
  const replyList = document.querySelector('.forum-replies')
  const replyTemplate = document.getElementById('reply-template')

  replyForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = replyField.value.trim()
    if (!text || !replyList || !replyTemplate) return replyField.focus()

    const item = replyTemplate.content.firstElementChild.cloneNode(true)
    const reply = item.querySelector('.forum-post')
    let index = replyList.children.length + 1
    while (document.getElementById(`reponse-${index}`)) index += 1
    reply.id = `reponse-${index}`
    reply.querySelector('time').dateTime = new Date().toISOString()

    // Un paragraphe par bloc séparé d'une ligne vide.
    const body = reply.querySelector('.forum-post__body')
    text.split(/\n\s*\n/).forEach((paragraph) => {
      const p = document.createElement('p')
      p.textContent = paragraph.trim()
      body.append(p)
    })

    replyList.append(item)
    const total = replyList.children.length
    document.querySelectorAll('[data-reply-count]').forEach((counter) => {
      counter.textContent = pluralize(total, 'réponse')
    })

    replyForm.reset()
    reply.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' })
    notify('Réponse publiée')
  })
})()
