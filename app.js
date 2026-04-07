/* ============================================
   420RS — App Logic
   Behance-style resource gallery
   Admin-only upload with password
   ============================================ */
const API_URL = "https://69d225325043d95be9717fa0.mockapi.io/420Rs";

// Global resource cache
let allResources = [];

// ===== CONFIG =====
const ADMIN_HASH = '6e363367f53e2c4e9d445e072f0ae3640046544747d58f00bee1c2d163607092';

// SHA-256 hash function (Web Crypto API)
async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_CATS = {
    image: 'Images', document: 'Docs', code: 'Code',
    video: 'Video', tool: 'Tools', other: 'Other'
};
const CAT_STORAGE = 'rs420_categories';

function loadCats() {
    try { const d = localStorage.getItem(CAT_STORAGE); return d ? JSON.parse(d) : { ...DEFAULT_CATS }; }
    catch { return { ...DEFAULT_CATS }; }
}
function saveCats(cats) { localStorage.setItem(CAT_STORAGE, JSON.stringify(cats)); }
function getCatLabel(key) { const cats = loadCats(); return cats[key] || key; }

const CAT_ICONS = {
    image: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    document: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    code: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    video: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    tool: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    other: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`
};

// ===== HELPERS =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

function load() {
    return allResources;
}
async function fetchAll() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        allResources = data || [];
        allResources.forEach(r => r._fetched = true);
        allResources.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderFilterChips();
        render();
        if (isAdmin) renderManage();

        // Check if user came from a share link
        const urlParams = new URLSearchParams(window.location.search);
        const sharedId = urlParams.get('id');
        if (sharedId) {
            const sharedItem = allResources.find(x => x.id === sharedId);
            if (sharedItem) openLightbox(sharedItem);
            // Clean the URL up so it doesn't stay there if they refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (e) {
        console.error("Fetch error", e);
    }
}

async function save(item) {
    try {
        const method = item._fetched ? "PUT" : "POST";
        const url = item._fetched ? `${API_URL}/${item.id}` : API_URL;

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error(await res.text());
        const savedItem = await res.json();
        item.savedId = savedItem.id;
        fetchAll();
    } catch (e) {
        console.error("Error saving doc", e);
        toast('Lỗi khi lưu (Có thể ảnh quá nặng)!', 'error');
    }
}

async function del(mockApiId) {
    try {
        await fetch(`${API_URL}/${mockApiId}`, { method: 'DELETE' });
        fetchAll();
    } catch (e) { console.error("Error deleting doc", e); }
}

// ===== SEED =====
function seed() {
    if (load().length) return;
    const items = [
        { id: genId(), name: 'Bộ Icon SVG miễn phí — 1000+ icons', cat: 'image', desc: 'Bộ sưu tập icon SVG chất lượng cao cho web & UI.', url: 'https://heroicons.com', tags: ['svg', 'icons', 'free'], thumb: '', dl: 234, date: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: genId(), name: 'React Hooks Cheat Sheet', cat: 'document', desc: 'Tổng hợp React Hooks với ví dụ và best practices.', url: 'https://react.dev/reference/react', tags: ['react', 'hooks'], thumb: '', dl: 567, date: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: genId(), name: 'Next.js 14 Starter Template', cat: 'code', desc: 'Template Next.js 14 + Tailwind + TypeScript, đã cấu hình sẵn.', url: 'https://github.com/vercel/next.js', tags: ['nextjs', 'tailwind', 'template'], thumb: '', dl: 891, date: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: genId(), name: 'Hướng dẫn Git từ A — Z', cat: 'video', desc: 'Series Git từ cơ bản đến nâng cao.', url: 'https://youtube.com', tags: ['git', 'tutorial'], thumb: '', dl: 345, date: new Date(Date.now() - 86400000).toISOString() },
        { id: genId(), name: 'VS Code Extensions Pack', cat: 'tool', desc: 'Top 20 extensions cho web developer 2026.', url: 'https://marketplace.visualstudio.com', tags: ['vscode', 'extensions'], thumb: '', dl: 432, date: new Date(Date.now() - 43200000).toISOString() },
        { id: genId(), name: 'Figma Dashboard UI Kit', cat: 'other', desc: 'Bộ component Figma cho dashboard — 50+ components.', url: 'https://figma.com/community', tags: ['figma', 'ui-kit', 'dashboard'], thumb: '', dl: 678, date: new Date(Date.now() - 86400000 * 7).toISOString() },
    ];
    items.forEach(save);
}

// ===== STATE =====
let filter = 'all';
let search = '';
let isAdmin = false;
let thumbData = '';

// ===== REFS =====
const navbar = $('#navbar');
const masonry = $('#masonry');
const emptyState = $('#emptyState');
const searchInput = $('#searchInput');
const filterChips = $('#filterChips');
const adminOverlay = $('#adminOverlay');
const adminClose = $('#adminClose');
const authGate = $('#authGate');
const authBtn = $('#authBtn');
const adminPass = $('#adminPass');
const uploadForm = $('#uploadForm');
const manageList = $('#manageList');
const manageItems = $('#manageItems');
const catManager = $('#catManager');
const catItems = $('#catItems');
const addCatBtn = $('#addCatBtn');
const dropArea = $('#dropArea');
const thumbFile = $('#thumbFile');
const thumbPreview = $('#thumbPreview');
const thumbImg = $('#thumbImg');
const removeThumb = $('#removeThumb');
const lightbox = $('#lightbox');
const lbClose = $('#lbClose');
const lbBody = $('#lbBody');
const toastBox = $('#toastBox');

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
});

// ===== FILTER & SEARCH =====
function renderFilterChips() {
    const cats = loadCats();
    filterChips.innerHTML = `<button class="chip ${filter === 'all' ? 'active' : ''}" data-cat="all">All</button>`
        + Object.entries(cats).map(([k, v]) =>
            `<button class="chip ${filter === k ? 'active' : ''}" data-cat="${k}">${esc(v)}</button>`
        ).join('');
}

function renderCatSelect() {
    const cats = loadCats();
    const sel = $('#resCat');
    sel.innerHTML = '<option value="">Danh mục</option>'
        + Object.entries(cats).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
}

filterChips.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filter = chip.dataset.cat;
    $$('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    render();
});

searchInput.addEventListener('input', e => {
    search = e.target.value.toLowerCase().trim();
    render();
});

// ===== RENDER MASONRY =====
function render() {
    let items = load();

    if (filter !== 'all') items = items.filter(r => r.cat === filter);
    if (search) items = items.filter(r =>
        r.name.toLowerCase().includes(search) ||
        (r.desc || '').toLowerCase().includes(search) ||
        r.tags.some(t => t.toLowerCase().includes(search))
    );

    if (!items.length) {
        masonry.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    masonry.style.display = '';
    emptyState.style.display = 'none';

    masonry.innerHTML = items.map((r, i) => {
        const hasThumb = !!r.thumb;
        const imgPart = hasThumb
            ? `<div class="card-img"><img src="${r.thumb}" alt="${esc(r.name)}" loading="lazy"><div class="card-overlay"><span class="card-overlay-title">${esc(r.name)}</span><span class="card-overlay-cat">${getCatLabel(r.cat)}</span></div></div>`
            : `<div class="card-img"><div class="card-img-placeholder">${CAT_ICONS[r.cat]}</div><div class="card-overlay"><span class="card-overlay-title">${esc(r.name)}</span><span class="card-overlay-cat">${getCatLabel(r.cat)}</span></div></div>`;

        return `
        <div class="card" data-id="${r.id}" style="animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both">
          ${imgPart}
          <div class="card-info">
            <div class="card-title">${esc(r.name)}</div>
            <div class="card-meta">
              <span class="card-cat">${getCatLabel(r.cat)}</span>
              <span class="card-dl">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                ${r.dl}
              </span>
            </div>
          </div>
        </div>`;
    }).join('');

    // Bind click
    $$('.card').forEach(card => {
        card.addEventListener('click', () => {
            const r = load().find(x => x.id === card.dataset.id);
            if (r) openLightbox(r);
        });
    });
}

// ===== LIGHTBOX =====
function openLightbox(r) {
    const tagsHtml = r.tags.map(t => `<span class="lb-tag">${esc(t)}</span>`).join('');
    const imgHtml = r.thumb
        ? `<div class="lb-img"><img src="${r.thumb}" alt="${esc(r.name)}"></div>`
        : `<div class="lb-img"><div class="lb-img-placeholder">${CAT_ICONS[r.cat]}</div></div>`;

    lbBody.innerHTML = `
      ${imgHtml}
      <div class="lb-content">
        <span class="lb-cat">${getCatLabel(r.cat)}</span>
        <h2 class="lb-title">${esc(r.name)}</h2>
        ${r.desc ? `<p class="lb-desc">${esc(r.desc)}</p>` : ''}
        ${r.tags.length ? `<div class="lb-tags">${tagsHtml}</div>` : ''}
        <div class="lb-actions">
          <a href="${r.url}" target="_blank" rel="noopener" class="lb-dl-btn" data-dl-id="${r.id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Open / Download
          </a>
          <button class="lb-share-btn" data-share-id="${r.id}" title="Chia sẻ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <button class="lb-share-btn" data-copy-id="${r.id}" title="Copy Link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
          <button class="lb-close-btn" id="lbCloseInner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            Close
          </button>
        </div>
      </div>
    `;

    // Track download
    const dlBtn = lbBody.querySelector('[data-dl-id]');
    if (dlBtn) dlBtn.addEventListener('click', () => {
        const item = load().find(x => x.id === r.id);
        if (item) {
            item.dl = (item.dl || 0) + 1;
            save(item);
            // Updating UI instantly
            dlBtn.innerHTML = `${item.dl} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
        }
    });

    const shareBtn = lbBody.querySelector('[data-share-id]');
    if (shareBtn) shareBtn.addEventListener('click', async () => {
        const item = load().find(x => x.id === r.id);
        if (!item) return;

        const shareUrl = window.location.origin + window.location.pathname + "?id=" + item.id;
        const shareData = {
            title: item.name + " - 420RS",
            text: item.desc || "Xem tài nguyên cực xịn này trên 420RS!",
            url: shareUrl
        };

        try {
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (err) {
                    await navigator.clipboard.writeText(shareUrl);
                    toast('Đã copy Link chia sẻ!', 'success');
                }
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast('Đã copy Link chia sẻ!', 'success');
            }
        } catch (e) {
            // Cú chót nếu clipboard api lỗi
            const dummy = document.createElement('input');
            document.body.appendChild(dummy);
            dummy.value = shareUrl;
            dummy.select();
            document.execCommand('copy');
            document.body.removeChild(dummy);
            toast('Đã copy Link chia sẻ!', 'success');
        }
    });

    const copyBtn = lbBody.querySelector('[data-copy-id]');
    if (copyBtn) copyBtn.addEventListener('click', async () => {
        const item = load().find(x => x.id === r.id);
        if (!item) return;

        const shareUrl = window.location.origin + window.location.pathname + "?id=" + item.id;

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast('Đã copy Link trực tiếp!', 'info');
        } catch (e) {
            const dummy = document.createElement('input');
            document.body.appendChild(dummy);
            dummy.value = shareUrl;
            dummy.select();
            document.execCommand('copy');
            document.body.removeChild(dummy);
            toast('Đã copy Link trực tiếp!', 'info');
        }
    });

    const closeInner = lbBody.querySelector('#lbCloseInner');
    if (closeInner) closeInner.addEventListener('click', () => lightbox.classList.remove('open'));

    lightbox.classList.add('open');
}

lbClose.addEventListener('click', () => lightbox.classList.remove('open'));
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });

// ===== ADMIN PANEL (Secret: type '420' to open) =====
function openAdmin() {
    adminOverlay.classList.add('open');
    if (isAdmin) {
        authGate.style.display = 'none';
        uploadForm.style.display = 'flex';
        manageList.style.display = 'block';
        catManager.style.display = 'block';
        renderManage();
        renderCatManager();
        renderCatSelect();
    } else {
        authGate.style.display = 'block';
        uploadForm.style.display = 'none';
        manageList.style.display = 'none';
        catManager.style.display = 'none';
    }
}

// Secret key sequence: type '420' anywhere on page
let secretBuf = '';
let secretTimer = null;
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key >= '0' && e.key <= '9') {
        secretBuf += e.key;
        clearTimeout(secretTimer);
        secretTimer = setTimeout(() => { secretBuf = ''; }, 2000);
        if (secretBuf.includes('420')) {
            secretBuf = '';
            openAdmin();
        }
    }
});

// Also: click logo 5 times quickly to open admin
let logoClicks = 0;
let logoTimer = null;
document.querySelector('.logo').addEventListener('click', e => {
    e.preventDefault();
    logoClicks++;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => { logoClicks = 0; }, 2000);
    if (logoClicks >= 5) {
        logoClicks = 0;
        openAdmin();
    }
});

adminClose.addEventListener('click', () => adminOverlay.classList.remove('open'));
adminOverlay.addEventListener('click', e => { if (e.target === adminOverlay) adminOverlay.classList.remove('open'); });

authBtn.addEventListener('click', async () => {
    const inputHash = await sha256(adminPass.value);
    if (inputHash === ADMIN_HASH) {
        isAdmin = true;
        authGate.style.display = 'none';
        uploadForm.style.display = 'flex';
        manageList.style.display = 'block';
        catManager.style.display = 'block';
        renderManage();
        renderCatManager();
        renderCatSelect();
        toast('Admin mode unlocked', 'success');
    } else {
        toast('Sai mật khẩu!', 'error');
        adminPass.value = '';
        adminPass.focus();
    }
});

adminPass.addEventListener('keydown', e => { if (e.key === 'Enter') authBtn.click(); });
// ===== UPLOAD FORM =====
uploadForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#resName').value.trim();
    const cat = $('#resCat').value;
    const desc = $('#resDesc').value.trim();
    const url = $('#resUrl').value.trim();
    const tagsRaw = $('#resTags').value.trim();
    const thumbUrl = $('#thumbUrl').value.trim();

    if (!name || !cat || !url) { toast('Điền đủ thông tin bắt buộc!', 'error'); return; }

    const newItem = {
        id: genId(),
        name, cat, desc, url,
        tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
        thumb: thumbUrl,
        dl: 0,
        date: new Date().toISOString()
    };

    save(newItem);

    uploadForm.reset();
    toast('Đã đăng tài nguyên!', 'success');
});

// ===== MANAGE LIST =====
let editingId = null;

function renderManage() {
    const all = load();
    const cats = loadCats();
    if (!all.length) { manageItems.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Chưa có tài nguyên.</p>'; return; }
    manageItems.innerHTML = all.map(r => {
        if (editingId === r.id) {
            return `
      <div class="manage-edit-form" data-edit-id="${r.id}">
        <input type="text" class="input" data-field="name" value="${esc(r.name)}" placeholder="Tên">
        <select class="input" data-field="cat">
          ${Object.entries(cats).map(([k, v]) => `<option value="${k}" ${r.cat === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select>
        <textarea class="input" data-field="desc" rows="2" placeholder="Mô tả">${esc(r.desc || '')}</textarea>
        <input type="url" class="input" data-field="url" value="${esc(r.url)}" placeholder="Link">
        <input type="text" class="input" data-field="tags" value="${r.tags.join(', ')}" placeholder="Tags">
        <div class="auth-row">
          <button class="btn-primary btn-full" data-save="${r.id}">Lưu</button>
          <button class="lb-close-btn" data-cancel-edit>Huỷ</button>
        </div>
      </div>`;
        }
        return `
      <div class="manage-item">
        <span class="manage-item-name">${esc(r.name)}</span>
        <div style="display:flex;gap:4px;">
          <button class="manage-del" data-edit="${r.id}" title="Sửa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="manage-del" data-del="${r.id}" title="Xoá">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');

    // Edit button
    $$('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            editingId = btn.dataset.edit;
            renderManage();
        });
    });

    // Save edit
    $$('[data-save]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.save;
            const form = btn.closest('[data-edit-id]');
            const all = load();
            const item = all.find(x => x.id === id);
            if (!item) return;
            item.name = form.querySelector('[data-field="name"]').value.trim();
            item.cat = form.querySelector('[data-field="cat"]').value;
            item.desc = form.querySelector('[data-field="desc"]').value.trim();
            item.url = form.querySelector('[data-field="url"]').value.trim();
            item.tags = form.querySelector('[data-field="tags"]').value.split(',').map(t => t.trim()).filter(Boolean);
            save(item);
            editingId = null;
        });
    });

    // Cancel edit
    $$('[data-cancel-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            editingId = null;
            renderManage();
        });
    });

    // Delete
    $$('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.del;
            if (!confirm('Xoá tài nguyên này?')) return;
            del(id);
            toast('Đã xoá', 'info');
        });
    });
}

// ===== CATEGORY MANAGER =====
function renderCatManager() {
    const cats = loadCats();
    catItems.innerHTML = Object.entries(cats).map(([k, v]) => `
      <div class="manage-item">
        <span class="manage-item-name"><strong>${esc(k)}</strong> → ${esc(v)}</span>
        <button class="manage-del" data-del-cat="${k}" title="Xoá">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `).join('');

    $$('[data-del-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.delCat;
            if (!confirm(`Xoá danh mục "${key}" ? `)) return;
            const cats = loadCats();
            delete cats[key];
            saveCats(cats);
            renderCatManager();
            renderFilterChips();
            renderCatSelect();
            toast('Đã xoá danh mục', 'info');
        });
    });
}

addCatBtn.addEventListener('click', () => {
    const key = $('#newCatKey').value.trim().toLowerCase().replace(/\s+/g, '-');
    const label = $('#newCatLabel').value.trim();
    if (!key || !label) { toast('Nhập đủ key và label!', 'error'); return; }
    const cats = loadCats();
    if (cats[key]) { toast('Danh mục đã tồn tại!', 'error'); return; }
    cats[key] = label;
    saveCats(cats);
    $('#newCatKey').value = '';
    $('#newCatLabel').value = '';
    renderCatManager();
    renderFilterChips();
    renderCatSelect();
    toast('Đã thêm danh mục!', 'success');
});

// ===== TOAST =====
function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    toastBox.appendChild(el);
    setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 2500);
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        adminOverlay.classList.remove('open');
        lightbox.classList.remove('open');
        $('#donateOverlay').classList.remove('open');
        history.replaceState(null, '', window.location.pathname);
    }
});

// ===== DONATE UI =====
$('#donateBtn').addEventListener('click', () => $('#donateOverlay').classList.add('open'));
$('#donateClose').addEventListener('click', () => $('#donateOverlay').classList.remove('open'));
$('#donateOverlay').addEventListener('click', e => { if (e.target === $('#donateOverlay')) $('#donateOverlay').classList.remove('open'); });

// ===== INIT =====
fetchAll();
