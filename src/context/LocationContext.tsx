import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "./ToastContext";

const STORAGE_KEY = "peppsbite_location";
const DEFAULT_LOCATION = "New York, USA";

type LocationContextValue = {
  location: string;
  setLocation: (value: string) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState(DEFAULT_LOCATION);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setLocationState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setLocation = useCallback(
    (value: string) => {
      setLocationState(value);
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // ignore
      }
      showToast("Location updated");
    },
    [showToast]
  );

  const value = useMemo(() => ({ location, setLocation }), [location, setLocation]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
