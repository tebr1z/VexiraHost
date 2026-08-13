"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Manrope, Newsreader } from "next/font/google";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { DesignNav } from "./design-nav";
import { ProjectMock } from "./design-visuals";

import "./design.css";

const display = Newsreader({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-vd-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-vd-body",
  display: "swap",
});

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

type TechItem = { name: string; role: string };
type ProjectItem = { name: string; index: string; meta: string; tags: string[] };
type ManifestoWord = { text: string; accent?: boolean };

function SplitLine({ text, className }: { text: string; className: string }): React.ReactElement {
  return (
    <span className={className}>
      {Array.from(text).map((ch, index) => (
        <span key={`${ch}-${index}`} className="vd-char">
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

export function DesignExperience(): React.ReactElement {
  const t = useTranslations("design");
  const rootRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLElement>(null);
  const processRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  const manifesto = t.raw("manifesto") as ManifestoWord[];
  const tech = t.raw("tech") as TechItem[];
  const projects = t.raw("projects") as ProjectItem[];
  const process = t.raw("process") as string[];
  const marquee = [...tech, ...tech].map((item) => item.name);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      if (!root) return;

      const html = document.documentElement;
      html.classList.add("vd-lock-scroll");

      const mm = gsap.matchMedia();
      const finePointer = window.matchMedia("(pointer: fine)").matches;

      const playIntro = () => {
        gsap.fromTo(
          ".vd-char",
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.05,
            stagger: 0.018,
            ease: "power4.out",
          },
        );
        gsap.fromTo(
          ".vd-kicker, .vd-hero-lead, .vd-scroll-hint, .vd-hero-chrome, .vd-hero-card, .vd-floater",
          { y: 18, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.05, ease: "power3.out", delay: 0.15 },
        );
      };

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".vd-char, .vd-word, .vd-project, .vd-step, .vd-hero-lead, .vd-kicker", {
          autoAlpha: 1,
          y: 0,
          yPercent: 0,
          x: 0,
          scale: 1,
        });
        gsap.set(".vd-loader", { autoAlpha: 0 });
        gsap.set(".vd-progress", { scaleX: 1 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const counter = { value: 0 };
        const tl = gsap.timeline({
          onComplete: playIntro,
        });
        tl.to(
          counter,
          {
            value: 100,
            duration: 0.85,
            ease: "power2.inOut",
            onUpdate: () => {
              if (countRef.current) {
                countRef.current.textContent = String(Math.round(counter.value)).padStart(2, "0");
              }
            },
          },
          0,
        );
        tl.to(".vd-loader-bar span", { scaleX: 1, duration: 0.85, ease: "power2.inOut" }, 0);
        tl.to(".vd-loader", { yPercent: -100, duration: 0.7, ease: "power4.inOut" }, "+=0.02");

        gsap.to(".vd-progress", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.3,
            refreshPriority: 0,
          },
        });

        const heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: ".vd-hero",
            start: "top top",
            end: "+=35%",
            pin: true,
            scrub: 0.8,
            refreshPriority: 1,
          },
        });
        heroTl.to(".vd-hero-serif", { yPercent: -8, ease: "none" }, 0);
        heroTl.to(".vd-hero-sans", { yPercent: -4, ease: "none" }, 0);
        heroTl.to(".vd-hero-card", { rotationY: 0, rotationX: 0, yPercent: 8, ease: "none" }, 0);

        gsap.utils.toArray<HTMLElement>(".vd-word").forEach((word) => {
          gsap.fromTo(
            word,
            { autoAlpha: 0.2, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              color: word.classList.contains("is-accent") ? "#d6ff4b" : "#f3f1ea",
              scrollTrigger: {
                trigger: word,
                start: "top 84%",
                end: "top 46%",
                scrub: 0.5,
                refreshPriority: 2,
              },
            },
          );
        });
      });

      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const track = trackRef.current;
        const section = techRef.current;
        if (!track || !section) return;

        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            start: "top top",
            end: () => `+=${Math.max(track.scrollWidth - window.innerWidth, window.innerHeight)}`,
            invalidateOnRefresh: true,
            refreshPriority: 3,
          },
        });
      });

      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".vd-tech-panel").forEach((panel) => {
          gsap.fromTo(
            panel.querySelector(".vd-tech-name"),
            { y: 28, autoAlpha: 0.35 },
            {
              y: 0,
              autoAlpha: 1,
              scrollTrigger: {
                trigger: panel,
                start: "top 78%",
                end: "top 40%",
                scrub: 0.6,
                refreshPriority: 3,
              },
            },
          );
        });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const projectEls = gsap.utils.toArray<HTMLElement>(".vd-project");
        if (portfolioRef.current && projectEls.length > 1) {
          gsap.set(projectEls, { autoAlpha: 0 });
          gsap.set(projectEls[0], { autoAlpha: 1 });
          const portfolioTl = gsap.timeline({
            scrollTrigger: {
              trigger: portfolioRef.current,
              start: "top top",
              end: () => `+=${(projectEls.length - 1) * window.innerHeight}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
              refreshPriority: 4,
            },
          });
          projectEls.forEach((project, index) => {
            if (index === 0) return;
            portfolioTl.to(
              projectEls[index - 1],
              { autoAlpha: 0, yPercent: -4, ease: "none" },
              ">",
            );
            portfolioTl.fromTo(
              project,
              { autoAlpha: 0, yPercent: 6 },
              { autoAlpha: 1, yPercent: 0, ease: "none" },
              "<",
            );
          });
        }

        const steps = gsap.utils.toArray<HTMLElement>(".vd-step");
        if (processRef.current && steps.length) {
          gsap.set(steps, { autoAlpha: 0.22 });
          const processTl = gsap.timeline({
            scrollTrigger: {
              trigger: processRef.current,
              start: "top top",
              end: "+=85%",
              pin: true,
              scrub: 1,
              refreshPriority: 5,
            },
          });
          steps.forEach((step, index) => {
            processTl.to(
              ".vd-process-fill",
              { scaleX: (index + 1) / steps.length, ease: "none" },
              index,
            );
            processTl.to(step, { autoAlpha: 1, ease: "none" }, index);
          });
        }

        gsap.fromTo(
          ".vd-cta-title, .vd-cta-lead, .vd-cta-row .vd-btn, .vd-footer-mini",
          { y: 36, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            stagger: 0.07,
            ease: "none",
            scrollTrigger: {
              trigger: ".vd-cta",
              start: "top 72%",
              end: "top 32%",
              scrub: 0.7,
              refreshPriority: 6,
            },
          },
        );
      });

      if (finePointer && contextSafe) {
        root.classList.add("has-cursor");
        const cursor = root.querySelector<HTMLElement>(".vd-cursor");
        const dot = root.querySelector<HTMLElement>(".vd-cursor-dot");
        const spot = root.querySelector<HTMLElement>(".vd-spot");
        const meshA = root.querySelector<HTMLElement>(".vd-mesh-a");
        const meshB = root.querySelector<HTMLElement>(".vd-mesh-b");
        const title = root.querySelector<HTMLElement>(".vd-hero-title");
        const card = root.querySelector<HTMLElement>(".vd-hero-card");
        const floaters = gsap.utils.toArray<HTMLElement>(".vd-floater");
        if (cursor && dot && spot && meshA && meshB && title && card) {
          const xC = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
          const yC = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
          const xD = gsap.quickTo(dot, "x", { duration: 0.16, ease: "power3" });
          const yD = gsap.quickTo(dot, "y", { duration: 0.16, ease: "power3" });
          const xS = gsap.quickTo(spot, "x", { duration: 0.55, ease: "power3" });
          const yS = gsap.quickTo(spot, "y", { duration: 0.55, ease: "power3" });
          const xA = gsap.quickTo(meshA, "x", { duration: 1.05, ease: "power3" });
          const yA = gsap.quickTo(meshA, "y", { duration: 1.05, ease: "power3" });
          const xB = gsap.quickTo(meshB, "x", { duration: 1.3, ease: "power3" });
          const yB = gsap.quickTo(meshB, "y", { duration: 1.3, ease: "power3" });
          const rotX = gsap.quickTo(title, "rotationX", { duration: 0.7, ease: "power3" });
          const rotY = gsap.quickTo(title, "rotationY", { duration: 0.7, ease: "power3" });
          const cardX = gsap.quickTo(card, "rotationX", { duration: 0.8, ease: "power3" });
          const cardY = gsap.quickTo(card, "rotationY", { duration: 0.8, ease: "power3" });
          const floaterTo = floaters.map((el) => ({
            x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3" }),
            y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3" }),
            depth: Number(el.dataset.depth ?? 1),
          }));

          const onMove = contextSafe((event: PointerEvent) => {
            xC(event.clientX);
            yC(event.clientY);
            xD(event.clientX);
            yD(event.clientY);
            xS(event.clientX);
            yS(event.clientY);
            const rx = (event.clientX / window.innerWidth - 0.5) * 2;
            const ry = (event.clientY / window.innerHeight - 0.5) * 2;
            xA(rx * 48);
            yA(ry * 32);
            xB(rx * -36);
            yB(ry * 24);
            rotY(rx * 9);
            rotX(ry * -7);
            cardY(-16 + rx * 10);
            cardX(8 + ry * -8);
            floaterTo.forEach((item) => {
              item.x(rx * 28 * item.depth);
              item.y(ry * 22 * item.depth);
            });
          });

          const onOver = contextSafe((event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            cursor.classList.toggle("is-hot", Boolean(target?.closest("a, button")));
          });

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerover", onOver);
          return () => {
            html.classList.remove("vd-lock-scroll");
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerover", onOver);
            mm.revert();
          };
        }
      }

      return () => {
        html.classList.remove("vd-lock-scroll");
        mm.revert();
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={`vd-root vd-grain ${display.variable} ${body.variable}`}>
      <div className="vd-cursor" />
      <div className="vd-cursor-dot" />
      <div className="vd-progress" />

      <div className="vd-loader" aria-hidden>
        <div className="vd-loader-top">
          <span>VexiraDesign</span>
          <span>Studio</span>
        </div>
        <div>
          <span ref={countRef} className="vd-loader-count">
            00
          </span>
          <div className="vd-loader-bar">
            <span />
          </div>
        </div>
        <div className="vd-loader-bot">
          <span>Software · Product · Interface</span>
          <span>MMXXVI</span>
        </div>
      </div>

      <DesignNav />

      <section className="vd-hero" aria-label={t("kicker")}>
        <div className="vd-stage">
          <div className="vd-spot" />
          <div className="vd-mesh vd-mesh-a" />
          <div className="vd-mesh vd-mesh-b" />
          <div className="vd-mesh vd-mesh-c" />
          <div className="vd-vignette" />
        </div>
        <div className="vd-floaters">
          {tech.map((item, index) => (
            <span
              key={item.name}
              className="vd-floater"
              data-depth={(0.55 + index * 0.22).toFixed(2)}
            >
              {item.name}
            </span>
          ))}
        </div>
        <div className="vd-hero-chrome">
          <span>Baku / 40.4093° N</span>
          <span>Vexira Labs LLC</span>
        </div>
        <div className="vd-hero-grid">
          <div className="vd-hero-copy">
            <p className="vd-kicker">
              <i />
              {t("kicker")}
            </p>
            <h1 className="vd-hero-title">
              <SplitLine text={t("heroLine1")} className="vd-hero-serif" />
              <SplitLine text={`${t("heroLine2")} ${t("heroLine3")}`} className="vd-hero-sans" />
            </h1>
            <div className="vd-hero-foot">
              <p className="vd-hero-lead">{t("heroLead")}</p>
              <p className="vd-scroll-hint">{t("scroll")}</p>
            </div>
          </div>
          <div className="vd-hero-visual">
            <div className="vd-hero-card">
              <ProjectMock variant={0} />
            </div>
          </div>
        </div>
      </section>

      <div className="vd-marquee" aria-hidden>
        <div className="vd-marquee-track">
          {marquee.map((name, index) => (
            <span key={`${name}-${index}`}>{name}</span>
          ))}
        </div>
      </div>

      <section className="vd-manifesto">
        <p className="vd-manifesto-index">01 / Manifesto</p>
        <p className="vd-manifesto-text">
          {manifesto.map((word, index) => (
            <span
              key={`${word.text}-${index}`}
              className={word.accent ? "vd-word is-accent" : "vd-word"}
            >
              {word.text}
            </span>
          ))}
        </p>
      </section>

      <section ref={techRef} className="vd-tech">
        <p className="vd-tech-head">{t("buildWith")}</p>
        <div ref={trackRef} className="vd-tech-track">
          {tech.map((item, index) => (
            <article key={item.name} className="vd-tech-panel" data-i={index}>
              <div className="vd-tech-glow" />
              <p className="vd-tech-index">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="vd-tech-name">{item.name}</h2>
              <p className="vd-tech-role">{item.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section ref={portfolioRef} className="vd-portfolio" aria-label={t("workLabel")}>
        {projects.map((project, index) => (
          <article key={project.name} className="vd-project">
            <div>
              <p className="vd-project-index">{project.index}</p>
              <h2 className="vd-project-title">{project.name}</h2>
              <p className="vd-project-meta">{project.meta}</p>
              <div className="vd-project-tags">
                {project.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="vd-project-frame">
              <ProjectMock variant={index} />
            </div>
          </article>
        ))}
      </section>

      <section ref={processRef} className="vd-process">
        <p className="vd-process-label">{t("processLabel")}</p>
        <div className="vd-process-line">
          <div className="vd-process-fill" />
        </div>
        <div className="vd-process-row">
          {process.map((word, index) => (
            <div key={word} className="vd-step">
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{word}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="vd-cta" className="vd-cta">
        <h2 className="vd-cta-title">{t("ctaTitle")}</h2>
        <div className="vd-cta-row">
          <p className="vd-cta-lead">{t("ctaLead")}</p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              className="vd-btn"
              href="https://wa.me/994709646466"
              target="_blank"
              rel="noreferrer"
            >
              {t("ctaPrimary")}
            </a>
            <a className="vd-btn vd-btn-ghost" href="mailto:admin@vexirahost.com">
              {t("ctaSecondary")}
            </a>
          </div>
        </div>
        <div className="vd-footer-mini">
          <span>VexiraDesign — Vexira Labs LLC</span>
          <span>{t("footerNote")}</span>
        </div>
      </section>
    </div>
  );
}
