// Pépins & Trognons — mockup applicatif (vanilla JS, aucune dépendance)
// Port fidèle du prototype de design (même état, mêmes écrans, mêmes styles).
'use strict';

const STORAGE_KEY = 'pt-demo-v1';
const GREEN = '#3E8F5E', GREY = '#A7A09A';
const ST = {
  ok: { l: 'OK', bg: '#D5EBDD', fg: '#1F5A36', c: GREEN },
  low: { l: 'Stock bas', bg: '#FBE7C2', fg: '#7A4B00', c: '#E0A33A' },
  out: { l: 'Épuisé', bg: '#FCE3DC', fg: '#A8341D', c: '#E9604A' },
};
const RS = {
  prep: { l: 'À préparer', bg: '#FBE7C2', fg: '#7A4B00' },
  ready: { l: 'Prête', bg: '#E6EAF7', fg: '#29378A' },
  done: { l: 'Retirée', bg: '#D5EBDD', fg: '#1F5A36' },
  expired: { l: 'Expirée', bg: '#ECE7E1', fg: '#5C5650' },
};

function emptyNP() { return { name: '', maker: '', univ: 'maison', price: '', stock: '', min: '', img: null, origine: '' }; }

function baseState() {
  return {
    view: 'home', pid: null, univ: 'all', onlyAvail: false, qty: 1, cart: [],
    form: { prenom: '', tel: '', email: '' }, day: null, slot: null, gift: false, errors: {},
    last: null, adminTab: 'stock', resaTab: 'prep', sel: null, user: 'Simon', gallery: 0,
    toast: null, showAdd: false, np: emptyNP(), npErr: {}, editingId: null,
  };
}

function loadState() {
  const s = Object.assign(baseState(), seedData());
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) Object.assign(s, saved);
  } catch (e) {}
  return s;
}

let state = loadState();
let toastTimer = null;

// Largeur de viewport utilisée pour les points de rupture du dashboard
// (barre latérale, table de stock en cartes). Fallback large si le code
// tourne hors navigateur.
function viewportWidth() { return (typeof window !== 'undefined' && window.innerWidth) || 1200; }

function persist() {
  const { products, resas, log, cart, view, pid, adminTab, user, last, univ, resaTab } = state;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, resas, log, cart, view, pid, adminTab, user, last, univ, resaTab })); } catch (e) {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
function hhmm() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function reserved(id, resas) {
  resas = resas || state.resas;
  return resas.filter(r => r.status === 'prep' || r.status === 'ready')
    .reduce((a, r) => a + r.items.filter(i => i.id === id).reduce((b, i) => b + i.qty, 0), 0);
}
function avail(p) { return Math.max(0, p.stock - reserved(p.id)); }
function prod(id) { return state.products.find(p => p.id === id); }
function univOf(id) { return UNIV.find(u => u.id === id); }
function inCart(id) { const c = state.cart.find(c => c.id === id); return c ? c.qty : 0; }

function daysList() {
  const now = new Date();
  const start = new Date(now);
  if (now.getHours() >= 18) start.setDate(start.getDate() + 1);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const diff = Math.round((new Date(d.toDateString()) - new Date(now.toDateString())) / 864e5);
    const until = new Date(d); until.setDate(d.getDate() + 2);
    if (until.getDay() === 0) until.setDate(until.getDate() + 1);
    out.push({
      closed: d.getDay() === 0,
      top: diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Demain' : D[d.getDay()],
      bottom: d.getDate() + ' ' + M[d.getMonth()],
      long: DL[d.getDay()] + ' ' + d.getDate() + ' ' + M[d.getMonth()],
      short: D[d.getDay()].toLowerCase() + '. ' + d.getDate() + ' ' + M[d.getMonth()],
      until: DL[until.getDay()] + ' ' + until.getDate() + ' ' + M[until.getMonth()],
    });
  }
  return out;
}

function openInfo() {
  const d = new Date(), day = d.getDay(), h = d.getHours() + d.getMinutes() / 60;
  if (day === 0) return { label: 'Fermé aujourd’hui · ouvre lundi à 10h', open: false };
  if (h < 10) return { label: "Ouvre aujourd'hui à 10h", open: false };
  if (h < 19) return { label: "Ouvert aujourd'hui jusqu'à 19h", open: true };
  return { label: day === 6 ? 'Fermé · ouvre lundi à 10h' : 'Fermé · ouvre demain à 10h', open: false };
}

function say(msg) {
  state.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; rerender(); }, 2600);
}

function addLog(entries) {
  state.log = [...entries.map(e => ({ day: "Aujourd'hui", time: hhmm(), ...e })), ...state.log];
}

// ---------------------------------------------------------------------------
// Actions (exposed on App, called from inline handlers)
// ---------------------------------------------------------------------------

const App = {
  go(view, extra) {
    Object.assign(state, { view }, extra || {});
    persist();
    rerender();
    try { window.scrollTo(0, 0); } catch (e) {}
  },
  goHome() { App.go('home'); },
  goCatalogue(univ) { App.go('catalogue', { univ: univ || 'all' }); },
  goProduct(id) { App.go('product', { pid: id, qty: 1 }); },
  goCart() { App.go('cart'); },
  goAdmin() { App.go('admin'); },
  goAdminResa() { App.go('admin', { adminTab: 'resa', resaTab: 'prep', sel: state.last && state.last.code }); },
  goVisit(ev) {
    if (ev) ev.preventDefault();
    App.go('home');
    setTimeout(() => { const el = document.getElementById('visite'); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90); }, 60);
  },

  setUniv(id) { state.univ = id; persist(); rerender(); },
  toggleAvail() { state.onlyAvail = !state.onlyAvail; rerender(); },

  qtyDec() { state.qty = Math.max(1, state.qty - 1); rerender(); },
  qtyInc() {
    const p = prod(state.pid);
    if (p && state.qty < avail(p)) { state.qty++; rerender(); }
    else say('Plus de stock disponible pour cet article');
  },
  addToCart() {
    const p = prod(state.pid);
    const room = avail(p) - inCart(p.id);
    if (room <= 0) { say('Déjà tout le stock disponible dans votre panier'); return; }
    const q = Math.min(state.qty, room);
    const ex = state.cart.find(c => c.id === p.id);
    state.cart = ex ? state.cart.map(c => c.id === p.id ? { ...c, qty: c.qty + q } : c) : [...state.cart, { id: p.id, qty: q }];
    state.qty = 1;
    persist();
    say('Ajouté à votre panier de retrait');
  },
  setCartQty(id, q) {
    const p = prod(id), max = avail(p);
    if (q <= 0) { state.cart = state.cart.filter(c => c.id !== id); persist(); rerender(); return; }
    if (q > max) { say('Plus de stock disponible pour cet article'); return; }
    state.cart = state.cart.map(c => c.id === id ? { ...c, qty: q } : c);
    persist();
    rerender();
  },
  cartInc(id) { App.setCartQty(id, inCart(id) + 1); },
  cartDec(id) { App.setCartQty(id, inCart(id) - 1); },
  cartRemove(id) { App.setCartQty(id, 0); },

  setField(path, value) {
    const parts = path.split('.');
    let obj = state;
    for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    if (parts[0] === 'form') state.errors[parts[1]] = '';
    if (parts[0] === 'np') state.npErr[parts[1]] = '';
    rerenderKeepFocus();
  },
  selectDay(i) { state.day = i; state.errors.day = ''; rerender(); },
  selectSlot(i) { state.slot = i; state.errors.slot = ''; rerender(); },
  toggleGift() { state.gift = !state.gift; rerender(); },

  submit() {
    const { form, day, slot, cart, gift, resas } = state;
    const e = {};
    if (!form.prenom.trim()) e.prenom = 'Votre prénom, pour vous reconnaître au comptoir';
    if (form.tel.replace(/\D/g, '').length < 10) e.tel = 'Un numéro à 10 chiffres';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Une adresse email valide';
    if (day === null) e.day = 'Choisissez un jour de passage';
    if (slot === null) e.slot = 'Choisissez un créneau';
    if (Object.keys(e).length) { state.errors = e; rerender(); return; }
    for (const c of cart) { if (c.qty > avail(prod(c.id))) { say("Un article n'est plus disponible en quantité suffisante"); return; } }
    const d = daysList()[day];
    const n = resas.length ? Math.max(...resas.map(r => +r.code.slice(3))) + 1 : 3001;
    const code = 'PT-' + n;
    const total = cart.reduce((a, c) => a + prod(c.id).price * c.qty, 0);
    const r = { code, prenom: form.prenom.trim(), phone: form.tel, email: form.email, day: d.short, dayLong: d.long, until: d.until.replace(/^\S+ /, ''), untilLong: d.until, slot: SLOTS[slot], gift, items: cart.map(c => ({ ...c })), status: 'prep', created: "aujourd'hui à " + hhmm() };
    const logs = cart.map(c => { const p = prod(c.id); const a = avail(p); return { pname: p.name, chip: 'dispo ' + a + ' → ' + (a - c.qty), reason: 'Réservé en ligne · ' + code, user: 'Client' }; });
    state.resas = [r, ...resas];
    state.cart = [];
    state.last = { ...r, totalLabel: fmt(total) };
    state.form = { prenom: '', tel: '', email: '' };
    state.day = null; state.slot = null; state.gift = false; state.errors = {};
    addLog(logs);
    App.go('confirm');
    say('Réservation ' + code + ' confirmée');
  },

  // --- admin: stock ---
  setUser(name) { state.user = name; persist(); rerender(); },
  setAdminTab(id) { state.adminTab = id; rerender(); },
  resetDemo() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    Object.assign(state, baseState(), seedData(), { view: 'admin' });
    say('Démo réinitialisée');
  },
  adjust(id, delta) {
    const p = prod(id); const to = p.stock + delta; if (to < 0) return;
    state.products = state.products.map(x => x.id === id ? { ...x, stock: to } : x);
    addLog([{ pname: p.name, chip: p.stock + ' → ' + to, reason: delta < 0 ? 'Vente en boutique' : 'Réassort', user: state.user }]);
    persist();
    rerender();
  },
  openAdd() { state.showAdd = true; state.editingId = null; state.np = emptyNP(); state.npErr = {}; rerender(); },
  closeAdd() { state.showAdd = false; state.editingId = null; state.np = emptyNP(); state.npErr = {}; rerender(); },
  editProduct(id) {
    const p = prod(id);
    state.showAdd = true;
    state.editingId = p.id;
    state.np = { name: p.name, maker: p.maker || '', univ: p.univ, price: String(p.price).replace('.', ','), stock: String(p.stock), min: String(p.min), img: p.img === PLACEHOLDER_IMG ? null : p.img, origine: p.origine || '' };
    state.npErr = {};
    rerender();
  },
  setNpUniv(id) { state.np.univ = id; rerender(); },
  npImg(input) {
    const f = input.files && input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const w = 600, h = Math.round(im.height * w / im.width);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        state.np.img = c.toDataURL('image/jpeg', 0.8);
        rerender();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  },
  saveProduct() {
    const np = state.np, e = {}, editId = state.editingId;
    const price = parseFloat(String(np.price).replace(',', '.'));
    const stock = parseInt(np.stock, 10), min = parseInt(np.min, 10);
    if (!np.name.trim()) e.name = 'Donnez un nom au produit';
    if (!(price > 0)) e.price = 'Un prix, ex. 12,90';
    if (!(stock >= 0) || String(np.stock).trim() === '') e.stock = 'Un nombre ≥ 0';
    if (!(min >= 0) || String(np.min).trim() === '') e.min = 'Un nombre ≥ 0';
    if (Object.keys(e).length) { state.npErr = e; rerender(); return; }
    const fields = { name: np.name.trim(), maker: np.maker.trim() || null, price: Math.round(price * 100) / 100, univ: np.univ, img: np.img || PLACEHOLDER_IMG, stock, min, origine: np.origine.trim() };
    if (editId) {
      const old = prod(editId);
      state.products = state.products.map(x => x.id === editId ? { ...x, ...fields } : x);
      addLog([{ pname: fields.name, chip: old.stock + ' → ' + stock, reason: 'Modifié', user: state.user }]);
      say('« ' + fields.name + ' » modifié');
    } else {
      const p = { id: 'p' + Date.now(), ...fields };
      state.products = [...state.products, p];
      addLog([{ pname: p.name, chip: '0 → ' + stock, reason: 'Nouveau produit', user: state.user }]);
      say('« ' + p.name + ' » ajouté au catalogue');
    }
    state.showAdd = false; state.editingId = null; state.np = emptyNP(); state.npErr = {};
    persist();
    rerender();
  },
  deleteProduct() {
    const id = state.editingId; const p = prod(id); if (!p) return;
    state.products = state.products.filter(x => x.id !== id);
    state.showAdd = false; state.editingId = null; state.np = emptyNP(); state.npErr = {};
    addLog([{ pname: p.name, chip: p.stock + ' → 0', reason: 'Produit supprimé', user: state.user }]);
    say('« ' + p.name + ' » retiré du catalogue');
    persist();
    rerender();
  },

  // --- admin: réservations ---
  setResaTab(k) { state.resaTab = k; state.sel = null; rerender(); },
  selectResa(code) { state.sel = code; rerender(); },
  setStatus(status) {
    const r = state.resas.find(x => x.code === state.sel); if (!r) return;
    const labels = { prep: 'À préparer', ready: 'Prête', done: 'Retirée', expired: 'Expirée' };
    const logs = [];
    let products = state.products;
    if (status === 'done') {
      products = products.map(p => {
        const it = r.items.find(i => i.id === p.id); if (!it) return p;
        logs.push({ pname: p.name, chip: p.stock + ' → ' + (p.stock - it.qty), reason: 'Retrait résa ' + r.code, user: state.user });
        return { ...p, stock: p.stock - it.qty };
      });
    } else {
      logs.push({ pname: 'Réservation ' + r.code + ' · ' + r.prenom, chip: labels[r.status] + ' → ' + labels[status], reason: status === 'expired' ? 'Stock remis en vente' : 'Préparée', user: state.user });
    }
    state.products = products;
    state.resas = state.resas.map(x => x.code === r.code ? { ...x, status } : x);
    addLog(logs);
    say(r.code + ' · ' + labels[status]);
    persist();
    rerender();
  },
  markReady() { App.setStatus('ready'); },
  markDone() { App.setStatus('done'); },
  markExpired() { App.setStatus('expired'); },

  setGallery(i) { state.gallery = i; rerender(); },
};
window.App = App;

// ---------------------------------------------------------------------------
// Render: shared pieces
// ---------------------------------------------------------------------------

function chip(sel, dis) {
  return { bg: dis ? '#EFE8DC' : sel ? '#29378A' : '#FBF5EA', fg: dis ? '#9A948C' : sel ? '#FFFCF6' : '#1E2552', border: dis ? '#E3DACB' : sel ? '#29378A' : '#C9C2E0' };
}

function productCard(p, onClickJs) {
  const a = avail(p) > 0;
  const u = univOf(p.univ);
  const dot = a ? GREEN : GREY;
  return `
    <button onclick="${onClickJs}" style="text-align:left;padding:0;background:none;border:0;display:flex;flex-direction:column;gap:10px;color:#1E2552;cursor:pointer">
      <div style="position:relative;width:100%">
        <img src="${esc(p.img)}" alt="${esc(p.name)}" style="width:100%;aspect-ratio:4/5;object-fit:cover;display:block;border-radius:24px;border:2px solid #29378A;filter:${a ? 'none' : 'grayscale(.6)'}">
        <span style="position:absolute;top:10px;left:10px;display:flex;align-items:center;gap:6px;background:#FFFCF6;border-radius:999px;padding:5px 10px;font-size:13px;font-weight:800;border:2px solid #29378A"><span style="width:8px;height:8px;border-radius:50%;background:${dot}"></span>${a ? 'En stock' : 'Épuisé'}</span>
      </div>
      <div style="padding:0 4px;display:flex;flex-direction:column;gap:2px">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#CC4328">${esc(p.maker || u.name)}</div>
        <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:18px;line-height:1.2">${esc(p.name)}</div>
        <div style="font-weight:800;font-size:16px">${fmt(p.price)}</div>
      </div>
    </button>`;
}

function renderHeader() {
  const open = openInfo();
  const isCat = state.view === 'catalogue';
  const isHome = state.view === 'home';
  const cartCount = state.cart.reduce((a, c) => a + c.qty, 0);
  const navBtn = (label, active, onClickJs) => `<button onclick="${onClickJs}" style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:17px;padding:9px 16px;border-radius:999px;border:2px solid ${active ? '#29378A' : 'transparent'};background:${active ? '#F3E8D6' : 'transparent'};color:#1E2552;cursor:pointer">${label}</button>`;
  return `
  <header style="position:sticky;top:0;z-index:30;background:#FBF5EA;border-bottom:2px solid #29378A">
    <div style="max-width:1240px;margin:0 auto;padding:10px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px">
      <div style="display:flex;align-items:center;gap:12px;min-width:0">
        <button onclick="App.goHome()" style="background:none;border:0;padding:0;display:flex;align-items:center;gap:12px;flex:none;cursor:pointer">
          <img src="logo.jpg" alt="Pépins &amp; Trognons" style="width:62px;height:62px;border-radius:50%;display:block;clip-path:circle(47%)">
        </button>
        <div style="display:flex;align-items:center;gap:8px;background:#FFFCF6;border:2px solid #29378A;border-radius:999px;padding:6px 14px;font-weight:700;font-size:14px;min-width:0">
          <span style="width:10px;height:10px;border-radius:50%;background:${open.open ? GREEN : '#E9604A'};box-shadow:0 0 0 3px ${open.open ? '#D5EBDD' : '#FCE3DC'};flex:none"></span>
          <span>${esc(open.label)}</span>
        </div>
      </div>
      <nav style="margin-left:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
        ${navBtn('Accueil', isHome, "App.goHome()")}
        ${navBtn('Catalogue', isCat, "App.goCatalogue('all')")}
        <button onclick="App.goCart()" style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:17px;padding:9px 16px;border-radius:999px;border:2px solid #29378A;background:#29378A;color:#FFFCF6;display:flex;align-items:center;gap:8px;cursor:pointer">
          Panier retrait
          <span style="min-width:24px;height:24px;border-radius:999px;background:#E9604A;color:#fff;font-size:14px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;padding:0 6px">${cartCount}</span>
        </button>
      </nav>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer style="background:#29378A;color:#FFFCF6">
    <div style="max-width:1240px;margin:0 auto;padding:40px 20px 90px;display:flex;flex-wrap:wrap;gap:28px 48px;align-items:flex-start">
      <img src="logo.jpg" alt="" style="width:84px;height:84px;border-radius:50%;clip-path:circle(47%)">
      <div style="display:flex;flex-direction:column;gap:4px;font-size:15px;line-height:1.5">
        <strong style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:18px">Pépins &amp; Trognons</strong>
        <span>111 Boulevard Auguste Blanqui, 75013 Paris</span>
        <span>Lundi – samedi · 10h – 19h · fermé le dimanche</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:15px;line-height:1.5">
        <a href="tel:0183929332" style="color:#FFFCF6">01 83 92 93 32</a>
        <a href="mailto:pepinsettrognons@gmail.com" style="color:#FFFCF6">pepinsettrognons@gmail.com</a>
      </div>
      <button onclick="App.goAdmin()" style="margin-left:auto;background:none;border:2px solid #FFFCF6;color:#FFFCF6;border-radius:999px;padding:9px 18px;font-weight:700;font-size:14px;cursor:pointer">Espace équipe</button>
    </div>
  </footer>`;
}

function renderModeSwitcher() {
  const isAdmin = state.view === 'admin';
  return `
  <div style="position:fixed;right:16px;bottom:16px;z-index:50;display:flex;gap:4px;background:#1E2552;border-radius:999px;padding:4px;box-shadow:0 8px 24px rgba(30,37,82,.3)">
    <button onclick="App.goHome()" style="border:0;border-radius:999px;padding:8px 14px;font-weight:800;font-size:13px;background:${isAdmin ? 'transparent' : '#FFFCF6'};color:${isAdmin ? '#FFFCF6' : '#1E2552'};cursor:pointer">Site client</button>
    <button onclick="App.goAdmin()" style="border:0;border-radius:999px;padding:8px 14px;font-weight:800;font-size:13px;background:${isAdmin ? '#FFFCF6' : 'transparent'};color:${isAdmin ? '#1E2552' : '#FFFCF6'};cursor:pointer">Espace équipe</button>
  </div>`;
}

function renderToast() {
  if (!state.toast) return '';
  return `<div class="toast" style="position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:60;background:#29378A;color:#FFFCF6;border:2px solid #FFFCF6;border-radius:999px;padding:12px 22px;font-weight:800;font-size:15px;box-shadow:0 10px 30px rgba(30,37,82,.35);max-width:calc(100vw - 32px);text-align:center">${esc(state.toast)}</div>`;
}

// ---------------------------------------------------------------------------
// Render: ACCUEIL
// ---------------------------------------------------------------------------

function renderHome() {
  const univTiles = UNIV.map(u => {
    const n = state.products.filter(x => x.univ === u.id).length;
    const countLabel = n + (n > 1 ? ' articles' : ' article') + ' à réserver en ligne';
    return `
    <button onclick="App.goCatalogue('${u.id}')" style="text-align:left;padding:0;background:#FFFCF6;border:2px solid #29378A;border-radius:28px;overflow:hidden;display:flex;flex-direction:column;color:#1E2552;cursor:pointer">
      <div style="position:relative">
        <img src="${esc(u.img)}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;border-bottom:2px solid #29378A">
        ${u.first ? `<span style="position:absolute;top:12px;right:12px;transform:rotate(4deg);background:#E9604A;color:#fff;font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;padding:6px 12px;border-radius:999px;border:2px solid #1E2552">Une première en France</span>` : ''}
      </div>
      <div style="padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px">
        <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:22px;line-height:1.15;color:#29378A">${esc(u.name)}</div>
        <div style="font-size:15px;line-height:1.4">${esc(u.subs)}</div>
        <div style="font-size:14px;font-weight:700;color:#CC4328;margin-top:4px">${countLabel}</div>
      </div>
    </button>`;
  }).join('');

  const homeProducts = state.products.slice(0, 4).map(p => productCard(p, `App.goProduct('${p.id}')`)).join('');

  const values = [
    { t: 'Transparence', d: 'Origine et composition de chaque produit.' },
    { t: 'Savoir-faire', d: 'Des entreprises historiques et artisanales.' },
    { t: 'Éco-conception', d: 'Des objets pensés pour moins peser sur la planète.' },
    { t: 'Durabilité', d: 'Du solide, fait pour durer longtemps.' },
  ].map(v => `
    <div style="background:#F3E8D6;border-radius:24px;padding:20px 22px;display:flex;flex-direction:column;gap:6px">
      <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:21px;color:#29378A"><span style="color:#E9604A">✱</span> ${v.t}</div>
      <div style="font-size:15px;line-height:1.45">${v.d}</div>
    </div>`).join('');

  const gal = ['photos/boutique/boutique-1.jpg', 'photos/boutique/boutique-2.jpg', 'photos/boutique/boutique-3.jpg', 'photos/histoire/en-boutique.jpg'];
  const galleryThumbs = gal.map((src, i) => `
    <button onclick="App.setGallery(${i})" style="padding:0;border:3px solid ${i === state.gallery ? '#E9604A' : 'transparent'};border-radius:16px;overflow:hidden;background:none;cursor:pointer">
      <img src="${src}" alt="" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block">
    </button>`).join('');

  const hours = `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:14px;background:#F3E8D6;font-weight:800"><span>Lundi – samedi</span><span>10h – 19h</span></div>
    <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:14px;background:transparent;font-weight:600"><span>Dimanche</span><span>Fermé</span></div>`;

  return `
  <main data-screen-label="01 Accueil">
    <section style="max-width:1240px;margin:0 auto;padding:48px 20px 64px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:48px;align-items:center">
      <div style="display:flex;flex-direction:column;gap:22px">
        <div style="align-self:flex-start;font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#29378A;background:#F3E8D6;border-radius:999px;padding:7px 14px">Boutique éco-responsable · Paris 13e · depuis 2020</div>
        <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(40px,5.6vw,72px);line-height:1.02;margin:0;color:#29378A;text-wrap:balance">Réservez en ligne, <span style="color:#CC4328">on vous le garde</span> en boutique.</h1>
        <p style="font-size:19px;line-height:1.55;margin:0;max-width:34em;text-wrap:pretty">90 marques et 1000 références choisies pour leur transparence, leur savoir-faire et leur durabilité. Réservez vos articles, passez les chercher au 111 bd Auguste Blanqui et payez sur place.</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          <button onclick="App.goCatalogue('all')" class="btn-primary" style="border-radius:999px">Voir le catalogue</button>
          <a href="#visite" class="btn-secondary" style="border-radius:999px">Nous rendre visite</a>
        </div>
      </div>
      <div style="position:relative;padding:0 0 40px 0">
        <img src="photos/boutique/exterior-facade.jpeg" alt="Façade de la boutique" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:36px;border:3px solid #29378A;display:block">
        <div style="position:absolute;left:-10px;bottom:0;max-width:270px;transform:rotate(-5deg);background:#1E2552;border:7px solid #E9604A;border-radius:18px;padding:16px 18px 12px;color:#FFFCF6;box-shadow:0 10px 24px rgba(30,37,82,.25)">
          <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:17px;line-height:1.25;text-transform:uppercase;letter-spacing:.02em">Ici nos produits sont fabriqués en France à 99%* et ça c'est trop cool !</div>
          <div style="font-size:13px;margin-top:8px;opacity:.9">*#100% EUROPE</div>
        </div>
      </div>
    </section>

    <section style="max-width:1240px;margin:0 auto;padding:0 20px 72px">
      <div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:24px">
        <h2 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(30px,3.6vw,44px);margin:0;color:#29378A">Nos 4 univers</h2>
        <button onclick="App.goCatalogue('all')" style="background:none;border:0;font-weight:800;font-size:16px;color:#29378A;text-decoration:underline;text-decoration-color:#E9604A;text-underline-offset:4px;cursor:pointer">Tout le catalogue →</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:18px">${univTiles}</div>
    </section>

    <section style="max-width:1240px;margin:0 auto;padding:0 20px 72px">
      <div style="background:#29378A;color:#FFFCF6;border-radius:40px;padding:clamp(28px,4vw,48px)">
        <h2 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(28px,3.4vw,40px);margin:0 0 28px">Comment ça marche ?</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:28px">
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="width:52px;height:52px;border-radius:50%;background:#E9604A;border:2px solid #FFFCF6;display:flex;align-items:center;justify-content:center;font-family:'Fredoka',sans-serif;font-weight:600;font-size:24px">1</div>
            <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:22px">Vous réservez en ligne</div>
            <div style="font-size:16px;line-height:1.5;opacity:.92">Choisissez vos articles, le jour et le créneau où vous passez.</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="width:52px;height:52px;border-radius:50%;background:#E9604A;border:2px solid #FFFCF6;display:flex;align-items:center;justify-content:center;font-family:'Fredoka',sans-serif;font-weight:600;font-size:24px">2</div>
            <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:22px">On vous le garde 3 jours</div>
            <div style="font-size:16px;line-height:1.5;opacity:.92">Simon et Christopher mettent votre réservation de côté, avec emballage cadeau si vous le souhaitez.</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="width:52px;height:52px;border-radius:50%;background:#E9604A;border:2px solid #FFFCF6;display:flex;align-items:center;justify-content:center;font-family:'Fredoka',sans-serif;font-weight:600;font-size:24px">3</div>
            <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:22px">Vous payez sur place</div>
            <div style="font-size:16px;line-height:1.5;opacity:.92">CB ou espèces, au 111 bd Auguste Blanqui. Aucun paiement en ligne.</div>
          </div>
        </div>
      </div>
    </section>

    <section style="max-width:1240px;margin:0 auto;padding:0 20px 72px">
      <h2 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(30px,3.6vw,44px);margin:0 0 24px;color:#29378A">Quelques trouvailles à réserver</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:18px">${homeProducts}</div>
    </section>

    <section style="max-width:1240px;margin:0 auto;padding:0 20px 72px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:14px">${values}</div>
    </section>

    <section style="max-width:1240px;margin:0 auto;padding:0 20px 72px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:40px;align-items:center">
        <div style="position:relative">
          <img src="photos/histoire/simon-christopher.jpg" alt="Simon et Christopher dans la boutique" style="width:100%;aspect-ratio:4/5;object-fit:cover;object-position:center 30%;border-radius:36px;border:3px solid #29378A;display:block">
          <div style="position:absolute;right:18px;top:22px;transform:rotate(6deg);background:#FFFCF6;border:2px solid #29378A;border-radius:14px;padding:8px 14px;font-family:'Fredoka',sans-serif;font-weight:600;font-size:20px;color:#29378A">Simon &amp; Christopher</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:18px">
          <div style="font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#CC4328">Notre histoire</div>
          <h2 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(30px,3.6vw,46px);line-height:1.08;margin:0;color:#29378A;text-wrap:balance">Deux enfants du quartier, une boutique comme une madeleine de Proust.</h2>
          <p style="font-size:18px;line-height:1.6;margin:0;text-wrap:pretty">Depuis juillet 2020, Simon et Christopher ont ouvert au 111 bd Auguste Blanqui la boutique qu'ils auraient voulu trouver dans le 13e : des objets du quotidien bien faits, des marques historiques et artisanales, et une épicerie fine anti-gaspi.</p>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            <span style="background:#FFFCF6;border:2px solid #29378A;border-radius:999px;padding:8px 16px;font-weight:700">4 995 avis Google</span>
            <span style="background:#FFFCF6;border:2px solid #29378A;border-radius:999px;padding:8px 16px;font-weight:700">90 marques</span>
            <span style="background:#FFFCF6;border:2px solid #29378A;border-radius:999px;padding:8px 16px;font-weight:700">1000 références</span>
          </div>
        </div>
      </div>
    </section>

    <section id="visite" style="max-width:1240px;margin:0 auto;padding:0 20px 80px">
      <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:40px;padding:clamp(20px,3vw,36px);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:32px">
        <div style="display:flex;flex-direction:column;gap:18px">
          <h2 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(28px,3.4vw,40px);margin:0;color:#29378A">Venez nous voir</h2>
          <div style="font-size:19px;line-height:1.5;font-weight:700">111 Boulevard Auguste Blanqui<br>75013 Paris</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:16px">${hours}</div>
          <div style="display:flex;flex-direction:column;gap:4px;font-size:16px">
            <a href="tel:0183929332" style="font-weight:700">01 83 92 93 32</a>
            <a href="mailto:pepinsettrognons@gmail.com">pepinsettrognons@gmail.com</a>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            <a href="https://www.google.com/maps/search/?api=1&amp;query=111+Boulevard+Auguste+Blanqui+75013+Paris" target="_blank" rel="noopener" style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:17px;padding:11px 20px;border-radius:999px;background:#29378A;color:#FFFCF6;text-decoration:none">Itinéraire</a>
            <a href="tel:0183929332" style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:17px;padding:11px 20px;border-radius:999px;border:2px solid #29378A;color:#29378A;text-decoration:none">Appeler</a>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <img src="${gal[state.gallery]}" alt="La boutique" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:28px;border:2px solid #29378A;display:block">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${galleryThumbs}</div>
        </div>
      </div>
    </section>
  </main>`;
}

// ---------------------------------------------------------------------------
// Render: CATALOGUE
// ---------------------------------------------------------------------------

function renderCatalogue() {
  const curU = state.univ === 'all' ? null : univOf(state.univ);
  const catTitle = curU ? curU.name : 'Le catalogue';
  const filters = [{ id: 'all', name: 'Tout voir' }, ...UNIV].map(u => {
    const sel = state.univ === u.id;
    const count = u.id === 'all' ? state.products.length : state.products.filter(x => x.univ === u.id).length;
    return `<button onclick="App.setUniv('${u.id}')" style="display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;padding:10px 12px;border-radius:14px;border:0;background:${sel ? '#29378A' : 'transparent'};color:${sel ? '#FFFCF6' : '#1E2552'};font-weight:700;font-size:15px;cursor:pointer;width:100%">
      <span>${esc(u.name)}</span><span style="font-weight:800;opacity:.8">${count}</span>
    </button>`;
  }).join('');

  const catList = state.products.filter(p => (state.univ === 'all' || p.univ === state.univ) && (!state.onlyAvail || avail(p) > 0));
  const productGrid = catList.map(p => productCard(p, `App.goProduct('${p.id}')`)).join('');

  const availTrack = state.onlyAvail ? GREEN : '#C9C2B6';
  const availKnob = state.onlyAvail ? '23px' : '3px';

  return `
  <main data-screen-label="02 Catalogue" style="max-width:1240px;margin:0 auto;padding:36px 20px 80px">
    <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(34px,4.4vw,56px);margin:0;color:#29378A">${esc(catTitle)}</h1>
    <p style="font-size:18px;margin:10px 0 28px;max-width:40em;line-height:1.5">Une petite sélection à réserver en ligne. <strong>+ de 1000 références</strong> vous attendent en boutique.</p>
    <div style="display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start">
      <aside style="flex:1 1 240px;max-width:100%;display:flex;flex-direction:column;gap:16px">
        <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:24px;padding:10px;display:flex;flex-direction:column;gap:4px">${filters}</div>
        <button onclick="App.toggleAvail()" style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:#FFFCF6;border:2px solid #29378A;border-radius:18px;padding:12px 14px;font-weight:700;font-size:15px;color:#1E2552;cursor:pointer">
          <span>Disponible en boutique</span>
          <span style="width:46px;height:26px;border-radius:999px;background:${availTrack};position:relative;flex:none;transition:background .2s">
            <span style="position:absolute;top:3px;left:${availKnob};width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s"></span>
          </span>
        </button>
        <div style="background:#F3E8D6;border-radius:18px;padding:14px 16px;font-size:15px;line-height:1.45">Une question sur un produit ?<br><a href="tel:0183929332" style="font-weight:800">Appelez-nous au 01 83 92 93 32</a></div>
      </aside>
      <div style="flex:999 1 520px;min-width:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr));gap:22px">
        ${productGrid}
        <div style="border:2px dashed #29378A;border-radius:24px;padding:22px;display:flex;flex-direction:column;justify-content:center;gap:12px;min-height:260px;background:#F3E8D6">
          <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:26px;line-height:1.1;color:#29378A">+ de 1000 références vous attendent en boutique</div>
          <div style="font-size:15px;line-height:1.45">Le reste de la sélection se découvre sur place, au 111 bd Auguste Blanqui.</div>
          <a href="#" onclick="App.goVisit(event)" style="font-weight:800">Horaires &amp; accès →</a>
        </div>
      </div>
    </div>
  </main>`;
}

// ---------------------------------------------------------------------------
// Render: FICHE PRODUIT
// ---------------------------------------------------------------------------

function renderProduct() {
  const p = prod(state.pid);
  if (!p) return `<main style="max-width:1140px;margin:0 auto;padding:60px 20px"><p>Produit introuvable. <button onclick="App.goCatalogue('all')" style="font-weight:800">Retour au catalogue</button></p></main>`;
  const a = avail(p) > 0;
  const u = univOf(p.univ);
  const halo = a ? '#D5EBDD' : '#ECE7E1';
  const hasOrigine = !!(p.origine && p.origine.trim());

  return `
  <main data-screen-label="03 Fiche produit" style="max-width:1140px;margin:0 auto;padding:28px 20px 80px">
    <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:15px;font-weight:700;margin-bottom:22px">
      <button onclick="App.goCatalogue('all')" style="background:none;border:0;padding:0;font-weight:700;color:#29378A;text-decoration:underline;text-decoration-color:#E9604A;text-underline-offset:3px;cursor:pointer">Catalogue</button>
      <span>›</span>
      <button onclick="App.goCatalogue('${u.id}')" style="background:none;border:0;padding:0;font-weight:700;color:#29378A;text-decoration:underline;text-decoration-color:#E9604A;text-underline-offset:3px;cursor:pointer">${esc(u.name)}</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:44px;align-items:start">
      <img src="${esc(p.img)}" alt="${esc(p.name)}" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:36px;border:3px solid #29378A;display:block">
      <div style="display:flex;flex-direction:column;gap:18px">
        <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#CC4328">${esc(p.maker || u.name)}</div>
        <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(32px,4vw,50px);line-height:1.05;margin:-8px 0 0;color:#29378A;text-wrap:balance">${esc(p.name)}</h1>
        <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:32px">${fmt(p.price)}</div>
        <div style="display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px">
          <span style="width:12px;height:12px;border-radius:50%;background:${a ? GREEN : GREY};box-shadow:0 0 0 4px ${halo}"></span>${a ? 'En stock en boutique' : 'Épuisé pour le moment'}
        </div>
        ${a ? `
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
          <div style="display:flex;align-items:center;border:2px solid #29378A;border-radius:999px;background:#FFFCF6;overflow:hidden">
            <button onclick="App.qtyDec()" style="width:48px;height:52px;border:0;background:none;font-size:22px;font-weight:800;color:#29378A;cursor:pointer">−</button>
            <span style="min-width:34px;text-align:center;font-weight:800;font-size:18px">${state.qty}</span>
            <button onclick="App.qtyInc()" style="width:48px;height:52px;border:0;background:none;font-size:22px;font-weight:800;color:#29378A;cursor:pointer">+</button>
          </div>
          <button onclick="App.addToCart()" class="btn-primary" style="flex:1 1 220px;border-radius:999px;font-size:20px">Réserver pour retrait</button>
        </div>` : `
        <div style="background:#F3E8D6;border-radius:18px;padding:16px 18px;font-size:16px;line-height:1.5">Épuisé pour le moment. Appelez-nous au <a href="tel:0183929332" style="font-weight:800">01 83 92 93 32</a> pour savoir quand il revient.</div>`}
        <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:24px;padding:18px 20px;display:flex;flex-direction:column;gap:10px;font-size:16px;line-height:1.4">
          <div style="display:flex;gap:10px"><span style="color:#E9604A;font-weight:800">✱</span><span>Retrait au <strong>111 bd Auguste Blanqui</strong>, Paris 13e</span></div>
          <div style="display:flex;gap:10px"><span style="color:#E9604A;font-weight:800">✱</span><span>Gardé <strong>3 jours</strong> à partir du jour choisi</span></div>
          <div style="display:flex;gap:10px"><span style="color:#E9604A;font-weight:800">✱</span><span>Paiement sur place : <strong>CB ou espèces</strong></span></div>
          <div style="display:flex;gap:10px"><span style="color:#E9604A;font-weight:800">✱</span><span>Emballage cadeau sur demande</span></div>
        </div>
        ${hasOrigine ? `
        <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:18px;padding:14px 16px;display:flex;flex-direction:column;gap:4px">
          <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#CC4328">Origine &amp; composition</div>
          <div style="font-size:15px;line-height:1.5;white-space:pre-wrap">${esc(p.origine)}</div>
        </div>` : `
        <div style="border:2px dashed #E9604A;border-radius:18px;padding:12px 16px;font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.5;color:#1E2552">Origine &amp; composition : à compléter avec Simon et Christopher</div>`}
      </div>
    </div>
  </main>`;
}

// ---------------------------------------------------------------------------
// Render: PANIER + FORMULAIRE
// ---------------------------------------------------------------------------

function renderCart() {
  if (state.cart.length === 0) {
    return `
    <main data-screen-label="04 Panier retrait" style="max-width:1140px;margin:0 auto;padding:36px 20px 80px">
      <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(34px,4.4vw,52px);margin:0 0 26px;color:#29378A">Votre panier de retrait</h1>
      <div style="background:#FFFCF6;border:2px dashed #29378A;border-radius:28px;padding:40px 24px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
        <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:24px">Votre panier est vide pour l'instant.</div>
        <button onclick="App.goCatalogue('all')" class="btn-primary" style="border-radius:999px;font-size:18px;padding:12px 24px">Voir le catalogue</button>
      </div>
    </main>`;
  }

  const cartItems = state.cart.map(c => {
    const x = prod(c.id);
    return `
    <div style="display:flex;gap:14px;align-items:center;background:#FFFCF6;border:2px solid #29378A;border-radius:22px;padding:12px">
      <img src="${esc(x.img)}" alt="" style="width:76px;height:92px;object-fit:cover;border-radius:14px;flex:none">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:17px;line-height:1.2">${esc(x.name)}</div>
        <div style="font-size:14px">${fmt(x.price)} l'unité</div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
          <div style="display:flex;align-items:center;border:2px solid #29378A;border-radius:999px;overflow:hidden">
            <button onclick="App.cartDec('${c.id}')" style="width:34px;height:32px;border:0;background:none;font-weight:800;color:#29378A;cursor:pointer">−</button>
            <span style="min-width:22px;text-align:center;font-weight:800">${c.qty}</span>
            <button onclick="App.cartInc('${c.id}')" style="width:34px;height:32px;border:0;background:none;font-weight:800;color:#29378A;cursor:pointer">+</button>
          </div>
          <button onclick="App.cartRemove('${c.id}')" style="background:none;border:0;font-size:14px;font-weight:700;color:#CC4328;text-decoration:underline;cursor:pointer">Retirer</button>
        </div>
      </div>
      <div style="font-weight:800;font-size:17px;white-space:nowrap">${fmt(x.price * c.qty)}</div>
    </div>`;
  }).join('');

  const cartTotal = state.cart.reduce((a, c) => a + prod(c.id).price * c.qty, 0);

  const days = daysList();
  const dayChips = days.map((d, i) => {
    const c = chip(state.day === i, d.closed);
    return `<button onclick="${d.closed ? '' : `App.selectDay(${i})`}" ${d.closed ? 'disabled' : ''} style="min-width:74px;padding:8px 10px;border-radius:16px;border:2px solid ${c.border};background:${c.bg};color:${c.fg};display:flex;flex-direction:column;align-items:center;gap:1px;cursor:${d.closed ? 'not-allowed' : 'pointer'}">
      <span style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:15px">${d.closed ? 'Fermé' : d.top}</span>
      <span style="font-size:13px;font-weight:700">${d.bottom}</span>
    </button>`;
  }).join('');

  const slotChips = SLOTS.map((l, i) => {
    const c = chip(state.slot === i, false);
    return `<button onclick="App.selectSlot(${i})" style="padding:10px 14px;border-radius:999px;border:2px solid ${c.border};background:${c.bg};color:${c.fg};font-weight:700;font-size:14px;cursor:pointer">${l}</button>`;
  }).join('');

  const holdNote = state.day !== null
    ? 'On vous garde votre réservation jusqu’au ' + days[state.day].until + ' au soir.'
    : "On vous garde votre réservation 3 jours à partir du jour choisi. Commandé après 18h ? Elle sera prête le lendemain.";

  const errors = Object.assign({ prenom: '', tel: '', email: '', day: '', slot: '' }, state.errors);
  const bColor = k => errors[k] ? '#E9604A' : '#C9C2E0';
  const giftBg = state.gift ? '#CC4328' : '#FFFCF6';
  const giftMark = state.gift ? '✓' : '';

  return `
  <main data-screen-label="04 Panier retrait" style="max-width:1140px;margin:0 auto;padding:36px 20px 80px">
    <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(34px,4.4vw,52px);margin:0 0 26px;color:#29378A">Votre panier de retrait</h1>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:28px;align-items:start">
      <div style="display:flex;flex-direction:column;gap:14px">
        ${cartItems}
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:14px 6px;border-top:2px solid #29378A">
          <span style="font-weight:700;font-size:16px">À régler sur place</span>
          <span style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:28px">${fmt(cartTotal)}</span>
        </div>
        <div style="background:#F3E8D6;border-radius:18px;padding:14px 16px;font-size:15px;line-height:1.5">Aucun paiement en ligne. Vous réglez en boutique, en <strong>CB ou en espèces</strong>, au moment du retrait.</div>
      </div>

      <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:28px;padding:clamp(18px,3vw,28px);display:flex;flex-direction:column;gap:18px">
        <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:24px;color:#29378A">Vos coordonnées</div>
        <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px">Prénom
          <input id="field-form-prenom" value="${esc(state.form.prenom)}" oninput="App.setField('form.prenom', this.value)" placeholder="Camille" style="font-size:17px;padding:12px 16px;border-radius:14px;border:2px solid ${bColor('prenom')};background:#FBF5EA;color:#1E2552;outline:none">
          <span style="font-size:13px;color:#CC4328">${esc(errors.prenom)}</span>
        </label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:14px">
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px">Téléphone
            <input id="field-form-tel" value="${esc(state.form.tel)}" oninput="App.setField('form.tel', this.value)" placeholder="06 12 34 56 78" inputmode="tel" style="font-size:17px;padding:12px 16px;border-radius:14px;border:2px solid ${bColor('tel')};background:#FBF5EA;color:#1E2552;outline:none">
            <span style="font-size:13px;color:#CC4328">${esc(errors.tel)}</span>
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px">Email
            <input id="field-form-email" value="${esc(state.form.email)}" oninput="App.setField('form.email', this.value)" placeholder="camille@exemple.fr" inputmode="email" style="font-size:17px;padding:12px 16px;border-radius:14px;border:2px solid ${bColor('email')};background:#FBF5EA;color:#1E2552;outline:none">
            <span style="font-size:13px;color:#CC4328">${esc(errors.email)}</span>
          </label>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="font-weight:700;font-size:15px">Jour de passage</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${dayChips}</div>
          <span style="font-size:13px;color:#CC4328">${esc(errors.day)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="font-weight:700;font-size:15px">Créneau</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${slotChips}</div>
          <span style="font-size:13px;color:#CC4328">${esc(errors.slot)}</span>
          <div style="font-size:14px;line-height:1.45">${holdNote}</div>
        </div>
        <button onclick="App.toggleGift()" style="display:flex;align-items:center;gap:12px;text-align:left;background:#F3E8D6;border:0;border-radius:16px;padding:14px 16px;color:#1E2552;cursor:pointer">
          <span style="width:24px;height:24px;border-radius:8px;border:2px solid #29378A;background:${giftBg};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex:none">${giftMark}</span>
          <span style="display:flex;flex-direction:column"><strong style="font-size:15px">C'est pour offrir</strong><span style="font-size:14px">On vous fait un emballage cadeau en boutique.</span></span>
        </button>
        <button onclick="App.submit()" class="btn-primary" style="border-radius:999px;font-size:20px;padding:15px 24px">Confirmer ma réservation</button>
      </div>
    </div>
  </main>`;
}

// ---------------------------------------------------------------------------
// Render: CONFIRMATION
// ---------------------------------------------------------------------------

function renderConfirm() {
  const last = state.last;
  if (!last) return `<main style="max-width:720px;margin:0 auto;padding:60px 20px"><p>Aucune réservation récente. <button onclick="App.goCatalogue('all')" style="font-weight:800">Voir le catalogue</button></p></main>`;
  const holdLabel = last.untilLong ? "jusqu'au " + last.untilLong + ' au soir' : '3 jours';
  const giftLabel = last.gift ? 'Emballage cadeau : oui' : 'Sans emballage cadeau';
  const items = last.items.map(i => {
    const x = prod(i.id);
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 4px;border-bottom:1px dashed #29378A">
      <img src="${esc(x.img)}" alt="" style="width:44px;height:54px;object-fit:cover;border-radius:10px">
      <span style="flex:1;font-weight:700">${i.qty} × ${esc(x.name)}</span>
      <span style="font-weight:800">${fmt(x.price * i.qty)}</span>
    </div>`;
  }).join('');

  return `
  <main data-screen-label="05 Confirmation" style="max-width:720px;margin:0 auto;padding:40px 20px 80px;display:flex;flex-direction:column;gap:22px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
      <div style="width:76px;height:76px;border-radius:50%;background:#3E8F5E;color:#fff;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;border:3px solid #1E2552">✓</div>
      <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(32px,4.4vw,48px);margin:0;color:#29378A">C'est réservé, ${esc(last.prenom)} !</h1>
      <p style="font-size:17px;margin:0;line-height:1.5">Un récapitulatif part à ${esc(last.email)}. On vous garde tout ça ${holdLabel}.</p>
    </div>
    <div style="background:#1E2552;color:#FFFCF6;border:6px solid #E9604A;border-radius:24px;padding:22px;text-align:center;display:flex;flex-direction:column;gap:6px">
      <div style="font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Code de réservation</div>
      <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:clamp(44px,8vw,64px);letter-spacing:.06em">${esc(last.code)}</div>
      <div style="font-size:15px">À donner en caisse, ou simplement votre prénom.</div>
    </div>
    <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:24px;padding:20px 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:18px">
      <div style="display:flex;flex-direction:column;gap:4px">
        <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#CC4328">Retrait</div>
        <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:20px">${esc(last.dayLong)}</div>
        <div style="font-size:15px">${esc(last.slot)}</div>
        <div style="font-size:15px;margin-top:6px">111 bd Auguste Blanqui, 75013 Paris</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#CC4328">Paiement sur place</div>
        <div style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:20px">${esc(last.totalLabel)}</div>
        <div style="font-size:15px">CB ou espèces</div>
        <div style="font-size:15px;margin-top:6px">${giftLabel}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">${items}</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
      <button onclick="App.goCatalogue('all')" class="btn-secondary" style="border-radius:999px;font-size:18px;padding:12px 22px">Continuer mes trouvailles</button>
      <button onclick="App.goAdminResa()" style="font-family:'Fredoka',sans-serif;font-weight:500;font-size:18px;padding:12px 22px;border-radius:999px;background:#29378A;color:#FFFCF6;border:2px solid #29378A;cursor:pointer">Voir côté équipe →</button>
    </div>
  </main>`;
}

// ---------------------------------------------------------------------------
// Render: DASHBOARD (admin)
// ---------------------------------------------------------------------------

function renderAdmin() {
  const counts = { ok: 0, low: 0, out: 0 };
  const statusOf = x => x.stock === 0 ? 'out' : x.stock <= x.min ? 'low' : 'ok';
  state.products.forEach(x => counts[statusOf(x)]++);
  const rc = st => state.resas.filter(r => r.status === st).length;

  const navEntries = [['stock', 'Stock', counts.low + counts.out], ['resa', 'Réservations', rc('prep')], ['log', 'Historique', 0]];
  const adminNav = navEntries.map(([id, label, b]) => `
    <button onclick="App.setAdminTab('${id}')" style="display:flex;justify-content:space-between;align-items:center;text-align:left;padding:11px 14px;border-radius:14px;border:0;background:${state.adminTab === id ? '#FFFCF6' : 'transparent'};color:${state.adminTab === id ? '#29378A' : '#FFFCF6'};font-family:'Fredoka',sans-serif;font-weight:500;font-size:17px;cursor:pointer">
      <span>${label}</span>
      <span style="font-family:'Nunito',sans-serif;font-size:13px;font-weight:800;background:#E9604A;color:#fff;border-radius:999px;padding:1px 8px;display:${b ? 'inline-block' : 'none'}">${b}</span>
    </button>`).join('');

  const users = ['Simon', 'Christopher'].map(n => `
    <button onclick="App.setUser('${n}')" style="flex:1;border:0;border-radius:999px;padding:8px 10px;background:${state.user === n ? '#FFFCF6' : 'transparent'};color:${state.user === n ? '#29378A' : '#FFFCF6'};font-weight:800;font-size:14px;cursor:pointer">${n}</button>`).join('');

  let tabContent = '';
  if (state.adminTab === 'stock') tabContent = renderAdminStock(counts, statusOf);
  else if (state.adminTab === 'resa') tabContent = renderAdminResa(rc);
  else tabContent = renderAdminLog();

  // Sous ~850px, la barre latérale devient une barre horizontale en haut
  // (position relative, hauteur auto, nav en ligne) plutôt qu'une colonne
  // fixe sur toute la hauteur de l'écran, pour rester utilisable au doigt.
  const vw = viewportWidth();
  const compact = vw < 850;
  const asideStyle = compact
    ? 'gap:14px;position:relative;height:auto'
    : 'gap:22px;position:sticky;height:100vh';
  const navDir = compact ? 'row' : 'column';

  return `
  <div data-screen-label="06 Dashboard" style="display:flex;flex-wrap:wrap;min-height:100vh;align-items:stretch">
    <aside style="flex:1 1 230px;max-width:100%;background:#29378A;color:#FFFCF6;padding:22px 16px;display:flex;flex-direction:column;${asideStyle};top:0;z-index:25;align-self:flex-start;overflow-y:auto">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="logo.jpg" alt="" style="width:52px;height:52px;border-radius:50%;clip-path:circle(47%)">
        <div style="display:flex;flex-direction:column"><strong style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:18px">Espace équipe</strong><span style="font-size:13px;opacity:.85">111 bd Auguste Blanqui</span></div>
      </div>
      <nav style="display:flex;flex-direction:${navDir};flex-wrap:wrap;gap:4px">${adminNav}</nav>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Connecté en tant que</div>
        <div style="display:flex;gap:6px;background:rgba(255,252,246,.12);border-radius:999px;padding:4px">${users}</div>
      </div>
      <div style="margin-top:auto;display:flex;flex-direction:${navDir};flex-wrap:wrap;gap:8px">
        <button onclick="App.goHome()" style="background:#FFFCF6;color:#29378A;border:0;border-radius:999px;padding:10px 14px;font-weight:800;font-size:14px;cursor:pointer">← Voir le site</button>
        <button onclick="App.resetDemo()" style="background:none;color:#FFFCF6;border:1px solid rgba(255,252,246,.5);border-radius:999px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer">Réinitialiser la démo</button>
      </div>
    </aside>
    <main style="flex:999 1 600px;min-width:0;padding:clamp(18px,3vw,36px);display:flex;flex-direction:column;gap:22px">${tabContent}</main>
  </div>`;
}

function renderAdminStock(counts, statusOf) {
  const today = new Date();
  const todayLabel = DL[today.getDay()] + ' ' + today.getDate() + ' ' + M[today.getMonth()];

  let addForm = '';
  if (state.showAdd) {
    const np = state.np;
    const npErr = Object.assign({ name: '', price: '', stock: '', min: '' }, state.npErr);
    const bColor = k => npErr[k] ? '#E9604A' : '#C9C2E0';
    const imgShown = np.img || PLACEHOLDER_IMG;
    const imgLabel = np.img ? 'Changer la photo' : 'Ajouter une photo';
    const formTitle = state.editingId ? 'Modifier le produit' : 'Nouveau produit';
    const saveLabel = state.editingId ? 'Enregistrer' : 'Ajouter au catalogue';
    const footNote = state.editingId
      ? 'Les modifications sont signées ' + state.user + ' dans l’historique.'
      : 'Le produit apparaît tout de suite dans le catalogue en ligne, et l’ajout est signé ' + state.user + ' dans l’historique.';
    const univChips = UNIV.map(u => {
      const c = chip(np.univ === u.id, false);
      return `<button onclick="App.setNpUniv('${u.id}')" style="padding:9px 14px;border-radius:999px;border:2px solid ${c.border};background:${c.bg};color:${c.fg};font-weight:700;font-size:14px;cursor:pointer">${esc(u.name)}</button>`;
    }).join('');

    addForm = `
    <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:24px;padding:clamp(16px,2.6vw,24px);display:flex;flex-direction:column;gap:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:24px;color:#29378A">${formTitle}</div>
        <button onclick="App.closeAdd()" style="background:none;border:0;font-weight:800;font-size:14px;color:#29378A;text-decoration:underline;cursor:pointer">Annuler</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">
        <label style="flex:0 0 150px;display:flex;flex-direction:column;gap:8px;cursor:pointer">
          <img src="${imgShown}" alt="" style="width:150px;aspect-ratio:4/5;object-fit:cover;border-radius:18px;border:2px dashed #29378A;display:block;background:#F3E8D6">
          <span style="font-size:14px;font-weight:800;color:#29378A;text-align:center;text-decoration:underline;text-decoration-color:#E9604A">${imgLabel}</span>
          <input type="file" accept="image/*" onchange="App.npImg(this)" style="display:none">
        </label>
        <div style="flex:1 1 320px;min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:14px">
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px;grid-column:1/-1">Nom du produit
            <input id="field-np-name" value="${esc(np.name)}" oninput="App.setField('np.name', this.value)" placeholder="Ex. Brosse à vaisselle en hêtre" style="font-size:16px;padding:11px 14px;border-radius:14px;border:2px solid ${bColor('name')};background:#FBF5EA;color:#1E2552;outline:none">
            <span style="font-size:13px;color:#CC4328">${esc(npErr.name)}</span>
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px">Marque / fabricant <span style="font-weight:600;font-size:13px;margin-top:-4px">facultatif</span>
            <input id="field-np-maker" value="${esc(np.maker)}" oninput="App.setField('np.maker', this.value)" placeholder="Ex. Nogent" style="font-size:16px;padding:11px 14px;border-radius:14px;border:2px solid #C9C2E0;background:#FBF5EA;color:#1E2552;outline:none">
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px">Prix (€)
            <input id="field-np-price" value="${esc(np.price)}" oninput="App.setField('np.price', this.value)" placeholder="12,90" inputmode="decimal" style="font-size:16px;padding:11px 14px;border-radius:14px;border:2px solid ${bColor('price')};background:#FBF5EA;color:#1E2552;outline:none">
            <span style="font-size:13px;color:#CC4328">${esc(npErr.price)}</span>
          </label>
          <div style="display:flex;flex-direction:column;gap:8px;grid-column:1/-1">
            <span style="font-weight:700;font-size:15px">Univers</span>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${univChips}</div>
          </div>
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px">Stock initial
            <input id="field-np-stock" value="${esc(np.stock)}" oninput="App.setField('np.stock', this.value)" placeholder="0" inputmode="numeric" style="font-size:16px;padding:11px 14px;border-radius:14px;border:2px solid ${bColor('stock')};background:#FBF5EA;color:#1E2552;outline:none">
            <span style="font-size:13px;color:#CC4328">${esc(npErr.stock)}</span>
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px">Seuil de stock bas
            <input id="field-np-min" value="${esc(np.min)}" oninput="App.setField('np.min', this.value)" placeholder="3" inputmode="numeric" style="font-size:16px;padding:11px 14px;border-radius:14px;border:2px solid ${bColor('min')};background:#FBF5EA;color:#1E2552;outline:none">
            <span style="font-size:13px;color:#CC4328">${esc(npErr.min)}</span>
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-weight:700;font-size:15px;grid-column:1/-1">Origine &amp; composition <span style="font-weight:600;font-size:13px;margin-top:-4px">facultatif — affiché sur la fiche produit</span>
            <textarea id="field-np-origine" oninput="App.setField('np.origine', this.value)" placeholder="Ex. Fabriqué en France, bois de hêtre certifié PEFC…" rows="3" style="font-size:15px;line-height:1.4;padding:11px 14px;border-radius:14px;border:2px solid #C9C2E0;background:#FBF5EA;color:#1E2552;outline:none;resize:vertical;font-family:inherit">${esc(np.origine)}</textarea>
          </label>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;border-top:1px dashed #29378A;padding-top:14px">
        <span style="font-size:14px">${footNote}</span>
        <span style="display:flex;gap:10px">
          ${state.editingId ? `<button onclick="App.deleteProduct()" style="font-weight:700;font-size:15px;padding:11px 16px;border-radius:999px;background:none;color:#A8341D;border:2px solid #E9604A;cursor:pointer">Supprimer</button>` : ''}
          <button onclick="App.saveProduct()" style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px;padding:11px 22px;border-radius:999px;background:#29378A;color:#FFFCF6;border:0;cursor:pointer">${saveLabel}</button>
        </span>
      </div>
    </div>`;
  }

  const kpis = [
    { label: 'Unités en rayon', value: state.products.reduce((a, x) => a + x.stock, 0), color: '#29378A' },
    { label: 'Stock bas', value: counts.low, color: '#B06E00' },
    { label: 'Épuisés', value: counts.out, color: '#CC4328' },
    { label: 'Résas à préparer', value: rcCount('prep'), color: '#29378A' },
  ].map(k => `
    <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:22px;padding:16px 18px;display:flex;flex-direction:column;gap:4px">
      <span style="font-size:14px;font-weight:700;white-space:nowrap">${k.label}</span>
      <span style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:34px;color:${k.color}">${k.value}</span>
    </div>`).join('');

  const bar = ['ok', 'low', 'out'].map(k => ({ label: ST[k].l, n: counts[k], c: ST[k].c, w: (state.products.length ? counts[k] / state.products.length * 100 : 0) + '%' }));
  const barBlocks = bar.map(b => `<span style="width:${b.w};background:${b.c};transition:width .3s"></span>`).join('');
  const barLegend = bar.map(b => `<span style="display:flex;align-items:center;gap:6px;white-space:nowrap"><span style="width:12px;height:12px;border-radius:4px;background:${b.c};flex:none"></span>${b.label} · ${b.n}</span>`).join('');

  const rows = state.products.map(x => {
    const st = ST[statusOf(x)];
    const u = univOf(x.univ);
    return `
    <div style="display:grid;grid-template-columns:minmax(220px,2.4fr) 1fr 1fr 1fr 1fr 1.1fr 140px;gap:10px;padding:10px 16px;align-items:center;border-bottom:1px solid #F3E8D6;font-size:15px">
      <button onclick="App.editProduct('${x.id}')" style="display:flex;align-items:center;gap:10px;min-width:0;text-align:left;background:none;border:0;padding:0;color:#1E2552;cursor:pointer">
        <img src="${esc(x.img)}" alt="" style="width:38px;height:46px;object-fit:cover;border-radius:9px;flex:none">
        <span style="display:flex;flex-direction:column;min-width:0"><strong style="font-size:15px;line-height:1.2;color:#29378A">${esc(x.name)}</strong><span style="font-size:13px">${esc(u.name)}</span></span>
      </button>
      <span style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:20px">${x.stock}</span>
      <span style="font-weight:700">${reserved(x.id)}</span>
      <span style="font-weight:700">${avail(x)}</span>
      <span style="font-weight:700">${x.min}</span>
      <span><span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:800;background:${st.bg};color:${st.fg};white-space:nowrap">${st.l}</span></span>
      <span style="display:flex;gap:6px">
        <button onclick="App.adjust('${x.id}', -1)" title="Vente en boutique" style="width:40px;height:36px;border-radius:12px;border:2px solid #29378A;background:#FFFCF6;font-weight:800;font-size:18px;color:#29378A;cursor:pointer">−1</button>
        <button onclick="App.adjust('${x.id}', 1)" title="Réassort" style="width:40px;height:36px;border-radius:12px;border:2px solid #29378A;background:#29378A;font-weight:800;font-size:18px;color:#FFFCF6;cursor:pointer">+1</button>
      </span>
    </div>`;
  }).join('');

  // Sous 700px la table est illisible : chaque produit devient une carte
  // empilée, avec les 4 chiffres en grille et les boutons d'ajustement
  // pleine largeur pour rester utilisables au doigt.
  const cards = state.products.map(x => {
    const st = ST[statusOf(x)];
    const u = univOf(x.univ);
    return `
    <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="App.editProduct('${x.id}')" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;text-align:left;background:none;border:0;padding:0;color:#1E2552;cursor:pointer">
          <img src="${esc(x.img)}" alt="" style="width:46px;height:56px;object-fit:cover;border-radius:10px;flex:none">
          <span style="display:flex;flex-direction:column;min-width:0"><strong style="font-size:15px;line-height:1.2;color:#29378A">${esc(x.name)}</strong><span style="font-size:13px">${esc(u.name)}</span></span>
        </button>
        <span style="padding:4px 10px;border-radius:999px;font-size:13px;font-weight:800;background:${st.bg};color:${st.fg};white-space:nowrap;flex:none">${st.l}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center">
        <span style="background:#F3E8D6;border-radius:12px;padding:6px 4px;display:flex;flex-direction:column"><strong style="font-family:'Fredoka',sans-serif;font-size:20px">${x.stock}</strong><span style="font-size:11px;font-weight:800">En rayon</span></span>
        <span style="background:#F3E8D6;border-radius:12px;padding:6px 4px;display:flex;flex-direction:column"><strong style="font-family:'Fredoka',sans-serif;font-size:20px">${reserved(x.id)}</strong><span style="font-size:11px;font-weight:800">Réservé</span></span>
        <span style="background:#F3E8D6;border-radius:12px;padding:6px 4px;display:flex;flex-direction:column"><strong style="font-family:'Fredoka',sans-serif;font-size:20px">${avail(x)}</strong><span style="font-size:11px;font-weight:800">Dispo</span></span>
        <span style="background:#F3E8D6;border-radius:12px;padding:6px 4px;display:flex;flex-direction:column"><strong style="font-family:'Fredoka',sans-serif;font-size:20px">${x.min}</strong><span style="font-size:11px;font-weight:800">Seuil</span></span>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="App.adjust('${x.id}', -1)" style="flex:1;height:44px;border-radius:14px;border:2px solid #29378A;background:#FFFCF6;font-weight:800;font-size:16px;color:#29378A;cursor:pointer">−1 Vente</button>
        <button onclick="App.adjust('${x.id}', 1)" style="flex:1;height:44px;border-radius:14px;border:2px solid #29378A;background:#29378A;font-weight:800;font-size:16px;color:#FFFCF6;cursor:pointer">+1 Réassort</button>
      </div>
    </div>`;
  }).join('');

  const narrow = viewportWidth() < 700;
  const stockList = narrow
    ? `<div style="display:flex;flex-direction:column;gap:10px">${cards}</div>`
    : `
    <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:22px;overflow-x:auto">
      <div style="min-width:760px">
        <div style="display:grid;grid-template-columns:minmax(220px,2.4fr) 1fr 1fr 1fr 1fr 1.1fr 140px;gap:10px;padding:12px 16px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-bottom:2px solid #29378A">
          <span>Article</span><span>En rayon</span><span>Réservé</span><span>Dispo</span><span>Seuil bas</span><span>Statut</span><span>Ajuster</span>
        </div>
        ${rows}
      </div>
    </div>`;

  return `
  <div data-screen-label="06 Stock" style="display:flex;flex-direction:column;gap:22px">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:10px">
      <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:36px;margin:0;color:#29378A">Stock</h1>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">
        <span style="font-size:15px;font-weight:700">Bonjour ${esc(state.user)} · ${todayLabel}</span>
        <button onclick="App.openAdd()" class="btn-primary" style="border-radius:999px;font-size:17px;padding:10px 18px;box-shadow:3px 3px 0 #29378A">+ Ajouter un produit</button>
      </div>
    </div>
    ${addForm}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:14px">${kpis}</div>
    <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:22px;padding:16px 18px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;height:18px;border-radius:999px;overflow:hidden;background:#F3E8D6">${barBlocks}</div>
      <div style="display:flex;flex-wrap:wrap;gap:18px;font-size:14px;font-weight:700">${barLegend}</div>
    </div>
    ${stockList}
    <div style="font-size:14px;line-height:1.5">−1 = vente en boutique, +1 = réassort. Chaque ajustement est signé ${esc(state.user)} dans l'historique. Les articles réservés sont mis de côté : ils restent en rayon mais ne sont plus proposés en ligne.</div>
  </div>`;
}

function rcCount(st) { return state.resas.filter(r => r.status === st).length; }

function renderAdminResa(rc) {
  const tabs = ['prep', 'ready', 'done', 'expired'].map(k => `
    <button onclick="App.setResaTab('${k}')" style="padding:9px 16px;border-radius:999px;border:2px solid #29378A;background:${state.resaTab === k ? '#29378A' : '#FFFCF6'};color:${state.resaTab === k ? '#FFFCF6' : '#29378A'};font-weight:800;font-size:15px;cursor:pointer">${RS[k].l} · ${rc(k)}</button>`).join('');

  const rowsData = state.resas.filter(r => r.status === state.resaTab);
  const rows = rowsData.map(r => {
    const itemsLabel = r.items.map(i => i.qty + ' × ' + prod(i.id).name).join(', ');
    const slotShort = r.slot.split(' · ')[0];
    const border = state.sel === r.code ? '#E9604A' : '#E3DACB';
    return `
    <button onclick="App.selectResa('${r.code}')" style="text-align:left;display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:20px;border:2px solid ${border};background:#FFFCF6;color:#1E2552;cursor:pointer">
      <span style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><strong style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:19px">${esc(r.prenom)}</strong><span style="font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700">${esc(r.code)}</span></span>
      <span style="font-size:14px">${esc(itemsLabel)}</span>
      <span style="display:flex;flex-wrap:wrap;gap:6px;font-size:13px;font-weight:700">
        <span style="background:#F3E8D6;border-radius:999px;padding:3px 10px">${esc(r.day)}</span>
        <span style="background:#F3E8D6;border-radius:999px;padding:3px 10px">${esc(slotShort)}</span>
        <span style="background:#FCE3DC;color:#A8341D;border-radius:999px;padding:3px 10px;display:${r.gift ? 'inline-block' : 'none'}">Emballage cadeau</span>
      </span>
    </button>`;
  }).join('') || `<div style="border:2px dashed #29378A;border-radius:20px;padding:24px;text-align:center;font-weight:700">Rien ici pour le moment.</div>`;

  const selR = state.resas.find(r => r.code === state.sel && r.status === state.resaTab) || null;
  let detail = '';
  if (selR) {
    const rTotal = selR.items.reduce((a, i) => a + prod(i.id).price * i.qty, 0);
    const items = selR.items.map(i => { const x = prod(i.id); return `
      <div style="display:flex;align-items:center;gap:10px;font-size:15px">
        <img src="${esc(x.img)}" alt="" style="width:36px;height:44px;object-fit:cover;border-radius:8px">
        <span style="flex:1;font-weight:700">${i.qty} × ${esc(x.name)}</span><span style="font-weight:800">${fmt(x.price * i.qty)}</span>
      </div>`; }).join('');
    const canReady = selR.status === 'prep', canDone = selR.status === 'ready', canExpire = selR.status === 'prep' || selR.status === 'ready';
    detail = `
    <div style="flex:1 1 300px;min-width:0;background:#FFFCF6;border:2px solid #29378A;border-radius:24px;padding:20px;display:flex;flex-direction:column;gap:14px;position:sticky;top:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <span style="font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:15px">${esc(selR.code)}</span>
        <span style="padding:4px 10px;border-radius:999px;font-size:13px;font-weight:800;background:${RS[selR.status].bg};color:${RS[selR.status].fg}">${RS[selR.status].l}</span>
      </div>
      <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:26px;color:#29378A">${esc(selR.prenom)}</div>
      <div style="display:flex;flex-direction:column;gap:2px;font-size:15px">
        <a href="tel:${esc(selR.phone.replace(/\s/g, ''))}" style="font-weight:700">${esc(selR.phone)}</a>
        <span>${esc(selR.email)}</span>
      </div>
      <div style="background:#F3E8D6;border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:2px;font-size:15px">
        <strong>Passage : ${esc(selR.day)}</strong>
        <span>${esc(selR.slot)}</span>
        <span style="font-size:13px">Réservée ${esc(selR.created)} · gardée jusqu'au ${esc(selR.untilLong || selR.until)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">${items}</div>
      <div style="display:flex;justify-content:space-between;font-weight:800;border-top:2px solid #29378A;padding-top:10px"><span>À encaisser</span><span>${fmt(rTotal)}</span></div>
      ${selR.gift ? `<div style="background:#FCE3DC;color:#A8341D;border-radius:14px;padding:10px 12px;font-weight:800;font-size:14px">Emballage cadeau demandé</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:8px">
        ${canReady ? `<button onclick="App.markReady()" style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px;padding:12px 16px;border-radius:999px;background:#29378A;color:#FFFCF6;border:0;cursor:pointer">Marquer comme prête</button>` : ''}
        ${canDone ? `<button onclick="App.markDone()" style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px;padding:12px 16px;border-radius:999px;background:#3E8F5E;color:#fff;border:0;cursor:pointer">Marquer comme retirée et payée</button>` : ''}
        ${canExpire ? `<button onclick="App.markExpired()" style="font-weight:700;font-size:14px;padding:10px 16px;border-radius:999px;background:none;color:#A8341D;border:2px solid #E9604A;cursor:pointer">Expirée · remettre en vente</button>` : ''}
      </div>
    </div>`;
  }

  return `
  <div data-screen-label="07 Réservations" style="display:flex;flex-direction:column;gap:18px">
    <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:36px;margin:0;color:#29378A">Réservations</h1>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${tabs}</div>
    <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start">
      <div style="flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:10px">${rows}</div>
      ${detail}
    </div>
  </div>`;
}

function renderAdminLog() {
  const groups = [];
  state.log.forEach(e => {
    let g = groups.find(g => g.day === e.day);
    if (!g) { g = { day: e.day, entries: [] }; groups.push(g); }
    g.entries.push(e);
  });
  const avBg = user => user === 'Simon' ? '#29378A' : user === 'Christopher' ? '#CC4328' : '#7D8F5E';

  const blocks = groups.map(g => {
    const entries = g.entries.map(e => `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:12px 16px;border-bottom:1px solid #F3E8D6">
        <span style="font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;width:44px">${esc(e.time)}</span>
        <strong style="flex:1 1 200px;font-size:15px">${esc(e.pname)}</strong>
        <span style="font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;background:#E6EAF7;color:#29378A;border-radius:999px;padding:4px 10px">${esc(e.chip)}</span>
        <span style="font-size:14px">${esc(e.reason)}</span>
        <span style="display:flex;align-items:center;gap:6px;font-size:14px;font-weight:800"><span style="width:26px;height:26px;border-radius:50%;background:${avBg(e.user)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px">${esc(e.user[0])}</span>${esc(e.user)}</span>
      </div>`).join('');
    return `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:20px;color:#29378A">${esc(g.day)}</div>
      <div style="background:#FFFCF6;border:2px solid #29378A;border-radius:22px;overflow:hidden">${entries}</div>
    </div>`;
  }).join('');

  return `
  <div data-screen-label="08 Historique" style="display:flex;flex-direction:column;gap:18px">
    <h1 style="font-family:'Fredoka',sans-serif;font-weight:600;font-size:36px;margin:0;color:#29378A">Historique</h1>
    <p style="margin:0;font-size:15px">Qui a changé quoi, et quand.</p>
    ${blocks}
  </div>`;
}

// ---------------------------------------------------------------------------
// Main render loop
// ---------------------------------------------------------------------------

function doRender() {
  const root = document.getElementById('app');
  const isAdmin = state.view === 'admin';
  let html = '';
  if (!isAdmin) html += renderHeader();
  if (state.view === 'home') html += renderHome();
  else if (state.view === 'catalogue') html += renderCatalogue();
  else if (state.view === 'product') html += renderProduct();
  else if (state.view === 'cart') html += renderCart();
  else if (state.view === 'confirm') html += renderConfirm();
  else if (state.view === 'admin') html += renderAdmin();
  if (!isAdmin) html += renderFooter();
  html += renderModeSwitcher();
  html += renderToast();
  root.innerHTML = html;
}

function rerender() { doRender(); }

// Re-render while preserving focus/cursor position on the active text field
// (needed because the whole screen is re-rendered from a string on every change).
function rerenderKeepFocus() {
  const active = document.activeElement;
  let restore = null;
  if (active && active.id && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    restore = { id: active.id, start: active.selectionStart, end: active.selectionEnd };
  }
  doRender();
  if (restore) {
    const el = document.getElementById(restore.id);
    if (el) {
      el.focus();
      try { el.setSelectionRange(restore.start, restore.end); } catch (e) {}
    }
  }
}

// Re-render on resize so the dashboard's responsive breakpoints
// (sidebar layout, stock table vs. cards) react live, e.g. when rotating
// a phone or resizing a browser window.
let resizeTimer = null;
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rerender, 120);
  });
}

doRender();
