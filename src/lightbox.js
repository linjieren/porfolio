export function initLightbox() {
  const dialog = document.querySelector("#lightbox");
  if (!dialog) return;

  const image = dialog.querySelector("img");
  const caption = dialog.querySelector("#lightbox-caption");
  const prev = dialog.querySelector("[data-prev]");
  const next = dialog.querySelector("[data-next]");
  const closeButton = dialog.querySelector("[data-close]");
  const triggers = [...document.querySelectorAll("[data-lightbox]")];
  let group = [];
  let index = 0;
  let lastTrigger = null;

  const render = () => {
    const trigger = group[index];
    if (!trigger || !image || !caption) return;
    const source = trigger.querySelector("img");
    image.src = trigger.dataset.full || source?.currentSrc || source?.src || "";
    image.alt = source?.alt || "";
    caption.textContent = trigger.dataset.caption || source?.alt || "";
    const single = group.length < 2;
    prev.hidden = single;
    next.hidden = single;
  };

  const open = (trigger) => {
    const name = trigger.dataset.group || trigger.dataset.lightbox;
    group = triggers.filter((item) => (item.dataset.group || item.dataset.lightbox) === name);
    index = Math.max(0, group.indexOf(trigger));
    lastTrigger = trigger;
    render();
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  };

  const move = (step) => {
    if (group.length < 2) return;
    index = (index + step + group.length) % group.length;
    render();
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => open(trigger));
  });

  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  closeButton.addEventListener("click", () => dialog.close());

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
  });

  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    lastTrigger?.focus();
  });
}
