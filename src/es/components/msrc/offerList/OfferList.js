import { Prototype } from '../../web-components-toolbox/src/es/components/msrc/Prototype.js'
import { Intersection } from '../../web-components-toolbox/src/es/components/prototypes/Intersection.js'

export default class OfferList extends Intersection(Prototype()) {
  constructor (options = {}, ...args) {
    super({
      importMetaUrl: import.meta.url,
      intersectionObserverInit: { },
      ...options
    }, ...args)
    this.msrcVersion = '20260323090506'
    this.config = this.configSetup()
    self.Environment = self.Environment || {}
    self.Environment.msrcVersion = this.msrcVersion
    this.hasRetriedAfterMsrcReload = false
  }

  connectedCallback () {
    super.connectedCallback()
    document.body.addEventListener(this.getAttribute('request-list-articles') || 'request-list-articles', this.requestListArticlesEventListener)
    document.body.addEventListener('request-href-' + (this.getAttribute('request-list-articles') || 'request-list-articles'), this.requestHrefEventListener)
    if (!this.hasAttribute('no-popstate')) self.addEventListener('popstate', this.updatePopState)
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    document.body.removeEventListener(this.getAttribute('request-list-articles') || 'request-list-articles', this.requestListArticlesEventListener)
    document.body.removeEventListener('request-href-' + (this.getAttribute('request-list-articles') || 'request-list-articles'), this.requestHrefEventListener)
    if (!this.hasAttribute('no-popstate')) self.removeEventListener('popstate', this.updatePopState)
  }

  intersectionCallback (entries, observer) {
    if ((this.isIntersecting = this.areEntriesIntersecting(entries))) {
      this.hidden = true
      const showPromises = []
      if (this.shouldRender()) showPromises.push(this.render())
      Promise.all(showPromises).then(() => {
        this.hidden = false
        if (this.shouldRenderCSS()) {
          this.renderCSS()
          // Issue loading animation hanging
          // https://jira.migros.net/browse/SHAREDCMP-2625
          setTimeout(() => {
            const scrollY = self.scrollY
            self.scroll(0, scrollY + 1)
            self.scroll(0, scrollY)
          }, 200)
          this.intersectionObserveStop()
        }
      }).catch(error => {
        this.hidden = false
        // Keep the component from causing unhandled promise errors in the page runtime.
        console.error('[voi-msrc-offer-list] render failed', error)
      })
    }
  }

  configSetup () {
    // https://react-components.migros.ch/?path=/docs/msrc-articles-04-widgets-offer-list--documentation
    return this.constructor.parseAttribute(this.getAttribute('config') || '{}')
  }

  /**
   * render the widget
   *
   * @return {Promise<[void, any]>}
   */
  async widgetRenderSetup () {
    this.msrcOfferListWrapper.scrollIntoView()
    const renderer = this.msrc?.components?.articles?.offerlist
    if (typeof renderer !== 'function') {
      throw new Error(`msrc offerlist renderer unavailable for version ${this.msrcVersion}`)
    }
    return Promise.all([renderer(this.msrcOfferListWrapper, this.config)])
  }

  getMsrcBaseUrl () {
    return (self.Environment && self.Environment.msrcBaseUrl) || 'https://cdn.migros.ch'
  }

  getMsrcMainScriptSrc () {
    return `${this.getMsrcBaseUrl()}/msrc/${this.msrcVersion}/main.js`
  }

  loadMsrcMainScript (forceReload = false) {
    return new Promise((resolve, reject) => {
      const src = this.getMsrcMainScriptSrc()
      let script = document.head.querySelector(`script[data-msrc-main="${this.msrcVersion}"]`)
      const onLoad = () => resolve()
      const onError = () => reject(new Error(`Failed to load ${src}`))

      if (forceReload && script) {
        script.remove()
        script = null
      }

      if (!script) {
        script = document.createElement('script')
        script.setAttribute('type', 'text/javascript')
        script.setAttribute('async', '')
        script.setAttribute('data-msrc-main', this.msrcVersion)
        script.setAttribute('src', forceReload ? `${src}?t=${Date.now()}` : src)
        document.head.appendChild(script)
      }

      if ('msrc' in self === true && typeof self.msrc?.components?.articles?.offerlist === 'function') {
        return resolve()
      }

      script.addEventListener('load', onLoad, { once: true })
      script.addEventListener('error', onError, { once: true })
    })
  }

  resetMsrcRuntimeGlobals () {
    delete self.msrc
    delete self.webpackChunk_migros_msrc_cdn_build
    Array.from(document.querySelectorAll('script[src*="/msrc/"]')).forEach(script => script.remove())
    this.dependencyPromise = undefined
  }

  async forceReloadMsrcDependency () {
    self.Environment = self.Environment || {}
    self.Environment.msrcVersion = this.msrcVersion
    // Force a clean reload in case another widget initialized an incompatible msrc runtime first.
    this.resetMsrcRuntimeGlobals()
    await this.loadMsrcMainScript(true)
    const msrc = await this.loadDependency()
    const renderer = msrc?.components?.articles?.offerlist
    if (typeof renderer !== 'function') {
      throw new Error(`msrc offerlist renderer is still unavailable after reload for version ${this.msrcVersion}`)
    }
    return msrc
  }

  /**
   * evaluates if a render is necessary
   *
   * @return {boolean}
   */
  shouldRenderCSS () {
    return !this.root.querySelector(`${this.cssSelector} > style[_css]`)
  }

  shouldRender () {
    return !this.msrcOfferListWrapper
  }

  render () {
    this.msrcOfferListWrapper = this.root.querySelector('div') || document.createElement('div')
    return this.loadDependency().then(async msrc => {
      this.msrc = msrc
      try {
        await this.widgetRenderSetup()
      } catch (error) {
        if (this.hasRetriedAfterMsrcReload) throw error
        this.hasRetriedAfterMsrcReload = true
        this.msrc = await this.forceReloadMsrcDependency()
        await this.widgetRenderSetup()
      }
      const getStylesReturn = this.getStyles(document.createElement('style'))
      this.html = [this.msrcOfferListWrapper, getStylesReturn[0]]
      return getStylesReturn[1] // use this line if css build up should be avoided
    })
  }

  renderCSS () {
    this.css = /* css */`
      :host > div{
        margin: var(--offerlist-default-margin, 0);
      }
    `
  }
}
