import './Homepage.css'

const quickActions = [
  { id: 'explore', label: 'Explore' },
  { id: 'saved', label: 'Saved' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'offers', label: 'Offers' },
]

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search' },
  { id: 'activity', label: 'Activity' },
  { id: 'profile', label: 'Profile' },
]

const activeNavItem = 'home'

/**
 * Starting point for the mobile homepage redesign.
 *
 * Replace these placeholder sections with the components from the Figma file.
 * Record the Figma node that each section maps to in `design/figma-references.md`.
 */
export function Homepage() {
  return (
    <div className="homepage">
      <header className="homepage__header">
        <p className="homepage__greeting">Good morning</p>
        <h1 className="homepage__title">Homepage</h1>
      </header>

      <main className="homepage__content">
        <section className="homepage__hero" aria-labelledby="hero-title">
          <h2 className="homepage__hero-title" id="hero-title">
            Mobile redesign starts here
          </h2>
          <p className="homepage__hero-body">
            Point Copilot at a Figma frame and build this screen out section by
            section.
          </p>
        </section>

        <section aria-labelledby="quick-actions-title">
          <h2 className="homepage__section-title" id="quick-actions-title">
            Quick actions
          </h2>
          <ul className="homepage__actions">
            {quickActions.map((action) => (
              <li key={action.id}>
                <button className="homepage__action" type="button">
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <nav className="homepage__nav" aria-label="Primary">
        {navItems.map((item) => (
          <button
            aria-current={item.id === activeNavItem ? 'page' : undefined}
            className={
              item.id === activeNavItem
                ? 'homepage__nav-item homepage__nav-item--active'
                : 'homepage__nav-item'
            }
            key={item.id}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
