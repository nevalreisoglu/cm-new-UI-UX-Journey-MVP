import type { Channel, ContentItem } from '../model/types'

// Ready-made content items, one language each (item 4). Managed outside the journey layer;
// a Delivery step only picks one. Placeholders: contact fields, event payload fields and
// offer_name / offer_code / offer_link from the Delivery's offer.

const email = (id: string, name: string, language: 'fr' | 'en', subject: string, preheader: string, body: string, isDefault = false): ContentItem => ({ id, channel: 'email', name, language, isDefault, body: { subject, preheader, body } })
const sms = (id: string, name: string, language: 'fr' | 'en', text: string, isDefault = false): ContentItem => ({ id, channel: 'sms', name, language, isDefault, body: { text } })
const push = (id: string, name: string, language: 'fr' | 'en', title: string, text: string, link: string, isDefault = false): ContentItem => ({ id, channel: 'push', name, language, isDefault, body: { title, text, link } })

export const CONTENTS: ContentItem[] = [
  // ---- email ----
  email('c-generic-fr', 'Message générique', 'fr', 'Un message de votre fournisseur', 'Nouvelles de votre compte', 'Bonjour {{first_name}},\n\nNous avons une information pour vous concernant votre forfait {{plan}}.\n\nL’équipe', true),
  email('c-generic-en', 'Generic message', 'en', 'A message from your provider', 'News about your account', 'Hi {{first_name}},\n\nWe have an update for you about your {{plan}} plan.\n\nThe team'),
  email('c-cart-new-fr', 'Panier – nouveau client', 'fr', 'Bienvenue {{first_name}} – terminez votre première commande', '{{device_name}} vous attend', 'Bonjour {{first_name}},\n\nVotre {{device_name}} ({{price}} $) est toujours dans votre panier. Comme nouveau client, profitez de {{offer_name}} avec le code {{offer_code}}.\n\n{{cart_url}}'),
  email('c-cart-new-en', 'Cart – new customer', 'en', 'Welcome {{first_name}} – finish your first order', '{{device_name}} is waiting', 'Hi {{first_name}},\n\nYour {{device_name}} ({{price}} $) is still in your cart. As a new customer, enjoy {{offer_name}} with code {{offer_code}}.\n\n{{cart_url}}'),
  email('c-cart-fr', 'Panier abandonné', 'fr', 'Votre panier vous attend – {{device_name}}', 'Encore disponible au même prix', 'Bonjour {{first_name}},\n\nVotre {{device_name}} à {{price}} $ est réservé pendant 24 h.\n\nReprendre ma commande : {{cart_url}}'),
  email('c-cart-en', 'Abandoned cart', 'en', 'Your cart is waiting – {{device_name}}', 'Still available at the same price', 'Hi {{first_name}},\n\nYour {{device_name}} at {{price}} $ is reserved for 24 h.\n\nResume my order: {{cart_url}}'),
  email('c-cart-old-fr', 'Panier abandonné (ancien gabarit)', 'fr', 'Vous avez oublié quelque chose – {{device_name}}', 'Toujours en stock', 'Bonjour {{first_name}},\n\nVotre {{device_name}} est toujours disponible.\n\n{{cart_url}}'),
  email('c-cart-old-en', 'Abandoned cart (old template)', 'en', 'You left something behind – {{device_name}}', 'Still in stock', 'Hi {{first_name}},\n\nYour {{device_name}} is still available.\n\n{{cart_url}}'),
  email('c-stock-fr', 'Retour en stock', 'fr', '{{device_name}} est de retour en stock', 'Les quantités sont limitées', 'Bonjour {{first_name}},\n\nBonne nouvelle : {{device_name}} est de nouveau disponible.\n\nCommander : {{product_url}}'),
  email('c-stock-en', 'Back in stock', 'en', '{{device_name}} is back in stock', 'Quantities are limited', 'Hi {{first_name}},\n\nGood news: {{device_name}} is available again.\n\nOrder now: {{product_url}}'),
  email('c-welcome-fr', 'Bienvenue', 'fr', 'Bienvenue chez nous, {{first_name}} !', 'Votre forfait {{plan_name}} est actif', 'Bonjour {{first_name}},\n\nVotre forfait {{plan_name}} est actif depuis le {{activation_date}}. Pour bien commencer : {{offer_name}}.\n\nActiver mon cadeau : {{offer_link}}'),
  email('c-welcome-en', 'Welcome', 'en', 'Welcome aboard, {{first_name}}!', 'Your {{plan_name}} plan is active', 'Hi {{first_name}},\n\nYour {{plan_name}} plan has been active since {{activation_date}}. To get you started: {{offer_name}}.\n\nClaim my gift: {{offer_link}}'),
  email('c-payment-fr', 'Rappel de paiement', 'fr', 'Rappel : paiement de {{amount}} $ en attente', 'Évitez l’interruption de service', 'Bonjour {{first_name}},\n\nNous n’avons pas pu encaisser {{amount}} $. Mettez à jour votre mode de paiement avant le {{due_date}}.\n\n{{pay_url}}'),
  email('c-payment-en', 'Payment reminder', 'en', 'Reminder: {{amount}} $ payment pending', 'Avoid a service interruption', 'Hi {{first_name}},\n\nWe could not collect {{amount}} $. Update your payment method before {{due_date}}.\n\n{{pay_url}}'),
  email('c-roaming-fr', 'Promo itinérance', 'fr', 'Cet été, voyagez avec votre forfait {{new_plan}}', '{{offer_name}}', 'Bonjour {{first_name}},\n\nAvec {{new_plan}}, profitez de {{offer_name}} jusqu’au 31 août. Code : {{offer_code}}\n\n{{offer_link}}'),
  email('c-roaming-en', 'Roaming promo', 'en', 'This summer, travel with your {{new_plan}} plan', '{{offer_name}}', 'Hi {{first_name}},\n\nWith {{new_plan}}, enjoy {{offer_name}} until August 31. Code: {{offer_code}}\n\n{{offer_link}}'),
  email('c-plan-en', 'Plan change confirmation', 'en', 'Your plan is now {{new_plan}}', 'From {{old_plan}} to {{new_plan}}', 'Hi {{first_name}},\n\nYour plan changed from {{old_plan}} to {{new_plan}}.'),
  // ---- sms ----
  sms('s-generic-fr', 'SMS générique', 'fr', '{{first_name}}, un message de votre fournisseur concernant votre forfait {{plan}}.', true),
  sms('s-generic-en', 'Generic SMS', 'en', '{{first_name}}, a message from your provider about your {{plan}} plan.'),
  sms('s-stock-fr', 'Retour en stock – rappel', 'fr', '{{device_name}} est encore disponible – commandez avant la rupture : {{product_url}}'),
  sms('s-stock-en', 'Back in stock – nudge', 'en', '{{device_name}} is still available – order before it sells out: {{product_url}}'),
  sms('s-gift-fr', 'Cadeau de bienvenue', 'fr', '{{first_name}}, votre cadeau {{offer_name}} vous attend : {{offer_link}}'),
  sms('s-gift-en', 'Welcome gift', 'en', '{{first_name}}, your gift {{offer_name}} is waiting: {{offer_link}}'),
  sms('s-payment-fr', 'Paiement refusé', 'fr', 'Votre paiement de {{amount}} $ a été refusé. Réglez avant le {{due_date}} : {{pay_url}}'),
  sms('s-payment-en', 'Payment failed', 'en', 'Your payment of {{amount}} $ was declined. Pay before {{due_date}}: {{pay_url}}'),
  sms('s-roaming-fr', 'Promo itinérance', 'fr', '{{offer_name}} avec {{new_plan}} – jusqu’au 31 août. Code {{offer_code}}'),
  sms('s-roaming-en', 'Roaming promo', 'en', '{{offer_name}} with {{new_plan}} – until August 31. Code {{offer_code}}'),
  // ---- push ----
  push('p-generic-fr', 'Push générique', 'fr', 'Votre fournisseur', 'Une nouvelle information vous attend dans l’application.', 'https://app.example.com', true),
  push('p-generic-en', 'Generic push', 'en', 'Your provider', 'New information is waiting in the app.', 'https://app.example.com'),
  push('p-stock-fr', 'Retour en stock', 'fr', 'De retour en stock', '{{device_name}} est disponible', '{{product_url}}'),
  push('p-stock-en', 'Back in stock', 'en', 'Back in stock', '{{device_name}} is available', '{{product_url}}'),
  push('p-tips-fr', 'Astuces application', 'fr', 'Découvrez l’application', 'Gérez votre forfait {{plan_name}} en un clic', 'https://app.example.com/tips'),
  push('p-tips-en', 'App tips', 'en', 'Discover the app', 'Manage your {{plan_name}} plan in one tap', 'https://app.example.com/tips'),
  push('p-payment-fr', 'Dernier rappel de paiement', 'fr', 'Dernier rappel', 'Paiement de {{amount}} $ attendu avant le {{due_date}}', '{{pay_url}}'),
  push('p-payment-en', 'Last payment reminder', 'en', 'Last reminder', '{{amount}} $ payment due before {{due_date}}', '{{pay_url}}'),
]

export const contentById = (id: string | null) => (id ? CONTENTS.find((c) => c.id === id) : undefined)
export const contentsFor = (channel: Channel) => CONTENTS.filter((c) => c.channel === channel)
export const defaultContentFor = (channel: Channel) => CONTENTS.find((c) => c.channel === channel && c.isDefault)
