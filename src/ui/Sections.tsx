import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { pillars, profile, projects, skills } from "../data";
import { prefersReducedMotion } from "../lib/scroll";

gsap.registerPlugin(ScrollTrigger);

/** Splits a line into per-character spans so the hero can type itself in. */
function Chars({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="ch" aria-hidden="true">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

export default function Sections({ ready }: { ready: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  // hero entrance once the loader has opened
  useEffect(() => {
    if (!ready || !root.current) return;
    const q = gsap.utils.selector(root.current);
    if (prefersReducedMotion) {
      gsap.set(q(".hero .ch, .hero .fade"), { opacity: 1, y: 0 });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.fromTo(q(".hero .ch"), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.028 }, 0.1)
      .fromTo(q(".hero .fade"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.12 }, 0.7);
    return () => {
      tl.kill();
    };
  }, [ready]);

  // scroll reveals for everything after the hero
  useEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        return;
      }
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 82%", toggleActions: "play none none reverse" },
          },
        );
      });
      // progress line
      gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { scrub: 0.3 } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="content">
      <div className="progress" aria-hidden="true" />

      <header className="nav">
        <a href="#top" className="wordmark" aria-label="Home">
          {profile.short}
        </a>
        <nav className="nav-links">
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="panel hero" id="top">
        <h1 className="display">
          <Chars text="Aman" className="line" />
          <Chars text="Najeeb" className="line" />
        </h1>
        <p className="tagline fade">{profile.tagline}</p>
        <p className="lede fade">{profile.bio}</p>
        <div className="cue fade" aria-hidden="true">
          <span className="cue-line" />
          <span>scroll to enter</span>
        </div>
      </section>

      <section className="panel" id="about">
        <p className="kicker" data-reveal>What I do</p>
        <div className="pillars">
          {pillars.map((p) => (
            <div className="pillar" key={p.title} data-reveal>
              <h2>{p.title}</h2>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel tall" id="work">
        <p className="kicker" data-reveal>Selected work</p>
        <ol className="projects">
          {projects.map((p) => (
            <li className="project" key={p.id} data-reveal data-hover>
              <div className="project-meta">
                <span>{p.id}</span>
                <span>{p.year}</span>
              </div>
              <div className="project-body">
                <h2>{p.title}</h2>
                <p className="sub">{p.subtitle}</p>
                <p>{p.description}</p>
                <ul className="tags">
                  {p.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel" id="skills">
        <p className="kicker" data-reveal>Toolkit</p>
        <div className="skills">
          {skills.map((g) => (
            <div className="skill-group" key={g.category} data-reveal>
              <h3>{g.category}</h3>
              <ul>
                {g.items.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="panel contact" id="contact">
        <h2 className="display-sm" data-reveal>
          Let's build something that thinks.
        </h2>
        <p className="lede" data-reveal>
          Based in {profile.location}. Open to hard problems, interesting teams and the occasional coffee.
        </p>
        <div className="links" data-reveal>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={profile.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
        <footer className="foot" data-reveal>
          <span>{profile.name}</span>
          <span>{new Date().getFullYear()}</span>
        </footer>
      </section>
    </div>
  );
}
