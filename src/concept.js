export function initConcept() {
  const root = document.querySelector("[data-concept]");
  if (!root) return;

  const links = [...root.querySelectorAll("[data-panel]")];
  const panels = [...root.querySelectorAll(".panel")];
  const status = root.querySelector("[data-concept-status]");
  if (!links.length || !panels.length) return;

  const show = (id, announce) => {
    panels.forEach((panel) => {
      const active = panel.id === id;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    links.forEach((link) => {
      const active = link.dataset.panel === id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    if (announce && status) {
      const label = links.find((link) => link.dataset.panel === id)?.dataset.label || "Section";
      status.textContent = `${label}. Illustrative sample only. Nothing was crawled, exported, or sent.`;
    }
  };

  root.classList.add("is-ready");
  show("panel-context", false);

  root.addEventListener("click", (event) => {
    const link = event.target.closest("[data-panel]");
    if (!link || !root.contains(link)) return;
    event.preventDefault();
    show(link.dataset.panel, true);
  });
}
