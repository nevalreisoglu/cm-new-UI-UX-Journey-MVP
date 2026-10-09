import type { Contact, Language, MessageContent, Step } from './types'

// Roadmap item 7 — test send: placeholder rendering of a message for one contact and payload.

export function contactFields(c: Contact): Record<string, string> {
  return { first_name: c.firstName, last_name: c.lastName, email: c.email, phone: c.phone ?? '', plan: c.plan, language: c.language.toUpperCase() }
}

export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k: string) => (values[k] !== undefined && values[k] !== '' ? values[k] : `⟨${k}⟩`))
}

export function renderMessage(step: Extract<Step, { type: 'message' }>, language: Language, values: Record<string, string>): string {
  const c: MessageContent = step.message.content[language]
  if (step.message.channel === 'email') {
    const e = c as { subject: string; preheader: string; body: string }
    return `Subject: ${fill(e.subject, values)}\nPreheader: ${fill(e.preheader, values)}\n\n${fill(e.body, values)}`
  }
  if (step.message.channel === 'sms') return fill((c as { text: string }).text, values)
  const p = c as { title: string; text: string; link: string }
  return `${fill(p.title, values)}\n${fill(p.text, values)}\n${fill(p.link, values)}`
}
