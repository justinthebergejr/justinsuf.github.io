const gallery = document.getElementById("gallery");
const filters = document.getElementById("filters");
const sections = document.getElementById("sections");
const groupMenu = document.getElementById("groupMenu");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("previewImg");

let photos = [];
let projects = [];
let deviceGroups = [];
let categories = [];
let section = "media";
let filter = "all";
let shown = [];
let current = 0;

function loadJSON(url) {
    return fetch(url, { cache: "no-cache" })
        .then(r => {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        })
        .catch(err => {
            console.error(url, err);
            return [];
        });
}

Promise.all([loadJSON("photos/media/photos.json"), loadJSON("projects.json"), loadJSON("photos/devices/devices.json")])
    .then(([photoList, projectList, deviceList]) => {
        photoList.forEach(group => {
            if (!group || !Array.isArray(group.files)) return;
            const category = group.category || "";
            if (category && !categories.includes(category)) categories.push(category);
            group.files.forEach(entry => {
                const p = normalize(entry, category);
                if (p.src) photos.push(p);
            });
        });
        shuffle(photos);
        projects = projectList.map(normalizeProject).filter(p => p.url);
        deviceGroups = deviceList.filter(group => group.category && Array.isArray(group.items));
        readRoute();
        renderSections();
        renderFilters();
        measureHeader();
        render();
    });

function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
}

function normalize(entry, category) {
    const item = typeof entry === "string" ? { file: entry } : entry || {};
    const file = item.file || item.src || "";
    const folder = category ? `${category}/` : "";
    return {
        src: file && !/^https?:|^\//.test(file) ? encodeURI(`photos/media/${folder}${file}`) : file,
        alt: item.alt || item.caption || "",
        category
    };
}

function normalizeProject(entry) {
    const item = entry || {};
    const url = item.url || (item.repo ? `https://github.com/${item.repo}` : "");
    return {
        url,
        name: item.name || (item.repo || url).split("/").pop(),
        description: item.description || "",
        language: item.language || ""
    };
}

function readRoute() {
    const [page, category = "all"] = location.hash.slice(1).split("/");
    section = ["projects", "devices"].includes(page) ? page : page === "consoles" ? "devices" : "media";
    const names = section === "devices" ? ["all", ...deviceGroups.map(group => group.category)] : ["all", ...categories];
    let requested = page === "consoles" ? "consoles" : category;
    try { requested = decodeURIComponent(requested); } catch {}
    filter = names.includes(requested) ? requested : "all";
}

function renderSections() {
    document.getElementById("groupName").textContent = section;
    sections.setAttribute("aria-label", `portfolio group: ${section}`);
    document.getElementById("groupIcon").innerHTML = navigationIcon(section);
    groupMenu.querySelectorAll("[data-group]").forEach(option => {
        option.setAttribute("aria-selected", option.dataset.group === section);
        option.innerHTML = `${navigationIcon(option.dataset.group)}<span>${option.dataset.group}</span>`;
    });
    closeGroupMenu();
}

function navigationIcon(name) {
    const paths = {
        media: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
        projects: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"/>',
        devices: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="m4 16-2 5h20l-2-5M9 18h6"/>',
        all: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        drawings: '<path d="m16 3 5 5L8 21H3v-5ZM13 6l5 5M3 16l5 5"/>',
        graphics: '<path d="m7 3 5 8H2Z"/><rect x="3" y="15" width="7" height="7" rx="1"/><circle cx="17" cy="16" r="5"/>',
        "edited photography": '<path d="M4 3v7m0 4v7M12 3v11m0 4v3M20 3v2m0 4v12M1 10h6m2 4h6m2-9h6"/>',
        "plain photography": '<path d="M8 5 6 8H3a1 1 0 0 0-1 1v11h20V9a1 1 0 0 0-1-1h-3l-2-3Z"/><circle cx="12" cy="14" r="4"/>',
        consoles: '<path d="M7 7h10c3 0 4 3 5 10 .3 3-2 4-4 2l-3-3H9l-3 3c-2 2-4.3 1-4-2 1-7 2-10 5-10ZM7 10v5m-2.5-2.5h5"/><circle cx="16" cy="11" r=".7"/><circle cx="19" cy="14" r=".7"/>',
        phones: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
        tablets: '<rect x="3" y="2" width="18" height="20" rx="3"/><path d="M11 19h2"/>',
        computers: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v5m-5 0h10"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.all}</svg>`;
}

const navTooltip = document.getElementById("navTooltip");
let tooltipButton = null;

function hideNavTooltip() {
    tooltipButton?.removeAttribute("aria-describedby");
    tooltipButton = null;
    navTooltip.hidden = true;
}

function showNavTooltip(btn) {
    hideNavTooltip();
    tooltipButton = btn;
    navTooltip.textContent = btn.getAttribute("aria-label");
    navTooltip.hidden = false;
    btn.setAttribute("aria-describedby", "navTooltip");
    const rect = btn.getBoundingClientRect();
    const width = navTooltip.offsetWidth;
    const height = navTooltip.offsetHeight;
    navTooltip.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, rect.left + (rect.width - width) / 2))}px`;
    navTooltip.style.top = `${rect.top > height + 12 ? rect.top - height - 8 : rect.bottom + 8}px`;
}

document.addEventListener("pointerover", e => {
    const btn = e.target.closest(".icon-filter");
    if (btn && !btn.contains(e.relatedTarget)) showNavTooltip(btn);
});
document.addEventListener("pointerout", e => {
    if (tooltipButton?.contains(e.target) && !tooltipButton.contains(e.relatedTarget) && document.activeElement !== tooltipButton) hideNavTooltip();
});
document.addEventListener("focusin", e => {
    if (e.target.matches(".icon-filter")) showNavTooltip(e.target);
});
document.addEventListener("focusout", e => {
    if (e.target === tooltipButton) hideNavTooltip();
});
document.addEventListener("keydown", e => {
    if (e.key === "Escape") hideNavTooltip();
});
window.addEventListener("scroll", hideNavTooltip, true);
window.addEventListener("resize", hideNavTooltip);

function closeGroupMenu(restoreFocus = false) {
    groupMenu.hidden = true;
    sections.setAttribute("aria-expanded", "false");
    if (restoreFocus) sections.focus();
}

function openGroupMenu() {
    hideNavTooltip();
    groupMenu.hidden = false;
    sections.setAttribute("aria-expanded", "true");
    groupMenu.querySelector('[aria-selected="true"]')?.focus();
}

sections.addEventListener("click", () => {
    if (groupMenu.hidden) openGroupMenu();
    else closeGroupMenu(true);
});
sections.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openGroupMenu();
    }
});
groupMenu.addEventListener("click", e => {
    const option = e.target.closest("[data-group]");
    if (!option) return;
    location.hash = option.dataset.group;
    closeGroupMenu(true);
});
groupMenu.addEventListener("keydown", e => {
    const options = [...groupMenu.querySelectorAll("[data-group]")];
    const index = options.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const next = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1
            : (index + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
        options[next].focus();
    } else if (e.key === "Escape") {
        e.preventDefault();
        closeGroupMenu(true);
    } else if (e.key === "Tab") {
        closeGroupMenu(true);
    }
});
document.addEventListener("pointerdown", e => {
    if (!e.target.closest(".group-picker")) closeGroupMenu();
});
document.addEventListener("focusin", e => {
    if (!e.target.closest(".group-picker")) closeGroupMenu();
});

window.addEventListener("hashchange", () => {
    readRoute();
    renderSections();
    renderFilters();
    render();
    measureHeader();
});

function renderFilters() {
    hideNavTooltip();
    filters.hidden = section === "projects";
    filters.setAttribute("aria-label", section === "devices" ? "device categories" : "media categories");
    const names = section === "projects" ? [] : section === "devices"
        ? ["all", ...deviceGroups.map(group => group.category)]
        : ["all", ...categories];
    filters.innerHTML = names.map(name => `
        <button class="filter icon-filter" type="button" data-filter="${escapeAttr(name)}" aria-label="${escapeAttr(name)}" aria-pressed="${name === filter}">${navigationIcon(name)}</button>
    `).join("");
    filters.querySelectorAll(".filter").forEach(btn => {
        btn.addEventListener("click", () => {
            location.hash = `${section}/${encodeURIComponent(btn.dataset.filter)}`;
        });
    });
}

function render() {
    gallery.classList.toggle("gallery-consoles", section === "devices");
    gallery.setAttribute("aria-label", section === "devices" ? "device collection" : section === "projects" ? "projects" : "photos");
    shown = [];
    if (section === "devices") {
        const groups = filter === "all" ? deviceGroups : deviceGroups.filter(group => group.category === filter);
        gallery.innerHTML = groups.map(group => deviceCollection(group.title, group.category, group.items)).join("");
        return;
    }
    if (section === "projects") {
        gallery.innerHTML = projects.map(projectTile).join("") || '<p class="gallery-status">no projects yet.</p>';
        return;
    }
    shown = filter === "all" ? photos : photos.filter(p => p.category === filter);
    gallery.innerHTML = shown.map(photoTile).join("") || '<p class="gallery-status">nothing here yet.</p>';
    bindPhotos();
}

function deviceCollection(title, folder, items) {
    return `
        <div class="collection-heading">
            <h2>${escapeAttr(title)}</h2>
        </div>
        <div class="console-items">
            ${items.map(item => `
                <div class="console-space" tabindex="0">
                    <img class="console-image" src="${escapeAttr(encodeURI(`photos/devices/${folder}/${item.image}`))}" alt="${escapeAttr(item.name)}" decoding="async" />
                    <span class="device-name" aria-hidden="true">${escapeAttr(item.name)}</span>
                </div>
            `).join("")}
        </div>
    `;
}

function bindPhotos() {
    gallery.querySelectorAll(".photo").forEach(btn => {
        btn.addEventListener("click", () => open(Number(btn.dataset.index)));
    });
}

function photoTile(p, i) {
    return `
        <button class="photo" type="button" data-index="${i}">
            <img src="${escapeAttr(p.src)}" alt="${escapeAttr(p.alt)}" loading="lazy" />
        </button>
    `;
}

function projectTile(p) {
    return `
        <a class="project" href="${escapeAttr(p.url)}" target="_blank" rel="noopener">
            <span class="project-name">${escapeAttr(p.name)}</span>
            ${p.description ? `<span class="project-desc">${escapeAttr(p.description)}</span>` : ""}
            ${p.language ? `<span class="project-lang">${escapeAttr(p.language)}</span>` : ""}
        </a>
    `;
}

function open(i) {
    current = i;
    previewImg.src = shown[i].src;
    previewImg.alt = shown[i].alt;
    preview.hidden = false;
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
}

function close() {
    preview.hidden = true;
    previewImg.removeAttribute("src");
    document.documentElement.classList.remove("no-scroll");
    document.body.classList.remove("no-scroll");
}

function step(delta) {
    if (!shown.length) return;
    open((current + delta + shown.length) % shown.length);
}

document.getElementById("previewClose")?.addEventListener("click", close);
document.getElementById("previewPrev").addEventListener("click", () => step(-1));
document.getElementById("previewNext").addEventListener("click", () => step(1));
preview.addEventListener("click", e => {
    if (e.target === preview) close();
});

let touchX = 0;
let touchY = 0;
preview.addEventListener("touchstart", e => {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
}, { passive: true });
preview.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
}, { passive: true });

document.addEventListener("keydown", e => {
    if (preview.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
});

const header = document.getElementById("top");
const mobile = window.matchMedia("(max-width: 800px)");
const bio = header.querySelector(".bio");
let collapse = 1;
let lastWidth = 0;

function measureHeader() {
    lastWidth = window.innerWidth;
    if (!mobile.matches) {
        header.style.removeProperty("--p");
        return;
    }
    header.style.setProperty("--bio-h", `${bio.firstElementChild.offsetHeight}px`);
    header.style.setProperty("--listening-h", `${document.getElementById("lastfm").offsetHeight}px`);
    header.style.setProperty("--p", 0);
    const full = header.offsetHeight;
    header.style.setProperty("--p", 1);
    collapse = Math.max(1, full - header.offsetHeight);
    document.documentElement.style.setProperty("--header-h", `${full}px`);
    updateHeader();
}

function updateHeader() {
    if (!mobile.matches) return;
    const p = Math.min(1, Math.max(0, window.scrollY / collapse));
    header.style.setProperty("--p", p.toFixed(4));
}

window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("resize", () => {
    if (window.innerWidth !== lastWidth) measureHeader();
});
mobile.addEventListener("change", measureHeader);
window.addEventListener("load", measureHeader);
document.fonts?.ready.then(measureHeader);
measureHeader();

const lastfm = document.getElementById("lastfm");
const lastfmArt = document.getElementById("lastfmArt");
let lastfmLoading = false;

lastfmArt.addEventListener("error", () => {
    lastfmArt.hidden = true;
    measureHeader();
});

function lastfmURL(value, fallback, allowedHost) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && (!allowedHost || allowedHost.includes(url.hostname)) ? url.href : fallback;
    } catch {
        return fallback;
    }
}

async function updateLastFM() {
    if (document.hidden || lastfmLoading) return;
    lastfmLoading = true;
    try {
        const response = await fetch("https://lastfm-last-played.biancarosa.com.br/JustinSUF/latest-song", {
            cache: "no-cache",
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error(`Last.fm: ${response.status}`);
        const { track } = await response.json();
        if (!track || typeof track.name !== "string" || !track.name) throw new Error("No recent track");
        const artist = typeof track.artist === "string" ? track.artist : track.artist?.["#text"] || "";
        const playing = track["@attr"]?.nowplaying === "true";
        const status = playing ? "listening now" : "last played";
        document.getElementById("lastfmStatus").textContent = status;
        document.getElementById("lastfmTrack").textContent = track.name;
        document.getElementById("lastfmArtist").textContent = artist;
        lastfm.dataset.playing = String(playing);
        lastfm.setAttribute("aria-label", `${status}: ${track.name} by ${artist} on Last.fm`);
        lastfm.href = lastfmURL(track.url, "https://www.last.fm/user/JustinSUF", ["www.last.fm", "last.fm"]);
        const images = Array.isArray(track.image) ? track.image : [];
        const image = images.find(image => image.size === "large") || images[images.length - 1];
        const artwork = lastfmURL(image?.["#text"], "");
        lastfmArt.hidden = !artwork;
        if (artwork) {
            if (lastfmArt.src !== artwork) lastfmArt.src = artwork;
        } else {
            lastfmArt.removeAttribute("src");
        }
        lastfm.hidden = false;
        document.getElementById("listening").hidden = false;
    } catch {
        // Hide unavailable or stale playback rather than claiming a track is still live.
        lastfm.hidden = true;
        document.getElementById("listening").hidden = true;
    } finally {
        lastfmLoading = false;
        measureHeader();
    }
}

updateLastFM();
window.setInterval(updateLastFM, 30000);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateLastFM();
});

function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
