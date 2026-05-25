const STORAGE_KEY = "open-golf-connect-mockup-v1";
const AUTH_KEY = "open-golf-connect-session-v1";
const CLIENT_ID_KEY = "open-golf-connect-client-id-v1";
const SUPABASE_URL = "https://pvqzyysapstdozequtkw.supabase.co";
const SUPABASE_KEY = "sb_publishable_w7E0RSqEulwTpKLAwyjBow_J1wKlt2a";
const SUPABASE_STATE_ID = "open-golf-connect-2026";
const SYNC_POLL_MS = 2500;

const passwords = {
  admin: { role: "admin", label: "Administrateur", password: "admin2026" },
  lucho: { role: "player", playerId: "luc", label: "Lucho", password: "lucho2026" },
  thib: { role: "player", playerId: "thibaut", label: "Thib", password: "thib2026" },
  nanou: { role: "player", playerId: "nanelou", label: "Nanou", password: "nanou2026" },
  pierrot: { role: "player", playerId: "pierre", label: "Pierrot", password: "pierrot2026" },
};

const icons = {
  home: "Accueil",
  course: "Parcours",
  score: "Scores",
  board: "Synthèse",
};

const defaultPlayers = [
  { id: "luc", name: "Lucho", handicap: 18.0 },
  { id: "thibaut", name: "Thib", handicap: 12.0 },
  { id: "nanelou", name: "Nanou", handicap: 24.0 },
  { id: "pierre", name: "Pierrot", handicap: 20.0 },
];

const defaultTeams = [
  { id: "team-luc-thibaut", name: "Lucho & Thib", markerPlayerId: "luc", players: ["luc", "thibaut"] },
  { id: "team-nanelou-pierre", name: "Nanou & Pierrot", markerPlayerId: "pierre", players: ["nanelou", "pierre"] },
];

const courseCatalog = {
  Marly: [
    { sourceHole: 1, par: 5, strokeIndex: 3 },
    { sourceHole: 2, par: 4, strokeIndex: 13 },
    { sourceHole: 3, par: 3, strokeIndex: 17 },
    { sourceHole: 4, par: 4, strokeIndex: 5 },
    { sourceHole: 5, par: 4, strokeIndex: 9 },
    { sourceHole: 6, par: 4, strokeIndex: 1 },
    { sourceHole: 7, par: 4, strokeIndex: 11 },
    { sourceHole: 8, par: 3, strokeIndex: 15 },
    { sourceHole: 9, par: 5, strokeIndex: 7 },
    { sourceHole: 10, par: 4, strokeIndex: 12 },
    { sourceHole: 11, par: 4, strokeIndex: 2 },
    { sourceHole: 12, par: 3, strokeIndex: 18 },
    { sourceHole: 13, par: 5, strokeIndex: 6 },
    { sourceHole: 14, par: 4, strokeIndex: 10 },
    { sourceHole: 15, par: 4, strokeIndex: 4 },
    { sourceHole: 16, par: 3, strokeIndex: 16 },
    { sourceHole: 17, par: 5, strokeIndex: 8 },
    { sourceHole: 18, par: 4, strokeIndex: 14 },
  ],
  Retz: [
    { sourceHole: 1, par: 4, strokeIndex: 5 },
    { sourceHole: 2, par: 5, strokeIndex: 13 },
    { sourceHole: 3, par: 4, strokeIndex: 9 },
    { sourceHole: 4, par: 4, strokeIndex: 3 },
    { sourceHole: 5, par: 3, strokeIndex: 17 },
    { sourceHole: 6, par: 5, strokeIndex: 1 },
    { sourceHole: 7, par: 4, strokeIndex: 7 },
    { sourceHole: 8, par: 3, strokeIndex: 15 },
    { sourceHole: 9, par: 4, strokeIndex: 11 },
    { sourceHole: 10, par: 4, strokeIndex: 10 },
    { sourceHole: 11, par: 4, strokeIndex: 4 },
    { sourceHole: 12, par: 5, strokeIndex: 8 },
    { sourceHole: 13, par: 3, strokeIndex: 18 },
    { sourceHole: 14, par: 4, strokeIndex: 12 },
    { sourceHole: 15, par: 5, strokeIndex: 2 },
    { sourceHole: 16, par: 4, strokeIndex: 6 },
    { sourceHole: 17, par: 3, strokeIndex: 16 },
    { sourceHole: 18, par: 4, strokeIndex: 14 },
  ],
};

function catalogHole(source, sourceHole) {
  return courseCatalog[source].find((item) => item.sourceHole === Number(sourceHole)) || courseCatalog[source][0];
}

function makeCourseHoles() {
  return Array.from({ length: 18 }, (_, index) => ({
    number: index + 1,
    source: index < 9 ? "Marly" : "Retz",
    sourceHole: index < 9 ? index + 1 : index - 8,
    ...catalogHole(index < 9 ? "Marly" : "Retz", index < 9 ? index + 1 : index - 8),
  })).map((item, index) => ({ ...item, number: index + 1 }));
}

function createInitialState() {
  return {
    activeView: "home",
    selectedTeamId: "team-luc-thibaut",
    selectedSummaryTeamId: "team-luc-thibaut",
    selectedHole: 1,
    activeScoreCell: null,
    currentHoles: {},
    handicapAllowance: 85,
    courseLocked: false,
    players: defaultPlayers,
    teams: defaultTeams,
    courseName: "Composite Joyenval Marly / Retz",
    holes: makeCourseHoles(),
    scores: {},
    validatedHoles: {},
  };
}

let state = loadState();
let session = loadSession();
let remoteReady = false;
let isApplyingRemote = false;
let syncTimer = null;
let remotePollTimer = null;
let remoteLastSeenAt = 0;
let remoteChannel = null;
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
const clientId = getClientId();

function getClientId() {
  const saved = localStorage.getItem(CLIENT_ID_KEY);
  if (saved) return saved;
  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(CLIENT_ID_KEY, next);
  return next;
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function login(event) {
  event.preventDefault();
  const enteredPassword = document.getElementById("password").value.trim();
  const account = Object.values(passwords).find((item) => item.password === enteredPassword);
  const error = document.querySelector(".login-error");
  if (!account) {
    error.textContent = "Mot de passe incorrect.";
    return;
  }
  session = { role: account.role, playerId: account.playerId || "", label: account.label };
  if (account.playerId) {
    const ownTeam = teamForPlayer(account.playerId);
    state.selectedTeamId = ownTeam?.id || state.selectedTeamId;
    state.selectedHole = ownTeam ? currentHoleForTeam(ownTeam.id) : state.selectedHole;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  saveState();
  render();
  startRemoteSync();
}

function logout() {
  session = null;
  stopRemoteSync();
  localStorage.removeItem(AUTH_KEY);
  render();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.players && saved?.holes && saved?.teams) return normalizeState(saved);
  } catch (error) {
    console.warn(error);
  }
  return createInitialState();
}

function normalizeState(saved) {
  const players = defaultPlayers.map((seed) => {
    const existing = saved.players.find((item) => item.id === seed.id) || {};
    const migratedName = ["Luc", "Thibaut", "Thibault", "Nano", "Nanelou", "Pierre"].includes(existing.name) ? seed.name : existing.name;
    return { ...seed, ...existing, name: migratedName || seed.name };
  });
  const teams = defaultTeams.map((seed) => {
    const existing = saved.teams.find((item) => item.id === seed.id) || {};
    const markerPlayerId = seed.players.includes(existing.markerPlayerId) ? existing.markerPlayerId : seed.markerPlayerId;
    return { ...seed, ...existing, name: seed.players.map((id) => players.find((item) => item.id === id)?.name || id).join(" & "), markerPlayerId, markerTeamId: undefined };
  });
  const holes = (saved.holes || makeCourseHoles()).map((item, index) => {
    const source = item.source === "Retz" ? "Retz" : "Marly";
    const details = catalogHole(source, item.sourceHole || index + 1);
    return { ...item, number: index + 1, source, sourceHole: details.sourceHole, par: details.par, strokeIndex: details.strokeIndex };
  });
  return { ...createInitialState(), ...saved, players, teams, holes, currentHoles: saved.currentHoles || {}, validatedHoles: saved.validatedHoles || {}, courseLocked: Boolean(saved.courseLocked) };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleRemoteSave();
}

function saveLocalOnly() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function publicState() {
  return {
    syncUpdatedAt: Date.now(),
    syncClientId: clientId,
    selectedTeamId: state.selectedTeamId,
    selectedHole: state.selectedHole,
    currentHoles: state.currentHoles,
    handicapAllowance: state.handicapAllowance,
    courseLocked: state.courseLocked,
    players: state.players,
    teams: state.teams,
    courseName: state.courseName,
    holes: state.holes,
    scores: state.scores,
    validatedHoles: state.validatedHoles,
  };
}

function applyRemoteState(data) {
  if (!data || typeof data !== "object") return;
  const incomingUpdatedAt = Number(data.syncUpdatedAt || 0);
  if (incomingUpdatedAt && incomingUpdatedAt <= remoteLastSeenAt) return;
  if (incomingUpdatedAt) remoteLastSeenAt = incomingUpdatedAt;
  isApplyingRemote = true;
  const localView = state.activeView;
  state = normalizeState({
    ...state,
    ...data,
    activeView: localView,
  });
  keepSessionInsideScope();
  remoteReady = true;
  saveLocalOnly();
  isApplyingRemote = false;
  render();
}

function scheduleRemoteSave() {
  if (!supabaseClient || !session || isApplyingRemote) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(saveRemoteState, 450);
}

async function saveRemoteState() {
  if (!supabaseClient || !session || isApplyingRemote) return;
  const payload = publicState();
  remoteLastSeenAt = payload.syncUpdatedAt;
  const { error } = await supabaseClient.from("app_state").upsert({ id: SUPABASE_STATE_ID, data: payload });
  if (error) {
    const wasRemoteReady = remoteReady;
    remoteReady = false;
    console.warn("Supabase save failed", error);
    if (wasRemoteReady) render();
    return;
  }
  const wasRemoteReady = remoteReady;
  remoteReady = true;
  if (!wasRemoteReady) render();
}

async function loadRemoteState() {
  if (!supabaseClient || !session) return;
  const { data, error } = await supabaseClient.from("app_state").select("data").eq("id", SUPABASE_STATE_ID).single();
  if (error) {
    if (error.code === "PGRST116") {
      await saveRemoteState();
      return;
    }
    const wasRemoteReady = remoteReady;
    remoteReady = false;
    console.warn("Supabase load failed", error);
    if (wasRemoteReady) render();
    return;
  }
  if (data?.data && Object.keys(data.data).length) {
    applyRemoteState(data.data);
  } else {
    await saveRemoteState();
  }
  remoteReady = true;
}

function subscribeRemoteState() {
  if (!supabaseClient || !session || remoteChannel) return;
  remoteChannel = supabaseClient
    .channel("open-golf-connect-state")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "app_state",
        filter: `id=eq.${SUPABASE_STATE_ID}`,
      },
      (payload) => {
        if (payload.new?.data) applyRemoteState(payload.new.data);
      },
    )
    .subscribe();
}

function startRemotePolling() {
  if (!supabaseClient || !session) return;
  clearInterval(remotePollTimer);
  remotePollTimer = setInterval(loadRemoteState, SYNC_POLL_MS);
}

async function startRemoteSync() {
  if (!supabaseClient || !session) {
    remoteReady = false;
    render();
    return;
  }
  await loadRemoteState();
  subscribeRemoteState();
  startRemotePolling();
  render();
}

function stopRemoteSync() {
  clearTimeout(syncTimer);
  clearInterval(remotePollTimer);
  syncTimer = null;
  remotePollTimer = null;
  remoteReady = false;
  if (remoteChannel && supabaseClient) supabaseClient.removeChannel(remoteChannel);
  remoteChannel = null;
}

function setState(patch) {
  if (!isAdmin() && patch.activeView === "course") return;
  if (!isAdmin() && patch.selectedTeamId && patch.selectedTeamId !== teamForPlayer(session.playerId)?.id) return;
  state = { ...state, ...patch };
  keepSessionInsideScope();
  saveState();
  render();
}

function isAdmin() {
  return session?.role === "admin";
}

function visibleTeams() {
  if (isAdmin()) return state.teams;
  const ownTeam = teamForPlayer(session?.playerId);
  return ownTeam ? [ownTeam] : [];
}

function visiblePlayers() {
  return visibleTeams().flatMap((item) => item.players.map(player));
}

function availableIcons() {
  return Object.fromEntries(Object.entries(icons).filter(([view]) => isAdmin() || view !== "course"));
}

function keepSessionInsideScope() {
  if (!session || isAdmin()) return;
  const ownTeam = teamForPlayer(session.playerId);
  if (ownTeam) {
    state.selectedTeamId = ownTeam.id;
    state.selectedHole = currentHoleForTeam(ownTeam.id);
  }
  if (state.activeView === "course") state.activeView = "home";
}

function player(id) {
  return state.players.find((item) => item.id === id);
}

function team(id) {
  return state.teams.find((item) => item.id === id);
}

function teamForPlayer(playerId) {
  return state.teams.find((item) => item.players.includes(playerId));
}

function hole(number) {
  return state.holes[number - 1];
}

function scoreKey(teamId, holeNumber, playerId) {
  return `${teamId}:${holeNumber}:${playerId}`;
}

function driveKey(teamId, holeNumber) {
  return `${teamId}:${holeNumber}:drive`;
}

function validationKey(teamId, holeNumber) {
  return `${teamId}:${holeNumber}`;
}

function isHoleValidated(teamId, holeNumber) {
  return Boolean(state.validatedHoles?.[validationKey(teamId, holeNumber)]);
}

function currentHoleForTeam(teamId) {
  return state.currentHoles?.[teamId] || state.holes.find((item) => !isHoleValidated(teamId, item.number))?.number || 18;
}

function selectHole(teamId, holeNumber) {
  const selectedTeam = team(teamId);
  if (!isAdmin() && selectedTeam?.id !== teamForPlayer(session?.playerId)?.id) return;
  state.selectedHole = holeNumber;
  state.activeScoreCell = null;
  state.currentHoles = { ...state.currentHoles, [teamId]: holeNumber };
  saveState();
  render();
}

function selectTeamForScoring(teamId) {
  if (!isAdmin() && teamId !== teamForPlayer(session?.playerId)?.id) return;
  state.selectedTeamId = teamId;
  state.selectedHole = currentHoleForTeam(teamId);
  state.activeScoreCell = null;
  saveState();
  render();
}

function getPlayerScore(teamId, holeNumber, playerId) {
  return state.scores[scoreKey(teamId, holeNumber, playerId)] || { gross: "", putts: "" };
}

function updatePlayerScore(teamId, holeNumber, playerId, field, value) {
  const selectedTeam = team(teamId);
  if (!isAdmin() && selectedTeam?.id !== teamForPlayer(session?.playerId)?.id) return;
  if (!selectedTeam?.players.includes(playerId)) return;
  const key = scoreKey(teamId, holeNumber, playerId);
  state.scores[key] = {
    ...getPlayerScore(teamId, holeNumber, playerId),
    [field]: value === "" ? "" : Number(value),
  };
  state.validatedHoles = { ...state.validatedHoles, [validationKey(teamId, holeNumber)]: false };
  saveState();
  render();
}

function updateDrive(teamId, holeNumber, playerId) {
  const selectedTeam = team(teamId);
  if (!isAdmin() && selectedTeam?.id !== teamForPlayer(session?.playerId)?.id) return;
  if (!selectedTeam?.players.includes(playerId)) return;
  state.scores[driveKey(teamId, holeNumber)] = playerId;
  state.validatedHoles = { ...state.validatedHoles, [validationKey(teamId, holeNumber)]: false };
  saveState();
  render();
}

function validateHole(teamId, holeNumber) {
  const selectedTeam = team(teamId);
  if (!isAdmin() && selectedTeam?.id !== teamForPlayer(session?.playerId)?.id) return;
  const complete = selectedTeam.players.every((playerId) => {
    const score = getPlayerScore(teamId, holeNumber, playerId);
    return score.gross !== "" && score.putts !== "";
  });
  if (!complete) {
    alert("Saisis le brut et les putts des deux joueurs avant de valider le trou.");
    return;
  }
  state.validatedHoles = { ...state.validatedHoles, [validationKey(teamId, holeNumber)]: true };
  const nextHole = holeNumber === 18 ? 1 : holeNumber + 1;
  state.selectedHole = nextHole;
  state.activeScoreCell = null;
  state.currentHoles = { ...state.currentHoles, [teamId]: nextHole };
  saveState();
  render();
}

function scoreCellId(teamId, holeNumber, playerId, field) {
  return `${teamId}:${holeNumber}:${playerId}:${field}`;
}

function parseScoreCell(cellId) {
  const [teamId, holeNumber, playerId, field] = String(cellId || "").split(":");
  return { teamId, holeNumber: Number(holeNumber), playerId, field };
}

function selectScoreCell(teamId, holeNumber, playerId, field) {
  const selectedTeam = team(teamId);
  if (!isAdmin() && selectedTeam?.id !== teamForPlayer(session?.playerId)?.id) return;
  state.activeScoreCell = scoreCellId(teamId, holeNumber, playerId, field);
  saveLocalOnly();
  render();
}

function keypadScore(value) {
  if (!state.activeScoreCell) return;
  const { teamId, holeNumber, playerId, field } = parseScoreCell(state.activeScoreCell);
  if (!teamId || !playerId || !field) return;
  updatePlayerScore(teamId, holeNumber, playerId, field, Number(value));
  const selectedTeam = team(teamId);
  const currentIndex = selectedTeam.players.indexOf(playerId);
  if (field === "gross") {
    state.activeScoreCell = scoreCellId(teamId, holeNumber, playerId, "putts");
  } else if (currentIndex >= 0 && currentIndex < selectedTeam.players.length - 1) {
    state.activeScoreCell = scoreCellId(teamId, holeNumber, selectedTeam.players[currentIndex + 1], "gross");
  }
  saveLocalOnly();
  render();
}

function clearScoreCell() {
  if (!state.activeScoreCell) return;
  const { teamId, holeNumber, playerId, field } = parseScoreCell(state.activeScoreCell);
  updatePlayerScore(teamId, holeNumber, playerId, field, "");
}

function updatePlayer(playerId, field, value) {
  if (!isAdmin()) return;
  state.players = state.players.map((item) => (item.id === playerId ? { ...item, [field]: field === "handicap" ? Number(value) : value } : item));
  state.teams = state.teams.map((item) => ({ ...item, name: item.players.map((id) => player(id)?.name || id).join(" & ") }));
  saveState();
  render();
}

function updateHole(index, field, value) {
  if (!isAdmin()) return;
  state.holes = state.holes.map((item, itemIndex) => {
    if (itemIndex !== index) return item;
    const draft = { ...item, [field]: field === "source" ? value : Number(value) };
    const details = catalogHole(draft.source, draft.sourceHole);
    return { ...draft, sourceHole: details.sourceHole, par: details.par, strokeIndex: details.strokeIndex };
  });
  state.courseLocked = false;
  saveState();
  render();
}

function updateMarker(teamId, markerPlayerId) {
  const selectedTeam = team(teamId);
  if (!isAdmin() && !selectedTeam?.players.includes(session?.playerId)) return;
  if (!selectedTeam?.players.includes(markerPlayerId)) return;
  state.teams = state.teams.map((item) => (item.id === teamId ? { ...item, markerPlayerId } : item));
  saveState();
  render();
}

function strokesForHole(playerId, holeNumber) {
  const playingHandicap = (player(playerId).handicap * state.handicapAllowance) / 100;
  const base = Math.floor(playingHandicap / 18);
  const remainder = Math.round(playingHandicap % 18);
  return base + (hole(holeNumber).strokeIndex <= remainder ? 1 : 0);
}

function teamHoleResult(teamId, holeNumber) {
  const selectedTeam = team(teamId);
  const scores = selectedTeam.players.map((playerId) => {
    const raw = getPlayerScore(teamId, holeNumber, playerId);
    return {
      playerId,
      gross: raw.gross === "" ? 0 : Number(raw.gross),
      putts: raw.putts === "" ? 0 : Number(raw.putts),
      net: raw.gross === "" ? 0 : Number(raw.gross) - strokesForHole(playerId, holeNumber),
    };
  });
  const validScores = scores.filter((item) => item.gross > 0);
  const bestGross = validScores.length ? Math.min(...validScores.map((item) => item.gross)) : 0;
  const bestNet = validScores.length ? Math.min(...validScores.map((item) => item.net)) : 0;
  const putts = validScores.reduce((sum, item) => sum + item.putts, 0);
  return { scores, bestGross, bestNet, putts };
}

function teamTotals(teamId) {
  return state.holes.reduce(
    (total, currentHole) => {
      const result = teamHoleResult(teamId, currentHole.number);
      return {
        gross: total.gross + result.bestGross,
        net: total.net + result.bestNet,
        putts: total.putts + result.putts,
        played: total.played + (result.bestGross > 0 ? 1 : 0),
        validated: total.validated + (isHoleValidated(teamId, currentHole.number) ? 1 : 0),
        par: total.par + (result.bestGross > 0 ? currentHole.par : 0),
      };
    },
    { gross: 0, net: 0, putts: 0, played: 0, validated: 0, par: 0 },
  );
}

function combinedTotals() {
  return state.teams.reduce(
    (sum, item) => {
      const totals = teamTotals(item.id);
      return {
        gross: sum.gross + totals.gross,
        net: sum.net + totals.net,
        putts: sum.putts + totals.putts,
        played: sum.played + totals.played,
        validated: sum.validated + totals.validated,
        par: sum.par + totals.par,
      };
    },
    { gross: 0, net: 0, putts: 0, played: 0, validated: 0, par: 0 },
  );
}

function setSummaryTeam(teamId) {
  if (!team(teamId)) return;
  state.selectedSummaryTeamId = teamId;
  saveLocalOnly();
  render();
}

function playerStats(playerId) {
  const playerTeam = teamForPlayer(playerId);
  return state.holes.reduce(
    (stats, currentHole) => {
      const score = getPlayerScore(playerTeam.id, currentHole.number, playerId);
      if (score.gross === "") return stats;
      const gross = Number(score.gross);
      const putts = score.putts === "" ? 0 : Number(score.putts);
      const diff = gross - currentHole.par;
      return {
        holes: stats.holes + 1,
        gross: stats.gross + gross,
        putts: stats.putts + putts,
        eagles: stats.eagles + (diff <= -2 ? 1 : 0),
        birdies: stats.birdies + (diff === -1 ? 1 : 0),
        pars: stats.pars + (diff === 0 ? 1 : 0),
        bogeys: stats.bogeys + (diff === 1 ? 1 : 0),
        doubles: stats.doubles + (diff >= 2 ? 1 : 0),
      };
    },
    { holes: 0, gross: 0, putts: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0 },
  );
}

function formatToPar(value) {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : String(value);
}

function render() {
  if (!session) {
    document.getElementById("app").innerHTML = renderLogin();
    return;
  }
  keepSessionInsideScope();
  document.getElementById("app").innerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <img src="open-golf-connect.jpg" alt="Open Golf Connect" />
          <div>
            <h1>Open Golf Connect</h1>
            <p>Joyenval · shamble à 2 · brut, net et putts</p>
          </div>
        </div>
        <div class="status">${remoteReady ? "Live partagé" : "Mode local"} · ${supabaseClient ? "sync auto" : "sync indisponible"}</div>
        <button class="btn logout-btn" onclick="logout()">${session.label} · Sortir</button>
      </div>
    </header>
    <main class="container">
      ${state.activeView === "home" ? renderHero() : ""}
      ${renderTabs()}
      <section class="view ${state.activeView === "home" ? "active" : ""}">${renderHome()}</section>
      <section class="view ${state.activeView === "course" ? "active" : ""}">${renderCourse()}</section>
      <section class="view ${state.activeView === "score" ? "active" : ""}">${renderScoring()}</section>
      <section class="view ${state.activeView === "board" ? "active" : ""}">${renderSummary()}</section>
    </main>
    ${renderBottomNav()}
  `;
}

function renderLogin() {
  return `
    <main class="login-screen">
      <form class="login-panel" onsubmit="login(event)">
        <img class="login-logo" src="open-golf-connect.jpg" alt="Open Golf Connect" />
        <h1>Open Golf Connect</h1>
        <p>Connexion joueur ou administrateur.</p>
        <div class="field">
          <label>Mot de passe</label>
          <input id="password" type="password" autocomplete="current-password" autofocus />
        </div>
        <button class="btn primary login-btn" type="submit">Entrer</button>
        <div class="login-error"></div>
      </form>
    </main>
  `;
}

function renderHero() {
  return `
    <section class="hero">
      <div class="hero-content">
        <div class="tag-row">
          <span class="tag">Golf de Joyenval</span>
          <span class="tag">Shotgun 13h</span>
          <span class="tag">Marly + Retz</span>
          <span class="tag">Shamble équipe de 2</span>
        </div>
        <h2>Open Golf Connect</h2>
        <p>L’équipe de l’Open de Panse relève le challenge Open Golf Connect avec une ambition très claire : jouer collectif, claquer quelques bons drives et garder un œil sur la demi-pension au Dinarobin, à l’île Maurice... bref, on va surtout tout miser sur le tirage au sort.</p>
      </div>
    </section>
  `;
}

function renderTabs() {
  return `
    <nav class="tabs">
      ${Object.entries(availableIcons()).map(([view, label]) => `<button class="tab ${state.activeView === view ? "active" : ""}" onclick="setState({ activeView: '${view}' })">${label}</button>`).join("")}
    </nav>
  `;
}

function renderHome() {
  return `
    <div class="grid two">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Parties et handicaps</h3>
            <p>Un groupe de 4, deux binomes shamble, auto-marquage dans chaque binome.</p>
          </div>
          <span class="badge gold">${isAdmin() ? "Admin" : "Profil joueur"} · ${state.handicapAllowance}% hcp</span>
        </div>
        <div class="panel-body grid">
          <div class="field">
            <label>Allowance handicap shamble</label>
            <input type="number" min="0" max="100" step="1" value="${state.handicapAllowance}" ${isAdmin() ? "" : "disabled"} onchange="setState({ handicapAllowance: Number(this.value) })" />
          </div>
          ${visibleTeams().map(renderTeamCard).join("")}
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Règles shamble retenues</h3>
            <p>Base de travail pour la compétition.</p>
          </div>
        </div>
        <div class="panel-body">
          <ol class="rules-list">
            <li>Les deux joueurs tapent leur mise en jeu.</li>
            <li>L’équipe choisit le meilleur drive.</li>
            <li>Les deux joueurs rejouent depuis cet emplacement.</li>
            <li>Chaque joueur termine ensuite sa propre balle jusqu’au trou.</li>
            <li>Le score équipe prend la meilleure balle en brut et en net.</li>
            <li>Les putts sont saisis joueur par joueur pour garder la statistique.</li>
          </ol>
        </div>
      </article>
    </div>
  `;
}

function renderTeamCard(selectedTeam) {
  const totals = teamTotals(selectedTeam.id);
  const marker = player(selectedTeam.markerPlayerId);
  return `
    <div class="panel team-card">
      <div class="panel-head">
        <div class="team-title">
          <strong>${selectedTeam.name}</strong>
        </div>
        <span class="badge blue">Marqueur : ${marker?.name || "à définir"}</span>
      </div>
      <div class="panel-body grid">
        <div class="field">
          <label>Marqueur du binome</label>
          <select onchange="updateMarker('${selectedTeam.id}', this.value)">
            ${selectedTeam.players.map((playerId) => `<option value="${playerId}" ${selectedTeam.markerPlayerId === playerId ? "selected" : ""}>${player(playerId).name}</option>`).join("")}
          </select>
        </div>
        ${selectedTeam.players.map((playerId) => {
          const currentPlayer = player(playerId);
          return `
            <div class="player-row">
              <div class="field">
                <label>Joueur</label>
                <input value="${currentPlayer.name}" ${isAdmin() ? "" : "disabled"} onchange="updatePlayer('${playerId}', 'name', this.value)" />
              </div>
              <div class="field">
                <label>Index</label>
                <input type="number" step="0.1" value="${currentPlayer.handicap}" ${isAdmin() ? "" : "disabled"} onchange="updatePlayer('${playerId}', 'handicap', this.value)" />
              </div>
              <div class="field">
                <label>Hcp jeu</label>
                <input value="${((currentPlayer.handicap * state.handicapAllowance) / 100).toFixed(1)}" disabled />
              </div>
            </div>
          `;
        }).join("")}
        <div class="totals">
          <div class="metric"><span>Brut équipe</span><strong>${totals.gross}</strong></div>
          <div class="metric"><span>Net équipe</span><strong>${totals.net}</strong></div>
          <div class="metric"><span>Brut / par</span><strong>${formatToPar(totals.gross - totals.par)}</strong></div>
          <div class="metric"><span>Trous joués</span><strong>${totals.played}/18</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderCourse() {
  if (!isAdmin()) {
    return `
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Parcours réservé à l'administrateur</h3>
            <p>Les joueurs accèdent à leur carte de score dès que le parcours est validé.</p>
          </div>
        </div>
      </article>
    `;
  }
  return `
    <article class="panel">
      <div class="panel-head">
        <div>
          <h3>Preparation du parcours composite</h3>
          <p>Choisis les 18 trous en amont. Le par et le SIF se remplissent automatiquement depuis le parcours selectionne.</p>
        </div>
        <span class="badge ${state.courseLocked ? "blue" : "gold"}">${state.courseLocked ? "Parcours validé" : "À valider"}</span>
      </div>
      <div class="panel-body grid">
        <div class="field">
          <label>Nom du parcours</label>
          <input value="${state.courseName}" onchange="setState({ courseName: this.value })" />
        </div>
        <div class="course-builder">
          ${state.holes.map((item, index) => `
            <div class="hole-row">
              <div class="hole-number">${item.number}</div>
              <div class="field">
                <label>Parcours</label>
                <select onchange="updateHole(${index}, 'source', this.value)">
                  <option ${item.source === "Marly" ? "selected" : ""}>Marly</option>
                  <option ${item.source === "Retz" ? "selected" : ""}>Retz</option>
                </select>
              </div>
              <div class="field">
                <label>Trou joué</label>
                <input type="number" min="1" max="18" value="${item.sourceHole}" onchange="updateHole(${index}, 'sourceHole', this.value)" />
              </div>
              <div class="field">
                <label>Par auto</label>
                <input value="${item.par}" disabled />
              </div>
              <div class="field">
                <label>SIF auto</label>
                <input value="${item.strokeIndex}" disabled />
              </div>
            </div>
          `).join("")}
        </div>
        <div class="quick-actions">
          <button class="btn primary" onclick="launchRound()">Valider le parcours et lancer la partie</button>
          <button class="btn" onclick="resetCourse()">Réinitialiser</button>
        </div>
      </div>
    </article>
  `;
}

function renderScoring() {
  if (!state.courseLocked) {
    return `
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Carte de score verrouillee</h3>
            <p>${isAdmin() ? "Valide d’abord les 18 trous du parcours composite pour lancer la partie." : "Le parcours n'a pas encore été validé par l'administrateur."}</p>
          </div>
          ${isAdmin() ? `<button class="btn primary" onclick="setState({ activeView: 'course' })">Préparer le parcours</button>` : ""}
        </div>
        <div class="panel-body">
          <div class="totals">
            <div class="metric"><span>Parcours</span><strong>18 trous</strong></div>
            <div class="metric"><span>Statut</span><strong>À valider</strong></div>
            <div class="metric"><span>Formule</span><strong>Shamble</strong></div>
            <div class="metric"><span>Groupe</span><strong>4 joueurs</strong></div>
          </div>
        </div>
      </article>
    `;
  }
  const teams = visibleTeams();
  const selectedTeam = teams.find((item) => item.id === state.selectedTeamId) || teams[0];
  if (!selectedTeam) return "";
  const selectedHole = hole(state.selectedHole);
  const drive = state.scores[driveKey(selectedTeam.id, selectedHole.number)] || selectedTeam.players[0];
  const result = teamHoleResult(selectedTeam.id, selectedHole.number);
  const validated = isHoleValidated(selectedTeam.id, selectedHole.number);
  return `
    <div class="grid two">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Saisie par marqueur</h3>
            <p>${state.courseName}</p>
          </div>
        </div>
        <div class="panel-body score-card">
          <div class="score-controls">
            <div class="field">
              <label>Equipe scoree</label>
              <select ${teams.length === 1 ? "disabled" : ""} onchange="selectTeamForScoring(this.value)">
                ${teams.map((item) => `<option value="${item.id}" ${item.id === selectedTeam.id ? "selected" : ""}>${item.name}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Marqueur</label>
              <select onchange="updateMarker('${selectedTeam.id}', this.value)">
                ${selectedTeam.players.map((playerId) => `<option value="${playerId}" ${selectedTeam.markerPlayerId === playerId ? "selected" : ""}>${player(playerId).name}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="hole-switcher">
            ${state.holes.map((item) => `<button class="hole-btn ${item.number === selectedHole.number ? "active" : ""} ${isHoleValidated(selectedTeam.id, item.number) ? "validated" : ""}" onclick="selectHole('${selectedTeam.id}', ${item.number})">${item.number}</button>`).join("")}
          </div>
          <div class="hole-meta">
            <span class="badge">${selectedHole.source} ${selectedHole.sourceHole}</span>
            <span class="badge">Par ${selectedHole.par}</span>
            <span class="badge">SI ${selectedHole.strokeIndex}</span>
          </div>
          <div class="field">
            <label>Drive retenu</label>
            <div class="drive-picker">
              ${selectedTeam.players.map((playerId) => `
                <label>
                  <input type="radio" name="drive" ${drive === playerId ? "checked" : ""} onchange="updateDrive('${selectedTeam.id}', ${selectedHole.number}, '${playerId}')" />
                  ${player(playerId).name}
                </label>
              `).join("")}
            </div>
          </div>
          <div class="mobile-score-list">
            ${selectedTeam.players.map((playerId) => renderScorePlayerRow(selectedTeam.id, selectedHole, playerId)).join("")}
          </div>
          ${renderScoreKeypad()}
          <div class="quick-actions">
            <button class="btn primary" onclick="validateHole('${selectedTeam.id}', ${selectedHole.number})">${validated ? "Trou validé · passer au suivant" : "Valider le trou"}</button>
            <span class="badge ${validated ? "blue" : "gold"}">${validated ? "Score validé" : "En attente de validation"}</span>
          </div>
        </div>
      </article>
      <aside class="panel">
        <div class="panel-head">
          <div>
            <h3>Resume trou ${selectedHole.number}</h3>
            <p>Meilleure balle équipe, brut et net.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="totals">
            <div class="metric"><span>Brut</span><strong>${result.bestGross}</strong></div>
            <div class="metric"><span>Net</span><strong>${result.bestNet}</strong></div>
            <div class="metric"><span>Putts</span><strong>${result.putts}</strong></div>
            <div class="metric"><span>Drive</span><strong>${player(drive).name}</strong></div>
          </div>
        </div>
      </aside>
    </div>
  `;
}

function renderScorePlayerRow(teamId, selectedHole, playerId) {
  const currentPlayer = player(playerId);
  const score = getPlayerScore(teamId, selectedHole.number, playerId);
  const grossValue = score.gross === "" ? "" : score.gross;
  const puttValue = score.putts === "" ? "" : score.putts;
  const grossCell = scoreCellId(teamId, selectedHole.number, playerId, "gross");
  const puttCell = scoreCellId(teamId, selectedHole.number, playerId, "putts");
  return `
    <div class="mobile-player-score-row">
      <div class="mobile-player-name">
        <strong>${currentPlayer.name}</strong>
        <small>${strokesForHole(playerId, selectedHole.number)} rendu · ${selectedHole.source} ${selectedHole.sourceHole}</small>
      </div>
      <button type="button" class="score-tap-cell ${state.activeScoreCell === grossCell ? "active" : ""}" onclick="selectScoreCell('${teamId}', ${selectedHole.number}, '${playerId}', 'gross')">
        <span>Score</span>
        <b>${grossValue}</b>
      </button>
      <button type="button" class="score-tap-cell ${state.activeScoreCell === puttCell ? "active" : ""}" onclick="selectScoreCell('${teamId}', ${selectedHole.number}, '${playerId}', 'putts')">
        <span>Putts</span>
        <b>${puttValue}</b>
      </button>
    </div>
  `;
}

function renderScoreKeypad() {
  const activeLabel = state.activeScoreCell ? "Case sélectionnée" : "Choisis une case Score ou Putts";
  return `
    <div class="mobile-keypad-card">
      <div class="keypad-status">
        <strong>${activeLabel}</strong>
        <button class="btn" type="button" onclick="clearScoreCell()">Effacer</button>
      </div>
      <div class="mobile-keypad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => `
          <button class="keypad-key" type="button" onclick="keypadScore(${value})">${value}</button>
        `).join("")}
        <button class="keypad-key muted" type="button" onclick="keypadScore(0)">0</button>
      </div>
    </div>
  `;
}

function renderSummary() {
  const selectedSummaryTeam = team(state.selectedSummaryTeamId) || state.teams[0];
  return `
    <div class="grid">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Score de l'équipe</h3>
            <p>Suivi collectif : binôme 1, binôme 2 et cumul global de l'équipe de 4.</p>
          </div>
        </div>
        <div class="panel-body">
          ${renderSummaryCards()}
          ${renderAugustaScorecard(selectedSummaryTeam)}
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h3>Statistiques joueurs</h3>
            <p>Lecture individuelle : trous joués, cartes réalisées et putting.</p>
          </div>
        </div>
        <div class="panel-body stats-grid">
          ${state.players.map(renderPlayerStats).join("")}
        </div>
      </article>
    </div>
  `;
}

function renderSummaryCards() {
  const rows = state.teams.map((item) => ({ ...item, totals: teamTotals(item.id) }));
  const combined = combinedTotals();
  return `
    <div class="summary-cards">
      ${rows.map((item, index) => `
        <button class="summary-team-card ${state.selectedSummaryTeamId === item.id ? "active" : ""}" onclick="setSummaryTeam('${item.id}')">
          <div class="summary-card-title">
            <span class="badge blue">Equipe ${index + 1}</span>
            <strong>${item.name}</strong>
          </div>
          <div class="summary-metrics">
            <div><span>Trous validés</span><strong>${item.totals.validated}/18</strong></div>
            <div><span>Trou en cours</span><strong>${currentHoleForTeam(item.id)}</strong></div>
            <div><span>Net</span><strong>${item.totals.net}</strong></div>
            <div><span>Brut</span><strong>${item.totals.gross}</strong></div>
            <div><span>Putts</span><strong>${item.totals.putts}</strong></div>
          </div>
        </button>
      `).join("")}
      <div class="summary-team-card combined">
        <div class="summary-card-title">
          <span class="badge gold">A+B</span>
          <strong>Cumul équipe complète</strong>
        </div>
        <div class="summary-metrics">
          <div><span>Trous validés</span><strong>${combined.validated}/36</strong></div>
          <div><span>Trou en cours</span><strong>Shotgun</strong></div>
          <div><span>Net</span><strong>${combined.net}</strong></div>
          <div><span>Brut</span><strong>${combined.gross}</strong></div>
          <div><span>Putts</span><strong>${combined.putts}</strong></div>
        </div>
      </div>
    </div>
  `;
}

function renderAugustaScorecard(selectedTeam) {
  const current = currentHoleForTeam(selectedTeam.id);
  return `
    <div class="augusta-card">
      <div class="augusta-head">
        <div>
          <span class="badge gold">Carte Augusta</span>
          <h4>${selectedTeam.name}</h4>
        </div>
        <span class="badge blue">Trou en cours ${current}</span>
      </div>
      ${renderAugustaNine(selectedTeam, state.holes.slice(0, 9), "Aller")}
      ${renderAugustaNine(selectedTeam, state.holes.slice(9), "Retour")}
    </div>
  `;
}

function renderAugustaNine(selectedTeam, holes, label) {
  return `
    <div class="scorecard-wrap">
      <table class="augusta-table">
        <caption>${label}</caption>
        <tbody>
          <tr>
            <th>Trou</th>
            ${holes.map((item) => `<td class="${augustaHoleClass(selectedTeam.id, item.number)}">${item.number}</td>`).join("")}
            <td>Total</td>
          </tr>
          <tr>
            <th>Par</th>
            ${holes.map((item) => `<td>${item.par}</td>`).join("")}
            <td>${holes.reduce((sum, item) => sum + item.par, 0)}</td>
          </tr>
          <tr>
            <th>Origine</th>
            ${holes.map((item) => `<td>${item.source[0]}${item.sourceHole}</td>`).join("")}
            <td>-</td>
          </tr>
          <tr>
            <th>Brut</th>
            ${holes.map((item) => `<td>${scorecardValue(selectedTeam.id, item.number, "gross")}</td>`).join("")}
            <td>${sumScorecard(selectedTeam.id, holes, "gross")}</td>
          </tr>
          <tr>
            <th>Net</th>
            ${holes.map((item) => `<td>${scorecardValue(selectedTeam.id, item.number, "net")}</td>`).join("")}
            <td>${sumScorecard(selectedTeam.id, holes, "net")}</td>
          </tr>
          <tr>
            <th>Putts</th>
            ${holes.map((item) => `<td>${scorecardValue(selectedTeam.id, item.number, "putts")}</td>`).join("")}
            <td>${sumScorecard(selectedTeam.id, holes, "putts")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function augustaHoleClass(teamId, holeNumber) {
  const classes = [];
  if (currentHoleForTeam(teamId) === holeNumber) classes.push("current");
  if (isHoleValidated(teamId, holeNumber)) classes.push("validated");
  return classes.join(" ");
}

function scorecardValue(teamId, holeNumber, field) {
  const result = teamHoleResult(teamId, holeNumber);
  if (!result.bestGross) return "";
  if (field === "gross") return result.bestGross;
  if (field === "net") return result.bestNet;
  if (field === "putts") return result.putts;
  return "";
}

function sumScorecard(teamId, holes, field) {
  return holes.reduce((sum, item) => sum + (Number(scorecardValue(teamId, item.number, field)) || 0), 0);
}

function renderPlayerStats(currentPlayer) {
  const stats = playerStats(currentPlayer.id);
  return `
    <div class="stat-card ${session.playerId === currentPlayer.id ? "mine" : ""}">
      <div class="stat-card-head">
        <strong>${currentPlayer.name}</strong>
        <span class="badge">${stats.holes}/18</span>
      </div>
      <div class="mini-metrics">
        <div><span>Brut</span><strong>${stats.gross}</strong></div>
        <div><span>Putts</span><strong>${stats.putts}</strong></div>
        <div><span>Moy. putts</span><strong>${stats.holes ? (stats.putts / stats.holes).toFixed(1) : "-"}</strong></div>
      </div>
      <div class="stat-line"><span>Eagles +</span><strong>${stats.eagles}</strong></div>
      <div class="stat-line"><span>Birdies</span><strong>${stats.birdies}</strong></div>
      <div class="stat-line"><span>Pars</span><strong>${stats.pars}</strong></div>
      <div class="stat-line"><span>Bogeys</span><strong>${stats.bogeys}</strong></div>
      <div class="stat-line"><span>Doubles +</span><strong>${stats.doubles}</strong></div>
    </div>
  `;
}

function renderBottomNav() {
  const navItems = Object.entries(availableIcons());
  return `
    <nav class="bottom-nav">
      <div class="bottom-nav-inner" style="grid-template-columns: repeat(${navItems.length}, minmax(0, 1fr));">
        ${navItems.map(([view, label]) => `<button class="nav-btn ${state.activeView === view ? "active" : ""}" onclick="setState({ activeView: '${view}' })">${label}</button>`).join("")}
      </div>
    </nav>
  `;
}

function resetCourse() {
  if (!isAdmin()) return;
  state.holes = makeCourseHoles();
  state.courseName = "Composite Joyenval Marly / Retz";
  state.courseLocked = false;
  state.currentHoles = {};
  state.scores = {};
  state.validatedHoles = {};
  saveState();
  render();
}

function launchRound() {
  if (!isAdmin()) return;
  state.courseLocked = true;
  state.activeView = "score";
  state.selectedHole = 1;
  state.currentHoles = {};
  state.scores = {};
  state.validatedHoles = {};
  saveState();
  render();
}

render();
if (session) startRemoteSync();
