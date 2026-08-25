/** Shared Call / WhatsApp icon buttons for branch phone lists. */

import { getBranchPhones } from './config.js'
import { onLangChange, t } from './i18n.js'

const CALL_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.7 3.8c.5-.5 1.3-.6 1.9-.2l2.1 1.3c.6.4.8 1.1.6 1.8l-.6 1.9c-.1.4 0 .8.3 1.1l2.7 2.7c.3.3.7.4 1.1.3l1.9-.6c.7-.2 1.4 0 1.8.6l1.3 2.1c.4.6.3 1.4-.2 1.9l-1.1 1.1c-.6.6-1.4.9-2.2.8-2.1-.2-5.1-1.5-7.9-4.3S4.5 10.3 4.3 8.2c-.1-.8.2-1.6.8-2.2l1.6-1.6Z"/></svg>`

const WA_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.96.52 3.86 1.5 5.54L2 22l4.78-1.55a10.05 10.05 0 0 0 5.26 1.43h.01c5.46 0 9.89-4.4 9.89-9.84C21.94 6.4 17.5 2 12.04 2Zm5.77 13.99c-.24.68-1.4 1.24-1.94 1.32-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.26-4.79-4.18-4.93-4.38-.14-.2-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.35.26-.28.57-.35.76-.35h.55c.18 0 .42-.07.65.5.24.58.81 2 .88 2.14.07.14.12.3.02.49-.1.2-.15.32-.29.49-.14.17-.3.38-.43.51-.14.14-.29.29-.12.56.16.28.73 1.2 1.56 1.94 1.08.96 1.98 1.26 2.26 1.4.28.14.44.12.6-.07.17-.2.7-.81.89-1.09.18-.28.37-.23.62-.14.26.1 1.63.77 1.91.91.28.14.47.21.54.32.07.12.07.68-.17 1.36Z"/></svg>`

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

/**
 * One number with Call (+ WhatsApp when not a landline).
 * @param {{ display: string, tel: string, whatsappUrl: string, supportsWhatsApp?: boolean }} phone
 * @param {{ linkAttr?: string, iconsOnly?: boolean }} [opts]
 */
export function phoneRowHtml(phone, { linkAttr = '', iconsOnly = false } = {}) {
  const extra = linkAttr ? ` ${linkAttr}` : ''
  const callAria = escapeAttr(t('phone.callAria', { phone: phone.display }))
  const call = `<a class="phone-btn phone-btn-call" href="${phone.tel}" aria-label="${callAria}" title="${callAria}"${extra}>${CALL_ICON}</a>`
  const wa = phone.supportsWhatsApp
    ? (() => {
        const waAria = escapeAttr(t('phone.waAria', { phone: phone.display }))
        return `<a class="phone-btn phone-btn-wa" href="${phone.whatsappUrl}" target="_blank" rel="noopener noreferrer" aria-label="${waAria}" title="${waAria}"${extra}>${WA_ICON}</a>`
      })()
    : ''
  if (iconsOnly) {
    return `<span class="phone-row phone-row--icons">${call}${wa}</span>`
  }
  return `<span class="phone-row"><span class="phone-row-num">${escapeAttr(phone.display)}</span><span class="phone-row-actions">${call}${wa}</span></span>`
}

/** @param {ReturnType<typeof getBranchPhones>} phones */
export function phonesListHtml(phones, opts = {}) {
  const sep = opts.iconsOnly
    ? ''
    : '<span class="phone-row-sep" aria-hidden="true">·</span>'
  return phones.map((p) => phoneRowHtml(p, opts)).join(sep)
}

/**
 * Fill every `[data-branch-id]` phone list under `scope`.
 * Map branch cards use `.branch-phones`; visit cards use `.branch-contact-phones`.
 */
export function renderBranchPhoneLists(scope = document) {
  scope.querySelectorAll('[data-branch-id]').forEach((el) => {
    const id = el.getAttribute('data-branch-id')
    const phones = getBranchPhones(id)
    if (!phones.length) return

    let row =
      el.querySelector('.branch-phones') ||
      el.querySelector('.branch-contact-phones') ||
      el.querySelector('[data-branch-phone-list]')

    if (!row) {
      row = document.createElement('span')
      row.className = 'branch-phones'
      el.appendChild(row)
    }

    const linkAttr = el.classList.contains('branch-item') ? 'data-branch-link' : ''
    row.innerHTML = phonesListHtml(phones, { linkAttr })
    el.querySelector('.branch-contact-actions')?.remove()
  })
}

/** Visit section + any static branch cards (map list is filled when map boots). */
export function initBranchPhoneLists() {
  renderBranchPhoneLists()
  onLangChange(() => renderBranchPhoneLists())
}
