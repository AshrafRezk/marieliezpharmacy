import { useEffect } from "react";

export default function MotionSystem() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = document.querySelector<HTMLElement>(".scroll-progress");
    const onScroll = () => {
      if (progress) {
        progress.style.transform = `scaleX(${window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (reduced) return () => window.removeEventListener("scroll", onScroll);

    const targets = document.querySelectorAll("section > div, .category-card, .promise");
    targets.forEach((el, index) => {
      el.classList.add("reveal-item");
      (el as HTMLElement).style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -35px" },
    );
    targets.forEach((el) => observer.observe(el));

    const hero = document.querySelector<HTMLElement>(".hero-visual");
    const onPointer = (event: PointerEvent) => {
      if (!hero) return;
      const box = hero.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      hero.querySelectorAll<HTMLElement>(".motion-layer").forEach((layer) => {
        const depth = Number(layer.dataset.depth || 0.5);
        layer.style.setProperty("--px", `${x * depth * 18}px`);
        layer.style.setProperty("--py", `${y * depth * 18}px`);
      });
    };
    hero?.addEventListener("pointermove", onPointer);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      hero?.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
