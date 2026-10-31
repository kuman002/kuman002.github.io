import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function initMotion() {
  gsap.registerPlugin(ScrollTrigger);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const progress = document.querySelector<HTMLElement>(".scroll-progress span");

  if (reduced) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
    if (progress) progress.style.transform = "scaleX(1)";
    return;
  }

  gsap.fromTo(".hero-eyebrow", { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, delay: .15, ease: "power3.out" });
  gsap.fromTo(".title-line", { yPercent: 115, rotate: 2 }, { yPercent: 0, rotate: 0, duration: 1.15, stagger: .13, delay: .2, ease: "power4.out" });
  gsap.fromTo(".hero-intro, .hero-actions, .hero-stack", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, stagger: .12, delay: .65, ease: "power3.out" });
  gsap.fromTo(".portrait-frame", { scale: .82, rotate: 5, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.3, delay: .25, ease: "power3.out" });
  gsap.to(".orb-shape", { attr: { d: "M258 26C374 40 494 130 480 264C466 389 365 495 238 480C112 465 25 364 42 236C59 108 140 12 258 26Z" }, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".orbit-one", { rotate: 360, duration: 42, repeat: -1, ease: "none" });
  gsap.to(".orbit-two", { rotate: -360, duration: 58, repeat: -1, ease: "none" });
  gsap.to(".float-label", { y: -12, duration: 2.8, stagger: .3, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".hero-art", { yPercent: 13, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });

  // Scroll-driven section transitions: each chapter wipes into view as it
  // approaches the viewport, then settles into place. Scrubbing keeps the
  // transition tied to the user's scroll position in both directions.
  gsap.utils.toArray<HTMLElement>("main > section:not(.hero)").forEach((section) => {
    gsap.fromTo(section,
      { clipPath: "inset(10% 0% 0% 0% round 28px)", scale: 0.965, y: 64, transformOrigin: "center top" },
      {
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        scale: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "top 38%",
          scrub: 1.1
        }
      }
    );
  });

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
    gsap.fromTo(element, { y: 42, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: .9, ease: "power3.out",
      scrollTrigger: { trigger: element, start: "top 88%", toggleActions: "play none none reverse" }
    });
  });

  document.querySelectorAll<HTMLElement>(".skill-group").forEach((group) => {
    gsap.fromTo(group.querySelectorAll(".skill-cloud span"), { y: 14, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: .45, stagger: .045, ease: "power2.out",
      scrollTrigger: { trigger: group, start: "top 86%" }
    });
  });

  gsap.fromTo(".timeline-rail span", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 70%", scrub: true } });
  gsap.fromTo(".project-row", { x: -24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .7, stagger: .12, ease: "power3.out", scrollTrigger: { trigger: ".project-list", start: "top 82%" } });

  if (progress) {
    gsap.to(progress, { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: .2 } });
  }

  if (finePointer) {
    const art = document.querySelector<HTMLElement>(".hero-art");
    const onMove = (event: PointerEvent) => {
      if (!art) return;
      const x = (event.clientX / window.innerWidth - .5) * 12;
      const y = (event.clientY / window.innerHeight - .5) * 10;
      gsap.to(".portrait-frame", { x: x * .55, y: y * .55, duration: .7, overwrite: true, ease: "power2.out" });
      gsap.to(".float-label", { x: x * .8, duration: .8, overwrite: true, ease: "power2.out" });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.querySelectorAll<HTMLElement>(".magnetic").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        gsap.to(button, { x: (event.clientX - rect.left - rect.width / 2) * .1, y: (event.clientY - rect.top - rect.height / 2) * .12, duration: .35, ease: "power2.out" });
      });
      button.addEventListener("pointerleave", () => gsap.to(button, { x: 0, y: 0, duration: .5, ease: "elastic.out(1,.4)" }));
    });
  }

  const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".site-header nav a")];
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
  }), { rootMargin: "-35% 0px -55% 0px" });
  sections.forEach((section) => observer.observe(section));
}