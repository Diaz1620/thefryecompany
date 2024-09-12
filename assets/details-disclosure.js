class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('keyup', this.onKeyUp);
    this.mainDetailsToggle = this.querySelector('details');
    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('mouseover', this.onHover.bind(this));
  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    const summaryElement = openDetailsElement.querySelector('summary');
    openDetailsElement.removeAttribute('open');
    summaryElement.focus();
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    })
  }

  onHover(event) {
    event.preventDefault();
    this.open(event);
  }

  onMenuClose(event) {
    if (!this.contains(event.target)) this.close(false);
  }

  open(event) {
    event.target.closest('nav').querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
    });

    this.onMenuCloseEvent =
      this.onMenuCloseEvent || this.onMenuClose.bind(this);
    this.mainDetailsToggle.setAttribute('open', true);
    document.body.addEventListener('click', this.onMenuCloseEvent);
    document.body.addEventListener('mouseover', this.onMenuCloseEvent);

    trapFocus(
      this.mainDetailsToggle.querySelector('.header__submenu-contents')
    );
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.mainDetailsToggle : null);
    this.mainDetailsToggle.removeAttribute('open');
    document.body.removeEventListener('click', this.onMenuCloseEvent);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);
