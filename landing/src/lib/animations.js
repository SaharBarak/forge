// Animation engine for the Svelte landing page.
//
// Uses GSAP + ScrollTrigger for choreographed entrance + scroll reveals,
// and Motion (from motion.dev — the spiritual successor to Framer Motion,
// framework-agnostic) for individual element micro-interactions.
//
// Honors `prefers-reduced-motion: reduce` and disables on mobile <= 640px.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, inView } from 'motion';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 640px)').matches;

export function initAnimations(rootEl) {
  if (reducedMotion) {
    rootEl.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    return () => {};
  }

  // ── Page-load entrance — fast, single beat (~400ms total) ──
  const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.32 } });
  tl.from('nav', { y: -16, opacity: 0, duration: 0.22 })
    .from('.signboard', { opacity: 0, y: 10 }, '-=0.12')
    .from('.hero .headline .line', { opacity: 0, y: 12, stagger: 0.04 }, '-=0.18')
    .from('.hero .hero-sub, .hero .hero-phaseline, .hero .hero-cta', {
      opacity: 0,
      y: 10,
      stagger: 0.04
    }, '-=0.18');

  // ── Scroll-reveal each section using Motion's inView ──
  const revealSelector = '.section-head, h2, .prose, p.problem-lede, .demo-frame, .bubble, .step, .mode, .feat, .audience, .oss-manifesto, .oss-meta, .faq details, .final h2, .final p, .hero-cta';

  rootEl.querySelectorAll('section:not(.hero)').forEach((section) => {
    const targets = section.querySelectorAll(revealSelector);
    if (!targets.length) return;
    targets.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
    });
    inView(
      section,
      () => {
        animate(
          [...targets],
          { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] },
          { duration: 0.32, delay: (i) => i * 0.04, easing: [0.16, 1, 0.3, 1] }
        );
      },
      { margin: '0px 0px -12% 0px', amount: 0.05 }
    );
  });

  // ── Card hover micro-lifts (DOM listeners + Motion's animate) ──
  const hoverCleanups = [];
  if (!isMobile()) {
    const hoverTargets = rootEl.querySelectorAll('.btn, .mode, .feat, .audience, .demo-frame, .step');
    hoverTargets.forEach((el) => {
      const onEnter = () => animate(el, { y: -2 }, { duration: 0.14, easing: 'ease-out' });
      const onLeave = () => animate(el, { y: 0 }, { duration: 0.14, easing: 'ease-out' });
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
      hoverCleanups.push(() => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
    });
  }

  // Resize ScrollTrigger refresh
  let resizeT;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => ScrollTrigger.refresh(), 150);
  };
  window.addEventListener('resize', onResize);

  // Cleanup on Svelte unmount
  return () => {
    window.removeEventListener('resize', onResize);
    ScrollTrigger.killAll();
    tl.kill();
    hoverCleanups.forEach((fn) => fn());
  };
}
