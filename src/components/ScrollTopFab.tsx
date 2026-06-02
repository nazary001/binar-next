"use client";
import { useEffect, useState } from "react";
import { ScrollToTopButton } from "./ScrollToTopButton";

// Floating "scroll to top" action button. Reuses the footer's
// ScrollToTopButton (Figma "Up Animation", spinning ring). It appears
// once the user has scrolled down ~3/4 of a viewport and fades out near
// the top again. It also hides while the footer (#contacts) is in view,
// because the footer renders its own copy of this control - so the two
// scroll-up buttons never show at the same time.
export function ScrollTopFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const footer = document.getElementById("contacts");
    let footerInView = false;

    const update = () => {
      const scrolledEnough = window.scrollY > window.innerHeight * 0.75;
      setVisible(scrolledEnough && !footerInView);
    };

    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, { passive: true });

    let io: IntersectionObserver | undefined;
    if (footer) {
      io = new IntersectionObserver(
        ([entry]) => {
          footerInView = entry.isIntersecting;
          update();
        },
        // Hide a touch before the footer fully enters, so the FAB is
        // already gone by the time the footer's own button is on screen.
        { rootMargin: "0px 0px 80px 0px" },
      );
      io.observe(footer);
    }

    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  return (
    <div
      // `inert` keeps the hidden button out of the tab order / a11y tree
      // while it is faded out (it stays mounted for the fade transition).
      inert={!visible}
      className={`fixed bottom-5 right-5 z-40 transition-all duration-300 ease-out sm:bottom-8 sm:right-8 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {/* FAB shows just the orange circle + arrow - no spinning ring. */}
      <ScrollToTopButton showRing={false} />
    </div>
  );
}
