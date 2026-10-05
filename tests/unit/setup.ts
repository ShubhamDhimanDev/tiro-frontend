import "@testing-library/jest-dom/vitest";

/**
 * Node 22+ defines a native global `localStorage` that requires
 * `--localstorage-file <path>` to actually persist — without that flag its
 * `setItem`/`removeItem`/etc. aren't functions at all ("X is not a
 * function"), and Node prints a startup warning. That broken native global
 * shadows jsdom's own working `window.localStorage` in this Vitest `jsdom`
 * environment (confirmed against Node 25 while adding
 * `lib/booking/selection.ts`, the first localStorage-backed code in this
 * codebase — every earlier domain deliberately used httpOnly cookies
 * instead, see `lib/location/cookies.ts`). `sessionStorage` is unaffected
 * (it's spec'd as in-memory-only, no file needed).
 *
 * Installing a small deterministic in-memory polyfill here — rather than
 * passing `--localstorage-file` to point Node's native implementation at a
 * real file — keeps the unit suite hermetic (no filesystem state backing a
 * unit test) and Node-version-independent.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, configurable: true });
