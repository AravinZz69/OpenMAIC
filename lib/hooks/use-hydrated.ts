/**
 * Hydration Safety Hook
 *
 * Returns true only after the component has hydrated on the client.
 * Use this to prevent hydration mismatches with persisted state (Zustand, localStorage).
 *
 * Usage:
 * ```tsx
 * const isHydrated = useHydrated();
 * if (!isHydrated) return <Skeleton />;
 * // Now safe to use persisted state
 * ```
 */

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Hook that returns true only after hydration is complete.
 * Safe to use with SSR - returns false on server, true on client after mount.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}
