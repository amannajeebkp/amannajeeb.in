import { useCallback, useEffect, useState } from "react";
import Scene from "./scene/Scene";
import Loader from "./ui/Loader";
import Cursor from "./ui/Cursor";
import Sections from "./ui/Sections";
import { installPointer, installScroll } from "./lib/scroll";

export default function App() {
  const [ready, setReady] = useState(false);
  const onDone = useCallback(() => setReady(true), []);

  useEffect(() => {
    installScroll();
    installPointer();
    // keep the page at the top while the loader plays
    if (!ready) window.scrollTo(0, 0);
    document.documentElement.classList.toggle("locked", !ready);
  }, [ready]);

  return (
    <>
      <Scene />
      <Sections ready={ready} />
      <Cursor />
      {!ready && <Loader onDone={onDone} />}
    </>
  );
}
