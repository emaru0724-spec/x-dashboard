// --- State ---
let currentChar = "";
let currentFilter = "すべて";
let currentPost = null;
let currentSettingKey = "";
let isEditing = false;

// --- Init ---
async function init() {
  await loadCharacters();
  await loadMcpStatus();
  await loadConfig();
  setupFilters();
  setInterval(loadMcpStatus, 30000);
}

// --- Characters ---
async function loadCharacters() {
  const res = await fetch("/api/characters");
  const chars = await res.json();
  const tabs = document.getElementById("char-tabs");
  tabs.innerHTML = "";
  chars.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "px-4 py-2 text-sm border-b-2 border-transparent hover:border-xblue";
    btn.textContent = `${c.label}（${c.count}件）`;
    btn.dataset.char = c.name;
    btn.onclick = () => selectChar(c.name);
    tabs.appendChild(btn);
    if (i === 0 && !currentChar) selectChar(c.name);
  });
}

function selectChar(name) {
  currentChar = name;
  document.querySelectorAll("#char-tabs button").forEach((btn) => {
    btn.classList.toggle("border-xblue", btn.dataset.char === name);
    btn.classList.toggle("text-xblue", btn.dataset.char === name);
    btn.classList.toggle("border-transparent", btn.dataset.char !== name);
  });
  loadPosts();
  clearMain();
}

// --- Posts ---
async function loadPosts() {
  const url =
    currentFilter && currentFilter !== "すべて"
      ? `/api/posts/${encodeURIComponent(currentChar)}?filter=${encodeURIComponent(currentFilter)}`
      : `/api/posts/${encodeURIComponent(currentChar)}`;
  const res = await fetch(url);
  const posts = await res.json();
  const list = document.getElementById("post-list");
  list.innerHTML = "";
  if (posts.length === 0) {
    list.innerHTML = '<div class="text-xsub text-sm text-center p-4">投稿なし</div>';
    return;
  }
  posts.forEach((p) => {
    const div = document.createElement("div");
    div.className = "post-item px-3 py-2 border-b border-xborder cursor-pointer";
    if (currentPost && currentPost.filename === p.filename) div.classList.add("active");
    const status = p.meta.status || "ストック";
    const preview = p.body.substring(0, 40).replace(/\n/g, " ");
    div.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-xsub">${p.meta.date || ""} / ${p.meta.type || ""}</span>
        <span class="status-badge status-${status}">${status}</span>
      </div>
      <div class="text-sm truncate">${escapeHtml(preview)}…</div>
    `;
    div.onclick = () => showPost(p);
    list.appendChild(div);
  });
}

function showPost(post) {
  currentPost = post;
  isEditing = false;
  renderPost();
  // highlight in list
  document.querySelectorAll(".post-item").forEach((el, i) => {
    el.classList.toggle("active", el.querySelector(".text-xs")?.textContent.includes(post.meta.date) && el.querySelector(".text-sm")?.textContent.includes(post.body.substring(0, 20)));
  });
  reloadPostList();
}

function renderPost() {
  const main = document.getElementById("main-content");
  if (!currentPost) {
    main.innerHTML = '<div class="text-xsub text-center mt-20">投稿を選択してください</div>';
    return;
  }
  const p = currentPost;
  const status = p.meta.status || "ストック";

  if (isEditing) {
    main.innerHTML = `
      <div class="max-w-2xl">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-xs text-xsub">${p.meta.date} / Type ${p.meta.type}</span>
          <span class="status-badge status-${status}">${status}</span>
        </div>
        <textarea id="edit-body" class="w-full bg-xdark border border-xborder rounded px-3 py-2 text-sm font-mono min-h-[300px]">${escapeHtml(p.body)}</textarea>
        <div class="flex gap-2 mt-3">
          <button onclick="savePost()" class="px-4 py-2 bg-xblue text-white rounded text-sm">💾 保存</button>
          <button onclick="cancelEdit()" class="px-4 py-2 border border-xborder rounded text-sm">キャンセル</button>
        </div>
      </div>
    `;
  } else {
    const images = p.meta.images || [];
    const imagesHtml = images.length
      ? images.map(img =>
          `<div class="relative group inline-block">
            <img src="/api/images/${encodeURIComponent(currentChar)}/${encodeURIComponent(img)}/file" class="w-20 h-20 object-cover rounded border border-xborder">
            <button onclick="detachImage('${escapeHtml(img)}')" class="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs hidden group-hover:block">×</button>
            <div class="text-[10px] text-xsub truncate w-20 mt-1">${escapeHtml(img)}</div>
          </div>`
        ).join("")
      : '<span class="text-xsub text-xs">画像なし</span>';

    main.innerHTML = `
      <div class="max-w-2xl">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-xs text-xsub">${p.meta.date} / Type ${p.meta.type}</span>
          <span class="status-badge status-${status}">${status}</span>
          <span class="text-xs text-xsub">${p.filename}</span>
        </div>
        <div class="bg-xcard border border-xborder rounded p-4 mb-4 whitespace-pre-wrap text-sm leading-relaxed">${escapeHtml(p.body)}</div>
        <div class="flex gap-2 mb-4">
          <button onclick="cycleStatus()" class="px-4 py-2 border border-xborder rounded text-sm hover:bg-xdark">${status} ↻</button>
          <button onclick="startEdit()" class="px-4 py-2 border border-xborder rounded text-sm hover:bg-xdark">✏️ 編集</button>
          <button onclick="copyPost()" class="px-4 py-2 border border-xborder rounded text-sm hover:bg-xdark">📋 コピー</button>
        </div>
        <div class="border-t border-xborder pt-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-bold">画像 (SocialDog用)</span>
            <span class="text-xs text-xsub">${images.length}/4枚</span>
          </div>
          <div class="flex gap-2 flex-wrap mb-2">${imagesHtml}</div>
          ${images.length < 4 ? `
          <div class="flex gap-2 items-center">
            <button onclick="openImagePicker()" class="px-3 py-1 text-xs border border-xborder rounded hover:bg-xdark">+ 画像を追加</button>
            <label class="px-3 py-1 text-xs border border-dashed border-xborder rounded cursor-pointer hover:bg-xdark">
              アップロード
              <input type="file" accept="image/*" class="hidden" onchange="uploadAndAttach(this)">
            </label>
          </div>` : ""}
        </div>
      </div>
    `;
  }
}

async function cycleStatus() {
  const res = await fetch(
    `/api/posts/${encodeURIComponent(currentChar)}/${encodeURIComponent(currentPost.filename)}/status`,
    { method: "PUT" }
  );
  const data = await res.json();
  currentPost.meta.status = data.status;
  renderPost();
  loadPosts();
  loadCharacters();
}

function startEdit() {
  isEditing = true;
  renderPost();
}

function cancelEdit() {
  isEditing = false;
  renderPost();
}

async function savePost() {
  const body = document.getElementById("edit-body").value;
  await fetch(
    `/api/posts/${encodeURIComponent(currentChar)}/${encodeURIComponent(currentPost.filename)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
  currentPost.body = body;
  isEditing = false;
  renderPost();
  loadPosts();
}

async function copyPost() {
  await navigator.clipboard.writeText(currentPost.body);
  const btn = document.querySelector('button[onclick="copyPost()"]');
  const orig = btn.textContent;
  btn.textContent = "✓ コピーしました";
  setTimeout(() => (btn.textContent = orig), 1500);
}

function clearMain() {
  currentPost = null;
  isEditing = false;
  document.getElementById("main-content").innerHTML =
    '<div class="text-xsub text-center mt-20">投稿を選択してください</div>';
}

function reloadPostList() {
  loadPosts();
}

// --- Filters ---
function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.onclick = () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.classList.toggle("border-xborder", b !== btn);
      });
      loadPosts();
    };
  });
}

// --- MCP Status ---
async function loadMcpStatus() {
  try {
    const res = await fetch("/api/mcp-status");
    const data = await res.json();
    const el = document.getElementById("mcp-indicators");
    el.innerHTML = Object.entries(data)
      .map(
        ([name, online]) =>
          `<span class="flex items-center gap-1 text-xs"><span class="mcp-dot ${online ? "online" : "offline"}"></span>${name} MCP</span>`
      )
      .join("");
  } catch {}
}

// --- Config ---
async function loadConfig() {
  const res = await fetch("/api/config");
  const data = await res.json();
  const btn = document.getElementById("api-key-btn");
  btn.textContent = data.has_api_key ? "APIキー設定済み ⚙" : "APIキー未設定 ⚙";
  btn.classList.toggle("text-green-400", data.has_api_key);
  btn.classList.toggle("text-red-400", !data.has_api_key);
}

function openConfigModal() {
  document.getElementById("config-modal").classList.remove("hidden");
  document.getElementById("api-key-input").value = "";
  document.getElementById("api-key-input").focus();
}

function closeConfigModal() {
  document.getElementById("config-modal").classList.add("hidden");
}

async function saveApiKey() {
  const key = document.getElementById("api-key-input").value.trim();
  if (!key) return;
  await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anthropic_api_key: key }),
  });
  closeConfigModal();
  loadConfig();
}

// --- Generate ---
function openGenerateModal() {
  document.getElementById("generate-modal").classList.remove("hidden");
  document.getElementById("gen-mode").value = "weekly";
  document.getElementById("gen-progress").classList.add("hidden");
  document.getElementById("gen-start-btn").disabled = false;
  toggleGenFields();
}

function closeGenerateModal() {
  document.getElementById("generate-modal").classList.add("hidden");
}

function toggleGenFields() {
  const mode = document.getElementById("gen-mode").value;
  document.getElementById("gen-single-fields").classList.toggle("hidden", mode !== "single");
}

async function startGenerate() {
  const mode = document.getElementById("gen-mode").value;
  const postType = document.getElementById("gen-type").value;
  const theme = document.getElementById("gen-theme").value;
  const progress = document.getElementById("gen-progress");
  const btn = document.getElementById("gen-start-btn");

  progress.classList.remove("hidden");
  progress.textContent = mode === "weekly" ? "21本生成中... (30〜60秒)" : "1本生成中...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: currentChar,
        mode,
        post_type: postType,
        theme,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      progress.textContent = `エラー: ${err.detail || "生成に失敗しました"}`;
      btn.disabled = false;
      return;
    }
    const data = await res.json();
    progress.textContent = `完了: ${data.count}本生成されました`;
    btn.disabled = false;
    loadPosts();
    loadCharacters();
    setTimeout(closeGenerateModal, 1500);
  } catch (e) {
    progress.textContent = `エラー: ${e.message}`;
    btn.disabled = false;
  }
}

// --- Settings ---
function openSetting(key) {
  currentSettingKey = key;
  const labels = {
    profile: "プロフィール",
    "brand-voice": "口調ルール",
    "ng-words": "NGワード",
    "dm-template": "DMテンプレ",
  };
  document.getElementById("setting-title").textContent = `${labels[key] || key} — ${currentChar}`;
  document.getElementById("setting-modal").classList.remove("hidden");
  fetch(`/api/settings/${encodeURIComponent(currentChar)}/${key}`)
    .then((r) => r.json())
    .then((data) => {
      document.getElementById("setting-content").value = data.content;
    });
}

function closeSettingModal() {
  document.getElementById("setting-modal").classList.add("hidden");
}

async function saveSetting() {
  const content = document.getElementById("setting-content").value;
  await fetch(`/api/settings/${encodeURIComponent(currentChar)}/${currentSettingKey}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  closeSettingModal();
}

// --- Images ---
async function uploadAndAttach(input) {
  if (!input.files.length || !currentPost) return;
  const file = input.files[0];
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/images/${encodeURIComponent(currentChar)}`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    alert("アップロード失敗");
    return;
  }
  const data = await res.json();
  const images = (currentPost.meta.images || []).concat(data.filename).slice(0, 4);
  await fetch(
    `/api/posts/${encodeURIComponent(currentChar)}/${encodeURIComponent(currentPost.filename)}/images`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    }
  );
  currentPost.meta.images = images;
  renderPost();
}

async function detachImage(filename) {
  if (!currentPost) return;
  const images = (currentPost.meta.images || []).filter((i) => i !== filename);
  await fetch(
    `/api/posts/${encodeURIComponent(currentChar)}/${encodeURIComponent(currentPost.filename)}/images`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    }
  );
  currentPost.meta.images = images;
  renderPost();
}

async function openImagePicker() {
  const res = await fetch(`/api/images/${encodeURIComponent(currentChar)}`);
  const allImages = await res.json();
  const attached = currentPost.meta.images || [];
  const available = allImages.filter((i) => !attached.includes(i));

  if (available.length === 0) {
    alert("ライブラリに未使用の画像がありません。「アップロード」で追加してください。");
    return;
  }

  const main = document.getElementById("main-content");
  const picker = document.createElement("div");
  picker.className = "fixed inset-0 z-50 flex items-center justify-center modal-overlay";
  picker.innerHTML = `
    <div class="bg-xcard border border-xborder rounded-lg p-4 w-[500px] max-h-[70vh] flex flex-col">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-sm">画像を選択</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-xsub hover:text-white">×</button>
      </div>
      <div class="flex flex-wrap gap-2 overflow-y-auto">
        ${available.map(img => `
          <div class="cursor-pointer hover:ring-2 ring-xblue rounded" onclick="pickImage('${escapeHtml(img)}'); this.closest('.fixed').remove();">
            <img src="/api/images/${encodeURIComponent(currentChar)}/${encodeURIComponent(img)}/file" class="w-24 h-24 object-cover rounded">
            <div class="text-[10px] text-xsub truncate w-24 mt-1">${escapeHtml(img)}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  document.body.appendChild(picker);
}

async function pickImage(filename) {
  if (!currentPost) return;
  const images = (currentPost.meta.images || []).concat(filename).slice(0, 4);
  await fetch(
    `/api/posts/${encodeURIComponent(currentChar)}/${encodeURIComponent(currentPost.filename)}/images`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    }
  );
  currentPost.meta.images = images;
  renderPost();
}

// --- SocialDog Export ---
function openExportModal() {
  document.getElementById("export-modal").classList.remove("hidden");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById("exp-start-date").value = tomorrow.toISOString().slice(0, 10);
  updateExportPreview();
}

function closeExportModal() {
  document.getElementById("export-modal").classList.add("hidden");
}

function getExportTimeSlots() {
  return document.getElementById("exp-time-slots").value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^\d{2}:\d{2}$/.test(s));
}

async function updateExportPreview() {
  const status = document.getElementById("exp-status").value;
  const startDate = document.getElementById("exp-start-date").value;
  const slots = getExportTimeSlots();
  if (!startDate || slots.length === 0) {
    document.getElementById("exp-preview").textContent = "日付と時間帯を設定してください";
    return;
  }
  const res = await fetch("/api/export/socialdog/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character: currentChar,
      start_date: startDate,
      time_slots: slots,
      filter_status: status,
    }),
  });
  const data = await res.json();
  const el = document.getElementById("exp-preview");
  if (data.count === 0) {
    el.textContent = "対象の投稿がありません";
  } else {
    el.innerHTML = `<strong>${data.count}件</strong> / ${data.days}日分 (${data.slots_per_day}投稿/日)<br>投稿時間: ${slots.join(", ")}`;
  }
}

async function downloadExport() {
  const status = document.getElementById("exp-status").value;
  const startDate = document.getElementById("exp-start-date").value;
  const slots = getExportTimeSlots();
  if (!startDate || slots.length === 0) return;

  const res = await fetch("/api/export/socialdog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      character: currentChar,
      start_date: startDate,
      time_slots: slots,
      filter_status: status,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    alert(err.detail || "エクスポート失敗");
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : `socialdog_${currentChar}.csv`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  closeExportModal();
}

// --- Util ---
function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// --- View Switching ---
let currentView = "manage";

function switchView(view) {
  currentView = view;
  const pm = document.getElementById("panel-manage");
  const pr = document.getElementById("panel-research");
  if (view === "manage") {
    pm.classList.remove("hidden"); pm.style.display = "";
    pr.classList.add("hidden"); pr.style.display = "none";
  } else {
    pm.classList.add("hidden"); pm.style.display = "none";
    pr.classList.remove("hidden"); pr.style.display = "flex";
  }
  document.getElementById("view-manage").classList.toggle("border-xblue", view === "manage");
  document.getElementById("view-manage").classList.toggle("text-xblue", view === "manage");
  document.getElementById("view-manage").classList.toggle("border-transparent", view !== "manage");
  document.getElementById("view-manage").classList.toggle("text-xsub", view !== "manage");
  document.getElementById("view-research").classList.toggle("border-xblue", view === "research");
  document.getElementById("view-research").classList.toggle("text-xblue", view === "research");
  document.getElementById("view-research").classList.toggle("border-transparent", view !== "research");
  document.getElementById("view-research").classList.toggle("text-xsub", view !== "research");
  if (view === "research") {
    loadSavedQueries();
    loadCollectedCount();
  }
}

// --- Research: Search ---
let researchView = "search";
let searchResults = [];

function switchResearchView(rv) {
  researchView = rv;
  document.getElementById("rv-search").classList.toggle("bg-xblue", rv === "search");
  document.getElementById("rv-search").classList.toggle("text-white", rv === "search");
  document.getElementById("rv-search").classList.toggle("border-xborder", rv !== "search");
  document.getElementById("rv-collected").classList.toggle("bg-xblue", rv === "collected");
  document.getElementById("rv-collected").classList.toggle("text-white", rv === "collected");
  document.getElementById("rv-collected").classList.toggle("border-xborder", rv !== "collected");
  if (rv === "search") renderSearchResults();
  else loadCollectedPosts();
}

function fmtN(n) { if (n>=1e6) return (n/1e6).toFixed(1)+"M"; if (n>=1e3) return (n/1e3).toFixed(1)+"K"; return String(n); }

async function searchX() {
  const q = document.getElementById("rs-query").value.trim();
  if (!q) return;
  document.getElementById("rs-results").innerHTML = '<div class="text-xsub text-center py-8">検索中...</div>';
  try {
    const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, max_results: 50 }),
    });
    if (!res.ok) {
      const err = await res.json();
      document.getElementById("rs-results").innerHTML = `<div class="text-red-400 text-center py-8">${escapeHtml(err.detail || "検索失敗")}</div>`;
      return;
    }
    const data = await res.json();
    searchResults = data.results;
    document.getElementById("rs-result-count").textContent = `${data.count}件`;
    researchView = "search";
    renderSearchResults();
  } catch (e) {
    document.getElementById("rs-results").innerHTML = `<div class="text-red-400 text-center py-8">${e.message}</div>`;
  }
}

function renderSearchResults() {
  const el = document.getElementById("rs-results");
  if (!searchResults.length) {
    el.innerHTML = '<div class="text-xsub text-center py-8">検索結果がありません</div>';
    return;
  }
  el.innerHTML = searchResults.map(p => `
    <div class="bg-xcard border border-xborder rounded p-3 hover:border-xblue transition-colors">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-bold">@${escapeHtml(p.author_username)}</span>
            <span class="text-xs text-xsub">${escapeHtml(p.author_name)}</span>
          </div>
          <div class="text-sm whitespace-pre-wrap mb-2 cursor-pointer" onclick="openRsDetail(${JSON.stringify(p).replace(/"/g,'&quot;')})">${escapeHtml(p.text)}</div>
          <div class="flex gap-3 text-xs text-xsub">
            <span>♥ ${fmtN(p.likes)}</span>
            <span>🔁 ${fmtN(p.retweets)}</span>
            <span>💬 ${fmtN(p.replies)}</span>
            <span>🔖 ${fmtN(p.bookmarks)}</span>
            ${p.impressions ? `<span>👁 ${fmtN(p.impressions)}</span>` : ""}
          </div>
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <button onclick='collectOne(${JSON.stringify(p).replace(/'/g,"&#39;")})' class="px-3 py-1 text-xs bg-xblue text-white rounded hover:opacity-90">収集</button>
          <a href="${p.tweet_url}" target="_blank" class="px-3 py-1 text-xs border border-xborder rounded text-center hover:bg-xdark">Xで見る</a>
        </div>
      </div>
    </div>
  `).join("");
}

async function collectOne(post) {
  const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posts: [post] }),
  });
  const data = await res.json();
  loadCollectedCount();
  if (data.added > 0) {
    alert(`収集しました (合計: ${data.total}件)`);
  } else {
    alert("すでに収集済みです");
  }
}

async function collectAll() {
  if (!searchResults.length) return;
  if (!confirm(`検索結果 ${searchResults.length}件を一括収集しますか？`)) return;
  const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posts: searchResults }),
  });
  const data = await res.json();
  loadCollectedCount();
  alert(`${data.added}件を収集しました (合計: ${data.total}件)`);
}

// --- Research: Collected Posts ---
async function loadCollectedPosts() {
  const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts`);
  const data = await res.json();
  document.getElementById("rs-result-count").textContent = `${data.count}件 収集済み`;
  const el = document.getElementById("rs-results");
  if (!data.posts.length) {
    el.innerHTML = '<div class="text-xsub text-center py-8">収集済みポストがありません<br>検索結果から「収集」してください</div>';
    return;
  }
  el.innerHTML = data.posts.map(p => {
    const statusCls = { collected: "bg-gray-600", watching: "bg-blue-600", remixed: "bg-green-600" };
    const statusLabel = { collected: "収集済", watching: "ウォッチ中", remixed: "リミックス済" };
    return `
    <div class="bg-xcard border border-xborder rounded p-3 hover:border-xblue transition-colors">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-bold">@${escapeHtml(p.author_username)}</span>
            <span class="px-2 py-0.5 text-[10px] rounded-full ${statusCls[p.status] || 'bg-gray-600'} text-white">${statusLabel[p.status] || p.status}</span>
          </div>
          <div class="text-sm whitespace-pre-wrap mb-2">${escapeHtml(p.text)}</div>
          <div class="flex gap-3 text-xs text-xsub">
            <span>♥ ${fmtN(p.likes)}</span>
            <span>🔁 ${fmtN(p.retweets)}</span>
            ${p.impressions ? `<span>👁 ${fmtN(p.impressions)}</span>` : ""}
          </div>
          ${p.notes ? `<div class="mt-1 text-xs text-yellow-400">📝 ${escapeHtml(p.notes)}</div>` : ""}
        </div>
        <div class="flex flex-col gap-1 shrink-0">
          <button onclick="cycleResearchStatus('${p.tweet_id}')" class="px-2 py-1 text-[10px] border border-xborder rounded hover:bg-xdark">${statusLabel[p.status] || p.status} ↻</button>
          <button onclick="addResearchNote('${p.tweet_id}')" class="px-2 py-1 text-[10px] border border-xborder rounded hover:bg-xdark">📝 メモ</button>
          <button onclick="copyResearchText(\`${p.text.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`)" class="px-2 py-1 text-[10px] border border-xborder rounded hover:bg-xdark">📋 コピー</button>
          <button onclick="deleteResearchPost('${p.tweet_id}')" class="px-2 py-1 text-[10px] border border-red-800 text-red-400 rounded hover:bg-red-900/30">削除</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

async function cycleResearchStatus(tweetId) {
  const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts`);
  const data = await res.json();
  const post = data.posts.find(p => p.tweet_id === tweetId);
  if (!post) return;
  const cycle = ["collected", "watching", "remixed"];
  const idx = cycle.indexOf(post.status);
  const next = cycle[(idx + 1) % cycle.length];
  await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts/${tweetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: next }),
  });
  loadCollectedPosts();
}

async function addResearchNote(tweetId) {
  const note = prompt("メモを入力:");
  if (note === null) return;
  await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts/${tweetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: note }),
  });
  loadCollectedPosts();
}

function copyResearchText(text) {
  navigator.clipboard.writeText(text);
}

async function deleteResearchPost(tweetId) {
  if (!confirm("このポストを削除しますか？")) return;
  await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts/${tweetId}`, { method: "DELETE" });
  loadCollectedPosts();
  loadCollectedCount();
}

async function loadCollectedCount() {
  const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/posts`);
  const data = await res.json();
  document.getElementById("rs-collected-count").textContent = `収集済み: ${data.count}件`;
}

// --- Research: Saved Queries ---
async function loadSavedQueries() {
  const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/queries`);
  const queries = await res.json();
  const sel = document.getElementById("rs-saved-queries");
  sel.innerHTML = '<option value="">保存済み▼</option>' +
    queries.map((q, i) => `<option value="${i}">${escapeHtml(q.name)}</option>`).join("");
  sel._queries = queries;
}

function loadSavedQuery(idx) {
  if (idx === "") return;
  const sel = document.getElementById("rs-saved-queries");
  const q = sel._queries?.[parseInt(idx)];
  if (q) {
    document.getElementById("rs-query").value = q.query;
    searchX();
  }
  sel.value = "";
}

async function saveCurrentQuery() {
  const q = document.getElementById("rs-query").value.trim();
  if (!q) return;
  const name = prompt("クエリ名:", q.substring(0, 30));
  if (!name) return;
  await fetch(`/api/research/${encodeURIComponent(currentChar)}/queries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, query: q }),
  });
  loadSavedQueries();
}

// --- Research: Analysis ---
async function analyzeCollected() {
  const btn = document.getElementById("rs-analyze-btn");
  btn.disabled = true;
  btn.textContent = "分析中...（30〜60秒）";
  try {
    const res = await fetch(`/api/research/${encodeURIComponent(currentChar)}/analyze`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || "分析失敗");
      return;
    }
    const data = await res.json();
    document.getElementById("analysis-content").textContent = data.analysis;
    document.getElementById("analysis-modal").classList.remove("hidden");
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "📊 パターン分析";
  }
}

function closeAnalysisModal() {
  document.getElementById("analysis-modal").classList.add("hidden");
}

// --- Research: Detail ---
function openRsDetail(post) {
  document.getElementById("rs-detail-author").textContent = `@${post.author_username} — ${post.author_name}`;
  document.getElementById("rs-detail-body").innerHTML = `
    <div class="whitespace-pre-wrap text-sm mb-4">${escapeHtml(post.text)}</div>
    <div class="flex gap-4 text-sm text-xsub mb-4">
      <span>♥ ${fmtN(post.likes)}</span>
      <span>🔁 ${fmtN(post.retweets)}</span>
      <span>💬 ${fmtN(post.replies)}</span>
      <span>🔖 ${fmtN(post.bookmarks)}</span>
      ${post.impressions ? `<span>👁 ${fmtN(post.impressions)}</span>` : ""}
    </div>
    <div class="flex gap-2">
      <a href="${post.tweet_url}" target="_blank" class="px-3 py-1 text-sm border border-xborder rounded hover:bg-xdark">Xで見る</a>
      <button onclick="navigator.clipboard.writeText(\`${post.text.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`); this.textContent='✓ コピー済み'" class="px-3 py-1 text-sm border border-xborder rounded hover:bg-xdark">📋 テキストコピー</button>
    </div>`;
  document.getElementById("rs-detail-modal").classList.remove("hidden");
}

function closeRsDetail() {
  document.getElementById("rs-detail-modal").classList.add("hidden");
}

// --- Boot ---
init();
