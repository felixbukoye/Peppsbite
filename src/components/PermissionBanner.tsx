import React, { useEffect, useState } from "react";
import { XIcon } from "./icons";
import { useLocation } from "../context/LocationContext";
import { useToast } from "../context/ToastContext";

const DISMISS_KEY = "peppsbite_location_banner_dismissed";

export function PermissionBanner() {
  const [visible, setVisible] = useState(false);
  const { setLocation } = useLocation();
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleAllow = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocation("New York, USA");
          dismiss();
          showToast("Location enabled");
        },
        () => {
          setLocation("New York, USA");
          dismiss();
          showToast("Location set to New York");
        }
      );
    } else {
      setLocation("New York, USA");
      dismiss();
      showToast("Location set to New York");
    }
  };

  return (
    <div className="mx-4 mb-3 flex items-start gap-3 rounded-2xl bg-black px-4 py-3.5 text-white shadow-lg">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold tracking-tight">
          Allow location access for faster delivery
        </p>
        <p className="text-[11px] text-neutral-300 mt-0.5">
          Get ultra-precise delivery ETAs and live store stock.
        </p>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={handleAllow}
            className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-black transition-transform active:scale-95 hover:bg-neutral-100"
          >
            Allow location
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full border border-white/30 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-white/10"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
