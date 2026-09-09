import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type NavigationContextValue = {
  pathname: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  goBack: (fallback?: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const getInitialPath = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace(/^#/, "");
      return hash || window.location.pathname || "/";
    }
    return "/";
  };

  const [pathname, setPathname] = useState<string>(getInitialPath);
  const [historyStack, setHistoryStack] = useState<string[]>([getInitialPath()]);

  useEffect(() => {
    const handleHashOrPop = () => {
      const currentHash = window.location.hash.replace(/^#/, "") || "/";
      setPathname((prev) => {
        if (prev !== currentHash) {
          return currentHash;
        }
        return prev;
      });
    };

    window.addEventListener("popstate", handleHashOrPop);
    window.addEventListener("hashchange", handleHashOrPop);
    return () => {
      window.removeEventListener("popstate", handleHashOrPop);
      window.removeEventListener("hashchange", handleHashOrPop);
    };
  }, []);

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    const target = path.startsWith("/") ? path : `/${path}`;
    setPathname(target);
    setHistoryStack((prev) => {
      if (options?.replace) {
        return [...prev.slice(0, -1), target];
      }
      if (prev[prev.length - 1] === target) return prev;
      return [...prev, target];
    });

    if (typeof window !== "undefined") {
      try {
        if (options?.replace) {
          window.location.replace(`#${target}`);
        } else {
          window.location.hash = target;
        }
      } catch {
        // ignore hash write restrictions if any
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  const goBack = useCallback(
    (fallback = "/") => {
      setHistoryStack((prev) => {
        if (prev.length > 1) {
          const nextStack = prev.slice(0, -1);
          const previousPath = nextStack[nextStack.length - 1];
          setPathname(previousPath);
          if (typeof window !== "undefined") {
            try {
              window.location.hash = previousPath;
            } catch {
              // ignore
            }
            window.scrollTo({ top: 0, behavior: "instant" });
          }
          return nextStack;
        } else {
          const target = fallback.startsWith("/") ? fallback : `/${fallback}`;
          setPathname(target);
          if (typeof window !== "undefined") {
            try {
              window.location.hash = target;
            } catch {
              // ignore
            }
            window.scrollTo({ top: 0, behavior: "instant" });
          }
          return [target];
        }
      });
    },
    []
  );

  const value = useMemo(
    () => ({ pathname, navigate, goBack }),
    [pathname, navigate, goBack]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}
