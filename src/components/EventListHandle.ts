export interface EventListHandler {
  readonly element: HTMLDivElement | null;
  scrollToRow(config: {
    align?: "auto" | "center" | "end" | "smart" | "start";
    behavior?: "auto" | "instant" | "smooth";
    index: number;
  }): void;
}
