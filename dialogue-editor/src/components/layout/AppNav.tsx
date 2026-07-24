import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '編輯器', end: true },
  { to: '/simulate', label: '對話模擬' },
  { to: '/tutorial', label: '教學' },
]

export function AppNav() {
  return (
    <nav className="app-nav" aria-label="主要導覽">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            isActive ? 'app-nav__link active' : 'app-nav__link'
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
