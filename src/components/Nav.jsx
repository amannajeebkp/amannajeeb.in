import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    ["Work", "#work"],
    ["About", "#about"],
    ["Skills", "#skills"],
    ["Contact", "#contact"],
  ];

  return (
    <nav className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <a href="#top" className="nav__logo display">
        AN<span className="nav__logo-dot">.</span>
      </a>
      <div className={`nav__links ${open ? "is-open" : ""}`}>
        {links.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)} className="nav__link">
            {label}
          </a>
        ))}
        <a href="#contact" className="nav__cta" onClick={() => setOpen(false)}>
          Let&apos;s talk
        </a>
      </div>
      <button
        className={`nav__burger ${open ? "is-open" : ""}`}
        aria-label="Menu"
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
      </button>
    </nav>
  );
}
