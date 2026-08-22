import "./App.css";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import About from "./components/About";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Contact from "./components/Contact";

const marqueeItems = ["Machine Learning", "LLMs", "RAG", "Computer Vision", "MLOps", "Python", "GenAI"];

export default function App() {
  return (
    <div className="grain">
      <Nav />
      <Hero />
      <Marquee items={marqueeItems} />
      <About />
      <Skills />
      <Projects />
      <Contact />
    </div>
  );
}
