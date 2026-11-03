import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { apiClient } from '../shared/api/api-client';
import { getErrorMessage } from '../shared/api/api-error-handler';
import { loadRuntimeConfig } from '../shared/api/runtime-config';
import { Card, CardContent, Skeleton } from '../shared/ui';
import { EmbedClient, type EmbedConfig } from './embed-api';
import { applyTheme, readFrameOptions } from './embed-theme';
import { parentOrigin, postToHost, watchHeight } from './frame-bridge';
import { Quoter } from './quoter';
import '../styles/globals.css';

const frame = readFrameOptions(window.location.search);
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; client: EmbedClient; config: EmbedConfig };

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function EmbedApp() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => (rootRef.current ? watchHeight(rootRef.current) : undefined), []);

  useEffect(() => {
    const host = parentOrigin();
    if (!frame.key) {
      setState({ status: 'error', message: 'This quoter is missing its shop key.' });
      return;
    }
    if (!host) {
      setState({
        status: 'error',
        message: 'Open this quoter from the shop’s website to get a price.',
      });
      return;
    }
    const client = new EmbedClient(apiClient.instance.defaults.baseURL ?? '', frame.key);
    void (async () => {
      try {
        const config = await client.config();
        applyTheme(config.theme, frame);
        await client.startSession(host);
        setState({ status: 'ready', client, config });
        postToHost({ type: 'printos:ready' });
      } catch (error) {
        applyTheme({}, frame);
        setState({ status: 'error', message: getErrorMessage(error) });
      }
    })();
  }, []);

  return (
    <div ref={rootRef} className="p-1">
      {state.status === 'loading' ? (
        <Card>
          <CardContent className="space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </CardContent>
        </Card>
      ) : state.status === 'error' ? (
        <Notice title="Quoting is unavailable" message={state.message} />
      ) : (
        <Quoter client={state.client} config={state.config} />
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

void loadRuntimeConfig().finally(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <EmbedApp />
      </QueryClientProvider>
    </StrictMode>,
  );
});
