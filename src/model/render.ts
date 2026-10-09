import type { Contact, ContentItem, Offer } from './types'

// Roadmap item 7 — test send: placeholder rendering of a content item for one contact, payload and offer.

export function contactFields(c: Contact): Record<string, string> {
  return { first_name: c.firstName, last_name: c.lastName, email: c.email, phone: c.phone ?? '', plan: c.plan, language: c.language.toUpperCase() }
}

export function offerFields(o: Offer | undefined): Record<string, string> {
  return o ? { offer_name: o.name, offer_code: o.code, offer_link: o.link } : {}
}

export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k: string) => (values[k] !== undefined && values[k] !== '' ? values[k] : `⟨${k}⟩`))
}

export function renderContent(item: ContentItem, values: Record<string, string>): string {
  if (item.channel === 'email') {
    const e = item.body as { subject: string; preheader: string; body: string }
    return `Subject: ${fill(e.subject, values)}\nPreheader: ${fill(e.preheader, values)}\n\n${fill(e.body, values)}`
  }
  if (item.channel === 'sms') return fill((item.body as { text: string }).text, values)
  const p = item.body as { title: string; text: string; link: string }
  return `${fill(p.title, values)}\n${fill(p.text, values)}\n${fill(p.link, values)}`
}
