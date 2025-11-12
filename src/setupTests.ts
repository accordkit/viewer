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
      this
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

class MockResizeObserver implements ResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        { target, contentRect: target.getBoundingClientRect() },
      ] as ResizeObserverEntry[],
      this
    );
  }

  unobserve() {
    /* noop */
  }

  disconnect() {
    /* noop */
  }
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

const globalWindow = globalThis as Window &
  typeof globalThis & {
    requestAnimationFrame?: typeof window.requestAnimationFrame;
    cancelAnimationFrame?: typeof window.cancelAnimationFrame;
    scrollTo?: typeof window.scrollTo;
    DOMMatrixReadOnly?: typeof window.DOMMatrixReadOnly;
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

if (typeof globalWindow.DOMMatrixReadOnly !== "function") {
  const parseScaleY = (transform?: string) => {
    if (!transform || transform === "none") {
      return 1;
    }
    const match = transform.match(/matrix\(([^)]+)\)/);
    if (!match) {
      return 1;
    }
    const parts = match[1].split(",").map((p) => Number.parseFloat(p.trim()));
    return Number.isFinite(parts[3]) ? parts[3]! : 1;
  };
  class MockDOMMatrixReadOnly {
    m22: number;
    constructor(transform?: string) {
      this.m22 = parseScaleY(transform);
    }
  }
  globalWindow.DOMMatrixReadOnly =
    MockDOMMatrixReadOnly as unknown as typeof DOMMatrixReadOnly;
}
