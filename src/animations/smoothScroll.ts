import Lenis from "lenis";

export function initSmoothScroll() {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-revealed", ""); // cancels the inline 3s fallback in BaseLayout

  // 0. Mobile navigation toggle (works with or without Lenis / reduced motion)
  const navToggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
  const navLinks = document.getElementById("primary-nav");
  if (navToggle && navLinks) {
    const setOpen = (open: boolean) => {
      navLinks.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    };
    navToggle.addEventListener("click", () => {
      setOpen(!navLinks.classList.contains("is-open"));
    });
    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navLinks.classList.contains("is-open")) {
        const hadFocusInside = navLinks.contains(document.activeElement);
        setOpen(false);
        if (hadFocusInside) navToggle.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (
        navLinks.classList.contains("is-open") &&
        e.target instanceof Node &&
        !navLinks.contains(e.target) &&
        !navToggle.contains(e.target)
      ) {
        setOpen(false);
      }
    });
    window.matchMedia("(min-width: 641px)").addEventListener("change", (e) => {
      if (e.matches && navLinks.classList.contains("is-open")) {
        setOpen(false);
      }
    });
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    document.querySelectorAll(".reveal-item").forEach((el) => {
      el.classList.add("is-revealed");
    });
    return;
  }

  // 1. Initialize Lenis for smooth momentum scrolling
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // 2. Top Scroll Progress Indicator
  const progressBar = document.querySelector<HTMLElement>(".scroll-progress-bar");
  lenis.on("scroll", (e) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0 && progressBar) {
      const progress = Math.min(1, Math.max(0, e.scroll / maxScroll));
      progressBar.style.transform = `scaleX(${progress})`;
    }
  });

  // 3. Scroll Reveal Animations (IntersectionObserver for buttery performance)
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  );

  document.querySelectorAll(".reveal-item").forEach((el) => {
    revealObserver.observe(el);
  });

  // 4. Smooth Anchor Click Handlers via Lenis
  // Skip link keeps native behaviour so keyboard focus actually moves into <main>.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not(.skip-link)').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (targetId && targetId.length > 1) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: -70, duration: 1.1 });
        }
      }
    });
  });

  // 5. Active Nav Highlight on Scroll (rAF-throttled)
  const sections = document.querySelectorAll<HTMLElement>("section[id]");
  const navAnchors = document.querySelectorAll<HTMLAnchorElement>(".nav-links a");

  const updateActiveNav = () => {
    const scrollY = window.scrollY;
    sections.forEach((current) => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 140;
      const sectionId = current.getAttribute("id");

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navAnchors.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${sectionId}`);
        });
      }
    });
  };

  let navTicking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (navTicking) return;
      navTicking = true;
      requestAnimationFrame(() => {
        updateActiveNav();
        navTicking = false;
      });
    },
    { passive: true },
  );
}
