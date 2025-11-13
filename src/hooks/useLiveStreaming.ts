import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { LiveClient } from "../utils/liveClient";
import { normalizeEvent } from "../utils/normalizeEvent";

import type { EventListHandler } from "../components/EventListHandle";
import type { AppTracerEvent } from "../types/events";

interface UseLiveStreamingParams {
  appendEvents: (events: AppTracerEvent[]) => void;
}

export interface LiveStreamingState {
  live: boolean;
  toggleLive: () => void;
  paused: boolean;
  togglePaused: () => void;
  received: number;
  followTail: boolean;
  followLatest: () => void;
  bottomRef: RefObject<HTMLDivElement | null>;
  pendingCount: number;
  setListApi: (api: EventListHandler | null) => void;
}

export function useLiveStreaming({
  appendEvents,
}: UseLiveStreamingParams): LiveStreamingState {
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [received, setReceived] = useState(0);
  const [followTail, setFollowTail] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const followTailRef = useRef(true);
  const manuallyUnfollowedRef = useRef(false);
  const autoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<number | null>(null);

  const pendingRef = useRef<AppTracerEvent[]>([]);
  const clientRef = useRef<LiveClient>(undefined);
  const [listApi, setListApi] = useState<EventListHandler | null>(null);
  const scrollContainer = listApi?.element ?? null;

  const clearAutoScrollTimeout = useCallback(() => {
    if (typeof window === "undefined") return;
    if (autoScrollTimeoutRef.current != null) {
      window.clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = null;
    }
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (typeof window === "undefined") return;
      clearAutoScrollTimeout();
      autoScrollingRef.current = true;

      window.requestAnimationFrame(() => {
        if (listApi?.scrollToRow) {
          listApi.scrollToRow({
            index: Number.MAX_SAFE_INTEGER,
            align: "end",
            behavior,
          });
        } else if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior,
          });
        } else {
          bottomRef.current?.scrollIntoView({ behavior, block: "end" });
        }

        const delay = behavior === "smooth" ? 400 : 50;
        autoScrollTimeoutRef.current = window.setTimeout(() => {
          autoScrollingRef.current = false;
          autoScrollTimeoutRef.current = null;
        }, delay);
      });
    },
    [clearAutoScrollTimeout, listApi, scrollContainer]
  );

  const followLatest = useCallback(() => {
    followTailRef.current = true;
    manuallyUnfollowedRef.current = false;
    setFollowTail(true);
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  const appendAndFollow = useCallback(
    (incoming: AppTracerEvent[]) => {
      appendEvents(incoming);
      if (followTailRef.current) {
        scrollToBottom();
      }
    },
    [appendEvents, scrollToBottom]
  );

  useEffect(() => {
    return () => {
      clearAutoScrollTimeout();
    };
  }, [clearAutoScrollTimeout]);

  useEffect(() => {
    if (!live) {
      clientRef.current?.stop();
      clientRef.current = undefined;
      return;
    }

    setFollowTail(true);
    followTailRef.current = true;
    manuallyUnfollowedRef.current = false;
    scrollToBottom("auto");
    setTimeout(() => scrollToBottom("smooth"), 0);

    const client = new LiveClient({
      url: "http://localhost:1967/api/events",
      onEvent: (evt) => {
        setReceived((n) => n + 1);
        const cleanEvt = normalizeEvent(evt);

        if (paused) {
          pendingRef.current.push(cleanEvt);
          setPendingCount(pendingRef.current.length);
          return;
        }
        appendAndFollow([cleanEvt]);
      },
    });

    clientRef.current = client;
    client.start();

    return () => {
      client.stop();
    };
  }, [appendAndFollow, live, paused, scrollToBottom]);

  useEffect(() => {
    if (!paused && pendingRef.current.length > 0) {
      const buffered = pendingRef.current.splice(0, pendingRef.current.length);
      setPendingCount(0);
      appendAndFollow(buffered);
    }
  }, [appendAndFollow, paused]);

  useEffect(() => {
    const sentinel = bottomRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const atBottom = entry.isIntersecting;
        if (atBottom && manuallyUnfollowedRef.current) {
          followTailRef.current = false;
          setFollowTail(false);
          return;
        }
        followTailRef.current = atBottom;
        setFollowTail(atBottom);
      },
      {
        root: scrollContainer ?? null,
        rootMargin: "0px 0px -64px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollContainer]);

  const handleScrollEvent = useCallback(() => {
    if (!live) return;
    if (autoScrollingRef.current) return;
    if (!followTailRef.current) return;

    manuallyUnfollowedRef.current = true;
    followTailRef.current = false;
    setFollowTail(false);
  }, [live]);

  useEffect(() => {
    const target: EventTarget | null =
      scrollContainer ??
      (typeof window === "undefined" ? null : window);
    if (!target || typeof target.addEventListener !== "function") return;

    target.addEventListener("scroll", handleScrollEvent, { passive: true });
    return () =>
      target.removeEventListener?.("scroll", handleScrollEvent as EventListener);
  }, [handleScrollEvent, scrollContainer]);

  useEffect(() => {
    return () => {
      clientRef.current?.stop();
    };
  }, []);

  const toggleLive = useCallback(() => {
    setLive((prev) => !prev);
  }, []);

  const togglePaused = useCallback(() => {
    setPaused((prev) => !prev);
  }, []);

  return {
    live,
    toggleLive,
    paused,
    togglePaused,
    received,
    followTail,
    followLatest,
    bottomRef,
    pendingCount,
    setListApi,
  };
}
