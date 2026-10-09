// Minimal inline icon set (stroke icons, 24-grid), matching the CM prototype's look.
const PATHS: Record<string, string> = {
  journeys: 'M4 18 9 6l3 7 3-5 5 10',
  monitor: 'M4 19V9M10 19V5M16 19v-8M22 19H2',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
  email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  sms: 'M4 5h16v11H9l-5 4z',
  push: 'M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3zM10 19a2 2 0 0 0 4 0',
  event: 'M13 2 4 14h7l-1 8 9-12h-7z',
  wait: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
  split: 'M4 12h6l4-6h6M10 12l4 6h6',
  shuffle: 'M3 7h4l10 10h4M3 17h4l10-10h4M18 4l3 3-3 3M18 14l3 3-3 3',
  control: 'M5 5h14v14H5zM9 9h6v6H9z',
  exit: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM9 9h6v6H9z',
  engagement: 'M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  segment: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 3v9l7 5',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  send: 'M22 2 11 13M22 2 15 22l-4-9-9-4z',
  lr: 'M3 12h16M15 8l4 4-4 4',
  tb: 'M12 3v16M8 15l4 4 4-4',
  zoomin: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4M11 8v6M8 11h6',
  zoomout: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4M8 11h6',
  fit: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  check: 'M4 12l5 5L20 7',
  x: 'M6 6l12 12M18 6 6 18',
  chevron: 'M6 9l6 6 6-6',
  back: 'M15 6l-6 6 6 6',
  info: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 11v5M12 8h.01',
  warn: 'M12 3 2 21h20zM12 10v5M12 18h.01',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0',
  diff: 'M4 5h7v14H4zM13 5h7v14h-7zM7 9v6M14 12h5',
  collapse: 'M8 10l4-4 4 4M8 14l4 4 4-4',
  expand: 'M8 4l4 4 4-4M8 20l4-4 4 4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2',
  code: 'M8 6l-6 6 6 6M16 6l6 6-6 6',
}

export function Icon({ name, size = 16, className }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  )
}

export const CHANNEL_ICON: Record<'email' | 'sms' | 'push', string> = { email: 'email', sms: 'sms', push: 'push' }

export function ChannelIcon({ channel, title }: { channel: 'email' | 'sms' | 'push'; title?: string }) {
  return (
    <span className={`ic ${channel}`} title={title ?? channel.toUpperCase()}>
      <Icon name={CHANNEL_ICON[channel]} size={13} />
    </span>
  )
}
