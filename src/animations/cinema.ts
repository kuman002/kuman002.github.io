import { gsap } from "gsap";
import { init3DScene } from "./scene3d";

export function initCinema() {
  const scene3d = init3DScene();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scenes = [
    document.querySelector<HTMLElement>("#scene-hero"),
    document.querySelector<HTMLElement>("#scene-about"),
    document.querySelector<HTMLElement>("#scene-experience"),
    document.querySelector<HTMLElement>("#scene-skills"),
    document.querySelector<HTMLElement>("#scene-projects"),
    document.querySelector<HTMLElement>("#scene-contact"),
  ].filter(Boolean) as HTMLElement[];

  const apexLabel = document.querySelector<HTMLElement>("#apex-node-name");
  const sysTabBtns = document.querySelectorAll<HTMLButtonElement>(".sys-tab-btn");
  const sysCounter = document.querySelector<HTMLElement>(".sys-counter b");
  const prevBtn = document.querySelector<HTMLButtonElement>(".prev-btn");
  const nextBtn = document.querySelector<HTMLButtonElement>(".next-btn");

  const totalTabs = scenes.length;
  let currentTab = 0;
  let isShifting = false;

  const nodeMeta = [
    { num: "00", name: "ORIGIN", chip: "[API_GATEWAY]" },
    { num: "01", name: "ABOUT", chip: "[AUTH_COGNITO]" },
    { num: "02", name: "EXPERIENCE", chip: "[LAMBDA_CLUSTER]" },
    { num: "03", name: "STACK", chip: "[REDIS_BULLMQ]" },
    { num: "04", name: "PROJECTS", chip: "[PGSQL_PRIMARY]" },
    { num: "05", name: "CONTACT", chip: "[S3_VAULT_KMS]" },
  ];

  // Set initial states (hero tab visible, other tabs hidden and shifted)
  scenes.forEach((s, idx) => {
    if (idx === 0) {
      gsap.set(s, { x: 0, rotateY: 0, scale: 1, opacity: 1, visibility: "visible" });
      s.classList.add("is-active");
      s.setAttribute("aria-hidden", "false");
    } else {
      gsap.set(s, { x: 48, rotateY: 0, scale: 0.985, opacity: 0, visibility: "hidden" });
      s.classList.remove("is-active");
      s.setAttribute("aria-hidden", "true");
    }
  });

  function updateSystemDock(tabIdx: number) {
    // System Tab buttons
    sysTabBtns.forEach((btn, idx) => {
      btn.classList.toggle("is-active", idx === tabIdx);
      if (idx === tabIdx) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
    if (prevBtn) prevBtn.disabled = tabIdx === 0;
    if (nextBtn) nextBtn.disabled = tabIdx === totalTabs - 1;

    // Numerical counter
    if (sysCounter) {
      sysCounter.textContent = `0${tabIdx + 1}`;
    }

    // Apex sensor readout
    if (apexLabel && nodeMeta[tabIdx]) {
      const meta = nodeMeta[tabIdx];
      apexLabel.textContent = `NODE ${meta.num}: ${meta.name} // ${meta.chip}`;
    }
  }

  function shiftToTab(targetIdx: number, customDir?: number) {
    if (targetIdx === currentTab || isShifting) return;
    if (targetIdx < 0 || targetIdx >= totalTabs) return;

    isShifting = true;
    const direction = customDir !== undefined ? customDir : targetIdx > currentTab ? 1 : -1;
    const prevScene = scenes[currentTab];
    const nextScene = scenes[targetIdx];

    // 1. Anamorphic Lens Flare Sweep
    const flare = document.querySelector<HTMLElement>(".cinematic-lens-flare");
    if (flare && !prefersReducedMotion) {
      gsap.fromTo(
        flare,
        {
          scaleX: 0.1,
          opacity: 0.85,
          x: -direction * 120,
        },
        {
          scaleX: 1.6,
          opacity: 0,
          x: direction * 150,
          duration: 0.8,
          ease: "power2.out",
        }
      );
    }

    // 2. Cinematic 3D Tab Shift Transition (Deliberate & Majestic)
    // Outgoing tab glides out with 3D tilt, depth compression & motion blur
    if (prevScene) {
      prevScene.classList.remove("is-active");
      prevScene.setAttribute("aria-hidden", "true");
      gsap.to(prevScene, {
        x: -direction * 140,
        rotateY: -direction * 8,
        scale: 0.92,
        opacity: 0,
        duration: prefersReducedMotion ? 0 : 0.42,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.set(prevScene, { visibility: "hidden" });
        },
      });
    }

    // Incoming tab sweeps in from depth & resolves into crisp focus
    if (nextScene) {
      nextScene.classList.add("is-active");
      nextScene.setAttribute("aria-hidden", "false");
      const cardBody = nextScene.querySelector<HTMLElement>(".card-body");
      if (cardBody) cardBody.scrollTop = 0;

      gsap.fromTo(
        nextScene,
        {
          x: direction * 140,
          rotateY: direction * 8,
          scale: 0.92,
          opacity: 0,
          visibility: "visible",
        },
        {
          x: 0,
          rotateY: 0,
          scale: 1,
          opacity: 1,
          duration: prefersReducedMotion ? 0 : 0.58,
          delay: prefersReducedMotion ? 0 : 0.06,
          ease: "power2.out",
          onComplete: () => {
            isShifting = false;
          },
        }
      );

      // Staggered cinematic reveal of inner card components
      const header = nextScene.querySelector<HTMLElement>(".card-header");
      if (header) {
        gsap.fromTo(header, { y: prefersReducedMotion ? 0 : -8, opacity: prefersReducedMotion ? 1 : 0.55 }, { y: 0, opacity: 1, duration: prefersReducedMotion ? 0 : 0.35, delay: prefersReducedMotion ? 0 : 0.08, ease: "power2.out" });
      }

      const sceneHeading = nextScene.querySelector<HTMLElement>(".scene-header, .hero-tagline, .hero-h1");
      if (sceneHeading) {
        gsap.fromTo(sceneHeading, { y: prefersReducedMotion ? 0 : 12, opacity: prefersReducedMotion ? 1 : 0 }, { y: 0, opacity: 1, duration: prefersReducedMotion ? 0 : 0.42, delay: prefersReducedMotion ? 0 : 0.1, ease: "power2.out" });
      }

      const cards = nextScene.querySelectorAll<HTMLElement>(
        ".metric-box, .exp-cinema-card, .skill-cinema-card, .project-cinema-card, .c-btn, .hero-floating-pill"
      );
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: prefersReducedMotion ? 0 : 14, opacity: prefersReducedMotion ? 1 : 0 },
          { y: 0, opacity: 1, stagger: prefersReducedMotion ? 0 : 0.035, duration: prefersReducedMotion ? 0 : 0.38, delay: prefersReducedMotion ? 0 : 0.13, ease: "power2.out" }
        );
      }
    } else {
      isShifting = false;
    }

    currentTab = targetIdx;
    updateSystemDock(currentTab);

    // Drive 3D Tube rotation from back to front & trigger packet surge
    scene3d.setTab(currentTab);
    scene3d.updateScroll(currentTab * 750);
    scene3d.triggerBurst?.();
  }

  // System Tab buttons click
  sysTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.tab || "0", 10);
      shiftToTab(idx);
    });
  });

  // Keep in-page calls to action in the same section flow as scroll and dock navigation.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#scene-"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetIdx = scenes.findIndex((scene) => `#${scene.id}` === link.getAttribute("href"));
      if (targetIdx < 0) return;
      event.preventDefault();
      shiftToTab(targetIdx);
    });
  });

  // Prev / Next arrow buttons click
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentTab > 0) shiftToTab(currentTab - 1, -1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentTab < totalTabs - 1) shiftToTab(currentTab + 1, 1);
    });
  }

  // ========================================================
  // WHEEL & SCROLL CONTROLLER: Solves "sections are not able scroll"
  // ========================================================
  let wheelTimeout: ReturnType<typeof setTimeout> | null = null;
  let accumulatedDelta = 0;

  window.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      const activeCard = scenes[currentTab]?.querySelector<HTMLElement>(".card-body");

      if (activeCard) {
        const { scrollTop, scrollHeight, clientHeight } = activeCard;
        const maxScroll = scrollHeight - clientHeight;
        const hasScrollableContent = maxScroll > 12;

        if (hasScrollableContent) {
          const isAtTop = scrollTop <= 4;
          const isAtBottom = scrollTop >= maxScroll - 4;

          // If user scrolls down and is NOT at bottom of card, let card scroll naturally!
          if (e.deltaY > 0 && !isAtBottom) {
            return;
          }
          // If user scrolls up and is NOT at top of card, let card scroll naturally!
          if (e.deltaY < 0 && !isAtTop) {
            return;
          }
        }
      }

      accumulatedDelta += e.deltaY;

      if (wheelTimeout) clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        accumulatedDelta = 0;
      }, 350);

      if (Math.abs(accumulatedDelta) > 65 && !isShifting) {
        if (accumulatedDelta > 0) {
          if (currentTab < totalTabs - 1) {
            shiftToTab(currentTab + 1, 1);
            accumulatedDelta = 0;
          }
        } else {
          if (currentTab > 0) {
            shiftToTab(currentTab - 1, -1);
            accumulatedDelta = 0;
          }
        }
      }
    },
    { passive: true }
  );

  // Keyboard navigation
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown") {
      if (currentTab < totalTabs - 1) {
        e.preventDefault();
        shiftToTab(currentTab + 1, 1);
      }
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
      if (currentTab > 0) {
        e.preventDefault();
        shiftToTab(currentTab - 1, -1);
      }
    }
  });

  // Touch swipe handling for mobile / trackpads
  let touchStartY = 0;
  window.addEventListener(
    "touchstart",
    (e) => {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchStartY - touchEndY;

      const activeCard = scenes[currentTab]?.querySelector<HTMLElement>(".card-body");
      if (activeCard) {
        const { scrollTop, scrollHeight, clientHeight } = activeCard;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll > 12) {
          if (diffY > 0 && scrollTop < maxScroll - 6) return;
          if (diffY < 0 && scrollTop > 6) return;
        }
      }

      if (Math.abs(diffY) > 60 && !isShifting) {
        if (diffY > 0 && currentTab < totalTabs - 1) {
          shiftToTab(currentTab + 1, 1);
        } else if (diffY < 0 && currentTab > 0) {
          shiftToTab(currentTab - 1, -1);
        }
      }
    },
    { passive: true }
  );

  // Initialize
  updateSystemDock(0);
  scene3d.setTab(0);
}
