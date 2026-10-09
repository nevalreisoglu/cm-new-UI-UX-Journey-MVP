import type { EventDef } from '../model/types'

// Roadmap item 3 — fixed event catalogue (no admin screen).
export const EVENTS: EventDef[] = [
  {
    id: 'order_abandoned',
    name: 'Order abandoned',
    description: 'A device order was started in the web shop and not completed.',
    payload: [
      { name: 'device_name', type: 'string', sample: 'Pixel 9a 128 GB' },
      { name: 'cart_url', type: 'url', sample: 'https://shop.example.com/cart/8f2a1' },
      { name: 'price', type: 'number', sample: '649.00' },
    ],
  },
  {
    id: 'account_created',
    name: 'Account created',
    description: 'A new customer account was activated.',
    payload: [
      { name: 'plan_name', type: 'string', sample: 'Mobile 20 GB' },
      { name: 'activation_date', type: 'date', sample: '2026-10-08' },
    ],
  },
  {
    id: 'device_back_in_stock',
    name: 'Device back in stock',
    description: 'A device a contact asked to be notified about is available again.',
    payload: [
      { name: 'device_name', type: 'string', sample: 'Galaxy S25 256 GB' },
      { name: 'product_url', type: 'url', sample: 'https://shop.example.com/p/galaxy-s25' },
    ],
  },
  {
    id: 'payment_failed',
    name: 'Payment failed',
    description: 'A recurring payment was declined.',
    payload: [
      { name: 'amount', type: 'number', sample: '42.50' },
      { name: 'due_date', type: 'date', sample: '2026-10-15' },
      { name: 'pay_url', type: 'url', sample: 'https://my.example.com/pay/7c31' },
    ],
  },
  {
    id: 'plan_changed',
    name: 'Plan changed',
    description: 'A customer moved to another plan.',
    payload: [
      { name: 'old_plan', type: 'string', sample: 'Mobile 10 GB' },
      { name: 'new_plan', type: 'string', sample: 'Mobile 40 GB' },
    ],
  },
]

export const eventById = (id: string) => EVENTS.find((e) => e.id === id)

/** Contact fields usable as placeholders next to the payload fields (item 4). */
export const CONTACT_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'plan', 'language']
