// Single source of UI icons: 24×24 stroke icons that follow `currentColor`.
// Decorative by design (aria-hidden): the control around an icon carries the label.
const ICONS = {
  today: (<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>),
  pantry: (<><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M5 10h14M9 6v1.5M9 13v3"/></>),
  chef: (<path d="M4 11h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6zM2 11h20M8 7c0-1.5 1-1.5 1-3M13 7c0-1.5 1-1.5 1-3"/>),
  cart: (<path d="M3 9h18l-1.8 10a2 2 0 0 1-2 1.7H6.8a2 2 0 0 1-2-1.7L3 9zM8 9l3-5M16 9l-3-5"/>),
  user: (<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M16 2v4M8 2v4"/></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>),
  receipt: (<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6"/>),
  camera: (<><path d="M3 8h3l1.6-2.4A1 1 0 0 1 8.4 5h7.2a1 1 0 0 1 .8.6L18 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></>),
  plus: (<path d="M12 5v14M5 12h14"/>),
  search: (<><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></>),
  sort: (<path d="M4 6h16M4 12h11M4 18h6"/>),
  flag: (<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>),
  trash: (<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>),
  check: (<path d="M5 12.5l4.5 4.5L19 7"/>),
  close: (<path d="M6 6l12 12M18 6L6 18"/>),
  chevL: (<path d="M15 5l-7 7 7 7"/>),
  chevR: (<path d="M9 5l7 7-7 7"/>),
  chevD: (<path d="M5 9l7 7 7-7"/>),
  chevU: (<path d="M5 15l7-7 7 7"/>),
  arrowRight: (<path d="M5 12h14M13 6l6 6-6 6"/>),
  arrowUp: (<path d="M12 19V5M6 11l6-6 6 6"/>),
  expand: (<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>),
  collapse: (<path d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7"/>),
  more: (<><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></>),
  bell: (<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 21h4"/>),
  sparkle: (<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17z"/>),
  wifiOff: (<path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>),
  alert: (<path d="M12 3l10 18H2L12 3zM12 10v5M12 18h.01"/>),
  info: (<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>),
  pencil: (<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>),
  bookmark: (<path d="M7 3h10v18l-5-4-5 4V3z"/>),
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>),
  eyeOff: (<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>),
  moon: (<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>),
  monitor: (<><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></>),
  download: (<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>),
  upload: (<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>),
  phone: (<><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></>),
  // storage sections
  jar: (<path d="M8 3h8v3H8zM7 6h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM5 12h14"/>),
  fridge: (<path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM6 10h12M9 6v2M9 13v3"/>),
  snow: (<path d="M12 2v20M4.9 7l14.2 10M19.1 7L4.9 17M9 3.5l3 2 3-2M9 20.5l3-2 3 2"/>),
  // meal categories
  coffee: (<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM16 9h2a2 2 0 0 1 0 5h-2M7 3v2M11 3v2"/>),
  bowl: (<path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-1.5 1-3M13 7c0-1.5 1-1.5 1-3"/>),
  moonStar: (<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>),
  apple: (<path d="M12 7c-2-2-7-1-7 5 0 4 3 8 5 8 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8 0-6-5-7-7-5zM12 7c0-2 1-3 3-4"/>),
}

export function Icon({ name, size = 20, strokeWidth = 1.8, fill = 'none', className, style }) {
  const body = ICONS[name]
  if (!body) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flex: 'none', ...style }}
    >
      {body}
    </svg>
  )
}

const SECTION_ICON_NAME = { credenza: 'jar', frigo: 'fridge', freezer: 'snow' }

export function SectionIcon({ section, size = 14, ...rest }) {
  return <Icon name={SECTION_ICON_NAME[section] ?? 'jar'} size={size} {...rest} />
}
