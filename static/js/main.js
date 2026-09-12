(() => {
  // Change this password anytime. Client-side only (not bank-level security).
  const GATE_PASSWORD = "ejayjay";
  const GATE_STORAGE_KEY = "ejayjay-link-unlocked";
  const STATUS_STORAGE_KEY = "ejayjay-site-status";

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

  const isUnlocked = () => {
    if (localStorage.getItem(GATE_STORAGE_KEY) === "1") return true;
    // Migrate older session-only unlocks
    if (sessionStorage.getItem(GATE_STORAGE_KEY) === "1") {
      localStorage.setItem(GATE_STORAGE_KEY, "1");
      sessionStorage.removeItem(GATE_STORAGE_KEY);
      return true;
    }
    return false;
  };

  const markUnlocked = () => {
    localStorage.setItem(GATE_STORAGE_KEY, "1");
    sessionStorage.removeItem(GATE_STORAGE_KEY);
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

  // ============ Dashboard Status Checking ============

  const dashboardGrid = document.getElementById("dashboard-grid");
  const refreshAllBtn = document.getElementById("refresh-status");
  const siteStatuses = new Map();

  const loadSavedStatuses = () => {
    try {
      const saved = localStorage.getItem(STATUS_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        Object.entries(data).forEach(([id, info]) => {
          siteStatuses.set(id, info);
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  const saveStatuses = () => {
    try {
      const data = {};
      siteStatuses.forEach((info, id) => {
        data[id] = info;
      });
      localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore storage errors
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Never checked";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const checkSiteStatus = async (url, projectId) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return "up";
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === "AbortError") {
        return "down";
      }
      return "down";
    }
  };

  const updateCardStatus = (projectId, status, lastCheck) => {
    const card = document.querySelector(`.status-card[data-project-id="${projectId}"]`);
    if (!card) return;

    card.setAttribute("data-status", status);
    
    const indicator = card.querySelector(".status-card__indicator");
    if (indicator) {
      indicator.setAttribute("data-status", status);
      const dot = indicator.querySelector(".status-dot");
      if (dot) {
        dot.className = `status-dot status-dot--${status}`;
      }
      const label = indicator.querySelector("span:last-child");
      if (label) {
        label.textContent = status === "up" ? "UP" : status === "down" ? "DOWN" : status === "checking" ? "..." : "?";
      }
    }

    const lastCheckEl = card.querySelector(".status-card__last-check");
    if (lastCheckEl && lastCheck) {
      lastCheckEl.textContent = `Checked ${formatTimeAgo(lastCheck)}`;
    }

    const refreshBtn = card.querySelector(".status-card__btn--refresh");
    if (refreshBtn && status !== "checking") {
      refreshBtn.classList.remove("is-spinning");
    }
  };

  const checkProjectStatus = async (project) => {
    if (!project.url) return;

    updateCardStatus(project.id, "checking", null);

    const status = await checkSiteStatus(project.url, project.id);
    const lastCheck = Date.now();

    siteStatuses.set(project.id, { status, lastCheck, url: project.url });
    saveStatuses();
    updateCardStatus(project.id, status, lastCheck);
  };

  const statusCardHtml = (project, index) => {
    const saved = siteStatuses.get(project.id);
    const status = saved?.status || "unknown";
    const lastCheck = saved?.lastCheck;
    const statusLabel = status === "up" ? "UP" : status === "down" ? "DOWN" : "?";

    return `
      <article class="status-card" data-project-id="${escapeHtml(project.id)}" data-status="${status}" style="--card-index: ${index}">
        <div class="status-card__header">
          <h3 class="status-card__name">
            <a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.name)}</a>
          </h3>
          <div class="status-card__indicator" data-status="${status}">
            <span class="status-dot status-dot--${status}"></span>
            <span>${statusLabel}</span>
          </div>
        </div>
        <p class="status-card__tagline">${escapeHtml(project.tagline || "")}</p>
        <div class="status-card__footer">
          <div class="status-card__meta">
            <span class="status-card__last-check">${lastCheck ? `Checked ${formatTimeAgo(lastCheck)}` : "Not checked yet"}</span>
          </div>
          <div class="status-card__actions">
            <a class="status-card__btn status-card__btn--visit" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">Visit</a>
            <button type="button" class="status-card__btn status-card__btn--refresh" data-refresh-project="${escapeHtml(project.id)}" aria-label="Refresh status">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.83 1.04 6.5 2.72"/>
                <path d="M21 3v6h-6"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  };

  const renderDashboard = (projects) => {
    if (!dashboardGrid) return;

    loadSavedStatuses();

    const dashboardProjects = projects.filter(
      (p) => p.visibility === "public" && p.url && p.status === "live"
    );

    if (dashboardProjects.length === 0) {
      dashboardGrid.innerHTML = '<div class="dashboard__empty">No live public projects with URLs to monitor.</div>';
      return;
    }

    dashboardGrid.innerHTML = dashboardProjects
      .map((p, i) => statusCardHtml(p, i))
      .join("");

    dashboardProjects.forEach((p, i) => {
      setTimeout(() => checkProjectStatus(p), i * 200);
    });
  };

  const refreshAllStatuses = (projects) => {
    if (!dashboardGrid) return;

    const dashboardProjects = projects.filter(
      (p) => p.visibility === "public" && p.url && p.status === "live"
    );

    refreshAllBtn?.classList.add("is-spinning");

    dashboardProjects.forEach((project, i) => {
      const refreshBtn = document.querySelector(
        `.status-card__btn--refresh[data-refresh-project="${project.id}"]`
      );
      if (refreshBtn) refreshBtn.classList.add("is-spinning");

      setTimeout(() => {
        checkProjectStatus(project);
        if (i === dashboardProjects.length - 1) {
          setTimeout(() => {
            refreshAllBtn?.classList.remove("is-spinning");
          }, 1000);
        }
      }, i * 200);
    });
  };

  document.addEventListener("click", (event) => {
    const refreshSingle = event.target.closest("[data-refresh-project]");
    if (refreshSingle) {
      const projectId = refreshSingle.getAttribute("data-refresh-project");
      const project = byId[projectId];
      if (project) {
        refreshSingle.classList.add("is-spinning");
        checkProjectStatus(project);
      }
      return;
    }
  });

  // ============ End Dashboard ============

  fetch("/data/projects.json", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    })
    .then((projects) => {
      renderProjects(projects);
      renderDashboard(projects);

      if (refreshAllBtn) {
        refreshAllBtn.addEventListener("click", () => refreshAllStatuses(projects));
      }
    })
    .catch(() => {
      if (publicDir) {
        publicDir.innerHTML =
          '<li class="entry entry--empty">Could not load projects. Check <code>data/projects.json</code>.</li>';
      }
      if (dashboardGrid) {
        dashboardGrid.innerHTML =
          '<div class="dashboard__empty">Could not load projects.</div>';
      }
    });
})();
