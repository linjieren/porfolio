export function initVideos() {
  const videos = [...document.querySelectorAll("video[data-src]")];
  if (!videos.length) return;

  const arm = (video) => {
    if (video.dataset.armed === "true") return;
    video.dataset.armed = "true";
    const source = document.createElement("source");
    source.src = video.dataset.src;
    source.type = "video/mp4";
    video.append(source);
    video.load();
  };

  videos.forEach((video) => {
    video.addEventListener("pointerdown", () => arm(video), { once: true });
    video.addEventListener("focus", () => arm(video));
    video.addEventListener("play", () => arm(video));
  });

  if (!("IntersectionObserver" in window)) {
    videos.forEach(arm);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        arm(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "180px 0px" },
  );

  videos.forEach((video) => observer.observe(video));
}
