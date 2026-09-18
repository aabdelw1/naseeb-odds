import { track } from './analytics'

// The about and FAQ text lives in index.html so search engines read it without running the app.
// Here it becomes a second view: "Learn more" opens it at #about, and Back returns. Everything
// is driven by the address, so the browser's own back button works too, and with no JavaScript
// the text simply stays on the page.

export const ABOUT_HASH = '#about'

export function setupAboutPage(): void {
  const back = document.getElementById('about-back')
  if (back) back.hidden = false

  let wasShowing = false
  const apply = () => {
    const showing = window.location.hash === ABOUT_HASH
    document.body.classList.toggle('showing-about', showing)
    if (showing !== wasShowing) {
      window.scrollTo(0, 0)
      if (showing) track('learn-more')
    }
    wasShowing = showing
  }

  window.addEventListener('hashchange', apply)
  back?.addEventListener('click', () => {
    // Prefer real history so the page the reader came from is restored, scroll and all.
    if (window.history.length > 1) window.history.back()
    else window.history.replaceState(null, '', window.location.pathname + window.location.search)
    // replaceState doesn't fire hashchange.
    apply()
  })
  apply()
}
