export async function registerCropCareAppShell(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const isAndroidApp =
    window.location.hostname === "appassets.androidplatform.net" ||
    window.location.protocol === "file:" ||
    Boolean((window as unknown as { CropAssistantAndroid?: unknown }).CropAssistantAndroid);

  // In Android native APK, all assets are bundled 100% locally in APK assets.
  // Unregister any conflicting service worker to prevent ERR_NAME_NOT_RESOLVED or stale cache.
  if (isAndroidApp) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch {}
    return;
  }

  const disabled = new URLSearchParams(window.location.search).has("sw");

  if (import.meta.env.DEV || window.top !== window || disabled) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => new URL(registration.scope).pathname === "/")
        .map((registration) => registration.unregister())
    );
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // Offline shell is a progressive enhancement; app functions standalone without it.
  }
}
