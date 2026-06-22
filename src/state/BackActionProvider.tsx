"use client";

// A shell-owned "back" control for multi-step flows. A flow REGISTERS its current back action (a label
// + a handler) via useBackAction; the AppShell renders ONE back button in a consistent place, the mobile
// header toolbar, and fixed top-right on desktop, and invokes the registered handler. A page with no back
// action registers nothing, so the button is hidden.
//
// Why a context, not a per-page button: the mobile placement is the shell's top toolbar and the desktop
// placement is a fixed shell element, both owned by AppShell. A page cannot render into them directly, so
// it declares its intent here and the shell renders it. This keeps the back control in ONE consistent place
// across every step of every flow (the owner's spec: back on multi-step pages, fixed top-right on web /
// header toolbar on mobile).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface BackAction {
  /** Short label shown next to the arrow on desktop (and the screen-reader name everywhere). */
  label: string;
  /** Invoked when the back control is activated (go back a step, or leave the flow). */
  onBack: () => void;
}

interface BackActionContextValue {
  label: string | null;
  invoke: () => void;
  register: (action: BackAction | null) => void;
}

const BackActionContext = createContext<BackActionContextValue | null>(null);

export function BackActionProvider({ children }: { children: ReactNode }) {
  // Only the LABEL drives a re-render (so the shell shows / updates / hides the button). The handler lives
  // in a ref, read at click time, so a flow can pass a fresh closure every render without churn.
  const [label, setLabel] = useState<string | null>(null);
  const actionRef = useRef<BackAction | null>(null);

  const register = useCallback((action: BackAction | null) => {
    actionRef.current = action;
    // setState with the same string bails out (React), so an unchanged label never re-renders.
    setLabel(action?.label ?? null);
  }, []);

  const invoke = useCallback(() => {
    actionRef.current?.onBack();
  }, []);

  const value = useMemo(() => ({ label, invoke, register }), [label, invoke, register]);
  return <BackActionContext.Provider value={value}>{children}</BackActionContext.Provider>;
}

/**
 * Register the current back action for a multi-step flow. Pass null on a step with no back. The handler is
 * always read fresh (kept in a ref), so it need not be memoised; only the LABEL drives re-registration.
 */
export function useBackAction(action: BackAction | null) {
  const ctx = useContext(BackActionContext);
  const register = ctx?.register;
  const label = action?.label ?? null;
  const onBack = action?.onBack;
  // Register on mount + whenever the label or handler changes; clear on unmount. The handler need not be
  // memoised: register only updates a ref + a string state, and setting the same label bails the
  // re-render, so a fresh closure each render is cheap (no loop, no flicker).
  useEffect(() => {
    if (!register) return;
    register(label && onBack ? { label, onBack } : null);
    return () => register(null);
  }, [register, label, onBack]);
}

/** Read the current back action for the shell's back button (the label + an invoke). */
export function useBackActionBar(): { label: string | null; invoke: () => void } {
  const ctx = useContext(BackActionContext);
  return { label: ctx?.label ?? null, invoke: ctx?.invoke ?? noop };
}

function noop() {}
