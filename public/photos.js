document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.querySelector(".gallery");
  if (!gallery) return;

  // ====== CONFIG from data-* attributes ======
  const start = parseInt(gallery.dataset.start || "1", 10);
  const end = parseInt(gallery.dataset.end || "20", 10);
  const base = gallery.dataset.base || "public/img";
  // Patterns: "##" → two-digit number, "*" → number without padding
  const pattern = gallery.dataset.pattern || "##-large";
  const thumbPattern = gallery.dataset.thumbpattern || "##-large-thumb";

  // ====== DOM ELEMENTS ======
  const thumbsWrap = gallery.querySelector(".thumbs");
  const mainImg = gallery.querySelector("#main-image");
  const mainLink = gallery.querySelector(".gallery-main .main-link");
  const prevBtn = gallery.querySelector(".gallery-main .btn-prev");
  const nextBtn = gallery.querySelector(".gallery-main .btn-next");
  const counterEl = document.getElementById("gallery-counter");

  // ====== HELPERS ======
  const pad = (n) => String(n).padStart(2, "0"); // change to 3 if filenames like 001
  const nameFrom = (tpl, n) =>
    tpl.includes("##") ? tpl.replace("##", pad(n)) : tpl.replace("*", String(n));

  const buildUrl = (n, tpl) => `${base}/${nameFrom(tpl, n)}.jpg`;

  function preload(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(src);
      img.src = src;
    });
  }

  // Collect the list of existing images (skip those not found)
  async function collectExisting() {
    const items = [];
    for (let i = start; i <= end; i++) {
      const large = buildUrl(i, pattern);
      const thumb = buildUrl(i, thumbPattern);
      try {
        await preload(thumb); // check if thumbnail exists first
        items.push({ index: i, large, thumb, title: `Kuva ${i}` });
      } catch {
        // thumbnail not found – try large version instead
        try {
          await preload(large);
          items.push({ index: i, large, thumb: large, title: `Kuva ${i}` });
        } catch {
          // skip if neither image exists
        }
      }
    }
    return items;
  }

  // Render the thumbnail buttons dynamically
  function renderThumbs(items) {
    thumbsWrap.innerHTML = "";
    items.forEach((it, pos) => {
      const btn = document.createElement("button");
      btn.className = "thumb" + (pos === 0 ? " is-active" : "");
      btn.setAttribute("role", "listitem");
      btn.setAttribute("aria-label", it.title);
      btn.dataset.large = it.large;
      btn.dataset.title = it.title;
      btn.dataset.lightbox = it.large;

      const img = document.createElement("img");
      img.src = it.thumb;
      img.alt = `Pikkukuva ${it.index}`;

      btn.appendChild(img);
      thumbsWrap.appendChild(btn);
    });
  }

  // Set up gallery behavior (clicks, navigation, keyboard, lightbox)
  function setupBehavior() {
    const thumbs = Array.from(thumbsWrap.querySelectorAll(".thumb"));
    if (!thumbs.length) return;

    let current = 0;

    function updateCounter() {
      if (!counterEl) return;
      counterEl.textContent = `Kuva ${current + 1} / ${thumbs.length}`;
    }

    function setActive(i, scrollIntoView = false) {
      current = (i + thumbs.length) % thumbs.length;
      thumbs.forEach((t) => t.classList.remove("is-active"));
      const active = thumbs[current];
      active.classList.add("is-active");

      const large = active.dataset.large;
      const title = active.dataset.title || `Kuva ${current + 1}`;
      const href = active.dataset.lightbox || large;

      mainImg.src = large;
      mainImg.alt = title;
      mainLink.href = href;
      mainLink.setAttribute("data-title", title);

      if (scrollIntoView) {
        active.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
      }

      updateCounter();
    }

    function go(delta) {
      setActive(current + delta, true);
    }

    // Thumbnail click
    thumbs.forEach((btn, i) => {
      btn.addEventListener("click", () => setActive(i, false));
    });

    // Navigation arrows
    prevBtn?.addEventListener("click", () => go(-1));
    nextBtn?.addEventListener("click", () => go(1));

    // Keyboard arrows
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    });

    // Initial setup
    setActive(0);

    // Lightbox: dynamically replace list of items
    const lightbox = GLightbox({
      selector: ".main-link",
      openEffect: "zoom",
      closeEffect: "zoom",
    });

    lightbox.on("open", () => {
      const items = thumbs.map((t) => ({
        href: t.dataset.lightbox || t.dataset.large,
        type: "image",
        title: t.dataset.title || "",
      }));
      lightbox.setElements(items);
      lightbox.openAt(current);
    });
  }

  // ====== RUN ======
  (async () => {
    const items = await collectExisting();
    if (!items.length) return;
    renderThumbs(items);
    // Set initial large image immediately
    const first = items[0];
    mainImg.src = first.large;
    mainImg.alt = first.title;
    mainLink.href = first.large;
    setupBehavior();
  })();
});
