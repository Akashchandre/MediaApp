import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createMediaClient } from "@headless-media/core";

const MediaContext = createContext(null);

export function MediaProvider({ apiKey, cacheTtlMs, children, client: providedClient, fetch: fetcher, logEvents }) {
  const client = useMemo(() => {
    if (providedClient) return providedClient;
    return createMediaClient({
      apiKey,
      ...(cacheTtlMs === undefined ? {} : { cacheTtlMs }),
      ...(fetcher === undefined ? {} : { fetch: fetcher }),
      ...(logEvents === undefined ? {} : { logEvents }),
    });
  }, [apiKey, cacheTtlMs, fetcher, logEvents, providedClient]);
  return createElement(MediaContext.Provider, { value: client }, children);
}

export function useMediaClient() {
  const client = useContext(MediaContext);
  if (!client) throw new Error("Media hooks must be used inside MediaProvider.");
  return client;
}

function initialSearchState(isLoading = false) {
  return { items: [], page: 0, nextPage: null, hasNextPage: false, isLoading, isLoadingMore: false, error: null };
}

export function useMediaSearch({ enabled = true, kind = "photo", perPage = 24, query = "" } = {}) {
  const client = useMediaClient();
  const [state, setState] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const sessionRef = useRef(null);
  const normalizedQuery = query.trim();
  // Identity lets render derive loading immediately without effect-driven state resets.
  const request = useMemo(() => ({
    enabled,
    page: (page, signal) => {
      const common = { kind, page, perPage, signal };
      return normalizedQuery
        ? client.search({ ...common, query: normalizedQuery })
        : client.discover(common);
    },
    retryKey,
  }), [client, enabled, kind, normalizedQuery, perPage, retryKey]);
  const current = state?.request === request ? state : initialSearchState(enabled);

  useEffect(() => {
    if (!request.enabled) return undefined;
    const controller = new AbortController();
    const session = { request, controller, loadingMore: false };
    sessionRef.current = session;
    async function load() {
      try {
        const result = await request.page(1, controller.signal);
        if (controller.signal.aborted) return;
        setState({ ...initialSearchState(), ...result, request });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ ...initialSearchState(), request, error });
        }
      }
    }
    void load();
    return () => {
      controller.abort();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [request]);

  const loadMore = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || session.request !== request || session.controller.signal.aborted ||
        current.isLoading || !current.hasNextPage || session.loadingMore) return;
    session.loadingMore = true;
    setState((previous) => ({ ...previous, isLoadingMore: true, error: null }));
    try {
      const result = await request.page(current.nextPage, session.controller.signal);
      if (session.controller.signal.aborted) return;
      setState((previous) => ({
        ...previous,
        ...result,
        items: [...previous.items, ...result.items],
        isLoadingMore: false,
        error: null,
      }));
    } catch (error) {
      if (!session.controller.signal.aborted) {
        setState((previous) => ({ ...previous, isLoadingMore: false, error }));
      }
    } finally {
      session.loadingMore = false;
    }
  }, [request, current.isLoading, current.hasNextPage, current.nextPage]);

  const retry = useCallback(() => setRetryKey((value) => value + 1), []);
  return {
    items: current.items, page: current.page, hasNextPage: current.hasNextPage,
    isLoading: current.isLoading, isLoadingMore: current.isLoadingMore,
    error: current.error, loadMore, retry,
  };
}

export function useMediaItem({ enabled = true, id, kind = "photo" } = {}) {
  const client = useMediaClient();
  const [state, setState] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const hasItem = enabled && id !== null && id !== undefined && id !== "";
  const request = useMemo(
    () => ({ client, hasItem, id, kind, retryKey }),
    [client, hasItem, id, kind, retryKey],
  );

  useEffect(() => {
    if (!request.hasItem) return undefined;
    const controller = new AbortController();
    async function load() {
      try {
        const item = await request.client.getItem({
          id: request.id, kind: request.kind, signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setState({ request, item, isLoading: false, error: null });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ request, item: null, isLoading: false, error });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [request]);

  const retry = useCallback(() => setRetryKey((value) => value + 1), []);
  const current = state?.request === request
    ? state : { item: null, isLoading: hasItem, error: null };
  return { item: current.item, isLoading: current.isLoading, error: current.error, retry };
}

export function useMediaActions() {
  const client = useMediaClient();
  return useMemo(() => ({
    trackView: (data) => client.trackView(data),
    trackDownload: (data) => client.trackDownload(data),
    clearCache: () => client.clearCache(),
  }), [client]);
}

export function useMediaEvent(type, listener) {
  const client = useMediaClient();
  const listenerRef = useRef(listener);
  useEffect(() => { listenerRef.current = listener; }, [listener]);
  useEffect(() => client.on(type, (event) => listenerRef.current?.(event)), [client, type]);
}
