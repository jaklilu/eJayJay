(() => {
  const entries = document.querySelectorAll(".entry[data-status]");
  const filters = document.querySelectorAll(".filter");
  const detail = document.getElementById("project-detail");
  const projectsData = document.getElementById("projects-data");
  const projects = projectsData ? JSON.parse(projectsData.textContent) : [];
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));

  const detailTitle = document.getElementById("detail-title");
  const detailStatus = document.getElementById("detail-status");
  const detailYear = document.getElementById("detail-year");
  const detailTagline = document.getElementById("detail-tagline");
  const detailTags = document.getElementById("detail-tags");
  const detailAbout = document.getElementById("detail-about");
  const detailActions = document.getElementById("detail-actions");

  let lastFocus = null;

  const reveal = () => {
    entries.forEach((el) => {
      if (!el.classList.contains("is-hidden")) {
        el.classList.add("is-visible");
      }
    });
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (obs) => {
        obs.forEach((item) => {
          if (item.isIntersecting) {
            item.target.classList.add("is-visible");
            io.unobserve(item.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    entries.forEach((el) => io.observe(el));
  } else {
    reveal();
  }

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.filter;
      filters.forEach((b) => b.classList.toggle("is-active", b === btn));

      document.querySelectorAll('[data-directory="public"] .entry[data-status]').forEach((el) => {
        const match = value === "all" || el.dataset.status === value;
        el.classList.toggle("is-hidden", !match);
        if (match) el.classList.add("is-visible");
      });
    });
  });

  const closeDetail = () => {
    if (!detail || detail.hidden) return;
    detail.hidden = true;
    document.body.classList.remove("is-detail-open");
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  };

  const openDetail = (id, trigger) => {
    const project = byId[id];
    if (!project || !detail) return;

    lastFocus = trigger || document.activeElement;
    detailTitle.textContent = project.name;
    detailStatus.textContent = project.status;
    detailStatus.dataset.status = project.status;
    detailYear.textContent = project.year || "";
    detailTagline.textContent = project.tagline || "";
    detailAbout.textContent = project.about || project.tagline || "Add more info in data/projects.json under “about”.";

    detailTags.innerHTML = "";
    (project.tags || []).forEach((tag) => {
      const span = document.createElement("span");
      span.className = "detail__tag";
      span.textContent = tag;
      detailTags.appendChild(span);
    });

    detailActions.innerHTML = "";
    if (project.url) {
      const visit = document.createElement("a");
      visit.className = "btn btn--primary";
      visit.href = project.url;
      visit.target = "_blank";
      visit.rel = "noopener noreferrer";
      visit.textContent = "Visit site";
      detailActions.appendChild(visit);
    }

    detail.hidden = false;
    document.body.classList.add("is-detail-open");
    const closeBtn = detail.querySelector(".detail__close");
    if (closeBtn) closeBtn.focus();
  };

  document.addEventListener("click", (event) => {
    const titleLink = event.target.closest("[data-title-link]");
    if (titleLink) {
      event.stopPropagation();
      return;
    }

    const closer = event.target.closest("[data-close-detail]");
    if (closer) {
      closeDetail();
      return;
    }

    const opener = event.target.closest("[data-open-detail]");
    if (opener) {
      const card = opener.closest(".entry");
      if (card && card.dataset.projectId) {
        openDetail(card.dataset.projectId, opener);
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDetail();
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;
    const opener = event.target.closest("[data-open-detail]");
    if (!opener) return;
    if (event.target.closest("[data-title-link]")) return;
    event.preventDefault();
    const card = opener.closest(".entry");
    if (card && card.dataset.projectId) {
      openDetail(card.dataset.projectId, opener);
    }
  });
})();
