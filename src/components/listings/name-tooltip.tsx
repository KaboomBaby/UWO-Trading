import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export function useNameTooltip() {
  const [isTooltipVisible, setTooltipVisible] = useState(false);
  const longPressTimeoutRef = useRef<number | undefined>(undefined);

  const clearLongPressTimer = useCallback(() => {
    window.clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = undefined;
  }, []);

  useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

  const show = useCallback(() => setTooltipVisible(true), []);
  const hide = useCallback(() => setTooltipVisible(false), []);

  const startLongPress = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") return;

      event.preventDefault();
      clearLongPressTimer();
      longPressTimeoutRef.current = window.setTimeout(() => {
        setTooltipVisible(true);
      }, 450);
    },
    [clearLongPressTimer],
  );

  const endLongPress = useCallback(() => {
    clearLongPressTimer();
    setTooltipVisible(false);
  }, [clearLongPressTimer]);

  const showFromContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearLongPressTimer();
      setTooltipVisible(true);
    },
    [clearLongPressTimer],
  );

  return {
    endLongPress,
    hide,
    isTooltipVisible,
    show,
    showFromContextMenu,
    startLongPress,
  };
}

export function NameTooltip({ name }: { name: string }) {
  return (
    <span className="pointer-events-none absolute bottom-[calc(100%+0.375rem)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-amber-glow/40 bg-ink px-2 py-1 text-[0.68rem] font-semibold text-white shadow-lg">
      {name}
    </span>
  );
}
