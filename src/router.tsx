import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient();

  const isHashRouting =
    typeof window !== "undefined" &&
    (window.location.protocol === "file:" ||
      window.location.hostname === "appassets.androidplatform.net" ||
      Boolean((window as unknown as { CropAssistantAndroid?: unknown }).CropAssistantAndroid) ||
      window.location.pathname.endsWith(".html") ||
      window.location.hash.length > 0);

  const history = isHashRouting ? createHashHistory() : undefined;

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
