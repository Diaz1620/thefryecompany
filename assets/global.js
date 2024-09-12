function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', class MediaGallery extends HTMLElement {
    constructor() {
      super();
      this.elements = {
        liveRegion: this.querySelector('[id^="GalleryStatus"]'),
        viewer: this.querySelector('[id^="GalleryViewer"]'),
        thumbnails: this.querySelector('[id^="GalleryThumbnails"]')
      }
      this.mql = window.matchMedia('(min-width: 750px)');
      if (!this.elements.thumbnails) return;

      this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
      this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
        mediaToSwitch.querySelector('button').addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
      });
      if (this.dataset.desktopLayout !== 'stacked' && this.mql.matches) this.removeListSemantic();
    }

    onSlideChanged(event) {
      const thumbnail = this.elements.thumbnails.querySelector(`[data-target="${ event.detail.currentElement.dataset.mediaId }"]`);
      this.setActiveThumbnail(thumbnail);
    }

    setActiveMedia(mediaId, prepend) {
      const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${ mediaId }"]`);
      this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
        element.classList.remove('is-active');
      });
      activeMedia.classList.add('is-active');

      if (prepend) {
        activeMedia.parentElement.prepend(activeMedia);
        if (this.elements.thumbnails) {
          const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
          activeThumbnail.parentElement.prepend(activeThumbnail);
        }
        if (this.elements.viewer.slider) this.elements.viewer.resetPages();
      }

      this.preventStickyHeader();
      window.setTimeout(() => {
        if (this.elements.thumbnails) {
          activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
        }
        if (!this.elements.thumbnails || this.dataset.desktopLayout === 'stacked') {
          activeMedia.scrollIntoView({behavior: 'smooth'});
        }
      });
      this.playActiveMedia(activeMedia);

      if (!this.elements.thumbnails) return;
      const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
      this.setActiveThumbnail(activeThumbnail);
      this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
    }

    setActiveThumbnail(thumbnail) {
      if (!this.elements.thumbnails || !thumbnail) return;

      this.elements.thumbnails.querySelectorAll('button').forEach((element) => element.removeAttribute('aria-current'));
      thumbnail.querySelector('button').setAttribute('aria-current', true);
      if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

      this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
    }

    announceLiveRegion(activeItem, position) {
      const image = activeItem.querySelector('.product__modal-opener--image img');
      if (!image) return;
      image.onload = () => {
        this.elements.liveRegion.setAttribute('aria-hidden', false);
        this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace(
          '[index]',
          position
        );
        setTimeout(() => {
          this.elements.liveRegion.setAttribute('aria-hidden', true);
        }, 2000);
      };
      image.src = image.src;
    }

    playActiveMedia(activeItem) {
      window.pauseAllMedia();
      const deferredMedia = activeItem.querySelector('.deferred-media');
      if (deferredMedia) deferredMedia.loadContent(false);
    }

    preventStickyHeader() {
      this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
      if (!this.stickyHeader) return;
      this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
    }

    removeListSemantic() {
      if (!this.elements.viewer.slider) return;
      this.elements.viewer.slider.setAttribute('role', 'presentation');
      this.elements.viewer.sliderItems.forEach(slide => slide.setAttribute('role', 'presentation'));
    }
  });
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', 'false');

  if(summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if(navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

    if (mouseClick) return;

    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('focused');

  }, true);
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    //this.input.addEventListener('change', this.updateQtyMax);
    this.changeEvent = new Event('change', { bubbles: true })

    this.querySelectorAll('button').forEach(
      (button) => button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }

  /** Setting Quantity input to maximum product quantity on keyboard input **/
  // updateQtyMax() {
  //   let qtyMax = this.input.getAttribute("max");

  //   if (qtyMax != null && Number(this.input.value) > qtyMax) {
  //     this.input.value = (qtyMax != 0) ? qtyMax : 1;
  //   }
  // }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

/*
 * Shopify Common JS
 *
 */
if ((typeof window.Shopify) == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
};

Shopify.setSelectorByValue = function(selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function(target, eventName, callback) {
  target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on'+eventName, callback);
};

Shopify.postLink = function(path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for(var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
  this.countryEl         = document.getElementById(country_domid);
  this.provinceEl        = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function() {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function() {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function(e) {
    var opt       = this.countryEl.options[this.countryEl.selectedIndex];
    var raw       = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function(selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function(selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    if (navigator.platform === 'iPhone') document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.querySelectorAll('button').forEach(button => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if(!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary')) : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if(isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        !reducedMotion || reducedMotion.matches ? addTrapFocus() : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event !== undefined) {
      this.mainDetailsToggle.classList.remove('menu-opening');
      this.mainDetailsToggle.querySelectorAll('details').forEach(details =>  {
        details.removeAttribute('open');
        details.classList.remove('menu-opening');
      });
      document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
      removeTrapFocus(elementToFocus);
      this.closeAnimation(this.mainDetailsToggle);
    }
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement)) this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus();
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    }

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.getElementById('shopify-section-header');
    this.borderOffset = this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty('--header-bottom-position', `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`);

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this)
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target.nodeName === 'MODAL-DIALOG') this.hide();
      });
    }
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    if(opener.classList.contains('helper-opener')) {
      let header = document.querySelector('#shopify-section-header');
      if (header.classList.contains('shopify-section-header-sticky')) {
        header.classList.add('shopify-section-header-hidden')
      }
      document.body.classList.add('helper-modal');
    }
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.classList.remove('helper-modal');
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver(entries => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0);
    this.sliderLastItem = this.sliderItemsToShow[this.sliderItemsToShow.length - 1];
    if (this.sliderItemsToShow.length === 0) return;
    this.slidesPerPage = Math.floor(this.slider.clientWidth / this.sliderItemsToShow[0].clientWidth);
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderLastItem.clientWidth) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(new CustomEvent('slideChanged', { detail: {
        currentPage: this.currentPage,
        currentElement: this.sliderItemsToShow[this.currentPage - 1]
      }}));
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0])) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderLastItem)) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (element.offsetLeft + element.clientWidth) <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition = event.currentTarget.name === 'next' ? this.slider.scrollLeft + (step * this.sliderLastItem.clientWidth) : this.slider.scrollLeft - (step * this.sliderLastItem.clientWidth);
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach(link => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
    this.autoplaySpeed = this.slider.dataset.speed * 1000;

    this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    this.play();
    this.autoplayButtonIsSetToPlay = true;
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) return;

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }
    this.slider.scrollTo({
      left: this.slideScrollPosition
    });
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach(link => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
    this.play();
  }

  focusInHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
      this.play();
    } else if (this.autoplayButtonIsSetToPlay) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition = this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.slider.querySelector('.slideshow__slide').clientWidth;
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }

  setSlideVisibility() {
    this.sliderItemsToShow.forEach((item, index) => {
      const button = item.querySelector('a');
      if (index === this.currentPage - 1) {
        if (button) button.removeAttribute('tabindex');
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (button) button.setAttribute('tabindex', '-1');
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
    this.additionalVariantData = JSON.parse(document.getElementById('additionalVariantData').textContent);
    this.setColorVariantLabel();
    this.setAmountVariantLabel();
    this.setSizeVariantLabel();
    this.initCurrentVariant();
    this.updateMaxVariantQuantityOnLoad();
    this.setPriceLabelAddButton();
    this.updateVariantMedia();
    this.addOutOfStockClass();
    this.initHelpers();
    this.isFinalSaleCheck();

    if (window.Shopify.designMode) {
      document.addEventListener('helpers:update', this.initHelpers.bind(this));
    }
  }

  initHelpers() {
    this.fieldsets = this.querySelectorAll('fieldset');
    this.optionHelpersObj = JSON.parse(document.getElementById('optionHelpers').textContent);
     
    if (this.optionHelpersObj) {
      for (let fieldset of this.fieldsets) {
        const optionName = fieldset.dataset.optionName.toLowerCase();
        
        const optionHelpers = this.optionHelpersObj[optionName];

        if (optionHelpers) {
          const labelHelperElement = fieldset.querySelector('.form__label-helper');
          
          if (labelHelperElement && optionHelpers.labelHelper) {
            labelHelperElement.innerHTML = optionHelpers.labelHelper;
            const scripts = labelHelperElement.getElementsByTagName('script')
            for (let i = 0; i < scripts.length; i++) {
              eval(scripts[i].innerHTML);
            }
          }
          
        }
      }
    }
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.setColorVariantLabel();
    this.setAmountVariantLabel();
    this.setSizeVariantLabel();
    this.removeColorVariantLabel();
    this.removeAmountVariantLabel();
    this.removeSizeVariantLabel();
    this.addOutOfStockClass();
    this.additionalVariantData = JSON.parse(document.getElementById('additionalVariantData').textContent);
    this.isFinalSaleCheck();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateVariantMedia();
      this.updateURL();
      this.updateVariantInput();
      this.updateMaxVariantQuantity();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  isFinalSaleCheck() {
    const finalSaleLabel = document.querySelector(".product__final-sale");
    const formProduct = document.querySelector(".form__product");
    const variants = this.additionalVariantData;
    const currentVariantId = variants[this.currentVariant.id];
    const dynamicProperty = String(window.Resources.variantMetafields.finalSaleLineItem);

    //Generate Line Item Property to Append
    const lineItemPropertyFinalSale = document.createElement("input");
          lineItemPropertyFinalSale.id = "finalSaleLineItem";
          lineItemPropertyFinalSale.className = "hidden";
          lineItemPropertyFinalSale.type = "text";
          lineItemPropertyFinalSale.name = dynamicProperty;

    if(currentVariantId) {
      //If current variant has the Final Sale metafield, reveal the text and create the line item property field
      if(currentVariantId.isFinalSale == "true") {
        if(finalSaleLabel.classList.contains("hidden")) {
          finalSaleLabel.classList.remove("hidden");
        }

        formProduct.appendChild(lineItemPropertyFinalSale);
      }
      else {
        //Else, remove and hide message and line item property
        if(!finalSaleLabel.classList.contains("hidden")) {
          finalSaleLabel.classList.add("hidden");
        }

        if(document.getElementById("finalSaleLineItem")) {
          document.getElementById("finalSaleLineItem").remove();
        }
      }
    }
  }

  updateOptions() {
    let swatches = this.querySelectorAll('input');

    if (swatches.length == 0) {
      this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
    } else {
      this.inputs = Array.from(swatches).find((radio) => radio.checked).value;
      this.index = Number(document.querySelector('fieldset').getAttribute("node-index"));
      this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
      this.options.splice(this.index, 0, this.inputs)
    }
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  initCurrentVariant() {
    const variants = this.getVariantData();
   
    let param = new URLSearchParams(window.location.search).get('variant')
    
    if (!this.currentVariant) {
      for (let variant of variants) {
        if (variant.available && param && param == variant.id){
          this.currentVariant = variant
          break
        } else if (!variant.available && param && param == variant.id){
          this.currentVariant = variant
          break
        }
      }
    }
    
    if (!this.currentVariant) {
      for (let variant of variants) {
        if (variant.available) {
          this.currentVariant = variant
          break
        } else if (!variant.available){
          this.currentVariant = variant
        }
      }
    }
  }

  addOutOfStockClass() {
    const variants = this.getVariantData();

    if (!this.currentVariant) {
      for (let variant of variants) {
        if (variant.available) {
          this.currentVariant = variant
          break
        }
      }
    }

    //Store array of all colors
    let colorOptionArray = [];
    //Store array of only colors that are available
    let colorAvailableArray = [];

    variants.forEach(variant => {
      //Populate colorOptionArray
      //Avoid duplicates
      if(!colorOptionArray.includes(variant.option1)) {
        colorOptionArray.push(variant.option1);
      }

      //Populate colorAvailableArray
      if(variant.available && !colorAvailableArray.includes(variant.option1)) {
        colorAvailableArray.push(variant.option1);
      }
    });

    //Compare the two arrays, filter out any colors that are available
    //Only colors that are NOT available should be returned
    const colorsNotAvailable = colorOptionArray.filter(color => {
      return !colorAvailableArray.includes(color);
    });

    //Loop through any colors not available
    if(colorsNotAvailable.length > 0) {
      colorsNotAvailable.forEach(color => {
        //Mark them as OOS
        let variantOption = document.querySelector(`input[value="${color}"]`);
        if(variantOption) {
          variantOption.nextElementSibling.classList.add('swatch_variant_not_available');
        }
      });
    }

    variants.forEach(variant => {
      if (variant.option1 === this.currentVariant.option1) {
        if (!variant.available) {
          if (variant.option2) {
            let variantOption = document.querySelector(`input[value="${variant.option2}"]`);
            if(variantOption) {
              variantOption.nextElementSibling.classList.add('variant_not_available');
            }
          }

          if (variant.option3) {
            let variantOption = document.querySelector(`input[value="${variant.option3}"]`);
            if(variantOption) {
              variantOption.nextElementSibling.classList.add('variant_not_available');
            }
          }
        } else {
          if (variant.option2) {
            let variantOption = document.querySelector(`input[value="${variant.option2}"]`);
            if(variantOption) {
              variantOption.nextElementSibling.classList.remove('variant_not_available');
            }
          }

          if (variant.option3) {
            let variantOption = document.querySelector(`input[value="${variant.option3}"]`);
            if(variantOption) {
              variantOption.nextElementSibling.classList.remove('variant_not_available');
            }
          }
        }
      }

      if (variant.option2 === this.currentVariant.option2) {
          if(!this.currentVariant.available) {
            if (variant.option2) {
              let variantOption = document.querySelector(`input[value="${variant.option2}"]`);
              if(variantOption) {
                variantOption.nextElementSibling.classList.add('variant_not_available');
              }
            }
          } else {
            if (variant.option2) {
              let variantOption = document.querySelector(`input[value="${variant.option2}"]`);
              if(variantOption) {
                variantOption.nextElementSibling.classList.remove('variant_not_available');
              }
            }
          }
  
          if (!variant.available) {
            if (variant.option3) {
              let variantOption = document.querySelector(`input[value="${variant.option3}"]`);
              if(variantOption) {
                variantOption.nextElementSibling.classList.add('variant_not_available');
              }
            }
          } else {
            if (variant.option3) {
              let variantOption = document.querySelector(`input[value="${variant.option3}"]`);
              if(variantOption) {
                variantOption.nextElementSibling.classList.remove('variant_not_available');
              }
            }
          }
        }
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGallery = document.getElementById(`MediaGallery-${this.dataset.section}`);
    mediaGallery.setActiveMedia(`${this.dataset.section}-${this.currentVariant.featured_media.id}`, true);
    const modalContent = document.querySelector(`#ProductModal-${this.dataset.section} .product-media-modal__content`);
    const newMediaModal = modalContent.querySelector( `[data-media-id="${this.currentVariant.featured_media.id}"]`);
    modalContent.prepend(newMediaModal);
  }

  updateVariantMedia() {
    let color_inputs = document.querySelectorAll("input[name=Color]");
    let color_dropdown = document.querySelectorAll("select[name='options[Color]']");
    let thumbs = document.querySelectorAll(".thumbnail-list__item img");
    let stackedThumbs = document.querySelectorAll(".product__media-item  img");

    if (color_inputs.length > 0 ) {
      color_inputs.forEach(i => {
        //Check if swatch input or dropdown
        if (i.checked) {
          if(thumbs.length > 0) {
            thumbs.forEach(t => {
              let searchValue = i.value.split(" ").join("-").toLowerCase();
              if(t.src.includes(searchValue)) {
                t.parentElement.parentElement.style.display = "block";
              } else {
                t.parentElement.parentElement.style.display = "none"
              }
            })
          }

          if (stackedThumbs.length > 0 ) {
            stackedThumbs.forEach(t => {
              let searchValue;
              if (i.value.includes("/")) {
                 searchValue = i.value.split("/").join("-").toLowerCase();
              } else if (i.value.includes("-")) {
                 searchValue = i.value.split("-").join("-").toLowerCase().replace(/\s/g,'');
              } else {
                searchValue = i.value.split(" ").join("-").toLowerCase();
              }
              
              const str = t.src;
              let bits = str.split('\_');

              if(bits.length >= 6) {
                t.parentElement.parentElement.parentElement.style.display = "block";
              } else if(bits.length <= 5) {
                t.parentElement.parentElement.parentElement.style.display = "block";
              }

              // Recurate Products without '__' in naming convention
              // const str = t.src;
              const colorRegex = /_([a-zA-Z]+)_l_/;

              const colorMatch = str.match(colorRegex);

              if (colorMatch != null) {
                const colorCode = colorMatch[1];
                if(colorCode == searchValue) {
                  t.parentElement.parentElement.parentElement.style.display = "block";
                }
              }

              // Shopify Products with '__' in naming convention
              if(str.includes('__')) {
                if(t.src.split("__")[1].split("_")[0].toLowerCase() === searchValue) {
                  t.parentElement.parentElement.parentElement.style.display = "block";
                } else {
                  t.parentElement.parentElement.parentElement.style.display = "none";
                }
              }

            })
          }
        }
      })
    } else {
        if (thumbs.length > 0) {
          thumbs.forEach(t => {
            if(color_dropdown[0] != null){
              let searchValue = color_dropdown[0].value.split(" ")[0].toLowerCase();
              if(t.src.includes(searchValue)) {
                t.parentElement.parentElement.style.display = "block";
              } else {
                t.parentElement.parentElement.style.display = "none"
              }
            }
          })
        }

        if (stackedThumbs.length > 0 ) {
          stackedThumbs.forEach(t => {
            if(color_dropdown[0] != null){
              let searchValue = color_dropdown[0].value.split(" ")[0].toLowerCase();
              if(t.src.includes(searchValue)) {
                t.parentElement.parentElement.style.display = "block";
              } else {
                t.parentElement.parentElement.style.display = "none"
              }
            }
          })
        }
    }
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton) return;
    shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updateMaxVariantQuantityOnLoad() {
    const quantityInput = document.querySelector('.product input[name="quantity"]');
    const variantData = this.additionalVariantData[this.currentVariant.id];

    if(variantData.available == "true" && Number(variantData.inventory) === 0 ) {
      quantityInput.setAttribute('max', 99);
    }
  }

  updateMaxVariantQuantity () {
    const urlParams = new URLSearchParams(window.location.search);
    const variantID = urlParams.get('variant');
    const variantData = this.additionalVariantData[variantID];
    const quantityInput = document.querySelector('.product input[name="quantity"]');

    quantityInput.setAttribute('max', variantData.inventory);

    if(variantData.available == "true" && Number(variantData.inventory) === 0 ) {
      quantityInput.setAttribute('max', 99);
    }

    if (Number(quantityInput.value) == 0) {
      quantityInput.value = 1
    }

    if(Number(quantityInput.value) > Number(variantData.inventory)) {
      quantityInput.value = variantData.inventory;
      if(variantData.available == "true") {
        quantityInput.value = 1;
      }
    }
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
      .then((response) => response.text())
      .then((responseText) => {
        const id = `price-${this.dataset.section}`;
        const html = new DOMParser().parseFromString(responseText, 'text/html')
        const destination = document.getElementById(id);
        const source = html.getElementById(id);

        if (source && destination) destination.innerHTML = source.innerHTML;
        const price = document.getElementById(`price-${this.dataset.section}`);
        if (price) price.classList.remove('visibility-hidden');
        this.toggleAddButton(!this.currentVariant.available,  window.variantStrings.soldOut);
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    const stickAddButton = document.querySelector('.product__sticky-bottom a');

    let price = document.querySelector(".price-item").innerText;

    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) {
        addButtonText.textContent = text;
        if(stickAddButton) { stickAddButton.textContent = text;}    
      }
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart + " - " +price;
      if (stickAddButton) {stickAddButton.textContent = window.variantStrings.addToCart + " - " +price;}  
    }

    if (!modifyClass) return;
  }

  setPriceLabelAddButton() {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    const button = productForm.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const stickAddButton = document.querySelector('.product__sticky-bottom a');
    let price = document.querySelector(".price-item").innerText;
    if (button.hasAttribute('disabled')) {
      addButtonText.textContent = window.variantStrings.soldOut;
      if(stickAddButton) {stickAddButton.textContent = window.variantStrings.soldOut;}    
    } else {
      addButtonText.textContent = window.variantStrings.addToCart + " - " + price;
      if(stickAddButton) { stickAddButton.textContent = window.variantStrings.addToCart + " - " + price; }
    }
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('visibility-hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  setColorVariantLabel() {
    let colorLabel = document.querySelector(".color_label");
    let colorInputs = document.querySelectorAll("input[name=Color]")

    for (var i = 0; i < colorInputs.length; i++) {
      if (colorInputs[i].checked) {
      colorLabel.innerHTML += "<span class='color__variant'> " + colorInputs[i].value + "</span>"
      }
    }
  }

  removeColorVariantLabel() {
    let colorVariant = document.querySelector(".color__variant");
      if (colorVariant !== 'undefined' && colorVariant !== null) {
      colorVariant.remove()
    }
  }

  setAmountVariantLabel() {
    let amountLabel = document.querySelector(".amount_label");
    let amountInputs = document.querySelectorAll("input[name=Amount]")

    for (var i = 0; i < amountInputs.length; i++) {
      if (amountInputs[i].checked) {
      amountLabel.innerHTML += "<span class='amount__variant'> $" + (Math.round(parseInt(amountInputs[i].value.split('$')[1].replace(/,/g, ''), 10) * 100) / 100).toFixed(2); + "</span>"
      }
    }
  }

  removeAmountVariantLabel() {
    let amountVariant = document.querySelector(".amount__variant");
      if (amountVariant !== 'undefined' && amountVariant !== null) {
      amountVariant.remove()
    }
  }

  setSizeVariantLabel() {
    let sizeLabel = document.querySelector(".size_label");
    let sizeInputs = document.querySelectorAll("input[name=Size]")

    for (var i = 0; i < sizeInputs.length; i++) {
      if (sizeInputs[i].checked) {
      sizeLabel.innerHTML += "<span class='size__variant'> " + sizeInputs[i].value + "</span>"
      }
    }
  }

  removeSizeVariantLabel() {
    let sizeVariant = document.querySelector(".size__variant");
      if (sizeVariant !== 'undefined' && sizeVariant !== null) {
      sizeVariant.remove()
    }
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }
}

customElements.define('variant-radios', VariantRadios);

// TODO Move this to quantityInput
/** Setting Quantity input to maximum product quantity on keyboard input **/
const quantityInput = document.querySelector('.product input[name="quantity"]');
if (quantityInput) {
  quantityInput.addEventListener('change', function() {
  let qtyMax = quantityInput.getAttribute("max");
  if (qtyMax != null && Number(quantityInput.value) > qtyMax) {
    quantityInput.value = (qtyMax != 0) ? qtyMax : 1;
  }
})
};
  window.addEventListener("authentic:membership-added", () => {
    console.log('membership add')

   fetch('/cart.js', {
     credentials: 'same-origin',
     headers: {
       'Content-Type': 'application/json',
       'X-Requested-With':'xmlhttprequest' 
     },
     method: 'GET'
   }).then(function(response) {
     return response.json();
   }).then(function(json) {
     const count = json?.item_count || 0;
     console.log(json)
     const cartNotification = document.querySelector('cart-notification');
      console.log(cartNotification);
      cartNotification.renderContents({
        id: '42711085187263',
        sections: {
          'cart-notification-product':
            '<div id="shopify-section-cart-notification-product" class="shopify-section"><div id="cart-notification-product-42711085187263" class="cart-item">\n      \n        <img class="cart-notification-product__image"\n          src="https://www.thefryecompany.com/cdn/shop/files/authentic-product-small_300x.png?v=1704478913"\n          alt="Authentic Membership"\n          width="70"\n          height=""\n          loading="lazy"\n        >\n      \n      <div>\n        <h3 class="cart-notification-product__name h4">Authentic Membership</h3>\n          <dl><div class="product-option">\n                  <dt>Plan: </dt>\n                  <dd>Monthly</dd>\n                </div><div class="product-option">\n                  <dt>10% Off & Free Shipping</dt>\n                  <dd></dd>\n                </div></dl></div>\n    </div></div>',
          'cart-notification-button':
            '<div id="shopify-section-cart-notification-button" class="shopify-section">View my cart\n</div>',
          'cart-icon-bubble': `<div id=\"shopify-section-cart-icon-bubble\" class=\"shopify-section\"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"icon icon-cart\" aria-hidden=\"true\" focusable=\"false\" role=\"presentation\" viewBox=\"0 0 19 22\">\n  <path d=\"M1.35714,6.74019H17.64286V18.87255a1.35261,1.35261,0,0,1-1.35715,1.348H2.71429a1.35261,1.35261,0,0,1-1.35715-1.348ZM14.25,5.39215v-.674a4.75011,4.75011,0,0,0-9.5,0v.674H0v13.4804a2.70523,2.70523,0,0,0,2.71429,2.69607H16.28571A2.70523,2.70523,0,0,0,19,18.87255V5.39215ZM9.5,1.348a3.38154,3.38154,0,0,1,3.39286,3.3701v.674H6.10714v-.674A3.38154,3.38154,0,0,1,9.5,1.348Z\" fill=\"currentColor\"/>\n</svg><span class=\"visually-hidden\">Cart</span><div class=\"cart-count-bubble\"><span aria-hidden=\"true\">${count}</span><span class=\"visually-hidden\">${count} item</span>\n  </div></div>`,
        },
      });

   }).catch(function(err) {
     console.log(err)
   });
 });
