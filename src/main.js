import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/600.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/newsreader/500-italic.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "./styles.css";

import { initNav } from "./nav.js";
import { initReveal } from "./reveal.js";
import { initVideos } from "./videos.js";
import { initConcept } from "./concept.js";
import { initLightbox } from "./lightbox.js";

initNav();
initReveal();
initVideos();
initConcept();
initLightbox();

const progress = document.querySelector(".progress");
if (progress) {
  const update = () => {
    const root = document.documentElement;
    const max = root.scrollHeight - root.clientHeight;
    const value = max > 0 ? root.scrollTop / max : 0;
    progress.style.transform = `scaleX(${value})`;
  };
  update();
  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}
