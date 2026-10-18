/**
 * hinataw.exe Client Application
 * Connected to Render Backend Services: https://hinataw-cloudflare.onrender.com
 */

const API_BASE = "https://hinataw-cloudflare.onrender.com"; // trigger redeploy

// State
let currentTab = "home";
let currentFilter = "all";
let spotlightItem = null;
let currentModalItem = null;
let currentAudioMode = "sub";
let episodesData = null;
let hlsInstance = null;

// DOM Elements
const brandHome = document.getElementById("brandHome");
const navButtons = document.querySelectorAll(".nav-btn");
const searchInput = document.getElementById("query");
const searchBtn = document.getElementById("searchBtn");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const filterPills = document.querySelectorAll(".filter-pill");
const searchResultsSection = document.getElementById("searchResultsSection");
const searchResultsGrid = document.getElementById("searchResultsGrid");
const searchResultsTitle = document.getElementById("searchResultsTitle");
const closeSearchBtn = document.getElementById("closeSearchBtn");
const mainContent = document.getElementById("mainContent");

// Modal Elements
const mediaModal = document.getElementById("mediaModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalPlayerContainer = document.getElementById("modalPlayerContainer");
const videoPlayer = document.getElementById("videoPlayer");
const streamSources = document.getElementById("streamSources");
const modalPoster = document.getElementById("modalPoster");
const modalBadges = document.getElementById("modalBadges");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalTags = document.getElementById("modalTags");
const modalOverview = document.getElementById("modalOverview");
const episodesContainer = document.getElementById("episodesContainer");
const episodesGrid = document.getElementById("episodesGrid");
const audioButtons = document.querySelectorAll(".audio-btn");
const modalActions = document.getElementById("modalActions");

// Helper: Fetch JSON with timeout and error handling
async function fetchJson(endpoint, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] ${endpoint} failed:`, err.message);
    return null;
  }
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  loadAllContent();
});

function initEventListeners() {
  // Brand click -> reset to home
  brandHome.addEventListener("click", () => switchTab("home"));

  // Nav buttons
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Search input events
  searchInput.addEventListener("input", () => {
    clearSearchBtn.style.display = searchInput.value.trim() ? "block" : "none";
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") performSearch();
  });

  searchBtn.addEventListener("click", performSearch);

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.style.display = "none";
    closeSearchResults();
  });

  closeSearchBtn.addEventListener("click", closeSearchResults);

  // Filter pills
  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.dataset.type;
      if (searchResultsSection.style.display !== "none") {
        performSearch();
      }
    });
  });

  // Modal close
  modalCloseBtn.addEventListener("click", closeModal);
  mediaModal.addEventListener("click", (e) => {
    if (e.target === mediaModal) closeModal();
  });

  // Sub/Dub toggle
  audioButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      audioButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentAudioMode = btn.dataset.audio;
      renderEpisodes();
    });
  });
}

// -------------------------------------------------------------
// Navigation & Tab Switching
// -------------------------------------------------------------
function switchTab(tab) {
  currentTab = tab;
  navButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  closeSearchResults();

  const sections = {
    spotlight: document.getElementById("spotlightSection"),
    movies: document.getElementById("moviesSection"),
    series: document.getElementById("seriesSection"),
    animeTrending: document.getElementById("animeTrendingSection"),
    animeLatest: document.getElementById("animeLatestSection"),
    animeTopRated: document.getElementById("animeTopRatedSection"),
    manga: document.getElementById("mangaSection")
  };

  if (tab === "home") {
    Object.values(sections).forEach(s => s && (s.style.display = "block"));
  } else if (tab === "movies") {
    Object.values(sections).forEach(s => s && (s.style.display = "none"));
    if (sections.movies) sections.movies.style.display = "block";
  } else if (tab === "series") {
    Object.values(sections).forEach(s => s && (s.style.display = "none"));
    if (sections.series) sections.series.style.display = "block";
  } else if (tab === "anime") {
    Object.values(sections).forEach(s => s && (s.style.display = "none"));
    if (sections.animeTrending) sections.animeTrending.style.display = "block";
    if (sections.animeLatest) sections.animeLatest.style.display = "block";
    if (sections.animeTopRated) sections.animeTopRated.style.display = "block";
  } else if (tab === "manga") {
    Object.values(sections).forEach(s => s && (s.style.display = "none"));
    if (sections.manga) sections.manga.style.display = "block";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -------------------------------------------------------------
// Load All Feed Content from Render Services
// -------------------------------------------------------------
async function loadAllContent() {
  loadAnimeHome();
  loadMovieboxHome();
  loadMangaHome();
}

// 1. Anime Home Data (Render /home)
async function loadAnimeHome() {
  const data = await fetchJson("/home");
  if (!data) return;

  // Setup Featured Spotlight
  if (data.spotlightAnimes && data.spotlightAnimes.length > 0) {
    const spotlight = data.spotlightAnimes[0];
    spotlightItem = spotlight;
    renderSpotlight(spotlight);
  }

  // Populate Trending Anime Row
  if (data.trendingAnimes) {
    renderCards(document.getElementById("animeTrendingRow"), data.trendingAnimes, "anime");
  }

  // Populate Latest Released Episodes
  if (data.latestEpisodeAnimes) {
    renderCards(document.getElementById("animeLatestRow"), data.latestEpisodeAnimes, "anime-ep");
  }

  // Populate Top Rated Anime
  if (data.topRatedAnimes) {
    renderCards(document.getElementById("animeTopRatedRow"), data.topRatedAnimes, "anime");
  }
}

// 2. Moviebox Home Data (Render /api/moviebox/home)
async function loadMovieboxHome() {
  const data = await fetchJson("/api/moviebox/home");
  if (!data) return;

  if (data.movies) {
    renderCards(document.getElementById("moviesRow"), data.movies, "moviebox");
  }

  if (data.series) {
    renderCards(document.getElementById("seriesRow"), data.series, "moviebox");
  }
}

// 3. Manga Home Data (Render /api/manga/home)
async function loadMangaHome() {
  const data = await fetchJson("/api/manga/home");
  if (!data || !data.popular) return;

  renderCards(document.getElementById("mangaRow"), data.popular, "manga");
}

// -------------------------------------------------------------
// Render Spotlight Hero
// -------------------------------------------------------------
function renderSpotlight(item) {
  const title = (item.title && (item.title.english || item.title.romaji || item.title.userPreferred)) || item.titleStr || "Featured";
  const desc = item.description ? item.description.replace(/<[^>]*>?/gm, "") : "Discover this trending title now streaming on Hinataw.";
  const banner = item.bannerImage || (item.coverImage && item.coverImage.extraLarge) || item.poster || "";

  document.getElementById("spotlightTitle").textContent = title;
  document.getElementById("spotlightDesc").textContent = desc;

  if (banner) {
    document.getElementById("spotlightBackdrop").style.backgroundImage = `url('${banner}')`;
  }

  const metaWrap = document.getElementById("spotlightMeta");
  metaWrap.innerHTML = `
    ${item.format ? `<span class="meta-badge">${item.format}</span>` : ""}
    ${item.totalEpisodes ? `<span class="meta-badge">${item.totalEpisodes} Episodes</span>` : ""}
    ${item.dubCount ? `<span class="meta-badge" style="color:#34d399">Dub Available</span>` : ""}
    ${item.duration ? `<span>${item.duration}</span>` : ""}
  `;

  document.getElementById("spotlightPlayBtn").onclick = () => openItemModal(item, "anime");
  document.getElementById("spotlightDetailsBtn").onclick = () => openItemModal(item, "anime");
}

// -------------------------------------------------------------
// Render Media Cards
// -------------------------------------------------------------
function renderCards(container, items, type) {
  if (!container) return;
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="loading-spinner">No titles available right now.</div>';
    return;
  }

  container.innerHTML = "";
  items.forEach(item => {
    const card = createCard(item, type);
    container.appendChild(card);
  });
}

function createCard(item, type) {
  const card = document.createElement("div");
  card.className = "media-card";

  // Normalize title
  let title = "Untitled";
  if (item.title) {
    title = typeof item.title === "object" 
      ? (item.title.english || item.title.romaji || item.title.userPreferred || "Untitled")
      : item.title;
  } else if (item.name) {
    title = item.name;
  }

  // Normalize image
  let image = "https://via.placeholder.com/200x300?text=No+Cover";
  if (item.image) image = item.image;
  else if (item.poster) image = item.poster;
  else if (item.coverImage) {
    image = item.coverImage.extraLarge || item.coverImage.large || item.coverImage.medium || image;
  }

  // Badges & metadata
  const rating = item.rating || (item.averageScore ? `${(item.averageScore / 10).toFixed(1)}` : null);
  const year = item.year || (item.releaseDate ? item.releaseDate.split("-")[0] : null);
  const format = item.format || item.type || (type === "manga" ? "MANGA" : null);
  const epText = item.latestEpisode ? `EP ${item.latestEpisode}` : (item.episodes ? `${item.episodes} EP` : null);

  card.innerHTML = `
    <div class="card-poster-wrap">
      <img class="card-poster" src="${image}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300?text=Cover';" />
      ${rating ? `<div class="card-rating-badge">★ ${rating}</div>` : ""}
      ${format ? `<div class="card-type-badge">${format}</div>` : ""}
      ${epText ? `<div class="card-ep-badge">${epText}</div>` : ""}
    </div>
    <div class="card-info">
      <div class="card-title" title="${title}">${title}</div>
      <div class="card-meta">
        <span>${year || (type === "manga" ? "Chapter " + (item.latestChapter || "Latest") : "Stream")}</span>
        <span style="color:#818cf8; font-weight:600;">${type === "moviebox" ? "MovieBox" : (type === "manga" ? "Manga" : "Anime")}</span>
      </div>
    </div>
  `;

  card.addEventListener("click", () => openItemModal(item, type));
  return card;
}

// -------------------------------------------------------------
// Search Functionality across APIs
// -------------------------------------------------------------
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  mainContent.style.display = "none";
  searchResultsSection.style.display = "block";
  searchResultsTitle.textContent = `Searching for "${query}"...`;
  searchResultsGrid.innerHTML = '<div class="loading-spinner">Searching Render API services...</div>';

  try {
    const promises = [];

    // Search Moviebox
    if (currentFilter === "all" || currentFilter === "moviebox") {
      promises.push(
        fetchJson(`/api/moviebox/search?q=${encodeURIComponent(query)}`).then(d => ({
          type: "moviebox",
          items: d?.items || []
        }))
      );
    }

    // Search Anime
    if (currentFilter === "all" || currentFilter === "anime") {
      promises.push(
        fetchJson(`/api/anime/search?q=${encodeURIComponent(query)}`).then(d => ({
          type: "anime",
          items: d?.results || []
        }))
      );
    }

    // Search Manga
    if (currentFilter === "all" || currentFilter === "manga") {
      promises.push(
        fetchJson(`/api/manga/search?q=${encodeURIComponent(query)}`).then(d => ({
          type: "manga",
          items: d?.results || []
        }))
      );
    }

    const resultsArray = await Promise.all(promises);
    let totalItems = [];

    resultsArray.forEach(group => {
      if (group && group.items) {
        group.items.forEach(it => {
          totalItems.push({ item: it, type: group.type });
        });
      }
    });

    searchResultsTitle.textContent = `Search Results for "${query}" (${totalItems.length})`;
    searchResultsGrid.innerHTML = "";

    if (totalItems.length === 0) {
      searchResultsGrid.innerHTML = '<div class="loading-spinner">No results found across connected services.</div>';
      return;
    }

    totalItems.forEach(({ item, type }) => {
      const card = createCard(item, type);
      searchResultsGrid.appendChild(card);
    });

  } catch (e) {
    console.error("Search error:", e);
    searchResultsGrid.innerHTML = '<div class="loading-spinner">Error executing search. Please try again.</div>';
  }
}

function closeSearchResults() {
  searchResultsSection.style.display = "none";
  mainContent.style.display = "block";
}

// -------------------------------------------------------------
// Interactive Modal & Streaming Player
// -------------------------------------------------------------
async function openItemModal(item, type) {
  currentModalItem = { item, type };
  stopPlayer();

  // Extract info
  let title = "Untitled";
  if (item.title) {
    title = typeof item.title === "object"
      ? (item.title.english || item.title.romaji || item.title.userPreferred || "Untitled")
      : item.title;
  } else if (item.name) {
    title = item.name;
  }

  let subtitle = item.title && typeof item.title === "object" ? (item.title.romaji || item.title.native || "") : "";
  let poster = item.image || item.poster || (item.coverImage && (item.coverImage.extraLarge || item.coverImage.large)) || "https://via.placeholder.com/300";
  let desc = item.description ? item.description.replace(/<[^>]*>?/gm, "") : "No synopsis provided.";

  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalPoster.src = poster;
  modalOverview.textContent = desc;

  // Badges
  modalBadges.innerHTML = `
    <span class="modal-tag" style="background:var(--accent); color:#fff;">${type.toUpperCase()}</span>
    ${item.rating ? `<span class="modal-tag" style="color:#fbbf24;">★ ${item.rating}</span>` : ""}
    ${item.year ? `<span class="modal-tag">${item.year}</span>` : ""}
    ${item.format ? `<span class="modal-tag">${item.format}</span>` : ""}
  `;

  // Tags / Genres
  modalTags.innerHTML = "";
  if (item.genre) {
    item.genre.split(",").forEach(g => {
      const tag = document.createElement("span");
      tag.className = "modal-tag";
      tag.textContent = g.trim();
      modalTags.appendChild(tag);
    });
  } else if (Array.isArray(item.genres)) {
    item.genres.forEach(g => {
      const tag = document.createElement("span");
      tag.className = "modal-tag";
      tag.textContent = g;
      modalTags.appendChild(tag);
    });
  }

  // Reset conditional sections
  episodesContainer.style.display = "none";
  modalActions.innerHTML = "";

  // Content-specific handling
  if (type === "anime" || type === "anime-ep") {
    setupAnimeModal(item);
  } else if (type === "moviebox") {
    setupMovieboxModal(item);
  } else if (type === "manga") {
    setupMangaModal(item);
  }

  mediaModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

// Anime Modal Setup (Loads episodes & stream options)
async function setupAnimeModal(item) {
  const animeId = item.id || item.hianimeId || (item.title && item.title.english);
  if (!animeId) return;

  episodesContainer.style.display = "block";
  episodesGrid.innerHTML = '<div class="loading-spinner">Loading episodes...</div>';

  const data = await fetchJson(`/api/anime/episodes?id=${encodeURIComponent(animeId)}`);
  if (!data || !data.episodes) {
    episodesGrid.innerHTML = '<div class="loading-spinner">Episodes unavailable for this title.</div>';
    return;
  }

  episodesData = data.episodes;
  renderEpisodes(animeId);
}

function renderEpisodes(animeId = (currentModalItem && currentModalItem.item.id)) {
  if (!episodesData) return;

  const epsList = episodesData[currentAudioMode] || episodesData.sub || episodesData.dub || [];
  episodesGrid.innerHTML = "";

  if (epsList.length === 0) {
    episodesGrid.innerHTML = `<div class="loading-spinner">No ${currentAudioMode.toUpperCase()} episodes found.</div>`;
    return;
  }

  epsList.forEach((ep, idx) => {
    const btn = document.createElement("button");
    btn.className = `ep-btn ${idx === 0 ? "active" : ""}`;
    btn.textContent = `EP ${ep.number || idx + 1}`;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".ep-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      playAnimeEpisode(animeId, ep.number || idx + 1, currentAudioMode);
    });
    episodesGrid.appendChild(btn);
  });

  // Auto-play first episode
  if (epsList.length > 0) {
    playAnimeEpisode(animeId, epsList[0].number || 1, currentAudioMode);
  }
}

async function playAnimeEpisode(animeId, epNumber, audio) {
  modalPlayerContainer.style.display = "block";
  streamSources.innerHTML = '<span style="font-size:0.8rem; color:#94a3b8;">Loading stream...</span>';

  const streamData = await fetchJson(`/api/anime/stream?id=${encodeURIComponent(animeId)}&ep=${epNumber}&audio=${audio}`);
  
  if (!streamData || !streamData.streams || streamData.streams.length === 0) {
    streamSources.innerHTML = '<span style="font-size:0.8rem; color:#f87171;">No stream link returned by Render API.</span>';
    return;
  }

  streamSources.innerHTML = '<span style="font-size:0.8rem; color:#cbd5e1; margin-right:6px;">Sources:</span>';
  
  streamData.streams.forEach((s, idx) => {
    const sBtn = document.createElement("button");
    sBtn.className = `source-btn ${idx === 0 ? "active" : ""}`;
    sBtn.textContent = s.server || `Server ${idx + 1}`;
    sBtn.addEventListener("click", () => {
      document.querySelectorAll(".source-btn").forEach(b => b.classList.remove("active"));
      sBtn.classList.add("active");
      loadVideoStream(s.url);
    });
    streamSources.appendChild(sBtn);
  });

  // Play first stream
  loadVideoStream(streamData.streams[0].url);
}

// Moviebox Modal Setup
async function setupMovieboxModal(item) {
  modalActions.innerHTML = `
    <button class="btn-primary" id="movieboxWatchBtn">▶ Stream Movie / Series</button>
  `;

  document.getElementById("movieboxWatchBtn").onclick = async () => {
    modalPlayerContainer.style.display = "block";
    streamSources.innerHTML = '<span style="font-size:0.8rem; color:#94a3b8;">Connecting to MovieBox source...</span>';
    
    // Fetch detail if needed for slug
    const slug = item.slug;
    if (slug) {
      const detailRes = await fetchJson(`/api/moviebox/detail?slug=${encodeURIComponent(slug)}`);
      if (detailRes && detailRes.detail) {
        modalOverview.textContent = detailRes.detail.description || modalOverview.textContent;
      }
    }

    streamSources.innerHTML = `
      <span style="font-size:0.8rem; color:#34d399;">✓ Powered by Moviebox API backend</span>
    `;
  };
}

// Manga Modal Setup
function setupMangaModal(item) {
  modalActions.innerHTML = `
    <button class="btn-primary" onclick="window.open('${API_BASE}/manga', '_blank')">📖 Read on Manga Portal</button>
  `;
}

// -------------------------------------------------------------
// Video Player Controller (HLS & Native)
// -------------------------------------------------------------
function loadVideoStream(url) {
  if (!url) return;

  // If the URL is relative (starts with '/' but not '//'), prepend the API base.
  if (url.startsWith('/') && !url.startsWith('//')) {
    url = `${API_BASE}${url}`;
  }

  // Ensure the video element does not send a Referer header (bypass CDN block).
  if (videoPlayer) {
    videoPlayer.setAttribute('referrerpolicy', 'no-referrer');
  }

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  if (url.includes('.m3u8')) {
    if (Hls.isSupported()) {
      hlsInstance = new Hls({ enableWorker: true });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(videoPlayer);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => { videoPlayer.play().catch(() => {}); });
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("HLS fatal error:", data.type);
        }
      });
    } else if (videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
      videoPlayer.src = url;
      videoPlayer.play().catch(() => {});
    }
  } else {
    videoPlayer.src = url;
    videoPlayer.play().catch(() => {});
  }
}

function stopPlayer() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  videoPlayer.pause();
  videoPlayer.removeAttribute("src");
  videoPlayer.load();
  modalPlayerContainer.style.display = "none";
}

function closeModal() {
  stopPlayer();
  mediaModal.style.display = "none";
  document.body.style.overflow = "auto";
}
