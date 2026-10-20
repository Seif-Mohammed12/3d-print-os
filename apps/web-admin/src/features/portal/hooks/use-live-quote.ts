import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { portalApi, type PortalQuote, type PortalQuoteChoices } from '../api/portal-api';

const DEBOUNCE_MS = 400;

const sameChoices = (a: PortalQuoteChoices | null, b: PortalQuoteChoices | null) =>
  !!a &&
  !!b &&
  a.materialId === b.materialId &&
  a.quality === b.quality &&
  a.quantity === b.quantity;

/**
 * Keeps a slicer price in step with the customer's choices. The first price creates the
 * portal quote; later changes reprice that same quote. Requests are debounced and run one
 * at a time (the server slices per request), and only the latest choices are ever sent, so
 * the price shown always belongs to the choices on screen.
 */
export function useLiveQuote(modelFileId: string | null, choices: PortalQuoteChoices | null) {
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<PortalQuote | null>(null);
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const quoteRef = useRef<PortalQuote | null>(null);
  const wantedRef = useRef<PortalQuoteChoices | null>(null);
  const sentRef = useRef<PortalQuoteChoices | null>(null);
  /** Choices whose last attempt failed: not retried automatically. */
  const failedRef = useRef<PortalQuoteChoices | null>(null);
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
        ? await portalApi.repriceQuote(current.id, wanted)
        : await portalApi.createQuote({ modelFileId: model, ...wanted });
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
      void queryClient.invalidateQueries({ queryKey: ['portal', 'quotes'] });
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

  const key = choices ? `${choices.materialId}|${choices.quality}|${choices.quantity}` : '';
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
