(() => {
  // Change this password anytime. Client-side only (not bank-level security).
  const GATE_PASSWORD = "ejayjay";
  const GATE_SESSION_KEY = "ejayjay-link-unlocked";

  const detail = document.getElementById("project-detail");
  const detailTitle = document.getElementById("detail-title");
  const detailStatus = document.getElementById("detail-status");
  const detailYear = document.getElementById("detail-year");
  const detailTagline = document.getElementById("detail-tagline");
  const detailTags = document.getElementById("detail-tags");
  const detailAbout = document.getElementById("detail-about");
  const detailActions = document.getElementById("detail-actions");
  const publicDir = document.querySelector('[data-directory="public"]');
  const personalDir = document.querySelector('[data-directory="personal"]');
  const filters = document.querySelectorAll(".filter");
  const gate = document.getElementById("link-gate");
  const gateForm = document.getElementById("link-gate-form");
  const gateInput = document.getElementById("gate-password");
  const gateError = document.getElementById("gate-error");

  let byId = {};
  let lastFocus = null;
  let pendingUrl = null;

  const isUnlocked = () => sessionStorage.getItem(GATE_SESSION_KEY) === "1";

  const markUnlocked = () => {
    sessionStorage.setItem(GATE_SESSION_KEY, "1");
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const openUrl = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const closeGate = () => {
    if (!gate || gate.hidden) return;
    gate.hidden = true;
    document.body.classList.remove("is-gate-open");
    pendingUrl = null;
    if (gateError) gateError.hidden = true;
    if (gateForm) gateForm.reset();
  };

  const openGate = (url, trigger) => {
    if (!gate) {
      openUrl(url);
      return;
    }
    pendingUrl = url;
    lastFocus = trigger || document.activeElement;
    gate.hidden = false;
    document.body.classList.add("is-gate-open");
    if (gateError) gateError.hidden = true;
    if (gateInput) {
      gateInput.value = "";
      gateInput.focus();
    }
  };

  const requirePasswordThenOpen = (url, trigger) => {
    if (!url) return;
    if (isUnlocked()) {
      openUrl(url);
      return;
    }
    openGate(url, trigger);
  };

  const cardHtml = (p, i) => {
    const title = p.url
      ? `<a class="entry__title-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer" data-title-link data-gated-link="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a>`
      : `<span class="entry__title-text">${escapeHtml(p.name)}</span>`;

    return `
      <li
        class="entry"
        data-status="${escapeHtml(p.status)}"
        data-visibility="${escapeHtml(p.visibility)}"
        data-project-id="${escapeHtml(p.id)}"
        style="--i: ${i}"
      >
        <div
          class="entry__card"
          role="button"
          tabindex="0"
          aria-haspopup="dialog"
          aria-controls="project-detail"
          data-open-detail
        >
          <div class="entry__meta">
            <span class="entry__status" data-status="${escapeHtml(p.status)}">${escapeHtml(p.status)}</span>
            <span class="entry__year">${escapeHtml(p.year || "")}</span>
          </div>
          <h3 class="entry__name">${title}</h3>
          <p class="entry__tagline">${escapeHtml(p.tagline || "")}</p>
          <span class="entry__go" aria-hidden="true">Details</span>
        </div>
      </li>
    `;
  };

  const observeEntries = () => {
    const entries = document.querySelectorAll(".entry[data-status]");
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
      entries.forEach((el) => el.classList.add("is-visible"));
    }
  };

  const renderProjects = (projects) => {
    byId = Object.fromEntries(projects.map((p) => [p.id, p]));
    const publicProjects = projects.filter((p) => p.visibility === "public");
    const personalProjects = projects.filter((p) => p.visibility === "personal");

    if (publicDir) {
      publicDir.innerHTML = publicProjects.length
        ? publicProjects.map((p, i) => cardHtml(p, i)).join("")
        : `<li class="entry entry--empty">No public projects yet — add them in <code>data/projects.json</code>.</li>`;
    }

    if (personalDir) {
      personalDir.innerHTML = personalProjects.length
        ? personalProjects.map((p, i) => cardHtml(p, i)).join("")
        : `<li class="entry entry--empty">Personal shelf is empty.</li>`;
    }

    observeEntries();
  };

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
    detailAbout.textContent =
      project.about || project.tagline || 'Add more info in data/projects.json under "about".';

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
      visit.setAttribute("data-gated-link", project.url);
      detailActions.appendChild(visit);
    }

    detail.hidden = false;
    document.body.classList.add("is-detail-open");
    const closeBtn = detail.querySelector(".detail__close");
    if (closeBtn) closeBtn.focus();
  };

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

  if (gateForm) {
    gateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = gateInput ? gateInput.value : "";
      if (value === GATE_PASSWORD) {
        markUnlocked();
        const url = pendingUrl;
        closeGate();
        if (url) openUrl(url);
        return;
      }
      if (gateError) gateError.hidden = false;
      if (gateInput) {
        gateInput.select();
        gateInput.focus();
      }
    });
  }

  document.addEventListener("click", (event) => {
    const gated = event.target.closest("[data-gated-link]");
    if (gated) {
      event.preventDefault();
      event.stopPropagation();
      const url = gated.getAttribute("data-gated-link") || gated.getAttribute("href");
      requirePasswordThenOpen(url, gated);
      return;
    }

    const closerGate = event.target.closest("[data-close-gate]");
    if (closerGate) {
      closeGate();
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
      if (gate && !gate.hidden) {
        closeGate();
        return;
      }
      closeDetail();
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("#link-gate-form")) return;
    const opener = event.target.closest("[data-open-detail]");
    if (!opener) return;
    if (event.target.closest("[data-gated-link]")) return;
    event.preventDefault();
    const card = opener.closest(".entry");
    if (card && card.dataset.projectId) {
      openDetail(card.dataset.projectId, opener);
    }
  });

  fetch("/data/projects.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    })
    .then(renderProjects)
    .catch(() => {
      if (publicDir) {
        publicDir.innerHTML =
          '<li class="entry entry--empty">Could not load projects. Check <code>data/projects.json</code>.</li>';
      }
    });
})();
