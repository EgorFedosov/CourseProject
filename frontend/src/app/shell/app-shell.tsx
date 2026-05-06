import { NavLink, Outlet } from 'react-router-dom'
import { navigationRoutes } from '../../entities/navigation/model/navigation-routes'
import { HealthStatusBadge } from '../../features/health-status/ui/health-status-badge'

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'

export const AppShell = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__content">
          <div className="app-header__hero">
            <h1>Intelligent Document Checker</h1>
            <p>Автоматическая проверка документов на соответствие требованиям.</p>
            <HealthStatusBadge />
          </div>
          <nav className="app-nav" aria-label="Основная навигация">
            {navigationRoutes.map((route) => (
              <NavLink key={route.path} to={route.path} className={navClassName} title={route.hint}>
                {route.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="app-layout">
        <main className="app-main" aria-live="polite">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
