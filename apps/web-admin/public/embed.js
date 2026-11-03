/*
 * 3D Print OS website quoter loader.
 *
 *   <script src="https://YOUR-APP/embed.js" async></script>
 *   <print-quoter data-key="pk_..."></print-quoter>
 *
 * Optional look, overriding the shop's defaults: data-accent, data-background,
 * data-foreground (hex colours), data-radius (px), data-font (font family name),
 * data-font-url (a fonts.googleapis.com stylesheet), data-mode ("light" | "dark").
 *
 * Events on the element: "quoter:ready", and "quoter:order" with
 * detail = { order: { id, order_number }, total_cents, currency }.
 *
 * The quoter runs in an iframe served from the same place as this script, so the host
 * page's CSS can't break it and it can't read the host page.
 */
/* global window, document, HTMLElement */
(function () {
  'use strict';
  if (!window.customElements || window.customElements.get('print-quoter')) {
    return;
  }

  var script = document.currentScript;
  var base = new URL('.', script && script.src ? script.src : window.location.href);
  var frameOrigin = base.origin;
  var OPTIONS = ['accent', 'background', 'foreground', 'radius', 'font', 'font-url', 'mode'];

  class PrintQuoter extends HTMLElement {
    connectedCallback() {
      if (this._frame) {
        return;
      }
      var key = this.getAttribute('data-key');
      if (!key) {
        console.error('[print-quoter] Missing data-key (your publishable key).');
        return;
      }
      var params = new URLSearchParams({ key: key });
      for (var i = 0; i < OPTIONS.length; i++) {
        var value = this.getAttribute('data-' + OPTIONS[i]);
        if (value) {
          params.set(OPTIONS[i].replace('-', '_'), value);
        }
      }

      var frame = document.createElement('iframe');
      frame.src = new URL('embed.html?' + params.toString(), base).toString();
      frame.title = this.getAttribute('data-title') || 'Instant 3D printing quote';
      // Lets the frame learn this page's origin in browsers without location.ancestorOrigins.
      frame.referrerPolicy = 'origin';
      frame.loading = 'lazy';
      frame.style.cssText =
        'display:block;width:100%;height:560px;border:0;background:transparent;';
      frame.setAttribute('allowtransparency', 'true');
      this._frame = frame;

      this._onMessage = (event) => {
        if (event.source !== frame.contentWindow || event.origin !== frameOrigin) {
          return;
        }
        var data = event.data || {};
        if (data.type === 'printos:resize' && typeof data.height === 'number') {
          frame.style.height = Math.max(200, Math.min(4000, data.height)) + 'px';
        } else if (data.type === 'printos:ready') {
          this.dispatchEvent(new CustomEvent('quoter:ready', { bubbles: true }));
        } else if (data.type === 'printos:order') {
          this.dispatchEvent(
            new CustomEvent('quoter:order', {
              bubbles: true,
              detail: { order: data.order, total_cents: data.total_cents, currency: data.currency },
            }),
          );
        }
      };
      window.addEventListener('message', this._onMessage);
      this.style.display = 'block';
      this.appendChild(frame);
    }

    disconnectedCallback() {
      if (this._onMessage) {
        window.removeEventListener('message', this._onMessage);
      }
      if (this._frame) {
        this._frame.remove();
        this._frame = null;
      }
    }
  }

  window.customElements.define('print-quoter', PrintQuoter);
})();
