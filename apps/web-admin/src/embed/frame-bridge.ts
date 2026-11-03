/**
 * Talking to the host page from inside the quoter frame. The frame only ever posts to the
 * host's exact origin, and the loader (public/embed.js) only accepts messages from the
 * frame's own window and origin.
 */

export type QuoterEvent =
  | { type: 'printos:resize'; height: number }
  | { type: 'printos:ready' }
  | {
      type: 'printos:order';
      order: { id: string; order_number: string } | null;
      total_cents: number | null;
      currency: string;
    };

/**
 * The origin of the page embedding this frame, as the browser reports it. The host page
 * can't forge either source: ancestorOrigins (Chrome, Safari) is set by the browser, and the
 * loader asks for the referrer to carry the origin (Firefox).
 */
export function parentOrigin(): string | null {
  if (window.parent === window) {
    return null;
  }
  const ancestors = (window.location as Location & { ancestorOrigins?: DOMStringList })
    .ancestorOrigins;
  if (ancestors && ancestors.length > 0) {
    return ancestors[0] ?? null;
  }
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch {
    return null;
  }
}

export function postToHost(event: QuoterEvent) {
  const origin = parentOrigin();
  if (origin) {
    window.parent.postMessage(event, origin);
  }
}

/** Keep the host's iframe as tall as the content, so the host page does the scrolling. */
export function watchHeight(element: HTMLElement): () => void {
  let last = 0;
  const observer = new ResizeObserver(() => {
    const height = Math.ceil(element.getBoundingClientRect().height);
    if (Math.abs(height - last) > 1) {
      last = height;
      postToHost({ type: 'printos:resize', height });
    }
  });
  observer.observe(element);
  return () => observer.disconnect();
}
