import { Prototype } from '../../web-components-toolbox/src/es/components/msrc/Prototype.js'
import { Intersection } from '../../web-components-toolbox/src/es/components/prototypes/Intersection.js'

export default class OfferList extends Intersection(Prototype()) {
  constructor (options = {}, ...args) {
    super({
      importMetaUrl: import.meta.url,
      intersectionObserverInit: { },
      ...options
    }, ...args)
    this.config = this.configSetup()
    self.Environment.msrcVersion = '20250905080930'
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
    this.msrcOfferListWrapper.scrollIntoView();
    return Promise.all([this.msrc.components.articles.offerlist(this.msrcOfferListWrapper, this.config)])
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
      await this.widgetRenderSetup()
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
