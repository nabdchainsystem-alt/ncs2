"use client";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Plus,
  Building2,
  ClipboardList,
  PackageSearch,
  Factory,
  Truck,
  Sparkles,
} from "lucide-react";

/** Menu item shape */
type MenuItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
};

/** Lock body scroll while the overlay is open */
const useBodyLock = (locked: boolean) => {
  useEffect(() => {
    const { body } = document;
    const prev = body.style.overflow;
    if (locked) body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [locked]);
};

export default function FabRadial({
  items,
  onCreateRequest,
  hideOnPaths = [],
}: {
  /** Optional custom items override; otherwise defaults below are used */
  items?: MenuItem[];
  /** Handler for the + (New Request) */
  onCreateRequest?: () => void;
  /** Hide FAB on these pathname prefixes (e.g., ["/login","/auth"]) */
  hideOnPaths?: string[];
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useBodyLock(open);
  const prefersReducedMotion = useReducedMotion();

  // Build the default mock items (labels are placeholders until wiring).
  const menuItems = useMemo<MenuItem[]>(
    () =>
      items ?? [
        { key: "create", label: "New Request", icon: Plus, onClick: onCreateRequest },
        { key: "vendors", label: "Vendors", icon: Building2 },
        { key: "rfq", label: "RFQs", icon: ClipboardList },
        { key: "inventory", label: "Inventory", icon: PackageSearch },
        { key: "factory", label: "Factory", icon: Factory },
        { key: "fleet", label: "Fleet", icon: Truck },
      ],
    [items, onCreateRequest]
  );

  // Optional: allow hiding on certain paths (login, print pages, etc.)
  const shouldHide = (() => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname || "/";
    return hideOnPaths.some((prefix) => p.startsWith(prefix));
  })();

  // Keyboard: ESC closes the overlay
  useEffect(() => {
    if (!open || shouldHide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shouldHide]);

  if (shouldHide) return null;
  // Motion variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const ringVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  // Silky button micro-interactions (idle pulsing glow)
  const pulseTransition = prefersReducedMotion
    ? { duration: 0 }
    : {
        duration: 2.2,
        repeat: Infinity,
        repeatType: "mirror" as const,
        ease: [0.25, 0.1, 0.25, 1],
      };

  return (
    <>
      {/* Floating Action Button (bottom-right) */}
      <motion.button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`radial-${id}`}
        onClick={() => setOpen((v) => !v)}
        className="
          tw-fixed tw-bottom-[5rem] tw-right-[5rem] tw-z-[360] tw-h-[4.5rem] tw-w-[4.5rem]
          tw-rounded-full tw-border tw-border-white/25
          tw-bg-[#050505] tw-text-white tw-shadow-[0_18px_48px_rgba(12,12,24,0.45)]
          hover:tw-shadow-[0_22px_60px_rgba(12,12,24,0.5)]
          focus:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-white/60
          active:tw-scale-95
          tw-transition-all tw-duration-500 tw-ease-out
        "
        whileHover={{ scale: prefersReducedMotion ? 1 : 1.07 }}
        whileTap={{ scale: prefersReducedMotion ? 1 : 0.92 }}
      >
        {/* Soft halo/pulse ring beneath the FAB for futurism */}
        <motion.span
          aria-hidden
          className="tw-pointer-events-none tw-absolute tw-inset-0 tw--z-10 tw-rounded-full"
          style={{
            boxShadow:
              "0 0 16px 8px rgba(255,255,255,0.18), 0 0 32px 14px rgba(0,0,0,0.35)",
          }}
          animate={{ opacity: [0.65, 0.95, 0.65], scale: [1, 1.03, 1] }}
          transition={pulseTransition}
        />
        {/* Icon swaps into X when open */}
        <motion.div
          animate={
            open
              ? { rotate: 45, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
              : {
                  rotate: 0,
                  scale: [1, 1.1, 1],
                  filter: [
                    "drop-shadow(0 0 28px rgba(255,255,255,0.75))",
                    "drop-shadow(0 0 18px rgba(255,255,255,0.45))",
                    "drop-shadow(0 0 28px rgba(255,255,255,0.75))",
                  ],
                  transition: {
                    duration: 2.8,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                  },
                }
          }
          className="tw-flex tw-items-center tw-justify-center"
        >
          <Sparkles className="tw-h-8 tw-w-8 tw-text-white tw-drop-shadow-[0_0_28px_rgba(255,255,255,0.65)]" />
        </motion.div>
        <span className="tw-sr-only">Open quick actions</span>
      </motion.button>

      {/* Portal for overlay + radial menu to ensure top-most layer */}
      {typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                {/* Backdrop: blurred, clickable to close, covers entire screen */}
                <motion.button
                  aria-label="Close menu"
                  className="tw-fixed tw-inset-0 tw-z-[320] tw-bg-[rgba(3,6,23,0.36)] tw-backdrop-blur-md"
                  onClick={() => setOpen(false)}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={overlayVariants}
                  transition={{ duration: 0.18, ease: "linear" }}
                />

                {/* Projected pedestal ring under the menu (holographic plate) */}
                <motion.div
                  className="tw-fixed tw-z-[340] tw-bottom-[5rem] tw-right-[5rem] tw-pointer-events-none"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={ringVariants}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                >
                  <div className="tw-relative tw-h-16 tw-w-16">
                    <div className="tw-absolute tw-inset-0 tw-rounded-full tw-bg-cyan-500/0" />
                    {/* Concentric rings glow */}
                    <div className="tw-absolute tw-left-1/2 tw-top-1/2 tw--translate-x-1/2 tw--translate-y-1/2">
                      <div className="tw-h-20 tw-w-20 tw-rounded-full tw-border tw-border-cyan-300/25" />
                      <div className="tw-absolute tw-inset-0 tw-h-24 tw-w-24 tw--z-10 tw-rounded-full tw-blur-2xl tw-bg-cyan-400/15" />
                    </div>
                  </div>
                </motion.div>

                {/* Quick-action dock across the screen */}
                <motion.div
                  className="tw-fixed tw-bottom-[8rem] tw-left-0 tw-right-0 tw-z-[380] tw-pointer-events-none"
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 60 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <motion.ul
                    className="tw-flex tw-flex-wrap tw-items-end tw-justify-center tw-gap-12 lg:tw-gap-16"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: {},
                      visible: {
                        transition: {
                          staggerChildren: prefersReducedMotion ? 0 : 0.05,
                        },
                      },
                    }}
                  >
                    {menuItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <motion.li
                          key={item.key}
                          className="tw-pointer-events-auto tw-flex tw-flex-col tw-items-center tw-gap-3"
                          initial={{ opacity: 0, y: 40, scale: 0.85 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 40, scale: 0.85 }}
                          transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 26,
                            delay: prefersReducedMotion ? 0 : 0.05 * i,
                          }}
                        >
                          <motion.button
                            type="button"
                            disabled={item.disabled}
                            onClick={() => {
                              item.onClick?.();
                              setOpen(false);
                            }}
                            className={`
                              group tw-flex tw-items-center tw-justify-center
                              tw-h-[4rem] tw-w-[4rem] tw-rounded-full
                              tw-border tw-border-white/30 tw-bg-[#050505]/95 tw-text-white
                              tw-shadow-[0_24px_70px_rgba(8,8,16,0.58)] tw-backdrop-blur-xl
                              hover:tw-border-white/45 hover:tw-shadow-[0_34px_92px_rgba(10,10,20,0.65)]
                              focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-white/45
                              ${item.disabled ? "tw-opacity-30 tw-cursor-not-allowed" : ""}
                            `}
                            whileHover={{ scale: prefersReducedMotion ? 1 : 1.15 }}
                            whileFocus={{ scale: prefersReducedMotion ? 1 : 1.12 }}
                          >
                            <Icon className="tw-text-white tw-h-[2.8rem] tw-w-[2.8rem] tw-drop-shadow-[0_0_24px_rgba(255,255,255,0.5)]" />
                          </motion.button>
                          <motion.span
                            className="tw-rounded-full tw-bg-black/75 tw-px-4 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2, delay: prefersReducedMotion ? 0 : 0.05 * i }}
                          >
                            {item.label}
                          </motion.span>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
