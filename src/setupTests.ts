// src/setupTests.ts
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.callback(
      [
        {
          isIntersecting: true,
          target: element,
          intersectionRatio: 1,
          boundingClientRect: element.getBoundingClientRect(),
          intersectionRect: element.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry,
      ],
      this,
    );
  }

  unobserve() {
    /* noop */
  }

  disconnect() {
    /* noop */
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

const globalWindow = globalThis as Window &
  typeof globalThis & {
    requestAnimationFrame?: typeof window.requestAnimationFrame;
    cancelAnimationFrame?: typeof window.cancelAnimationFrame;
    scrollTo?: typeof window.scrollTo;
  };

if (typeof globalWindow.requestAnimationFrame !== "function") {
  globalWindow.requestAnimationFrame = (cb: FrameRequestCallback) =>
    globalWindow.setTimeout(() => cb(Date.now()), 16);
}

if (typeof globalWindow.cancelAnimationFrame !== "function") {
  globalWindow.cancelAnimationFrame = (id: number) => {
    globalWindow.clearTimeout(id);
  };
}

if (typeof globalWindow.scrollTo !== "function") {
  globalWindow.scrollTo = () => {
    /* noop */
  };
}

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = vi.fn();
}
