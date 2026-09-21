const gallery = document.getElementById("gallery");
const filters = document.getElementById("filters");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("previewImg");

let photos = [];
let projects = [];
let categories = [];
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

Promise.all([loadJSON("photos/photos.json"), loadJSON("projects.json")])
    .then(([photoList, projectList]) => {
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
        src: file && !/^https?:|^\//.test(file) ? encodeURI(`photos/${folder}${file}`) : file,
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

function renderFilters() {
    const names = ["all", ...categories];
    if (projects.length) names.push("projects");
    filters.innerHTML = names.map(name => `
        <button class="filter" type="button" data-filter="${escapeAttr(name)}" aria-pressed="${name === filter}">${escapeAttr(name)}</button>
    `).join("");
    filters.querySelectorAll(".filter").forEach(btn => {
        btn.addEventListener("click", () => {
            filter = btn.dataset.filter;
            filters.querySelectorAll(".filter").forEach(b => b.setAttribute("aria-pressed", b === btn));
            render();
        });
    });
}

function render() {
    if (!photos.length && !projects.length) {
        gallery.innerHTML = '<p class="gallery-status">no photos yet.</p>';
        return;
    }

    shown = filter === "all" ? photos : photos.filter(p => p.category === filter);
    const tiles = shown.map((p, i) => photoTile(p, i));
    if (filter !== "all" && filter !== "projects") {
        gallery.innerHTML = tiles.join("") || '<p class="gallery-status">nothing here yet.</p>';
        bindPhotos();
        return;
    }
    if (filter === "projects") tiles.length = 0;
    projects.forEach(p => {
        const at = Math.floor(Math.random() * (tiles.length + 1));
        tiles.splice(at, 0, projectTile(p));
    });
    gallery.innerHTML = tiles.join("");
    bindPhotos();
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

function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}
