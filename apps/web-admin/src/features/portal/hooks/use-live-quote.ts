import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { portalApi, type PortalQuote, type PortalQuoteChoices } from '../api/portal-api';

const DEBOUNCE_MS = 400;

/** How a live quote is created and repriced: the portal API, or the website embed's. */
export type LiveQuoteApi<C> = {
  create: (modelFileId: string, choices: C) => Promise<PortalQuote>;
  reprice: (quoteId: string, choices: C) => Promise<PortalQuote>;
  /** Query to refresh after each price (the portal's quote list). */
  invalidateKey?: readonly unknown[];
};

const portalLiveQuoteApi: LiveQuoteApi<PortalQuoteChoices> = {
  create: (modelFileId, choices) => portalApi.createQuote({ modelFileId, ...choices }),
  reprice: (quoteId, choices) => portalApi.repriceQuote(quoteId, choices),
  invalidateKey: ['portal', 'quotes'],
};

/** Choices compare by value; they are small flat objects. */
const keyOf = (choices: object | null) => (choices ? JSON.stringify(choices) : '');
const sameChoices = (a: object | null, b: object | null) => !!a && !!b && keyOf(a) === keyOf(b);

/**
 * Keeps a slicer price in step with the customer's choices. The first price creates the
 * portal quote; later changes reprice that same quote. Requests are debounced and run one
 * at a time (the server slices per request), and only the latest choices are ever sent, so
 * the price shown always belongs to the choices on screen.
 */
export function useLiveQuote<C extends object = PortalQuoteChoices>(
  modelFileId: string | null,
  choices: C | null,
  api: LiveQuoteApi<C> = portalLiveQuoteApi as unknown as LiveQuoteApi<C>,
) {
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<PortalQuote | null>(null);
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const quoteRef = useRef<PortalQuote | null>(null);
  const wantedRef = useRef<C | null>(null);
  const sentRef = useRef<C | null>(null);
  /** Choices whose last attempt failed: not retried automatically. */
  const failedRef = useRef<C | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;
  const inFlightRef = useRef(false);
  const modelRef = useRef(modelFileId);
  const [retryToken, setRetryToken] = useState(0);

  const pump = useCallback(async () => {
    const wanted = wantedRef.current;
    const model = modelRef.current;
    if (inFlightRef.current || !wanted || !model || sameChoices(wanted, sentRef.current)) {
      return;
    }
    inFlightRef.current = true;
    sentRef.current = wanted;
    setPricing(true);
    try {
      const current = quoteRef.current;
      const next = current
        ? await apiRef.current.reprice(current.id, wanted)
        : await apiRef.current.create(model, wanted);
      if (modelRef.current === model) {
        quoteRef.current = next;
        failedRef.current = null;
        setQuote(next);
        setError(null);
      }
    } catch (caught) {
      if (modelRef.current === model) {
        // Unpriced now; let the same choices be retried.
        sentRef.current = null;
        failedRef.current = wanted;
        setQuote((prev) => (prev ? { ...prev, status: 'unpriced', total_cents: null } : prev));
        setError(caught);
      }
    } finally {
      inFlightRef.current = false;
      const invalidateKey = apiRef.current.invalidateKey;
      if (invalidateKey) {
        void queryClient.invalidateQueries({ queryKey: invalidateKey });
      }
      // The customer changed something while we were slicing: price the latest choices.
      const latest = wantedRef.current;
      if (
        latest &&
        !sameChoices(latest, sentRef.current) &&
        !sameChoices(latest, failedRef.current)
      ) {
        void pump();
      } else {
        setPricing(false);
      }
    }
  }, [queryClient]);

  // A new model starts a new quote.
  useEffect(() => {
    modelRef.current = modelFileId;
    quoteRef.current = null;
    sentRef.current = null;
    failedRef.current = null;
    setQuote(null);
    setError(null);
    setPricing(false);
  }, [modelFileId]);

  const key = keyOf(choices);
  useEffect(() => {
    wantedRef.current = choices;
    if (!modelFileId || !choices) {
      return;
    }
    const timer = setTimeout(() => void pump(), quoteRef.current ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
    // `key` captures the choices by value.
  }, [modelFileId, key, pump, retryToken]);

  /** The latest priced quote matches what's on screen (safe to order). */
  const upToDate = !pricing && !error && quote?.status === 'priced';

  return {
    quote,
    pricing,
    error,
    upToDate,
    /** Re-run pricing for the current choices (after an error or an expired price). */
    retry: () => {
      sentRef.current = null;
      setError(null);
      setRetryToken((n) => n + 1);
    },
    /** Replace the local copy after the quote changes elsewhere (e.g. accepted). */
    replace: (next: PortalQuote) => {
      quoteRef.current = next;
      setQuote(next);
    },
  };
}
