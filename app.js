const PILLARS = [
  { id: "move", name: "MOVE", hint: "Practice, walk, workout" },
  { id: "home", name: "HOME", hint: "Kitchen, laundry, yard" },
  { id: "school", name: "SCHOOL", hint: "Homework, grades, tutoring" },
  { id: "unplug", name: "UNPLUG", hint: "Under the family cap" },
  { id: "serve", name: "SERVE", hint: "Pantry, coaching, service" },
  { id: "hang", name: "HANG", hint: "Friends, phones down" },
];

const PLAYS = {
  move: [
    { name: "Walk / run 20 min", sparks: 12 },
    { name: "Team practice", sparks: 20 },
    { name: "Pickup game", sparks: 16 },
    { name: "Bike to school", sparks: 10 },
    { name: "Walk the dog", sparks: 8 },
  ],
  home: [
    { name: "Kitchen after dinner", sparks: 10 },
    { name: "Laundry start to fold", sparks: 12 },
    { name: "Mow / yard", sparks: 18 },
    { name: "Cook a family meal", sparks: 20 },
    { name: "Sibling pickup", sparks: 10 },
  ],
  school: [
    { name: "Homework block 30 min", sparks: 14 },
    { name: "Test / quiz logged", sparks: 18 },
    { name: "Progress report A/B", sparks: 30 },
    { name: "Tutor a classmate", sparks: 16 },
  ],
  unplug: [
    { name: "Under daily screen cap", sparks: 16 },
    { name: "Phone-free family meal", sparks: 12 },
    { name: "3-hour lock", sparks: 22 },
  ],
  serve: [
    { name: "Food pantry shift", sparks: 28 },
    { name: "Youth group service", sparks: 20 },
    { name: "Coach / help little kids", sparks: 22 },
    { name: "Neighborhood help", sparks: 14 },
  ],
  hang: [
    { name: "Hang (needs a friend)", sparks: 20 },
    { name: "Hang + phones down", sparks: 30 },
  ],
};

const DEFAULT_SHOP = [
  { id: "curfew", name: "Later curfew (1 hour)", cost: 40, kind: "house" },
  { id: "dinner", name: "Pick dinner", cost: 18, kind: "house" },
  { id: "chore", name: "Skip one chore", cost: 28, kind: "house" },
  { id: "car", name: "Saturday car", cost: 70, kind: "house" },
  { id: "sleepover", name: "Friend sleepover", cost: 55, kind: "house" },
  { id: "cash10", name: "$10 allowance cash-out", cost: 50, kind: "house" },
  { id: "pizza", name: "Squad pizza night", cost: 80, kind: "squad" },
];

const KEY = "rally.v1";

function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return d.getFullYear() + "-W" + week;
}

function blankWeek() {
  return { key: weekKey(), move: 0, home: 0, school: 0, unplug: 0, serve: 0, hang: 0 };
}

function defaultState() {
  return {
    onboarded: false,
    users: {
      teen: { id: "teen", name: "Jordan", role: "teen" },
      friend: { id: "friend", name: "Sam", role: "friend" },
      parent: { id: "parent", name: "Parent", role: "parent" },
    },
    active: "teen",
    sparks: { teen: 36, friend: 12 },
    streak: 3,
    freezesUsed: 0,
    lastActiveDay: null,
    week: blankWeek(),
    logs: [
      { id: "l1", user: "teen", pillar: "move", name: "Walk the dog", sparks: 8, status: "banked", at: Date.now() - 3600000 },
      { id: "l2", user: "teen", pillar: "home", name: "Kitchen after dinner", sparks: 10, status: "pending", at: Date.now() - 1800000 },
    ],
    hangs: [],
    shop: DEFAULT_SHOP.map((s) => ({ ...s })),
    redemptions: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s.week || s.week.key !== weekKey()) s.week = blankWeek();
    return s;
  } catch (e) {
    return defaultState();
  }
}

let state = load();
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 8);
}

function pillarsHit() {
  return PILLARS.filter((p) => state.week[p.id] > 0).length;
}

function multiplier() {
  const n = pillarsHit();
  if (n >= 6) return 1.5;
  if (n >= 4) return 1.25;
  return 1;
}

function needsParent(pillar) {
  return pillar === "home" || pillar === "school";
}

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText =
    "position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:#d2ee6a;color:#122017;padding:10px 14px;border-radius:999px;font-weight:700;z-index:80;max-width:90%;";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

let view = "today";
let modal = null;

function setUser(id) {
  state.active = id;
  save();
  render();
}

function bankPlay(play, pillar, extra) {
  const user = state.active === "parent" ? "teen" : state.active;
  const pending = needsParent(pillar);
  const log = {
    id: uid("log"),
    user,
    pillar,
    name: play.name,
    sparks: play.sparks,
    status: pending ? "pending" : "banked",
    note: extra || "",
    at: Date.now(),
  };
  state.logs.unshift(log);
  if (!pending) credit(user, play.sparks, pillar);
  save();
  modal = null;
  toast(pending ? "Sent to parent for a tap" : "+" + play.sparks + " Sparks");
  render();
}

function credit(user, amount, pillar) {
  state.sparks[user] = (state.sparks[user] || 0) + amount;
  if (pillar && user === "teen") state.week[pillar] = (state.week[pillar] || 0) + 1;
  const day = new Date().toDateString();
  if (state.lastActiveDay !== day) {
    state.streak += 1;
    state.lastActiveDay = day;
  }
}

function approve(id, ok) {
  const log = state.logs.find((l) => l.id === id);
  if (!log || log.status !== "pending") return;
  log.status = ok ? "banked" : "denied";
  if (ok) credit(log.user, log.sparks, log.pillar);
  save();
  toast(ok ? "Approved" : "Denied");
  render();
}

function startHang(phonesDown) {
  const host = state.active === "parent" ? "teen" : state.active;
  const hang = {
    id: uid("hang"),
    host,
    guest: host === "teen" ? "friend" : "teen",
    phonesDown: !!phonesDown,
    hostHere: true,
    guestHere: false,
    status: "open",
    at: Date.now(),
  };
  state.hangs.unshift(hang);
  save();
  modal = null;
  toast("Hang opened. Friend must confirm.");
  view = "squad";
  render();
}

function confirmHang(id) {
  const hang = state.hangs.find((h) => h.id === id);
  if (!hang || hang.status !== "open") return;
  if (state.active !== hang.guest) {
    toast("Switch to " + state.users[hang.guest].name + " to confirm");
    return;
  }
  hang.guestHere = true;
  hang.status = "done";
  const sparks = hang.phonesDown ? 30 : 20;
  credit(hang.host, sparks, "hang");
  credit(hang.guest, sparks, null);
  save();
  toast("Hang confirmed. +" + sparks + " each");
  render();
}

function redeem(item) {
  const user = state.active === "parent" ? "teen" : state.active;
  if ((state.sparks[user] || 0) < item.cost) {
    toast("Not enough Sparks");
    return;
  }
  state.sparks[user] -= item.cost;
  state.redemptions.unshift({
    id: uid("rd"),
    item: item.name,
    cost: item.cost,
    user,
    status: "requested",
    at: Date.now(),
  });
  save();
  toast("Requested: " + item.name);
  render();
}

function honorRedeem(id) {
  const r = state.redemptions.find((x) => x.id === id);
  if (!r) return;
  r.status = "honored";
  save();
  toast("Honored");
  render();
}

function resetDemo() {
  state = defaultState();
  save();
  view = "today";
  modal = null;
  render();
}

function topbar() {
  const u = state.users[state.active];
  return `
    <div class="topbar">
      <div>
        <div class="brand">RALLY</div>
        <div class="sub" style="margin:0">${u.role === "parent" ? "Coach view" : u.role === "friend" ? "Friend demo" : "Teen view"}</div>
      </div>
      <div class="who">
        Signed in as ${escapeHtml(u.name)}<br/>
        <button data-act="cycle-user">Switch person</button>
      </div>
    </div>`;
}

function nav() {
  const tabs = [
    ["today", "\u25cf", "TODAY"],
    ["play", "\uff0b", "PLAY"],
    ["squad", "\u25ce", "SQUAD"],
    ["shop", "\u25c7", "SHOP"],
    ["you", "\u25cb", "YOU"],
  ];
  return `<nav class="nav">${tabs
    .map(([id, ico, label]) => `<button class="${view === id ? "active" : ""}" data-view="${id}"><span class="ico">${ico}</span>${label}</button>`)
    .join("")}</nav>`;
}

function todayView() {
  const sparks = state.sparks.teen || 0;
  const hit = pillarsHit();
  const multi = multiplier();
  const pending = state.logs.filter((l) => l.status === "pending").length;
  return `
    ${topbar()}
    <div class="hero-card">
      <div class="sub">This week</div>
      <div class="sparks">${sparks}<span>Sparks</span></div>
      <div class="row">
        <div class="chip on">${state.streak}-day streak</div>
        <div class="chip">${hit}/6 pillars</div>
        <div class="chip ${multi > 1 ? "on" : ""}">${multi === 1.5 ? "+50% Full Life" : multi === 1.25 ? "+25% Full Life" : "Hit 4 pillars for a bonus"}</div>
      </div>
      <div class="meters">
        ${PILLARS.map((p) => {
          const n = state.week[p.id] || 0;
          const w = Math.min(100, n * 50);
          return `<div class="meter"><div class="bar"><i style="width:${w}%"></i></div><small>${p.name}</small></div>`;
        }).join("")}
      </div>
    </div>
    <div class="pad stack">
      <button class="btn" data-act="open-log">Log what I just did</button>
      ${pending && state.active === "parent" ? `<div class="card"><b>${pending} waiting on a tap</b><p class="sub">Home and School plays need a parent approve.</p></div>` : ""}
      <div class="card">
        <h2>Recent</h2>
        ${renderLogs(state.logs.slice(0, 6))}
      </div>
    </div>`;
}

function playView() {
  return `
    ${topbar()}
    <div class="pad" style="margin-bottom:10px">
      <h1>Play</h1>
      <p class="sub">Pick a pillar. Daily caps stop grinding the same chore.</p>
    </div>
    <div class="pad grid2">
      ${PILLARS.map((p) => `<button class="pillar" data-act="open-pillar" data-id="${p.id}">
          <b>${p.name}</b>
          <span>${state.week[p.id] || 0} this week</span>
          <p>${p.hint}</p>
        </button>`).join("")}
    </div>`;
}

function squadView() {
  const open = state.hangs.filter((h) => h.status === "open");
  const done = state.hangs.filter((h) => h.status === "done").slice(0, 5);
  return `
    ${topbar()}
    <div class="pad stack">
      <h1>Squad</h1>
      <p class="sub">Jordan + Sam. A Hang does not count until the second person confirms.</p>
      <button class="btn" data-act="open-hang">Start a Hang</button>
      <div class="card">
        <h2>Open Hangs</h2>
        ${
          open.length
            ? open.map((h) => `<div class="list-item">
                    <div>
                      <div class="tag">${h.phonesDown ? "PHONES DOWN" : "HANG"}</div>
                      <div>${state.users[h.host].name} invited ${state.users[h.guest].name}</div>
                      <div class="sub">Waiting on ${state.users[h.guest].name}</div>
                    </div>
                    <button class="btn" style="width:auto;min-height:40px;padding:8px 12px" data-act="confirm-hang" data-id="${h.id}">I'm here</button>
                  </div>`).join("")
            : `<p class="empty">No open Hang. Start one, then switch person to confirm.</p>`
        }
      </div>
      <div class="card">
        <h2>Confirmed</h2>
        ${
          done.length
            ? done.map((h) => `<div class="list-item"><div>${state.users[h.host].name} + ${state.users[h.guest].name}</div><div class="price">done</div></div>`).join("")
            : `<p class="empty">None yet.</p>`
        }
      </div>
    </div>`;
}

function shopView() {
  const user = state.active === "parent" ? "teen" : state.active;
  const bal = state.sparks[user] || 0;
  return `
    ${topbar()}
    <div class="pad stack">
      <h1>Shop</h1>
      <p class="sub">${state.users[user].name} has ${bal} Sparks. Spending does not lower streak or pillars.</p>
      <div class="card">
        ${state.shop.map((item) => `<div class="list-item">
              <div>
                <div class="tag">${item.kind.toUpperCase()}</div>
                <div>${escapeHtml(item.name)}</div>
              </div>
              <div style="text-align:right">
                <div class="price">${item.cost}</div>
                ${state.active === "parent" ? "" : `<button class="btn" style="width:auto;min-height:36px;padding:6px 10px;margin-top:6px" data-act="redeem" data-id="${item.id}">Get</button>`}
              </div>
            </div>`).join("")}
      </div>
      <div class="card">
        <h2>Requests</h2>
        ${
          state.redemptions.length
            ? state.redemptions.slice(0, 8).map((r) => `<div class="list-item">
                    <div>${escapeHtml(r.item)}<div class="sub">${r.status} \u00b7 ${r.cost} Sparks</div></div>
                    ${state.active === "parent" && r.status === "requested" ? `<button class="btn" style="width:auto;min-height:36px;padding:6px 10px" data-act="honor" data-id="${r.id}">Honor</button>` : `<div class="price">${r.status}</div>`}
                  </div>`).join("")
            : `<p class="empty">Nothing redeemed yet.</p>`
        }
      </div>
    </div>`;
}

function youView() {
  const pending = state.logs.filter((l) => l.status === "pending");
  return `
    ${topbar()}
    <div class="pad stack">
      <h1>You</h1>
      <div class="card">
        <h2>This is a working MVP</h2>
        <p class="sub">Runs on your phone browser. Add to Home Screen for an app icon. HealthKit, Screen Time APIs, and App Store come later with a native wrapper.</p>
      </div>
      ${state.active === "parent" ? `<div class="card">
              <h2>Approve queue</h2>
              ${pending.length ? pending.map((l) => `<div class="list-item">
                          <div><div class="tag">${l.pillar.toUpperCase()}</div>${escapeHtml(l.name)}<div class="sub">${l.sparks} Sparks</div></div>
                          <div>
                            <button class="btn" style="width:auto;min-height:36px;padding:6px 10px" data-act="approve" data-id="${l.id}">Yes</button>
                            <button class="btn ghost" style="width:auto;min-height:36px;padding:6px 10px;margin-top:6px" data-act="deny" data-id="${l.id}">No</button>
                          </div>
                        </div>`).join("") : `<p class="empty">Nothing waiting.</p>`}
            </div>` : ""}
      <div class="card">
        <h2>People in this demo</h2>
        <p class="sub">Switch person from the top right. Use Sam to confirm a Hang. Use Parent to approve Home/School and honor shop requests.</p>
      </div>
      <button class="btn ghost" data-act="reset">Reset demo data</button>
    </div>`;
}

function renderLogs(logs) {
  if (!logs.length) return `<p class="empty">Nothing logged yet.</p>`;
  return logs.map((l) => {
    const st = l.status === "banked" ? "ok" : l.status === "pending" ? "warn" : "";
    return `<div class="list-item">
        <div>
          <div class="tag">${l.pillar.toUpperCase()}</div>
          <div>${escapeHtml(l.name)}</div>
        </div>
        <div class="price ${st}">${l.status === "banked" ? "+" + l.sparks : l.status}</div>
      </div>`;
  }).join("");
}

function logSheet(pillarId) {
  const pillar = PILLARS.find((p) => p.id === pillarId) || PILLARS[0];
  const plays = PLAYS[pillar.id];
  return `
    <div class="modal" data-act="close-modal">
      <div class="sheet" data-stop="1">
        <h2>Log ${pillar.name}</h2>
        <p class="sub">${needsParent(pillar.id) ? "Parent will need to approve this." : "Banks immediately in this demo."}</p>
        <div class="field">
          <label>Play</label>
          <div class="choices" id="play-choices">
            ${plays.map((p, i) => `<button class="${i === 0 ? "on" : ""}" data-act="pick-play" data-i="${i}">${escapeHtml(p.name)} \u00b7 ${p.sparks}</button>`).join("")}
          </div>
        </div>
        <div class="field">
          <label>Note (optional)</label>
          <input id="play-note" placeholder="What did you actually do?" />
        </div>
        <button class="btn" data-act="submit-play" data-pillar="${pillar.id}">Bank it</button>
        <div style="height:8px"></div>
        <button class="btn ghost" data-act="close-modal">Cancel</button>
      </div>
    </div>`;
}

function hangSheet() {
  return `
    <div class="modal" data-act="close-modal">
      <div class="sheet" data-stop="1">
        <h2>Start a Hang</h2>
        <p class="sub">Invite Sam. Then switch person and tap I'm here. That two-person confirm is the anti-cheat.</p>
        <div class="field">
          <label>Style</label>
          <div class="choices">
            <button class="on" data-act="hang-style" data-v="normal">Normal \u00b7 20</button>
            <button data-act="hang-style" data-v="phones">Phones down \u00b7 30</button>
          </div>
        </div>
        <button class="btn" data-act="submit-hang">Open Hang</button>
        <div style="height:8px"></div>
        <button class="btn ghost" data-act="close-modal">Cancel</button>
      </div>
    </div>`;
}

function gateView() {
  return `
    <div class="gate">
      <div class="brand">PRODUCT DESIGN \u00b7 WORKING APP</div>
      <h1>Rally</h1>
      <p class="sub">Rewards for real life. This is a real MVP you can use on your phone \u2014 log plays, earn Sparks, confirm a Hang, spend the shop.</p>
      <div style="height:20px"></div>
      <button class="btn" data-act="start">Open the app</button>
      <div style="height:10px"></div>
      <p class="sub">Tip: in Safari, tap Share \u2192 Add to Home Screen. Turn on Open as Web App.</p>
    </div>`;
}

let selectedPlay = 0;
let hangPhones = false;

function render() {
  const root = document.getElementById("app");
  if (!state.onboarded) {
    root.innerHTML = gateView();
    bind(root);
    return;
  }
  const pages = { today: todayView, play: playView, squad: squadView, shop: shopView, you: youView };
  let html = `<div class="app">${(pages[view] || todayView)()}${nav()}</div>`;
  if (modal === "log") html += logSheet(state._pillar || "move");
  if (modal === "hang") html += hangSheet();
  root.innerHTML = html;
  bind(root);
}

function bind(root) {
  root.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      view = b.getAttribute("data-view");
      modal = null;
      render();
    })
  );
  root.querySelectorAll("[data-act]").forEach((b) =>
    b.addEventListener("click", (e) => {
      handle(b.getAttribute("data-act"), b, e);
    })
  );
}

function handle(act, node, e) {
  if (act === "close-modal") {
    if (e.target.closest("[data-stop]") && e.target.getAttribute("data-act") !== "close-modal") return;
    if (e.currentTarget.classList.contains("modal") && e.target !== e.currentTarget) return;
    modal = null;
    render();
    return;
  }
  if (act === "start") {
    state.onboarded = true;
    save();
    render();
    return;
  }
  if (act === "cycle-user") {
    const order = ["teen", "friend", "parent"];
    const i = order.indexOf(state.active);
    setUser(order[(i + 1) % order.length]);
    return;
  }
  if (act === "open-log") {
    state._pillar = "move";
    selectedPlay = 0;
    modal = "log";
    render();
    return;
  }
  if (act === "open-pillar") {
    state._pillar = node.getAttribute("data-id");
    selectedPlay = 0;
    modal = "log";
    render();
    return;
  }
  if (act === "pick-play") {
    selectedPlay = Number(node.getAttribute("data-i"));
    document.querySelectorAll("#play-choices button").forEach((x, i) => x.classList.toggle("on", i === selectedPlay));
    return;
  }
  if (act === "submit-play") {
    const pillar = node.getAttribute("data-pillar");
    const play = PLAYS[pillar][selectedPlay];
    const note = (document.getElementById("play-note") || {}).value || "";
    if (pillar === "hang") {
      startHang(play.sparks >= 30);
      return;
    }
    bankPlay(play, pillar, note);
    return;
  }
  if (act === "open-hang") {
    hangPhones = false;
    modal = "hang";
    render();
    return;
  }
  if (act === "hang-style") {
    hangPhones = node.getAttribute("data-v") === "phones";
    node.parentElement.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    node.classList.add("on");
    return;
  }
  if (act === "submit-hang") {
    startHang(hangPhones);
    return;
  }
  if (act === "confirm-hang") {
    confirmHang(node.getAttribute("data-id"));
    return;
  }
  if (act === "redeem") {
    const item = state.shop.find((s) => s.id === node.getAttribute("data-id"));
    if (item) redeem(item);
    return;
  }
  if (act === "honor") {
    honorRedeem(node.getAttribute("data-id"));
    return;
  }
  if (act === "approve") {
    approve(node.getAttribute("data-id"), true);
    return;
  }
  if (act === "deny") {
    approve(node.getAttribute("data-id"), false);
    return;
  }
  if (act === "reset") {
    if (confirm("Reset this demo?")) resetDemo();
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
