var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/music-ids.ts
var MUSIC_APP_ID, MUSIC_LEGACY_APP_ID;
var init_music_ids = __esm({
  "src/music-ids.ts"() {
    MUSIC_APP_ID = "music";
    MUSIC_LEGACY_APP_ID = "com.example.music";
  }
});

// src/music-runtime-app-id.ts
function setMusicRuntimeAppId(appId2) {
  const trimmed = appId2.trim();
  runtimeAppId = trimmed || MUSIC_APP_ID;
}
function getMusicRuntimeAppId() {
  return runtimeAppId;
}
function bindMusicRuntimeAppIdFromHost(host2) {
  setMusicRuntimeAppId(host2.appId?.trim() || MUSIC_APP_ID);
}
function getMusicLegacyStorageAppId() {
  const current = getMusicRuntimeAppId();
  if (current === MUSIC_APP_ID) {
    return MUSIC_LEGACY_APP_ID;
  }
  if (current === MUSIC_LEGACY_APP_ID) {
    return MUSIC_APP_ID;
  }
  return null;
}
var runtimeAppId;
var init_music_runtime_app_id = __esm({
  "src/music-runtime-app-id.ts"() {
    init_music_ids();
    runtimeAppId = MUSIC_APP_ID;
  }
});

// src/music-host.ts
var music_host_exports = {};
__export(music_host_exports, {
  getMusicHostApi: () => getMusicHostApi,
  resetMusicHostApi: () => resetMusicHostApi,
  setMusicHostApi: () => setMusicHostApi,
  tryGetMusicHostApi: () => tryGetMusicHostApi
});
function setMusicHostApi(next) {
  hostApi = next;
}
function resetMusicHostApi() {
  hostApi = null;
}
function getMusicHostApi() {
  if (!hostApi) {
    throw new Error("Music mini-app is not activated");
  }
  return hostApi;
}
function tryGetMusicHostApi() {
  return hostApi;
}
var hostApi;
var init_music_host = __esm({
  "src/music-host.ts"() {
    hostApi = null;
  }
});

// src/playback-leader.ts
function initMusicPlaybackLeader(host2) {
  if (localClientIdPromise) {
    return;
  }
  localClientIdPromise = (async () => {
    try {
      const id = await host2.connection?.getClientId?.();
      localClientId = typeof id === "string" && id.trim() ? id.trim() : null;
    } catch {
      localClientId = null;
    }
    return localClientId;
  })();
}
function whenLocalPlaybackClientIdReady() {
  if (localClientId) {
    return Promise.resolve(localClientId);
  }
  return localClientIdPromise ?? Promise.resolve(null);
}
function getLocalPlaybackClientId() {
  return localClientId;
}
async function publishMusicPlaybackFocusClaim(sync) {
  const clientId = await whenLocalPlaybackClientIdReady();
  if (!clientId || !sync) {
    return;
  }
  sync.publish({
    appId: MUSIC_APP_ID,
    channel: MUSIC_PLAYBACK_FOCUS_CHANNEL,
    revision: Date.now(),
    payload: { clientId }
  });
}
function shouldHandleRemotePlaybackFocusClaim(publisherClientId) {
  const publisher = publisherClientId?.trim();
  if (!publisher) {
    return false;
  }
  const local = getLocalPlaybackClientId();
  return Boolean(local && publisher !== local);
}
var MUSIC_PLAYBACK_FOCUS_CHANNEL, localClientId, localClientIdPromise;
var init_playback_leader = __esm({
  "src/playback-leader.ts"() {
    init_music_ids();
    MUSIC_PLAYBACK_FOCUS_CHANNEL = "music-playback-focus";
    localClientId = null;
    localClientIdPromise = null;
  }
});

// src/music-autoplay.ts
function requestTrackAutoPlay(trackId) {
  const normalized = trackId.trim();
  pendingAutoPlayTrackId = normalized.length > 0 ? normalized : null;
}
function clearPendingTrackAutoPlay() {
  pendingAutoPlayTrackId = null;
}
function takePendingAutoPlayTrackId(expectedTrackId) {
  if (!pendingAutoPlayTrackId || pendingAutoPlayTrackId !== expectedTrackId) {
    return false;
  }
  pendingAutoPlayTrackId = null;
  return true;
}
function shouldRequestAutoPlayOnOpenPlayer(input) {
  return input.explicitAutoPlay === true || Boolean(input.wantsPlaying);
}
function resolveMusicResumePositionSec(input) {
  if (input.switchingTrack || !input.nowPlayingMatches) {
    return 0;
  }
  const storeSec = typeof input.storePositionSec === "number" && Number.isFinite(input.storePositionSec) ? Math.max(0, Math.floor(input.storePositionSec)) : 0;
  const liveSec = typeof input.audioCurrentTimeSec === "number" && Number.isFinite(input.audioCurrentTimeSec) ? Math.max(0, Math.floor(input.audioCurrentTimeSec)) : 0;
  return Math.max(storeSec, liveSec);
}
var pendingAutoPlayTrackId;
var init_music_autoplay = __esm({
  "src/music-autoplay.ts"() {
    pendingAutoPlayTrackId = null;
  }
});

// src/playback-cold-restore.ts
function shouldRestoreMusicPlaybackAfterColdStart(state) {
  if (!state.wantsPlaying || !state.nowPlayingId) {
    return null;
  }
  const track = state.tracks.find((item) => item.id === state.nowPlayingId);
  const sourceUri = track?.sourceUri?.trim() ?? "";
  if (!sourceUri) {
    return null;
  }
  return { trackId: state.nowPlayingId, sourceUri };
}
var init_playback_cold_restore = __esm({
  "src/playback-cold-restore.ts"() {
  }
});

// src/playback-session.ts
function normalizeMusicPlaybackSessionSnapshot(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const doc = raw;
  const nowPlayingId = typeof doc.nowPlayingId === "string" && doc.nowPlayingId.trim().length > 0 ? doc.nowPlayingId.trim() : doc.nowPlayingId === null ? null : null;
  if (doc.nowPlayingId != null && typeof doc.nowPlayingId !== "string") {
    return null;
  }
  const positionRaw = doc.playbackPositionSec;
  const playbackPositionSec = typeof positionRaw === "number" && Number.isFinite(positionRaw) && positionRaw >= 0 ? Math.floor(positionRaw) : 0;
  const updatedRaw = doc.updatedAt;
  const updatedAt = typeof updatedRaw === "number" && Number.isFinite(updatedRaw) && updatedRaw > 0 ? Math.floor(updatedRaw) : 0;
  if (!updatedAt) {
    return null;
  }
  return {
    nowPlayingId,
    wantsPlaying: Boolean(doc.wantsPlaying),
    playbackPositionSec,
    updatedAt
  };
}
function buildMusicPlaybackSessionSnapshot(input) {
  const live = typeof input.audioCurrentTimeSec === "number" && Number.isFinite(input.audioCurrentTimeSec) ? Math.max(0, Math.floor(input.audioCurrentTimeSec)) : 0;
  const storeSec = typeof input.playbackPositionSec === "number" && Number.isFinite(input.playbackPositionSec) ? Math.max(0, Math.floor(input.playbackPositionSec)) : 0;
  return {
    nowPlayingId: input.nowPlayingId?.trim() ? input.nowPlayingId.trim() : null,
    wantsPlaying: Boolean(input.wantsPlaying),
    playbackPositionSec: Math.max(storeSec, live),
    updatedAt: input.updatedAt ?? Date.now()
  };
}
function writeMusicPlaybackSessionSnapshotSync(snapshot) {
  if (typeof localStorage === "undefined") {
    return false;
  }
  try {
    localStorage.setItem(MUSIC_PLAYBACK_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}
function readMusicPlaybackSessionSnapshotSync() {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(MUSIC_PLAYBACK_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeMusicPlaybackSessionSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}
function resolveMusicPlaybackSessionMerge(input) {
  const snap = input.snapshot;
  if (!snap?.nowPlayingId) {
    return {
      apply: false,
      playbackPositionSec: input.storePlaybackPositionSec,
      wantsPlaying: input.storeWantsPlaying
    };
  }
  if (input.storeNowPlayingId && input.storeNowPlayingId !== snap.nowPlayingId) {
    return {
      apply: false,
      playbackPositionSec: input.storePlaybackPositionSec,
      wantsPlaying: input.storeWantsPlaying
    };
  }
  const storeSec = typeof input.storePlaybackPositionSec === "number" && Number.isFinite(input.storePlaybackPositionSec) ? Math.max(0, Math.floor(input.storePlaybackPositionSec)) : 0;
  return {
    apply: true,
    playbackPositionSec: Math.max(storeSec, snap.playbackPositionSec),
    wantsPlaying: snap.wantsPlaying
  };
}
function resolveMusicPlaybackSessionWrite(input) {
  const id = input.nowPlayingId?.trim() ? input.nowPlayingId.trim() : null;
  if (!id) {
    return null;
  }
  const existing = input.existing;
  const sameTrack = Boolean(existing?.nowPlayingId && existing.nowPlayingId === id);
  const incomingSec = typeof input.playbackPositionSec === "number" && Number.isFinite(input.playbackPositionSec) ? Math.max(0, Math.floor(input.playbackPositionSec)) : 0;
  let playbackPositionSec = incomingSec;
  if (sameTrack && existing && existing.playbackPositionSec > playbackPositionSec) {
    playbackPositionSec = existing.playbackPositionSec;
  }
  const livePlaying = Boolean(input.livePlaying);
  let wantsPlaying = Boolean(input.wantsPlaying) || livePlaying;
  if (sameTrack && existing?.wantsPlaying && !livePlaying && incomingSec === 0) {
    wantsPlaying = true;
  }
  return buildMusicPlaybackSessionSnapshot({
    nowPlayingId: id,
    wantsPlaying,
    playbackPositionSec,
    updatedAt: input.updatedAt
  });
}
var MUSIC_PLAYBACK_SESSION_STORAGE_KEY, MUSIC_PLAYBACK_SESSION_BUILD;
var init_playback_session = __esm({
  "src/playback-session.ts"() {
    MUSIC_PLAYBACK_SESSION_STORAGE_KEY = "agnx.music.playback-session.v1";
    MUSIC_PLAYBACK_SESSION_BUILD = "session-noclobber-v2";
  }
});

// src/track-menu.ts
function resolveMusicTrackMenuIcon(actionId, pinned) {
  if (actionId === "pin") {
    return pinned ? import_lucide_react_native.PinOff : import_lucide_react_native.Pin;
  }
  return MUSIC_TRACK_MENU_ICONS[actionId];
}
function isMusicTrackMenuActionId(id) {
  return Object.prototype.hasOwnProperty.call(MUSIC_TRACK_MENU_ACTION_LABELS, id);
}
function resolveMusicTrackMenuActionId(id) {
  if (isMusicTrackMenuActionId(id)) {
    return id;
  }
  return MUSIC_TRACK_MENU_ACTION_BY_CONTRIBUTION_ID[id] ?? null;
}
function isMusicTrackMenuDestructive(id) {
  return id === "deleteTrack";
}
function resolveMusicTrackMenuLabel(id, input) {
  if (id === "pin") {
    return input?.pinned ? "\u53D6\u6D88\u7F6E\u9876" : "\u7F6E\u9876";
  }
  if (id === "addPlaylist" && input?.surface === "queue") {
    return "\u79FB\u51FA\u64AD\u653E\u5217\u8868";
  }
  return MUSIC_TRACK_MENU_ACTION_LABELS[id];
}
function resolveMusicTrackMenuPresentation(id, input) {
  const surface = input?.surface ?? "default";
  if (id === "addPlaylist" && surface === "queue") {
    return {
      label: "\u79FB\u51FA\u64AD\u653E\u5217\u8868",
      icon: import_lucide_react_native.ListMinus,
      destructive: true,
      active: false
    };
  }
  return {
    label: resolveMusicTrackMenuLabel(id, input),
    icon: resolveMusicTrackMenuIcon(id, input?.pinned),
    destructive: isMusicTrackMenuDestructive(id),
    active: id === "pin" ? Boolean(input?.pinned) : false
  };
}
function buildMusicTrackMenuItems(input) {
  return input.actionIds.map((id) => {
    const presentation = resolveMusicTrackMenuPresentation(id, {
      pinned: input.pinned,
      surface: input.surface
    });
    return {
      type: "item",
      id,
      label: presentation.label,
      icon: presentation.icon,
      active: presentation.active,
      destructive: presentation.destructive,
      shortcutKeys: input.shortcutKeys?.[id] ?? MUSIC_TRACK_MENU_SHORTCUT_KEYS[id],
      shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[id]
    };
  });
}
function buildMusicPlayerOverflowMenuItems(input) {
  const folded = [...input.foldedBarActionIds ?? []];
  const foldedSet = new Set(folded);
  const overflow = input.menuActionIds.filter((id) => !foldedSet.has(id));
  const items = buildMusicTrackMenuItems({
    actionIds: folded,
    pinned: input.pinned,
    surface: input.surface,
    shortcutKeys: input.trackShortcutKeys
  });
  if (folded.length > 0 && overflow.length > 0) {
    items.push({ type: "separator" });
  }
  items.push(
    ...buildMusicTrackMenuItems({
      actionIds: overflow,
      pinned: input.pinned,
      surface: input.surface,
      shortcutKeys: input.trackShortcutKeys
    })
  );
  return items;
}
var import_lucide_react_native, MUSIC_TRACK_MENU_ACTION_LABELS, MUSIC_TRACK_MENU_ICONS, MUSIC_TRACK_MENU_CONTRIBUTION_IDS, MUSIC_TRACK_MENU_ACTION_BY_CONTRIBUTION_ID, MUSIC_TRACK_MENU_SHORTCUT_KEYS, MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS, MUSIC_SIDEBAR_TRACK_MENU_IDS, MUSIC_SEARCH_HIT_MENU_ACTION_LABELS, MUSIC_SEARCH_HIT_MENU_ICONS, MUSIC_SEARCH_HIT_MENU_IDS, MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS, MUSIC_SEARCH_COLLECTION_MENU_ICONS, MUSIC_SEARCH_COLLECTION_MENU_IDS;
var init_track_menu = __esm({
  "src/track-menu.ts"() {
    import_lucide_react_native = require("lucide-react-native");
    MUSIC_TRACK_MENU_ACTION_LABELS = {
      pin: "\u7F6E\u9876",
      addPlaylist: "\u52A0\u5165\u64AD\u653E\u5217\u8868",
      playNext: "\u4E0B\u4E00\u9996\u64AD\u653E",
      share: "\u5206\u4EAB",
      detail: "Tab \u8BE6\u60C5",
      exportZip: "\u5BFC\u51FA",
      refreshResources: "\u66F4\u65B0\u6B4C\u66F2",
      deleteTrack: "\u5220\u9664\u6B4C\u66F2"
    };
    MUSIC_TRACK_MENU_ICONS = {
      pin: import_lucide_react_native.Pin,
      addPlaylist: import_lucide_react_native.ListPlus,
      playNext: import_lucide_react_native.ListEnd,
      share: import_lucide_react_native.Share2,
      detail: import_lucide_react_native.Info,
      exportZip: import_lucide_react_native.FolderOutput,
      refreshResources: import_lucide_react_native.RefreshCw,
      deleteTrack: import_lucide_react_native.Trash2
    };
    MUSIC_TRACK_MENU_CONTRIBUTION_IDS = {
      pin: "music.pin",
      addPlaylist: "music.add-to-queue",
      playNext: "music.play-next",
      share: "music.share",
      detail: "music.detail",
      exportZip: "music.export",
      refreshResources: "music.refresh-resources",
      deleteTrack: "music.delete"
    };
    MUSIC_TRACK_MENU_ACTION_BY_CONTRIBUTION_ID = Object.fromEntries(
      Object.entries(MUSIC_TRACK_MENU_CONTRIBUTION_IDS).map(
        ([actionId, contributionId]) => [contributionId, actionId]
      )
    );
    MUSIC_TRACK_MENU_SHORTCUT_KEYS = {
      pin: ["alt", "p"],
      addPlaylist: ["alt", "a"],
      playNext: ["alt", "n"],
      share: ["alt", "s"],
      detail: ["alt", "d"],
      exportZip: ["alt", "e"],
      refreshResources: ["alt", "u"],
      deleteTrack: ["alt", "x"]
    };
    MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS = {
      pin: "transient:music:action:pin",
      addPlaylist: "transient:music:action:addPlaylist",
      playNext: "music:action:playNext",
      share: "music:action:share",
      detail: "music:action:detail",
      exportZip: "music:action:exportZip",
      refreshResources: "music:action:refreshResources",
      deleteTrack: "music:action:deleteTrack"
    };
    MUSIC_SIDEBAR_TRACK_MENU_IDS = [
      "pin",
      "addPlaylist",
      "playNext",
      "share",
      "exportZip",
      "refreshResources",
      "deleteTrack"
    ];
    MUSIC_SEARCH_HIT_MENU_ACTION_LABELS = {
      play: "\u64AD\u653E",
      playNext: "\u4E0B\u4E00\u9996\u64AD\u653E",
      addPlaylist: "\u52A0\u5165\u64AD\u653E\u5217\u8868",
      saveSong: "\u4FDD\u5B58\u6B4C\u66F2"
    };
    MUSIC_SEARCH_HIT_MENU_ICONS = {
      play: import_lucide_react_native.Play,
      playNext: import_lucide_react_native.ListEnd,
      addPlaylist: import_lucide_react_native.ListPlus,
      saveSong: import_lucide_react_native.HardDrive
    };
    MUSIC_SEARCH_HIT_MENU_IDS = [
      "play",
      "playNext",
      "addPlaylist",
      "saveSong"
    ];
    MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS = {
      open: "\u6253\u5F00",
      playAll: "\u64AD\u653E\u5168\u90E8",
      addPlaylist: "\u52A0\u5165\u64AD\u653E\u5217\u8868"
    };
    MUSIC_SEARCH_COLLECTION_MENU_ICONS = {
      open: import_lucide_react_native.Info,
      playAll: import_lucide_react_native.Play,
      addPlaylist: import_lucide_react_native.ListPlus
    };
    MUSIC_SEARCH_COLLECTION_MENU_IDS = [
      "open",
      "playAll",
      "addPlaylist"
    ];
  }
});

// src/player-action-layout.ts
function getDefaultMusicPlayerActionLayout() {
  return {
    bar: ["pin", "playNext", "addPlaylist"],
    overflow: ["share", "exportZip", "refreshResources", "deleteTrack"],
    hidden: [],
    showBarLabels: false
  };
}
function asStringArray(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((item) => typeof item === "string");
}
function shouldMigrateToDefaultLayout(rawBar, rawOverflow, rawHidden) {
  if (rawHidden.length > 0) {
    return false;
  }
  if (rawBar.length === 3 && rawBar[0] === "pin" && rawBar[1] === "detail" && rawBar[2] === "playNext") {
    return true;
  }
  if (rawBar.length === 3 && rawBar[0] === "pin" && rawBar[1] === "addPlaylist" && rawBar[2] === "playNext" && rawOverflow[0] === "share" && rawOverflow.includes("detail")) {
    return true;
  }
  return false;
}
function normalizeMusicPlayerActionLayout(raw) {
  const defaults = getDefaultMusicPlayerActionLayout();
  const rawBar = asStringArray(raw?.bar);
  const rawOverflow = asStringArray(raw?.overflow);
  const rawHidden = asStringArray(raw?.hidden);
  const known = new Set(MUSIC_PLAYER_ACTION_IDS);
  const take = (list) => {
    const out = [];
    for (const item of list) {
      if (LEGACY_DROPPED_IDS.has(item) || !known.has(item)) {
        continue;
      }
      if (!out.includes(item)) {
        out.push(item);
      }
    }
    return out;
  };
  if (rawBar.length === 0 && rawOverflow.length === 0 && rawHidden.length === 0) {
    return defaults;
  }
  if (shouldMigrateToDefaultLayout(rawBar, rawOverflow, rawHidden)) {
    return {
      ...defaults,
      showBarLabels: raw?.showBarLabels ?? defaults.showBarLabels ?? false
    };
  }
  const bar = take(rawBar);
  const overflow = take(rawOverflow);
  const hidden = take(rawHidden);
  if (bar.length === 0 && overflow.length === 0 && hidden.length === 0) {
    return defaults;
  }
  const seen = /* @__PURE__ */ new Set([...bar, ...overflow, ...hidden]);
  for (const id of MUSIC_PLAYER_ACTION_IDS) {
    if (!seen.has(id)) {
      overflow.push(id);
    }
  }
  return {
    bar,
    overflow,
    hidden,
    showBarLabels: raw?.showBarLabels ?? defaults.showBarLabels ?? false
  };
}
function resolveMusicPlayerChromeOverflowIds(layout, _actionRailVisible) {
  return [...normalizeMusicPlayerActionLayout(layout).overflow];
}
function resolveMusicPlayerBarActionIds(layout) {
  return [...normalizeMusicPlayerActionLayout(layout).bar];
}
var MUSIC_PLAYER_ACTION_IDS, MUSIC_PLAYER_ACTION_LABELS, LEGACY_DROPPED_IDS;
var init_player_action_layout = __esm({
  "src/player-action-layout.ts"() {
    init_track_menu();
    MUSIC_PLAYER_ACTION_IDS = [
      ...MUSIC_SIDEBAR_TRACK_MENU_IDS
    ];
    MUSIC_PLAYER_ACTION_LABELS = {
      pin: MUSIC_TRACK_MENU_ACTION_LABELS.pin,
      addPlaylist: MUSIC_TRACK_MENU_ACTION_LABELS.addPlaylist,
      playNext: MUSIC_TRACK_MENU_ACTION_LABELS.playNext,
      share: MUSIC_TRACK_MENU_ACTION_LABELS.share,
      exportZip: MUSIC_TRACK_MENU_ACTION_LABELS.exportZip,
      refreshResources: MUSIC_TRACK_MENU_ACTION_LABELS.refreshResources,
      deleteTrack: MUSIC_TRACK_MENU_ACTION_LABELS.deleteTrack
    };
    LEGACY_DROPPED_IDS = /* @__PURE__ */ new Set([
      "dislike",
      "like",
      "bookmark",
      "saveLocal",
      "search",
      "volume",
      "detail"
    ]);
  }
});

// src/cover-url-quality.ts
function neteaseParamFor(quality) {
  if (quality === "thumb") {
    return "300y300";
  }
  if (quality === "display") {
    return "800y800";
  }
  return null;
}
function qqEdgeFor(quality) {
  if (quality === "thumb") {
    return 300;
  }
  if (quality === "display") {
    return 800;
  }
  return 800;
}
function pixabayEdgeFor(quality) {
  if (quality === "thumb") {
    return 200;
  }
  if (quality === "display") {
    return 1280;
  }
  return null;
}
function rewriteNetease(url, quality) {
  const param = neteaseParamFor(quality);
  if (param == null) {
    url.searchParams.delete("param");
  } else {
    url.searchParams.set("param", param);
  }
  return url.toString();
}
function rewriteQqPath(pathname, quality) {
  const edge = qqEdgeFor(quality);
  return pathname.replace(QQ_SIZE_RE, `$1${edge}x${edge}$2`);
}
function rewritePixabay(url, quality) {
  const edge = pixabayEdgeFor(quality);
  if (edge == null) {
    return url.replace(PIXABAY_SIZE_RE, `_1280x720$3`);
  }
  return url.replace(PIXABAY_SIZE_RE, `_${edge}x${edge}$3`);
}
function resolveCoverUrlQuality(uri, quality) {
  const raw = uri?.trim() || "";
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return raw;
  }
  try {
    const url = new URL(raw);
    if (NETEASE_HOST_RE.test(url.hostname)) {
      return rewriteNetease(url, quality);
    }
    if (QQ_SIZE_RE.test(url.pathname)) {
      url.pathname = rewriteQqPath(url.pathname, quality);
      return url.toString();
    }
    if (/pixabay\.com$/i.test(url.hostname) && PIXABAY_SIZE_RE.test(url.pathname + url.search)) {
      return rewritePixabay(url.toString(), quality);
    }
  } catch {
    return raw;
  }
  return raw;
}
function coverUrlForStorage(uri) {
  return resolveCoverUrlQuality(uri, "original");
}
function coverUrlForHero(uri) {
  return resolveCoverUrlQuality(uri, "original");
}
function coverUrlForThumb(uri) {
  return resolveCoverUrlQuality(uri, "thumb");
}
var NETEASE_HOST_RE, QQ_SIZE_RE, PIXABAY_SIZE_RE;
var init_cover_url_quality = __esm({
  "src/cover-url-quality.ts"() {
    NETEASE_HOST_RE = /(?:^|\.)music\.126\.net$/i;
    QQ_SIZE_RE = /(T\d+R)\d+x\d+(M\d+)/i;
    PIXABAY_SIZE_RE = /_(\d+)x(\d+)(\.[a-z0-9]+)(?:\?|#|$)/i;
  }
});

// src/resource/provider-catalog.ts
function getMusicProviderCapabilities(providerId) {
  return CAP_BY_ID.get(providerId) ?? null;
}
function listWiredDirectSearchProviderIds() {
  return MUSIC_PROVIDER_CAPABILITIES.filter(
    (item) => item.wiredForSearch && !item.isAggregator && item.id !== "local" && item.searchMode !== "aggregator"
  ).map((item) => item.id);
}
function isBrowserSearchProviderId(providerId) {
  return getMusicProviderCapabilities(providerId)?.browserSearch === true;
}
function isDeferredBrowserProviderId(providerId) {
  if (!providerId) {
    return false;
  }
  return getMusicProviderCapabilities(providerId)?.playablePolicy === "deferred-browser";
}
function isAggregatorProviderId(providerId) {
  return getMusicProviderCapabilities(providerId)?.isAggregator === true;
}
function getMusicProviderReferer(providerId) {
  if (!providerId) {
    return void 0;
  }
  return getMusicProviderCapabilities(providerId)?.referer;
}
function getMusicProviderResolvePriority(providerId) {
  const cap = getMusicProviderCapabilities(providerId);
  if (typeof cap?.resolvePriority === "number") {
    return cap.resolvePriority;
  }
  return 99;
}
function shouldIncludeProviderForSelection(providerId, selected) {
  if (!selected || selected.length === 0) {
    return true;
  }
  if (providerId === "local") {
    return selected.includes("local");
  }
  if (isAggregatorProviderId(providerId)) {
    if (selected.includes(providerId)) {
      return true;
    }
    const direct = new Set(listWiredDirectSearchProviderIds());
    return selected.some((id) => id !== "local" && !direct.has(id));
  }
  return selected.includes(providerId);
}
var MUSIC_PROVIDER_CAPABILITIES, CAP_BY_ID;
var init_provider_catalog = __esm({
  "src/resource/provider-catalog.ts"() {
    MUSIC_PROVIDER_CAPABILITIES = [
      {
        id: "local",
        label: "\u672C\u5730",
        searchMode: "local",
        resolveMode: "none",
        playablePolicy: "local",
        wiredForSearch: true,
        listCollection: "name-search"
      },
      {
        id: "txqq",
        label: "\u5728\u7EBF\u805A\u5408",
        searchMode: "aggregator",
        resolveMode: "inline",
        playablePolicy: "search-inline",
        wiredForSearch: true,
        isAggregator: true,
        listCollection: "name-search",
        resolvePriority: 50,
        notes: "\u65E0\u827A\u4EBA/\u4E13\u8F91\u8BE6\u60C5 API\uFF1BlistCollection=\u591A\u9875\u641C\u7D22+\u5B57\u6BB5\u8FC7\u6EE4"
      },
      {
        id: "sidecar",
        label: "\u672C\u673A\u8D44\u6E90\u670D\u52A1",
        searchMode: "aggregator",
        resolveMode: "api",
        playablePolicy: "search-inline",
        wiredForSearch: true,
        isAggregator: true,
        listCollection: "api",
        resolvePriority: 10
      },
      {
        id: "aiguo",
        label: "\u7231\u542C",
        searchMode: "html",
        resolveMode: "api",
        playablePolicy: "resolve-verify",
        wiredForSearch: true,
        listCollection: "name-search",
        resolvePriority: 20,
        referer: "https://www.6uq.cn/"
      },
      {
        id: "pixabay",
        label: "Pixabay",
        searchMode: "browser",
        resolveMode: "browser",
        playablePolicy: "deferred-browser",
        wiredForSearch: true,
        browserSearch: true,
        resolvePriority: 30,
        referer: "https://pixabay.com/"
      },
      {
        id: "soundstripe",
        label: "Soundstripe",
        searchMode: "browser",
        resolveMode: "browser",
        playablePolicy: "deferred-browser",
        wiredForSearch: true,
        browserSearch: true,
        resolvePriority: 40,
        referer: "https://www.soundstripe.com/"
      },
      {
        id: "audiocom",
        label: "Audio.com",
        searchMode: "api",
        resolveMode: "api",
        playablePolicy: "search-inline",
        wiredForSearch: true,
        listCollection: "name-search",
        resolvePriority: 25,
        referer: "https://audio.com/",
        urlTtlSeconds: 518400,
        notes: "api.audio.com \u641C\u7D22\u81EA\u5E26\u7B7E\u540D mp3\uFF1BlistCollection=\u6309\u540D\u641C\u7D22\u8FC7\u6EE4"
      },
      {
        id: "muzvox",
        label: "MuzVox",
        searchMode: "html",
        resolveMode: "html",
        listCollection: "name-search",
        playablePolicy: "search-inline",
        wiredForSearch: true,
        resolvePriority: 28,
        referer: "https://muzvox.org/",
        notes: "muzvox.org HTML \u641C\u7D22\u81EA\u5E26 storage mp3-download \u76F4\u94FE\uFF1B\u53EF\u64AD\u53EF\u4E0B"
      }
    ];
    CAP_BY_ID = new Map(MUSIC_PROVIDER_CAPABILITIES.map((item) => [item.id, item]));
  }
});

// src/resource/platform-registry.ts
function listSearchFilterPlatforms() {
  const wired = /* @__PURE__ */ new Set([
    "local",
    ...WIRED_ONLINE_SEARCH_PLATFORM_IDS,
    ...WIRED_DIRECT_SEARCH_PLATFORM_IDS
  ]);
  return PLATFORM_CAPABILITIES.filter((platform) => wired.has(platform.id));
}
function getMusicPlatformCapability(platformId) {
  return PLATFORM_MAP.get(platformId) ?? null;
}
function getMusicPlatformLabel(platformId) {
  if (platformId === "sidecar") {
    return "\u672C\u673A\u8D44\u6E90\u670D\u52A1";
  }
  if (platformId === "txqq") {
    return "\u5728\u7EBF\u805A\u5408";
  }
  return getMusicPlatformCapability(platformId)?.label ?? platformId;
}
function getDefaultSearchPlatformIds() {
  return ["netease", "qq", "kugou", "kuwo"];
}
function getDefaultSearchProviderSelection() {
  return ["local", "netease", "qq"];
}
function normalizeSearchProviderSelection(value) {
  const defaults = getDefaultSearchProviderSelection();
  if (!Array.isArray(value)) {
    return defaults.slice();
  }
  const selected = value.map((item) => typeof item === "string" ? item.trim() : "").filter((item) => item && KNOWN_SEARCH_PROVIDER_IDS.has(item));
  const seen = /* @__PURE__ */ new Set();
  const unique = [];
  for (const id of selected) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    unique.push(id);
  }
  return unique.length > 0 ? unique : defaults.slice();
}
var PLATFORM_CAPABILITIES, WIRED_ONLINE_SEARCH_PLATFORM_IDS, WIRED_DIRECT_SEARCH_PLATFORM_IDS, PLATFORM_MAP, KNOWN_SEARCH_PROVIDER_IDS;
var init_platform_registry = __esm({
  "src/resource/platform-registry.ts"() {
    init_provider_catalog();
    PLATFORM_CAPABILITIES = [
      {
        id: "local",
        label: "\u672C\u5730",
        status: "local",
        supports: {
          trackSearch: true,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: true,
          cover: true,
          playable: true,
          download: false
        },
        notes: "\u5DF2\u5BFC\u5165\u672C\u5730\u66F2\u5E93"
      },
      {
        id: "netease",
        label: "\u7F51\u6613\u4E91",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: true,
          albumSearch: true,
          playlistSearch: true,
          lyrics: true,
          cover: true,
          playable: true,
          download: true
        },
        notes: "2026-07-17 \u5192\u70DF\uFF1A\u641C\u7D22/\u53EF\u64AD\u89E3\u6790\u5DF2\u6253\u901A\uFF1B\u6B4C\u8BCD\u4E0E\u5C01\u9762\u547D\u4E2D\u7387\u4ECD\u4E0D\u7A33\u5B9A"
      },
      {
        id: "qq",
        label: "QQ \u97F3\u4E50",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: true,
          albumSearch: true,
          playlistSearch: true,
          lyrics: true,
          cover: true,
          playable: true,
          download: true
        },
        notes: "2026-07-17 \u5192\u70DF\uFF1A\u641C\u7D22/\u53EF\u64AD\u89E3\u6790/\u6B4C\u8BCD\u5DF2\u6253\u901A\uFF1B\u539F\u7248\u9AD8\u7801\u7387\u4E0E\u5C01\u9762\u4ECD\u53D7\u767B\u5F55/\u7248\u6743\u5F71\u54CD"
      },
      {
        id: "kugou",
        label: "\u9177\u72D7",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: true,
          albumSearch: true,
          playlistSearch: true,
          lyrics: true,
          cover: true,
          playable: true,
          download: true
        },
        notes: "2026-07-17\uFF1A\u70ED\u95E8\u66F2 VIP \u547D\u4E2D\u7387\u9AD8\uFF1B\u641C\u7D22\u5217\u8868\u5DF2\u6539\u4E3A\u4EC5\u5C55\u793A\u53EF\u64AD\u9A8C\u8BC1\u901A\u8FC7\u6761\u76EE"
      },
      {
        id: "kuwo",
        label: "\u9177\u6211",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: true,
          albumSearch: true,
          playlistSearch: true,
          lyrics: true,
          cover: true,
          playable: true,
          download: true
        },
        notes: "contract \u5DF2\u63A5\uFF1B\u771F\u5B9E\u5192\u70DF\u5F85\u8865\uFF0C\u4E0E netease/qq \u5E76\u884C\u641C"
      },
      {
        id: "aiguo",
        label: "\u7231\u542C",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: true,
          cover: true,
          playable: true,
          download: true
        },
        notes: "6uq.cn\uFF1B\u52FE\u9009\u9A8C\u8BC1\u540E HTML \u641C\u7D22 + play.php \u76F4\u94FE\uFF0C\u65E0 API Key"
      },
      {
        id: "audiocom",
        label: "Audio.com",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: false,
          cover: true,
          playable: true,
          download: true
        },
        notes: "api.audio.com \u641C\u7D22\u81EA\u5E26\u7B7E\u540D mp3\uFF1B\u8FC7\u671F\u540E\u8BE6\u60C5\u5237\u65B0\uFF1BUGC \u66F2\u5E93"
      },
      {
        id: "pixabay",
        label: "Pixabay",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: false,
          cover: false,
          playable: true,
          download: false
        },
        notes: "\u684C\u9762\u9690\u85CF\u6D4F\u89C8\u5668\u622A\u6D41\uFF08\u5B9E\u9A8C\uFF09\uFF1B\u65E0 API Key"
      },
      {
        id: "soundstripe",
        label: "Soundstripe",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: false,
          cover: false,
          playable: true,
          download: false
        },
        notes: "\u684C\u9762\u9690\u85CF\u6D4F\u89C8\u5668\u622A\u6D41\uFF08\u5B9E\u9A8C\uFF09\uFF1B\u9996\u9875\u8BD5\u542C\u4E3A\u4E3B"
      },
      {
        id: "muzvox",
        label: "MuzVox",
        status: "sidecar-ready",
        supports: {
          trackSearch: true,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: false,
          cover: true,
          playable: true,
          download: true
        },
        notes: "muzvox.org HTML \u641C\u7D22\u81EA\u5E26 mp3-download \u76F4\u94FE\uFF1B\u5B9E\u6D4B\u53EF\u4E0B audio/mpeg"
      },
      {
        id: "migu",
        label: "\u54AA\u5495",
        status: "planned",
        supports: {
          trackSearch: false,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: false,
          cover: false,
          playable: false,
          download: false
        },
        notes: "\u805A\u5408\u7AD9\u6709\u5165\u53E3\uFF1B\u5F53\u524D txqq \u955C\u50CF\u672A\u63A5 type=migu\uFF0C\u641C\u7D22\u9875\u4E0D\u5C55\u793A"
      },
      {
        id: "bilibili",
        label: "Bilibili",
        status: "planned",
        supports: {
          trackSearch: false,
          artistSearch: false,
          albumSearch: false,
          playlistSearch: false,
          lyrics: false,
          cover: false,
          playable: false,
          download: false
        },
        notes: "\u89C4\u5212\u4E2D\uFF1B\u4F9D\u8D56 sidecar\uFF0C\u641C\u7D22\u9875\u6682\u4E0D\u5C55\u793A"
      }
    ];
    WIRED_ONLINE_SEARCH_PLATFORM_IDS = ["netease", "qq", "kugou", "kuwo"];
    WIRED_DIRECT_SEARCH_PLATFORM_IDS = listWiredDirectSearchProviderIds();
    PLATFORM_MAP = new Map(
      PLATFORM_CAPABILITIES.map((platform) => [platform.id, platform])
    );
    KNOWN_SEARCH_PROVIDER_IDS = /* @__PURE__ */ new Set([
      "local",
      ...WIRED_ONLINE_SEARCH_PLATFORM_IDS,
      ...WIRED_DIRECT_SEARCH_PLATFORM_IDS,
      "txqq",
      "sidecar"
    ]);
  }
});

// src/resource/search-result-cache.ts
function buildMusicSearchCacheKey(input) {
  const providers2 = [...input.providerIds].map((id) => id.trim()).filter(Boolean).sort();
  return `${input.scope}::${input.query.trim().toLowerCase()}::${providers2.join(",")}`;
}
function isMusicSearchCacheFresh(entry, ttlMinutes, now = Date.now()) {
  if (!entry?.page || !entry.updatedAt) {
    return false;
  }
  const ttlMs = Math.max(1, ttlMinutes) * 6e4;
  return now - entry.updatedAt < ttlMs;
}
function listQueriesFromMusicSearchCaches(entries, max = 12) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const entry of entries) {
    const q = entry.query?.trim();
    if (!q) {
      continue;
    }
    const key = q.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(q);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}
function findMusicSearchCacheEntry(entries, input) {
  const key = buildMusicSearchCacheKey(input);
  return entries.find(
    (entry) => buildMusicSearchCacheKey({
      query: entry.query,
      scope: entry.scope,
      providerIds: entry.providerIds
    }) === key
  ) ?? null;
}
function findMusicSearchCacheEntryForQuery(entries, input) {
  const query = input.query.trim().toLowerCase();
  if (!query) {
    return null;
  }
  const providers2 = [...input.providerIds].map((id) => id.trim()).filter(Boolean).sort().join(",");
  const matches = entries.filter((entry) => {
    if (entry.query.trim().toLowerCase() !== query) {
      return false;
    }
    const entryProviders = [...entry.providerIds].map((id) => id.trim()).filter(Boolean).sort().join(",");
    return entryProviders === providers2;
  });
  return matches.find((entry) => entry.scope === "all") ?? matches[0] ?? null;
}
function upsertMusicSearchCacheEntry(entries, next, maxEntries = 40) {
  const key = buildMusicSearchCacheKey(next);
  const filtered = entries.filter(
    (entry) => buildMusicSearchCacheKey({
      query: entry.query,
      scope: entry.scope,
      providerIds: entry.providerIds
    }) !== key
  );
  return [next, ...filtered].slice(0, maxEntries);
}
var DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES;
var init_search_result_cache = __esm({
  "src/resource/search-result-cache.ts"() {
    DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES = 15;
  }
});

// src/resource/collection-detail-cache.ts
function buildMusicCollectionCacheKey(input) {
  return `${input.kind}::${input.providerId.trim()}::${input.remoteId.trim()}`;
}
function upsertMusicCollectionCacheEntry(entries, next, maxEntries = MUSIC_COLLECTION_CACHE_MAX_ENTRIES) {
  const key = buildMusicCollectionCacheKey(next);
  const filtered = entries.filter(
    (entry) => buildMusicCollectionCacheKey({
      kind: entry.kind,
      providerId: entry.providerId,
      remoteId: entry.remoteId
    }) !== key
  );
  return [next, ...filtered].slice(0, maxEntries);
}
var MUSIC_COLLECTION_CACHE_MAX_ENTRIES;
var init_collection_detail_cache = __esm({
  "src/resource/collection-detail-cache.ts"() {
    MUSIC_COLLECTION_CACHE_MAX_ENTRIES = 40;
  }
});

// src/search-hit-identity.ts
function normalizeRemotePageUrl(pageUrl) {
  const raw = pageUrl?.trim() ?? "";
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw);
    const hash = url.hash.replace(/^#/, "").trim();
    if (hash) {
      const pathAndQuery = `${url.origin}${url.pathname}${url.search}`.replace(/\/$/, "");
      return `${pathAndQuery}#${hash}`;
    }
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}
function normalizeArtistIdentityKey(artist) {
  const raw = (artist ?? "").trim().toLowerCase();
  if (!raw || raw === "\u672A\u77E5" || raw === "\u672A\u77E5\u827A\u4EBA" || raw === "unknown" || raw === "unknown artist") {
    return "";
  }
  return raw;
}
function sameRemoteRef(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.providerId !== right.providerId) {
    return false;
  }
  const leftId = left.remoteId?.trim() ?? "";
  const rightId = right.remoteId?.trim() ?? "";
  if (leftId && rightId && leftId === rightId) {
    return true;
  }
  if (leftId || rightId) {
    return false;
  }
  const leftPage = normalizeRemotePageUrl(left.pageUrl);
  const rightPage = normalizeRemotePageUrl(right.pageUrl);
  return Boolean(leftPage && rightPage && leftPage === rightPage);
}
function sameRemotePageUrlLoose(left, right) {
  if (!left || !right || left.providerId !== right.providerId) {
    return false;
  }
  const leftPage = normalizeRemotePageUrl(left.pageUrl);
  const rightPage = normalizeRemotePageUrl(right.pageUrl);
  return Boolean(leftPage && rightPage && leftPage === rightPage);
}
function sameAiguoMirrorSongId(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.providerId !== "aiguo" || right.providerId !== "aiguo") {
    return false;
  }
  const leftSong = left.remoteId?.includes(":") ? left.remoteId.slice(left.remoteId.indexOf(":") + 1).trim() : "";
  const rightSong = right.remoteId?.includes(":") ? right.remoteId.slice(right.remoteId.indexOf(":") + 1).trim() : "";
  return Boolean(leftSong && rightSong && leftSong === rightSong);
}
function sameTitleArtistIdentity(track, hit, options) {
  const title = hit.title.trim().toLowerCase();
  if (!title || track.title.trim().toLowerCase() !== title) {
    return false;
  }
  const hitArtist = normalizeArtistIdentityKey(hit.artist);
  const trackArtist = normalizeArtistIdentityKey(track.artist);
  if (!hitArtist || !trackArtist) {
    if (hitArtist !== trackArtist) {
      return false;
    }
    const trackProvider2 = track.remoteRef?.providerId;
    if (!trackProvider2) {
      return true;
    }
    return trackProvider2 === hit.ref.providerId;
  }
  if (hitArtist !== trackArtist) {
    return false;
  }
  const trackProvider = track.remoteRef?.providerId;
  if (!trackProvider) {
    return true;
  }
  if (options?.allowCrossProvider !== false) {
    return true;
  }
  return trackProvider === hit.ref.providerId;
}
function sameSearchHitIdentity(track, hit) {
  if (sameRemoteRef(track.remoteRef, hit.ref)) {
    return true;
  }
  if (hit.localTrackId != null && track.id === hit.localTrackId) {
    return true;
  }
  if (sameAiguoMirrorSongId(track.remoteRef, hit.ref)) {
    return true;
  }
  if (sameRemotePageUrlLoose(track.remoteRef, hit.ref)) {
    return true;
  }
  return sameTitleArtistIdentity(track, hit, { allowCrossProvider: true });
}
function sameSearchHitForDownloadBadge(track, hit) {
  return sameSearchHitIdentity(track, hit);
}
var init_search_hit_identity = __esm({
  "src/search-hit-identity.ts"() {
  }
});

// src/app-prefs.ts
function defaultMusicAppPrefsDocument() {
  return {
    version: 1,
    lyricsDensity: "compact",
    atmospherePushEnabled: true,
    coverBackdropEnabled: true,
    coverBackdropBlur: 10,
    coverBackdropOpacity: 0.55,
    coverBackdropIncludeTabBar: false,
    searchProviderIds: getDefaultSearchProviderSelection(),
    searchCacheTtlMinutes: DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES
  };
}
function normalizeLyricsDensity(value) {
  return value === "relaxed" ? "relaxed" : "compact";
}
function normalizeCoverBackdropBlur(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(24, Math.max(0, Math.round(value)));
  }
  if (value === "light") {
    return 4;
  }
  if (value === "vivid") {
    return 16;
  }
  return 10;
}
function normalizeCoverBackdropOpacity(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(0.95, Math.max(0.15, Math.round(value * 100) / 100));
  }
  if (value === "light") {
    return 0.72;
  }
  if (value === "vivid") {
    return 0.38;
  }
  return 0.55;
}
function normalizeSearchCacheTtlMinutes(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
    return Math.min(24 * 60, Math.floor(value));
  }
  return DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES;
}
function normalizeMusicAppPrefsDocument(raw) {
  const defaults = defaultMusicAppPrefsDocument();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const doc = raw;
  return {
    version: 1,
    lyricsDensity: normalizeLyricsDensity(doc.lyricsDensity),
    atmospherePushEnabled: doc.atmospherePushEnabled !== false,
    coverBackdropEnabled: doc.coverBackdropEnabled !== false,
    coverBackdropBlur: normalizeCoverBackdropBlur(
      doc.coverBackdropBlur ?? doc.coverBackdropIntensity
    ),
    coverBackdropOpacity: normalizeCoverBackdropOpacity(
      doc.coverBackdropOpacity ?? doc.coverBackdropIntensity
    ),
    coverBackdropIncludeTabBar: doc.coverBackdropIncludeTabBar === true,
    searchProviderIds: normalizeSearchProviderSelection(doc.searchProviderIds),
    searchCacheTtlMinutes: normalizeSearchCacheTtlMinutes(doc.searchCacheTtlMinutes)
  };
}
async function loadMusicAppPrefsFromLocalStorage() {
  try {
    const rawNew = await import_async_storage.default.getItem(MUSIC_LOCAL_PREFS_STORAGE_KEY);
    const rawLegacy = rawNew ? null : await import_async_storage.default.getItem(MUSIC_LEGACY_LOCAL_PREFS_STORAGE_KEY);
    const raw = rawNew ?? rawLegacy;
    if (!raw) {
      return null;
    }
    const prefs = normalizeMusicAppPrefsDocument(JSON.parse(raw));
    if (!rawNew && rawLegacy) {
      await saveMusicAppPrefsToLocalStorage(prefs);
    }
    return prefs;
  } catch {
    return null;
  }
}
async function saveMusicAppPrefsToLocalStorage(prefs) {
  try {
    await import_async_storage.default.setItem(MUSIC_LOCAL_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
  }
}
async function loadMusicAppPrefsFromHost(config, legacy) {
  if (config?.get) {
    for (const appId2 of [MUSIC_APP_ID, MUSIC_LEGACY_APP_ID]) {
      try {
        const raw = await config.get({
          scope: "app",
          appId: appId2,
          key: MUSIC_CONFIG_KEY,
          defaultValue: null
        });
        if (raw != null) {
          return normalizeMusicAppPrefsDocument(raw);
        }
      } catch {
      }
    }
  }
  if (legacy?.searchProviderIds) {
    return normalizeMusicAppPrefsDocument({
      ...defaultMusicAppPrefsDocument(),
      searchProviderIds: legacy.searchProviderIds
    });
  }
  return defaultMusicAppPrefsDocument();
}
async function loadMusicAppPrefs(config, legacy) {
  const local = await loadMusicAppPrefsFromLocalStorage();
  if (local) {
    return local;
  }
  return loadMusicAppPrefsFromHost(config, legacy);
}
async function saveMusicAppPrefs(_config, prefs) {
  await saveMusicAppPrefsToLocalStorage(prefs);
}
var import_async_storage, MUSIC_CONFIG_KEY, MUSIC_LOCAL_PREFS_STORAGE_KEY, MUSIC_LEGACY_LOCAL_PREFS_STORAGE_KEY;
var init_app_prefs = __esm({
  "src/app-prefs.ts"() {
    import_async_storage = __toESM(require("@react-native-async-storage/async-storage"));
    init_platform_registry();
    init_search_result_cache();
    init_music_ids();
    MUSIC_CONFIG_KEY = "prefs-v1";
    MUSIC_LOCAL_PREFS_STORAGE_KEY = `${MUSIC_APP_ID}/prefs-v1-local`;
    MUSIC_LEGACY_LOCAL_PREFS_STORAGE_KEY = `${MUSIC_LEGACY_APP_ID}/prefs-v1-local`;
  }
});

// src/store.ts
var store_exports = {};
__export(store_exports, {
  MUSIC_MAX_VOLUME: () => MUSIC_MAX_VOLUME,
  bindMusicHostStorage: () => bindMusicHostStorage,
  enrichSearchHitCoversFromLibrary: () => enrichSearchHitCoversFromLibrary,
  getMusicBoundSync: () => getMusicBoundSync,
  getMusicHostHydrationCompleted: () => getMusicHostHydrationCompleted,
  isMusicTrackDownloadedLocally: () => isMusicTrackDownloadedLocally,
  isSearchHitDownloadedLocally: () => isSearchHitDownloadedLocally,
  isSearchHitPinnedLocally: () => isSearchHitPinnedLocally,
  listTracksAsWorkspaceItems: () => listTracksAsWorkspaceItems,
  mergeMusicSearchHistoryForTest: () => mergeMusicSearchHistoryForTest,
  refreshMusicListFromHostStorage: () => refreshMusicListFromHostStorage,
  subscribeMusicHostHydration: () => subscribeMusicHostHydration,
  trackToListItem: () => trackToListItem,
  useMusicDemoStore: () => useMusicDemoStore
});
function normalizeSearchScope(value) {
  if (typeof value === "string" && SEARCH_SCOPES.includes(value)) {
    return value;
  }
  return "all";
}
async function readMusicHostStateDoc() {
  if (!boundStorage) {
    return null;
  }
  const primary = getMusicRuntimeAppId();
  try {
    const primaryDoc = await boundStorage.readJson(primary, STATE_KEY);
    if (primaryDoc != null) {
      return primaryDoc;
    }
  } catch {
  }
  const legacy = getMusicLegacyStorageAppId();
  if (!legacy) {
    return null;
  }
  try {
    return await boundStorage.readJson(legacy, STATE_KEY);
  } catch {
    return null;
  }
}
function isHostWriteCircuitOpen() {
  return Date.now() < hostWriteCircuitOpenUntil;
}
function openHostWriteCircuit(error) {
  hostWriteCircuitOpenUntil = Date.now() + HOST_WRITE_CIRCUIT_COOLDOWN_MS;
  if (Date.now() - hostWriteFailLoggedAt < HOST_WRITE_CIRCUIT_COOLDOWN_MS) {
    return;
  }
  hostWriteFailLoggedAt = Date.now();
  console.warn(
    "[com.example.music] host.storage \u8D85\u65F6/\u5931\u8D25\uFF0C30s \u5185\u8DF3\u8FC7\u540E\u7EED host \u5199\uFF08AsyncStorage \u4ECD\u66F4\u65B0\uFF09",
    error
  );
}
function enqueueHostWrite(task) {
  const run = hostWriteChain.then(task, task);
  hostWriteChain = run.then(
    () => void 0,
    () => void 0
  );
  return run;
}
function notifyMusicHostHydrationListeners() {
  for (const listener of hostHydrationListeners) {
    listener();
  }
}
function getMusicHostHydrationCompleted() {
  return hostHydrationCompleted;
}
function subscribeMusicHostHydration(listener) {
  hostHydrationListeners.add(listener);
  return () => {
    hostHydrationListeners.delete(listener);
  };
}
function musicPrefsFromStore(state) {
  return normalizeMusicAppPrefsDocument({
    version: 1,
    lyricsDensity: state.lyricsDensity,
    atmospherePushEnabled: state.atmospherePushEnabled,
    coverBackdropEnabled: state.coverBackdropEnabled,
    coverBackdropBlur: state.coverBackdropBlur,
    coverBackdropOpacity: state.coverBackdropOpacity,
    coverBackdropIncludeTabBar: state.coverBackdropIncludeTabBar,
    searchProviderIds: state.searchProviderIds,
    searchCacheTtlMinutes: state.searchCacheTtlMinutes
  });
}
function scheduleMusicConfigPersist(state) {
  const prefs = musicPrefsFromStore(state);
  if (configPersistTimer) {
    clearTimeout(configPersistTimer);
  }
  configPersistTimer = setTimeout(() => {
    void saveMusicAppPrefs(boundConfig, prefs);
  }, 250);
}
function applyMusicAppPrefsToStore(prefs) {
  useMusicDemoStore.setState({
    lyricsDensity: prefs.lyricsDensity,
    atmospherePushEnabled: prefs.atmospherePushEnabled,
    coverBackdropEnabled: prefs.coverBackdropEnabled,
    coverBackdropBlur: prefs.coverBackdropBlur,
    coverBackdropOpacity: prefs.coverBackdropOpacity,
    coverBackdropIncludeTabBar: prefs.coverBackdropIncludeTabBar,
    searchProviderIds: prefs.searchProviderIds,
    searchCacheTtlMinutes: prefs.searchCacheTtlMinutes
  });
  try {
    getMusicHostApi().ui.clearDetailSheetSegmentedLiveValues();
  } catch {
  }
}
function createTrackId() {
  return `track_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function sortTracks(tracks) {
  return [...tracks].sort((left, right) => right.updatedAt - left.updatedAt);
}
function isEphemeralMediaUri(uri) {
  return typeof uri === "string" && uri.startsWith("blob:");
}
function normalizePersistedTrack(track) {
  const next = Object.assign({}, track);
  next.album = track.album ?? "";
  next.coverUri = isEphemeralMediaUri(track.coverUri) ? null : track.coverUri ?? null;
  next.lyrics = track.lyrics ?? null;
  next.lyricsUri = typeof track.lyricsUri === "string" && !isEphemeralMediaUri(track.lyricsUri) ? track.lyricsUri : track.lyricsUri ?? null;
  next.atmospherePalette = track.atmospherePalette ?? null;
  next.artist = track.artist ?? "";
  next.liked = Boolean(track.liked);
  next.bookmarked = Boolean(track.bookmarked);
  next.remoteRef = track.remoteRef ?? null;
  next.sourceKind = track.sourceKind ?? "local";
  next.sourceUri = track.sourceUri ?? null;
  return next;
}
function normalizePlayMode(value) {
  if (value === "loop-one" || value === "shuffle") {
    return value;
  }
  return "sequence";
}
function normalizePlayerSurface(value) {
  return value === "search" ? "search" : "player";
}
function normalizeVolume(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(MUSIC_MAX_VOLUME, Math.max(0, value));
  }
  return 1;
}
function normalizePlaybackPosition(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  return 0;
}
function mergeSearchHistory(history, query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return history;
  }
  return [trimmed, ...history.filter((item) => item !== trimmed)].slice(0, MAX_SEARCH_HISTORY);
}
function mergeMusicSearchHistoryForTest(history, query) {
  return mergeSearchHistory(history, query);
}
function normalizeSearchHistory(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    items.push(trimmed);
    if (items.length >= MAX_SEARCH_HISTORY) {
      break;
    }
  }
  return items;
}
function sanitizeMusicPersistDoc(doc) {
  if (!doc || typeof doc !== "object") {
    return null;
  }
  const raw = doc;
  const tracks = Array.isArray(raw.state?.tracks) ? raw.state.tracks.filter((track) => !isEphemeralMediaUri(track?.sourceUri)).map((track) => normalizePersistedTrack(track)) : [];
  const trackIds = new Set(tracks.map((track) => track.id));
  const playing = raw.state?.nowPlayingId ?? null;
  const nowPlayingId = playing && trackIds.has(playing) ? playing : tracks[0]?.id ?? null;
  const queueIds = Array.isArray(raw.state?.queueIds) ? raw.state.queueIds.filter((id) => trackIds.has(id)) : tracks.map((track) => track.id);
  return {
    state: {
      tracks,
      nowPlayingId,
      queueIds,
      playMode: normalizePlayMode(raw.state?.playMode),
      volume: normalizeVolume(raw.state?.volume),
      muted: Boolean(raw.state?.muted),
      coverHidden: Boolean(raw.state?.coverHidden),
      compactActionRailVisible: raw.state?.compactActionRailVisible !== false,
      playbackPositionSec: normalizePlaybackPosition(raw.state?.playbackPositionSec),
      wantsPlaying: Boolean(raw.state?.wantsPlaying),
      playbackLeaderClientId: typeof raw.state?.playbackLeaderClientId === "string" && raw.state.playbackLeaderClientId.trim() ? raw.state.playbackLeaderClientId.trim() : null,
      playerSurface: normalizePlayerSurface(raw.state?.playerSurface),
      actionLayout: normalizeMusicPlayerActionLayout(raw.state?.actionLayout)
    },
    version: typeof raw.version === "number" ? raw.version : 6
  };
}
function readLastSearchCache(state) {
  const raw = state?.lastSearchCache;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (typeof raw.query !== "string") {
    return null;
  }
  return raw;
}
function readSearchResultCaches(state) {
  if (!Array.isArray(state?.searchResultCaches)) {
    return [];
  }
  return state.searchResultCaches.filter(
    (entry) => entry && typeof entry === "object" && typeof entry.query === "string"
  );
}
function readCollectionDetailCaches(state) {
  if (!Array.isArray(state?.collectionDetailCaches)) {
    return [];
  }
  return state.collectionDetailCaches.filter(
    (entry) => entry && typeof entry === "object" && typeof entry.remoteId === "string" && typeof entry.providerId === "string" && Array.isArray(entry.tracks)
  );
}
function readSearchActiveCollection(state) {
  const raw = state?.searchActiveCollection;
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw;
  if (typeof record.kind !== "string" || !COLLECTION_KINDS.includes(record.kind) || typeof record.title !== "string" || typeof record.providerId !== "string" || typeof record.remoteId !== "string") {
    return null;
  }
  return {
    kind: record.kind,
    title: record.title,
    subtitle: typeof record.subtitle === "string" ? record.subtitle : record.subtitle ?? null,
    coverUrl: typeof record.coverUrl === "string" ? record.coverUrl : void 0,
    providerId: record.providerId,
    remoteId: record.remoteId,
    derived: Boolean(record.derived)
  };
}
function readSearchDraft(draftRaw, lastSearchCache) {
  if (typeof draftRaw === "string") {
    return draftRaw;
  }
  if (typeof lastSearchCache?.query === "string") {
    return lastSearchCache.query;
  }
  return "";
}
function readSearchCacheTtlMinutes(ttlRaw) {
  if (typeof ttlRaw === "number" && Number.isFinite(ttlRaw) && ttlRaw >= 1) {
    return Math.min(24 * 60, Math.floor(ttlRaw));
  }
  return DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES;
}
function extractBrowserSearchUiState(doc) {
  const state = doc && typeof doc === "object" && "state" in doc ? doc.state ?? null : null;
  const lastSearchCache = readLastSearchCache(state);
  const scrollRaw = state?.searchResultsScrollY;
  const collectionReturnRaw = state?.searchCollectionReturnScrollY;
  const searchResultCaches = readSearchResultCaches(state);
  const persistedHistory = normalizeSearchHistory(state?.searchHistory);
  return {
    searchHistory: persistedHistory.length > 0 ? persistedHistory : listQueriesFromMusicSearchCaches(searchResultCaches),
    searchDraft: readSearchDraft(state?.searchDraft, lastSearchCache),
    searchScope: normalizeSearchScope(state?.searchScope ?? lastSearchCache?.scope),
    searchResultsScrollY: typeof scrollRaw === "number" && Number.isFinite(scrollRaw) ? Math.max(0, scrollRaw) : 0,
    lastSearchCache,
    searchResultCaches,
    collectionDetailCaches: readCollectionDetailCaches(state),
    searchActiveCollection: readSearchActiveCollection(state),
    searchCollectionReturnScrollY: typeof collectionReturnRaw === "number" && Number.isFinite(collectionReturnRaw) ? Math.max(0, collectionReturnRaw) : 0,
    searchCacheTtlMinutes: readSearchCacheTtlMinutes(state?.searchCacheTtlMinutes)
  };
}
function mergeHostAndBrowserPersist(hostDoc, browserRaw) {
  const browserDoc = browserRaw ? safeParseJson(browserRaw) : null;
  const browserSanitized = parseSanitizedPersist(browserRaw);
  const browserUi = extractBrowserSearchUiState(browserDoc);
  const hostSanitized = sanitizeMusicPersistDoc(hostDoc);
  const hostTracks = hostSanitized?.state.tracks ?? [];
  const hostCount = hostTracks.length;
  if (!browserSanitized && hostCount === 0) {
    return browserRaw;
  }
  const localState = browserSanitized?.state;
  return JSON.stringify({
    state: {
      tracks: hostCount > 0 ? hostTracks : localState?.tracks ?? [],
      nowPlayingId: localState?.nowPlayingId ?? null,
      queueIds: localState?.queueIds ?? [],
      playMode: localState?.playMode ?? "sequence",
      volume: localState?.volume ?? 1,
      muted: localState?.muted ?? false,
      coverHidden: localState?.coverHidden ?? false,
      compactActionRailVisible: localState?.compactActionRailVisible ?? true,
      playbackPositionSec: localState?.playbackPositionSec ?? 0,
      wantsPlaying: localState?.wantsPlaying ?? false,
      playbackLeaderClientId: null,
      playerSurface: localState?.playerSurface ?? "player",
      actionLayout: localState?.actionLayout ?? getDefaultMusicPlayerActionLayout(),
      ...browserUi
    },
    version: browserSanitized?.version ?? hostSanitized?.version ?? 6
  });
}
function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function resolveQueue(state) {
  const known = new Set(state.tracks.map((track) => track.id));
  const filtered = state.queueIds.filter((id) => known.has(id));
  if (filtered.length > 0) {
    return filtered;
  }
  return state.tracks.map((track) => track.id);
}
function pickAdjacentTrackId(state, direction) {
  const queue = resolveQueue(state);
  if (queue.length === 0) {
    return null;
  }
  if (state.playMode === "shuffle" && queue.length > 1) {
    const others = queue.filter((id) => id !== state.nowPlayingId);
    return others[Math.floor(Math.random() * others.length)] ?? queue[0] ?? null;
  }
  const currentIndex = state.nowPlayingId ? queue.indexOf(state.nowPlayingId) : -1;
  if (currentIndex < 0) {
    return queue[0] ?? null;
  }
  const nextIndex = (currentIndex + direction + queue.length) % queue.length;
  return queue[nextIndex] ?? null;
}
function countTracksInPersistPayload(raw) {
  if (!raw) {
    return 0;
  }
  try {
    const sanitized = sanitizeMusicPersistDoc(JSON.parse(raw));
    return sanitized?.state.tracks.length ?? 0;
  } catch {
    return 0;
  }
}
function rawTrackCountInDoc(doc) {
  if (!doc || typeof doc !== "object") {
    return 0;
  }
  const tracks = doc.state?.tracks;
  return Array.isArray(tracks) ? tracks.length : 0;
}
function parseSanitizedPersist(raw) {
  if (!raw) {
    return null;
  }
  try {
    return sanitizeMusicPersistDoc(JSON.parse(raw));
  } catch {
    return null;
  }
}
function pickPreferredSearchHitMatch(tracks, hit) {
  const matches = tracks.filter((track) => sameSearchHitIdentity(track, hit));
  return matches.find((track) => isMusicTrackDownloadedLocally(track)) ?? matches.find((track) => track.pinned) ?? matches.find((track) => track.liked || track.bookmarked) ?? matches[0];
}
function collapseDuplicateSearchHits(get, set, keepId, hit) {
  const kept = get().tracks.find((track) => track.id === keepId);
  if (!kept) {
    return void 0;
  }
  const dupes = get().tracks.filter(
    (track) => track.id !== keepId && sameSearchHitIdentity(track, hit)
  );
  if (dupes.length === 0) {
    return kept;
  }
  const liked = Boolean(kept.liked) || dupes.some((track) => track.liked);
  const bookmarked = Boolean(kept.bookmarked) || dupes.some((track) => track.bookmarked);
  const pinned = Boolean(kept.pinned) || dupes.some((track) => track.pinned);
  const localDupe = dupes.find((track) => isMusicTrackDownloadedLocally(track));
  set((state) => ({
    tracks: sortTracks(
      state.tracks.map(
        (track) => track.id === keepId ? Object.assign({}, track, {
          liked,
          bookmarked,
          pinned,
          ...localDupe && !isMusicTrackDownloadedLocally(track) ? {
            sourceUri: localDupe.sourceUri,
            sourceKind: "local",
            coverUri: localDupe.coverUri ?? track.coverUri,
            lyrics: localDupe.lyrics ?? track.lyrics
          } : {},
          updatedAt: Date.now()
        }) : track
      )
    )
  }));
  for (const dupe of dupes) {
    get().deleteTrack(dupe.id);
  }
  return get().getTrack(keepId) ?? kept;
}
function applySearchHitToExistingTrack(updateTrack, current, hit, playableUrl, lyrics) {
  const keepLocalFile = shouldKeepLocalSourceUri(current, hit.localTrackId);
  return updateTrack(current.id, {
    title: hit.title.trim(),
    artist: (hit.artist ?? "").trim(),
    album: hit.album,
    coverUri: hit.coverUrl ? coverUrlForStorage(hit.coverUrl) : current.coverUri,
    lyrics: lyrics ?? current.lyrics,
    remoteRef: hit.ref,
    sourceKind: keepLocalFile ? "local" : "cloud",
    sourceUri: keepLocalFile ? current.sourceUri : playableUrl || current.sourceUri
  }) ?? current;
}
function createTrackFromSearchHit(createTrack, hit, playableUrl, lyrics) {
  return createTrack({
    title: hit.title.trim(),
    artist: (hit.artist ?? "").trim(),
    album: hit.album,
    coverUri: hit.coverUrl ? coverUrlForStorage(hit.coverUrl) : hit.coverUrl,
    lyrics,
    remoteRef: hit.ref,
    sourceKind: hit.localTrackId ? "local" : "cloud",
    sourceUri: hit.localTrackId ? null : playableUrl
  });
}
function shouldKeepLocalSourceUri(track, hitLocalTrackId) {
  if (hitLocalTrackId) {
    return true;
  }
  return track.sourceKind === "local" && Boolean(track.sourceUri) && !/^https?:\/\//.test(track.sourceUri ?? "");
}
function scrubPlatformArtistPlaceholder(artist) {
  const raw = artist.trim();
  if (!raw || /^(pixabay|sound\s*stripe|soundstripe)$/i.test(raw)) {
    return "";
  }
  return raw;
}
function buildDemoTrack(input = {}) {
  return {
    id: input.id ?? createTrackId(),
    title: (input.title ?? "").trim() || "\u672A\u547D\u540D\u66F2\u76EE",
    artist: scrubPlatformArtistPlaceholder(input.artist ?? ""),
    album: (input.album ?? "").trim() || "",
    coverUri: input.coverUri?.trim() || null,
    lyrics: input.lyrics ?? null,
    remoteRef: input.remoteRef ?? null,
    liked: false,
    bookmarked: false,
    pinned: false,
    sourceUri: input.sourceUri?.trim() || null,
    sourceKind: input.sourceKind ?? "local",
    updatedAt: input.updatedAt ?? Date.now()
  };
}
async function persistSanitizedToHost(storage, doc) {
  if (isHostWriteCircuitOpen()) {
    return;
  }
  try {
    await storage.writeJson(getMusicRuntimeAppId(), STATE_KEY, toHostTracksPersistDoc(doc));
  } catch (error) {
    openHostWriteCircuit(error);
  }
}
function toHostTracksPersistDoc(doc) {
  return {
    state: { tracks: doc.state.tracks },
    version: doc.version
  };
}
function applyHostTracksToStore(tracks) {
  const state = useMusicDemoStore.getState();
  const trackIds = new Set(tracks.map((track) => track.id));
  let nowPlayingId = state.nowPlayingId;
  if (nowPlayingId && !trackIds.has(nowPlayingId)) {
    nowPlayingId = tracks[0]?.id ?? null;
  }
  const queueIds = state.queueIds.filter((id) => trackIds.has(id));
  useMusicDemoStore.setState({ tracks, nowPlayingId, queueIds });
}
async function mergeMusicTracksFromHostStorage() {
  if (!boundStorage) {
    return;
  }
  if (isHostWriteCircuitOpen()) {
    return;
  }
  try {
    const hostDoc = await readMusicHostStateDoc();
    const sanitized = sanitizeMusicPersistDoc(hostDoc);
    if (!sanitized) {
      return;
    }
    applyHostTracksToStore(sanitized.state.tracks);
  } catch (error) {
    openHostWriteCircuit(error);
  }
}
function shouldSkipHostWrite(value) {
  if (hostHydrationCompleted) {
    return false;
  }
  return countTracksInPersistPayload(value) === 0;
}
function bindMusicHostStorage(storage, sync, config) {
  boundStorage = storage;
  boundConfig = config ?? null;
  boundSync = sync ?? null;
  syncUnsubscribe?.();
  playbackFocusUnsubscribe?.();
  configUnsubscribe?.();
  syncUnsubscribe = boundSync?.subscribe({
    appId: getMusicRuntimeAppId(),
    channel: STATE_KEY,
    onEvent: () => {
      refreshMusicListFromHostStorage();
    }
  }) ?? null;
  playbackFocusUnsubscribe = boundSync?.subscribe({
    appId: getMusicRuntimeAppId(),
    channel: MUSIC_PLAYBACK_FOCUS_CHANNEL,
    onEvent: (event) => {
      if (!shouldHandleRemotePlaybackFocusClaim(event.publisherClientId)) {
        return;
      }
      void Promise.resolve().then(() => (init_playback_runtime(), playback_runtime_exports)).then(
        (module2) => module2.yieldMusicPlaybackToRemoteClient()
      );
    }
  }) ?? null;
  configUnsubscribe = boundConfig?.subscribe({
    scope: "app",
    appId: getMusicRuntimeAppId(),
    key: MUSIC_CONFIG_KEY,
    emitCurrent: false,
    listener: (event) => {
      if (event.source === "local") {
        return;
      }
      applyMusicAppPrefsToStore(normalizeMusicAppPrefsDocument(event.value));
      void saveMusicAppPrefsToLocalStorage(normalizeMusicAppPrefsDocument(event.value));
    }
  }) ?? null;
  hostHydrationCompleted = false;
  notifyMusicHostHydrationListeners();
  const legacyHostDocPromise = boundStorage ? readMusicHostStateDoc().catch(() => null) : Promise.resolve(null);
  return (async () => {
    const [legacyHostDoc] = await Promise.all([
      legacyHostDocPromise,
      Promise.resolve(useMusicDemoStore.persist.rehydrate())
    ]);
    const legacyState = legacyHostDoc && typeof legacyHostDoc === "object" ? legacyHostDoc.state ?? null : null;
    const prefs = await loadMusicAppPrefs(boundConfig, {
      searchProviderIds: legacyState?.searchProviderIds
    });
    applyMusicAppPrefsToStore(prefs);
    const playbackRuntime = await Promise.resolve().then(() => (init_playback_runtime(), playback_runtime_exports));
    playbackRuntime.applyMusicPlaybackSessionSnapshotAfterHydrate();
  })().finally(() => {
    hostHydrationCompleted = true;
    notifyMusicHostHydrationListeners();
  });
}
function refreshMusicListFromHostStorage(_syncEvent) {
  void mergeMusicTracksFromHostStorage();
}
function getMusicBoundSync() {
  return boundSync;
}
function isMusicTrackDownloadedLocally(track) {
  if (!track) {
    return false;
  }
  return track.sourceKind === "local" && Boolean(track.sourceUri) && !/^https?:\/\//i.test(track.sourceUri ?? "") && !track.sourceUri?.startsWith("blob:");
}
function isSearchHitDownloadedLocally(hit) {
  const tracks = useMusicDemoStore.getState().tracks;
  const matched = tracks.find((track) => sameSearchHitForDownloadBadge(track, hit));
  return isMusicTrackDownloadedLocally(matched);
}
function isSearchHitPinnedLocally(hit) {
  const tracks = useMusicDemoStore.getState().tracks;
  const matched = tracks.find((track) => sameSearchHitForDownloadBadge(track, hit));
  return Boolean(matched?.pinned);
}
function enrichSearchHitCoversFromLibrary(hits) {
  const library = useMusicDemoStore.getState().tracks;
  return hits.map((hit) => {
    if (hit.coverUrl?.trim()) {
      return hit;
    }
    const matched = library.find((track) => sameSearchHitForDownloadBadge(track, hit));
    const cover = matched?.coverUri?.trim();
    if (!cover) {
      return hit;
    }
    return { ...hit, coverUrl: cover };
  });
}
function trackToListItem(track, nowPlayingId = null) {
  const cover = track.coverUri?.trim();
  return {
    id: track.id,
    title: track.title,
    subtitle: track.artist || void 0,
    updatedAt: track.updatedAt,
    pinned: Boolean(track.pinned),
    active: Boolean(nowPlayingId && track.id === nowPlayingId),
    keywords: ["music", "\u66F2\u76EE", "\u6B4C\u66F2", track.title, track.artist],
    ...cover ? { imageUrl: cover } : {},
    open: {
      // 播放器 Tab 全局唯一：实体固定 now-playing，曲目由 nowPlayingId 决定。
      panelId: "player",
      entityId: "now-playing",
      titleHint: track.title
    }
  };
}
function listTracksAsWorkspaceItems(query = "") {
  const state = useMusicDemoStore.getState();
  const nowPlayingId = state.nowPlayingId;
  const items = state.tracks.map((track) => trackToListItem(track, nowPlayingId)).sort((a, b) => {
    const pinDelta = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDelta !== 0) {
      return pinDelta;
    }
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }
  return items.filter((item) => {
    const haystack = [item.title, item.subtitle, ...item.keywords ?? []].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}
var import_async_storage2, import_zustand, import_middleware, SEARCH_SCOPES, PERSIST_NAME, STATE_KEY, MAX_SEARCH_HISTORY, boundStorage, boundConfig, boundSync, syncUnsubscribe, playbackFocusUnsubscribe, configUnsubscribe, hostHydrationCompleted, hostHydrationListeners, HOST_WRITE_CIRCUIT_COOLDOWN_MS, hostWriteCircuitOpenUntil, hostWriteFailLoggedAt, hostWriteChain, configPersistTimer, MUSIC_MAX_VOLUME, COLLECTION_KINDS, PLAY_MODE_ORDER, hostBackedStorage, useMusicDemoStore;
var init_store = __esm({
  "src/store.ts"() {
    import_async_storage2 = __toESM(require("@react-native-async-storage/async-storage"));
    import_zustand = require("zustand");
    import_middleware = require("zustand/middleware");
    init_music_runtime_app_id();
    init_playback_leader();
    init_player_action_layout();
    init_cover_url_quality();
    init_platform_registry();
    init_search_result_cache();
    init_collection_detail_cache();
    init_search_hit_identity();
    init_music_host();
    init_app_prefs();
    SEARCH_SCOPES = ["all", "track", "artist", "album", "playlist"];
    PERSIST_NAME = "workspace-demo-music";
    STATE_KEY = "music-v1";
    MAX_SEARCH_HISTORY = 12;
    boundStorage = null;
    boundConfig = null;
    boundSync = null;
    syncUnsubscribe = null;
    playbackFocusUnsubscribe = null;
    configUnsubscribe = null;
    hostHydrationCompleted = false;
    hostHydrationListeners = /* @__PURE__ */ new Set();
    HOST_WRITE_CIRCUIT_COOLDOWN_MS = 3e4;
    hostWriteCircuitOpenUntil = 0;
    hostWriteFailLoggedAt = 0;
    hostWriteChain = Promise.resolve();
    configPersistTimer = null;
    MUSIC_MAX_VOLUME = 2;
    COLLECTION_KINDS = ["artist", "album", "playlist"];
    PLAY_MODE_ORDER = ["sequence", "loop-one", "shuffle"];
    hostBackedStorage = {
      getItem: async (name) => {
        if (!boundStorage) {
          return null;
        }
        let hostDoc = null;
        try {
          hostDoc = await readMusicHostStateDoc();
        } catch (error) {
          console.warn("[com.example.music] host.storage.readJson failed, falling back", error);
        }
        const legacyRaw = await import_async_storage2.default.getItem(name);
        const sanitizedHost = sanitizeMusicPersistDoc(hostDoc);
        const sanitizedLegacy = parseSanitizedPersist(legacyRaw);
        const hostCount = sanitizedHost?.state.tracks.length ?? 0;
        const legacyCount = sanitizedLegacy?.state.tracks.length ?? 0;
        if (hostCount > 0 && sanitizedHost != null) {
          if (rawTrackCountInDoc(hostDoc) !== hostCount) {
            await persistSanitizedToHost(boundStorage, sanitizedHost);
          }
          return mergeHostAndBrowserPersist(hostDoc, legacyRaw);
        }
        if (legacyCount > 0 && sanitizedLegacy) {
          await persistSanitizedToHost(boundStorage, sanitizedLegacy);
          return mergeHostAndBrowserPersist(hostDoc, legacyRaw);
        }
        if (sanitizedHost != null) {
          return mergeHostAndBrowserPersist(hostDoc, legacyRaw);
        }
        return sanitizedLegacy ? JSON.stringify(sanitizedLegacy) : legacyRaw;
      },
      setItem: async (name, value) => {
        if (!hostHydrationCompleted) {
          return;
        }
        await import_async_storage2.default.setItem(name, value);
        if (!boundStorage) {
          return;
        }
        let hostDoc = null;
        try {
          hostDoc = sanitizeMusicPersistDoc(JSON.parse(value));
        } catch {
          return;
        }
        if (!hostDoc) {
          return;
        }
        const docToWrite = hostDoc;
        if (shouldSkipHostWrite(JSON.stringify(docToWrite))) {
          return;
        }
        if (isHostWriteCircuitOpen()) {
          return;
        }
        await enqueueHostWrite(async () => {
          if (!boundStorage || isHostWriteCircuitOpen()) {
            return;
          }
          try {
            const existingHost = await readMusicHostStateDoc();
            const existingSanitized = sanitizeMusicPersistDoc(existingHost);
            const existingCount = existingSanitized?.state.tracks.length ?? 0;
            const nextCount = docToWrite.state.tracks.length;
            if (existingCount >= 10 && nextCount < existingCount && existingCount - nextCount >= 5 && nextCount / existingCount < 0.5) {
              console.warn(
                `[com.example.music] refused host library shrink ${existingCount} \u2192 ${nextCount}; rehydrate from host`
              );
              void mergeMusicTracksFromHostStorage();
              return;
            }
            const hostTracksDoc = toHostTracksPersistDoc(docToWrite);
            await boundStorage.writeJson(getMusicRuntimeAppId(), STATE_KEY, hostTracksDoc);
            boundSync?.publish({
              appId: getMusicRuntimeAppId(),
              channel: STATE_KEY,
              revision: Date.now()
            });
          } catch (error) {
            openHostWriteCircuit(error);
          }
        });
      },
      removeItem: async (name) => {
        await import_async_storage2.default.removeItem(name);
        if (!boundStorage || !hostHydrationCompleted) {
          return;
        }
        if (isHostWriteCircuitOpen()) {
          return;
        }
        try {
          await boundStorage.writeJson(getMusicRuntimeAppId(), STATE_KEY, {
            state: { tracks: [] },
            version: 6
          });
        } catch (error) {
          openHostWriteCircuit(error);
        }
      }
    };
    useMusicDemoStore = (0, import_zustand.create)()(
      (0, import_middleware.persist)(
        (set, get) => ({
          tracks: [],
          nowPlayingId: null,
          queueIds: [],
          playMode: "sequence",
          volume: 1,
          muted: false,
          coverHidden: false,
          compactActionRailVisible: true,
          lyricsDensity: "compact",
          // 水合前保持关：避免 F5 后 prefs 未到就推氛围；急开配置也会种子错误 live 高亮。
          atmospherePushEnabled: false,
          coverBackdropEnabled: true,
          coverBackdropBlur: 10,
          coverBackdropOpacity: 0.55,
          coverBackdropIncludeTabBar: false,
          playbackPositionSec: 0,
          wantsPlaying: false,
          playbackLeaderClientId: null,
          playerSurface: "player",
          actionLayout: getDefaultMusicPlayerActionLayout(),
          searchHistory: [],
          searchProviderIds: getDefaultSearchProviderSelection(),
          lastSearchCache: null,
          searchDraft: "",
          searchScope: "all",
          searchResultsScrollY: 0,
          searchResultCaches: [],
          collectionDetailCaches: [],
          searchActiveCollection: null,
          searchCollectionReturnScrollY: 0,
          searchCacheTtlMinutes: DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES,
          createTrack: (input) => {
            const track = buildDemoTrack(input);
            set((state) => ({
              tracks: sortTracks([track, ...state.tracks]),
              queueIds: [track.id, ...resolveQueue(state).filter((id) => id !== track.id)]
            }));
            return track;
          },
          importTracksFromSources: (sources) => {
            if (sources.length === 0) {
              return [];
            }
            const now = Date.now();
            const created = sources.map(
              (source, index) => buildDemoTrack({
                title: source.title,
                artist: source.artist,
                album: source.album,
                coverUri: source.coverUri,
                lyrics: source.lyrics,
                remoteRef: source.remoteRef,
                sourceUri: source.sourceUri,
                sourceKind: source.kind,
                updatedAt: now - index
              })
            );
            set((state) => {
              const createdIds = created.map((track) => track.id);
              return {
                tracks: sortTracks([...created, ...state.tracks]),
                queueIds: [
                  ...createdIds,
                  ...resolveQueue(state).filter((id) => !createdIds.includes(id))
                ]
              };
            });
            return created;
          },
          updateTrack: (id, patch) => {
            const current = get().tracks.find((track) => track.id === id);
            if (!current) {
              return null;
            }
            const next = {
              ...current,
              title: patch.title !== void 0 ? patch.title.trim() || "\u672A\u547D\u540D\u66F2\u76EE" : current.title,
              artist: patch.artist !== void 0 ? scrubPlatformArtistPlaceholder(patch.artist.trim()) : current.artist,
              album: patch.album !== void 0 ? patch.album.trim() : current.album ?? "",
              coverUri: patch.coverUri !== void 0 ? patch.coverUri : current.coverUri ?? null,
              lyrics: patch.lyrics !== void 0 ? patch.lyrics : current.lyrics ?? null,
              lyricsUri: patch.lyricsUri !== void 0 ? patch.lyricsUri : current.lyricsUri ?? null,
              atmospherePalette: (() => {
                if (patch.atmospherePalette !== void 0) {
                  return patch.atmospherePalette;
                }
                if (patch.coverUri !== void 0) {
                  const nextCover = typeof patch.coverUri === "string" && patch.coverUri.trim() && !patch.coverUri.startsWith("blob:") ? patch.coverUri.trim() : null;
                  if (!nextCover || nextCover !== current.atmospherePalette?.coverKey) {
                    return null;
                  }
                }
                return current.atmospherePalette ?? null;
              })(),
              remoteRef: patch.remoteRef !== void 0 ? patch.remoteRef : current.remoteRef ?? null,
              liked: current.liked ?? false,
              bookmarked: current.bookmarked ?? false,
              pinned: current.pinned ?? false,
              sourceUri: patch.sourceUri !== void 0 ? patch.sourceUri : current.sourceUri,
              sourceKind: patch.sourceKind ?? current.sourceKind,
              updatedAt: Date.now()
            };
            set((state) => ({
              tracks: sortTracks(state.tracks.map((track) => track.id === id ? next : track))
            }));
            return next;
          },
          upsertTrackFromSearchHit: (hit) => {
            const playableUrl = hit.playableUrl?.trim() || null;
            const lyrics = hit.lyrics?.trim() || null;
            const current = pickPreferredSearchHitMatch(get().tracks, hit);
            const kept = current ? applySearchHitToExistingTrack(get().updateTrack, current, hit, playableUrl, lyrics) : createTrackFromSearchHit(get().createTrack, hit, playableUrl, lyrics);
            return collapseDuplicateSearchHits(get, set, kept.id, hit) ?? kept;
          },
          deleteTrack: (id) => {
            const state = get();
            const exists = state.tracks.some((track) => track.id === id);
            if (!exists) {
              return false;
            }
            const wasPlaying = state.nowPlayingId === id;
            const queueBefore = resolveQueue(state);
            const currentIndex = queueBefore.indexOf(id);
            const remainingQueue = queueBefore.filter((queueId) => queueId !== id);
            let nextPlayingId = wasPlaying ? null : state.nowPlayingId;
            if (wasPlaying && remainingQueue.length > 0) {
              nextPlayingId = (currentIndex >= 0 ? remainingQueue[currentIndex] : null) ?? remainingQueue[Math.max(0, currentIndex - 1)] ?? remainingQueue[0] ?? null;
            }
            set({
              tracks: state.tracks.filter((track) => track.id !== id),
              queueIds: state.queueIds.filter((queueId) => queueId !== id),
              nowPlayingId: nextPlayingId,
              playbackPositionSec: wasPlaying ? 0 : state.playbackPositionSec
            });
            return true;
          },
          getTrack: (id) => get().tracks.find((track) => track.id === id),
          setNowPlaying: (id) => set((state) => {
            if (!id) {
              return { nowPlayingId: null, playbackPositionSec: 0 };
            }
            const queue = resolveQueue(state);
            return {
              nowPlayingId: id,
              queueIds: queue.includes(id) ? queue : [...queue, id],
              playbackPositionSec: state.nowPlayingId === id ? state.playbackPositionSec : 0
            };
          }),
          setQueueIds: (ids) => set({ queueIds: ids }),
          addToQueue: (id, position = "end") => {
            const state = get();
            if (!state.tracks.some((track) => track.id === id)) {
              return false;
            }
            const queue = resolveQueue(state).filter((queueId) => queueId !== id);
            if (position === "next") {
              const currentIndex = state.nowPlayingId ? queue.indexOf(state.nowPlayingId) : -1;
              const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0;
              queue.splice(insertAt, 0, id);
            } else {
              queue.push(id);
            }
            set({ queueIds: queue });
            return true;
          },
          removeFromQueue: (id) => {
            const state = get();
            const queue = resolveQueue(state);
            if (!queue.includes(id)) {
              return false;
            }
            const wasPlaying = state.nowPlayingId === id;
            const currentIndex = queue.indexOf(id);
            const nextQueue = queue.filter((queueId) => queueId !== id);
            let nextPlayingId = wasPlaying ? null : state.nowPlayingId;
            if (wasPlaying && nextQueue.length > 0) {
              nextPlayingId = (currentIndex >= 0 ? nextQueue[currentIndex] : null) ?? nextQueue[Math.max(0, currentIndex - 1)] ?? nextQueue[0] ?? null;
            }
            set({
              queueIds: nextQueue,
              nowPlayingId: nextPlayingId,
              playbackPositionSec: wasPlaying ? 0 : state.playbackPositionSec
            });
            return true;
          },
          moveQueueItem: (fromIndex, toIndex) => {
            const queue = [...resolveQueue(get())];
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= queue.length || toIndex >= queue.length || fromIndex === toIndex) {
              return false;
            }
            const [item] = queue.splice(fromIndex, 1);
            if (!item) {
              return false;
            }
            queue.splice(toIndex, 0, item);
            set({ queueIds: queue });
            return true;
          },
          setPlayMode: (mode) => set({ playMode: mode }),
          cyclePlayMode: () => {
            const current = get().playMode;
            const index = PLAY_MODE_ORDER.indexOf(current);
            const next = PLAY_MODE_ORDER[(index + 1) % PLAY_MODE_ORDER.length] ?? "sequence";
            set({ playMode: next });
            return next;
          },
          setVolume: (volume) => set({
            volume: Math.min(MUSIC_MAX_VOLUME, Math.max(0, volume)),
            muted: volume <= 0
          }),
          setMuted: (muted) => set({ muted }),
          setCoverHidden: (coverHidden) => set({ coverHidden: Boolean(coverHidden) }),
          setCompactActionRailVisible: (visible) => set({ compactActionRailVisible: Boolean(visible) }),
          setLyricsDensity: (density) => {
            const next = density === "relaxed" ? "relaxed" : "compact";
            set({ lyricsDensity: next });
            scheduleMusicConfigPersist({ ...get(), lyricsDensity: next });
          },
          setAtmospherePushEnabled: (enabled) => {
            const next = Boolean(enabled);
            set({ atmospherePushEnabled: next });
            scheduleMusicConfigPersist({ ...get(), atmospherePushEnabled: next });
          },
          setCoverBackdropEnabled: (enabled) => {
            const next = Boolean(enabled);
            set({ coverBackdropEnabled: next });
            scheduleMusicConfigPersist({ ...get(), coverBackdropEnabled: next });
          },
          setCoverBackdropBlur: (blur) => {
            const next = Math.min(24, Math.max(0, Math.round(Number(blur) || 0)));
            set({ coverBackdropBlur: next });
            scheduleMusicConfigPersist({ ...get(), coverBackdropBlur: next });
          },
          setCoverBackdropOpacity: (opacity) => {
            const raw = Number(opacity);
            const next = Math.min(
              0.95,
              Math.max(0.15, Number.isFinite(raw) ? Math.round(raw * 100) / 100 : 0.55)
            );
            set({ coverBackdropOpacity: next });
            scheduleMusicConfigPersist({ ...get(), coverBackdropOpacity: next });
          },
          setCoverBackdropIncludeTabBar: (enabled) => {
            const next = Boolean(enabled);
            set({ coverBackdropIncludeTabBar: next });
            scheduleMusicConfigPersist({ ...get(), coverBackdropIncludeTabBar: next });
          },
          setPlaybackPosition: (seconds) => set({
            playbackPositionSec: normalizePlaybackPosition(seconds)
          }),
          setWantsPlaying: (wantsPlaying) => set({
            wantsPlaying: Boolean(wantsPlaying)
          }),
          setPlayerSurface: (surface) => set({ playerSurface: normalizePlayerSurface(surface) }),
          setActionLayout: (layout) => set({ actionLayout: normalizeMusicPlayerActionLayout(layout) }),
          pushSearchHistory: (query) => {
            set((state) => ({
              searchHistory: mergeSearchHistory(state.searchHistory, query)
            }));
          },
          removeSearchHistory: (query) => {
            const trimmed = query.trim();
            if (!trimmed) {
              return;
            }
            set((state) => ({
              searchHistory: state.searchHistory.filter((item) => item !== trimmed)
            }));
          },
          setSearchProviderIds: (ids) => {
            const next = normalizeSearchProviderSelection(ids);
            set({ searchProviderIds: next });
            scheduleMusicConfigPersist({ ...get(), searchProviderIds: next });
          },
          toggleSearchProviderId: (id) => {
            const trimmed = id.trim();
            if (!trimmed) {
              return;
            }
            set((state) => {
              const current = normalizeSearchProviderSelection(state.searchProviderIds);
              const exists = current.includes(trimmed);
              let next;
              if (exists) {
                next = current.length <= 1 ? current : current.filter((item) => item !== trimmed);
              } else {
                next = normalizeSearchProviderSelection([...current, trimmed]);
              }
              scheduleMusicConfigPersist({ ...state, searchProviderIds: next });
              return { searchProviderIds: next };
            });
          },
          setLastSearchCache: (cache) => {
            set({ lastSearchCache: cache });
          },
          setSearchDraft: (draft) => {
            set({ searchDraft: draft });
          },
          setSearchScope: (scope) => {
            set({ searchScope: normalizeSearchScope(scope) });
          },
          setSearchResultsScrollY: (y) => {
            const next = Number.isFinite(y) ? Math.max(0, y) : 0;
            set({ searchResultsScrollY: next });
          },
          upsertSearchResultCache: (entry) => {
            set((state) => ({
              searchResultCaches: upsertMusicSearchCacheEntry(state.searchResultCaches, entry),
              lastSearchCache: {
                query: entry.query,
                scope: entry.scope,
                providerIds: entry.providerIds,
                page: entry.page,
                updatedAt: entry.updatedAt
              },
              // 结果缓存写入时同步草稿；不改 searchScope（tab 只做展示过滤，避免搜完被打回「综合」）
              searchDraft: entry.query
            }));
          },
          clearSearchResultCache: (input) => {
            if (!input) {
              set({ searchResultCaches: [], lastSearchCache: null });
              return;
            }
            const keyQuery = input.query.trim().toLowerCase();
            set((state) => ({
              searchResultCaches: state.searchResultCaches.filter((entry) => {
                if (entry.scope !== input.scope) {
                  return true;
                }
                if (entry.query.trim().toLowerCase() !== keyQuery) {
                  return true;
                }
                const left = [...entry.providerIds].sort().join(",");
                const right = [...input.providerIds].sort().join(",");
                return left !== right;
              }),
              lastSearchCache: state.lastSearchCache && state.lastSearchCache.query.trim().toLowerCase() === keyQuery && state.lastSearchCache.scope === input.scope ? null : state.lastSearchCache
            }));
          },
          upsertCollectionDetailCache: (entry) => {
            set((state) => ({
              collectionDetailCaches: upsertMusicCollectionCacheEntry(
                state.collectionDetailCaches,
                entry
              )
            }));
          },
          clearCollectionDetailCache: () => {
            set({ collectionDetailCaches: [] });
          },
          setSearchActiveCollection: (collection) => {
            set({ searchActiveCollection: collection });
          },
          setSearchCollectionReturnScrollY: (y) => {
            const next = Number.isFinite(y) ? Math.max(0, y) : 0;
            set({ searchCollectionReturnScrollY: next });
          },
          setSearchCacheTtlMinutes: (minutes) => {
            const next = Math.max(
              1,
              Math.min(24 * 60, Math.floor(minutes) || DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES)
            );
            set({ searchCacheTtlMinutes: next });
            scheduleMusicConfigPersist({ ...get(), searchCacheTtlMinutes: next });
          },
          toggleLiked: (id) => {
            const current = get().tracks.find((track) => track.id === id);
            if (!current) {
              return null;
            }
            const liked = !current.liked;
            set((state) => ({
              tracks: state.tracks.map(
                (track) => track.id === id ? Object.assign({}, track, { liked, updatedAt: Date.now() }) : track
              )
            }));
            return liked;
          },
          toggleBookmarked: (id) => {
            const current = get().tracks.find((track) => track.id === id);
            if (!current) {
              return null;
            }
            const bookmarked = !current.bookmarked;
            set((state) => ({
              tracks: state.tracks.map(
                (track) => track.id === id ? Object.assign({}, track, { bookmarked, updatedAt: Date.now() }) : track
              )
            }));
            return bookmarked;
          },
          togglePinned: (id) => {
            const current = get().tracks.find((track) => track.id === id);
            if (!current) {
              return null;
            }
            const pinned = !current.pinned;
            set((state) => ({
              tracks: state.tracks.map(
                (track) => track.id === id ? Object.assign({}, track, { pinned, updatedAt: Date.now() }) : track
              )
            }));
            return pinned;
          },
          playNext: () => {
            const state = get();
            const nextId = pickAdjacentTrackId(
              { ...state, playMode: state.playMode === "loop-one" ? "sequence" : state.playMode },
              1
            );
            if (!nextId) {
              return null;
            }
            state.setNowPlaying(nextId);
            return state.getTrack(nextId) ?? null;
          },
          playPrevious: () => {
            const state = get();
            const prevId = pickAdjacentTrackId(state, -1);
            if (!prevId) {
              return null;
            }
            state.setNowPlaying(prevId);
            return state.getTrack(prevId) ?? null;
          }
        }),
        {
          name: PERSIST_NAME,
          storage: (0, import_middleware.createJSONStorage)(() => hostBackedStorage),
          version: 6,
          skipHydration: true,
          // oxlint-disable-next-line eslint(complexity) -- persist migrate 字段多
          migrate: (persistedState) => {
            const state = persistedState;
            const tracks = (state?.tracks ?? []).map((track) => {
              const next = Object.assign({}, track);
              next.sourceUri = track.sourceUri ?? null;
              next.sourceKind = track.sourceKind ?? "local";
              next.remoteRef = track.remoteRef ?? null;
              next.artist = track.artist ?? "";
              next.album = track.album ?? "";
              next.coverUri = track.coverUri ?? null;
              next.lyrics = track.lyrics ?? null;
              next.lyricsUri = track.lyricsUri ?? null;
              next.atmospherePalette = track.atmospherePalette ?? null;
              next.liked = Boolean(track.liked);
              next.bookmarked = Boolean(track.bookmarked);
              next.pinned = Boolean(track.pinned);
              return next;
            });
            const queueIds = Array.isArray(state?.queueIds) && state.queueIds.length > 0 ? state.queueIds : tracks.map((track) => track.id);
            return {
              ...state,
              tracks,
              queueIds,
              playMode: state?.playMode ?? "sequence",
              volume: typeof state?.volume === "number" ? state.volume : 1,
              muted: Boolean(state?.muted),
              coverHidden: Boolean(state?.coverHidden),
              compactActionRailVisible: state?.compactActionRailVisible !== false,
              lyricsDensity: state?.lyricsDensity === "relaxed" ? "relaxed" : "compact",
              // prefs 不走 zustand partialize；migrate 缺字段时勿默认 true（否则水合窗口误开沉浸）。
              atmospherePushEnabled: state?.atmospherePushEnabled === true,
              coverBackdropEnabled: state?.coverBackdropEnabled !== false,
              coverBackdropBlur: (() => {
                const raw = state?.coverBackdropBlur;
                if (typeof raw === "number" && Number.isFinite(raw)) {
                  return Math.min(24, Math.max(0, Math.round(raw)));
                }
                const legacy = state?.coverBackdropIntensity;
                if (legacy === "light") {
                  return 4;
                }
                if (legacy === "vivid") {
                  return 16;
                }
                return 10;
              })(),
              coverBackdropOpacity: (() => {
                const raw = state?.coverBackdropOpacity;
                if (typeof raw === "number" && Number.isFinite(raw)) {
                  return Math.min(0.95, Math.max(0.15, Math.round(raw * 100) / 100));
                }
                const legacy = state?.coverBackdropIntensity;
                if (legacy === "light") {
                  return 0.72;
                }
                if (legacy === "vivid") {
                  return 0.38;
                }
                return 0.55;
              })(),
              coverBackdropIncludeTabBar: state?.coverBackdropIncludeTabBar === true,
              playbackPositionSec: normalizePlaybackPosition(state?.playbackPositionSec),
              wantsPlaying: Boolean(state?.wantsPlaying),
              playbackLeaderClientId: typeof state?.playbackLeaderClientId === "string" && state.playbackLeaderClientId.trim() ? state.playbackLeaderClientId.trim() : null,
              playerSurface: normalizePlayerSurface(state?.playerSurface),
              actionLayout: normalizeMusicPlayerActionLayout(state?.actionLayout),
              searchHistory: (() => {
                const persisted = normalizeSearchHistory(state?.searchHistory);
                if (persisted.length > 0) {
                  return persisted;
                }
                const caches = Array.isArray(state?.searchResultCaches) ? state.searchResultCaches : [];
                return listQueriesFromMusicSearchCaches(caches);
              })(),
              searchProviderIds: normalizeSearchProviderSelection(state?.searchProviderIds),
              lastSearchCache: state?.lastSearchCache && typeof state.lastSearchCache === "object" && typeof state.lastSearchCache.query === "string" ? state.lastSearchCache : null,
              searchDraft: (() => {
                const raw = state?.searchDraft;
                if (typeof raw === "string") {
                  return raw;
                }
                const cache = state?.lastSearchCache;
                return typeof cache?.query === "string" ? cache.query : "";
              })(),
              searchScope: normalizeSearchScope(
                state?.searchScope ?? state?.lastSearchCache?.scope
              ),
              searchResultsScrollY: (() => {
                const raw = state?.searchResultsScrollY;
                return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
              })(),
              searchResultCaches: Array.isArray(
                state?.searchResultCaches
              ) ? state.searchResultCaches : [],
              collectionDetailCaches: readCollectionDetailCaches(
                state ?? null
              ),
              searchActiveCollection: readSearchActiveCollection(
                state ?? null
              ),
              searchCollectionReturnScrollY: (() => {
                const raw = state?.searchCollectionReturnScrollY;
                return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
              })(),
              searchCacheTtlMinutes: (() => {
                const raw = state?.searchCacheTtlMinutes;
                return typeof raw === "number" && Number.isFinite(raw) && raw >= 1 ? Math.min(24 * 60, Math.floor(raw)) : DEFAULT_MUSIC_SEARCH_CACHE_TTL_MINUTES;
              })()
            };
          },
          partialize: (state) => ({
            tracks: state.tracks,
            nowPlayingId: state.nowPlayingId,
            queueIds: state.queueIds,
            playMode: state.playMode,
            volume: state.volume,
            muted: state.muted,
            coverHidden: state.coverHidden,
            compactActionRailVisible: state.compactActionRailVisible,
            // prefs（lyricsDensity / atmosphere / searchProviderIds / searchCacheTtl）只走本端适配器
            playbackPositionSec: state.playbackPositionSec,
            wantsPlaying: state.wantsPlaying,
            playbackLeaderClientId: state.playbackLeaderClientId,
            playerSurface: state.playerSurface,
            actionLayout: state.actionLayout,
            searchHistory: state.searchHistory,
            lastSearchCache: state.lastSearchCache,
            searchDraft: state.searchDraft,
            searchScope: state.searchScope,
            searchResultsScrollY: state.searchResultsScrollY,
            searchResultCaches: state.searchResultCaches,
            collectionDetailCaches: state.collectionDetailCaches,
            searchActiveCollection: state.searchActiveCollection,
            searchCollectionReturnScrollY: state.searchCollectionReturnScrollY
          })
        }
      )
    );
  }
});

// src/playback-runtime.ts
var playback_runtime_exports = {};
__export(playback_runtime_exports, {
  applyMusicPlaybackIntent: () => applyMusicPlaybackIntent,
  applyMusicPlaybackSessionSnapshotAfterHydrate: () => applyMusicPlaybackSessionSnapshotAfterHydrate,
  ensureMusicColdRestoreWatch: () => ensureMusicColdRestoreWatch,
  ensureMusicPlaybackRuntime: () => ensureMusicPlaybackRuntime,
  flushMusicPlaybackSessionSnapshot: () => flushMusicPlaybackSessionSnapshot,
  loadAndPlayTrackUriHeadless: () => loadAndPlayTrackUriHeadless,
  maybeRestoreMusicPlaybackAfterColdStart: () => maybeRestoreMusicPlaybackAfterColdStart,
  pauseLocalMusicAudioOutput: () => pauseLocalMusicAudioOutput,
  resetMusicColdStartRestoreForTests: () => resetMusicColdStartRestoreForTests,
  shouldRestoreMusicPlaybackAfterColdStart: () => shouldRestoreMusicPlaybackAfterColdStart,
  subscribeMusicPlaybackUi: () => subscribeMusicPlaybackUi,
  syncMusicPlaybackPositionToStore: () => syncMusicPlaybackPositionToStore,
  yieldMusicPlaybackToRemoteClient: () => yieldMusicPlaybackToRemoteClient
});
function publishMusicPlaybackSessionBuildStamp() {
  const bag = globalThis;
  bag.__agnxMusicPlaybackSessionBuild = MUSIC_PLAYBACK_SESSION_BUILD;
}
function subscribeMusicPlaybackUi(sink) {
  ensureMusicPlaybackRuntime();
  uiSinks.add(sink);
  return () => {
    uiSinks.delete(sink);
  };
}
function notifyPlaying(playing) {
  for (const sink of uiSinks) {
    sink.onPlayingChange?.(playing);
  }
}
function notifyTime(currentTime) {
  for (const sink of uiSinks) {
    sink.onTimeUpdate?.(currentTime);
  }
}
function syncMusicPlaybackPositionToStore(force = false) {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  const state = useMusicDemoStore.getState();
  if (!state.nowPlayingId) {
    return;
  }
  const second = Math.max(0, Math.floor(audio.currentTime || 0));
  if (!force && state.playbackPositionSec === second) {
    writeLiveMusicPlaybackSessionSnapshot(second);
    return;
  }
  state.setPlaybackPosition(second);
  writeLiveMusicPlaybackSessionSnapshot(second);
}
function flushMusicPlaybackSessionSnapshot() {
  const audio = getMusicPlaybackAudio();
  const state = useMusicDemoStore.getState();
  const liveSec = audio && Number.isFinite(audio.currentTime) ? Math.max(0, Math.floor(audio.currentTime)) : 0;
  const livePlaying = Boolean(audio && audio.src && !audio.paused);
  if (livePlaying && !state.wantsPlaying) {
    state.setWantsPlaying(true);
  }
  if (state.nowPlayingId && liveSec > state.playbackPositionSec) {
    state.setPlaybackPosition(liveSec);
  }
  const latest = useMusicDemoStore.getState();
  const next = resolveMusicPlaybackSessionWrite({
    nowPlayingId: latest.nowPlayingId,
    wantsPlaying: latest.wantsPlaying || livePlaying,
    playbackPositionSec: Math.max(latest.playbackPositionSec, liveSec),
    livePlaying,
    existing: readMusicPlaybackSessionSnapshotSync()
  });
  if (!next) {
    return;
  }
  writeMusicPlaybackSessionSnapshotSync(next);
}
function writeLiveMusicPlaybackSessionSnapshot(positionSec) {
  const state = useMusicDemoStore.getState();
  const audio = getMusicPlaybackAudio();
  const livePlaying = Boolean(audio && audio.src && !audio.paused);
  const next = resolveMusicPlaybackSessionWrite({
    nowPlayingId: state.nowPlayingId,
    wantsPlaying: state.wantsPlaying || livePlaying,
    playbackPositionSec: Math.max(0, Math.floor(positionSec)),
    livePlaying,
    existing: readMusicPlaybackSessionSnapshotSync()
  });
  if (!next) {
    return;
  }
  writeMusicPlaybackSessionSnapshotSync(next);
}
function applyMusicPlaybackSessionSnapshotAfterHydrate() {
  const state = useMusicDemoStore.getState();
  const merged = resolveMusicPlaybackSessionMerge({
    storeNowPlayingId: state.nowPlayingId,
    storeWantsPlaying: state.wantsPlaying,
    storePlaybackPositionSec: state.playbackPositionSec,
    snapshot: readMusicPlaybackSessionSnapshotSync()
  });
  if (!merged.apply) {
    return false;
  }
  if (merged.playbackPositionSec === state.playbackPositionSec && merged.wantsPlaying === state.wantsPlaying) {
    return false;
  }
  if (merged.playbackPositionSec !== state.playbackPositionSec) {
    state.setPlaybackPosition(merged.playbackPositionSec);
  }
  if (merged.wantsPlaying !== state.wantsPlaying) {
    state.setWantsPlaying(merged.wantsPlaying);
  }
  return true;
}
function installPlaybackPositionLifecycleFlush() {
  if (typeof document === "undefined") {
    return;
  }
  const bag = globalThis;
  if (bag.__agnxMusicPositionLifecycleInstalled) {
    return;
  }
  bag.__agnxMusicPositionLifecycleInstalled = true;
  const flush = () => {
    flushMusicPlaybackSessionSnapshot();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flush();
    }
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}
async function applyMusicPlaybackIntent(wantsPlaying) {
  ensureMusicPlaybackRuntime();
  const next = Boolean(wantsPlaying);
  if (next) {
    await publishMusicPlaybackFocusClaim(getMusicBoundSync());
  }
  lastBridgedWantsPlaying = next;
  const store = useMusicDemoStore.getState();
  if (store.wantsPlaying !== next) {
    store.setWantsPlaying(next);
  }
  const applied = await syncWantsPlayingToAudio(next);
  flushMusicPlaybackSessionSnapshot();
  const audio = getMusicPlaybackAudio();
  return {
    wantsPlaying: useMusicDemoStore.getState().wantsPlaying,
    audioPaused: audio ? audio.paused : null,
    applied
  };
}
async function syncWantsPlayingToAudio(wantsPlaying) {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return false;
  }
  if (!wantsPlaying) {
    try {
      if (!audio.paused) {
        audio.pause();
      }
    } catch {
    }
    syncMusicPlaybackPositionToStore(true);
    notifyPlaying(false);
    setMusicPlaybackBackgroundActive(false);
    return true;
  }
  if (!audio.src || !audio.paused) {
    if (!audio.paused) {
      notifyPlaying(true);
      setMusicPlaybackBackgroundActive(true);
    }
    return Boolean(audio.src);
  }
  const ok = await safeMusicPlay(audio);
  notifyPlaying(ok);
  if (ok) {
    setMusicPlaybackBackgroundActive(true);
  } else if (useMusicDemoStore.getState().wantsPlaying) {
    notifyPlaying(false);
    setMusicPlaybackBackgroundActive(true);
    installMusicAutoplayUnlockRetry();
  }
  return ok;
}
function pauseLocalMusicAudioOutput() {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  try {
    if (!audio.paused) {
      audio.pause();
    }
  } catch {
  }
  syncMusicPlaybackPositionToStore(true);
  notifyPlaying(false);
  setMusicPlaybackBackgroundActive(false);
}
function yieldMusicPlaybackToRemoteClient() {
  pauseLocalMusicAudioOutput();
  if (useMusicDemoStore.getState().wantsPlaying) {
    lastBridgedWantsPlaying = false;
    useMusicDemoStore.getState().setWantsPlaying(false);
  }
}
function ensureWantsPlayingBridge() {
  if (wantsPlayingBridgeInstalled) {
    return;
  }
  wantsPlayingBridgeInstalled = true;
  lastBridgedWantsPlaying = useMusicDemoStore.getState().wantsPlaying;
  useMusicDemoStore.subscribe((state) => {
    if (state.wantsPlaying === lastBridgedWantsPlaying) {
      return;
    }
    lastBridgedWantsPlaying = state.wantsPlaying;
    void syncWantsPlayingToAudio(state.wantsPlaying);
  });
}
async function resolveHeadlessPlayableUri(rawUri) {
  const trimmed = rawUri.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const host2 = getMusicHostApi();
  if (!host2?.files?.resolveObjectUrl) {
    return null;
  }
  try {
    return await host2.files.resolveObjectUrl(trimmed);
  } catch {
    return null;
  }
}
async function loadAndPlayTrackUriHeadless(input) {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return false;
  }
  const uri = await resolveHeadlessPlayableUri(input.sourceUri);
  if (!uri) {
    useMusicDemoStore.getState().setWantsPlaying(true);
    return false;
  }
  try {
    const prefs = useMusicDemoStore.getState();
    applyMusicPlaybackVolume(prefs.volume, prefs.muted);
    let playbackAudio = audio;
    if (audio.src !== uri) {
      playbackAudio = setMusicPlaybackSrc(audio, uri);
      applyMusicPlaybackVolume(prefs.volume, prefs.muted);
      playbackAudio.load();
    }
    setMusicPlaybackLoadedMeta({ trackId: input.trackId, sourceUri: input.sourceUri });
    const seekSec = typeof input.seekSec === "number" && Number.isFinite(input.seekSec) && input.seekSec > 0 ? input.seekSec : 0;
    if (seekSec > 0) {
      const applySeek = () => {
        try {
          if (Number.isFinite(playbackAudio.duration) && playbackAudio.duration > 0) {
            playbackAudio.currentTime = Math.min(
              seekSec,
              Math.max(0, playbackAudio.duration - 0.25)
            );
          } else {
            playbackAudio.currentTime = seekSec;
          }
        } catch {
        }
      };
      if (playbackAudio.readyState >= 1) {
        applySeek();
      } else {
        playbackAudio.addEventListener("loadedmetadata", applySeek, { once: true });
      }
    }
    const ok = await safeMusicPlay(playbackAudio);
    notifyPlaying(ok);
    if (ok) {
      useMusicDemoStore.getState().setWantsPlaying(true);
      setMusicPlaybackBackgroundActive(true);
    }
    return ok;
  } catch {
    useMusicDemoStore.getState().setWantsPlaying(true);
    return false;
  }
}
function resetMusicColdStartRestoreForTests() {
  coldStartRestoreSucceeded = false;
  coldStartRestoreInFlight = false;
  coldRestoreWatchInstalled = false;
  coldRestoreGestureUnlockInstalled = false;
  if (coldRestoreRetryTimer) {
    clearTimeout(coldRestoreRetryTimer);
    coldRestoreRetryTimer = null;
  }
}
function scheduleMusicColdRestoreRetry(delayMs) {
  if (coldStartRestoreSucceeded || coldRestoreRetryTimer) {
    return;
  }
  coldRestoreRetryTimer = setTimeout(() => {
    coldRestoreRetryTimer = null;
    void maybeRestoreMusicPlaybackAfterColdStart();
  }, delayMs);
}
function installMusicAutoplayUnlockRetry() {
  if (typeof document === "undefined") {
    return;
  }
  if (coldRestoreGestureUnlockInstalled) {
    return;
  }
  coldRestoreGestureUnlockInstalled = true;
  const onGesture = () => {
    void maybeRestoreMusicPlaybackAfterColdStart().then((ok) => {
      if (!ok) {
        return void 0;
      }
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
      document.removeEventListener("click", onGesture, true);
      coldRestoreGestureUnlockInstalled = false;
      return void 0;
    });
  };
  document.addEventListener("pointerdown", onGesture, true);
  document.addEventListener("keydown", onGesture, true);
  document.addEventListener("click", onGesture, true);
}
function ensureMusicColdRestoreWatch() {
  if (coldRestoreWatchInstalled) {
    return;
  }
  coldRestoreWatchInstalled = true;
  let lastWantsPlaying = useMusicDemoStore.getState().wantsPlaying;
  useMusicDemoStore.subscribe((state) => {
    const wants = state.wantsPlaying;
    const rising = wants && !lastWantsPlaying;
    lastWantsPlaying = wants;
    if (!rising || coldStartRestoreSucceeded || coldStartRestoreInFlight) {
      return;
    }
    void maybeRestoreMusicPlaybackAfterColdStart();
  });
}
async function maybeRestoreMusicPlaybackAfterColdStart() {
  if (coldStartRestoreInFlight) {
    return false;
  }
  if (typeof Audio === "undefined") {
    return false;
  }
  applyMusicPlaybackSessionSnapshotAfterHydrate();
  const state = useMusicDemoStore.getState();
  ensureMusicPlaybackRuntime();
  const audio = getMusicPlaybackAudio();
  if (coldStartRestoreSucceeded && audio && !audio.paused && audio.src) {
    setMusicPlaybackBackgroundActive(true);
    return true;
  }
  const target = shouldRestoreMusicPlaybackAfterColdStart(state);
  if (!target) {
    return false;
  }
  coldStartRestoreInFlight = true;
  try {
    if (audio && !audio.paused && audio.src) {
      setMusicPlaybackBackgroundActive(true);
      coldStartRestoreSucceeded = true;
      return true;
    }
    const latest = useMusicDemoStore.getState();
    const session = readMusicPlaybackSessionSnapshotSync();
    const seekSec = session && session.nowPlayingId === target.trackId ? Math.max(latest.playbackPositionSec, session.playbackPositionSec) : latest.playbackPositionSec;
    const started = await loadAndPlayTrackUriHeadless({
      trackId: target.trackId,
      sourceUri: target.sourceUri,
      seekSec
    });
    if (started) {
      coldStartRestoreSucceeded = true;
      return true;
    }
    useMusicDemoStore.getState().setWantsPlaying(true);
    coldStartRestoreSucceeded = false;
    scheduleMusicColdRestoreRetry(1200);
    installMusicAutoplayUnlockRetry();
    return false;
  } finally {
    coldStartRestoreInFlight = false;
  }
}
function handleEnded() {
  syncMusicPlaybackPositionToStore(true);
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  const store = useMusicDemoStore.getState();
  notifyPlaying(false);
  if (store.playMode === "loop-one") {
    audio.currentTime = 0;
    void safeMusicPlay(audio).then((ok) => {
      notifyPlaying(ok);
      store.setWantsPlaying(ok);
      if (ok) {
        setMusicPlaybackBackgroundActive(true);
      }
      return void 0;
    });
    return;
  }
  const next = store.playNext();
  if (!next) {
    store.setWantsPlaying(false);
    setMusicPlaybackBackgroundActive(false);
    return;
  }
  store.setWantsPlaying(true);
  requestTrackAutoPlay(next.id);
  setMusicPlaybackBackgroundActive(true);
  if (uiSinks.size > 0) {
    return;
  }
  const uri = next.sourceUri?.trim();
  if (uri) {
    void loadAndPlayTrackUriHeadless({ trackId: next.id, sourceUri: uri });
  }
}
function handleTimeUpdate() {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  notifyTime(audio.currentTime || 0);
  if (audio.paused || !useMusicDemoStore.getState().nowPlayingId) {
    return;
  }
  const sec = Math.max(0, Math.floor(audio.currentTime || 0));
  const bag = globalThis;
  const last = bag.__agnxMusicSessionThrottleSec ?? 0;
  if (sec > 0 && sec - last >= 5) {
    bag.__agnxMusicSessionThrottleSec = sec;
    writeLiveMusicPlaybackSessionSnapshot(sec);
  }
}
function ensureMusicPlaybackRuntime() {
  if (typeof Audio === "undefined") {
    return;
  }
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  if (runtimeInstalled && runtimeAudio === audio) {
    return;
  }
  if (runtimeAudio && runtimeAudio !== audio) {
    runtimeAudio.removeEventListener("ended", handleEnded);
    runtimeAudio.removeEventListener("timeupdate", handleTimeUpdate);
  }
  runtimeAudio = audio;
  runtimeInstalled = true;
  publishMusicPlaybackSessionBuildStamp();
  audio.addEventListener("ended", handleEnded);
  audio.addEventListener("timeupdate", handleTimeUpdate);
  ensureWantsPlayingBridge();
  installPlaybackPositionLifecycleFlush();
}
var uiSinks, runtimeInstalled, runtimeAudio, wantsPlayingBridgeInstalled, lastBridgedWantsPlaying, coldStartRestoreSucceeded, coldStartRestoreInFlight, coldRestoreWatchInstalled, coldRestoreRetryTimer, coldRestoreGestureUnlockInstalled;
var init_playback_runtime = __esm({
  "src/playback-runtime.ts"() {
    init_playback_engine();
    init_playback_leader();
    init_music_autoplay();
    init_music_host();
    init_playback_cold_restore();
    init_playback_session();
    init_store();
    init_playback_cold_restore();
    uiSinks = /* @__PURE__ */ new Set();
    runtimeInstalled = false;
    runtimeAudio = null;
    wantsPlayingBridgeInstalled = false;
    lastBridgedWantsPlaying = null;
    coldStartRestoreSucceeded = false;
    coldStartRestoreInFlight = false;
    coldRestoreWatchInstalled = false;
    coldRestoreRetryTimer = null;
    coldRestoreGestureUnlockInstalled = false;
  }
});

// src/playback-engine.ts
function readGlobalAudio() {
  const host2 = globalThis;
  return host2[GLOBAL_AUDIO_KEY] ?? null;
}
function writeGlobalAudio(audio) {
  const host2 = globalThis;
  if (audio) {
    host2[GLOBAL_AUDIO_KEY] = audio;
  } else {
    delete host2[GLOBAL_AUDIO_KEY];
  }
}
function readGlobalGain() {
  return globalThis[GLOBAL_GAIN_KEY] ?? null;
}
function writeGlobalGain(value) {
  const host2 = globalThis;
  if (value) {
    host2[GLOBAL_GAIN_KEY] = value;
  } else {
    delete host2[GLOBAL_GAIN_KEY];
  }
}
function isCrossOriginHttpMusicSrc(uri) {
  const trimmed = uri.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }
  if (typeof location === "undefined" || !location.origin) {
    return true;
  }
  try {
    return new URL(trimmed).origin !== location.origin;
  } catch {
    return true;
  }
}
function tearDownMusicPlaybackGainGraph() {
  const graph = readGlobalGain();
  if (!graph) {
    return;
  }
  try {
    void graph.context.close();
  } catch {
  }
  writeGlobalGain(null);
}
function recreateMusicPlaybackAudioElement() {
  tearDownMusicPlaybackGainGraph();
  const host2 = globalThis;
  delete host2[GLOBAL_MES_BOUND_KEY];
  try {
    const old = readGlobalAudio();
    if (old) {
      old.pause();
      old.removeAttribute("src");
      old.load();
    }
  } catch {
  }
  writeGlobalAudio(null);
  sharedAudio = null;
  const next = getMusicPlaybackAudio();
  if (!next) {
    throw new Error("\u65E0\u6CD5\u521B\u5EFA\u97F3\u9891\u5143\u7D20");
  }
  return next;
}
function setMusicPlaybackSrc(audio, uri) {
  const trimmed = uri.trim();
  if (!trimmed) {
    return audio;
  }
  let target = audio;
  if (isCrossOriginHttpMusicSrc(trimmed)) {
    const host2 = globalThis;
    if (host2[GLOBAL_MES_BOUND_KEY] || readGlobalGain()) {
      target = recreateMusicPlaybackAudioElement();
    } else {
      tearDownMusicPlaybackGainGraph();
    }
    target.crossOrigin = "anonymous";
  }
  if (target.src !== trimmed) {
    target.src = trimmed;
  }
  return target;
}
function getMusicPlaybackAudio() {
  if (typeof Audio === "undefined") {
    return null;
  }
  const existing = sharedAudio ?? readGlobalAudio();
  if (existing) {
    sharedAudio = existing;
    writeGlobalAudio(existing);
    return existing;
  }
  sharedAudio = new Audio();
  sharedAudio.preload = "auto";
  sharedAudio.crossOrigin = "anonymous";
  writeGlobalAudio(sharedAudio);
  return sharedAudio;
}
function getMusicPlaybackLoadedMeta() {
  return globalThis[GLOBAL_LOADED_KEY] ?? null;
}
function setMusicPlaybackLoadedMeta(meta) {
  const host2 = globalThis;
  if (meta) {
    host2[GLOBAL_LOADED_KEY] = meta;
  } else {
    delete host2[GLOBAL_LOADED_KEY];
  }
}
function setMusicPlaybackBackgroundActive(active) {
  const host2 = globalThis;
  if (Boolean(host2[BACKGROUND_ACTIVE_KEY]) === active) {
    if (active) {
      bootMusicPlaybackRuntimeFromEngine();
    }
    syncMusicRetainToHostApi(active);
    return;
  }
  host2[BACKGROUND_ACTIVE_KEY] = active;
  if (active) {
    bootMusicPlaybackRuntimeFromEngine();
  }
  host2[BACKGROUND_LISTENERS_KEY]?.forEach((listener) => {
    try {
      listener();
    } catch {
    }
  });
  syncMusicRetainToHostApi(active);
}
function syncMusicRetainToHostApi(active) {
  try {
    const musicHost = (init_music_host(), __toCommonJS(music_host_exports));
    musicHost.tryGetMusicHostApi?.()?.background?.requestRetain?.({
      appId: MUSIC_APP_ID,
      active,
      reason: "playback"
    });
  } catch {
  }
}
function bootMusicPlaybackRuntimeFromEngine() {
  try {
    const runtime = (init_playback_runtime(), __toCommonJS(playback_runtime_exports));
    runtime.ensureMusicPlaybackRuntime?.();
  } catch {
  }
}
function isMusicPlaybackAttachedOnTrack(input) {
  const { trackId, sourceUri, nowPlayingId, audio } = input;
  if (!audio || !audio.src) {
    return false;
  }
  if (trackId !== nowPlayingId) {
    return false;
  }
  const meta = getMusicPlaybackLoadedMeta();
  if (meta?.trackId === trackId && meta.sourceUri !== sourceUri) {
    return false;
  }
  if (input.loadedTrackId === trackId && input.loadedSourceUri != null && input.loadedSourceUri !== sourceUri) {
    return false;
  }
  const sameTrack = input.loadedTrackId === trackId || meta?.trackId === trackId;
  const sameSource = input.loadedSourceUri === sourceUri || meta?.sourceUri === sourceUri;
  if (sameTrack && sameSource) {
    return true;
  }
  return input.loadedTrackId == null && meta == null;
}
function readMusicPlaybackDurationSec(audio) {
  if (!audio) {
    return 0;
  }
  const raw = audio.duration;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return raw;
}
function whenMusicPlaybackMetadataReady(audio, timeoutMs = 8e3) {
  const existing = readMusicPlaybackDurationSec(audio);
  if (existing > 0) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      resolve(readMusicPlaybackDurationSec(audio));
    };
    const onMeta = () => {
      if (readMusicPlaybackDurationSec(audio) > 0) {
        finish();
      }
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    if (audio.readyState >= 1) {
      onMeta();
    }
    const timer = setTimeout(finish, Math.max(0, timeoutMs));
    if (typeof timer === "object" && timer && "unref" in timer) {
      try {
        timer.unref();
      } catch {
      }
    }
  });
}
function ensureMusicPlaybackGain(audio) {
  if (typeof AudioContext === "undefined") {
    return null;
  }
  if (audio.src && isCrossOriginHttpMusicSrc(audio.src)) {
    return null;
  }
  const existing = readGlobalGain();
  if (existing) {
    return existing.gain;
  }
  try {
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    source.connect(gain);
    gain.connect(context.destination);
    writeGlobalGain({ context, gain });
    globalThis[GLOBAL_MES_BOUND_KEY] = true;
    audio.volume = 1;
    return gain;
  } catch {
    return null;
  }
}
function applyMusicPlaybackVolume(volume, muted) {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  const level = muted ? 0 : Math.min(2, Math.max(0, volume));
  const gain = ensureMusicPlaybackGain(audio);
  if (gain) {
    audio.volume = 1;
    gain.gain.value = level;
    const ctx = readGlobalGain()?.context;
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    return;
  }
  audio.volume = Math.min(1, level);
}
function isMusicPlayInterruptedError(error) {
  if (error == null) {
    return false;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    if (String(error.name) === "AbortError") {
      return true;
    }
  }
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = String(error);
  }
  const lower = message.toLowerCase();
  return lower.includes("interrupted by a call to pause") || lower.includes("the play() request was interrupted") || lower.includes("interrupted by a new load request");
}
function isMusicAutoplayBlockedError(error) {
  if (error == null) {
    return false;
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    const name = String(error.name);
    if (name === "NotAllowedError") {
      return true;
    }
  }
  let message = "";
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = String(error);
  }
  const lower = message.toLowerCase();
  return lower.includes("notallowederror") || lower.includes("user didn't interact") || lower.includes("user has not interacted") || lower.includes("play() can only be initiated") || lower.includes("the request is not allowed by the user agent");
}
async function resumeMusicPlaybackAudioContext() {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return;
  }
  ensureMusicPlaybackGain(audio);
  const ctx = readGlobalGain()?.context;
  if (!ctx || ctx.state !== "suspended") {
    return;
  }
  try {
    await ctx.resume();
  } catch {
  }
}
async function safeMusicPlay(audio) {
  try {
    await resumeMusicPlaybackAudioContext();
    await audio.play();
    return !audio.paused;
  } catch (error) {
    if (isMusicPlayInterruptedError(error)) {
      return !audio.paused;
    }
    if (isMusicAutoplayBlockedError(error)) {
      return false;
    }
    throw error;
  }
}
function stopMusicPlaybackAudio() {
  const audio = sharedAudio ?? readGlobalAudio();
  if (!audio) {
    return;
  }
  try {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  } catch {
  }
  setMusicPlaybackLoadedMeta(null);
  setMusicPlaybackBackgroundActive(false);
}
function prepareMusicPlaybackSourceChange() {
  const audio = getMusicPlaybackAudio();
  if (!audio) {
    return null;
  }
  try {
    audio.pause();
  } catch {
  }
  try {
    if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
      audio.currentTime = 0;
    }
  } catch {
  }
  setMusicPlaybackLoadedMeta(null);
  return audio;
}
var GLOBAL_AUDIO_KEY, GLOBAL_GAIN_KEY, GLOBAL_LOADED_KEY, GLOBAL_MES_BOUND_KEY, BACKGROUND_ACTIVE_KEY, BACKGROUND_LISTENERS_KEY, sharedAudio;
var init_playback_engine = __esm({
  "src/playback-engine.ts"() {
    init_music_ids();
    GLOBAL_AUDIO_KEY = "__agnx_music_playback_audio__";
    GLOBAL_GAIN_KEY = "__agnx_music_playback_gain__";
    GLOBAL_LOADED_KEY = "__agnx_music_playback_loaded__";
    GLOBAL_MES_BOUND_KEY = "__agnx_music_playback_mes_bound__";
    BACKGROUND_ACTIVE_KEY = "__agnx_music_playback_background_active__";
    BACKGROUND_LISTENERS_KEY = "__agnx_music_playback_background_listeners__";
    sharedAudio = readGlobalAudio();
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MUSIC_APP_ID: () => MUSIC_APP_ID,
  MUSIC_PANEL_ID: () => MUSIC_PANEL_ID,
  MUSIC_PROVIDER_ID: () => MUSIC_PROVIDER_ID,
  MUSIC_SEGMENT_ID: () => MUSIC_SEGMENT_ID,
  activate: () => activate,
  appId: () => appId,
  bindMusicHostStorage: () => bindMusicHostStorage,
  deactivate: () => deactivate,
  default: () => index_default,
  listTracksAsWorkspaceItems: () => listTracksAsWorkspaceItems,
  refreshMusicListFromHostStorage: () => refreshMusicListFromHostStorage,
  trackToListItem: () => trackToListItem,
  useMusicDemoStore: () => useMusicDemoStore
});
module.exports = __toCommonJS(index_exports);
init_music_ids();
init_music_runtime_app_id();
init_playback_engine();
init_playback_runtime();
init_playback_leader();

// src/player.tsx
var import_react11 = require("react");
var import_react_native9 = require("react-native");
var import_lucide_react_native8 = require("lucide-react-native");
var import_react_native_unistyles7 = require("react-native-unistyles");
var import_app_sdk = require("@getagnx/app-sdk");
init_music_ids();

// src/list-contributions.ts
var import_lucide_react_native2 = require("lucide-react-native");
init_music_runtime_app_id();
init_music_ids();
init_store();
var MUSIC_SEGMENT_ID = "music";
var MUSIC_PANEL_ID = "player";
var MUSIC_PROVIDER_ID = "music.tracks";
var MUSIC_OPEN_PLAYER_COMMAND_ID = "music.open-player";
var MUSIC_PLAYER_ENTITY_ID = "now-playing";
function registerMusicListContributions(host2) {
  const appId2 = getMusicRuntimeAppId();
  host2.registerPrimarySegment({
    id: MUSIC_SEGMENT_ID,
    appId: appId2,
    label: "\u97F3\u4E50",
    order: 55,
    icon: import_lucide_react_native2.Music2,
    keywords: ["music", "\u6B4C\u66F2", "\u66F2\u76EE", "\u64AD\u653E\u5668", "player"],
    listTitlePresentation: "inline-muted-subtitle",
    itemProviderId: MUSIC_PROVIDER_ID,
    organizeBlockId: MUSIC_SEGMENT_ID,
    emptyHint: "\u8FD8\u6CA1\u6709\u66F2\u76EE\u3002\u6253\u5F00\u64AD\u653E\u5668\u540E\u53EF\u5728\u5E94\u7528\u5185\u5BFC\u5165\u672C\u5730\u97F3\u9891\u3002",
    emptyActionCommandId: MUSIC_OPEN_PLAYER_COMMAND_ID,
    listHeaderCommandIds: [MUSIC_OPEN_PLAYER_COMMAND_ID]
  });
  host2.registerItemProvider({
    id: MUSIC_PROVIDER_ID,
    appId: appId2,
    subscribe: (listener) => {
      listener(listTracksAsWorkspaceItems());
      return useMusicDemoStore.subscribe(() => {
        listener(listTracksAsWorkspaceItems());
      });
    },
    search: (query) => listTracksAsWorkspaceItems(query)
  });
  host2.registerOrganize({
    id: MUSIC_SEGMENT_ID,
    appId: appId2,
    label: "\u97F3\u4E50",
    sortOptions: [
      { id: "updatedAt", label: "\u6700\u8FD1\u66F4\u65B0" },
      { id: "title", label: "\u540D\u79F0\u6392\u5E8F" }
    ],
    defaultSortOptionId: "updatedAt",
    organize: ({ query }) => [
      {
        key: "tracks",
        title: "\u66F2\u76EE",
        items: listTracksAsWorkspaceItems(query)
      }
    ]
  });
}

// src/detail-sheet-fields.tsx
var import_react = require("react");
var import_react_native = require("react-native");
var import_react_native_unistyles = require("react-native-unistyles");
init_store();
var import_jsx_runtime = require("react/jsx-runtime");
async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error("clipboard unavailable");
}
function DetailRangeSlider(props) {
  const { theme } = (0, import_react_native_unistyles.useUnistyles)();
  const { value, min, max, step, formatValue, onChange, testID, accessibilityLabel } = props;
  const trackWidthRef = (0, import_react.useRef)(1);
  const span = max - min || 1;
  const fillRatio = Math.min(1, Math.max(0, (value - min) / span));
  const commitFromRatio = (0, import_react.useCallback)(
    (ratio) => {
      const clamped = Math.min(1, Math.max(0, ratio));
      const raw = min + clamped * span;
      const stepped = Math.round(raw / step) * step;
      onChange(Math.min(max, Math.max(min, stepped)));
    },
    [max, min, onChange, span, step]
  );
  const handleWebChange = (0, import_react.useCallback)(
    (event) => {
      onChange(Number(event.target.value));
    },
    [onChange]
  );
  const handleLayout = (0, import_react.useCallback)((event) => {
    trackWidthRef.current = Math.max(1, event.nativeEvent.layout.width);
  }, []);
  const changeFromEvent = (0, import_react.useCallback)(
    (event) => {
      commitFromRatio(event.nativeEvent.locationX / trackWidthRef.current);
    },
    [commitFromRatio]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react_native.View, { style: styles.rangeRow, testID, children: [
    import_react_native.Platform.OS === "web" ? (
      // web/Electron：原生 range
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "range",
          min,
          max,
          step,
          value,
          onChange: handleWebChange,
          "aria-label": accessibilityLabel,
          style: {
            flex: 1,
            minWidth: 96,
            accentColor: theme.colors.primary
          }
        }
      )
    ) : (
      // native：可拖轨道（无 HTML input）
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_react_native.View,
        {
          accessibilityRole: "adjustable",
          accessibilityLabel,
          accessibilityValue: {
            min,
            max,
            now: value,
            text: formatValue(value)
          },
          onLayout: handleLayout,
          onStartShouldSetResponder: () => true,
          onMoveShouldSetResponder: () => true,
          onResponderGrant: changeFromEvent,
          onResponderMove: changeFromEvent,
          style: styles.rangeHit,
          testID: `${testID}-track`,
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_native.View, { style: styles.rangeTrack, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_react_native.View,
            {
              style: [
                styles.rangeFill,
                {
                  width: `${fillRatio * 100}%`,
                  backgroundColor: theme.colors.primary
                }
              ]
            }
          ) })
        }
      )
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_native.Text, { style: [styles.rangeValue, { color: theme.colors.foreground }], children: formatValue(value) })
  ] });
}
function MusicCoverBackdropBlurDetailField() {
  const blur = useMusicDemoStore((state) => state.coverBackdropBlur);
  const setBlur = useMusicDemoStore((state) => state.setCoverBackdropBlur);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    DetailRangeSlider,
    {
      value: blur,
      min: 0,
      max: 24,
      step: 1,
      formatValue: (value) => `${value}`,
      onChange: setBlur,
      testID: "music-detail-cover-backdrop-blur",
      accessibilityLabel: "\u5C01\u9762\u80CC\u666F\u6A21\u7CCA"
    }
  );
}
function MusicCoverBackdropOpacityDetailField() {
  const opacity = useMusicDemoStore((state) => state.coverBackdropOpacity);
  const setOpacity = useMusicDemoStore((state) => state.setCoverBackdropOpacity);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    DetailRangeSlider,
    {
      value: Math.round(opacity * 100),
      min: 15,
      max: 95,
      step: 1,
      formatValue: (value) => `${value}%`,
      onChange: (percent) => setOpacity(percent / 100),
      testID: "music-detail-cover-backdrop-opacity",
      accessibilityLabel: "\u5C01\u9762\u80CC\u666F\u900F\u660E\u5EA6"
    }
  );
}
function MusicSearchCacheTtlDetailField() {
  const { theme } = (0, import_react_native_unistyles.useUnistyles)();
  const ttl = useMusicDemoStore((state) => state.searchCacheTtlMinutes);
  const setTtl = useMusicDemoStore((state) => state.setSearchCacheTtlMinutes);
  const [draft, setDraft] = (0, import_react.useState)(String(ttl));
  (0, import_react.useEffect)(() => {
    setDraft(String(ttl));
  }, [ttl]);
  const save = (0, import_react.useCallback)(() => {
    const next = Number(draft);
    setTtl(next);
    setDraft(
      String(Math.max(1, Math.floor(next) || useMusicDemoStore.getState().searchCacheTtlMinutes))
    );
  }, [draft, setTtl]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react_native.View, { style: styles.ttlRow, testID: "music-detail-search-cache-ttl", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_react_native.TextInput,
      {
        value: draft,
        onChangeText: setDraft,
        onSubmitEditing: save,
        keyboardType: "number-pad",
        selectTextOnFocus: true,
        style: [
          styles.ttlInput,
          {
            color: theme.colors.foreground,
            borderColor: theme.colors.border
          }
        ],
        testID: "music-detail-search-cache-ttl-input"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_native.Text, { style: [styles.ttlUnit, { color: theme.colors.foregroundMuted }], children: "\u5206\u949F" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_react_native.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: "\u4FDD\u5B58\u641C\u7D22\u7F13\u5B58\u65F6\u957F",
        onPress: save,
        style: styles.ttlSave,
        testID: "music-detail-search-cache-ttl-save",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_native.Text, { style: [styles.ttlSaveText, { color: theme.colors.foreground }], children: "\u4FDD\u5B58" })
      }
    )
  ] });
}
function MusicAtmosphereDetailField(props) {
  void props.hostApi;
  const { theme } = (0, import_react_native_unistyles.useUnistyles)();
  const [status, setStatus] = (0, import_react.useState)(null);
  const slots = [
    { id: "primary", color: props.primary },
    { id: "secondary", color: props.secondary ?? "" },
    { id: "tertiary", color: props.tertiary ?? "" }
  ];
  const handleCopy = (0, import_react.useCallback)(async () => {
    const payload = JSON.stringify(
      {
        primary: props.primary,
        secondary: props.secondary,
        tertiary: props.tertiary,
        luminance: props.luminance ?? "unknown",
        sourceLabel: props.sourceLabel
      },
      null,
      2
    );
    try {
      await copyTextToClipboard(payload);
      setStatus("\u5DF2\u590D\u5236");
    } catch {
      setStatus("\u590D\u5236\u5931\u8D25");
    }
  }, [props.luminance, props.primary, props.secondary, props.sourceLabel, props.tertiary]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react_native.View, { style: styles.atmosphereRow, testID: "music-detail-atmosphere", children: [
    slots.map((slot) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_react_native.View,
      {
        style: [
          styles.atmosphereSwatch,
          slot.color ? { backgroundColor: slot.color } : styles.atmosphereSwatchEmpty
        ]
      },
      slot.id
    )),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      import_react_native.Text,
      {
        selectable: true,
        numberOfLines: 1,
        style: [styles.atmosphereHex, { color: theme.colors.foregroundMuted }],
        children: [
          props.primary,
          props.secondary ? ` \xB7 ${props.secondary}` : "",
          props.tertiary ? ` \xB7 ${props.tertiary}` : ""
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      import_react_native.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: "\u590D\u5236\u6C1B\u56F4 JSON",
        onPress: () => void handleCopy(),
        style: styles.atmosphereCopyHit,
        testID: "music-detail-atmosphere-copy",
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react_native.Text, { style: { color: theme.colors.foreground, fontSize: 13, fontWeight: "500" }, children: status === "\u5DF2\u590D\u5236" ? "\u5DF2\u590D\u5236" : "\u590D\u5236" })
      }
    )
  ] });
}
var styles = import_react_native_unistyles.StyleSheet.create((theme) => ({
  ttlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    minWidth: 0,
    flexShrink: 1
  },
  ttlInput: {
    width: 56,
    borderWidth: import_react_native.StyleSheet.hairlineWidth,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[1],
    paddingVertical: theme.spacing[1],
    fontSize: theme.fontSize.sm,
    textAlign: "center"
  },
  ttlUnit: {
    // 与详情配置主文案 sm 对齐（原 xs 会显得缩一号）
    fontSize: theme.fontSize.sm
  },
  ttlSave: {
    paddingHorizontal: theme.spacing[1],
    paddingVertical: theme.spacing[0.5]
  },
  ttlSaveText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 160,
    flexShrink: 0
  },
  rangeHit: {
    flex: 1,
    minWidth: 96,
    height: 28,
    justifyContent: "center"
  },
  rangeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden"
  },
  rangeFill: {
    height: 4,
    borderRadius: 2
  },
  rangeValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "right"
  },
  atmosphereRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flexShrink: 1
  },
  atmosphereSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    flexShrink: 0
  },
  atmosphereSwatchEmpty: {
    backgroundColor: "transparent",
    borderStyle: "dashed"
  },
  atmosphereHex: {
    flex: 1,
    minWidth: 0,
    fontSize: 12
  },
  atmosphereCopyHit: {
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingVertical: 2
  }
}));

// src/lyrics.ts
var LRC_LINE_RE = /^\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)$/;
var TRAILING_LRC_TIME_RE = /\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]\s*$/g;
var INLINE_LRC_TIME_RE = /\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?\]/g;
var BILINGUAL_TIME_EPSILON_SEC = 0.05;
function stripInlineLrcTimestamps(body) {
  return body.replace(INLINE_LRC_TIME_RE, " ").replace(TRAILING_LRC_TIME_RE, "").replace(/\s+/g, " ").trim();
}
var LYRIC_PLACEHOLDER_RE = /没有填词|暂无歌词|纯音乐|此歌曲为|instrumental|no\s*lyrics|lyrics?\s*not\s*found/i;
function isLyricPlaceholder(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return true;
  }
  return LYRIC_PLACEHOLDER_RE.test(trimmed);
}
function parseLyrics(raw) {
  const text = raw?.trim();
  if (!text) {
    return [];
  }
  const lines = text.split(/\r?\n/);
  const timed = [];
  const plain = [];
  for (const line of lines) {
    const match = LRC_LINE_RE.exec(line.trim());
    if (!match) {
      const plainText = line.trim();
      if (plainText && !isLyricPlaceholder(plainText)) {
        plain.push(plainText);
      }
      continue;
    }
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const fraction = match[3] ?? "0";
    const millis = Number(fraction.padEnd(3, "0").slice(0, 3));
    const body = stripInlineLrcTimestamps(match[4] ?? "");
    if (isLyricPlaceholder(body)) {
      continue;
    }
    timed.push({
      timeSec: minutes * 60 + seconds + millis / 1e3,
      text: body || " "
    });
  }
  if (timed.length > 0) {
    return timed.sort((left, right) => left.timeSec - right.timeSec);
  }
  return plain.map((item, index) => ({ timeSec: index * 4, text: item }));
}
function groupLyricUnits(lines, epsilonSec = BILINGUAL_TIME_EPSILON_SEC) {
  const units = [];
  for (const line of lines) {
    const last = units[units.length - 1];
    if (last && Math.abs(last.timeSec - line.timeSec) <= epsilonSec) {
      units[units.length - 1] = {
        timeSec: last.timeSec,
        texts: [...last.texts, line.text]
      };
      continue;
    }
    units.push({ timeSec: line.timeSec, texts: [line.text] });
  }
  return units;
}
function activeLyricIndex(lines, currentTime) {
  if (lines.length === 0) {
    return -1;
  }
  let active = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    if (line.timeSec <= currentTime) {
      active = index;
    } else {
      break;
    }
  }
  return active;
}
function lyricLineProgress(lines, activeIndex, currentTime) {
  if (activeIndex < 0 || activeIndex >= lines.length) {
    return 0;
  }
  const line = lines[activeIndex];
  if (!line) {
    return 0;
  }
  const next = lines[activeIndex + 1];
  const start = line.timeSec;
  const textLen = Array.from(line.text ?? "").length;
  const end = next ? next.timeSec : start + Math.max(4, textLen * 0.45);
  if (end <= start) {
    return 1;
  }
  const raw = (currentTime - start) / (end - start);
  const karaokeSpan = 0.78;
  return Math.min(1, Math.max(0, raw / karaokeSpan));
}
function quantizeLyricProgress(progress, steps = 24) {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }
  const s = Math.max(1, Math.floor(steps));
  return Math.min(1, Math.max(0, Math.round(progress * s) / s));
}

// src/queue-drawer.tsx
var import_react3 = require("react");
var import_react_native2 = require("react-native");
var import_lucide_react_native3 = require("lucide-react-native");
var import_react_native_unistyles2 = require("react-native-unistyles");
init_music_host();

// src/queue-scroll.ts
var FALLBACK_ROW_HEIGHT = 56;
function resolveQueueScrollOffset(input) {
  const rowHeight = input.rowHeight > 0 ? input.rowHeight : FALLBACK_ROW_HEIGHT;
  const viewportHeight = Math.max(0, input.viewportHeight);
  const contentHeight = Math.max(0, input.contentHeight);
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  if (maxScroll <= 0 || viewportHeight <= 0) {
    return 0;
  }
  const centered = input.rowY - (viewportHeight - rowHeight) / 2;
  if (centered <= 0) {
    return 0;
  }
  if (centered >= maxScroll) {
    return maxScroll;
  }
  return centered;
}

// src/queue-drawer.tsx
init_player_action_layout();
init_track_menu();

// src/track-menu-surfaces.ts
var import_react2 = require("react");
init_music_ids();
init_player_action_layout();
init_track_menu();
init_music_host();
init_store();
var MUSIC_TRACK_ENTITY_MENU_ID = "track";
var MUSIC_TRACK_MENU_SURFACE = {
  player: "player",
  queue: "queue"
};
var KNOWN_IDS = MUSIC_PLAYER_ACTION_IDS;
var STABLE_DEFAULT_PLAYER_LAYOUT = getDefaultMusicPlayerActionLayout();
function getDefaultMusicQueueTrackMenuLayout() {
  return {
    bar: ["addPlaylist"],
    overflow: MUSIC_PLAYER_ACTION_IDS.filter((id) => id !== "addPlaylist"),
    hidden: [],
    showBarLabels: false
  };
}
var STABLE_DEFAULT_QUEUE_LAYOUT = getDefaultMusicQueueTrackMenuLayout();
function isLegacyQueueAllOverflowLayout(layout) {
  if (layout.bar.length !== 0 || layout.hidden.length !== 0) {
    return false;
  }
  if (layout.overflow.length !== MUSIC_PLAYER_ACTION_IDS.length) {
    return false;
  }
  return MUSIC_PLAYER_ACTION_IDS.every((id, index) => layout.overflow[index] === id);
}
var playerMirrorUnsub = null;
function toPlayerLayout(layout) {
  return normalizeMusicPlayerActionLayout({
    bar: layout.bar,
    overflow: layout.overflow,
    hidden: layout.hidden ?? [],
    showBarLabels: layout.showBarLabels
  });
}
function toHostLayout(layout) {
  const normalized = normalizeMusicPlayerActionLayout(layout);
  return {
    bar: [...normalized.bar],
    overflow: [...normalized.overflow],
    hidden: [...normalized.hidden],
    showBarLabels: normalized.showBarLabels ?? false
  };
}
var playerLayoutSnapshotCache = /* @__PURE__ */ new Map();
function playerLayoutsEqual(a, b) {
  if (a === b) {
    return true;
  }
  if ((a.showBarLabels ?? false) !== (b.showBarLabels ?? false)) {
    return false;
  }
  const same = (left, right) => left.length === right.length && left.every((id, index) => id === right[index]);
  return same(a.bar, b.bar) && same(a.overflow, b.overflow) && same(a.hidden, b.hidden);
}
function cachedPlayerLayout(cacheKey, layout) {
  const next = toPlayerLayout(layout);
  const prev = playerLayoutSnapshotCache.get(cacheKey);
  if (prev && playerLayoutsEqual(prev, next)) {
    return prev;
  }
  playerLayoutSnapshotCache.set(cacheKey, next);
  return next;
}
function buildMusicTrackEntityMenuItems(surfaceId) {
  const surfaceKind = surfaceId === MUSIC_TRACK_MENU_SURFACE.queue ? "queue" : "default";
  return MUSIC_PLAYER_ACTION_IDS.map((id) => {
    const presentation = resolveMusicTrackMenuPresentation(id, { surface: surfaceKind });
    return {
      id,
      label: presentation.label,
      icon: presentation.icon,
      canHide: true,
      shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[id]
    };
  });
}
function seedMusicTrackEntityMenuLayouts(hostApi2) {
  const playerSeed = toHostLayout(useMusicDemoStore.getState().actionLayout);
  const playerItems = buildMusicTrackEntityMenuItems(MUSIC_TRACK_MENU_SURFACE.player);
  const queueItems = buildMusicTrackEntityMenuItems(MUSIC_TRACK_MENU_SURFACE.queue);
  hostApi2.ui.registerEntityMenuLayoutCatalog({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.player,
    items: playerItems,
    defaultLayout: playerSeed,
    order: 0
  });
  hostApi2.ui.registerEntityMenuLayoutCatalog({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.queue,
    items: queueItems,
    defaultLayout: toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT),
    order: 1
  });
  hostApi2.ui.seedEntityMenuLayoutIfAbsent({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.player,
    knownIds: KNOWN_IDS,
    layout: playerSeed
  });
  hostApi2.ui.seedEntityMenuLayoutIfAbsent({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId: MUSIC_TRACK_MENU_SURFACE.queue,
    knownIds: KNOWN_IDS,
    layout: toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT)
  });
  const queueLayout = readMusicTrackEntityMenuLayout(hostApi2, MUSIC_TRACK_MENU_SURFACE.queue);
  if (isLegacyQueueAllOverflowLayout(queueLayout)) {
    hostApi2.ui.setEntityMenuLayout({
      appId: MUSIC_APP_ID,
      menuId: MUSIC_TRACK_ENTITY_MENU_ID,
      surfaceId: MUSIC_TRACK_MENU_SURFACE.queue,
      knownIds: KNOWN_IDS,
      layout: toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT)
    });
  }
  playerMirrorUnsub?.();
  playerMirrorUnsub = hostApi2.ui.subscribeEntityMenuLayout(
    {
      appId: MUSIC_APP_ID,
      menuId: MUSIC_TRACK_ENTITY_MENU_ID,
      surfaceId: MUSIC_TRACK_MENU_SURFACE.player
    },
    () => {
      const next = readMusicTrackEntityMenuLayout(hostApi2, MUSIC_TRACK_MENU_SURFACE.player);
      const current = useMusicDemoStore.getState().actionLayout;
      if (!playerLayoutsEqual(current, next)) {
        useMusicDemoStore.getState().setActionLayout(next);
      }
    }
  );
}
function readMusicTrackEntityMenuLayout(hostApi2, surfaceId) {
  const layout = hostApi2.ui.getEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId,
    knownIds: KNOWN_IDS
  });
  return cachedPlayerLayout(`${MUSIC_APP_ID}:${surfaceId}`, layout);
}
function openMusicTrackEntityMenuLayoutEditor(hostApi2, surfaceId, title = "\u7F16\u8F91\u5E03\u5C40") {
  const defaultLayout = surfaceId === MUSIC_TRACK_MENU_SURFACE.player ? toHostLayout(STABLE_DEFAULT_PLAYER_LAYOUT) : toHostLayout(STABLE_DEFAULT_QUEUE_LAYOUT);
  hostApi2.ui.customizeEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: MUSIC_TRACK_ENTITY_MENU_ID,
    surfaceId,
    title,
    items: buildMusicTrackEntityMenuItems(surfaceId),
    defaultLayout
  });
}
function useMusicTrackEntityMenuLayout(surfaceId) {
  const subscribe = (0, import_react2.useCallback)(
    (onStoreChange) => {
      try {
        return getMusicHostApi().ui.subscribeEntityMenuLayout(
          {
            appId: MUSIC_APP_ID,
            menuId: MUSIC_TRACK_ENTITY_MENU_ID,
            surfaceId
          },
          onStoreChange
        );
      } catch {
        return () => {
        };
      }
    },
    [surfaceId]
  );
  const getSnapshot = (0, import_react2.useCallback)(() => {
    try {
      return readMusicTrackEntityMenuLayout(getMusicHostApi(), surfaceId);
    } catch {
      return surfaceId === MUSIC_TRACK_MENU_SURFACE.player ? STABLE_DEFAULT_PLAYER_LAYOUT : STABLE_DEFAULT_QUEUE_LAYOUT;
    }
  }, [surfaceId]);
  const layout = (0, import_react2.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  const openEditLayout = (0, import_react2.useCallback)(() => {
    try {
      openMusicTrackEntityMenuLayoutEditor(getMusicHostApi(), surfaceId);
    } catch {
    }
  }, [surfaceId]);
  return { layout, openEditLayout };
}

// src/queue-drawer.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var DESKTOP_RAIL_WIDTH = 340;
var FALLBACK_ROW_HEIGHT2 = 56;
function isWebPointerEnv() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
function shiftForSortableIndex(input) {
  const { index, fromIndex, toIndex, rowHeight } = input;
  if (fromIndex === toIndex) {
    return 0;
  }
  if (fromIndex < toIndex) {
    if (index > fromIndex && index <= toIndex) {
      return -rowHeight;
    }
    return 0;
  }
  if (index >= toIndex && index < fromIndex) {
    return rowHeight;
  }
  return 0;
}
function MusicQueueDrawer(props) {
  const { theme } = (0, import_react_native_unistyles2.useUnistyles)();
  const muted = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;
  const [mounted, setMounted] = (0, import_react3.useState)(props.open);
  const [draggingIndex, setDraggingIndex] = (0, import_react3.useState)(null);
  const [dropIndex, setDropIndex] = (0, import_react3.useState)(null);
  const [dragDeltaY, setDragDeltaY] = (0, import_react3.useState)(0);
  const [hoveredRowId, setHoveredRowId] = (0, import_react3.useState)(null);
  const slideX = (0, import_react3.useRef)(new import_react_native2.Animated.Value(DESKTOP_RAIL_WIDTH)).current;
  const backdropOpacity = (0, import_react3.useRef)(new import_react_native2.Animated.Value(0)).current;
  const dragFromRef = (0, import_react3.useRef)(null);
  const pointerStartYRef = (0, import_react3.useRef)(0);
  const rowRefs = (0, import_react3.useRef)([]);
  const rowTopsRef = (0, import_react3.useRef)([]);
  const rowHeightRef = (0, import_react3.useRef)(FALLBACK_ROW_HEIGHT2);
  const pointerListenersRef = (0, import_react3.useRef)(null);
  const scrollRef = (0, import_react3.useRef)(null);
  const viewportHeightRef = (0, import_react3.useRef)(0);
  const contentHeightRef = (0, import_react3.useRef)(0);
  const rowLayoutsRef = (0, import_react3.useRef)({});
  const pendingScrollActiveRef = (0, import_react3.useRef)(false);
  const hostUi = getMusicHostApi().ui;
  const ActionBar = hostUi.ActionBar;
  const { layout: trackMenuLayout, openEditLayout } = useMusicTrackEntityMenuLayout(
    MUSIC_TRACK_MENU_SURFACE.queue
  );
  const resetDragState = () => {
    dragFromRef.current = null;
    setDraggingIndex(null);
    setDropIndex(null);
    setDragDeltaY(0);
  };
  const detachPointerListeners = () => {
    const listeners2 = pointerListenersRef.current;
    if (listeners2 && isWebPointerEnv()) {
      document.removeEventListener("pointermove", listeners2.move, true);
      document.removeEventListener("pointerup", listeners2.up, true);
      document.removeEventListener("pointercancel", listeners2.up, true);
    }
    pointerListenersRef.current = null;
  };
  const scrollActiveIntoView = (0, import_react3.useCallback)(() => {
    const activeId = props.activeId;
    if (!activeId || !props.open) {
      return;
    }
    const layout = rowLayoutsRef.current[activeId];
    if (!layout) {
      pendingScrollActiveRef.current = true;
      return;
    }
    const y = resolveQueueScrollOffset({
      rowY: layout.y,
      rowHeight: layout.height,
      viewportHeight: viewportHeightRef.current,
      contentHeight: contentHeightRef.current
    });
    scrollRef.current?.scrollTo({ y, animated: false });
    pendingScrollActiveRef.current = false;
  }, [props.activeId, props.open]);
  (0, import_react3.useEffect)(() => {
    if (props.open) {
      setMounted(true);
      pendingScrollActiveRef.current = true;
      import_react_native2.Animated.parallel([
        import_react_native2.Animated.timing(slideX, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true
        }),
        import_react_native2.Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(({ finished }) => {
        if (finished) {
          requestAnimationFrame(() => scrollActiveIntoView());
        }
      });
      return;
    }
    if (!mounted) {
      return;
    }
    import_react_native2.Animated.parallel([
      import_react_native2.Animated.timing(slideX, {
        toValue: DESKTOP_RAIL_WIDTH,
        duration: 200,
        useNativeDriver: true
      }),
      import_react_native2.Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        resetDragState();
        setHoveredRowId(null);
        pendingScrollActiveRef.current = false;
      }
    });
  }, [mounted, props.open]);
  (0, import_react3.useEffect)(() => {
    if (!props.open || !mounted) {
      return;
    }
    pendingScrollActiveRef.current = true;
    requestAnimationFrame(() => scrollActiveIntoView());
  }, [mounted, props.activeId, props.open, props.tracks, scrollActiveIntoView]);
  (0, import_react3.useEffect)(() => {
    return () => {
      detachPointerListeners();
    };
  }, []);
  const measureRows = (done) => {
    const total = props.tracks.length;
    let pending = total;
    if (total === 0) {
      done?.();
      return;
    }
    for (let i = 0; i < total; i += 1) {
      const node = rowRefs.current[i];
      if (!node || typeof node.measureInWindow !== "function") {
        pending -= 1;
        if (pending === 0) {
          done?.();
        }
        continue;
      }
      node.measureInWindow((_x, y, _w, height) => {
        rowTopsRef.current[i] = y;
        if (height > 0) {
          rowHeightRef.current = height;
        }
        pending -= 1;
        if (pending === 0) {
          done?.();
        }
      });
    }
  };
  const indexFromPageY = (pageY) => {
    const fromIndex2 = dragFromRef.current ?? 0;
    const tops = rowTopsRef.current;
    const height = rowHeightRef.current || FALLBACK_ROW_HEIGHT2;
    const count = props.tracks.length;
    if (count === 0) {
      return 0;
    }
    let best = fromIndex2;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i += 1) {
      const top = tops[i];
      if (top == null) {
        continue;
      }
      const center = top + height / 2;
      const dist = Math.abs(pageY - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  };
  const finishDrop = (toIndex2) => {
    const fromIndex2 = dragFromRef.current;
    detachPointerListeners();
    resetDragState();
    if (fromIndex2 == null || fromIndex2 === toIndex2) {
      return;
    }
    props.onMove(fromIndex2, toIndex2);
  };
  const applyDragToPageY = (pageY) => {
    const fromIndex2 = dragFromRef.current;
    if (fromIndex2 == null) {
      return;
    }
    setDragDeltaY(pageY - pointerStartYRef.current);
    setDropIndex(indexFromPageY(pageY));
  };
  const handleDragGrant = (index, pageY) => {
    dragFromRef.current = index;
    pointerStartYRef.current = pageY;
    setDraggingIndex(index);
    setDropIndex(index);
    setDragDeltaY(0);
    setHoveredRowId(null);
    requestAnimationFrame(() => measureRows());
  };
  const handleDragCancel = () => {
    detachPointerListeners();
    resetDragState();
  };
  const startWebPointerDrag = (sourceIndex, pointerId, target, pageY) => {
    if (!isWebPointerEnv()) {
      return;
    }
    detachPointerListeners();
    handleDragGrant(sourceIndex, pageY);
    const el = target;
    if (el && typeof el.setPointerCapture === "function") {
      try {
        el.setPointerCapture(pointerId);
      } catch {
      }
    }
    const onMove = (event) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      applyDragToPageY(event.clientY);
    };
    const onUp = (event) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      finishDrop(indexFromPageY(event.clientY));
    };
    pointerListenersRef.current = { move: onMove, up: onUp };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onUp, true);
  };
  const beginPointerDragFromEvent = (index, event) => {
    if ((event.button ?? event.nativeEvent?.button ?? 0) !== 0) {
      return;
    }
    event.preventDefault?.();
    event.stopPropagation?.();
    const pageY = event.clientY ?? event.nativeEvent?.clientY ?? event.nativeEvent?.pageY ?? 0;
    const pointerId = event.pointerId ?? event.nativeEvent?.pointerId;
    if (pointerId == null) {
      handleDragGrant(index, pageY);
      return;
    }
    startWebPointerDrag(index, pointerId, event.target ?? event.nativeEvent?.target ?? null, pageY);
  };
  const handleRowLayout = (trackId, event) => {
    const { y, height } = event.nativeEvent.layout;
    rowLayoutsRef.current[trackId] = { y, height: height > 0 ? height : FALLBACK_ROW_HEIGHT2 };
    if (height > 0) {
      rowHeightRef.current = height;
    }
    if (pendingScrollActiveRef.current && trackId === props.activeId) {
      requestAnimationFrame(() => scrollActiveIntoView());
    }
  };
  const handleListLayout = (event) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
    if (pendingScrollActiveRef.current) {
      requestAnimationFrame(() => scrollActiveIntoView());
    }
  };
  const handleContentSizeChange = (_width, height) => {
    contentHeightRef.current = height;
    if (pendingScrollActiveRef.current) {
      requestAnimationFrame(() => scrollActiveIntoView());
    }
  };
  const handleTrackMenuSelect = (menuId, trackId) => {
    if (draggingIndex != null) {
      return;
    }
    const actionId = resolveMusicTrackMenuActionId(menuId);
    if (!actionId) {
      return;
    }
    if (actionId === "addPlaylist") {
      props.onRemove(trackId);
      return;
    }
    if (!props.onTrackMenuAction) {
      return;
    }
    props.onTrackMenuAction(actionId, trackId);
  };
  const ModeIcon = props.ModeIcon;
  const fromIndex = draggingIndex;
  const toIndex = dropIndex ?? draggingIndex ?? 0;
  const rowHeight = rowHeightRef.current || FALLBACK_ROW_HEIGHT2;
  const actionsEnabled = Boolean(props.onTrackMenuAction) || Boolean(props.onRemove);
  const list = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react_native2.View, { style: styles2.panel, testID: "workspace-mini-app-music-queue", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react_native2.View, { style: styles2.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react_native2.View, { style: styles2.headerTitleRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react_native3.ListMusic, { size: 16, color: theme.colors.foreground }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react_native2.Text, { style: styles2.title, children: "\u64AD\u653E\u5217\u8868" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react_native2.Text, { style: styles2.modeHint, children: props.playModeLabel })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_react_native2.Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: props.playModeLabel,
          onPress: props.onCyclePlayMode,
          style: styles2.headerActionHit,
          testID: "music-queue-play-mode",
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ModeIcon, { size: 20, color: accent })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_react_native2.ScrollView,
      {
        ref: scrollRef,
        style: styles2.list,
        contentContainerStyle: styles2.listContent,
        scrollEnabled: draggingIndex == null,
        onLayout: handleListLayout,
        onContentSizeChange: handleContentSizeChange,
        ...{
          onWheel: draggingIndex != null ? (event) => event.preventDefault?.() : void 0
        },
        children: props.tracks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react_native2.Text, { style: styles2.empty, children: "\u961F\u5217\u4E3A\u7A7A\u3002\u53EF\u4ECE\u4FA7\u680F\u66F2\u76EE\u83DC\u5355\u52A0\u5165\u64AD\u653E\u5217\u8868\u3002" }) : props.tracks.map((item, index) => {
          const active = item.id === props.activeId;
          const isDragging = fromIndex === index;
          let shiftY = 0;
          if (fromIndex != null) {
            if (isDragging) {
              shiftY = dragDeltaY;
            } else {
              shiftY = shiftForSortableIndex({
                index,
                fromIndex,
                toIndex,
                rowHeight
              });
            }
          }
          const moreLabel = `\u66F4\u591A\u64CD\u4F5C ${item.title}`;
          const rowMain = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            import_react_native2.Pressable,
            {
              accessibilityRole: "button",
              accessibilityLabel: active ? `\u6B63\u5728\u64AD\u653E ${item.title}` : `\u64AD\u653E ${item.title}`,
              onPress: () => props.onSelect(item.id),
              style: styles2.rowMain,
              disabled: draggingIndex != null,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  import_react_native2.Text,
                  {
                    style: [styles2.rowTitle, active ? styles2.rowTitleActive : null],
                    numberOfLines: 1,
                    children: item.title
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react_native2.Text, { style: styles2.rowArtist, numberOfLines: 1, children: item.artist || "\u672A\u77E5\u827A\u4EBA" })
              ]
            }
          );
          const rowActions = MUSIC_PLAYER_ACTION_IDS.map(
            (actionId) => {
              const presentation = resolveMusicTrackMenuPresentation(actionId, {
                pinned: Boolean(item.pinned),
                surface: "queue"
              });
              return {
                id: actionId,
                label: presentation.label,
                tipLabel: presentation.label,
                icon: presentation.icon,
                destructive: presentation.destructive,
                disabled: draggingIndex != null,
                shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[actionId],
                onPress: () => handleTrackMenuSelect(actionId, item.id)
              };
            }
          );
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            import_react_native2.View,
            {
              ref: (node) => {
                rowRefs.current[index] = node;
              },
              onLayout: (event) => handleRowLayout(item.id, event),
              style: [
                styles2.row,
                active ? styles2.rowActive : null,
                !active && hoveredRowId === item.id ? styles2.rowHovered : null,
                isDragging ? styles2.rowDragging : null,
                {
                  transform: [{ translateY: shiftY }],
                  zIndex: isDragging ? 20 : 1,
                  // 让位行平滑过渡；跟手行无 transition 以免拖滞
                  transitionProperty: isDragging ? "none" : "transform",
                  transitionDuration: isDragging ? "0ms" : "180ms"
                }
              ],
              testID: `music-queue-row-${item.id}`,
              ...isWebPointerEnv() ? {
                // mouseleave 进入子节点不触发，悬停标题也保持整行高亮
                onMouseEnter: () => {
                  if (draggingIndex == null) {
                    setHoveredRowId(item.id);
                  }
                },
                onMouseLeave: () => {
                  setHoveredRowId((current) => current === item.id ? null : current);
                }
              } : {},
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  import_react_native2.View,
                  {
                    accessibilityLabel: "\u62D6\u62FD\u6392\u5E8F",
                    accessibilityRole: "adjustable",
                    style: [
                      styles2.dragHandle,
                      {
                        cursor: isDragging ? "grabbing" : "grab",
                        touchAction: "none",
                        userSelect: "none"
                      }
                    ],
                    testID: `music-queue-drag-${item.id}`,
                    ...{
                      onPointerDown: (event) => beginPointerDragFromEvent(index, event),
                      onStartShouldSetResponder: () => !isWebPointerEnv(),
                      onMoveShouldSetResponder: () => !isWebPointerEnv() && dragFromRef.current != null,
                      onResponderTerminationRequest: () => false,
                      onResponderGrant: (event) => {
                        if (!isWebPointerEnv()) {
                          handleDragGrant(index, event.nativeEvent.pageY);
                        }
                      },
                      onResponderMove: (event) => {
                        if (!isWebPointerEnv()) {
                          applyDragToPageY(event.nativeEvent.pageY);
                        }
                      },
                      onResponderRelease: (event) => {
                        if (!isWebPointerEnv()) {
                          finishDrop(indexFromPageY(event.nativeEvent.pageY));
                        }
                      },
                      onResponderTerminate: () => {
                        if (!isWebPointerEnv()) {
                          handleDragCancel();
                        }
                      }
                    },
                    children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react_native3.GripVertical, { size: 16, color: muted })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  import_react_native2.View,
                  {
                    style: styles2.rowBody,
                    pointerEvents: draggingIndex != null ? "none" : "auto",
                    children: actionsEnabled ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      ActionBar,
                      {
                        layout: trackMenuLayout,
                        actions: rowActions,
                        surface: rowMain,
                        surfaceLayout: "row",
                        distribute: "end",
                        iconSize: 16,
                        mutedColor: active ? accent : muted,
                        accentColor: accent,
                        testID: `music-queue-row-actions-${item.id}`,
                        overflowMenu: {
                          side: "bottom",
                          align: "end",
                          moreLabel,
                          triggerSize: 16,
                          triggerColor: active ? accent : muted,
                          showEditLayout: true,
                          editLayoutLabel: "\u7F16\u8F91\u5E03\u5C40",
                          onEditLayout: openEditLayout,
                          testID: `music-queue-more-${item.id}`
                        }
                      }
                    ) : rowMain
                  }
                )
              ]
            },
            item.id
          );
        })
      }
    )
  ] });
  if (!mounted && !props.open) {
    return null;
  }
  if (props.compact) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_react_native2.Modal,
      {
        visible: props.open,
        transparent: true,
        animationType: "slide",
        onRequestClose: props.onClose,
        testID: "music-queue-modal",
        onShow: () => {
          pendingScrollActiveRef.current = true;
          requestAnimationFrame(() => scrollActiveIntoView());
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react_native2.View, { style: styles2.mobileRoot, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            import_react_native2.Pressable,
            {
              accessibilityRole: "button",
              accessibilityLabel: "\u5173\u95ED\u64AD\u653E\u5217\u8868\u906E\u7F69",
              style: styles2.backdrop,
              onPress: props.onClose,
              disabled: draggingIndex != null
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_react_native2.View, { style: styles2.mobileSheet, children: list })
        ] })
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_react_native2.View, { style: styles2.desktopRoot, pointerEvents: "box-none", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_react_native2.Animated.View,
      {
        style: [styles2.backdrop, { opacity: backdropOpacity }],
        pointerEvents: draggingIndex != null ? "none" : "auto",
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_react_native2.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: "\u5173\u95ED\u64AD\u653E\u5217\u8868\u906E\u7F69",
            style: import_react_native2.StyleSheet.absoluteFill,
            onPress: props.onClose
          }
        )
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      import_react_native2.Animated.View,
      {
        style: [styles2.desktopRail, { transform: [{ translateX: slideX }] }],
        testID: "music-queue-desktop-rail",
        children: list
      }
    )
  ] });
}
var styles2 = import_react_native_unistyles2.StyleSheet.create((theme) => ({
  desktopRoot: {
    ...import_react_native2.StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "flex-end",
    // 高于 player topTrailingChrome(30)，打开时自然挡住「恢复滚动」
    zIndex: 40
  },
  backdrop: {
    ...import_react_native2.StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)"
  },
  desktopRail: {
    width: DESKTOP_RAIL_WIDTH,
    maxWidth: "100%",
    height: "100%",
    backgroundColor: theme.colors.surface1,
    borderLeftWidth: import_react_native2.StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
    zIndex: 41
  },
  mobileRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  mobileSheet: {
    maxHeight: "72%",
    minHeight: "48%",
    backgroundColor: theme.colors.surface1,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: "hidden",
    zIndex: 21
  },
  panel: {
    flex: 1,
    minHeight: 0,
    padding: theme.spacing[3],
    gap: theme.spacing[2]
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2]
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flex: 1,
    minWidth: 0
  },
  title: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground
  },
  modeHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted
  },
  headerActionHit: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    flex: 1,
    minHeight: 0
  },
  listContent: {
    paddingBottom: theme.spacing[4]
  },
  empty: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    paddingVertical: theme.spacing[4]
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    marginBottom: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    borderWidth: import_react_native2.StyleSheet.hairlineWidth,
    borderColor: "transparent",
    backgroundColor: theme.colors.surface1
  },
  rowActive: {
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.accent,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent
  },
  rowHovered: {
    backgroundColor: theme.colors.surface2
  },
  rowDragging: {
    opacity: 0.92,
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.accent,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10
  },
  dragHandle: {
    width: 28,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1]
  },
  rowMenuSurface: {
    flex: 1,
    minWidth: 0
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 2
  },
  rowTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground
  },
  rowTitleActive: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.semibold
  },
  rowArtist: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted
  },
  rowActionHit: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  }
}));

// src/search-view.tsx
var import_react5 = require("react");
var import_react_native4 = require("react-native");
var import_lucide_react_native5 = require("lucide-react-native");
var import_react_native_unistyles4 = require("react-native-unistyles");
init_cover_url_quality();
init_platform_registry();

// src/resource/local-provider.ts
init_store();

// src/resource/collection-list-helpers.ts
function resolveCollectionListTitle(query) {
  const explicit = query.title?.trim() ?? "";
  if (explicit) {
    return explicit;
  }
  const remoteId = query.ref.remoteId?.trim() ?? "";
  if (remoteId.startsWith("artist:")) {
    return remoteId.slice("artist:".length).trim();
  }
  if (remoteId.startsWith("album:")) {
    return remoteId.slice("album:".length).trim();
  }
  return remoteId;
}
function filterTracksForListCollection(tracks, kind, title) {
  const needle = title.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  if (kind === "artist") {
    return tracks.filter((track) => track.artist.trim().toLowerCase() === needle);
  }
  if (kind === "album") {
    return tracks.filter((track) => (track.album ?? "").trim().toLowerCase() === needle);
  }
  return [];
}
function matchTracksForListCollection(tracks, kind, title) {
  const exact = filterTracksForListCollection(tracks, kind, title);
  if (exact.length > 0 || kind !== "artist") {
    return exact;
  }
  const needle = title.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return tracks.filter((track) => {
    const artist = track.artist.trim().toLowerCase();
    if (artist === needle || artist.includes(needle)) {
      return true;
    }
    const trackTitle = track.title.trim().toLowerCase();
    return trackTitle.startsWith(`${needle} -`) || trackTitle.startsWith(`${needle}-`);
  });
}
async function listCollectionByNameSearch(provider, query, options) {
  const kinds = options?.kinds ?? ["artist", "album"];
  if (!kinds.includes(query.kind)) {
    return null;
  }
  const title = resolveCollectionListTitle(query);
  if (!title) {
    return null;
  }
  const maxPages = Math.max(1, Math.min(options?.maxPages ?? 2, 5));
  const pageLimit = Math.max(8, Math.min(options?.pageLimit ?? 40, 80));
  const startPage = Math.max(1, Math.floor(query.page ?? 1));
  const collected = [];
  const seen = /* @__PURE__ */ new Set();
  let hasMore = false;
  for (let offset = 0; offset < maxPages; offset += 1) {
    const pageNum = startPage + offset;
    let providerIds;
    if (provider.id === "txqq") {
      const sourceId = query.ref.providerId?.trim() ?? "";
      if (sourceId && sourceId !== "txqq" && sourceId !== "local" && !sourceId.startsWith("artist:") && !sourceId.startsWith("album:")) {
        providerIds = [sourceId];
      }
    } else {
      providerIds = [provider.id];
    }
    const searchPage = await provider.search({
      text: title,
      scope: "track",
      limit: pageLimit,
      page: pageNum,
      providerIds
    });
    for (const track of searchPage.tracks) {
      const key = `${track.ref.providerId}:${track.ref.remoteId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      collected.push(track);
    }
    hasMore = Boolean(searchPage.hasMore);
    if (!searchPage.hasMore || searchPage.tracks.length === 0) {
      break;
    }
  }
  let tracks = matchTracksForListCollection(collected, query.kind, title);
  if (tracks.length === 0 && query.kind === "artist" && collected.length > 0) {
    tracks = collected;
  }
  if (tracks.length === 0) {
    return null;
  }
  return {
    kind: query.kind,
    ref: {
      providerId: query.ref.providerId || provider.id,
      remoteId: query.ref.remoteId || `${query.kind}:${title}`
    },
    title,
    tracks,
    page: startPage,
    hasMore
  };
}

// src/resource/local-provider.ts
function emptyPage(query) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: []
  };
}
var localMusicProvider = {
  id: "local",
  label: "\u672C\u5730",
  async search(query) {
    const text = query.text.trim();
    if (!text) {
      return emptyPage(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage(query);
    }
    const items = listTracksAsWorkspaceItems(text);
    const state = useMusicDemoStore.getState();
    const tracks = items.map((item) => {
      const track = state.getTrack(item.id);
      return {
        kind: "track",
        ref: { providerId: "local", remoteId: item.id },
        title: item.title,
        artist: track?.artist || item.subtitle || "",
        album: track?.album,
        coverUrl: track?.coverUri ?? void 0,
        localTrackId: item.id
      };
    });
    return {
      query,
      suggestions: [],
      tracks,
      artists: [],
      albums: [],
      playlists: [],
      providerErrors: []
    };
  },
  /** 本地曲库：按艺人/专辑名筛本地条目。 */
  async listCollection(query) {
    return listCollectionByNameSearch(this, query, { maxPages: 1, pageLimit: 200 });
  }
};

// src/resource/service.ts
init_platform_registry();

// src/resource/sidecar-fetch.ts
var fetchJsonImpl = null;
function setMusicSidecarFetchJson(impl) {
  fetchJsonImpl = impl;
}
async function fetchMusicSidecarJson(url, init) {
  if (fetchJsonImpl) {
    return fetchJsonImpl(url, init);
  }
  const method = init?.method ?? "GET";
  const response = await fetch(url, {
    method,
    headers: init?.headers,
    body: method === "GET" ? void 0 : init?.body
  });
  let body = null;
  if (typeof response.text === "function") {
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
  } else if (typeof response.json === "function") {
    body = await response.json();
  }
  if (!response.ok) {
    if (body && typeof body === "object" && "code" in body) {
      return body;
    }
    throw new Error(`Sidecar request failed: ${response.status}`);
  }
  return body;
}

// src/resource/aiguo-provider.ts
var PROVIDER_ID = "aiguo";
var USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var AIGUO_MIRRORS = [
  {
    id: "6uq",
    origin: "https://www.6uq.cn",
    playPath: "/js/play.php",
    playType: "music",
    needsCaptcha: true
  },
  {
    id: "78497",
    origin: "https://www.78497.com",
    playPath: "/style/js/play.php",
    playType: "mp3",
    needsCaptcha: false
  }
];
var mirrorCursor = 0;
var sessionReadyUntilByOrigin = /* @__PURE__ */ new Map();
function emptyPage2(query) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: []
  };
}
function asRawHtml(payload) {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload && typeof payload === "object" && "raw" in payload) {
    const raw = payload.raw;
    return typeof raw === "string" ? raw : "";
  }
  return "";
}
function isCaptchaHtml(html) {
  return html.includes("\u5B89\u5168\u4EBA\u673A\u9A8C\u8BC1") || html.includes('name="csrf_token"');
}
function extractCsrf(html) {
  const match = html.match(/name="csrf_token"\s+value="([^"]+)"/i);
  return match?.[1]?.trim() ?? "";
}
async function fetchAiguo(origin, pathOrUrl, init) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${origin}${pathOrUrl}`;
  return fetchMusicSidecarJson(url, {
    method: init?.method ?? "GET",
    body: init?.body,
    headers: {
      Accept: "text/html,application/json,*/*",
      "User-Agent": USER_AGENT,
      Referer: `${origin}/`,
      Origin: origin,
      ...init?.method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } : {}
    },
    timeoutMs: 2e4
  });
}
async function ensureMirrorSession(mirror, force = false) {
  if (!mirror.needsCaptcha) {
    return;
  }
  const now = Date.now();
  const until = sessionReadyUntilByOrigin.get(mirror.origin) ?? 0;
  if (!force && now < until) {
    return;
  }
  const probeUrl = `${mirror.origin}/`;
  const probe = asRawHtml(await fetchAiguo(mirror.origin, probeUrl));
  if (!isCaptchaHtml(probe)) {
    sessionReadyUntilByOrigin.set(mirror.origin, now + 50 * 60 * 1e3);
    return;
  }
  const csrf = extractCsrf(probe);
  if (!csrf) {
    throw new Error("\u4EBA\u673A\u9A8C\u8BC1\u9875\u7F3A\u5C11 csrf");
  }
  const after = asRawHtml(
    await fetchAiguo(mirror.origin, probeUrl, {
      method: "POST",
      body: new URLSearchParams({
        csrf_token: csrf,
        human_check: "on"
      }).toString()
    })
  );
  if (isCaptchaHtml(after)) {
    throw new Error("\u4EBA\u673A\u9A8C\u8BC1\u672A\u901A\u8FC7");
  }
  sessionReadyUntilByOrigin.set(mirror.origin, now + 50 * 60 * 1e3);
}
function parseTitleArtist(label) {
  const cleaned = label.replace(/&nbsp;/gi, " ").replace(/\s*\[MP3[^\]]*\]\s*/gi, "").replace(/【[\s\S]*?】/g, "").replace(/\s+/g, " ").trim();
  const book = cleaned.match(/^(.+?)《(.+?)》$/);
  if (book) {
    return { artist: book[1].trim() || "\u672A\u77E5", title: book[2].trim() || cleaned };
  }
  const dash = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dash) {
    return { artist: dash[1].trim() || "\u672A\u77E5", title: dash[2].trim() || cleaned };
  }
  return { artist: "\u672A\u77E5", title: cleaned || "\u672A\u77E5\u66F2\u76EE" };
}
function parseSearchHits(html, mirror) {
  const tracks = [];
  const seen = /* @__PURE__ */ new Set();
  const playRe = /href="(?:https?:\/\/[^"]+)?\/play\/([A-Za-z0-9]+)\.html"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = playRe.exec(html)) != null) {
    const remoteId = match[1].trim();
    if (!remoteId || seen.has(remoteId)) {
      continue;
    }
    const label = match[2].replace(/<[^>]+>/g, "").trim();
    if (!label || label.length < 2) {
      continue;
    }
    seen.add(remoteId);
    const { title, artist } = parseTitleArtist(label);
    tracks.push({
      kind: "track",
      ref: {
        providerId: PROVIDER_ID,
        remoteId: `${mirror.id}:${remoteId}`,
        pageUrl: `${mirror.origin}/play/${remoteId}.html`
      },
      title,
      artist
    });
    if (tracks.length >= 18) {
      return tracks;
    }
  }
  const mp3Re = /href="(?:https?:\/\/[^"]+)?\/mp3\/([a-f0-9]+)\.html"[^>]*class="url"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = mp3Re.exec(html)) != null) {
    const remoteId = match[1].trim();
    if (!remoteId || seen.has(remoteId)) {
      continue;
    }
    const label = match[2].replace(/<[^>]+>/g, "").trim();
    if (!label || label.length < 2) {
      continue;
    }
    seen.add(remoteId);
    const { title, artist } = parseTitleArtist(label);
    tracks.push({
      kind: "track",
      ref: {
        providerId: PROVIDER_ID,
        remoteId: `${mirror.id}:${remoteId}`,
        pageUrl: `${mirror.origin}/mp3/${remoteId}.html`
      },
      title,
      artist
    });
    if (tracks.length >= 18) {
      break;
    }
  }
  return tracks;
}
function splitRemoteId(remoteId) {
  const idx = remoteId.indexOf(":");
  if (idx <= 0) {
    return null;
  }
  return { mirrorId: remoteId.slice(0, idx), songId: remoteId.slice(idx + 1) };
}
function findMirror(mirrorIdOrOrigin) {
  return AIGUO_MIRRORS.find(
    (item) => item.id === mirrorIdOrOrigin || item.origin === mirrorIdOrOrigin
  ) ?? null;
}
function resolveMirrorForRef(ref) {
  const split = splitRemoteId(ref.remoteId);
  if (split) {
    const byId = findMirror(split.mirrorId);
    if (byId) {
      return byId;
    }
  }
  if (ref.pageUrl) {
    try {
      const origin = new URL(ref.pageUrl).origin;
      return findMirror(origin);
    } catch {
    }
  }
  return null;
}
function absolutizeMediaUrl(url, origin) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${origin}${trimmed}`;
  }
  return `${origin}/${trimmed}`;
}
async function fetchPlayPayload(mirror, songId) {
  await ensureMirrorSession(mirror);
  const payload = await fetchAiguo(mirror.origin, mirror.playPath, {
    method: "POST",
    body: new URLSearchParams({ id: songId, type: mirror.playType }).toString()
  });
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  if ("raw" in payload) {
    return null;
  }
  return payload;
}
function orderedMirrors() {
  const start = mirrorCursor % AIGUO_MIRRORS.length;
  mirrorCursor = (start + 1) % AIGUO_MIRRORS.length;
  const ordered = [];
  for (let offset = 0; offset < AIGUO_MIRRORS.length; offset += 1) {
    ordered.push(AIGUO_MIRRORS[(start + offset) % AIGUO_MIRRORS.length]);
  }
  return ordered;
}
async function searchOnMirror(mirror, text) {
  const searchUrl = `${mirror.origin}/so/${encodeURIComponent(text)}.html`;
  try {
    await ensureMirrorSession(mirror);
    let html = asRawHtml(await fetchAiguo(mirror.origin, searchUrl));
    if (isCaptchaHtml(html)) {
      await ensureMirrorSession(mirror, true);
      html = asRawHtml(await fetchAiguo(mirror.origin, searchUrl));
    }
    if (isCaptchaHtml(html) || !html) {
      return { tracks: [], searchUrl, error: "\u9700\u8981\u4EBA\u673A\u9A8C\u8BC1\uFF0C\u5DF2\u8DF3\u8FC7" };
    }
    const tracks = parseSearchHits(html, mirror);
    return { tracks, searchUrl };
  } catch (error) {
    return {
      tracks: [],
      searchUrl,
      error: error instanceof Error ? error.message : "\u8BF7\u6C42\u5931\u8D25\uFF0C\u5DF2\u8DF3\u8FC7"
    };
  }
}
var aiguoMusicProvider = {
  id: PROVIDER_ID,
  label: "\u7231\u542C",
  async search(query) {
    const text = query.text.trim();
    if (!text) {
      return emptyPage2(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage2(query);
    }
    let lastError;
    let lastSearchUrl;
    for (const mirror of orderedMirrors()) {
      const result = await searchOnMirror(mirror, text);
      lastSearchUrl = result.searchUrl;
      if (result.tracks.length > 0) {
        return {
          ...emptyPage2(query),
          tracks: result.tracks,
          debugSearchRequests: [
            {
              providerId: PROVIDER_ID,
              url: result.searchUrl,
              compareUrl: result.searchUrl
            }
          ]
        };
      }
      if (result.error) {
        lastError = result.error;
      }
    }
    return {
      ...emptyPage2(query),
      providerErrors: lastError ? [{ providerId: PROVIDER_ID, message: lastError }] : [],
      debugSearchRequests: lastSearchUrl ? [
        {
          providerId: PROVIDER_ID,
          url: lastSearchUrl,
          compareUrl: lastSearchUrl
        }
      ] : void 0
    };
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== PROVIDER_ID || !ref.remoteId) {
      return null;
    }
    const split = splitRemoteId(ref.remoteId);
    const songId = split?.songId ?? ref.remoteId;
    const preferred = resolveMirrorForRef(ref);
    const mirrors = preferred ? [preferred, ...AIGUO_MIRRORS.filter((item) => item.id !== preferred.id)] : [...AIGUO_MIRRORS];
    for (const mirror of mirrors) {
      try {
        const payload = await fetchPlayPayload(mirror, songId);
        const url = absolutizeMediaUrl(payload?.url ?? "", mirror.origin);
        if (!url || payload?.msg !== 1) {
          continue;
        }
        return {
          url,
          providerId: PROVIDER_ID,
          remoteId: ref.remoteId
        };
      } catch {
      }
    }
    return null;
  },
  async fetchLyrics(ref) {
    if (ref.providerId !== PROVIDER_ID || !ref.remoteId) {
      return null;
    }
    const split = splitRemoteId(ref.remoteId);
    const songId = split?.songId ?? ref.remoteId;
    const preferred = resolveMirrorForRef(ref);
    const mirrors = preferred ? [preferred] : [...AIGUO_MIRRORS];
    for (const mirror of mirrors) {
      try {
        await ensureMirrorSession(mirror);
        const play = await fetchPlayPayload(mirror, songId);
        const fromPlay = typeof play?.lrc === "string" ? play.lrc.trim() : "";
        if (fromPlay && !fromPlay.includes("\u7248\u6743\u65B9\u8981\u6C42")) {
          return {
            providerId: PROVIDER_ID,
            remoteId: ref.remoteId,
            text: fromPlay
          };
        }
        if (mirror.id === "6uq") {
          const payload = await fetchAiguo(
            mirror.origin,
            `/plug/lrcgc.php?id=${encodeURIComponent(songId)}`
          );
          const text = typeof payload?.lrc === "string" ? payload.lrc.trim() : "";
          if (text) {
            return {
              providerId: PROVIDER_ID,
              remoteId: ref.remoteId,
              text
            };
          }
        }
      } catch {
      }
    }
    return null;
  },
  /**
   * 爱听无合集 API：按艺人/专辑名 HTML 搜索后过滤。
   */
  async listCollection(query) {
    return listCollectionByNameSearch(this, query, { maxPages: 1, pageLimit: 40 });
  }
};

// src/resource/audiocom-provider.ts
init_provider_catalog();
var AUDIOCOM_PROVIDER_ID = "audiocom";
var AUDIOCOM_API_ORIGIN = "https://api.audio.com";
var AUDIOCOM_SITE_ORIGIN = "https://audio.com";
var USER_AGENT2 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var DEFAULT_LIMIT = 20;
function emptyPage3(query, error, debug) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: error ? [{ providerId: AUDIOCOM_PROVIDER_ID, message: error }] : [],
    debugSearchRequests: debug,
    page: Math.max(1, Math.floor(query.page ?? 1)),
    hasMore: false
  };
}
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}
function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return void 0;
}
function normalizeAudiocomQueryText(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (/audio\.com$/i.test(url.hostname.replace(/^www\./, ""))) {
        const parts = url.pathname.split("/").filter(Boolean);
        const categoryIdx = parts.findIndex((part) => part === "category");
        if (categoryIdx >= 0 && parts[categoryIdx + 2]) {
          return decodeURIComponent(parts[categoryIdx + 2].replace(/[-_]+/g, " "));
        }
        const last = parts[parts.length - 1] || "";
        return decodeURIComponent(last.replace(/[-_]+/g, " "));
      }
    }
  } catch {
  }
  return trimmed.replace(/\?ysclid=.*$/i, "").trim();
}
function buildAudiocomSearchUrl(text, page = 1) {
  const query = normalizeAudiocomQueryText(text) || text.trim();
  const pageNum = Math.max(1, Math.floor(page));
  const params = new URLSearchParams({
    query,
    page: String(pageNum)
  });
  return `${AUDIOCOM_API_ORIGIN}/search?${params.toString()}`;
}
function buildAudiocomPageUrl(input) {
  const id = input.id.trim();
  if (!id) {
    return void 0;
  }
  const username = (input.username || "").trim();
  const slug = (input.slug || "").trim();
  if (username && slug) {
    return `${AUDIOCOM_SITE_ORIGIN}/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  }
  return `${AUDIOCOM_SITE_ORIGIN}/search?q=${encodeURIComponent(id)}`;
}
function pickPlayableFromModel(model) {
  const play = asRecord(model.play);
  const playUrl = asString(play?.url);
  if (playUrl && /^https?:\/\//i.test(playUrl)) {
    const durationMs = asNumber(play?.duration);
    return {
      url: playUrl,
      ext: /\.m4a(\?|$)/i.test(playUrl) ? "m4a" : "mp3",
      durationMs: durationMs && durationMs > 0 ? Math.floor(durationMs) : void 0
    };
  }
  const playhq = asRecord(model.playhq);
  const hqUrl = asString(playhq?.url);
  if (hqUrl && /^https?:\/\//i.test(hqUrl)) {
    const durationMs = asNumber(playhq?.duration);
    return {
      url: hqUrl,
      ext: /\.m4a(\?|$)/i.test(hqUrl) ? "m4a" : "mp3",
      durationMs: durationMs && durationMs > 0 ? Math.floor(durationMs) : void 0
    };
  }
  return null;
}
function pickPlayableFromDetail(detail) {
  const transcodings = detail.transcodings;
  if (Array.isArray(transcodings)) {
    const ranked = transcodings.map((item) => asRecord(item)).filter((item) => item != null).map((item) => {
      const url = asString(item.url);
      const format = asString(item.format).toLowerCase() || asString(item.codec).toLowerCase();
      const sizeBytes = asNumber(item.size);
      const durationMs = asNumber(item.duration);
      return { url, format, sizeBytes, durationMs };
    }).filter((item) => item.url && /^https?:\/\//i.test(item.url));
    const mp3 = ranked.find((item) => item.format === "mp3" || /\.mp3(\?|$)/i.test(item.url));
    const m4a = ranked.find((item) => item.format === "m4a" || /\.m4a(\?|$)/i.test(item.url));
    const picked = mp3 || m4a || ranked[0];
    if (picked) {
      let ext;
      if (mp3) {
        ext = "mp3";
      } else if (m4a) {
        ext = "m4a";
      }
      return {
        url: picked.url,
        ext,
        durationMs: picked.durationMs && picked.durationMs > 0 ? Math.floor(picked.durationMs) : void 0,
        sizeBytes: picked.sizeBytes && picked.sizeBytes > 0 ? Math.floor(picked.sizeBytes) : void 0
      };
    }
  }
  return pickPlayableFromModel(detail);
}
function mapOneAudiocomItem(raw) {
  const item = asRecord(raw);
  if (!item) {
    return null;
  }
  const model = asRecord(item.model) || item;
  const type = asString(item.type) || asString(model.type) || "audio";
  if (type && type !== "audio") {
    return null;
  }
  const remoteId = asString(model.id) || asString(item.id);
  if (!remoteId) {
    return null;
  }
  const playable = pickPlayableFromModel(model);
  if (!playable?.url) {
    return null;
  }
  const title = asString(model.title) || "Untitled";
  const artist = asString(model.author) || asString(model.author_name) || asString(model.username) || "Audio.com";
  const username = asString(model.username);
  const slug = asString(model.slug);
  const coverUrl = asString(model.image) || asString(model.avatar) || void 0;
  return {
    kind: "track",
    ref: {
      providerId: AUDIOCOM_PROVIDER_ID,
      remoteId,
      pageUrl: buildAudiocomPageUrl({ id: remoteId, username, slug })
    },
    title,
    artist,
    coverUrl,
    durationMs: playable.durationMs,
    playableUrl: playable.url
  };
}
function mapAudiocomSearchItems(payload, limit) {
  const root = asRecord(payload);
  let items = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (Array.isArray(root?.items)) {
    items = root.items;
  }
  const tracks = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of items) {
    if (tracks.length >= limit) {
      break;
    }
    const track = mapOneAudiocomItem(raw);
    if (!track || seen.has(track.ref.remoteId)) {
      continue;
    }
    seen.add(track.ref.remoteId);
    tracks.push(track);
  }
  return tracks;
}
async function fetchAudiocomJson(url) {
  return fetchMusicSidecarJson(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT2,
      Referer: getMusicProviderReferer(AUDIOCOM_PROVIDER_ID) || `${AUDIOCOM_SITE_ORIGIN}/`,
      Origin: AUDIOCOM_SITE_ORIGIN
    },
    timeoutMs: 2e4
  });
}
var audiocomMusicProvider = {
  id: AUDIOCOM_PROVIDER_ID,
  label: getMusicProviderCapabilities(AUDIOCOM_PROVIDER_ID)?.label || "Audio.com",
  async search(query) {
    const text = normalizeAudiocomQueryText(query.text);
    const pageNum = Math.max(1, Math.floor(query.page ?? 1));
    const plannedUrl = buildAudiocomSearchUrl(text || query.text.trim(), pageNum);
    const debug = {
      providerId: AUDIOCOM_PROVIDER_ID,
      url: plannedUrl,
      compareUrl: text ? `${AUDIOCOM_SITE_ORIGIN}/search?q=${encodeURIComponent(text)}` : `${AUDIOCOM_SITE_ORIGIN}/`,
      note: "api.audio.com JSON\uFF1B\u4EC5\u8FD4\u56DE\u5E26\u7B7E\u540D\u76F4\u94FE\u7684\u66F2\u76EE"
    };
    if (!text && !query.text.trim()) {
      return emptyPage3(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage3(query, void 0, [debug]);
    }
    try {
      const payload = await fetchAudiocomJson(plannedUrl);
      const limit = Math.max(1, Math.min(query.limit ?? DEFAULT_LIMIT, 40));
      const tracks = mapAudiocomSearchItems(payload, limit);
      if (tracks.length === 0) {
        return {
          ...emptyPage3(query, "Audio.com \u65E0\u5E26\u53EF\u64AD\u76F4\u94FE\u7684\u7ED3\u679C", [debug]),
          page: pageNum,
          hasMore: false
        };
      }
      const root = asRecord(payload);
      const pagination = asRecord(root?.pagination);
      const totalPages = asNumber(pagination?.pages);
      const hasMore = typeof totalPages === "number" ? pageNum < totalPages : tracks.length >= Math.min(limit, 10);
      return {
        query,
        suggestions: [],
        tracks,
        artists: [],
        albums: [],
        playlists: [],
        providerErrors: [],
        debugSearchRequests: [debug],
        page: pageNum,
        hasMore
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audio.com \u641C\u7D22\u5931\u8D25";
      return emptyPage3(query, message, [debug]);
    }
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== AUDIOCOM_PROVIDER_ID) {
      return null;
    }
    const remoteId = ref.remoteId?.trim();
    if (!remoteId || !/^\d+$/.test(remoteId)) {
      return null;
    }
    try {
      const detailUrl = `${AUDIOCOM_API_ORIGIN}/audio/${encodeURIComponent(remoteId)}`;
      const payload = await fetchAudiocomJson(detailUrl);
      const detail = asRecord(payload);
      if (!detail) {
        return null;
      }
      const detailId = asString(detail.id);
      if (detailId && detailId !== remoteId) {
        return null;
      }
      const playable = pickPlayableFromDetail(detail);
      if (!playable?.url) {
        return null;
      }
      return {
        url: playable.url,
        providerId: AUDIOCOM_PROVIDER_ID,
        remoteId,
        ext: playable.ext,
        sizeBytes: playable.sizeBytes
        // 不擅自改写用户可见 title/artist
      };
    } catch {
      return null;
    }
  },
  /**
   * Audio.com 无艺人合集端点：按名搜索 + 艺人字段过滤；playlist 无结构。
   */
  async listCollection(query) {
    return listCollectionByNameSearch(this, query, { maxPages: 2, pageLimit: 40 });
  }
};

// src/resource/muzvox-provider.ts
init_provider_catalog();
var MUZVOX_PROVIDER_ID = "muzvox";
var MUZVOX_ORIGIN = "https://muzvox.org";
var USER_AGENT3 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
var DEFAULT_LIMIT2 = 40;
function emptyPage4(query, error, debug) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: error ? [{ providerId: MUZVOX_PROVIDER_ID, message: error }] : [],
    debugSearchRequests: debug,
    page: Math.max(1, Math.floor(query.page ?? 1)),
    hasMore: false
  };
}
function asRawHtml2(payload) {
  if (typeof payload === "string") {
    return payload;
  }
  if (payload && typeof payload === "object" && "raw" in payload) {
    const raw = payload.raw;
    return typeof raw === "string" ? raw : "";
  }
  return "";
}
function decodeHtmlEntities(value) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, code) => {
    const n = Number(code);
    return Number.isFinite(n) ? String.fromCharCode(n) : "";
  }).replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const n = Number.parseInt(hex, 16);
    return Number.isFinite(n) ? String.fromCharCode(n) : "";
  });
}
function cleanText(value) {
  return decodeHtmlEntities(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function parseDurationMs(text) {
  const raw = (text ?? "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return void 0;
  }
  const hours = match[3] != null ? Number(match[1]) : 0;
  const minutes = match[3] != null ? Number(match[2]) : Number(match[1]);
  const seconds = match[3] != null ? Number(match[3]) : Number(match[2]);
  if (![hours, minutes, seconds].every((n) => Number.isFinite(n))) {
    return void 0;
  }
  const total = ((hours * 60 + minutes) * 60 + seconds) * 1e3;
  return total > 0 ? total : void 0;
}
function normalizeMuzvoxQueryText(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (/muzvox\.org$/i.test(url.hostname.replace(/^www\./, ""))) {
        const parts = url.pathname.split("/").filter(Boolean);
        const searchIdx = parts.findIndex((part) => part === "search");
        if (searchIdx >= 0 && parts[searchIdx + 1]) {
          return decodeURIComponent(parts[searchIdx + 1].replace(/\+/g, " ")).trim();
        }
      }
    }
  } catch {
  }
  return trimmed;
}
function buildMuzvoxSearchUrl(text) {
  const q = normalizeMuzvoxQueryText(text) || text.trim() || "music";
  return `${MUZVOX_ORIGIN}/search/${encodeURIComponent(q)}`;
}
function absolutizeMuzvoxUrl(pathOrUrl) {
  const raw = pathOrUrl?.trim();
  if (!raw) {
    return void 0;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }
  if (raw.startsWith("/")) {
    return `${MUZVOX_ORIGIN}${raw}`;
  }
  return `${MUZVOX_ORIGIN}/${raw}`;
}
function parseMuzvoxRemoteId(remoteId) {
  const raw = remoteId.trim().replace(/^muzvox:/i, "");
  if (!raw) {
    return null;
  }
  const full = raw.match(/^([^/\s]+)\/([^/\s]+)\/.+\.mp3$/i);
  if (full?.[1]) {
    return { token: full[1] };
  }
  if (/^[^/\s]+$/.test(raw) && raw.length >= 8) {
    return { token: raw };
  }
  return null;
}
function mapOneMuzvoxBlock(block, searchPageUrl) {
  const downloadMatch = block.match(
    /href=["'](\/\/storage\.muzvox\.org\/mp3-download\/([^/"']+)\/([^/"']+)\/[^"']+\.mp3)["']/i
  );
  if (!downloadMatch?.[1] || !downloadMatch[2]) {
    return null;
  }
  const token = downloadMatch[2].trim();
  if (!token) {
    return null;
  }
  const playableUrl = absolutizeMuzvoxUrl(downloadMatch[1]);
  if (!playableUrl) {
    return null;
  }
  const title = cleanText(block.match(/class="title __adv_name"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) || cleanText(block.match(/class="title"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) || "Untitled";
  const artist = cleanText(block.match(/class="artist __adv_artist"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) || cleanText(block.match(/class="artist"[^>]*>([\s\S]*?)<\/span>/i)?.[1]) || "MuzVox";
  const durationMs = parseDurationMs(
    cleanText(block.match(/class="name-time"[^>]*>([\s\S]*?)<\/div>/i)?.[1])
  );
  const coverUrl = absolutizeMuzvoxUrl(block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]);
  const usableCover = coverUrl && !/\/cover\/vinyl\d*\.(png|jpe?g|webp)(?:\?|#|$)/i.test(coverUrl) ? coverUrl : void 0;
  return {
    kind: "track",
    ref: {
      providerId: MUZVOX_PROVIDER_ID,
      remoteId: token,
      pageUrl: searchPageUrl
    },
    title,
    artist,
    coverUrl: usableCover,
    durationMs,
    playableUrl
  };
}
function mapMuzvoxSearchHtml(html, limit, searchPageUrl) {
  const tracks = [];
  const seen = /* @__PURE__ */ new Set();
  const blockRe = /<div class="data __adv_list_track">([\s\S]*?)(?=<div class="data __adv_list_track">|<div class="rewind"><\/div>|$)/gi;
  let match;
  while ((match = blockRe.exec(html)) != null) {
    if (tracks.length >= limit) {
      break;
    }
    const track = mapOneMuzvoxBlock(match[1] || match[0] || "", searchPageUrl);
    if (!track || seen.has(track.ref.remoteId)) {
      continue;
    }
    seen.add(track.ref.remoteId);
    tracks.push(track);
  }
  return tracks;
}
async function fetchMuzvoxHtml(url) {
  const payload = await fetchMusicSidecarJson(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT3,
      Referer: getMusicProviderReferer(MUZVOX_PROVIDER_ID) || `${MUZVOX_ORIGIN}/`
    },
    timeoutMs: 2e4
  });
  return asRawHtml2(payload);
}
function findPlayableByToken(html, token, searchPageUrl) {
  const tracks = mapMuzvoxSearchHtml(html, 200, searchPageUrl);
  const exact = tracks.find((track) => track.ref.remoteId === token);
  if (!exact?.playableUrl) {
    return null;
  }
  if (exact.ref.remoteId !== token) {
    return null;
  }
  return {
    url: exact.playableUrl,
    providerId: MUZVOX_PROVIDER_ID,
    remoteId: token,
    ext: "mp3"
    // 不回写 title/artist，避免更新资源时改写用户可见元数据
  };
}
var muzvoxMusicProvider = {
  id: MUZVOX_PROVIDER_ID,
  label: getMusicProviderCapabilities(MUZVOX_PROVIDER_ID)?.label || "MuzVox",
  async search(query) {
    const text = normalizeMuzvoxQueryText(query.text);
    const pageNum = Math.max(1, Math.floor(query.page ?? 1));
    const plannedUrl = buildMuzvoxSearchUrl(text || query.text.trim());
    const debug = {
      providerId: MUZVOX_PROVIDER_ID,
      url: plannedUrl,
      compareUrl: plannedUrl,
      note: "muzvox.org HTML\uFF1B\u4EC5\u8FD4\u56DE\u5E26 storage mp3-download \u76F4\u94FE\u7684\u66F2\u76EE"
    };
    if (!text && !query.text.trim()) {
      return emptyPage4(query);
    }
    if (pageNum > 1) {
      return {
        ...emptyPage4(query, void 0, [debug]),
        page: pageNum,
        hasMore: false
      };
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage4(query, void 0, [debug]);
    }
    try {
      const html = await fetchMuzvoxHtml(plannedUrl);
      if (!html.trim()) {
        return emptyPage4(query, "MuzVox \u8FD4\u56DE\u7A7A\u9875\u9762", [debug]);
      }
      const limit = Math.max(1, Math.min(query.limit ?? DEFAULT_LIMIT2, 60));
      const tracks = mapMuzvoxSearchHtml(html, limit, plannedUrl);
      if (tracks.length === 0) {
        return {
          ...emptyPage4(query, "MuzVox \u65E0\u5E26\u53EF\u4E0B\u76F4\u94FE\u7684\u7ED3\u679C", [debug]),
          page: pageNum,
          hasMore: false
        };
      }
      return {
        query,
        suggestions: [],
        tracks,
        artists: [],
        albums: [],
        playlists: [],
        providerErrors: [],
        debugSearchRequests: [debug],
        page: pageNum,
        hasMore: false
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "MuzVox \u641C\u7D22\u5931\u8D25";
      return emptyPage4(query, message, [debug]);
    }
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== MUZVOX_PROVIDER_ID) {
      return null;
    }
    const parsed = parseMuzvoxRemoteId(ref.remoteId ?? "");
    if (!parsed) {
      return null;
    }
    const token = parsed.token;
    const pageUrl = ref.pageUrl?.trim() || "";
    if (!pageUrl || !/muzvox\.org/i.test(pageUrl)) {
      return null;
    }
    try {
      const html = await fetchMuzvoxHtml(pageUrl);
      return findPlayableByToken(html, token, pageUrl);
    } catch {
      return null;
    }
  },
  /**
   * MuzVox 无独立艺人/专辑 API：艺人页实质是 /search/{name} 全量列表。
   * listCollection 按名搜索后过滤；playlist 无结构返回 null。
   */
  async listCollection(query) {
    return listCollectionByNameSearch(this, query, { maxPages: 1, pageLimit: 80 });
  }
};

// src/resource/service.ts
init_provider_catalog();

// src/resource/sidecar-provider.ts
init_cover_url_quality();

// src/resource/sidecar-contract.ts
init_platform_registry();
function buildSidecarCollectionUrl(baseUrl, request) {
  const url = new URL("/api/v1/music/collection", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("source", request.sourceId);
  url.searchParams.set("id", request.remoteId);
  url.searchParams.set("type", request.kind);
  if (request.limit != null) {
    url.searchParams.set("limit", String(request.limit));
  }
  if (request.page != null) {
    url.searchParams.set("page", String(request.page));
  }
  return url.toString();
}
function resolveSidecarSearchKinds(scope) {
  if (scope === "track") {
    return ["song"];
  }
  if (scope === "artist") {
    return ["artist"];
  }
  if (scope === "album") {
    return ["album"];
  }
  if (scope === "playlist") {
    return ["playlist"];
  }
  return ["song", "artist", "album", "playlist"];
}
function buildSidecarSearchRequest(query, kind) {
  const sourceIds = (query.providerIds ?? []).filter(
    (providerId) => providerId && providerId !== "local"
  );
  return {
    keyword: query.text.trim(),
    kind,
    sourceIds: sourceIds.length > 0 ? sourceIds : getDefaultSearchPlatformIds(),
    limit: query.limit
  };
}
function normalizeThirdPartySearchPayload(payload) {
  function visit(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (!value || typeof value !== "object") {
      return [];
    }
    const record = value;
    for (const candidate of [
      record.data,
      record.list,
      record.items,
      record.songs,
      record.albums,
      record.playlists,
      record.artists,
      record.result
    ]) {
      const items = visit(candidate);
      if (items.length > 0) {
        return items;
      }
    }
    return [];
  }
  return {
    items: visit(payload)
  };
}
function buildSidecarResolveRequest(ref) {
  return {
    sourceId: ref.providerId,
    remoteId: ref.remoteId
  };
}

// src/resource/sidecar-config.ts
var DEV_PROBE_BASE_URL = "http://127.0.0.1:8080";
var DEV_PROBE_RETRY_MS = 15e3;
var discoveredDevBaseUrl;
var discoveredDevBaseUrlAt = 0;
function getMusicSidecarBaseUrlSync() {
  const runtimeUrl = typeof globalThis === "object" && "AGNX_MUSIC_SIDECAR_URL" in globalThis && typeof globalThis.AGNX_MUSIC_SIDECAR_URL === "string" ? globalThis.AGNX_MUSIC_SIDECAR_URL : null;
  const envUrl = typeof process !== "undefined" && typeof process.env?.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL === "string" ? process.env.EXPO_PUBLIC_AGNX_MUSIC_SIDECAR_URL : null;
  const baseUrl = (runtimeUrl ?? envUrl ?? "").trim();
  return baseUrl ? baseUrl.replace(/\/+$/, "") : null;
}
async function probeDevSidecarBaseUrl() {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return null;
  }
  try {
    const payload = await fetchMusicSidecarJson(
      `${DEV_PROBE_BASE_URL}/api/v1/music/search?q=ping&type=song&limit=1`
    );
    return payload && typeof payload === "object" ? DEV_PROBE_BASE_URL : null;
  } catch {
    return null;
  }
}
async function getMusicSidecarBaseUrl() {
  const configured = getMusicSidecarBaseUrlSync();
  if (configured) {
    return configured;
  }
  const now = Date.now();
  if (discoveredDevBaseUrl !== void 0) {
    if (discoveredDevBaseUrl != null || now - discoveredDevBaseUrlAt < DEV_PROBE_RETRY_MS) {
      return discoveredDevBaseUrl;
    }
  }
  discoveredDevBaseUrl = await probeDevSidecarBaseUrl();
  discoveredDevBaseUrlAt = now;
  return discoveredDevBaseUrl;
}

// src/resource/sidecar-provider.ts
function emptyPage5(query) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: []
  };
}
function toRemoteId(entry) {
  const value = entry.song_id ?? entry.album_id ?? entry.playlist_id ?? entry.artist_id ?? entry.id ?? "";
  return String(value || "").trim();
}
function toProviderId(entry) {
  const providerId = String(entry.source ?? entry.platform ?? "sidecar").trim();
  return providerId || "sidecar";
}
function toArtist(entry) {
  if (typeof entry.artist === "string" && entry.artist.trim()) {
    return entry.artist.trim();
  }
  if (typeof entry.singer === "string" && entry.singer.trim()) {
    return entry.singer.trim();
  }
  if (typeof entry.author === "string" && entry.author.trim()) {
    return entry.author.trim();
  }
  if (typeof entry.album_artist === "string" && entry.album_artist.trim()) {
    return entry.album_artist.trim();
  }
  if (typeof entry.artist_name === "string" && entry.artist_name.trim()) {
    return entry.artist_name.trim();
  }
  if (Array.isArray(entry.artists)) {
    return entry.artists.map((item) => typeof item === "string" ? item : item?.name ?? "").map((item) => item.trim()).filter(Boolean).join(" / ");
  }
  if (Array.isArray(entry.ar)) {
    return entry.ar.map((item) => typeof item === "string" ? item : item?.name ?? "").map((item) => item.trim()).filter(Boolean).join(" / ");
  }
  if (typeof entry.artists === "string" && entry.artists.trim()) {
    return entry.artists.trim();
  }
  return "";
}
function toAlbum(entry) {
  if (typeof entry.album === "string" && entry.album.trim()) {
    return entry.album.trim();
  }
  if (entry.album && typeof entry.album === "object") {
    const value = entry.album.name ?? entry.album.title ?? "";
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  if (typeof entry.album_name === "string" && entry.album_name.trim()) {
    return entry.album_name.trim();
  }
  return void 0;
}
function pickCoverString(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === "object") {
    const record = value;
    for (const key of ["url", "src", "pic", "picUrl", "pic_url", "cover", "cover_url", "image"]) {
      const inner = record[key];
      if (typeof inner === "string" && inner.trim()) {
        return inner.trim();
      }
    }
  }
  return void 0;
}
function toCoverUrl(entry) {
  const raw = pickCoverString(entry.cover) || pickCoverString(entry.cover_url) || pickCoverString(entry.pic) || pickCoverString(entry.pic_url) || pickCoverString(entry.image) || pickCoverString(entry.al) || (entry.album && typeof entry.album === "object" ? pickCoverString(entry.album.pic) || pickCoverString(entry.album.cover) || pickCoverString(entry.album.image) : void 0);
  return raw ? coverUrlForStorage(raw) : void 0;
}
function toDurationMs(entry) {
  const raw = entry.duration_ms ?? entry.duration;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw > 1e4 ? raw : raw * 1e3;
  }
  if (typeof entry.interval === "number" && Number.isFinite(entry.interval) && entry.interval > 0) {
    return entry.interval * 1e3;
  }
  return void 0;
}
function mapTrack(entry) {
  const remoteId = toRemoteId(entry);
  const title = String(entry.title ?? entry.name ?? entry.song_name ?? "").trim();
  if (!remoteId || !title) {
    return null;
  }
  return {
    kind: "track",
    ref: {
      providerId: toProviderId(entry),
      remoteId
    },
    title,
    artist: toArtist(entry),
    album: toAlbum(entry),
    coverUrl: toCoverUrl(entry),
    durationMs: toDurationMs(entry)
  };
}
function mapArtist(entry) {
  const remoteId = toRemoteId(entry);
  const name = String(entry.name ?? entry.title ?? entry.artist ?? entry.singer ?? "").trim();
  if (!remoteId || !name) {
    return null;
  }
  return {
    kind: "artist",
    ref: {
      providerId: toProviderId(entry),
      remoteId
    },
    name,
    trackCount: entry.track_count ?? entry.song_count ?? entry.count,
    coverUrl: toCoverUrl(entry)
  };
}
function mapAlbum(entry) {
  const remoteId = toRemoteId(entry);
  const title = String(entry.title ?? entry.name ?? entry.album_name ?? "").trim();
  if (!remoteId || !title) {
    return null;
  }
  return {
    kind: "album",
    ref: {
      providerId: toProviderId(entry),
      remoteId
    },
    title,
    artist: toArtist(entry),
    coverUrl: toCoverUrl(entry),
    trackCount: entry.track_count ?? entry.song_count ?? entry.count
  };
}
function mapPlaylist(entry) {
  const remoteId = toRemoteId(entry);
  const title = String(entry.title ?? entry.name ?? "").trim();
  if (!remoteId || !title) {
    return null;
  }
  return {
    kind: "playlist",
    ref: {
      providerId: toProviderId(entry),
      remoteId
    },
    title,
    creator: typeof entry.creator === "string" && entry.creator.trim() || typeof entry.author_name === "string" && entry.author_name.trim() || void 0,
    coverUrl: toCoverUrl(entry),
    trackCount: entry.track_count ?? entry.song_count ?? entry.count
  };
}
function asResolvePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload;
}
function resolveNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return void 0;
}
function resolveTrimmedString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return void 0;
}
function resolvePlayableUrl(payload) {
  if (payload && typeof payload === "object" && "code" in payload) {
    const envelope = payload;
    if (envelope.code !== 200) {
      return null;
    }
    if (envelope.data) {
      return resolvePlayableUrl(envelope.data);
    }
  }
  const record = asResolvePayload(payload);
  if (!record) {
    return null;
  }
  const url = resolveTrimmedString(record.data?.url, record.url);
  if (!url) {
    return null;
  }
  return {
    url,
    providerId: String(record.data?.source ?? record.source ?? "").trim(),
    remoteId: String(record.data?.id ?? record.id ?? "").trim(),
    bitrate: resolveNumber(record.data?.br, record.bitrate, record.br),
    sizeBytes: resolveNumber(record.data?.size, record.size),
    ext: resolveTrimmedString(record.data?.type, record.ext, record.type)
  };
}
function resolveLyricsText(payload) {
  if (!payload || typeof payload !== "object") {
    return void 0;
  }
  const record = payload;
  return resolveTrimmedString(record.data?.lyric, record.data?.lrc, record.lyric, record.lrc);
}
async function searchByType(query, type, baseUrl) {
  const request = buildSidecarSearchRequest(query, type);
  const platformIds = request.sourceIds;
  const limit = typeof request.limit === "number" && Number.isFinite(request.limit) && request.limit > 0 ? Math.floor(request.limit) : void 0;
  async function fetchWithSources(sources, errorProviderId) {
    const url = new URL("/api/v1/music/search", `${baseUrl}/`);
    url.searchParams.set("q", request.keyword);
    url.searchParams.set("type", request.kind);
    if (limit) {
      url.searchParams.set("limit", String(limit));
    }
    for (const platformId of sources) {
      url.searchParams.append("sources", platformId);
    }
    const debug = {
      providerId: sources.length === 1 ? sources[0] : errorProviderId,
      url: url.toString(),
      note: `\u722C\u866B\uFF1Asidecar GET\uFF08${baseUrl}\uFF09`
    };
    try {
      const response = await fetchMusicSidecarJson(url.toString());
      if (!response || typeof response !== "object") {
        return {
          entries: [],
          error: { providerId: errorProviderId, message: "\u54CD\u5E94\u65E0\u6548\uFF0C\u5DF2\u8DF3\u8FC7" },
          debug
        };
      }
      return {
        entries: normalizeThirdPartySearchPayload(response).items,
        debug
      };
    } catch (error) {
      return {
        entries: [],
        error: {
          providerId: errorProviderId,
          message: error instanceof Error ? error.message : "\u8BF7\u6C42\u5931\u8D25\uFF0C\u5DF2\u8DF3\u8FC7"
        },
        debug
      };
    }
  }
  if (type === "song" && platformIds.length > 1) {
    const batches = await Promise.all(
      platformIds.map((platformId) => fetchWithSources([platformId], platformId))
    );
    const entries = [];
    const errors = [];
    const debug = [];
    for (const batch2 of batches) {
      entries.push(...batch2.entries);
      if (batch2.error) {
        errors.push(batch2.error);
      }
      debug.push(batch2.debug);
    }
    return { entries, errors, debug };
  }
  const batch = await fetchWithSources(platformIds, "sidecar");
  return {
    entries: batch.entries,
    errors: batch.error ? [batch.error] : [],
    debug: [batch.debug]
  };
}
async function resolvePlayableByRef(ref, baseUrl) {
  try {
    const request = buildSidecarResolveRequest(ref);
    const url = new URL("/api/v1/music/url", `${baseUrl}/`);
    url.searchParams.set("source", request.sourceId);
    url.searchParams.set("id", request.remoteId);
    const payload = await fetchMusicSidecarJson(url.toString());
    const resolved = resolvePlayableUrl(payload);
    if (!resolved) {
      return null;
    }
    return {
      ...resolved,
      providerId: resolved.providerId || ref.providerId,
      remoteId: resolved.remoteId || ref.remoteId
    };
  } catch {
    return null;
  }
}
async function fetchLyricsByRef(ref, baseUrl) {
  const request = buildSidecarResolveRequest(ref);
  const url = new URL("/api/v1/music/lyric", `${baseUrl}/`);
  url.searchParams.set("source", request.sourceId);
  url.searchParams.set("id", request.remoteId);
  try {
    const payload = await fetchMusicSidecarJson(url.toString());
    const fileUrl = new URL("/api/v1/music/lyric/file", `${baseUrl}/`);
    fileUrl.searchParams.set("source", request.sourceId);
    fileUrl.searchParams.set("id", request.remoteId);
    return {
      providerId: ref.providerId,
      remoteId: ref.remoteId,
      text: resolveLyricsText(payload),
      fileUrl: fileUrl.toString()
    };
  } catch {
    return null;
  }
}
var sidecarMusicProvider = {
  id: "sidecar",
  label: "\u672C\u673A\u8D44\u6E90\u670D\u52A1",
  async search(query) {
    const text = query.text.trim();
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!text) {
      return emptyPage5(query);
    }
    if (!baseUrl) {
      return emptyPage5(query);
    }
    const page = emptyPage5(query);
    const types = resolveSidecarSearchKinds(query.scope ?? "all");
    const results = await Promise.all(types.map((type) => searchByType(query, type, baseUrl)));
    for (let index = 0; index < types.length; index += 1) {
      const type = types[index];
      const batch = results[index];
      const entries = batch?.entries ?? [];
      if (batch?.errors?.length) {
        page.providerErrors = [...page.providerErrors ?? [], ...batch.errors];
      }
      if (batch?.debug?.length) {
        page.debugSearchRequests = [...page.debugSearchRequests ?? [], ...batch.debug];
      }
      if (type === "song") {
        page.tracks.push(
          ...entries.map(mapTrack).filter((item) => item != null)
        );
        continue;
      }
      if (type === "artist") {
        page.artists.push(
          ...entries.map(mapArtist).filter((item) => item != null)
        );
        continue;
      }
      if (type === "album") {
        page.albums.push(
          ...entries.map(mapAlbum).filter((item) => item != null)
        );
        continue;
      }
      page.playlists.push(
        ...entries.map(mapPlaylist).filter((item) => item != null)
      );
    }
    return page;
  },
  async resolvePlayable(ref) {
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!baseUrl || !ref.providerId || ref.providerId === "local") {
      return null;
    }
    return resolvePlayableByRef(ref, baseUrl);
  },
  async fetchLyrics(ref) {
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!baseUrl || !ref.providerId || ref.providerId === "local") {
      return null;
    }
    return fetchLyricsByRef(ref, baseUrl);
  },
  async listCollection(query) {
    const remoteId = query.ref.remoteId?.trim() ?? "";
    const sourceId = query.ref.providerId?.trim() ?? "";
    if (!remoteId || !sourceId || sourceId === "local" || sourceId === "sidecar") {
      return null;
    }
    if (remoteId.startsWith("artist:") || remoteId.startsWith("album:")) {
      return null;
    }
    const baseUrl = await getMusicSidecarBaseUrl();
    if (!baseUrl) {
      return null;
    }
    const url = buildSidecarCollectionUrl(baseUrl, {
      sourceId,
      remoteId,
      kind: query.kind,
      limit: query.limit,
      page: query.page
    });
    try {
      const payload = await fetchMusicSidecarJson(url);
      if (payload && typeof payload === "object" && "code" in payload && Number(payload.code) >= 400) {
        return null;
      }
      const entries = normalizeThirdPartySearchPayload(payload).items;
      const tracks = entries.map((item) => mapTrack(item)).filter((item) => item != null);
      if (tracks.length === 0) {
        return null;
      }
      return {
        kind: query.kind,
        ref: { providerId: sourceId, remoteId },
        tracks,
        page: Math.max(1, Math.floor(query.page ?? 1)),
        hasMore: false
      };
    } catch {
      return null;
    }
  }
};

// src/resource/txqq-provider.ts
init_cover_url_quality();
init_platform_registry();

// src/resource/search-debug-urls.ts
function buildPixabayMusicSearchUrl(keyword, page = 1) {
  const base = `https://pixabay.com/zh/music/search/${encodeURIComponent(keyword.trim() || "lofi")}/`;
  return page > 1 ? `${base}?pagi=${page}` : base;
}
function buildSoundstripeLibrarySearchUrl(keyword, page = 1) {
  const encoded = encodeURIComponent(keyword.trim() || "happy");
  const base = `https://www.soundstripe.com/library/royalty-free-music?filter%5Bq%5D=${encoded}`;
  return page > 1 ? `${base}&page=${page}` : base;
}
function buildTxqqDebugRequest(input) {
  const page = input.page ?? 1;
  const body = new URLSearchParams({
    input: input.keyword,
    filter: "name",
    type: input.providerId,
    page: String(page)
  }).toString();
  return {
    providerId: input.providerId,
    url: `POST ${input.origin}/ \xB7 ${body}`,
    note: `\u722C\u866B\uFF1A\u805A\u5408\u6E90 POST\uFF08${input.origin}\uFF09`
  };
}
function mergeSearchDebugRequests(...groups) {
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const key = `${item.providerId}:${item.url}:${item.compareUrl ?? ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

// src/resource/txqq-provider.ts
var AGGREGATOR_ENDPOINTS = ["https://music.txqq.pro/", "https://music.itzo.cn/"];
var aggregatorEndpointCursor = 0;
function aggregatorOrigin(endpoint) {
  try {
    return new URL(endpoint).origin;
  } catch {
    return "https://music.txqq.pro";
  }
}
var TXQQ_SOURCES = ["netease", "qq", "kugou", "kuwo"];
function emptyPage6(query) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: []
  };
}
function mapProviderId(value) {
  const id = (value ?? "").trim();
  if (id === "tencent") {
    return "qq";
  }
  return id || "netease";
}
function mapTrack2(item, fallbackSource) {
  const playableUrl = typeof item.url === "string" ? item.url.trim() : "";
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const remoteId = String(item.songid ?? "").trim();
  if (!playableUrl || !title || !remoteId) {
    return null;
  }
  const lyrics = typeof item.lrc === "string" ? item.lrc.trim() : "";
  return {
    kind: "track",
    ref: {
      providerId: mapProviderId(item.type ?? fallbackSource),
      remoteId,
      pageUrl: typeof item.link === "string" ? item.link : void 0
    },
    title,
    artist: typeof item.author === "string" ? item.author.trim() : "",
    coverUrl: typeof item.pic === "string" && item.pic.trim() ? coverUrlForStorage(item.pic.trim()) : void 0,
    lyrics: lyrics || void 0,
    playableUrl
  };
}
async function searchSource(keyword, source, page) {
  const body = new URLSearchParams({
    input: keyword,
    filter: "name",
    type: source,
    page: String(page)
  }).toString();
  const start = aggregatorEndpointCursor % AGGREGATOR_ENDPOINTS.length;
  aggregatorEndpointCursor = (start + 1) % AGGREGATOR_ENDPOINTS.length;
  const ordered = [];
  for (let offset = 0; offset < AGGREGATOR_ENDPOINTS.length; offset += 1) {
    ordered.push(AGGREGATOR_ENDPOINTS[(start + offset) % AGGREGATOR_ENDPOINTS.length]);
  }
  let lastError;
  let lastDebug;
  for (const endpoint of ordered) {
    const origin = aggregatorOrigin(endpoint);
    const debug = buildTxqqDebugRequest({
      providerId: source,
      origin,
      keyword,
      page
    });
    lastDebug = debug;
    try {
      const payload = await fetchMusicSidecarJson(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          Origin: origin,
          Referer: `${origin}/`
        },
        body
      });
      if (payload?.code !== 200 || !Array.isArray(payload.data)) {
        const code = payload?.code;
        lastError = {
          providerId: source,
          message: code != null ? `\u6682\u4E0D\u53EF\u7528\uFF08code=${String(code)}\uFF09\uFF0C\u5DF2\u8DF3\u8FC7` : "\u6682\u4E0D\u53EF\u7528\uFF0C\u5DF2\u8DF3\u8FC7"
        };
        continue;
      }
      const tracks = payload.data.map((item) => mapTrack2(item, source)).filter((item) => item != null);
      if (payload.data.length > 0 && tracks.length === 0) {
        return {
          tracks: [],
          error: {
            providerId: source,
            message: "\u6709\u547D\u4E2D\u4F46\u65E0\u76F4\u94FE\uFF0C\u5DF2\u8DF3\u8FC7"
          },
          debug
        };
      }
      return { tracks, debug };
    } catch (error) {
      lastError = {
        providerId: source,
        message: error instanceof Error ? error.message : "\u8BF7\u6C42\u5931\u8D25\uFF0C\u5DF2\u8DF3\u8FC7"
      };
    }
  }
  return {
    tracks: [],
    error: lastError ?? {
      providerId: source,
      message: "\u6682\u4E0D\u53EF\u7528\uFF0C\u5DF2\u8DF3\u8FC7"
    },
    debug: lastDebug
  };
}
function resolveSources(query) {
  const requested = (query.providerIds ?? []).filter(
    (id) => id && id !== "local" && id !== "sidecar" && id !== "txqq"
  );
  const defaults = getDefaultSearchPlatformIds().filter(
    (id) => TXQQ_SOURCES.includes(id)
  );
  const sources = requested.length > 0 ? requested : defaults;
  return sources.filter((id) => TXQQ_SOURCES.includes(id));
}
var txqqMusicProvider = {
  id: "txqq",
  label: "\u5728\u7EBF",
  async search(query) {
    const text = query.text.trim();
    if (!text) {
      return emptyPage6(query);
    }
    const scope = query.scope ?? "all";
    if (scope !== "all" && scope !== "track") {
      return emptyPage6(query);
    }
    const sources = resolveSources(query);
    const pageNum = Math.max(1, Math.floor(query.page ?? 1));
    const batches = await Promise.all(sources.map((source) => searchSource(text, source, pageNum)));
    const seen = /* @__PURE__ */ new Set();
    const tracks = [];
    const providerErrors = [];
    const debugSearchRequests = [];
    for (const batch of batches) {
      if (batch.error) {
        providerErrors.push(batch.error);
      }
      if (batch.debug) {
        debugSearchRequests.push(batch.debug);
      }
      for (const track of batch.tracks) {
        const key = `${track.ref.providerId}:${track.ref.remoteId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        tracks.push(track);
      }
    }
    return {
      ...emptyPage6(query),
      tracks,
      providerErrors,
      debugSearchRequests,
      page: pageNum,
      // 聚合源每页常有结果；本页非空则允许试下一页
      hasMore: tracks.length > 0
    };
  },
  async resolvePlayable(ref) {
    if (!ref.providerId || ref.providerId === "local" || !ref.remoteId?.trim()) {
      return null;
    }
    const page = await this.search({
      text: ref.remoteId,
      scope: "track",
      providerIds: [ref.providerId],
      limit: 8
    });
    const hit = page.tracks.find((track) => track.ref.remoteId === ref.remoteId) ?? null;
    if (!hit?.playableUrl) {
      return null;
    }
    return {
      url: hit.playableUrl,
      providerId: hit.ref.providerId,
      remoteId: hit.ref.remoteId
    };
  },
  /**
   * 聚合源无独立艺人/专辑详情接口：多页 name 搜索 + 艺人/专辑字段过滤。
   * 歌单无可靠从属关系 → null。
   */
  async listCollection(query) {
    return listCollectionByNameSearch(this, query, { maxPages: 3, pageLimit: 30 });
  }
};
function normalizeMusicTitle(value) {
  return value.toLowerCase().replace(/（.*?）|\(.*?\)|\[.*?\]|【.*?】/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
function extractLrcTitleTag(lyrics) {
  const match = lyrics.match(/\[ti:\s*([^\]]+)\]/i);
  const raw = match?.[1]?.trim();
  return raw ? raw : null;
}
function lrcTitleMatchesTrack(lyrics, trackTitle) {
  const ti = extractLrcTitleTag(lyrics);
  if (!ti) {
    return true;
  }
  const left = normalizeMusicTitle(ti);
  const right = normalizeMusicTitle(trackTitle);
  if (!left || !right) {
    return false;
  }
  if (left === right) {
    return true;
  }
  return left.includes(right) || right.includes(left);
}
function scriptBucket(text) {
  const letters = Array.from(text).filter((ch) => /\p{L}/u.test(ch));
  if (letters.length === 0) {
    return "other";
  }
  let cjk = 0;
  let latin = 0;
  for (const ch of letters) {
    if (/\p{Script=Han}/u.test(ch)) {
      cjk += 1;
    } else if (/[A-Za-z]/.test(ch)) {
      latin += 1;
    }
  }
  if (cjk / letters.length >= 0.55) {
    return "cjk";
  }
  if (latin / letters.length >= 0.55) {
    return "latin";
  }
  return "mixed";
}
function lyricsBodySample(lyrics) {
  return lyrics.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^\[(ti|ar|al|by|offset):/i.test(line)).slice(0, 24).join(" ");
}
function lyricsLikelyBelongToTrack(lyrics, trackTitle) {
  const title = trackTitle.trim();
  if (!title || !lyrics.trim()) {
    return false;
  }
  if (!lrcTitleMatchesTrack(lyrics, title)) {
    return false;
  }
  if (extractLrcTitleTag(lyrics)) {
    return true;
  }
  const titleScript = scriptBucket(title);
  const bodyScript = scriptBucket(lyricsBodySample(lyrics));
  if (titleScript === "latin" && bodyScript === "cjk") {
    return false;
  }
  if (titleScript === "cjk" && bodyScript === "latin") {
    return false;
  }
  return true;
}
var PLATFORM_ARTIST_PLACEHOLDERS = /* @__PURE__ */ new Set([
  "pixabay",
  "soundstripe",
  "unknown",
  "\u672A\u77E5",
  "\u672A\u77E5\u827A\u4EBA"
]);
async function findTxqqLyricsText(input) {
  const title = input.title.trim();
  if (!title) {
    return null;
  }
  const normalizedTitle = normalizeMusicTitle(title);
  if (!normalizedTitle || normalizedTitle.length < 2) {
    return null;
  }
  const artistRaw = (input.artist ?? "").trim();
  const artist = artistRaw.toLowerCase();
  const artistUsable = Boolean(artist) && !PLATFORM_ARTIST_PLACEHOLDERS.has(artist);
  for (const source of TXQQ_SOURCES) {
    const batch = await searchSource(title, source, 1);
    const ranked = batch.tracks.filter((hit2) => {
      if (!hit2.lyrics?.trim()) {
        return false;
      }
      const hitTitle = normalizeMusicTitle(hit2.title);
      if (hitTitle !== normalizedTitle) {
        return false;
      }
      return lyricsLikelyBelongToTrack(hit2.lyrics, title);
    }).sort((left, right) => {
      if (!artistUsable) {
        return 0;
      }
      const leftArtist = left.artist.toLowerCase().includes(artist) ? 0 : 1;
      const rightArtist = right.artist.toLowerCase().includes(artist) ? 0 : 1;
      return leftArtist - rightArtist;
    });
    const hit = ranked[0];
    if (!hit?.lyrics?.trim()) {
      continue;
    }
    if (artistUsable && !hit.artist.toLowerCase().includes(artist)) {
      continue;
    }
    return hit.lyrics.trim();
  }
  return null;
}

// src/resource/host-media.ts
var createMediaProxyUrlImpl = null;
var captureBrowserMediaImpl = null;
function setMusicHostMediaApis(input) {
  createMediaProxyUrlImpl = input.createMediaProxyUrl ?? null;
  captureBrowserMediaImpl = input.captureBrowserMedia ?? null;
}
async function resolveMusicPlayableSrc(url, options) {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed) || !createMediaProxyUrlImpl) {
    return trimmed;
  }
  if (/^http:\/\/127\.0\.0\.1:\d+\/p\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    const proxied = await createMediaProxyUrlImpl({
      url: trimmed,
      referer: options?.referer
    });
    return proxied.proxyUrl || trimmed;
  } catch {
    return trimmed;
  }
}
async function captureMusicBrowserMedia(input) {
  if (!captureBrowserMediaImpl) {
    throw new Error("\u5F53\u524D\u5BBF\u4E3B\u4E0D\u652F\u6301\u9690\u85CF\u6D4F\u89C8\u5668\u622A\u6D41\uFF08\u9700\u8981\u684C\u9762 Electron\uFF09");
  }
  return captureBrowserMediaImpl(input);
}
function hasMusicBrowserCapture() {
  return captureBrowserMediaImpl != null;
}

// src/resource/web-browser-provider.ts
function emptyPage7(query, error, providerId, debugSearchRequests) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: error && providerId ? [{ providerId, message: error }] : [],
    debugSearchRequests
  };
}
function shortIdFromUrl(url) {
  let hash = 0;
  for (let index = 0; index < url.length; index += 1) {
    hash = hash * 31 + url.charCodeAt(index) >>> 0;
  }
  return hash.toString(36);
}
var UI_TITLE_RE = /^(play|download|like|save|music|pixabay|soundstripe|简体中文|繁體中文|繁体中文|english|explore|upload|login|join)$/i;
var PLATFORM_ARTIST_RE = /^(pixabay|sound\s*stripe|soundstripe)$/i;
function sanitizeBrowserArtist(value, options) {
  const raw = value?.trim() ?? "";
  if (raw && !UI_TITLE_RE.test(raw) && !PLATFORM_ARTIST_RE.test(raw)) {
    return raw;
  }
  if (options?.providerId === "pixabay") {
    const fromMedia = artistFromPixabayMediaUrl(options.mediaUrl);
    if (fromMedia && !PLATFORM_ARTIST_RE.test(fromMedia)) {
      return fromMedia;
    }
  }
  return "\u672A\u77E5";
}
var PIXABAY_CATEGORIES = /* @__PURE__ */ new Set([
  "beat",
  "beats",
  "loop",
  "loops",
  "funk",
  "ambient",
  "corporate",
  "cinematic",
  "upbeat",
  "acoustic",
  "electronic",
  "rock",
  "pop",
  "jazz",
  "classical",
  "folk",
  "world",
  "holiday"
]);
function isBadMusicTitle(value) {
  const title = value?.trim() ?? "";
  return !title || title.length < 2 || title.length > 160 || UI_TITLE_RE.test(title);
}
function titleFromPixabayUrl(url) {
  const raw = url?.trim();
  if (!raw) {
    return void 0;
  }
  try {
    const parsed = new URL(raw);
    const fileNameParam = parsed.searchParams.get("filename");
    if (fileNameParam) {
      const base = fileNameParam.replace(/\.[a-z0-9]+$/i, "");
      const parts2 = base.replace(/-\d+$/, "").split("-").filter(Boolean);
      if (parts2.length >= 2) {
        return parts2.slice(1).join(" ");
      }
      return parts2.join(" ") || void 0;
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1] || "";
    let parts = slug.replace(/-\d+$/, "").split("-").filter(Boolean);
    if (parts.length >= 2 && PIXABAY_CATEGORIES.has(parts[0].toLowerCase())) {
      parts = parts.slice(1);
    }
    const title = parts.join(" ").trim();
    return title || void 0;
  } catch {
    return void 0;
  }
}
function artistFromPixabayMediaUrl(url) {
  const raw = url?.trim();
  if (!raw) {
    return void 0;
  }
  try {
    const parsed = new URL(raw);
    const fileNameParam = parsed.searchParams.get("filename");
    if (!fileNameParam) {
      return void 0;
    }
    const base = fileNameParam.replace(/\.[a-z0-9]+$/i, "");
    const parts = base.replace(/-\d+$/, "").split("-").filter(Boolean);
    const artist = (parts.length > 0 ? parts[0] : void 0)?.trim();
    if (!artist || UI_TITLE_RE.test(artist) || artist.toLowerCase() === "audio") {
      return void 0;
    }
    return artist;
  } catch {
    return void 0;
  }
}
function sanitizeCapturedTitle(title, pageUrl, mediaUrl) {
  if (!isBadMusicTitle(title)) {
    return title.trim();
  }
  return titleFromPixabayUrl(mediaUrl) || titleFromPixabayUrl(pageUrl) || title?.trim() || "Unknown";
}
function tracksFromCapture(providerId, capture, fallbackQuery) {
  const fromList = (capture.tracks ?? []).filter((track) => (track.pageUrl || track.mediaUrl) && track.title.trim()).map((track) => {
    const pageUrl = track.pageUrl?.trim();
    const mediaUrl2 = track.mediaUrl?.trim();
    const coverUrl = track.coverUrl?.trim();
    const remoteKey = pageUrl || mediaUrl2 || track.title;
    const title = sanitizeCapturedTitle(track.title, pageUrl, mediaUrl2);
    const artist = sanitizeBrowserArtist(track.artist, { mediaUrl: mediaUrl2, providerId });
    const durationMs = typeof track.durationMs === "number" && Number.isFinite(track.durationMs) && track.durationMs > 0 ? Math.floor(track.durationMs) : void 0;
    return {
      kind: "track",
      ref: {
        providerId,
        remoteId: `${providerId}:${shortIdFromUrl(remoteKey)}`,
        pageUrl
      },
      title,
      artist,
      coverUrl: coverUrl || void 0,
      durationMs,
      playableUrl: mediaUrl2
    };
  }).filter((track) => !isBadMusicTitle(track.title));
  if (fromList.length > 0) {
    return fromList;
  }
  const mediaUrl = capture.mediaUrls.find(
    (url) => /\.(mp3|m4a)(\?|$)/i.test(url) || /audio/i.test(url)
  );
  if (!mediaUrl) {
    return [];
  }
  return [
    {
      kind: "track",
      ref: {
        providerId,
        remoteId: `${providerId}:${shortIdFromUrl(mediaUrl)}`
      },
      title: sanitizeCapturedTitle(
        capture.title.replace(/\s*[-–|].*$/, "").trim(),
        void 0,
        mediaUrl
      ) || fallbackQuery || "Web capture",
      artist: sanitizeBrowserArtist(void 0, { mediaUrl, providerId }),
      playableUrl: mediaUrl
    }
  ];
}
async function searchViaBrowserPreset(input) {
  const text = input.query.text.trim();
  const pageNum = Math.max(1, Math.floor(input.query.page ?? 1));
  const plannedUrl = input.preset === "pixabay-music-search" ? buildPixabayMusicSearchUrl(text, pageNum) : buildSoundstripeLibrarySearchUrl(text, pageNum);
  const debugBase = {
    providerId: input.providerId,
    url: plannedUrl,
    compareUrl: plannedUrl,
    note: pageNum > 1 ? `\u7B2C ${pageNum} \u9875` : "\u9690\u85CF\u6D4F\u89C8\u5668\u5C06\u6253\u5F00\u6B64\u9875\u522E\u5217\u8868"
  };
  if (!hasMusicBrowserCapture()) {
    return emptyPage7(input.query, "\u9700\u8981\u684C\u9762 Electron \u9690\u85CF\u6D4F\u89C8\u5668\u4F1A\u8BDD", input.providerId, [
      debugBase
    ]);
  }
  if (!text) {
    return emptyPage7(input.query);
  }
  try {
    const capture = await captureMusicBrowserMedia({
      preset: input.preset,
      query: text,
      timeoutMs: 4e4,
      listOnly: true,
      page: pageNum
    });
    const finalUrl = capture.finalUrl?.trim() || plannedUrl;
    const debug = {
      ...debugBase,
      url: finalUrl,
      compareUrl: plannedUrl,
      note: finalUrl !== plannedUrl ? `\u8BA1\u5212\u6253\u5F00 ${plannedUrl}` : debugBase.note
    };
    const tracks = tracksFromCapture(input.providerId, capture, text);
    if (tracks.length === 0) {
      const hint = capture.pageHint?.trim() || `\u672A\u89E3\u6790\u5230\u66F2\u76EE\u5217\u8868\uFF08title=${capture.title || "?"}\uFF09`;
      return {
        ...emptyPage7(input.query, hint, input.providerId, [debug]),
        page: pageNum,
        hasMore: false
      };
    }
    return {
      query: input.query,
      suggestions: [],
      tracks,
      artists: [],
      albums: [],
      playlists: [],
      providerErrors: [],
      debugSearchRequests: [debug],
      page: pageNum,
      hasMore: Boolean(capture.hasMore)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : `${input.label} \u641C\u7D22\u5931\u8D25`;
    const friendly = /ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|net::ERR_/i.test(message) ? `${input.label} \u7F51\u7EDC\u88AB\u4E2D\u65AD\uFF08\u53EF\u91CD\u8BD5\uFF1B\u82E5\u53CD\u590D\u5931\u8D25\u68C0\u67E5\u4EE3\u7406/VPN\uFF09` : message;
    return {
      ...emptyPage7(input.query, friendly, input.providerId, [debugBase]),
      page: pageNum,
      hasMore: false
    };
  }
}
function pickCapturedMediaUrl(capture) {
  const meta = capture.tracks?.find((track) => Boolean(track.mediaUrl)) || capture.tracks?.[0] || void 0;
  const mediaUrl = meta?.mediaUrl || capture.mediaUrls.find(
    (url) => /\.(mp3|m4a)(\?|$)/i.test(url) || /cdn\.pixabay\.com\/(?:download\/)?audio\//i.test(url) || /cdn\.soundstripe\.com/i.test(url) || /soundstripe/i.test(url) && /\/(audio|media|stream)\//i.test(url) || /audio\//i.test(url)
  );
  if (!mediaUrl) {
    return null;
  }
  return { mediaUrl, meta };
}
function buildResolvedFromCapture(ref, pageUrl, capture) {
  const picked = pickCapturedMediaUrl(capture);
  if (!picked) {
    throw new Error("\u672A\u622A\u5230\u53EF\u64AD\u97F3\u6D41\uFF08\u8BE6\u60C5\u9875\u65E0 mp3 / \u64AD\u653E\u672A\u89E6\u53D1\uFF09");
  }
  const meta = capture.tracks?.find((track) => track.pageUrl === pageUrl) || picked.meta || capture.tracks?.[0];
  const mediaUrl = picked.mediaUrl;
  const title = sanitizeCapturedTitle(meta?.title?.trim(), pageUrl, mediaUrl);
  const artist = sanitizeBrowserArtist(meta?.artist, {
    mediaUrl,
    providerId: ref.providerId
  });
  return {
    url: mediaUrl,
    providerId: ref.providerId,
    remoteId: ref.remoteId,
    title: isBadMusicTitle(title) ? void 0 : title,
    artist: artist === "\u672A\u77E5" ? void 0 : artist,
    coverUrl: meta?.coverUrl?.trim() || void 0
  };
}
async function resolveViaPageCapture(ref) {
  const pageUrl = ref.pageUrl?.trim();
  if (!pageUrl || !hasMusicBrowserCapture()) {
    return null;
  }
  const capture = await captureMusicBrowserMedia({
    pageUrl,
    preset: "none",
    timeoutMs: 45e3,
    listOnly: false,
    clickButtonText: ref.providerId === "soundstripe" ? "Preview" : "Play"
  });
  return buildResolvedFromCapture(ref, pageUrl, capture);
}
var pixabayMusicProvider = {
  id: "pixabay",
  label: "Pixabay",
  async search(query) {
    return searchViaBrowserPreset({
      providerId: "pixabay",
      label: "Pixabay",
      query,
      preset: "pixabay-music-search"
    });
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== "pixabay") {
      return null;
    }
    return resolveViaPageCapture(ref);
  }
};
var soundstripeMusicProvider = {
  id: "soundstripe",
  label: "Soundstripe",
  async search(query) {
    return searchViaBrowserPreset({
      providerId: "soundstripe",
      label: "Soundstripe",
      query,
      preset: "soundstripe-library-search"
    });
  },
  async resolvePlayable(ref) {
    if (ref.providerId !== "soundstripe") {
      return null;
    }
    return resolveViaPageCapture(ref);
  }
};

// src/resource/playable-filter.ts
var PLAYABLE_VERIFY_CONCURRENCY = 4;
var PLAYABLE_CANDIDATES_PER_PLATFORM = 6;
var MAX_PLAYABLE_SEARCH_RESULTS = 24;
function pickPlayableVerifyCandidates(tracks) {
  const byPlatform = /* @__PURE__ */ new Map();
  for (const track of tracks) {
    if (track.localTrackId) {
      continue;
    }
    const platformId = track.ref.providerId;
    const bucket = byPlatform.get(platformId) ?? [];
    if (bucket.length >= PLAYABLE_CANDIDATES_PER_PLATFORM) {
      continue;
    }
    bucket.push(track);
    byPlatform.set(platformId, bucket);
  }
  const buckets = [...byPlatform.values()];
  const interleaved = [];
  let index = 0;
  let added = true;
  while (added && interleaved.length < MAX_PLAYABLE_SEARCH_RESULTS * 2) {
    added = false;
    for (const bucket of buckets) {
      const item = bucket[index];
      if (item) {
        interleaved.push(item);
        added = true;
      }
    }
    index += 1;
  }
  return interleaved;
}
async function verifyPlayableTracks(tracks, resolvePlayable) {
  const localHits = tracks.filter((track) => track.localTrackId);
  const candidates = pickPlayableVerifyCandidates(tracks);
  const verified = [...localHits];
  for (let index = 0; index < candidates.length; index += PLAYABLE_VERIFY_CONCURRENCY) {
    const batch = candidates.slice(index, index + PLAYABLE_VERIFY_CONCURRENCY);
    const settled = await Promise.all(
      batch.map(async (track) => {
        try {
          const resolved = await resolvePlayable(track.ref);
          if (!resolved?.url) {
            return null;
          }
          return Object.assign({}, track, { playableUrl: resolved.url });
        } catch {
          return null;
        }
      })
    );
    for (const item of settled) {
      if (item) {
        verified.push(item);
      }
    }
    if (verified.length >= MAX_PLAYABLE_SEARCH_RESULTS) {
      break;
    }
  }
  return {
    verified: verified.slice(0, MAX_PLAYABLE_SEARCH_RESULTS),
    candidateCount: candidates.length + localHits.length
  };
}

// src/resource/service.ts
var providers = [
  localMusicProvider,
  txqqMusicProvider,
  aiguoMusicProvider,
  audiocomMusicProvider,
  muzvoxMusicProvider,
  pixabayMusicProvider,
  soundstripeMusicProvider,
  // 始终挂上 sidecar：未配置/探测失败时 provider 自行静默空结果，不挡本地与 txqq
  sidecarMusicProvider
];
function resolveOnlineProviders() {
  return providers;
}
function listMusicProviders() {
  return resolveOnlineProviders().map((provider) => ({ id: provider.id, label: provider.label }));
}
function mergeProviderErrors(...groups) {
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const key = `${item.providerId}:${item.message}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}
function isBrowserSearchProvider(provider) {
  return isBrowserSearchProviderId(provider.id);
}
function createEmptySearchPage(query) {
  return {
    query,
    suggestions: [],
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    providerErrors: [],
    debugSearchRequests: [],
    page: Math.max(1, Math.floor(query.page ?? 1)),
    hasMore: false
  };
}
function mergeProviderPageInto(merged, page) {
  merged.suggestions.push(...page.suggestions);
  merged.tracks.push(...page.tracks);
  merged.artists.push(...page.artists);
  merged.albums.push(...page.albums);
  merged.playlists.push(...page.playlists);
  if (page.providerErrors?.length) {
    merged.providerErrors = mergeProviderErrors(merged.providerErrors, page.providerErrors);
  }
  if (page.debugSearchRequests?.length) {
    merged.debugSearchRequests = mergeSearchDebugRequests(
      merged.debugSearchRequests,
      page.debugSearchRequests
    );
  }
  if (page.hasMore) {
    merged.hasMore = true;
  }
  if (typeof page.page === "number") {
    merged.page = Math.max(merged.page ?? 1, page.page);
  }
}
function snapshotSearchPage(page) {
  return {
    ...page,
    suggestions: [...page.suggestions],
    tracks: [...page.tracks],
    artists: [...page.artists],
    albums: [...page.albums],
    playlists: [...page.playlists],
    providerErrors: [...page.providerErrors ?? []],
    debugSearchRequests: [...page.debugSearchRequests ?? []]
  };
}
async function searchMusic(query, options) {
  const selected = query.providerIds;
  const enabled = resolveOnlineProviders().filter(
    (provider) => shouldIncludeProviderForSelection(provider.id, selected)
  );
  const fast = enabled.filter((provider) => !isBrowserSearchProvider(provider));
  const browser = enabled.filter((provider) => isBrowserSearchProvider(provider)).slice().sort((left, right) => left.id.localeCompare(right.id));
  const merged = createEmptySearchPage(query);
  const emitPartial = () => {
    options?.onPartial?.(snapshotSearchPage(merged));
  };
  const runProvider = async (provider) => {
    try {
      const page = await provider.search(query);
      mergeProviderPageInto(merged, page);
    } catch (reason) {
      merged.providerErrors = mergeProviderErrors(merged.providerErrors, [
        {
          providerId: provider.id,
          message: reason instanceof Error ? reason.message : "\u641C\u7D22\u5931\u8D25"
        }
      ]);
    }
    emitPartial();
  };
  if (fast.length > 0) {
    await Promise.all(fast.map((provider) => runProvider(provider)));
  }
  for (const provider of browser) {
    await runProvider(provider);
  }
  merged.providerErrors = mergeProviderErrors(merged.providerErrors);
  merged.debugSearchRequests = mergeSearchDebugRequests(merged.debugSearchRequests);
  if (merged.page == null) {
    merged.page = Math.max(1, Math.floor(query.page ?? 1));
  }
  return snapshotSearchPage(merged);
}
function applyPlayableFilterKeepErrors(page) {
  const scope = page.query.scope ?? "all";
  if (scope !== "all" && scope !== "track") {
    return page;
  }
  const localHits = page.tracks.filter((track) => track.localTrackId);
  const readyHits = page.tracks.filter((track) => !track.localTrackId && track.playableUrl);
  const deferredBrowserHits = page.tracks.filter(
    (track) => !track.localTrackId && !track.playableUrl && Boolean(track.ref.pageUrl) && isDeferredBrowserProviderId(track.ref.providerId)
  );
  const pendingHits = page.tracks.filter(
    (track) => !track.localTrackId && !track.playableUrl && !deferredBrowserHits.some(
      (item) => item.ref.providerId === track.ref.providerId && item.ref.remoteId === track.ref.remoteId
    )
  );
  return {
    ...page,
    tracks: [...localHits, ...readyHits, ...deferredBrowserHits, ...pendingHits],
    providerErrors: mergeProviderErrors(page.providerErrors)
  };
}
async function searchPlayableMusic(query, options) {
  const page = await searchMusic(query, {
    onPartial: (partial) => {
      const quick = applyPlayableFilterKeepErrors(partial);
      const withoutPending = {
        ...quick,
        tracks: quick.tracks.filter(
          (track) => Boolean(track.localTrackId) || Boolean(track.playableUrl) || Boolean(track.ref.pageUrl) && isDeferredBrowserProviderId(track.ref.providerId)
        )
      };
      options?.onPartial?.(withoutPending);
    }
  });
  const scope = query.scope ?? "all";
  if (scope !== "all" && scope !== "track") {
    return page;
  }
  const localHits = page.tracks.filter((track) => track.localTrackId);
  const readyHits = page.tracks.filter((track) => !track.localTrackId && track.playableUrl);
  const deferredBrowserHits = page.tracks.filter(
    (track) => !track.localTrackId && !track.playableUrl && Boolean(track.ref.pageUrl) && isDeferredBrowserProviderId(track.ref.providerId)
  );
  const pendingHits = page.tracks.filter(
    (track) => !track.localTrackId && !track.playableUrl && !deferredBrowserHits.some(
      (item) => item.ref.providerId === track.ref.providerId && item.ref.remoteId === track.ref.remoteId
    )
  );
  const { verified } = await verifyPlayableTracks(pendingHits, async (ref) => {
    const resolved = await resolveMusicPlayable(ref);
    return resolved ? { url: resolved.url } : null;
  });
  const seen = /* @__PURE__ */ new Set();
  const tracks = [];
  for (const track of [...localHits, ...readyHits, ...deferredBrowserHits, ...verified]) {
    const key = track.localTrackId ?? `${track.ref.providerId}:${track.ref.remoteId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tracks.push(track);
  }
  return {
    ...page,
    tracks,
    // 保留源级降级文案，勿在可播过滤时清空
    providerErrors: mergeProviderErrors(page.providerErrors)
  };
}
function providersForRemoteResolve(ref) {
  const all = resolveOnlineProviders().filter((provider) => provider.id !== "local");
  const exact = all.filter((provider) => provider.id === ref.providerId);
  const rest = all.filter((provider) => provider.id !== ref.providerId).slice().sort((left, right) => {
    return getMusicProviderResolvePriority(left.id) - getMusicProviderResolvePriority(right.id);
  });
  return [...exact, ...rest];
}
function playableMatchesRef(resolved, ref) {
  if (resolved.remoteId && ref.remoteId && resolved.remoteId !== ref.remoteId) {
    return false;
  }
  if (resolved.providerId && ref.providerId && resolved.providerId !== ref.providerId) {
    if (resolved.providerId === "sidecar" || resolved.providerId === "txqq") {
      return true;
    }
    if (ref.providerId === "sidecar" || ref.providerId === "txqq") {
      return true;
    }
    return false;
  }
  return true;
}
async function resolveMusicPlayable(ref) {
  if (!ref.providerId || ref.providerId === "local") {
    return null;
  }
  for (const provider of providersForRemoteResolve(ref)) {
    if (!provider.resolvePlayable) {
      continue;
    }
    const resolved = await provider.resolvePlayable(ref);
    if (resolved?.url?.trim() && playableMatchesRef(resolved, ref)) {
      return resolved;
    }
  }
  return null;
}
async function fetchMusicLyrics(ref) {
  if (!ref.providerId || ref.providerId === "local") {
    return null;
  }
  for (const provider of providersForRemoteResolve(ref)) {
    if (!provider.fetchLyrics) {
      continue;
    }
    const resolved = await provider.fetchLyrics(ref);
    if (!resolved) {
      continue;
    }
    if (resolved.remoteId && ref.remoteId && resolved.remoteId !== ref.remoteId) {
      continue;
    }
    return resolved;
  }
  return null;
}

// src/resource/search-page-merge.ts
function refKey(providerId, remoteId) {
  return `${providerId.trim()}:${remoteId.trim()}`;
}
function searchHitTrackKey(track) {
  return refKey(track.ref.providerId, track.ref.remoteId);
}
function searchHitArtistKey(artist) {
  const remote = artist.ref.remoteId?.trim() ?? "";
  if (remote && !remote.startsWith("artist:")) {
    return refKey(artist.ref.providerId, remote);
  }
  return refKey(artist.ref.providerId, `name:${artist.name.trim().toLowerCase()}`);
}
function searchHitAlbumKey(album) {
  const remote = album.ref.remoteId?.trim() ?? "";
  if (remote && !remote.startsWith("album:")) {
    return refKey(album.ref.providerId, remote);
  }
  const artist = (album.artist ?? "").trim().toLowerCase();
  return refKey(album.ref.providerId, `title:${album.title.trim().toLowerCase()}|artist:${artist}`);
}
function searchHitPlaylistKey(playlist) {
  const remote = playlist.ref.remoteId?.trim() ?? "";
  if (remote) {
    return refKey(playlist.ref.providerId, remote);
  }
  return refKey(playlist.ref.providerId, `title:${playlist.title.trim().toLowerCase()}`);
}
function appendUniqueByKey(existing, incoming, keyOf) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of existing) {
    const key = keyOf(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  for (const item of incoming) {
    const key = keyOf(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}
function mergeSearchResultPages(current, more, nextPageNum) {
  const tracks = appendUniqueByKey(current.tracks, more.tracks, searchHitTrackKey);
  const artists = appendUniqueByKey(current.artists, more.artists, searchHitArtistKey);
  const albums = appendUniqueByKey(current.albums, more.albums, searchHitAlbumKey);
  const playlists = appendUniqueByKey(current.playlists, more.playlists, searchHitPlaylistKey);
  const appendedTrackCount = tracks.length - current.tracks.length;
  return {
    ...current,
    tracks,
    artists,
    albums,
    playlists,
    providerErrors: [...current.providerErrors ?? [], ...more.providerErrors ?? []],
    debugSearchRequests: [
      ...current.debugSearchRequests ?? [],
      ...more.debugSearchRequests ?? []
    ],
    page: nextPageNum,
    // 仅歌曲增长才视为还有下一页；否则空翻页会反复叠艺人/专辑卡片
    hasMore: Boolean(more.hasMore) && appendedTrackCount > 0
  };
}

// src/search-view.tsx
init_search_result_cache();

// src/resource/collection-resolve.ts
function isDerivedCollectionRemoteId(remoteId) {
  return remoteId.startsWith("artist:") || remoteId.startsWith("album:");
}
function filterTracksForCollection(tracks, collection) {
  if (collection.kind === "artist") {
    const name = collection.title.trim().toLowerCase();
    if (!name) {
      return [];
    }
    return tracks.filter((track) => track.artist.trim().toLowerCase() === name);
  }
  if (collection.kind === "album") {
    const title = collection.title.trim().toLowerCase();
    if (!title) {
      return [];
    }
    return tracks.filter((track) => (track.album ?? "").trim().toLowerCase() === title);
  }
  return [];
}
function collectionTrackSourceHint(input) {
  let kindLabel = "\u6B4C\u5355";
  if (input.kind === "artist") {
    kindLabel = "\u97F3\u4E50\u4EBA";
  } else if (input.kind === "album") {
    kindLabel = "\u4E13\u8F91";
  }
  if (input.loading && !input.hasOptimisticTracks) {
    return `\u6B63\u5728\u52A0\u8F7D\u300C${input.title ?? ""}\u300D\u66F2\u76EE\u2026`;
  }
  if (input.source === "local") {
    return `\u6765\u6E90\uFF1A\u5F53\u524D\u641C\u7D22\u7ED3\u679C\u4E2D\u7684${kindLabel}\u5339\u914D\u3002\u52A0\u8F7D\u66F4\u591A = \u539F\u641C\u7D22\u7FFB\u9875\u540E\u518D\u8FC7\u6EE4\u3002`;
  }
  if (input.source === "list" || input.source === "related") {
    return `\u6765\u6E90\uFF1A\u5F53\u524D\u641C\u7D22\u7ED3\u679C\u4E2D\u7684${kindLabel}\u5339\u914D\u3002`;
  }
  if (input.empty) {
    return `\u5F53\u524D\u641C\u7D22\u7ED3\u679C\u91CC\u6CA1\u6709\u300C${input.title ?? ""}\u300D\u7684\u5339\u914D\u6B4C\u66F2\u3002\u53EF\u52A0\u8F7D\u66F4\u591A\u6216\u91CD\u65B0\u641C\u7D22\u3002`;
  }
  return "\u6682\u65E0\u66F2\u76EE\u3002";
}
function collectionTrackCountSuffix(source) {
  if (source === "local" || source === "list" || source === "related") {
    return "\uFF08\u672C\u9875\u8FC7\u6EE4\uFF09";
  }
  return "";
}

// src/provider-icons.tsx
var import_react_native3 = require("react-native");
var import_lucide_react_native4 = require("lucide-react-native");
var import_react_native_unistyles3 = require("react-native-unistyles");

// src/provider-icon-assets.ts
function pngDataUri(b64) {
  return { uri: `data:image/png;base64,${b64}` };
}
var LOCAL_PROVIDER_ICON_SOURCES = {
  netease: pngDataUri(
    "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"
  ),
  qq: pngDataUri(
    "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"
  ),
  kugou: pngDataUri(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACfklEQVR4nO2by8tNURjGn/NYSAaupaivGHzf5xKFgTKUAQOk5F4yMnAZSLlPnMxMhJnkmnKL3CL/hCSUDHwkA6UM3SYGez/tzuM4cgaPX53B7917r7N2p/Wevda7dmugPQJhk/hh8WHxFvrLD/EX4m3xK1UhwiHCIcIpADZK7HKPbb4Uv2nG6HfxeeJrxIdMDppt7qeWM4hwiHCIcAqAQ11e81l8j/gH8c3iK037T8X3ik8UP2WOKwerQoRDhEOEUxr+V92YXyG+W3xDj31aIL5V/JrJKQ/EJ4jX7pcIhwiHCKf8+nRC/4d3mjH/xcwNZopPFv8o/lZ8KTqzS/yC+OiqEOEQ4RDhlIbYa/E3Zs1QeSy+Vvyu+CzxZeLTxB+JrxM/K/5KfLAqRDhEOEQ4pSF2R3xLl23qeoDySXy7+AyTU6aY9reJ3xbfVxUiHCIcIpzSEHsmvuMv54DaGAQwVvyJ+KQuv3/QtFeDCIcIhwin/MY53db/34mPMesBOvf4ht5omf0DNYhwiHCIcEpDbNg8Fyw2bb43z/anxZeYOsC9Ln+05+Id6x5EOEQ4RDilIbbK1AF0vu3mAtPFF4ofET8qftzsW4SpA5zsdDIRDhEOEU5piA2ZMXzV1AbPi48zfThg6v2jzPXXzfrB/+eAThDhEOEUAF8bYlXOiC838+/1f9CHKovM+TfET4g/NNfX7pcIhwiHCKc01M/niI8Xv2/25JwztcX5JofoXuGL4lPNeoHuC0SnPUtEOEQ4RDitgfaI7ue/1GObui/wllljVOaKrzY5qltqOYkIhwiHCKe49+oa1ujc+wV6fD/+LZqDjonX7pcIhwiH/e5Av/kJsY5XZ3EXq/sAAAAASUVORK5CYII="
  ),
  kuwo: pngDataUri(
    "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"
  ),
  aiguo: pngDataUri(
    "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"
  ),
  audiocom: pngDataUri(
    "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAE+klEQVR4nO1ZW2tcVRT+9j73zCVpLq0haRtNH7RU4yXUIiqI+CC++OKDv0D/gA+Cv8OHUqwIWkEl3miLKIJIoX2wAQO1tN7TNJ3Jdc6cmTPntmXtk0km5DJnzkzTGfALJ5NM9tlZ31prf2utM+wlnBHoYXD0ODh6HBw9Do4eB0ePg6PHwTu7HevwuuZQ0SFwxlowjiESorsIPJE18OZDOeiMQTSh8VvFw9n5Nbmuawj8VfXhRwLT/Yb8fT8Cx00VFxZt2EEE0SaNjp2BUhBhpuBgzY82jBe7XvQ9r3KcysZE20XHCJAvZ8tVfL9a2denlGAcAmfyZsO56RIVigTw6T0bc2Wv6WF+LKMhp3QZAQEmU+jcQgmrAaXL3tsPagqOmWq31YE4eW5WPHy37CDcRyozCsdknw7WZk3oeCUmv3uRwMUlB3+6/kYq7TRSY8CkpcHkfIME66ZWQuBOLcBHd20Ee0SBjJ60NGTU9Mbf116IVOnKegXfLFUR7rHiqKFgWFUaZPbACWx5ru7HRl+S878o2LhdqafSdlgKw1ROb8uC1AQoBUjT41cGxuLX+l/4xs8FL8BXRQdOuLPBYACezVtopxyk0jH6fwbnOKzHFXUqq+OIrkjDV/wQc46HWbuGhVqAahThp7UKnhsw8Hy/tWOnRzMahjQFRS84GAIcHEctFa8NZfDCgIkRnd5phIYXD1lY9iNcK7n4dsnBrYqHD+7YeNjUMGZQzm/B4AzP5A1cXgoOJoWOWyreOTaA10cy0uu7bUCpNaxxvDrUh3cnBnE6b+HfWoDzCyXUqFxvW4u22orEBCg9Rg0N700M4mRGh8qaKQedDyGV5u3xfpywNFwr1fDzeg31di8GwyOWLtMoTVFLTCCrcLw11o8JS22pBaaV45JEXpr3ddFB0SNhrRsrkFeIhJbqMCcm8GTOwFM5Kv3k2eSI1ws8njXw8mAfbjieVKVoc4VAHxEwtVTlLBEBnTM8nTdk/5IWdOcrQxZ0BswUyvjF9jbjSMX4RF/cVqTZtwkYMpxjwtTaqnpk7LCmYMxU4QuB83fWsdggnZRCuRQO4ok0X2EY1Nor2nHtYDikKfIM/e76uLxckWQIo4aCUXO7xCZBIquoqmryhLUzv8aTWLwPk/PzpeUKblcpClw+DJjOmfeDgJAdZVXqd3tRCARQCbeO74oX4sMFG3YYq9LpvAm1RSlqahGZ7UYRClL62okAhxtiQ0LjuUEAuG67+LwQqxJNaONSjZKTSORSasRuOp70YDqQkAr84fqyuas7QkDIOZqGn7lyTXqfotAKEhGg0fBqycWKvxX+VkEtxJdFZ/PQNs4Nq36ImWIZdhhhOm9A4x2OAOFWxcelFSdVEtE9F5crmLXdXUeXCAJX111cWavKqk09VscJhCLChbsl/LjqwmuBRSiYjN4nizbkSLBPhM4tlLAWRLImdJwANQS+AN6fX5OpUN4cUHa7YriRwA8rVZydL8k0aYZVP8THi2WM6EpiNWJpPqW0OMfJrI43DucwlTVgNLiBNiNu9AD3s3s2rts1OCElSTL0cY6pnIlfy3SfPOadJ0Cg/p2+xgwVpzIajhiq9P2SH+KG4+Nv15cRk4NxC/0rA0NW5TKlqNg1uzP1o7H68/1/XE9e+xvVCgTsoHm6deipRDK/thJi0aIF/39G9qDB0ePg6HFw9Dj4gzagXfwHKLrxNZcuYLsAAAAASUVORK5CYII="
  ),
  pixabay: pngDataUri(
    "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"
  ),
  soundstripe: pngDataUri(
    "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAACv0lEQVR4nNWXTUhUURTH/+/0ZsbnjD4nnCEKpkQxLEVKEywpiBBDNGhTLWwjWG1a9LVo07rAFgVZQquoFgVFtYmyDwgJ1CSwhCDTASc0cRo/ZkZnHOPdpEWovDPNYOe3uXfg/t+c/+G8887VACxCMAThEIRDEA5BOAThEIRDEA5BOAThEIRDEA5BOAThEISjpyusywmg1dyBCqcfla4N0LWVcxFeiOH2VD/OT7xQv8uchbjg3YOjnnLkkI7kYgqPZgZxafINBucnWHFo6dwHzhTUot1Xb/t8PJVEycg1jCanccqsxg1/44pn70x9ROvYEySQyk4JWdm7XHiApWn/2a2C328UrRq8RUt+Jc55d8MubAMdvsZVy2W57F8Nv1f7676DtjQnzersGLDqfl/uFo4EnVN9mEzF0OQuxTaXz5ZGZySIZeB0QQ243Iz0srNqaHrmDThAaHJvBYe+eEh1FUtbn1tsW2dojswbaHCXqJbH4d70wB8tpyzGF2Ztn7X91L3GZnB5OPNZrYc9ZSzdj2wY2OXayC6fYDKi9oeYpRdc0mXUQJHDywridWxYrTWuTfCuM1janngo8wbyyMkK4mV0SK3NnlJw6Yp+y7wBTmewZp9XS0G05FWCQzyVRP/c97WdRp/NflGzjPXhCzhMlvbBzCfbcxDLwFAibPuhnZEPam0zd9rW/K3NuIG+OXsv1tvoMN7FgwjoJo7lVbCCCSYiSpsVA1fC3bZq//jYY7U/661lfbws2safgovtfxiYH8fFiS71kq2UvYbRu6qHlzv9aMuvsh1EPJVEc+g+nke/ggv7QrOeDJwwq1BnBODWHOiZC2FyIYZbkd9Tp8URz3ZUuPxwaTqKHV6lWY7ZxYTqOB2RXnVfSIe0bmT/EwThEIRDEA5BOAThEIRDEA5BOAThEIRDEA5BOLTWAfwrvwAqNtJOcTGQSwAAAABJRU5ErkJggg=="
  ),
  muzvox: pngDataUri(
    "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"
  ),
  migu: pngDataUri(
    "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"
  ),
  bilibili: pngDataUri(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAPlElEQVR4nN2b/5NcxXHAPzNv3u7ene7OJ5CEhDAHopDhECkjgYuYEMmOy7+ATSpIldiOQ2JSVPKLf8gfIOkPyA/JD6nCgIPBJi6dq0IZKqlKBVAol118OQWfdAhZFjkECCSCxJ20d7v73sykeubt3p60910yR1ra2r15Mz3dPT09Pd39YLGw1+t5n3uvOHCktGC/lYDgljlkroX6LRLUgj1kMqV86+9/Gh2gzAAlXcEqBWmNtHyWb19/bhYB+5XjcsLFOH/yzgBZfS1kFRpAYqepc46/vf3cnLR3ADPvpFHSIk0b/n76N31k9h60/QNyrkfLs/x98vxlHj3xAo9smQj91h5P8b6x0OSLBqHjH4+nQD38/eiJfvLqLpS+F89mUkQw71BRL/P0b/6LP795ship8d7NR4eaZ1qF93CQhIM4hsa6scnt1P33SPT9lLrWIQowfX4Cz3+ikmH89C946IvvtxGui8mXKwhVrOLMyj/539eiuu7B290o9Ud09fYHOuvV/8XZn1NOniCxo4wNTbETzU5soHMOGnTneX1zYh8QDI6XuGBvoMHdwJ2Y0jq0BpuDTvqBXTj3CEnpQZ767foWmoPjJfbuXXibzQUyVnA0QXDLHDKXzKl1PzYj0JKWrwZ9Z6BRaBWaI/M+anJnu6HnnHx4OA4QBD1Vg0mvwbutwGZMCnkjo16bxllHqWst+HtxfBNqX+PxkU1h7K4bauzf74ImLMbezIAsgA5jBYdAwFn7WpzD3xvmlLmFhryeBZpQm/FsReuN9HSbluo3eVmSANph8hOFtxoV/olEm2MTvDDmIS0leL8Dpx6mVHmQp95YviZcsvJvrA84BbfMIXPJnGHuQIPsdVDeo7wmNYrJs4uaz8z7VFRneFhzrmKpqNPk/A/KnwO1Fp0koY/SlqwB3ilMuZescY+ICGU+5vGjL/HwLadaq3jgQMLYbg/7iJ92KNqGhhV79lj2729bebMLzwN47iEtG/KGRWmP0kJj0qIFoS3QeAb7ORvm273bMTy8TAH8YMTAjSkXGp5K97t4fo3yJ2nUtlAqQ6ITnIheLK38k1MxNeTZDrxSGHc1j43+lL++/XQQ5n/8usLgQcvktz19B2evkLTlw5r+m2U1p4L6Bi1KH8Txx8D2gFvmkLmCTVOaRKtgAxrhgDiJU2+QcZIL73i4scwPRjIGwimxSAH4wvjtCUeffLLiyTR//8sXWTuwDlefJG/cAaxHJ+Ww+ihPnlmRBaYUNUFYTBPRhBdR6hRQZbHw9Jsb8e4rMytfaq58YU6ETq2wtk518iO8P4Qy/8rZcy/yd78/3RFnB79AXeJsbBpJOHXes39X3pkyr3jyyE7Q3wP1VRQb4moIYS4oP2lZBUHY7DyeEeBZlPoxf3Hrx4ti/sCRtdTUd8LKK7aTpL2B8awu2D1oRVjUoAin8fZFvHqCvxp6KSxEJ9j7kmFTr+LUdtvuUJmLpCMP4sN/+Lcy6aZ+1lR6aNR6MKabROfoY1O4UjfOyphCE1VU/8C+cuSiNJ5AeJ5/OdDk/AV++NYoOlekOiFzFpvPLEClpEObM55pvw3l4sqb1GBzG5gN53mgU4VTzUdrHISj025+cmwr7s1utDNkqopOprhQq5KdmuD7u+qdNMG0GobH5BwRpzJC9+atGH0H3n4Bk14Haj1WiYcnW74LkKNuIBATcRQa1Tpv47cxKXm+A8014CaDpuSyi7UnSWcEIPoW2kT+vg+nNpOa5gIlM9JuzRUF7/0Aij+E/CasmkZ2o9UZ+DN4+y5d5i3SzYeA0dZcwqv3mQhhxuEJqucTpseuRemtZO5uEu5A6S8Ed7NU6aHSDaUKuBymq9CoETShE4TVUWIcwaQJlR45KotnHbyC9jY5VWpVok0JD8Wj7Hys6STS1NUD2kSaalPyXUXxHt69heUQqf4V3h2ja+h99qhItPfKMBK0IBq6qSODKPOn4L6K0TeA/xywhiSJ1jdvRO9P9reoeXMlOkEgWBygsEpx7FzCuhia20tWXs72wpedQ9CRFhGYEkVxsXuS9ODsFpTagFG/B34nJC8wdeSnwIkwdgSjWgbiuuuvRVcfwCTfITE7KHWL0RFDBtblKC/Uyy4XQyQbMjogokXzgVfS34GML4xPp1varLYguKXjb9EmplIlJNqQpOImQ2NKFu91cvtjXM+zvPvO+2Lo4x7b2reerPYnOP4SpW4KkpSVDisRehT7XAgM/8Xjsig5JhdwuFo8FX5baOtgqdvblou/JZAgtHBeBB6EF+FJudtQ7mGSumHrNf8CnDI8frQX527C+1309N8W9/d0IzgX3kV3V/awfGS/zaONqwJkSwjTsi3yzOOsxVqHc9DVXaHccxtTk7vI1Os8fvS8wbgv4vx2UIOUu6IBUWKqxfAIRjniwm1LjFkUQCcj9mlDk6amTbC2zQ4FXlzgQ3icmrwe5e7AKG9QfAnvb8WrPvIsx2bxgiTenU4Uznmy+iRZ/bQ4rOGcb+7XRURcrjzjF9ESb559IA4afWitcVYMqdgzR94QK9mLYhveBd/6TrzehKKXrJ5gbdw/4mYK8yjx3l5F+edw7jCoDJ0qXOZDSCyRPp8iNGlo0uR9itbb8Op+4C6cuyrwIpcm4S2ri1b04bgZrXsNzt+CYg2oEo2GwuUekxYXjIaEll5F8Sxd/jn2bPuQzwIcOHKCaVX4EOrLpKV+nFPBJkRTLA7JtXj6RV0+H7w8RTmoiiIPe70kzp4/Df550vLP2XPbZ4N5AaFVaBbahQfhJdqvvOCxDGodiusMqJ7ovqrmBcOSJGnw2pSawNlRvrVF9j8cOL2G6lRxSRovZhuEsx8ortsM585E0ziw3vPue7B2o5/pt1xYLP7B+CWRoD0bLgSa//nwKDqZCLyIGyIB0mgtJX5QkTPUoMMBGa1nuAxFE1BYe4fyMTAR4IRlvJ7DTteacAhF42NN1SYMFEGgqvWsKVl6Bh1jgyuzEUvCf1AzVJ45n4T2wEOLpyJAq+RUCHybYOiax90l4DXepLzkDQf3Oap1H5i/NObfHje4ErA4/Hs9VA969u7V7NynGT+ahhBZJwg+rRNXM4RYOp/qIjHlXIiuSoDyUiyL8AYW02clYzv0EVpDRNjNlxMI1+r5Q2LNY2ZOJNKu4NHX+qmYDdiKhMghqU1Qy0/zyJ0TcwYoFgUrwC80PzEmOj4vmAVpSNqvfIMxaNkEcT6eOioh8S/h/H3oXMJk4MwhKunz/GjsFb57y9mWAKOzEn7NxXFhi/yy8Att1Tsvol2tUAAXw403zqTKhkf68GvuguwBlL6P/nUbQ/vER5/HOwOpZ3jkl9IS+8e4GfNB7LM8/ELbYZYEekm9exLF4fNFCFrCpN0bUO5+SL6BKW2kPkX4yG9pk2fSpwljY8m8+QF5Jn2Wi19oExqXAJqlQqO3bYwSn/t2egc2INGr2tRk+MhvaZNnsU8BHy1ivo+Wj38WbYsDvaTeTUekRZ+TEEwl5ggkpChnK0n4LW3yLPQpILgOFydE2mFfy71YFv5ONC4AmpVASIpoCS5KfCzG/6KNk9+Stcxin1WKn5UK4P8BmBWN1hLwdBJilptG2+EW0jcaXBr6rFb8LFUD5BLSDl5L2KUW8nIhGVKk0ySQ2ggphnrsU8D4ImzA+Arwd6Lxsm+B0vm2c9xLvGCUC+dOh8BjpbuPSpdEljznz8kN8nDRp4B1i6gbWrd8/LNouxICqFrPtt4ZiXdNxXgB7jls/kFInJS7JQp7Cmefw6nn6CrHq7TA0JDcKeZeIXkmfZaLX2gTGq+oDXj77Rkp794+yTMjr+K6Fc5nfHLmDnTi8PYQ+H+nZF5h95aZFdq9gBd4cZ+l4g+0XTX7WLy8AhgnFjgUEIOQHzP89i+Yrh8nMf1kslf1J2TTZ3ho22QRnZ/pPz9IcpVl4xfaBg/+Dk8BWlHhiZY/3g5SyhSjTX514melfsBiJl7pdfhK4melGtBMrYsgxxKqhR/fI5Z8yIb9vNK8wRXGbxbsEcph54G4T4Ugx77i8r2vmVG8DEmTleAX2i9LQMQvkAGaeRa/93N5YTn4heYfjS0iIOKlti7O0hGJ1AdKuezevZe3+PlKwdmPVAiKHpTaQcnuzC8Bg5aCo7ayk1kgFR4qY5eKuYADX1chTH0lS+JXAkIbm2HPHhcCo0+/2cDO6XsUNUIu5OGLfLqoevEshtM0TlVmxmxJqI6n8c6+0oTH5YbBWITX0zfjCGW2QhLy/EWJUeAv5P3xYVGtAS+1JWILSrHgJiQRY52O9/1os43HRn8bih0l4/JZgWdObKDRkAxwf+BFagaU3CJDDl0WfRpPSIWfjBVV1EM63COVntCQWkO1Adx9pOZ+nhmdib2tdnh6fCNZ/Rsg8UQ2UJ9u1jTJlpdvuUp+jJIKEcVbwEbw/ZRK3WSSHs3EJY1pZNRdQYUaOuGHhw+jVT47Pb6yiMyKQeIBEhVq0qRMCVvbBtyH5y6U6iu02ZMYRVryWCsNH+L5wOB4Dc0todQ8LffirMbmDu+kJEZqBK4G7gm1Q4mWi4fH5UWdXyhX/XQF4AoamjSFsh5ZODagpEBCBBQKJCTpqylVLLXpSbw7DuqowdlX0FoMwg6M1OPKZaPuCmSiCTrk18vd/RjJGM9R5/epl8a0l8g0CGofVz6Wxkh7kmpMKn+cR6lRcjdi8KlcLWXkV6hP3xbq7GJGNb7oIMlFKTAKJXMLF22tmiIpoTlWtIkAhJdYQyh5Be9PovQIPjkU2Xnm6Cbq/BnYhzDmJpK0Eg6EUNzoBKFYzRwvWeFWmeqnq/oXQ+tVunA51MGYy3sEYvREc0O5XFYjy06AfpKKfoZv3XIqOjTHPjyDLf8M7x/HuyOhmCAx8V2cwk1q4l6VzLfT1Ja5DL/FzxNeZPWdHQP9GPXGzwLPiCP0uk/ZIXF33uHJw8/j1ZpQ5j41eQMgpbK9JMaEev1Qlb06ncAWiMYKs/Hstzg3SZZNgB/H8wI6fZ6/GYpe3Os+nbtY2nI3yu9AqVvBX0ulp4IpyxshrGqQiFFel9rhGqj38e5NvH6dxPwK3+hQLK2KGjspId+jxEE4GT5PvnUaZ99D+eNotZna9FX4ahcqlMyvTlMYeclQejqU9zn/Hs6/SaJf47s3z5TLy+u3u4dCubyZNbAdJvQxuhunKeuXyXUXmlI4R+PbY6sUJJOWOKx3ONXAuGlyf54L+pNZ3QrmmRUPkIb2V2a+f7O8YSEh55mw82cZ2l+ZaX8T9RJYrep9OaADb2rOjhKHOzeiqfVp+lLVKjxYYvr5dw7N1JgkSCYzT2XSMbDdzRU//D+axDWna2KWRAAAAABJRU5ErkJggg=="
  )
};

// src/provider-icons.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function LocalIcon(props) {
  const { theme } = (0, import_react_native_unistyles3.useUnistyles)();
  const sm = props.size === "sm";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react_native3.View, { style: sm ? styles3.tileSm : styles3.tile, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react_native4.HardDrive, { size: sm ? 12 : 18, color: theme.colors.accent }) });
}
function OfficialIcon(props) {
  const source = LOCAL_PROVIDER_ICON_SOURCES[props.providerId];
  if (!source) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LocalIcon, { size: props.size });
  }
  const sm = props.size === "sm";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react_native3.View, { style: sm ? styles3.tileSm : styles3.tile, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    import_react_native3.Image,
    {
      source,
      style: sm ? styles3.iconSm : styles3.icon,
      resizeMode: "contain",
      accessibilityIgnoresInvertColors: true
    }
  ) });
}
function MusicProviderBrandIcon(props) {
  const size = props.size ?? "md";
  if (props.providerId === "local") {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LocalIcon, { size });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(OfficialIcon, { providerId: props.providerId, size });
}
var tileBase = {
  alignItems: "center",
  justifyContent: "center",
  // 中性底，不盖品牌色；官方标本身自带颜色
  backgroundColor: "rgba(255,255,255,0.06)",
  overflow: "hidden"
};
var styles3 = import_react_native3.StyleSheet.create({
  tile: {
    ...tileBase,
    width: 44,
    height: 44,
    borderRadius: 12
  },
  tileSm: {
    ...tileBase,
    width: 18,
    height: 18,
    borderRadius: 5
  },
  icon: {
    width: 28,
    height: 28
  },
  iconSm: {
    width: 14,
    height: 14
  }
});

// src/search-view.tsx
init_store();
init_music_host();

// src/search-menu-surfaces.ts
var import_react4 = require("react");
init_music_ids();
init_music_host();
init_track_menu();
var MUSIC_SEARCH_HIT_MENU_ID = "search-hit";
var MUSIC_SEARCH_COLLECTION_MENU_ID = "search-collection";
var MUSIC_SEARCH_MENU_SURFACE = {
  results: "results"
};
function defaultAllOverflowLayout(knownIds) {
  return {
    bar: [],
    overflow: [...knownIds],
    hidden: [],
    showBarLabels: false
  };
}
function menuConfig(kind) {
  if (kind === "hit") {
    return {
      menuId: MUSIC_SEARCH_HIT_MENU_ID,
      knownIds: MUSIC_SEARCH_HIT_MENU_IDS,
      title: "\u7F16\u8F91\u641C\u7D22\u6B4C\u66F2\u83DC\u5355",
      items: MUSIC_SEARCH_HIT_MENU_IDS.map((id) => ({
        id,
        label: MUSIC_SEARCH_HIT_MENU_ACTION_LABELS[id],
        icon: MUSIC_SEARCH_HIT_MENU_ICONS[id],
        canHide: true
      }))
    };
  }
  return {
    menuId: MUSIC_SEARCH_COLLECTION_MENU_ID,
    knownIds: MUSIC_SEARCH_COLLECTION_MENU_IDS,
    title: "\u7F16\u8F91\u641C\u7D22\u5408\u96C6\u83DC\u5355",
    items: MUSIC_SEARCH_COLLECTION_MENU_IDS.map((id) => ({
      id,
      label: MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS[id],
      icon: MUSIC_SEARCH_COLLECTION_MENU_ICONS[id],
      canHide: true
    }))
  };
}
function readLayout(hostApi2, kind, surfaceId = MUSIC_SEARCH_MENU_SURFACE.results) {
  const config = menuConfig(kind);
  return hostApi2.ui.getEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: config.menuId,
    surfaceId,
    knownIds: config.knownIds
  });
}
var layoutCache = /* @__PURE__ */ new Map();
function layoutsEqual(a, b) {
  if (a === b) {
    return true;
  }
  if ((a.showBarLabels ?? false) !== (b.showBarLabels ?? false)) {
    return false;
  }
  const same = (left, right) => left.length === right.length && left.every((id, index) => id === right[index]);
  return same(a.bar, b.bar) && same(a.overflow, b.overflow) && same(a.hidden ?? [], b.hidden ?? []);
}
function cachedLayout(cacheKey, layout) {
  const prev = layoutCache.get(cacheKey);
  if (prev && layoutsEqual(prev, layout)) {
    return prev;
  }
  layoutCache.set(cacheKey, layout);
  return layout;
}
function seedMusicSearchMenuLayouts(hostApi2) {
  for (const kind of ["hit", "collection"]) {
    const config = menuConfig(kind);
    hostApi2.ui.seedEntityMenuLayoutIfAbsent({
      appId: MUSIC_APP_ID,
      menuId: config.menuId,
      surfaceId: MUSIC_SEARCH_MENU_SURFACE.results,
      knownIds: config.knownIds,
      layout: defaultAllOverflowLayout(config.knownIds)
    });
  }
}
function openMusicSearchMenuLayoutEditor(hostApi2, kind) {
  const config = menuConfig(kind);
  hostApi2.ui.customizeEntityMenuLayout({
    appId: MUSIC_APP_ID,
    menuId: config.menuId,
    surfaceId: MUSIC_SEARCH_MENU_SURFACE.results,
    title: config.title,
    items: config.items,
    defaultLayout: defaultAllOverflowLayout(config.knownIds)
  });
}
function useMusicSearchMenuLayout(kind) {
  const surfaceId = MUSIC_SEARCH_MENU_SURFACE.results;
  const config = menuConfig(kind);
  const cacheKey = `${MUSIC_APP_ID}:${config.menuId}:${surfaceId}`;
  const subscribe = (0, import_react4.useCallback)(
    (onStoreChange) => {
      try {
        return getMusicHostApi().ui.subscribeEntityMenuLayout(
          {
            appId: MUSIC_APP_ID,
            menuId: config.menuId,
            surfaceId
          },
          onStoreChange
        );
      } catch {
        return () => {
        };
      }
    },
    [config.menuId, surfaceId]
  );
  const getSnapshot = (0, import_react4.useCallback)(() => {
    try {
      return cachedLayout(cacheKey, readLayout(getMusicHostApi(), kind, surfaceId));
    } catch {
      return cachedLayout(cacheKey, defaultAllOverflowLayout(config.knownIds));
    }
  }, [cacheKey, config.knownIds, kind, surfaceId]);
  const layout = (0, import_react4.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  const openEditLayout = (0, import_react4.useCallback)(() => {
    try {
      openMusicSearchMenuLayoutEditor(getMusicHostApi(), kind);
    } catch {
    }
  }, [kind]);
  return { layout, openEditLayout };
}
function useMusicSearchHitMenuLayout() {
  return useMusicSearchMenuLayout("hit");
}
function useMusicSearchCollectionMenuLayout() {
  return useMusicSearchMenuLayout("collection");
}

// src/search-view.tsx
init_music_ids();
init_track_menu();
var import_jsx_runtime4 = require("react/jsx-runtime");
var SCOPES = [
  { id: "all", label: "\u7EFC\u5408" },
  { id: "track", label: "\u6B4C\u66F2" },
  { id: "artist", label: "\u6B4C\u624B" },
  { id: "album", label: "\u4E13\u8F91" },
  { id: "playlist", label: "\u6B4C\u5355" }
];
var SEARCH_FETCH_SCOPE = "all";
function collectionKindLabel(kind) {
  if (kind === "artist") {
    return "\u97F3\u4E50\u4EBA";
  }
  if (kind === "album") {
    return "\u4E13\u8F91";
  }
  return "\u6B4C\u5355";
}
function formatDebugUrlDisplay(url) {
  try {
    return decodeURIComponent(url.replace(/\+/g, " "));
  } catch {
    return url;
  }
}
function SearchDebugUrls(props) {
  if (typeof __DEV__ === "undefined" || !__DEV__ || !props.visible || props.requests.length === 0) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.debugUrlCard, testID: "music-search-debug-urls", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.debugUrlHeading, children: "\u5F00\u53D1\uFF1A\u5B9E\u9645\u722C\u866B\u8BF7\u6C42" }),
    props.requests.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.debugUrlBlock, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.debugUrlLabel, children: getMusicPlatformLabel(item.providerId) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        import_react_native4.Text,
        {
          style: styles4.debugUrlText,
          selectable: true,
          accessibilityLabel: `${getMusicPlatformLabel(item.providerId)} \u722C\u866B\u5730\u5740`,
          children: formatDebugUrlDisplay(item.url)
        }
      ),
      item.note ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.debugUrlNote, children: item.note }) : null
    ] }, `${item.providerId}:${index}:${item.url}`))
  ] });
}
function SpinningRefreshIcon(props) {
  const spin = (0, import_react5.useRef)(new import_react_native4.Animated.Value(0)).current;
  (0, import_react5.useEffect)(() => {
    if (!props.spinning) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    spin.setValue(0);
    const loop = import_react_native4.Animated.loop(
      import_react_native4.Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: import_react_native4.Easing.linear,
        useNativeDriver: true
      })
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [props.spinning, spin]);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Animated.View, { style: { transform: [{ rotate }] }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.RefreshCw, { size: props.size ?? 16, color: props.color }) });
}
function SearchProviderErrors(props) {
  if (props.errors.length === 0) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.errorCard, testID: "music-search-provider-errors", children: props.errors.map((item) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.Text, { style: styles4.errorText, children: [
    getMusicPlatformLabel(item.providerId),
    "\uFF1A",
    item.message
  ] }, `${item.providerId}:${item.message}`)) });
}
function SearchResultsBody(props) {
  const showTracks = props.scope === "all" || props.scope === "track";
  const showArtists = props.scope === "all" || props.scope === "artist";
  const showAlbums = props.scope === "all" || props.scope === "album";
  const showPlaylists = props.scope === "all" || props.scope === "playlist";
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.sections, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SearchDebugUrls,
      {
        requests: props.page?.debugSearchRequests ?? [],
        visible: props.debugPanelOpen
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SearchProviderErrors, { errors: props.page?.providerErrors ?? [] }),
    showTracks ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SongTableSection,
      {
        tracks: props.page?.tracks ?? [],
        hasMore: props.page?.hasMore,
        loadingMore: props.loadingMore,
        onSelect: props.onSelect,
        onPlayNext: props.onPlayNext,
        onEnqueue: props.onEnqueue,
        onSave: props.onSave,
        onLoadMore: props.onLoadMore
      }
    ) : null,
    showArtists ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SearchSectionCard, { title: "\u97F3\u4E50\u4EBA", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ArtistList,
      {
        artists: props.derivedArtists,
        onOpen: props.onOpenArtist,
        onPlayAll: props.onPlayArtist,
        onEnqueue: props.onEnqueueArtist
      }
    ) }) : null,
    showAlbums ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SearchSectionCard, { title: "\u4E13\u8F91", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      AlbumList,
      {
        albums: props.derivedAlbums,
        onOpen: props.onOpenAlbum,
        onPlayAll: props.onPlayAlbum,
        onEnqueue: props.onEnqueueAlbum
      }
    ) }) : null,
    showPlaylists ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SearchSectionCard, { title: "\u6B4C\u5355", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      PlaylistList,
      {
        playlists: props.page?.playlists ?? [],
        onOpen: props.onOpenPlaylist,
        onPlayAll: props.onPlayPlaylist,
        onEnqueue: props.onEnqueuePlaylist
      }
    ) }) : null
  ] });
}
function CollectionDetailBody(props) {
  const kindLabel = collectionKindLabel(props.collection.kind);
  const hasTracks = props.tracks.length > 0;
  const empty = !hasTracks;
  const hint = collectionTrackSourceHint({
    kind: props.collection.kind,
    source: hasTracks ? "local" : "empty",
    derived: props.collection.derived,
    title: props.collection.title,
    empty
  });
  const countSuffix = collectionTrackCountSuffix("local");
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.sections, testID: "music-search-collection-detail", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.sectionCard, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.collectionHeader, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.collectionCoverWrap, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            MediaCoverThumb,
            {
              coverUrl: props.collection.coverUrl,
              sizeStyle: "square",
              size: Math.round(SQUARE_COVER_SIZE * 0.75)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.squarePlatformBadge, pointerEvents: "none", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MusicProviderBrandIcon, { providerId: props.collection.providerId, size: "sm" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.collectionMeta, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.collectionKind, children: kindLabel }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.collectionTitle, numberOfLines: 2, children: props.collection.title }),
          props.collection.subtitle ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.collectionSubtitle, numberOfLines: 1, children: props.collection.subtitle }) : null,
          hasTracks ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.Text, { style: styles4.collectionCount, children: [
            props.tracks.length,
            " \u9996",
            countSuffix
          ] }) : null,
          hasTracks ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.collectionActions, children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              import_react_native4.Pressable,
              {
                accessibilityRole: "button",
                accessibilityLabel: "\u64AD\u653E\u5168\u90E8",
                onPress: props.onPlayAll,
                style: styles4.collectionActionBtn,
                testID: "music-search-collection-play-all",
                children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.collectionSearchCtaText, children: "\u64AD\u653E\u5168\u90E8" })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              import_react_native4.Pressable,
              {
                accessibilityRole: "button",
                accessibilityLabel: "\u52A0\u5165\u961F\u5217",
                onPress: props.onEnqueueAll,
                style: styles4.collectionActionBtn,
                testID: "music-search-collection-enqueue-all",
                children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.collectionActionBtnMuted, children: "\u52A0\u5165\u961F\u5217" })
              }
            )
          ] }) : null
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.collectionHint, children: hint }),
      empty ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.collectionEmptyActions, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.emptyBlock, children: "\u5F53\u524D\u641C\u7D22\u7ED3\u679C\u91CC\u6682\u65E0\u5339\u914D\u6B4C\u66F2" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          import_react_native4.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: `\u641C\u7D22 ${props.collection.title}`,
            onPress: props.onSearchName,
            style: styles4.collectionSearchCta,
            testID: "music-search-collection-research",
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.Text, { style: styles4.collectionSearchCtaText, children: [
              "\u641C\u7D22\u300C",
              props.collection.title,
              "\u300D"
            ] })
          }
        )
      ] }) : null
    ] }),
    hasTracks ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SongTableSection,
      {
        tracks: props.tracks,
        hasMore: props.hasMore,
        loadingMore: props.loadingMore,
        onSelect: props.onSelect,
        onPlayNext: props.onPlayNext,
        onEnqueue: props.onEnqueue,
        onSave: props.onSave,
        onLoadMore: props.onLoadMore
      }
    ) : null
  ] });
}
function SearchConditionChips(props) {
  const {
    history,
    onSelectHistory,
    onRemoveHistory,
    filterPlatforms,
    selectedProviderIds,
    sourcesOpen,
    onToggleSourcesOpen,
    onCloseSources,
    onToggleProvider,
    onInteract
  } = props;
  const { theme } = (0, import_react_native_unistyles4.useUnistyles)();
  const muted = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;
  const [armedQuery, setArmedQuery] = (0, import_react5.useState)(null);
  const rowRef = (0, import_react5.useRef)(null);
  const selectedPlatforms = (0, import_react5.useMemo)(
    () => filterPlatforms.filter((platform) => selectedProviderIds.includes(platform.id)),
    [filterPlatforms, selectedProviderIds]
  );
  (0, import_react5.useEffect)(() => {
    if (!armedQuery && !sourcesOpen || typeof document === "undefined") {
      return;
    }
    const dismiss = (event) => {
      const node = rowRef.current;
      if (node?.contains(event.target)) {
        return;
      }
      setArmedQuery(null);
      onCloseSources();
    };
    const timer = setTimeout(() => document.addEventListener("pointerdown", dismiss), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [armedQuery, sourcesOpen, onCloseSources]);
  const handleChipPress = (0, import_react5.useCallback)(
    (query) => {
      if (armedQuery === query) {
        onRemoveHistory(query);
        setArmedQuery(null);
        return;
      }
      if (armedQuery) {
        setArmedQuery(null);
        return;
      }
      onSelectHistory(query);
    },
    [armedQuery, onRemoveHistory, onSelectHistory]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_react_native4.View,
    {
      ref: rowRef,
      collapsable: false,
      style: styles4.conditionChipsRoot,
      testID: "music-search-provider-picker",
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.chipWrapRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          import_react_native4.Pressable,
          {
            accessibilityRole: "button",
            accessibilityState: { expanded: sourcesOpen },
            accessibilityLabel: `\u6765\u6E90\uFF0C\u5DF2\u9009 ${selectedPlatforms.map((item) => item.label).join("\u3001") || "\u65E0"}`,
            onPressIn: onInteract,
            onPress: onToggleSourcesOpen,
            style: [
              styles4.historyChip,
              styles4.sourceSummaryChip,
              sourcesOpen ? styles4.sourceChipOpen : null
            ],
            testID: "music-search-provider-summary",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.historyChipText, children: "\u6765\u6E90" }),
              selectedPlatforms.map((platform) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MusicProviderBrandIcon, { providerId: platform.id, size: "sm" }, platform.id)),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                import_lucide_react_native5.ChevronDown,
                {
                  size: 12,
                  color: muted,
                  style: sourcesOpen ? styles4.providerChevronOpen : void 0
                }
              )
            ]
          }
        ),
        sourcesOpen ? filterPlatforms.map((platform) => {
          const selected = selectedProviderIds.includes(platform.id);
          return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            import_react_native4.Pressable,
            {
              accessibilityRole: "button",
              accessibilityState: { selected },
              accessibilityLabel: `${platform.label}${selected ? "\u5DF2\u9009" : "\u672A\u9009"}`,
              onPressIn: onInteract,
              onPress: () => onToggleProvider(platform.id),
              style: [styles4.historyChip, selected ? styles4.sourcePickChipSelected : null],
              testID: `music-search-provider-${platform.id}`,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MusicProviderBrandIcon, { providerId: platform.id, size: "sm" }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  import_react_native4.Text,
                  {
                    style: [
                      styles4.historyChipText,
                      selected ? { color: accent, fontWeight: theme.fontWeight.medium } : null
                    ],
                    numberOfLines: 1,
                    children: platform.label
                  }
                )
              ]
            },
            `pick-${platform.id}`
          );
        }) : history.map((query) => {
          const armed = armedQuery === query;
          return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            import_react_native4.Pressable,
            {
              accessibilityRole: "button",
              accessibilityLabel: armed ? `\u518D\u6B21\u70B9\u51FB\u5220\u9664\u641C\u7D22\u8BB0\u5F55 ${query}` : `\u641C\u7D22 ${query}\uFF0C\u957F\u6309\u8FDB\u5165\u5220\u9664`,
              delayLongPress: 320,
              onPressIn: onInteract,
              onLongPress: () => setArmedQuery(query),
              onPress: () => handleChipPress(query),
              style: [styles4.historyChip, armed ? styles4.historyChipArmed : null],
              testID: armed ? `music-search-history-armed-${query}` : `music-search-history-${query}`,
              children: [
                armed ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.Trash2, { size: 12, color: theme.colors.foreground }) : null,
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  import_react_native4.Text,
                  {
                    style: [styles4.historyChipText, armed ? styles4.historyChipTextArmed : null],
                    numberOfLines: 1,
                    children: query
                  }
                )
              ]
            },
            query
          );
        })
      ] })
    }
  );
}
function MusicSearchView(props) {
  const { theme, rt } = (0, import_react_native_unistyles4.useUnistyles)();
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const muted = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;
  const searchHistory = useMusicDemoStore((state) => state.searchHistory);
  const pushSearchHistory = useMusicDemoStore((state) => state.pushSearchHistory);
  const removeSearchHistory = useMusicDemoStore((state) => state.removeSearchHistory);
  const searchProviderIds = useMusicDemoStore((state) => state.searchProviderIds);
  const toggleSearchProviderId = useMusicDemoStore((state) => state.toggleSearchProviderId);
  const lastSearchCache = useMusicDemoStore((state) => state.lastSearchCache);
  const upsertSearchResultCache = useMusicDemoStore((state) => state.upsertSearchResultCache);
  const clearSearchResultCache = useMusicDemoStore((state) => state.clearSearchResultCache);
  const persistedDraft = useMusicDemoStore((state) => state.searchDraft);
  const persistedScope = useMusicDemoStore((state) => state.searchScope);
  const persistedScrollY = useMusicDemoStore((state) => state.searchResultsScrollY);
  const setSearchDraft = useMusicDemoStore((state) => state.setSearchDraft);
  const setSearchScope = useMusicDemoStore((state) => state.setSearchScope);
  const setSearchResultsScrollY = useMusicDemoStore((state) => state.setSearchResultsScrollY);
  const activeCollection = useMusicDemoStore((state) => state.searchActiveCollection);
  const setSearchActiveCollection = useMusicDemoStore((state) => state.setSearchActiveCollection);
  useMusicDemoStore((state) => state.tracks);
  const searchCollectionReturnScrollY = useMusicDemoStore(
    (state) => state.searchCollectionReturnScrollY
  );
  const setSearchCollectionReturnScrollY = useMusicDemoStore(
    (state) => state.setSearchCollectionReturnScrollY
  );
  const [draft, setDraftState] = (0, import_react5.useState)(() => persistedDraft || lastSearchCache?.query || "");
  const [submittedQuery, setSubmittedQuery] = (0, import_react5.useState)(
    () => lastSearchCache?.query || persistedDraft || ""
  );
  const [searchEpoch, setSearchEpoch] = (0, import_react5.useState)(0);
  const [forceRefreshToken, setForceRefreshToken] = (0, import_react5.useState)(0);
  const forceNextSearchRef = (0, import_react5.useRef)(false);
  const [scope, setScopeState] = (0, import_react5.useState)(
    () => persistedScope || lastSearchCache?.scope || "all"
  );
  const [page, setPage] = (0, import_react5.useState)(() => lastSearchCache?.page ?? null);
  const [loadingPhase, setLoadingPhase] = (0, import_react5.useState)("idle");
  const [loadingMore, setLoadingMore] = (0, import_react5.useState)(false);
  const [resolvingPlay, setResolvingPlay] = (0, import_react5.useState)(false);
  const [debugPanelOpen, setDebugPanelOpen] = (0, import_react5.useState)(false);
  const restoredCacheRef = (0, import_react5.useRef)(Boolean(lastSearchCache?.query && lastSearchCache.page));
  const [sourcesOpen, setSourcesOpen] = (0, import_react5.useState)(false);
  const [inputFocused, setInputFocused] = (0, import_react5.useState)(false);
  const inputBlurTimerRef = (0, import_react5.useRef)(null);
  const chipsInteractingRef = (0, import_react5.useRef)(false);
  const sourcesOpenRef = (0, import_react5.useRef)(false);
  const resultsScrollRef = (0, import_react5.useRef)(null);
  const restoreScrollOnceRef = (0, import_react5.useRef)(true);
  const skipScrollPersistRef = (0, import_react5.useRef)(false);
  const liveScrollYRef = (0, import_react5.useRef)(persistedScrollY);
  const loadedQueryRef = (0, import_react5.useRef)(
    lastSearchCache?.query?.trim() && lastSearchCache.page ? lastSearchCache.query.trim().toLowerCase() : ""
  );
  const scrollPersistTimerRef = (0, import_react5.useRef)(null);
  const shouldAutoFocus = !persistedDraft && !lastSearchCache?.query;
  const setDraft = (0, import_react5.useCallback)(
    (value) => {
      setDraftState(value);
      setSearchDraft(value);
    },
    [setSearchDraft]
  );
  const setScope = (0, import_react5.useCallback)(
    (next) => {
      setSearchActiveCollection(null);
      setScopeState(next);
      setSearchScope(next);
      setSearchResultsScrollY(0);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [setSearchActiveCollection, setSearchResultsScrollY, setSearchScope]
  );
  const filterPlatforms = (0, import_react5.useMemo)(() => listSearchFilterPlatforms(), []);
  const showConditionChips = !isCompact || inputFocused || sourcesOpen;
  sourcesOpenRef.current = sourcesOpen;
  const applyCachedPage = (0, import_react5.useCallback)(
    (text, cachedPage) => {
      const normalized = text.trim();
      loadedQueryRef.current = normalized.toLowerCase();
      setDraft(normalized);
      setSubmittedQuery(normalized);
      setPage(cachedPage);
      setLoadingPhase("idle");
      setSearchResultsScrollY(0);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
      pushSearchHistory(normalized);
    },
    [pushSearchHistory, setDraft, setSearchResultsScrollY]
  );
  const submitSearch = (0, import_react5.useCallback)(
    (nextDraft) => {
      const text = (nextDraft ?? draft).trim();
      if (!text) {
        setDraft("");
        setSubmittedQuery("");
        setPage(null);
        setSearchActiveCollection(null);
        return;
      }
      setSearchActiveCollection(null);
      const providerIds = useMusicDemoStore.getState().searchProviderIds;
      const ttl = useMusicDemoStore.getState().searchCacheTtlMinutes;
      const caches = useMusicDemoStore.getState().searchResultCaches;
      const cached = findMusicSearchCacheEntryForQuery(caches, { query: text, providerIds });
      if (cached?.page) {
        applyCachedPage(text, cached.page);
        if (isMusicSearchCacheFresh(cached, ttl)) {
          return;
        }
        loadedQueryRef.current = "";
        forceNextSearchRef.current = true;
        setSearchEpoch((epoch) => epoch + 1);
        return;
      }
      setDraft(text);
      setSubmittedQuery(text);
      loadedQueryRef.current = "";
      setSearchEpoch((epoch) => epoch + 1);
      setSearchResultsScrollY(0);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
      pushSearchHistory(text);
    },
    [
      applyCachedPage,
      draft,
      pushSearchHistory,
      setDraft,
      setSearchActiveCollection,
      setSearchResultsScrollY
    ]
  );
  const handleHistorySelect = (0, import_react5.useCallback)(
    (query) => {
      submitSearch(query);
    },
    [submitSearch]
  );
  const handleRefreshSearch = (0, import_react5.useCallback)(() => {
    const text = submittedQuery.trim() || draft.trim();
    if (!text) {
      return;
    }
    setSearchActiveCollection(null);
    const providerIds = useMusicDemoStore.getState().searchProviderIds;
    clearSearchResultCache({ query: text, scope: SEARCH_FETCH_SCOPE, providerIds });
    const caches = useMusicDemoStore.getState().searchResultCaches;
    for (const entry of caches) {
      if (entry.query.trim().toLowerCase() === text.toLowerCase()) {
        clearSearchResultCache({
          query: text,
          scope: entry.scope,
          providerIds: entry.providerIds
        });
      }
    }
    forceNextSearchRef.current = true;
    loadedQueryRef.current = "";
    setDraft(text);
    setSubmittedQuery(text);
    setForceRefreshToken((token) => token + 1);
    setSearchEpoch((epoch) => epoch + 1);
    pushSearchHistory(text);
  }, [
    clearSearchResultCache,
    draft,
    pushSearchHistory,
    setDraft,
    setSearchActiveCollection,
    submittedQuery
  ]);
  (0, import_react5.useEffect)(() => {
    let cancelled = false;
    const text = submittedQuery.trim();
    if (!text) {
      loadedQueryRef.current = "";
      setPage(null);
      setLoadingPhase("idle");
      return;
    }
    const normalized = text.toLowerCase();
    const providerIds = useMusicDemoStore.getState().searchProviderIds;
    const ttl = useMusicDemoStore.getState().searchCacheTtlMinutes;
    const caches = useMusicDemoStore.getState().searchResultCaches;
    const force = forceNextSearchRef.current;
    forceNextSearchRef.current = false;
    if (!force && loadedQueryRef.current === normalized) {
      setLoadingPhase("idle");
      return;
    }
    const cachedEntry = findMusicSearchCacheEntry(caches, {
      query: text,
      scope: SEARCH_FETCH_SCOPE,
      providerIds
    }) ?? findMusicSearchCacheEntryForQuery(caches, { query: text, providerIds });
    const cacheFresh = isMusicSearchCacheFresh(cachedEntry, ttl);
    if (!force && cacheFresh && cachedEntry?.page) {
      restoredCacheRef.current = false;
      loadedQueryRef.current = normalized;
      setPage(cachedEntry.page);
      setLoadingPhase("idle");
      return;
    }
    if (cachedEntry?.page) {
      setPage(cachedEntry.page);
    }
    if (restoredCacheRef.current && !force && !cachedEntry?.page && lastSearchCache?.query === text && lastSearchCache.page) {
      restoredCacheRef.current = false;
      loadedQueryRef.current = normalized;
      setPage(lastSearchCache.page);
      setLoadingPhase("idle");
      return;
    }
    restoredCacheRef.current = false;
    setLoadingPhase(cachedEntry?.page ? "verifying" : "searching");
    const host2 = tryGetMusicHostApi();
    const progress = host2 != null ? host2.ui.progress.create({
      title: "\u641C\u7D22\u97F3\u4E50",
      message: text,
      appId: MUSIC_APP_ID
    }) : null;
    void (async () => {
      try {
        if (!cachedEntry?.page) {
          setLoadingPhase("verifying");
        }
        const nextPage = await searchPlayableMusic(
          {
            text,
            scope: SEARCH_FETCH_SCOPE,
            providerIds,
            page: 1
          },
          {
            onPartial: (partial) => {
              if (cancelled) {
                return;
              }
              progress?.report({ message: "\u9A8C\u8BC1\u53EF\u64AD\u5730\u5740\u2026" });
              setPage(partial);
              setLoadingPhase("verifying");
            }
          }
        );
        if (!cancelled) {
          loadedQueryRef.current = normalized;
          setPage(nextPage);
          upsertSearchResultCache({
            query: text,
            scope: SEARCH_FETCH_SCOPE,
            providerIds: providerIds.slice(),
            page: nextPage,
            updatedAt: Date.now()
          });
          setLoadingPhase("idle");
          progress?.end({ kind: "success" });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingPhase("idle");
          progress?.end({
            kind: "error",
            message: error instanceof Error ? error.message : String(error)
          });
          host2?.ui.notification.show({
            title: "\u641C\u7D22\u5931\u8D25",
            message: error instanceof Error ? error.message : String(error),
            kind: "error"
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      progress?.end({ kind: "cancelled" });
    };
  }, [submittedQuery, searchEpoch, forceRefreshToken, upsertSearchResultCache]);
  const handleLoadMore = (0, import_react5.useCallback)(async () => {
    const text = submittedQuery.trim();
    if (!text || !page?.hasMore || loadingMore) {
      return;
    }
    const nextPageNum = Math.max(1, Math.floor(page.page ?? 1)) + 1;
    const providerIds = useMusicDemoStore.getState().searchProviderIds;
    setLoadingMore(true);
    const host2 = tryGetMusicHostApi();
    const progress = host2 != null ? host2.ui.progress.create({
      title: "\u52A0\u8F7D\u66F4\u591A",
      message: text,
      appId: MUSIC_APP_ID
    }) : null;
    try {
      progress?.report({ message: `\u7B2C ${nextPageNum} \u9875` });
      const more = await searchPlayableMusic({
        text,
        scope: SEARCH_FETCH_SCOPE,
        providerIds,
        page: nextPageNum
      });
      const merged = mergeSearchResultPages(page, more, nextPageNum);
      setPage(merged);
      upsertSearchResultCache({
        query: text,
        scope: SEARCH_FETCH_SCOPE,
        providerIds: providerIds.slice(),
        page: merged,
        updatedAt: Date.now()
      });
      progress?.end({ kind: "success" });
    } catch (error) {
      progress?.end({
        kind: "error",
        message: error instanceof Error ? error.message : String(error)
      });
      host2?.ui.notification.show({
        title: "\u52A0\u8F7D\u66F4\u591A\u5931\u8D25",
        message: error instanceof Error ? error.message : String(error),
        kind: "error"
      });
      throw error;
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, submittedQuery, upsertSearchResultCache]);
  const handleSelect = (0, import_react5.useCallback)(
    (hit) => {
      if (resolvingPlay) {
        return;
      }
      if (hit.localTrackId) {
        props.onPlayLocalTrack(hit.localTrackId);
        return;
      }
      setResolvingPlay(true);
      void Promise.resolve(props.onSelectTrackHit(hit)).finally(() => {
        setResolvingPlay(false);
      });
    },
    [props, resolvingPlay]
  );
  const openCollection = (0, import_react5.useCallback)(
    (next) => {
      setSearchCollectionReturnScrollY(liveScrollYRef.current);
      setSearchActiveCollection(next);
      skipScrollPersistRef.current = true;
      resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [setSearchActiveCollection, setSearchCollectionReturnScrollY]
  );
  const handleOpenArtist = (0, import_react5.useCallback)(
    (artist) => {
      openCollection({
        kind: "artist",
        title: artist.name,
        subtitle: artist.trackCount && artist.trackCount > 0 ? `${artist.trackCount} \u9996` : null,
        coverUrl: artist.coverUrl,
        providerId: artist.ref.providerId,
        remoteId: artist.ref.remoteId,
        derived: isDerivedCollectionRemoteId(artist.ref.remoteId)
      });
    },
    [openCollection]
  );
  const handleOpenAlbum = (0, import_react5.useCallback)(
    (album) => {
      openCollection({
        kind: "album",
        title: album.title,
        subtitle: album.artist?.trim() || null,
        coverUrl: album.coverUrl,
        providerId: album.ref.providerId,
        remoteId: album.ref.remoteId,
        derived: isDerivedCollectionRemoteId(album.ref.remoteId)
      });
    },
    [openCollection]
  );
  const handleOpenPlaylist = (0, import_react5.useCallback)(
    (playlist) => {
      openCollection({
        kind: "playlist",
        title: playlist.title,
        subtitle: playlist.creator?.trim() || null,
        coverUrl: playlist.coverUrl,
        providerId: playlist.ref.providerId,
        remoteId: playlist.ref.remoteId,
        derived: false
      });
    },
    [openCollection]
  );
  const toCollectionFromArtist = (0, import_react5.useCallback)((artist) => {
    return {
      kind: "artist",
      title: artist.name,
      subtitle: artist.trackCount && artist.trackCount > 0 ? `${artist.trackCount} \u9996` : null,
      coverUrl: artist.coverUrl,
      providerId: artist.ref.providerId,
      remoteId: artist.ref.remoteId,
      derived: isDerivedCollectionRemoteId(artist.ref.remoteId)
    };
  }, []);
  const toCollectionFromAlbum = (0, import_react5.useCallback)((album) => {
    return {
      kind: "album",
      title: album.title,
      subtitle: album.artist?.trim() || null,
      coverUrl: album.coverUrl,
      providerId: album.ref.providerId,
      remoteId: album.ref.remoteId,
      derived: isDerivedCollectionRemoteId(album.ref.remoteId)
    };
  }, []);
  const toCollectionFromPlaylist = (0, import_react5.useCallback)(
    (playlist) => {
      return {
        kind: "playlist",
        title: playlist.title,
        subtitle: playlist.creator?.trim() || null,
        coverUrl: playlist.coverUrl,
        providerId: playlist.ref.providerId,
        remoteId: playlist.ref.remoteId,
        derived: isDerivedCollectionRemoteId(playlist.ref.remoteId)
      };
    },
    []
  );
  const resolveCollectionForActions = (0, import_react5.useCallback)(
    (collection) => {
      const tracks = enrichSearchHitCoversFromLibrary(
        filterTracksForCollection(page?.tracks ?? [], collection)
      );
      return { tracks, source: tracks.length > 0 ? "local" : "empty" };
    },
    [page?.tracks]
  );
  const handlePlayArtist = (0, import_react5.useCallback)(
    (artist) => {
      const resolved = resolveCollectionForActions(toCollectionFromArtist(artist));
      if (resolved.tracks.length > 0) {
        props.onPlayAllTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromArtist]
  );
  const handleEnqueueArtist = (0, import_react5.useCallback)(
    (artist) => {
      const resolved = resolveCollectionForActions(toCollectionFromArtist(artist));
      if (resolved.tracks.length > 0) {
        props.onEnqueueTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromArtist]
  );
  const handlePlayAlbum = (0, import_react5.useCallback)(
    (album) => {
      const resolved = resolveCollectionForActions(toCollectionFromAlbum(album));
      if (resolved.tracks.length > 0) {
        props.onPlayAllTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromAlbum]
  );
  const handleEnqueueAlbum = (0, import_react5.useCallback)(
    (album) => {
      const resolved = resolveCollectionForActions(toCollectionFromAlbum(album));
      if (resolved.tracks.length > 0) {
        props.onEnqueueTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromAlbum]
  );
  const handlePlayPlaylist = (0, import_react5.useCallback)(
    (playlist) => {
      const resolved = resolveCollectionForActions(toCollectionFromPlaylist(playlist));
      if (resolved.tracks.length > 0) {
        props.onPlayAllTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromPlaylist]
  );
  const handleEnqueuePlaylist = (0, import_react5.useCallback)(
    (playlist) => {
      const resolved = resolveCollectionForActions(toCollectionFromPlaylist(playlist));
      if (resolved.tracks.length > 0) {
        props.onEnqueueTrackHits?.(resolved.tracks);
      }
    },
    [props, resolveCollectionForActions, toCollectionFromPlaylist]
  );
  const handleCloseCollection = (0, import_react5.useCallback)(() => {
    const y = searchCollectionReturnScrollY;
    setSearchActiveCollection(null);
    skipScrollPersistRef.current = true;
    requestAnimationFrame(() => {
      resultsScrollRef.current?.scrollTo({ y, animated: false });
      liveScrollYRef.current = y;
      setSearchResultsScrollY(y);
    });
  }, [searchCollectionReturnScrollY, setSearchActiveCollection, setSearchResultsScrollY]);
  const collectionTracks = (0, import_react5.useMemo)(() => {
    if (!activeCollection || !page) {
      return [];
    }
    let tracks = filterTracksForCollection(page.tracks, activeCollection);
    if (activeCollection.providerId !== "local") {
      tracks = tracks.filter((track) => track.ref.providerId !== "local");
    }
    return enrichSearchHitCoversFromLibrary(tracks);
  }, [activeCollection, page]);
  const handlePlayAllCollection = () => {
    if (collectionTracks.length === 0) {
      return;
    }
    props.onPlayAllTrackHits?.(collectionTracks);
  };
  const handleEnqueueAllCollection = () => {
    if (collectionTracks.length === 0) {
      return;
    }
    props.onEnqueueTrackHits?.(collectionTracks);
  };
  const refreshBusy = loadingPhase !== "idle" || loadingMore || resolvingPlay;
  let refreshA11yLabel = "\u5237\u65B0\u641C\u7D22\u7ED3\u679C";
  if (resolvingPlay) {
    refreshA11yLabel = "\u6B63\u5728\u89E3\u6790\u64AD\u653E\u5730\u5740";
  } else if (loadingPhase !== "idle" || loadingMore) {
    refreshA11yLabel = "\u6B63\u5728\u5237\u65B0\u641C\u7D22\u7ED3\u679C";
  }
  const derivedArtists = (0, import_react5.useMemo)(() => {
    if (page?.artists?.length) {
      return page.artists;
    }
    const seen = /* @__PURE__ */ new Set();
    const artists = [];
    for (const track of page?.tracks ?? []) {
      const name = track.artist.trim();
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      artists.push({
        kind: "artist",
        ref: {
          providerId: track.ref.providerId,
          remoteId: `artist:${name}`
        },
        name,
        trackCount: void 0,
        coverUrl: track.coverUrl
      });
    }
    return artists;
  }, [page?.artists, page?.tracks]);
  const derivedAlbums = (0, import_react5.useMemo)(() => {
    if (page?.albums?.length) {
      return page.albums;
    }
    const seen = /* @__PURE__ */ new Set();
    const albums = [];
    for (const track of page?.tracks ?? []) {
      const title = track.album?.trim();
      if (!title) {
        continue;
      }
      const key = `${track.ref.providerId}:${title}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      albums.push({
        kind: "album",
        ref: {
          providerId: track.ref.providerId,
          remoteId: `album:${title}`
        },
        title,
        artist: track.artist,
        coverUrl: track.coverUrl
      });
    }
    return albums;
  }, [page?.albums, page?.tracks]);
  const toggleSourcesOpen = (0, import_react5.useCallback)(() => {
    setSourcesOpen((open) => !open);
  }, []);
  const closeSources = (0, import_react5.useCallback)(() => {
    setSourcesOpen(false);
  }, []);
  const handleInputFocus = (0, import_react5.useCallback)(() => {
    if (inputBlurTimerRef.current) {
      clearTimeout(inputBlurTimerRef.current);
      inputBlurTimerRef.current = null;
    }
    setInputFocused(true);
  }, []);
  const handleInputBlur = (0, import_react5.useCallback)(() => {
    if (inputBlurTimerRef.current) {
      clearTimeout(inputBlurTimerRef.current);
    }
    inputBlurTimerRef.current = setTimeout(() => {
      inputBlurTimerRef.current = null;
      if (chipsInteractingRef.current || sourcesOpenRef.current) {
        return;
      }
      setInputFocused(false);
    }, 200);
  }, []);
  const keepConditionChipsVisible = (0, import_react5.useCallback)(() => {
    chipsInteractingRef.current = true;
    if (inputBlurTimerRef.current) {
      clearTimeout(inputBlurTimerRef.current);
      inputBlurTimerRef.current = null;
    }
    setInputFocused(true);
    const clearInteracting = () => {
      chipsInteractingRef.current = false;
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(clearInteracting);
    } else {
      setTimeout(clearInteracting, 0);
    }
  }, []);
  (0, import_react5.useEffect)(() => {
    return () => {
      if (inputBlurTimerRef.current) {
        clearTimeout(inputBlurTimerRef.current);
      }
    };
  }, []);
  let resultsBody;
  if (!submittedQuery.trim()) {
    resultsBody = null;
  } else if (loadingPhase !== "idle" && !page) {
    resultsBody = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.hint, children: loadingPhase === "searching" ? "\u641C\u7D22\u4E2D\u2026" : "\u6B63\u5728\u540E\u53F0\u9A8C\u8BC1\u53EF\u64AD\u5730\u5740\u2026" });
  } else if (activeCollection) {
    resultsBody = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      CollectionDetailBody,
      {
        collection: activeCollection,
        tracks: collectionTracks,
        hasMore: Boolean(page?.hasMore),
        loadingMore,
        onSelect: handleSelect,
        onPlayNext: props.onPlayNextTrackHit,
        onEnqueue: props.onEnqueueTrackHit,
        onSave: props.onSaveTrackHit,
        onPlayAll: handlePlayAllCollection,
        onEnqueueAll: handleEnqueueAllCollection,
        onLoadMore: () => {
          void handleLoadMore();
        },
        onSearchName: () => {
          submitSearch(activeCollection.title);
        }
      }
    );
  } else {
    resultsBody = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SearchResultsBody,
      {
        scope,
        page,
        derivedArtists,
        derivedAlbums,
        loadingMore,
        debugPanelOpen,
        onSelect: handleSelect,
        onPlayNext: props.onPlayNextTrackHit,
        onEnqueue: props.onEnqueueTrackHit,
        onSave: props.onSaveTrackHit,
        onLoadMore: () => {
          void handleLoadMore();
        },
        onOpenArtist: handleOpenArtist,
        onOpenAlbum: handleOpenAlbum,
        onOpenPlaylist: handleOpenPlaylist,
        onPlayArtist: handlePlayArtist,
        onEnqueueArtist: handleEnqueueArtist,
        onPlayAlbum: handlePlayAlbum,
        onEnqueueAlbum: handleEnqueueAlbum,
        onPlayPlaylist: handlePlayPlaylist,
        onEnqueuePlaylist: handleEnqueuePlaylist
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.root, testID: "workspace-mini-app-music-search", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.searchBar, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        import_react_native4.Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: activeCollection ? "\u8FD4\u56DE\u641C\u7D22\u7ED3\u679C" : "\u6536\u8D77\u641C\u7D22",
          onPress: () => {
            if (activeCollection) {
              handleCloseCollection();
              return;
            }
            props.onBack();
          },
          style: styles4.backHit,
          testID: activeCollection ? "music-search-collection-back" : "music-search-back",
          children: activeCollection ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.ChevronLeft, { size: 22, color: theme.colors.foreground }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.ChevronDown, { size: 22, color: theme.colors.foreground })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.inputWrap, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.Search, { size: 16, color: muted }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          import_react_native4.TextInput,
          {
            value: draft,
            onChangeText: setDraft,
            onSubmitEditing: () => submitSearch(),
            onFocus: handleInputFocus,
            onBlur: handleInputBlur,
            returnKeyType: "search",
            blurOnSubmit: false,
            placeholder: "\u641C\u7D22\u6B4C\u624B\u3001\u6B4C\u66F2\u3001\u4E13\u8F91\u2026",
            placeholderTextColor: muted,
            style: styles4.input,
            autoFocus: shouldAutoFocus,
            testID: "music-search-input"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          import_react_native4.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: "\u641C\u7D22",
            onPress: () => submitSearch(),
            style: styles4.enterBadge,
            testID: "music-search-submit",
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.CornerDownLeft, { size: 14, color: muted })
          }
        )
      ] })
    ] }),
    showConditionChips ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SearchConditionChips,
      {
        history: searchHistory,
        onSelectHistory: handleHistorySelect,
        onRemoveHistory: removeSearchHistory,
        filterPlatforms,
        selectedProviderIds: searchProviderIds,
        sourcesOpen,
        onToggleSourcesOpen: toggleSourcesOpen,
        onCloseSources: closeSources,
        onToggleProvider: toggleSearchProviderId,
        onInteract: keepConditionChipsVisible
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.tabsRow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        import_react_native4.ScrollView,
        {
          horizontal: true,
          showsHorizontalScrollIndicator: false,
          contentContainerStyle: styles4.tabs,
          style: styles4.tabsScroll,
          children: SCOPES.map((item) => {
            const active = item.id === scope;
            return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              import_react_native4.Pressable,
              {
                accessibilityRole: "button",
                accessibilityLabel: item.label,
                onPress: () => setScope(item.id),
                style: [styles4.tab, active ? styles4.tabActive : null],
                testID: `music-search-scope-${item.id}`,
                children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: [styles4.tabText, active ? { color: accent } : null], children: item.label })
              },
              item.id
            );
          })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.tabsTrailing, children: [
        typeof __DEV__ !== "undefined" && __DEV__ ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          import_react_native4.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: debugPanelOpen ? "\u9690\u85CF\u641C\u7D22\u8C03\u8BD5\u9762\u677F" : "\u663E\u793A\u641C\u7D22\u8C03\u8BD5\u9762\u677F",
            onPress: () => setDebugPanelOpen((open) => !open),
            style: [styles4.refreshHit, debugPanelOpen ? styles4.debugHitActive : null],
            testID: "music-search-debug-toggle",
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.Bug, { size: 16, color: debugPanelOpen ? accent : muted })
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          import_react_native4.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: refreshA11yLabel,
            onPress: handleRefreshSearch,
            disabled: refreshBusy && loadingPhase !== "idle",
            style: styles4.refreshHit,
            testID: "music-search-refresh",
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SpinningRefreshIcon, { spinning: refreshBusy, color: muted, size: 16 })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      import_react_native4.ScrollView,
      {
        ref: resultsScrollRef,
        style: styles4.results,
        contentContainerStyle: styles4.resultsContent,
        scrollEventThrottle: 16,
        onScroll: (event) => {
          if (skipScrollPersistRef.current) {
            skipScrollPersistRef.current = false;
            return;
          }
          const y = event.nativeEvent.contentOffset.y;
          liveScrollYRef.current = y;
          if (activeCollection) {
            return;
          }
          if (scrollPersistTimerRef.current) {
            clearTimeout(scrollPersistTimerRef.current);
          }
          scrollPersistTimerRef.current = setTimeout(() => {
            scrollPersistTimerRef.current = null;
            setSearchResultsScrollY(y);
          }, 320);
        },
        onContentSizeChange: () => {
          if (!restoreScrollOnceRef.current) {
            return;
          }
          const y = persistedScrollY;
          if (y <= 0) {
            restoreScrollOnceRef.current = false;
            return;
          }
          restoreScrollOnceRef.current = false;
          skipScrollPersistRef.current = true;
          requestAnimationFrame(() => {
            resultsScrollRef.current?.scrollTo({ y, animated: false });
          });
        },
        children: resultsBody
      }
    )
  ] });
}
var SONG_COVER_SIZE = 56;
var SQUARE_COVER_SIZE = SONG_COVER_SIZE * 2;
function SongCoverThumb(props) {
  const [failed, setFailed] = (0, import_react5.useState)(false);
  const uri = coverUrlForThumb(props.coverUrl?.trim() || "");
  (0, import_react5.useEffect)(() => {
    setFailed(false);
  }, [uri]);
  if (!uri || failed) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.songCoverFallback, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.rowCoverGlyph, children: "\u266A" }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_react_native4.Image,
    {
      source: { uri },
      style: styles4.songCoverImage,
      onError: () => setFailed(true),
      accessibilityIgnoresInvertColors: true
    }
  );
}
function MediaCoverThumb(props) {
  const [failed, setFailed] = (0, import_react5.useState)(false);
  const uri = coverUrlForThumb(props.coverUrl?.trim() || "") || void 0;
  const squareSize = props.size ?? 96;
  let imageStyle;
  let fallbackStyle;
  if (props.sizeStyle === "square" && props.fill) {
    imageStyle = styles4.squareCoverImageFill;
    fallbackStyle = styles4.squareCoverFallbackFill;
  } else if (props.sizeStyle === "square") {
    imageStyle = [styles4.squareCoverImage, { width: squareSize, height: squareSize }];
    fallbackStyle = [styles4.squareCoverFallback, { width: squareSize, height: squareSize }];
  } else if (props.sizeStyle === "avatar") {
    imageStyle = styles4.avatarImage;
    fallbackStyle = styles4.avatarCircle;
  } else {
    imageStyle = styles4.mediaCoverImage;
    fallbackStyle = styles4.mediaCoverFallback;
  }
  if (!uri || failed) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: fallbackStyle, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.rowCoverGlyph, children: props.sizeStyle === "avatar" ? "\u266B" : "\u266A" }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_react_native4.Image,
    {
      source: { uri },
      style: imageStyle,
      onError: () => setFailed(true),
      accessibilityIgnoresInvertColors: true
    }
  );
}
function SongTableSection(props) {
  const canLoadMore = Boolean(props.hasMore && props.onLoadMore);
  let footerLabel;
  if (canLoadMore) {
    footerLabel = props.loadingMore ? "\u52A0\u8F7D\u4E2D\u2026" : "\u52A0\u8F7D\u66F4\u591A\u6B4C\u66F2";
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    SearchSectionCard,
    {
      title: "\u6B4C\u66F2",
      footerLabel,
      onFooterPress: canLoadMore && !props.loadingMore ? props.onLoadMore : void 0,
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        SongTable,
        {
          tracks: props.tracks,
          onSelect: props.onSelect,
          onPlayNext: props.onPlayNext,
          onEnqueue: props.onEnqueue,
          onSave: props.onSave
        }
      )
    }
  );
}
function SearchSectionCard(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.sectionCard, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.sectionTitle, children: props.title }),
    props.children,
    props.footerLabel ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      import_react_native4.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: props.footerLabel,
        onPress: props.onFooterPress,
        style: styles4.sectionFooter,
        children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.sectionFooterText, children: props.footerLabel })
      }
    ) : null
  ] });
}
function SongTable(props) {
  const { theme, rt } = (0, import_react_native_unistyles4.useUnistyles)();
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const columns = isCompact ? 1 : 2;
  useMusicDemoStore((state) => state.tracks);
  const ActionBar = getMusicHostApi().ui.ActionBar;
  const { layout: searchMenuLayout, openEditLayout } = useMusicSearchHitMenuLayout();
  const handleMenuSelect = (0, import_react5.useCallback)(
    (id, hit) => {
      const action = id;
      if (action === "play") {
        props.onSelect(hit);
        return;
      }
      if (action === "playNext") {
        props.onPlayNext?.(hit);
        return;
      }
      if (action === "addPlaylist") {
        props.onEnqueue?.(hit);
        return;
      }
      if (action === "saveSong") {
        void props.onSave?.(hit);
      }
    },
    [props]
  );
  const buildHitActions = (0, import_react5.useCallback)(
    (hit) => MUSIC_SEARCH_HIT_MENU_IDS.map((id) => ({
      id,
      label: MUSIC_SEARCH_HIT_MENU_ACTION_LABELS[id],
      tipLabel: MUSIC_SEARCH_HIT_MENU_ACTION_LABELS[id],
      icon: MUSIC_SEARCH_HIT_MENU_ICONS[id],
      onPress: () => handleMenuSelect(id, hit)
    })),
    [handleMenuSelect]
  );
  if (props.tracks.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.emptyBlock, children: "\u6682\u65E0\u7ED3\u679C" });
  }
  const gap = isCompact ? 4 : 10;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_react_native4.View,
    {
      style: [
        styles4.songTileGrid,
        {
          gap,
          display: "grid",
          gridTemplateColumns: columns <= 1 ? "1fr" : "1fr 1fr"
        }
      ],
      children: props.tracks.map((hit, index) => {
        const downloaded = isSearchHitDownloadedLocally(hit);
        const pinned = isSearchHitPinnedLocally(hit);
        const artist = displaySearchArtist(hit.artist);
        const duration = formatDuration(hit.durationMs);
        const metaA11y = [artist, duration !== "\u2014" ? duration : null].filter(Boolean).join("\uFF0C");
        const rowKey = `${hit.ref.providerId}:${hit.ref.remoteId}:${index}`;
        const surface = /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          import_react_native4.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: `\u64AD\u653E ${hit.title}\uFF0C${metaA11y || "\u2014"}${downloaded ? "\uFF0C\u5DF2\u4E0B\u8F7D" : ""}${pinned ? "\uFF0C\u5DF2\u7F6E\u9876" : ""}`,
            onPress: () => props.onSelect(hit),
            style: styles4.songRowSurface,
            testID: `music-search-hit-${hit.ref.remoteId}-${index}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.songCoverWrap, children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SongCoverThumb, { coverUrl: hit.coverUrl }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.songPlatformBadge, pointerEvents: "none", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MusicProviderBrandIcon, { providerId: hit.ref.providerId, size: "sm" }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.songMediaMeta, children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.songTitleText, numberOfLines: 1, children: hit.title }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.songMetaRow, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.songMetaText, numberOfLines: 1, children: artist || "\u2014" }),
                  downloaded ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.songMetaIconWrap, accessibilityLabel: "\u5DF2\u4E0B\u8F7D\u5230\u672C\u5730\u66F2\u5E93", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.HardDrive, { size: 12, color: theme.colors.accent }) }) : null,
                  pinned ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.songMetaIconWrap, accessibilityLabel: "\u5DF2\u7F6E\u9876", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react_native5.Pin, { size: 12, color: "#EAB308", fill: "#EAB308" }) }) : null,
                  duration !== "\u2014" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.songMetaDuration, numberOfLines: 1, children: ` \xB7 ${duration}` }) : null
                ] })
              ] })
            ]
          }
        );
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: [styles4.songTile, isCompact ? styles4.songTileCompact : null], children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          ActionBar,
          {
            layout: searchMenuLayout,
            actions: buildHitActions(hit),
            shortcutEntityMenu: {
              appId: MUSIC_APP_ID,
              menuId: MUSIC_SEARCH_HIT_MENU_ID
            },
            surface,
            distribute: "end",
            iconSize: 16,
            mutedColor: theme.colors.foregroundMuted,
            accentColor: theme.colors.accent,
            testID: `music-search-hit-menu-${hit.ref.remoteId}-${index}`,
            overflowMenu: {
              side: "bottom",
              align: "end",
              moreLabel: `\u66F4\u591A\u64CD\u4F5C ${hit.title}`,
              showEditLayout: true,
              editLayoutLabel: "\u7F16\u8F91\u5E03\u5C40",
              onEditLayout: openEditLayout,
              testID: `music-search-hit-overflow-${hit.ref.remoteId}-${index}`
            }
          }
        ) }, rowKey);
      })
    }
  );
}
var SQUARE_GRID_GAP = 12;
function SquareHitGrid(props) {
  const { rt } = (0, import_react_native_unistyles4.useUnistyles)();
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const ActionBar = getMusicHostApi().ui.ActionBar;
  const { layout: collectionMenuLayout, openEditLayout } = useMusicSearchCollectionMenuLayout();
  const handleMenuSelect = (0, import_react5.useCallback)(
    (id, index) => {
      const action = id;
      if (action === "open") {
        props.onOpen(index);
        return;
      }
      if (action === "playAll") {
        props.onPlayAll?.(index);
        return;
      }
      if (action === "addPlaylist") {
        props.onEnqueue?.(index);
      }
    },
    [props]
  );
  const buildCollectionActions = (0, import_react5.useCallback)(
    (index) => MUSIC_SEARCH_COLLECTION_MENU_IDS.map((id) => ({
      id,
      label: MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS[id],
      tipLabel: MUSIC_SEARCH_COLLECTION_MENU_ACTION_LABELS[id],
      icon: MUSIC_SEARCH_COLLECTION_MENU_ICONS[id],
      onPress: () => handleMenuSelect(id, index)
    })),
    [handleMenuSelect]
  );
  if (props.items.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.emptyBlock, children: "\u6682\u65E0\u7ED3\u679C" });
  }
  const mobileThreeCol = isCompact;
  const cover = SQUARE_COVER_SIZE;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_react_native4.View,
    {
      style: [
        styles4.squareGrid,
        mobileThreeCol ? {
          gap: SQUARE_GRID_GAP,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr"
        } : styles4.squareGridDesktop
      ],
      children: props.items.map((item, index) => {
        const surface = /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          import_react_native4.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: item.title,
            onPress: () => props.onOpen(index),
            style: styles4.squareCardSurface,
            testID: `music-search-square-card-${index}`,
            children: [
              mobileThreeCol ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: styles4.squareCoverFill, children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MediaCoverThumb, { coverUrl: item.coverUrl, sizeStyle: "square", size: cover, fill: true }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.squarePlatformBadge, pointerEvents: "none", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MusicProviderBrandIcon, { providerId: item.providerId, size: "sm" }) })
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_react_native4.View, { style: [styles4.squareCoverWrap, { width: cover, height: cover }], children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MediaCoverThumb, { coverUrl: item.coverUrl, sizeStyle: "square", size: cover }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.View, { style: styles4.squarePlatformBadge, pointerEvents: "none", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(MusicProviderBrandIcon, { providerId: item.providerId, size: "sm" }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.squareCardTitle, numberOfLines: 1, children: item.title }),
              item.meta ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_react_native4.Text, { style: styles4.squareCardMeta, numberOfLines: 1, children: item.meta }) : null
            ]
          }
        );
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          import_react_native4.View,
          {
            style: mobileThreeCol ? styles4.squareCard : [styles4.squareCard, { width: cover }],
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              ActionBar,
              {
                layout: collectionMenuLayout,
                actions: buildCollectionActions(index),
                shortcutEntityMenu: {
                  appId: MUSIC_APP_ID,
                  menuId: MUSIC_SEARCH_COLLECTION_MENU_ID
                },
                surface,
                surfaceLayout: "card",
                distribute: "end",
                iconSize: 16,
                mutedColor: "#fff",
                accentColor: "#fff",
                testID: `music-search-square-menu-${index}`,
                barButtonStyle: (state) => state.hovered || state.pressed ? styles4.collectionChromeHitActive : void 0,
                overflowMenu: {
                  side: "bottom",
                  align: "end",
                  moreLabel: `\u66F4\u591A\u64CD\u4F5C ${item.title}`,
                  showEditLayout: true,
                  editLayoutLabel: "\u7F16\u8F91\u5E03\u5C40",
                  onEditLayout: openEditLayout,
                  triggerColor: "#fff",
                  triggerStyle: (state) => state.hovered || state.pressed || state.open ? styles4.collectionChromeHitActive : void 0,
                  testID: `music-search-square-overflow-${index}`
                }
              }
            )
          },
          item.key
        );
      })
    }
  );
}
function ArtistList(props) {
  const artists = props.artists;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    SquareHitGrid,
    {
      items: artists.map((artist, index) => ({
        key: `${artist.ref.providerId}:${artist.ref.remoteId}:${index}`,
        coverUrl: artist.coverUrl,
        providerId: artist.ref.providerId,
        title: artist.name,
        meta: artist.trackCount && artist.trackCount > 0 ? `${artist.trackCount} \u9996` : null
      })),
      onOpen: (index) => {
        const artist = artists[index];
        if (artist) {
          props.onOpen(artist);
        }
      },
      onPlayAll: (index) => {
        const artist = artists[index];
        if (artist) {
          props.onPlayAll?.(artist);
        }
      },
      onEnqueue: (index) => {
        const artist = artists[index];
        if (artist) {
          props.onEnqueue?.(artist);
        }
      }
    }
  );
}
function AlbumList(props) {
  const albums = props.albums;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    SquareHitGrid,
    {
      items: albums.map((album, index) => ({
        key: `${album.ref.providerId}:${album.ref.remoteId}:${index}`,
        coverUrl: album.coverUrl,
        providerId: album.ref.providerId,
        title: album.title,
        meta: album.artist?.trim() || (album.trackCount && album.trackCount > 0 ? `${album.trackCount} \u9996` : null)
      })),
      onOpen: (index) => {
        const album = albums[index];
        if (album) {
          props.onOpen(album);
        }
      },
      onPlayAll: (index) => {
        const album = albums[index];
        if (album) {
          props.onPlayAll?.(album);
        }
      },
      onEnqueue: (index) => {
        const album = albums[index];
        if (album) {
          props.onEnqueue?.(album);
        }
      }
    }
  );
}
function PlaylistList(props) {
  const playlists = props.playlists;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    SquareHitGrid,
    {
      items: playlists.map((playlist, index) => ({
        key: `${playlist.ref.providerId}:${playlist.ref.remoteId}:${index}`,
        coverUrl: playlist.coverUrl,
        providerId: playlist.ref.providerId,
        title: playlist.title,
        meta: playlist.creator?.trim() || (playlist.trackCount && playlist.trackCount > 0 ? `${playlist.trackCount} \u9996` : null)
      })),
      onOpen: (index) => {
        const playlist = playlists[index];
        if (playlist) {
          props.onOpen(playlist);
        }
      },
      onPlayAll: (index) => {
        const playlist = playlists[index];
        if (playlist) {
          props.onPlayAll?.(playlist);
        }
      },
      onEnqueue: (index) => {
        const playlist = playlists[index];
        if (playlist) {
          props.onEnqueue?.(playlist);
        }
      }
    }
  );
}
function formatDuration(durationMs) {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return "\u2014";
  }
  const totalSec = Math.floor(durationMs / 1e3);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
function displaySearchArtist(artist) {
  const raw = artist?.trim() ?? "";
  if (!raw || /^(pixabay|sound\s*stripe|soundstripe|未知|未知艺人)$/i.test(raw)) {
    return null;
  }
  return raw;
}
var styles4 = import_react_native_unistyles4.StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    minHeight: 0,
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingTop: theme.spacing[1]
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1]
  },
  backHit: {
    // 与播放器 topLeadingChrome 同位（40×40，左 padding 由 root 承担）
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    height: 40,
    borderRadius: 999,
    backgroundColor: theme.colors.surface2
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    padding: 0
  },
  historyScroll: {
    flexGrow: 0
  },
  conditionChipsRoot: {
    gap: theme.spacing[1]
  },
  chipWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing[1]
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingBottom: theme.spacing[1]
  },
  historyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    maxWidth: 180,
    flexShrink: 0,
    borderRadius: 999,
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: theme.spacing[2],
    minHeight: 28
  },
  historyChipArmed: {
    backgroundColor: theme.colors.palette?.red?.[500] ?? "#ef4444"
  },
  historyChipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    flexShrink: 1
  },
  historyChipTextArmed: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium
  },
  sourceSummaryChip: {
    maxWidth: 9999
  },
  sourceChipOpen: {
    backgroundColor: theme.colors.surface1
  },
  sourcePickChipSelected: {
    backgroundColor: theme.colors.surface1,
    borderWidth: import_react_native4.StyleSheet.hairlineWidth,
    borderColor: theme.colors.accent
  },
  providerChevronOpen: {
    transform: [{ rotate: "180deg" }]
  },
  enterBadge: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface1
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 1
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2]
  },
  tabsTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    marginLeft: "auto",
    flexGrow: 0,
    flexShrink: 0
  },
  refreshHit: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  debugHitActive: {
    backgroundColor: theme.colors.surface2
  },
  songCoverImage: {
    width: "100%",
    height: "100%"
  },
  songCoverFallback: {
    width: "100%",
    height: "100%",
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center"
  },
  songCoverWrap: {
    width: SONG_COVER_SIZE,
    height: SONG_COVER_SIZE,
    position: "relative",
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: theme.colors.surface3
  },
  songPlatformBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: import_react_native4.StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.35)",
    backgroundColor: "rgba(20,20,22,0.92)"
  },
  songTileGrid: {
    width: "100%",
    alignSelf: "stretch"
  },
  songTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    paddingRight: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box"
  },
  songTileCompact: {
    // 移动端更接近 YTM：更扁、背景更轻，靠分隔感而不是重卡片
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[1],
    backgroundColor: "transparent",
    borderRadius: theme.borderRadius.sm
  },
  songMediaMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: "center"
  },
  songRowSurface: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3]
  },
  songMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    minWidth: 0,
    gap: 4
  },
  songMetaIconWrap: {
    flexGrow: 0,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  songTitleText: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
    lineHeight: 20
  },
  songMetaText: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    lineHeight: 16
  },
  songMetaDuration: {
    flexGrow: 0,
    flexShrink: 0,
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    lineHeight: 16
  },
  songArtistText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted
  },
  squareGrid: {
    width: "100%",
    alignSelf: "stretch"
  },
  squareGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[3]
  },
  squareCard: {
    gap: theme.spacing[1],
    minWidth: 0,
    alignItems: "center"
  },
  squareCardSurface: {
    width: "100%",
    gap: theme.spacing[1],
    minWidth: 0,
    alignItems: "center"
  },
  squareCoverWrap: {
    position: "relative",
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    alignSelf: "center"
  },
  squareCoverFill: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.surface3
  },
  squareCoverImageFill: {
    width: "100%",
    height: "100%"
  },
  squareCoverFallbackFill: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface3
  },
  squarePlatformBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: import_react_native4.StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.35)",
    backgroundColor: "rgba(20,20,22,0.92)"
  },
  squareCoverImage: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2
  },
  squareCoverFallback: {
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center"
  },
  squareCardTitle: {
    width: "100%",
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
    textAlign: "center"
  },
  squareCardMeta: {
    width: "100%",
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    textAlign: "center"
  },
  // 合集封面 chrome：Music 本地；默认透明不挡封面，悬停/按下才 scrim
  collectionChromeHitActive: {
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[1]
  },
  tab: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md
  },
  tabActive: {
    backgroundColor: theme.colors.surface2
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    fontWeight: theme.fontWeight.medium
  },
  results: {
    flex: 1,
    minHeight: 0
  },
  resultsContent: {
    gap: theme.spacing[1],
    paddingBottom: theme.spacing[2]
  },
  sections: {
    gap: theme.spacing[3]
  },
  collectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3]
  },
  collectionCoverWrap: {
    position: "relative",
    borderRadius: theme.borderRadius.md,
    overflow: "hidden"
  },
  collectionMeta: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[1]
  },
  collectionKind: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted
  },
  collectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground
  },
  collectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted
  },
  collectionCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted
  },
  collectionHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    lineHeight: 18
  },
  collectionEmptyActions: {
    gap: theme.spacing[2],
    alignItems: "flex-start"
  },
  collectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    marginTop: theme.spacing[1]
  },
  collectionActionBtn: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2
  },
  collectionActionBtnMuted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium
  },
  collectionSearchCta: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2
  },
  collectionSearchCtaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.medium
  },
  sectionCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[2]
  },
  sectionTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground
  },
  sectionFooter: {
    paddingTop: theme.spacing[1]
  },
  sectionFooterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted
  },
  hintCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    gap: theme.spacing[2]
  },
  hintTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground
  },
  hint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    lineHeight: 20
  },
  emptyBlock: {
    paddingVertical: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted
  },
  errorCard: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    gap: theme.spacing[1]
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.palette?.red?.[500] ?? theme.colors.foregroundMuted
  },
  debugUrlCard: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: import_react_native4.StyleSheet.hairlineWidth,
    borderColor: theme.colors.palette?.red?.[300] ?? theme.colors.border,
    backgroundColor: theme.colors.surface1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    gap: theme.spacing[2]
  },
  debugUrlHeading: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.palette?.red?.[500] ?? "#ef4444"
  },
  debugUrlBlock: {
    gap: 2
  },
  debugUrlLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.palette?.red?.[500] ?? "#ef4444"
  },
  debugUrlText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.palette?.red?.[500] ?? "#ef4444",
    lineHeight: 16
  },
  debugUrlNote: {
    fontSize: 10,
    color: theme.colors.foregroundMuted
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[1]
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md
  },
  avatarGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted
  },
  avatarMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  avatarTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground
  },
  avatarSub: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[1]
  },
  mediaCover: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center"
  },
  mediaCoverImage: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md
  },
  mediaCoverFallback: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center"
  },
  rowCoverGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted
  },
  mediaMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  mediaTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground
  },
  mediaSub: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted
  }
}));

// src/transport-controls.tsx
var import_lucide_react_native6 = require("lucide-react-native");
var import_jsx_runtime5 = require("react/jsx-runtime");
function TransportModeControl(props) {
  const {
    IconHit: IconHit2,
    controlTitles,
    stripShortcutSuffix: stripShortcutSuffix2,
    resolveControlShortcutKeys,
    playMode,
    playModeLabel: playModeLabel2,
    ModeIcon,
    accentColor,
    iconSize,
    onCycleMode
  } = props;
  const label = playModeLabel2(playMode);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    IconHit2,
    {
      label,
      tipLabel: stripShortcutSuffix2(controlTitles["transport:mode"] ?? label),
      shortcutKeys: resolveControlShortcutKeys("transport:mode"),
      onPress: onCycleMode,
      testID: "music-play-mode",
      children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ModeIcon, { size: iconSize, color: accentColor })
    }
  );
}
function TransportQueueControl(props) {
  const {
    IconHit: IconHit2,
    controlTitles,
    stripShortcutSuffix: stripShortcutSuffix2,
    resolveControlShortcutKeys,
    queueOpen,
    accentColor,
    mutedIconColor,
    iconSize,
    onToggleQueue
  } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    IconHit2,
    {
      label: "\u64AD\u653E\u961F\u5217",
      tipLabel: stripShortcutSuffix2(controlTitles["transport:queue"] ?? "\u64AD\u653E\u961F\u5217"),
      shortcutKeys: resolveControlShortcutKeys("transport:queue"),
      onPress: onToggleQueue,
      testID: "music-queue-toggle",
      children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react_native6.ListMusic, { size: iconSize, color: queueOpen ? accentColor : mutedIconColor })
    }
  );
}

// src/track-identity.tsx
var import_react7 = require("react");
var import_react_native6 = require("react-native");
var import_react_native_unistyles6 = require("react-native-unistyles");
init_cover_url_quality();

// src/marquee-text.tsx
var import_react6 = require("react");
var import_react_native5 = require("react-native");
var import_react_native_unistyles5 = require("react-native-unistyles");
var import_jsx_runtime6 = require("react/jsx-runtime");
var MARQUEE_STYLE_ID = "agnx-music-marquee-keyframes-v6";
var SECONDARY_GAP_PX = 10;
function ensureMarqueeCss() {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(MARQUEE_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = MARQUEE_STYLE_ID;
  style.textContent = `
@keyframes agnx-music-marquee {
  0% { transform: translateX(0); }
  10% { transform: translateX(0); }
  90% { transform: translateX(-50%); }
  100% { transform: translateX(-50%); }
}
.agnx-music-marquee-viewport {
  overflow: hidden !important;
  width: 100%;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.agnx-music-marquee-viewport.is-fit {
  justify-content: flex-start;
  width: auto;
  max-width: 100%;
}
.agnx-music-marquee-viewport.is-overflow {
  justify-content: flex-start;
}
.agnx-music-marquee-track {
  display: inline-flex;
  flex-direction: row;
  flex-wrap: nowrap;
  white-space: nowrap;
  width: max-content;
  max-width: none;
}
.agnx-music-marquee-track.is-scrolling {
  justify-content: flex-start;
  animation: agnx-music-marquee linear infinite;
  will-change: transform;
}
.agnx-music-marquee-chunk {
  flex-shrink: 0;
  white-space: nowrap;
  padding-right: 0;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: ${SECONDARY_GAP_PX}px;
}
.agnx-music-marquee-track.is-scrolling .agnx-music-marquee-chunk {
  padding-right: 40px;
}
`;
  document.head.appendChild(style);
}
function WebCssMarquee(props) {
  const viewportRef = (0, import_react6.useRef)(null);
  const measureRef = (0, import_react6.useRef)(null);
  const [scrolling, setScrolling] = (0, import_react6.useState)(false);
  const [durationSec, setDurationSec] = (0, import_react6.useState)(8);
  const [animationPaused, setAnimationPaused] = (0, import_react6.useState)(false);
  const secondary = props.secondaryText?.trim() || "";
  (0, import_react6.useEffect)(() => {
    ensureMarqueeCss();
  }, []);
  (0, import_react6.useEffect)(() => {
    if (typeof document === "undefined") {
      return;
    }
    const syncPause = () => {
      setAnimationPaused(Boolean(document.hidden) || Boolean(props.animationPaused));
    };
    syncPause();
    document.addEventListener("visibilitychange", syncPause);
    return () => document.removeEventListener("visibilitychange", syncPause);
  }, [props.animationPaused]);
  (0, import_react6.useEffect)(() => {
    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) {
      return;
    }
    const update = () => {
      const textWidth = measure.scrollWidth;
      const parent = viewport.parentElement;
      const parentW = parent ? parent.getBoundingClientRect().width || parent.clientWidth || 0 : 0;
      if (parentW < 8) {
        viewport.style.removeProperty("width");
        setScrolling(false);
        return;
      }
      const constraint = Math.max(1, parentW);
      if (props.fitContent) {
        const maxW = Math.max(1, constraint);
        if (textWidth <= maxW + 4) {
          viewport.style.width = `${textWidth}px`;
          setScrolling(false);
          return;
        }
        viewport.style.width = `${maxW}px`;
        setScrolling(true);
        setDurationSec(Math.max(6, textWidth / 40));
        return;
      }
      viewport.style.width = `${constraint}px`;
      const need = textWidth > constraint + 4;
      setScrolling(need);
      if (need) {
        setDurationSec(Math.max(6, textWidth / 40));
      }
    };
    update();
    let raf2 = 0;
    const raf = requestAnimationFrame(() => {
      update();
      raf2 = requestAnimationFrame(update);
    });
    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(raf);
        cancelAnimationFrame(raf2);
      };
    }
    const observer = new ResizeObserver(update);
    observer.observe(viewport.parentElement ?? viewport);
    if (viewport.parentElement?.parentElement) {
      observer.observe(viewport.parentElement.parentElement);
    }
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
      observer.disconnect();
    };
  }, [
    props.text,
    secondary,
    props.fontSize,
    props.fontWeight,
    props.secondaryFontSize,
    props.secondaryFontWeight,
    props.secondaryColor,
    props.fitContent,
    props.contentAlign,
    // 切回可见时强制重测，清掉隐藏期可能留下的错误 inline width
    props.animationPaused
  ]);
  const textCss = {
    color: props.color,
    fontSize: props.fontSize ?? 16,
    fontWeight: props.fontWeight ?? 600,
    whiteSpace: "nowrap",
    lineHeight: 1.45
  };
  const secondaryCss = {
    color: props.secondaryColor ?? props.color,
    fontSize: props.secondaryFontSize ?? props.fontSize ?? 16,
    fontWeight: props.secondaryFontWeight ?? 400,
    whiteSpace: "nowrap",
    lineHeight: 1.45
  };
  const renderChunkChildren = () => {
    const nodes = [(0, import_react6.createElement)("span", { key: "primary", style: textCss }, props.text)];
    if (secondary) {
      nodes.push((0, import_react6.createElement)("span", { key: "secondary", style: secondaryCss }, secondary));
    }
    return nodes;
  };
  const alignStart = props.contentAlign === "start" || props.fitContent || scrolling;
  const viewportClass = [
    "agnx-music-marquee-viewport",
    props.fitContent ? "is-fit" : "",
    scrolling ? "is-overflow" : "",
    alignStart ? "is-align-start" : ""
  ].filter(Boolean).join(" ");
  return (0, import_react6.createElement)(
    "div",
    {
      ref: viewportRef,
      className: viewportClass,
      "data-testid": props.testID,
      style: {
        minWidth: 0,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: alignStart ? "flex-start" : "center"
      }
    },
    (0, import_react6.createElement)(
      "span",
      {
        ref: measureRef,
        style: {
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          left: 0,
          top: 0,
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          gap: SECONDARY_GAP_PX,
          whiteSpace: "nowrap"
        }
      },
      ...renderChunkChildren()
    ),
    (0, import_react6.createElement)(
      "div",
      {
        className: scrolling ? "agnx-music-marquee-track is-scrolling" : "agnx-music-marquee-track",
        style: scrolling ? {
          animationDuration: `${durationSec}s`,
          animationPlayState: animationPaused ? "paused" : "running"
        } : void 0
      },
      (0, import_react6.createElement)("span", { className: "agnx-music-marquee-chunk" }, ...renderChunkChildren()),
      scrolling ? (0, import_react6.createElement)("span", { className: "agnx-music-marquee-chunk" }, ...renderChunkChildren()) : null
    )
  );
}
function NativeMarquee(props) {
  const { theme } = (0, import_react_native_unistyles5.useUnistyles)();
  const [boxWidth, setBoxWidth] = (0, import_react6.useState)(0);
  const [textWidth, setTextWidth] = (0, import_react6.useState)(0);
  const offset = (0, import_react6.useRef)(new import_react_native5.Animated.Value(0)).current;
  const shouldScroll = textWidth > boxWidth + 4 && boxWidth > 0;
  const secondary = props.secondaryText?.trim() || "";
  const textStyle = (0, import_react6.useMemo)(() => {
    const flat = import_react_native5.StyleSheet.flatten(props.style) ?? {};
    return Object.assign({}, flat, { color: theme.colors.foreground, flexShrink: 0 });
  }, [props.style, theme.colors.foreground]);
  const secondaryStyle = (0, import_react6.useMemo)(() => {
    const flat = import_react_native5.StyleSheet.flatten(props.secondaryStyle) ?? {};
    return Object.assign({}, flat, {
      color: flat.color ?? theme.colors.foregroundMuted,
      flexShrink: 0
    });
  }, [props.secondaryStyle, theme.colors.foregroundMuted]);
  (0, import_react6.useEffect)(() => {
    offset.stopAnimation();
    offset.setValue(0);
    if (!shouldScroll) {
      return;
    }
    const distance = textWidth + 40;
    const loop = import_react_native5.Animated.loop(
      import_react_native5.Animated.sequence([
        import_react_native5.Animated.delay(800),
        import_react_native5.Animated.timing(offset, {
          toValue: -distance,
          duration: Math.max(5e3, distance * 35),
          easing: import_react_native5.Easing.linear,
          useNativeDriver: true
        }),
        import_react_native5.Animated.delay(500),
        import_react_native5.Animated.timing(offset, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [offset, shouldScroll, textWidth]);
  const renderChunk = (measure) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    import_react_native5.View,
    {
      style: styles5.chunkRow,
      onLayout: measure ? (event) => setTextWidth(event.nativeEvent.layout.width) : void 0,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_react_native5.Text, { style: textStyle, children: props.text }),
        secondary ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_react_native5.Text, { style: secondaryStyle, children: secondary }) : null
      ]
    }
  );
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    import_react_native5.View,
    {
      style: [styles5.box, props.fitContent ? styles5.boxFit : null],
      onLayout: (event) => setBoxWidth(event.nativeEvent.layout.width),
      testID: props.testID,
      children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
        import_react_native5.Animated.View,
        {
          style: [
            styles5.row,
            shouldScroll ? { transform: [{ translateX: offset }] } : null,
            shouldScroll ? styles5.rowScroll : null,
            props.fitContent && !shouldScroll ? styles5.rowFit : null
          ],
          children: [
            renderChunk(true),
            shouldScroll ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_react_native5.View, { style: styles5.gapCopy, children: renderChunk(false) }) : null
          ]
        }
      )
    }
  );
}
function MarqueeText(props) {
  const { theme } = (0, import_react_native_unistyles5.useUnistyles)();
  const flat = import_react_native5.StyleSheet.flatten(props.style) ?? {};
  const fontSize = props.fontSize ?? (typeof flat.fontSize === "number" ? flat.fontSize : theme.fontSize.base);
  const fontWeight = props.fontWeight ?? flat.fontWeight;
  const color = props.color ?? (typeof flat.color === "string" ? flat.color : theme.colors.foreground);
  const secondary = props.secondaryText?.trim() || "";
  const isDom = typeof document !== "undefined";
  if (isDom) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_react_native5.View, { style: props.fitContent ? styles5.boxFit : styles5.box, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      WebCssMarquee,
      {
        text: props.text,
        color,
        fontSize,
        fontWeight,
        secondaryText: secondary || void 0,
        secondaryColor: props.secondaryColor ?? theme.colors.foregroundMuted,
        secondaryFontSize: props.secondaryFontSize,
        secondaryFontWeight: props.secondaryFontWeight,
        fitContent: props.fitContent,
        contentAlign: props.contentAlign,
        animationPaused: props.animationPaused,
        testID: props.testID
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    NativeMarquee,
    {
      text: props.text,
      style: [props.style, { fontSize, fontWeight, color }],
      secondaryText: secondary || void 0,
      secondaryStyle: {
        fontSize: props.secondaryFontSize ?? Math.max(12, fontSize - 2),
        fontWeight: props.secondaryFontWeight ?? "400",
        color: props.secondaryColor ?? theme.colors.foregroundMuted
      },
      fitContent: props.fitContent,
      testID: props.testID
    }
  );
}
var styles5 = import_react_native_unistyles5.StyleSheet.create({
  box: {
    // 勿用 flex:1（basis:0）：纵向两行歌名/艺人时会被压扁
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    overflow: "hidden"
  },
  boxFit: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    // 交叉轴居中：在横向 title 行里垂直居中，避免贴顶
    alignSelf: "center"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap"
  },
  rowFit: {
    alignSelf: "center"
  },
  rowScroll: {
    width: "max-content",
    justifyContent: "flex-start"
  },
  chunkRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: SECONDARY_GAP_PX,
    flexShrink: 0
  },
  gapCopy: {
    marginLeft: 40
  }
});

// src/track-identity.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function displayUriForCoverSize(size, displayUri) {
  if (!displayUri) {
    return null;
  }
  return size === "hero" ? coverUrlForHero(displayUri) : coverUrlForThumb(displayUri);
}
function isVideoCoverUri(uri) {
  return /\.(mp4|webm|mov|m4v|ogv)(?:\?|#|$)/i.test(uri);
}
function resolveTrackArtistLabel(track) {
  const artist = track.artist.trim();
  if (!artist || artist === "\u672A\u77E5\u827A\u4EBA" || artist.toLowerCase() === "unknown artist") {
    return null;
  }
  return artist;
}
function TrackCoverMedia(props) {
  const { size, displayUri, sourceUriForVideoCheck, isWeb, isCompact } = props;
  const resolvedUri = displayUriForCoverSize(size, displayUri);
  const videoUri = sourceUriForVideoCheck ?? displayUri;
  const allowVideo = size === "hero" && Boolean(resolvedUri && videoUri && isVideoCoverUri(videoUri) && isWeb);
  if (!resolvedUri) {
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      import_react_native6.Text,
      {
        style: size === "hero" ? styles6.coverGlyph : size === "inline" ? [styles6.inlineGlyph, !isCompact ? styles6.inlineGlyphDesktop : null] : styles6.transportGlyph,
        children: "\u266A"
      }
    );
  }
  if (allowVideo) {
    return (0, import_react7.createElement)("video", {
      src: resolvedUri,
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover"
      },
      autoPlay: true,
      loop: true,
      muted: true,
      playsInline: true,
      "data-testid": "music-cover-video"
    });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    import_react_native6.Image,
    {
      source: { uri: resolvedUri },
      style: size === "hero" ? styles6.heroImage : size === "inline" ? styles6.inlineImage : styles6.transportImage,
      resizeMode: "cover",
      testID: size === "hero" ? "music-cover-image" : void 0
    }
  );
}
function TrackCoverButton(props) {
  const frameStyle = props.size === "hero" ? [styles6.heroFrame, props.isCompact ? styles6.heroFrameCompact : styles6.heroFrameDesktop] : props.size === "inline" ? [styles6.inlineFrame, !props.isCompact ? styles6.inlineFrameDesktop : null] : styles6.transportFrame;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    import_react_native6.Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: props.accessibilityLabel,
      onPress: props.onPress,
      onLongPress: props.onLongPress,
      style: [frameStyle, props.style],
      testID: props.testID,
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        import_react_native6.View,
        {
          style: props.size === "hero" ? styles6.heroArt : props.size === "inline" ? styles6.inlineArt : styles6.transportArt,
          children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            TrackCoverMedia,
            {
              size: props.size,
              displayUri: props.displayUri,
              sourceUriForVideoCheck: props.sourceUriForVideoCheck,
              isWeb: props.isWeb,
              isCompact: props.isCompact
            }
          )
        }
      )
    }
  );
}
function TrackTitleArtist(props) {
  if (props.mode === "singleLine") {
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_react_native6.View, { style: styles6.singleLineWrap, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        MarqueeText,
        {
          text: props.title,
          secondaryText: props.artistLabel ?? void 0,
          secondaryColor: props.mutedColor,
          secondaryFontSize: props.artistFontSize,
          secondaryFontWeight: "400",
          contentAlign: "start",
          fitContent: props.fitContent,
          style: props.titleStyle,
          fontSize: props.titleFontSize,
          fontWeight: "600",
          animationPaused: props.animationPaused,
          testID: props.titleTestID
        }
      ),
      props.trailing
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_react_native6.View, { style: styles6.stackedWrap, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      MarqueeText,
      {
        text: props.title,
        contentAlign: "center",
        style: props.titleStyle,
        fontSize: props.titleFontSize,
        fontWeight: "600",
        animationPaused: props.animationPaused,
        testID: props.titleTestID
      }
    ),
    props.artistLabel ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      MarqueeText,
      {
        text: props.artistLabel,
        contentAlign: "center",
        style: props.artistStyle,
        fontSize: props.artistFontSize,
        fontWeight: "400",
        color: props.mutedColor,
        animationPaused: props.animationPaused,
        testID: props.artistTestID
      }
    ) : null,
    props.trailing
  ] });
}
var styles6 = import_react_native_unistyles6.StyleSheet.create((theme) => ({
  heroFrame: {
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden"
  },
  heroFrameCompact: {
    width: 120,
    height: 120,
    marginTop: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "center"
  },
  heroFrameDesktop: {
    // 随封面列宽伸缩（固定 320 或 1:2 变宽时封面图一起变）
    width: "100%",
    aspectRatio: 1,
    maxWidth: 480,
    alignSelf: "center"
  },
  heroArt: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: theme.borderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  heroImage: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%"
  },
  coverGlyph: {
    fontSize: 48,
    color: theme.colors.foregroundMuted
  },
  inlineFrame: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface2,
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0
  },
  inlineFrameDesktop: {
    width: 28,
    height: 28,
    borderRadius: 6
  },
  inlineArt: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  inlineImage: {
    width: "100%",
    height: "100%"
  },
  inlineGlyph: {
    fontSize: 14,
    color: theme.colors.foregroundMuted
  },
  inlineGlyphDesktop: {
    fontSize: 12
  },
  transportFrame: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0
  },
  transportArt: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  transportImage: {
    width: "100%",
    height: "100%"
  },
  transportGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted
  },
  singleLineWrap: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "center"
  },
  stackedWrap: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    gap: theme.spacing[1]
  }
}));

// src/player.tsx
init_cover_url_quality();

// src/sync-content-backdrop.ts
init_music_ids();

// src/resolve-cover-backdrop-uri.ts
init_cover_url_quality();
function isDirectImageUri(uri) {
  return /^https?:\/\//.test(uri) || uri.startsWith("data:") || uri.startsWith("blob:");
}
async function resolveMusicCoverBackdropImageUri(input) {
  const cover = input.coverUri?.trim() || null;
  const display = input.displayUri?.trim() || null;
  if (cover && /^https?:\/\//.test(cover)) {
    return coverUrlForHero(cover);
  }
  if (cover && cover.startsWith("data:")) {
    return cover;
  }
  if (display && isDirectImageUri(display)) {
    return coverUrlForHero(display);
  }
  if (cover && cover.startsWith("blob:")) {
    return cover;
  }
  if (cover && !isDirectImageUri(cover)) {
    try {
      return await input.hostApi.files.resolveObjectUrl(cover);
    } catch {
      return display && isDirectImageUri(display) ? display : null;
    }
  }
  return null;
}

// src/sync-content-backdrop.ts
init_store();
async function syncMusicContentBackdropToHost(hostApi2, options) {
  const sourceId = MUSIC_APP_ID;
  const state = useMusicDemoStore.getState();
  if (!state.coverBackdropEnabled) {
    hostApi2.ui.clearContentBackdrop(sourceId);
    return;
  }
  const trackId = state.nowPlayingId;
  const track = trackId ? state.getTrack(trackId) : null;
  if (!track) {
    return;
  }
  const imageUri = await resolveMusicCoverBackdropImageUri({
    hostApi: hostApi2,
    coverUri: track.coverUri,
    displayUri: options?.displayUri
  });
  if (!imageUri) {
    return;
  }
  const latest = useMusicDemoStore.getState();
  if (!latest.coverBackdropEnabled || latest.nowPlayingId !== trackId) {
    return;
  }
  const imageOpacity = state.coverBackdropOpacity;
  const overlayOpacity = Math.min(0.5, Math.max(0.08, 0.48 - imageOpacity * 0.4));
  hostApi2.ui.setContentBackdrop({
    sourceId,
    imageUri,
    blurRadius: state.coverBackdropBlur,
    imageOpacity,
    overlayOpacity,
    includeTabBar: state.coverBackdropIncludeTabBar,
    sourceLabel: track.title?.trim() || void 0
  });
}

// src/player.tsx
init_player_action_layout();
init_track_menu();
init_store();

// src/music-tab-icon.tsx
var import_react8 = require("react");
var import_react_native7 = require("react-native");
var import_lucide_react_native7 = require("lucide-react-native");
init_music_host();
init_cover_url_quality();
init_store();
var import_jsx_runtime8 = require("react/jsx-runtime");
function isDirectDisplayCoverUri(uri) {
  return /^https?:\/\//.test(uri) || uri.startsWith("data:") || uri.startsWith("blob:");
}
function MusicTabIcon(props) {
  const size = typeof props.size === "number" ? props.size : Number(props.size) || 18;
  const color = props.color ?? "#9ca3af";
  const nowPlayingId = useMusicDemoStore((state) => state.nowPlayingId);
  const coverUri = useMusicDemoStore((state) => {
    const id = state.nowPlayingId;
    if (!id) {
      return null;
    }
    const track = state.tracks.find((entry) => entry.id === id);
    return track?.coverUri?.trim() || null;
  });
  const [displayUri, setDisplayUri] = (0, import_react8.useState)(null);
  (0, import_react8.useEffect)(() => {
    let cancelled = false;
    const trackId = nowPlayingId;
    const raw = coverUri;
    if (!raw) {
      setDisplayUri(null);
      return;
    }
    if (isDirectDisplayCoverUri(raw)) {
      setDisplayUri(coverUrlForThumb(raw));
      return;
    }
    const host2 = tryGetMusicHostApi();
    if (!host2?.files?.resolveObjectUrl) {
      setDisplayUri(null);
      return;
    }
    void (async () => {
      try {
        const uri = await host2.files.resolveObjectUrl(raw);
        const latest = useMusicDemoStore.getState();
        if (!cancelled && latest.nowPlayingId === trackId && latest.tracks.find((entry) => entry.id === trackId)?.coverUri?.trim() === raw) {
          setDisplayUri(uri);
        }
      } catch {
        if (!cancelled && useMusicDemoStore.getState().nowPlayingId === trackId) {
          setDisplayUri(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coverUri, nowPlayingId]);
  const frameStyle = (0, import_react8.useMemo)(
    () => ({
      width: size,
      height: size,
      borderRadius: Math.max(2, size * 0.18),
      overflow: "hidden"
    }),
    [size]
  );
  const imageStyle = (0, import_react8.useMemo)(() => ({ width: size, height: size }), [size]);
  const imageSource = (0, import_react8.useMemo)(() => displayUri ? { uri: displayUri } : null, [displayUri]);
  if (imageSource) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_react_native7.View, { style: frameStyle, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      import_react_native7.Image,
      {
        source: imageSource,
        style: imageStyle,
        resizeMode: "cover",
        accessibilityIgnoresInvertColors: true
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(import_lucide_react_native7.Music2, { size, color, strokeWidth: 2 });
}

// src/extract-cover-atmosphere.ts
var ATMOSPHERE_EXTRACT_VERSION = 3;
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => clampByte(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
  }
  h /= 6;
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = clampByte(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p2, q2, tRaw) => {
    let t = tRaw;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
    if (t < 1 / 2) return q2;
    if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
    return p2;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clampByte(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clampByte(hue2rgb(p, q, h) * 255),
    b: clampByte(hue2rgb(p, q, h - 1 / 3) * 255)
  };
}
function tuneForAtmosphere(rgb, luminance) {
  const hsl = rgbToHsl(rgb);
  const s = Math.max(0.28, Math.min(0.72, hsl.s * 1.05));
  const l = luminance === "light" ? Math.max(0.58, Math.min(0.84, hsl.l < 0.58 ? 0.64 : hsl.l)) : Math.max(0.16, Math.min(0.42, hsl.l));
  return hslToRgb(hsl.h, s, l);
}
function bandFromRaw(primary, secondary, tertiary, luminance) {
  const primaryRgb = tuneForAtmosphere(primary, luminance);
  const secondaryRgb = secondary ? tuneForAtmosphere(secondary, luminance) : void 0;
  const tertiaryRgb = tertiary ? tuneForAtmosphere(tertiary, luminance) : void 0;
  return {
    primary: rgbToHex(primaryRgb),
    secondary: secondaryRgb ? rgbToHex(secondaryRgb) : void 0,
    tertiary: tertiaryRgb ? rgbToHex(tertiaryRgb) : void 0
  };
}
function pickAtmosphereBandForTheme(palette, themeBrightness) {
  const band = themeBrightness === "light" ? palette.light : palette.dark;
  return { ...band, luminance: themeBrightness };
}
function scorePixel(rgb) {
  const { s, l } = rgbToHsl(rgb);
  if (l < 0.04 || l > 0.96) {
    return 0;
  }
  if (s < 0.06) {
    const grayBias = Math.max(1 - Math.abs(l - 0.4), 1 - Math.abs(l - 0.72));
    return 0.08 * Math.max(0.2, grayBias);
  }
  const darkBias = 1 - Math.abs(l - 0.35) * 1.6;
  const lightBias = 1 - Math.abs(l - 0.72) * 1.6;
  const midL = Math.max(darkBias, lightBias);
  return s * 1.4 * Math.max(0.15, midL);
}
function bucketKey(rgb) {
  const q = (channel) => Math.floor(channel / 24);
  return `${q(rgb.r)}-${q(rgb.g)}-${q(rgb.b)}`;
}
function averageRgb(data, pixelCount) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(pixelCount / 2e3));
  for (let i = 0; i < pixelCount; i += step) {
    const offset = i * 4;
    const alpha = data[offset + 3] ?? 255;
    if (alpha < 160) {
      continue;
    }
    r += data[offset] ?? 0;
    g += data[offset + 1] ?? 0;
    b += data[offset + 2] ?? 0;
    n += 1;
  }
  if (n === 0) {
    return null;
  }
  return { r: r / n, g: g / n, b: b / n };
}
function extractFromImageData(data, pixelCount) {
  const buckets = /* @__PURE__ */ new Map();
  const step = Math.max(1, Math.floor(pixelCount / 4e3));
  for (let i = 0; i < pixelCount; i += step) {
    const offset = i * 4;
    const alpha = data[offset + 3] ?? 255;
    if (alpha < 200) {
      continue;
    }
    const rgb = {
      r: data[offset] ?? 0,
      g: data[offset + 1] ?? 0,
      b: data[offset + 2] ?? 0
    };
    const weight = scorePixel(rgb);
    if (weight <= 0) {
      continue;
    }
    const key = bucketKey(rgb);
    const existing = buckets.get(key);
    if (existing) {
      existing.sum.r += rgb.r * weight;
      existing.sum.g += rgb.g * weight;
      existing.sum.b += rgb.b * weight;
      existing.weight += weight;
      existing.count += 1;
    } else {
      buckets.set(key, {
        sum: { r: rgb.r * weight, g: rgb.g * weight, b: rgb.b * weight },
        weight,
        count: 1
      });
    }
  }
  const ranked = [...buckets.values()].map((bucket) => {
    const rgb = {
      r: bucket.sum.r / bucket.weight,
      g: bucket.sum.g / bucket.weight,
      b: bucket.sum.b / bucket.weight
    };
    return {
      rgb,
      score: bucket.weight
    };
  }).sort((a, b) => b.score - a.score);
  const fallback = ranked.length === 0 ? averageRgb(data, pixelCount) : null;
  if (ranked.length === 0 && !fallback) {
    return null;
  }
  const rawPrimary = ranked[0]?.rgb ?? fallback;
  const rawSecondary = ranked[1]?.rgb;
  const rawTertiary = ranked[2]?.rgb;
  return {
    dark: bandFromRaw(rawPrimary, rawSecondary, rawTertiary, "dark"),
    light: bandFromRaw(rawPrimary, rawSecondary, rawTertiary, "light")
  };
}
function loadHtmlImage(uri, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    const onLoad = () => {
      cleanup();
      resolve(img);
    };
    const onError = () => {
      cleanup();
      reject(new Error("image load failed"));
    };
    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = uri;
  });
}
function isSameOriginFriendlyUri(uri) {
  if (uri.startsWith("data:") || uri.startsWith("blob:")) {
    return true;
  }
  if (typeof window === "undefined" || !window.location?.origin) {
    return false;
  }
  try {
    return new URL(uri, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}
function paletteFromHtmlImage(image) {
  const maxSide = 64;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
  const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.drawImage(image, 0, 0, width, height);
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return null;
  }
  return extractFromImageData(imageData.data, width * height);
}
async function extractAtmospherePaletteFromCoverUri(coverUri) {
  const uri = coverUri.trim();
  if (!uri || typeof document === "undefined") {
    return null;
  }
  try {
    if (isSameOriginFriendlyUri(uri)) {
      const image2 = await loadHtmlImage(uri, null);
      return paletteFromHtmlImage(image2);
    }
    const image = await loadHtmlImage(uri, "anonymous");
    return paletteFromHtmlImage(image);
  } catch {
    try {
      const image = await loadHtmlImage(uri, null);
      return paletteFromHtmlImage(image);
    } catch {
      return null;
    }
  }
}
function atmosphereCoverKey(coverUri) {
  const uri = coverUri?.trim() || "";
  if (!uri || uri.startsWith("blob:")) {
    return null;
  }
  return uri;
}
function isDualBandPalette(cached) {
  if (!cached || typeof cached !== "object") {
    return false;
  }
  const record = cached;
  const dark = record.dark;
  const light = record.light;
  return typeof dark?.primary === "string" && typeof light?.primary === "string" && record.extractVersion === ATMOSPHERE_EXTRACT_VERSION;
}
async function ensureTrackAtmospherePalette(input) {
  const { useMusicDemoStore: useMusicDemoStore2 } = await Promise.resolve().then(() => (init_store(), store_exports));
  const key = atmosphereCoverKey(input.coverKeyUri);
  const track = useMusicDemoStore2.getState().getTrack(input.trackId);
  const cached = track?.atmospherePalette;
  if (isDualBandPalette(cached) && key && cached.coverKey === key) {
    return { dark: cached.dark, light: cached.light };
  }
  const palette = await extractAtmospherePaletteFromCoverUri(input.extractUri);
  if (!palette) {
    return null;
  }
  if (key) {
    const still = useMusicDemoStore2.getState().getTrack(input.trackId);
    if (atmosphereCoverKey(still?.coverUri) === key) {
      useMusicDemoStore2.getState().updateTrack(input.trackId, {
        atmospherePalette: {
          dark: palette.dark,
          light: palette.light,
          coverKey: key,
          extractVersion: ATMOSPHERE_EXTRACT_VERSION
        }
      });
    }
  }
  return palette;
}

// src/resolve-desktop-stage-split.ts
var DESKTOP_COVER_COLUMN_PX = 320;
function estimateLyricContentWidthPx(text, fontSizePx) {
  const size = Math.max(1, fontSizePx);
  let width = 0;
  for (const ch of Array.from(text)) {
    if (/[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test(ch)) {
      width += size;
    } else if (/\s/.test(ch)) {
      width += size * 0.35;
    } else {
      width += size * 0.55;
    }
  }
  return width;
}
function maxLyricContentWidthPx(units, fontSizePx) {
  let max = 0;
  for (const unit of units) {
    for (const text of unit.texts) {
      max = Math.max(max, estimateLyricContentWidthPx(text, fontSizePx));
    }
  }
  return max;
}
function resolveDesktopStageSplit(input) {
  const stage = Math.max(0, input.stageWidthPx);
  const pad = input.lyricsChromePadPx ?? 48;
  const gap = input.stageGapPx ?? 16;
  const lyricNeed = Math.max(0, input.maxLyricContentWidthPx);
  if (stage <= 0) {
    return {
      mode: "fixed-cover",
      coverWidthPx: DESKTOP_COVER_COLUMN_PX,
      lyricsWidthPx: DESKTOP_COVER_COLUMN_PX * 2
    };
  }
  const usable = Math.max(0, stage - gap);
  if (usable < 560) {
    const coverWidthPx = Math.min(DESKTOP_COVER_COLUMN_PX, Math.floor(usable * 0.4));
    return {
      mode: "fixed-cover",
      coverWidthPx,
      lyricsWidthPx: Math.max(0, usable - coverWidthPx)
    };
  }
  const ratioCover = Math.floor(usable / 3);
  const ratioLyrics = usable - ratioCover;
  const lyricsInnerAtRatio = Math.max(0, ratioLyrics - pad);
  if (lyricNeed > lyricsInnerAtRatio) {
    const coverWidthPx = Math.min(DESKTOP_COVER_COLUMN_PX, ratioCover);
    return {
      mode: "fixed-cover",
      coverWidthPx,
      lyricsWidthPx: Math.max(0, usable - coverWidthPx)
    };
  }
  return {
    mode: "ratio-1-2",
    coverWidthPx: ratioCover,
    lyricsWidthPx: ratioLyrics
  };
}

// src/player.tsx
init_music_autoplay();
init_playback_session();

// src/host-feedback.ts
init_music_ids();
init_music_host();
function formatSuccessMessage(input) {
  if (!input) {
    return void 0;
  }
  const title = input.title.trim();
  const message = input.message?.trim();
  if (message) {
    return `${title}\uFF1A${message}`;
  }
  return title;
}
async function runWithMusicHostTask(host2, input, task) {
  const handle = host2.ui.progress.create({
    title: input.title,
    message: input.message,
    appId: MUSIC_APP_ID,
    total: input.total
  });
  try {
    const result = await task((patch) => handle.report(patch));
    handle.end({
      kind: "success",
      message: formatSuccessMessage(input.notifyOnSuccess)
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    handle.end({ kind: "error", message });
    throw error instanceof Error ? error : new Error(message);
  }
}
function notifyMusicPlayerError(message) {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }
  const host2 = tryGetMusicHostApi();
  host2?.ui.notification.show({
    title: trimmed,
    kind: "error"
  });
}
function inferMusicPlayerToastKind(message) {
  if (/失败|无法|错误/.test(message)) {
    return "error";
  }
  if (message.startsWith("\u5DF2") && !message.includes("\u6B63\u5728")) {
    return "success";
  }
  return "info";
}
function notifyMusicPlayerToast(message) {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }
  const host2 = tryGetMusicHostApi();
  host2?.ui.notification.show({
    title: trimmed,
    kind: inferMusicPlayerToastKind(trimmed)
  });
}

// src/resource/download-bundle.ts
init_music_ids();
init_store();
init_cover_url_quality();
init_provider_catalog();
function sanitizeFileBase(name) {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return cleaned.slice(0, 80) || "track";
}
function textToDataUrl(text, mimeType) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 32768;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
function isHttpUri(uri) {
  return typeof uri === "string" && /^https?:\/\//.test(uri);
}
function isLocalPersistedUri(uri) {
  return typeof uri === "string" && uri.length > 0 && !isHttpUri(uri) && !uri.startsWith("blob:");
}
function musicFileNameFromUri(uri) {
  if (!uri?.trim()) {
    return null;
  }
  const cleaned = uri.trim().split(/[?#]/)[0] ?? "";
  const parts = cleaned.split(/[/\\]/).filter(Boolean);
  const name = parts[parts.length - 1]?.trim();
  return name || null;
}
function buildMusicTrackFileBase(track) {
  return sanitizeFileBase(`${track.title}-${track.artist || "unknown"}`);
}
async function readMusicDownloadBundle(hostApi2, trackId) {
  try {
    const existing = await hostApi2.storage.readJson(
      MUSIC_APP_ID,
      `download-bundle.${trackId}`
    );
    if (existing?.trackId === trackId && existing.sourceUri) {
      return existing;
    }
  } catch {
  }
  return null;
}
function resolveMusicLocalAudioUri(track, bundle) {
  if (isLocalPersistedUri(track.sourceUri)) {
    return track.sourceUri;
  }
  if (bundle && isLocalPersistedUri(bundle.sourceUri)) {
    return bundle.sourceUri;
  }
  return null;
}
async function restoreTrackFromDownloadBundleIfNeeded(hostApi2, trackId) {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    return false;
  }
  if (isLocalPersistedUri(track.sourceUri) && track.sourceKind === "local") {
    return false;
  }
  const bundle = await readMusicDownloadBundle(hostApi2, trackId);
  if (!bundle || !isLocalPersistedUri(bundle.sourceUri)) {
    return false;
  }
  useMusicDemoStore.getState().updateTrack(trackId, {
    sourceUri: bundle.sourceUri,
    sourceKind: "local",
    coverUri: bundle.coverUri ?? track.coverUri,
    lyrics: bundle.lyrics ?? track.lyrics
  });
  return true;
}
function isMusicLocalPersistedUri(uri) {
  return isLocalPersistedUri(uri);
}
async function resolveMusicLyricsDisplayPath(hostApi2, track, bundle) {
  const fromBundle = bundle?.lyricsUri?.trim();
  if (fromBundle && isLocalPersistedUri(fromBundle)) {
    if (track.lyricsUri !== fromBundle) {
      useMusicDemoStore.getState().updateTrack(track.id, { lyricsUri: fromBundle });
    }
    return fromBundle;
  }
  const fromTrack = track.lyricsUri?.trim();
  if (fromTrack && isLocalPersistedUri(fromTrack)) {
    return fromTrack;
  }
  const text = (bundle?.lyrics || track.lyrics || "").trim();
  if (!text) {
    return null;
  }
  const baseName = buildMusicTrackFileBase(track);
  const file = await hostApi2.files.importFromUrl({
    appId: MUSIC_APP_ID,
    url: textToDataUrl(text, "text/plain;charset=utf-8"),
    title: `${track.title} \u6B4C\u8BCD`,
    fileName: `${baseName}.lrc`,
    mimeType: "text/plain"
  }).catch(() => null);
  const uri = file?.uri?.trim();
  if (!uri || !isLocalPersistedUri(uri)) {
    return null;
  }
  useMusicDemoStore.getState().updateTrack(track.id, {
    lyricsUri: uri,
    lyrics: text
  });
  if (bundle) {
    const next = {
      ...bundle,
      lyricsUri: uri,
      lyricsByteSize: file?.byteSize ?? bundle.lyricsByteSize,
      lyrics: text,
      savedAt: Date.now()
    };
    await hostApi2.storage.writeJson(MUSIC_APP_ID, `download-bundle.${track.id}`, next).catch(() => {
    });
  }
  return uri;
}
async function importRequired(hostApi2, input) {
  const file = await hostApi2.files.importFromUrl({
    appId: MUSIC_APP_ID,
    url: input.url,
    title: input.title,
    fileName: input.fileName,
    mimeType: input.mimeType
  });
  if (!file.uri || typeof file.byteSize === "number" && file.byteSize <= 0) {
    throw new Error(`\u843D\u76D8\u5931\u8D25\uFF1A${input.title}`);
  }
  return file;
}
async function resolveAudioSource(track, playableUrl) {
  let audioUrl = playableUrl?.trim() || "";
  let audioExt = "mp3";
  if (!audioUrl && isHttpUri(track.sourceUri)) {
    audioUrl = track.sourceUri;
  }
  if (!audioUrl) {
    if (!track.remoteRef) {
      throw new Error("\u6CA1\u6709\u53EF\u4E0B\u8F7D\u5730\u5740");
    }
    const resolved = await resolveMusicPlayable(track.remoteRef);
    if (!resolved?.url) {
      throw new Error("\u89E3\u6790\u4E0D\u5230\u53EF\u4E0B\u8F7D\u5730\u5740");
    }
    return { url: resolved.url, ext: resolved.ext ?? "mp3" };
  }
  const match = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(audioUrl);
  if (match?.[1]) {
    audioExt = match[1].toLowerCase();
  }
  return { url: audioUrl, ext: audioExt };
}
async function maybeProxyDownloadUrl(url, track) {
  const providerId = track.remoteRef?.providerId;
  const referer = getMusicProviderReferer(providerId);
  if (referer) {
    return resolveMusicPlayableSrc(url, { referer });
  }
  return url;
}
async function downloadOptionalCover(hostApi2, track, baseName) {
  const coverSource = track.coverUri ?? null;
  if (!isHttpUri(coverSource)) {
    return null;
  }
  const hiResSource = coverUrlForStorage(coverSource);
  const url = await maybeProxyDownloadUrl(hiResSource, track).catch(() => hiResSource);
  return hostApi2.files.importFromUrl({
    appId: MUSIC_APP_ID,
    url,
    title: `${track.title} \u5C01\u9762`,
    fileName: `${baseName}-cover.jpg`
  }).catch(() => null);
}
async function persistAtmosphereAfterCoverDownload(trackId, coverUri) {
  const coverForExtract = coverUri?.trim() || null;
  if (!coverForExtract || coverForExtract.startsWith("blob:")) {
    return;
  }
  try {
    await ensureTrackAtmospherePalette({
      trackId,
      coverKeyUri: coverForExtract,
      extractUri: coverForExtract
    });
  } catch {
  }
}
async function downloadFreshBundle(hostApi2, track, playableUrl) {
  const baseName = sanitizeFileBase(`${track.title}-${track.artist || "unknown"}`);
  const audio = await resolveAudioSource(track, playableUrl);
  const audioDownloadUrl = await maybeProxyDownloadUrl(audio.url, track);
  const audioFile = await importRequired(hostApi2, {
    url: audioDownloadUrl,
    title: `${track.title} - ${track.artist || "\u672A\u77E5\u827A\u4EBA"}`,
    fileName: `${baseName}.${audio.ext}`,
    mimeType: audio.ext === "flac" ? "audio/flac" : void 0
  });
  if (!audioFile.byteSize || audioFile.byteSize <= 0) {
    throw new Error("\u97F3\u9891\u843D\u76D8\u4E3A\u7A7A\uFF0C\u62D2\u7EDD\u6807\u8BB0\u4E3A\u5DF2\u4FDD\u5B58");
  }
  const [coverFile, lyricsResult] = await Promise.all([
    downloadOptionalCover(hostApi2, track, baseName),
    downloadOptionalLyrics(hostApi2, {
      remoteRef: track.remoteRef,
      track,
      baseName
    })
  ]);
  const coverUri = resolveCoverUri(coverFile, track.coverUri ?? null);
  useMusicDemoStore.getState().updateTrack(track.id, {
    sourceUri: audioFile.uri,
    sourceKind: "local",
    coverUri,
    lyrics: lyricsResult.lyrics,
    lyricsUri: lyricsResult.file?.uri ?? track.lyricsUri ?? null
  });
  const report = {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album ?? "",
    remoteRef: track.remoteRef ?? null,
    sourceUri: audioFile.uri,
    sourceByteSize: audioFile.byteSize,
    coverUri,
    coverByteSize: coverFile?.byteSize ?? null,
    lyricsUri: lyricsResult.file?.uri ?? null,
    lyricsByteSize: lyricsResult.file?.byteSize ?? null,
    lyrics: lyricsResult.lyrics ?? null,
    savedAt: Date.now()
  };
  await hostApi2.storage.writeJson(MUSIC_APP_ID, `download-bundle.${track.id}`, report);
  await persistAtmosphereAfterCoverDownload(track.id, coverUri);
  return report;
}
async function downloadOptionalLyrics(hostApi2, input) {
  const fetched = input.remoteRef ? await fetchMusicLyrics(input.remoteRef) : null;
  let lyrics = input.track.lyrics ?? null;
  const fetchedText = fetched?.text?.trim() ?? "";
  if (fetchedText && lyricsLikelyBelongToTrack(fetchedText, input.track.title)) {
    lyrics = fetchedText;
  } else if (fetchedText || lyrics && !lyricsLikelyBelongToTrack(lyrics, input.track.title)) {
    lyrics = null;
  }
  if (fetched?.fileUrl && lyrics) {
    const file = await hostApi2.files.importFromUrl({
      appId: MUSIC_APP_ID,
      url: fetched.fileUrl,
      title: `${input.track.title} \u6B4C\u8BCD`,
      fileName: `${input.baseName}.lrc`,
      mimeType: "text/plain"
    }).catch(() => null);
    return { lyrics, file };
  }
  if (lyrics?.trim()) {
    const file = await hostApi2.files.importFromUrl({
      appId: MUSIC_APP_ID,
      url: textToDataUrl(lyrics, "text/plain;charset=utf-8"),
      title: `${input.track.title} \u6B4C\u8BCD`,
      fileName: `${input.baseName}.lrc`,
      mimeType: "text/plain"
    }).catch(() => null);
    return { lyrics, file };
  }
  return { lyrics, file: null };
}
async function readExistingBundle(hostApi2, track) {
  if (track.sourceKind !== "local" || !isLocalPersistedUri(track.sourceUri)) {
    return null;
  }
  const existing = await hostApi2.storage.readJson(
    MUSIC_APP_ID,
    `download-bundle.${track.id}`
  );
  if (existing?.sourceUri === track.sourceUri && existing.sourceByteSize > 0) {
    return existing;
  }
  return null;
}
function resolveCoverUri(coverFile, coverSource) {
  if (coverFile?.uri) {
    return coverFile.uri;
  }
  if (coverSource && !isHttpUri(coverSource)) {
    return coverSource;
  }
  return null;
}
async function downloadAndPersistTrackBundle(hostApi2, trackId, options) {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("\u66F2\u76EE\u4E0D\u5B58\u5728");
  }
  if (!options?.force) {
    const existing = await readExistingBundle(hostApi2, track);
    if (existing) {
      return existing;
    }
  }
  return runWithMusicHostTask(
    hostApi2,
    {
      title: "\u4E0B\u8F7D\u66F2\u76EE",
      message: `${track.title}${track.artist ? ` \xB7 ${track.artist}` : ""}`,
      notifyOnSuccess: {
        title: "\u5DF2\u4FDD\u5B58\u5230\u672C\u5730",
        message: track.title
      },
      notifyOnError: true
    },
    async (report) => {
      report({ message: "\u4E0B\u8F7D\u97F3\u9891\u2026" });
      const result = await downloadFreshBundle(hostApi2, track, options?.playableUrl);
      report({ message: "\u5199\u5165\u6E05\u5355\u2026", value: 1, total: 1 });
      return result;
    }
  );
}

// src/resource/track-files.ts
init_music_ids();
init_store();
function extensionOfUri(uri, fallback) {
  const name = musicFileNameFromUri(uri);
  const match = name ? /\.([A-Za-z0-9]{1,8})$/.exec(name) : null;
  return match?.[1]?.toLowerCase() ?? fallback;
}
function collectManagedLocalUris(track, bundle, lyricsPath) {
  const uris = /* @__PURE__ */ new Set();
  const push = (uri) => {
    const value = uri?.trim();
    if (value && isMusicLocalPersistedUri(value)) {
      uris.add(value);
    }
  };
  push(resolveMusicLocalAudioUri(track, bundle));
  push(track.coverUri);
  push(bundle?.coverUri);
  push(lyricsPath);
  push(bundle?.lyricsUri);
  return [...uris];
}
async function exportMusicTrackZip(hostApi2, trackId) {
  let track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("\u66F2\u76EE\u4E0D\u5B58\u5728");
  }
  let bundle = await readMusicDownloadBundle(hostApi2, trackId);
  let audioUri = resolveMusicLocalAudioUri(track, bundle);
  if (!audioUri) {
    await downloadAndPersistTrackBundle(hostApi2, trackId, {
      playableUrl: track.sourceUri && /^https?:\/\//.test(track.sourceUri) ? track.sourceUri : null,
      force: true
    });
    track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
    if (!track) {
      throw new Error("\u66F2\u76EE\u4E0D\u5B58\u5728");
    }
    bundle = await readMusicDownloadBundle(hostApi2, trackId);
    audioUri = resolveMusicLocalAudioUri(track, bundle);
  }
  if (!audioUri) {
    throw new Error("\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u672C\u5730\u97F3\u6E90\uFF0C\u8BF7\u5148\u300C\u66F4\u65B0\u8D44\u6E90\u300D");
  }
  const lyricsPath = await resolveMusicLyricsDisplayPath(hostApi2, track, bundle);
  bundle = await readMusicDownloadBundle(hostApi2, trackId);
  const coverUri = (bundle?.coverUri && isMusicLocalPersistedUri(bundle.coverUri) ? bundle.coverUri : null) || (track.coverUri && isMusicLocalPersistedUri(track.coverUri) ? track.coverUri : null);
  const base = buildMusicTrackFileBase(track);
  const entries = [
    { name: `${base}.${extensionOfUri(audioUri, "mp3")}`, uri: audioUri }
  ];
  if (coverUri) {
    entries.push({ name: `${base}.${extensionOfUri(coverUri, "jpg")}`, uri: coverUri });
  }
  if (lyricsPath) {
    entries.push({ name: `${base}.lrc`, uri: lyricsPath });
  }
  const result = await hostApi2.files.exportZip({
    title: "\u9009\u62E9\u5BFC\u51FA\u76EE\u5F55",
    fileName: `${base}.zip`,
    entries
  });
  if (!result) {
    throw new Error("\u5DF2\u53D6\u6D88\u5BFC\u51FA");
  }
  return { path: result.path, entryCount: result.entryCount };
}
async function deleteMusicTrackCompletely(hostApi2, trackId) {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    return false;
  }
  const bundle = await readMusicDownloadBundle(hostApi2, trackId);
  const lyricsPath = bundle?.lyricsUri && isMusicLocalPersistedUri(bundle.lyricsUri) ? bundle.lyricsUri : null;
  const uris = collectManagedLocalUris(track, bundle, lyricsPath);
  if (uris.length > 0) {
    await hostApi2.files.deleteUris(uris).catch(() => ({ deleted: [], skipped: uris }));
  }
  await hostApi2.storage.writeJson(MUSIC_APP_ID, `download-bundle.${trackId}`, null).catch(() => {
  });
  return useMusicDemoStore.getState().deleteTrack(trackId);
}

// src/resource/refresh-resources.ts
init_store();
init_provider_catalog();
function isStockBrowserProvider(providerId) {
  return isDeferredBrowserProviderId(providerId);
}
function buildMessage(input) {
  const parts = [];
  if (input.audioSaved) {
    parts.push("\u97F3\u6E90");
  }
  if (input.coverSaved) {
    parts.push("\u5C01\u9762");
  }
  if (input.lyricsSaved) {
    parts.push("\u6B4C\u8BCD");
  }
  if (parts.length === 0) {
    return "\u5DF2\u5C1D\u8BD5\u66F4\u65B0\uFF0C\u4F46\u672A\u80FD\u843D\u76D8\u4EFB\u4F55\u6587\u4EF6";
  }
  return `\u5DF2\u66F4\u65B0\u5E76\u4FDD\u5B58\u5230\u672C\u5730\uFF1A${parts.join(" \xB7 ")}`;
}
async function applyLyricsPatchForRemote(track, patch, providerId) {
  if (isStockBrowserProvider(providerId)) {
    if (!track.lyrics?.trim()) {
      return false;
    }
    patch.lyrics = null;
    return true;
  }
  const lyrics = await fetchMusicLyrics(track.remoteRef).catch(() => null);
  const text = lyrics?.text?.trim() ?? "";
  const titleForCheck = (patch.title ?? track.title).trim();
  if (text && lyricsLikelyBelongToTrack(text, titleForCheck)) {
    patch.lyrics = text;
    return true;
  }
  patch.lyrics = null;
  return Boolean(track.lyrics?.trim()) || Boolean(text);
}
async function buildRemoteResourcePatch(track) {
  if (!track.remoteRef) {
    throw new Error("\u5F53\u524D\u66F2\u76EE\u6CA1\u6709\u8FDC\u7A0B\u6765\u6E90\uFF0C\u65E0\u6CD5\u540C\u6E90\u66F4\u65B0\uFF08\u672C\u5730\u4E0A\u4F20\u8BF7\u91CD\u65B0\u5BFC\u5165\uFF09");
  }
  const resolved = await resolveMusicPlayable(track.remoteRef);
  if (!resolved?.url?.trim()) {
    throw new Error("\u672A\u80FD\u4ECE\u6E90\u7AD9\u91CD\u65B0\u89E3\u6790\u5230\u53EF\u64AD\u5730\u5740");
  }
  if (resolved.remoteId && track.remoteRef.remoteId && resolved.remoteId !== track.remoteRef.remoteId) {
    throw new Error("\u6E90\u7AD9\u8FD4\u56DE\u4E86\u53E6\u4E00\u9996\u6B4C\u7684\u8D44\u6E90\uFF0C\u5DF2\u4E2D\u6B62\u66F4\u65B0\uFF08\u8BF7\u91CD\u8BD5\u6216\u6362\u6E90\uFF09");
  }
  const patch = {
    sourceUri: resolved.url.trim(),
    sourceKind: "cloud"
  };
  let coverUpdated = false;
  if (resolved.coverUrl?.trim()) {
    patch.coverUri = resolved.coverUrl.trim();
    coverUpdated = true;
  }
  const lyricsUpdated = await applyLyricsPatchForRemote(track, patch, track.remoteRef.providerId);
  return { patch, playableUpdated: true, coverUpdated, lyricsUpdated };
}
function summarizeBundle(bundle) {
  return {
    audioSaved: isMusicLocalPersistedUri(bundle.sourceUri) && bundle.sourceByteSize > 0,
    coverSaved: isMusicLocalPersistedUri(bundle.coverUri),
    lyricsSaved: isMusicLocalPersistedUri(bundle.lyricsUri) || Boolean(bundle.lyrics?.trim())
  };
}
async function refreshTrackResourcesAndMaybePersist(hostApi2, trackId, _options) {
  const track = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("\u66F2\u76EE\u4E0D\u5B58\u5728");
  }
  const built = await buildRemoteResourcePatch(track);
  useMusicDemoStore.getState().updateTrack(trackId, built.patch);
  const latest = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
  const bundle = await downloadAndPersistTrackBundle(hostApi2, trackId, {
    playableUrl: latest?.sourceUri && /^https?:\/\//i.test(latest.sourceUri) ? latest.sourceUri : null,
    force: true
  });
  const saved = summarizeBundle(bundle);
  return {
    trackId,
    playableUpdated: built.playableUpdated && saved.audioSaved,
    coverUpdated: saved.coverSaved,
    lyricsUpdated: saved.lyricsSaved,
    persistedLocal: true,
    message: buildMessage(saved)
  };
}

// src/track-menu-run.ts
init_music_autoplay();
init_store();

// src/track-detail.tsx
init_music_ids();
init_platform_registry();
init_store();
var import_jsx_runtime9 = require("react/jsx-runtime");
function resolveTrackPlatformLabel(input) {
  if (input.providerId) {
    return getMusicPlatformLabel(input.providerId);
  }
  if (input.sourceKind === "local") {
    return "\u672C\u5730";
  }
  return "\u5728\u7EBF";
}
function resolveMusicPublicDetailTrackId(context) {
  const state = useMusicDemoStore.getState();
  const entityId = context?.entityId?.trim();
  if (entityId && entityId !== "now-playing") {
    if (state.getTrack(entityId)) {
      return entityId;
    }
  }
  return state.nowPlayingId?.trim() || null;
}
function resolveLyricsDetailValue(track) {
  const lyricsPath = track.lyricsUri?.trim();
  if (lyricsPath) {
    return lyricsPath;
  }
  if ((track.lyrics || "").trim()) {
    return "\u6709\u6B4C\u8BCD\u6587\u672C\uFF0C\u4F46\u672A\u80FD\u5199\u5165\u672C\u5730\u6587\u4EF6";
  }
  return "\u65E0";
}
function buildMusicTrackPublicDetailExtraRows(input) {
  const trackId = resolveMusicPublicDetailTrackId(input.context);
  if (!trackId) {
    return [{ label: "\u66F2\u76EE", value: "\u5F53\u524D\u65E0\u64AD\u653E\u66F2\u76EE" }];
  }
  const track = useMusicDemoStore.getState().getTrack(trackId);
  if (!track) {
    return [{ label: "\u66F2\u76EE", value: "\u66F2\u76EE\u4E0D\u5B58\u5728" }];
  }
  const platform = resolveTrackPlatformLabel({
    providerId: track.remoteRef?.providerId,
    sourceKind: track.sourceKind
  });
  const localAudioUri = resolveMusicLocalAudioUri(track, input.bundle ?? null);
  const coverUri = (track.coverUri || "").trim();
  const playUrl = localAudioUri || track.sourceUri || "\u65E0";
  const isLocalSource = Boolean(localAudioUri) || track.sourceKind === "local";
  const palette = track.atmospherePalette;
  const dataRoot = (input.dataRoot || "").trim() || "\u2014";
  const atmosphereRow = palette?.dark?.primary ? {
    label: "\u6C1B\u56F4\u8272",
    value: `${palette.light.primary} / ${palette.dark.primary}`,
    helpText: "\u5F00\u6C89\u6D78\u65F6\u7F13\u5B58\u6D45/\u6DF1\u53CC\u5957\uFF1B\u5207\u4E3B\u9898\u9009\u7528\u5BF9\u5E94\u5957\u3002\u53EF\u590D\u5236 JSON \u6216\u52A0\u5165\u300C\u6211\u7684\u6C1B\u56F4\u300D\u3002",
    valueContent: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      MusicAtmosphereDetailField,
      {
        hostApi: input.hostApi,
        primary: palette.dark.primary,
        secondary: palette.dark.secondary,
        tertiary: palette.dark.tertiary,
        luminance: "dark",
        sourceLabel: track.title
      }
    )
  } : {
    label: "\u6C1B\u56F4\u8272",
    value: coverUri ? "\u53D6\u8272\u5931\u8D25\u6216\u672A\u7F13\u5B58" : "\u65E0\u5C01\u9762"
  };
  return [
    { label: "\u6B4C\u540D", value: track.title, copyText: track.title },
    {
      label: "\u827A\u4EBA",
      value: track.artist || "\u672A\u77E5\u827A\u4EBA",
      copyText: track.artist || "\u672A\u77E5\u827A\u4EBA"
    },
    { label: "\u4E13\u8F91", value: track.album || "\u65E0", copyText: track.album || "\u65E0" },
    { label: "\u5E73\u53F0", value: platform, copyText: platform },
    {
      label: "\u6765\u6E90",
      value: isLocalSource ? "\u672C\u5730\u6587\u4EF6" : "\u5728\u7EBF\u4E91\u64AD"
    },
    {
      label: "\u9875\u9762",
      value: track.remoteRef?.pageUrl || "\u65E0",
      copyText: track.remoteRef?.pageUrl || void 0
    },
    { label: "\u64AD\u653E\u5730\u5740", value: playUrl, copyText: playUrl === "\u65E0" ? void 0 : playUrl },
    {
      label: "\u672C\u5730\u6587\u4EF6",
      value: localAudioUri || "\u65E0",
      copyText: localAudioUri || void 0
    },
    {
      label: "\u5C01\u9762",
      value: coverUri || "\u65E0",
      copyText: coverUri || void 0
    },
    {
      label: "\u6B4C\u8BCD",
      value: resolveLyricsDetailValue(track),
      copyText: track.lyricsUri?.trim() || void 0
    },
    atmosphereRow,
    { label: "\u5E94\u7528\u6570\u636E\u76EE\u5F55", value: dataRoot, copyText: dataRoot === "\u2014" ? void 0 : dataRoot }
  ];
}
async function openMusicTrackDetailSheet(hostApi2, _trackId) {
  if (hostApi2.ui.isTabPublicDetailOpen()) {
    hostApi2.ui.closeTabPublicDetail();
    return;
  }
  hostApi2.ui.openTabPublicDetail({
    appId: MUSIC_APP_ID,
    pane: "metadata"
  });
}

// src/track-menu-run.ts
async function runMusicTrackMenuAction(input) {
  const trackId = input.trackId.trim();
  if (!trackId) {
    return {};
  }
  const state = useMusicDemoStore.getState();
  const track = state.getTrack(trackId);
  if (!track) {
    return { toast: "\u66F2\u76EE\u4E0D\u5B58\u5728" };
  }
  switch (input.action) {
    case "pin": {
      state.togglePinned(trackId);
      const pinned = Boolean(state.getTrack(trackId)?.pinned);
      return { toast: pinned ? "\u5DF2\u7F6E\u9876" : "\u5DF2\u53D6\u6D88\u7F6E\u9876" };
    }
    case "addPlaylist":
      state.addToQueue(trackId, "end");
      return { toast: "\u5DF2\u6DFB\u52A0\u5230\u64AD\u653E\u5217\u8868" };
    case "playNext":
      state.addToQueue(trackId, "next");
      return { toast: "\u5DF2\u8BBE\u4E3A\u4E0B\u4E00\u9996\u64AD\u653E" };
    case "share":
      return { toast: "\u5206\u4EAB\uFF08\u5360\u4F4D\uFF09" };
    case "detail":
      await openMusicTrackDetailSheet(input.hostApi, trackId);
      return {};
    case "exportZip": {
      try {
        const result = await exportMusicTrackZip(input.hostApi, trackId);
        return { toast: `\u5DF2\u5BFC\u51FA ${result.entryCount} \u4E2A\u6587\u4EF6 \u2192 ${result.path}` };
      } catch (exportError) {
        const message = exportError instanceof Error ? exportError.message : "\u5BFC\u51FA\u5931\u8D25";
        if (message.includes("\u5DF2\u53D6\u6D88")) {
          return { toast: "\u5DF2\u53D6\u6D88\u5BFC\u51FA" };
        }
        return { toast: message };
      }
    }
    case "refreshResources": {
      if (!track.remoteRef) {
        return { toast: "\u672C\u5730\u4E0A\u4F20\u66F2\u76EE\u8BF7\u91CD\u65B0\u5BFC\u5165" };
      }
      try {
        const report = await refreshTrackResourcesAndMaybePersist(input.hostApi, trackId);
        return { toast: report.message, reloadPlayback: true };
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : "\u66F4\u65B0\u5931\u8D25";
        return { toast: message };
      }
    }
    case "deleteTrack": {
      const wasPlaying = state.nowPlayingId === trackId;
      try {
        const ok = await deleteMusicTrackCompletely(input.hostApi, trackId);
        if (!ok) {
          return { toast: "\u5220\u9664\u5931\u8D25\uFF1A\u66F2\u76EE\u4E0D\u5B58\u5728" };
        }
        if (wasPlaying) {
          const nextId = useMusicDemoStore.getState().nowPlayingId;
          if (nextId) {
            requestTrackAutoPlay(nextId);
          }
        }
        return { toast: "\u5DF2\u5220\u9664\u6B4C\u66F2\u53CA\u672C\u5730\u97F3\u6E90/\u5C01\u9762/\u6B4C\u8BCD" };
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : "\u5220\u9664\u5931\u8D25";
        return { toast: message };
      }
    }
    default:
      return {};
  }
}

// src/resource/cloud-playback.ts
init_playback_engine();
var PROVIDER_PRIORITY = [
  "qq",
  "netease",
  "kuwo",
  "kugou",
  "aiguo",
  "audiocom",
  "muzvox",
  "pixabay",
  "soundstripe",
  "migu",
  "bilibili"
];
function formatMusicPlaybackError(error, options) {
  if (isMusicPlayInterruptedError(error)) {
    return "";
  }
  let raw = "";
  if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === "string") {
    raw = error;
  }
  const lower = raw.toLowerCase();
  if (lower.includes("no supported source") || lower.includes("no supported sources") || lower.includes("notsupportederror") || lower.includes("format is not supported") || lower.includes("demuxer") || lower.includes("media_err_src_not_supported")) {
    return options?.cloud ? "\u4E91\u7AEF\u97F3\u6E90\u6682\u65F6\u65E0\u6CD5\u64AD\u653E\uFF0C\u6B63\u5728\u5C1D\u8BD5\u5176\u4ED6\u6765\u6E90\u2026" : "\u65E0\u6CD5\u64AD\u653E\u8BE5\u97F3\u9891\uFF08\u683C\u5F0F\u6216\u5730\u5740\u4E0D\u53D7\u652F\u6301\uFF09";
  }
  if (lower.includes("network") || lower.includes("failed to fetch") || lower.includes("load")) {
    return options?.cloud ? "\u4E91\u7AEF\u97F3\u6E90\u52A0\u8F7D\u5931\u8D25\uFF0C\u6B63\u5728\u5C1D\u8BD5\u5176\u4ED6\u6765\u6E90\u2026" : "\u97F3\u9891\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u6216\u6587\u4EF6";
  }
  if (options?.cloud) {
    return "\u4E91\u7AEF\u97F3\u6E90\u6682\u65F6\u65E0\u6CD5\u64AD\u653E\uFF0C\u53EF\u5C1D\u8BD5\u66F4\u65B0\u8D44\u6E90\u6216\u5176\u4ED6\u7248\u672C";
  }
  return raw.trim() || "\u65E0\u6CD5\u64AD\u653E\u8BE5\u6587\u4EF6";
}
function cloudPlaybackGaveUpMessage() {
  return "\u4E91\u7AEF\u97F3\u6E90\u6682\u65F6\u65E0\u6CD5\u64AD\u653E\uFF0C\u53EF\u5C1D\u8BD5\u300C\u66F4\u65B0\u8D44\u6E90\u300D\u6216\u5176\u4ED6\u641C\u7D22\u7ED3\u679C";
}
function providerRank(providerId) {
  const index = PROVIDER_PRIORITY.indexOf(providerId);
  return index >= 0 ? index : PROVIDER_PRIORITY.length + 1;
}
async function findCloudPlayableAlternates(input) {
  const title = input.title.trim();
  if (!title) {
    return [];
  }
  const artist = (input.artist ?? "").trim();
  const exclude = new Set(
    [...input.excludeUrls ?? []].map((item) => item.trim()).filter(Boolean)
  );
  const queryText = artist ? `${title} ${artist}` : title;
  const page = await searchPlayableMusic({
    text: queryText,
    scope: "track",
    limit: 24
  });
  const titleLower = title.toLowerCase();
  const artistLower = artist.toLowerCase();
  const scored = page.tracks.filter((hit) => {
    const url = hit.playableUrl?.trim();
    if (!url || exclude.has(url)) {
      return false;
    }
    if (hit.title.trim().toLowerCase() !== titleLower && !hit.title.toLowerCase().includes(titleLower)) {
      if (!titleLower.includes(hit.title.trim().toLowerCase())) {
        return false;
      }
    }
    return true;
  }).map((hit) => {
    let score = 0;
    if (hit.title.trim().toLowerCase() === titleLower) {
      score += 8;
    } else if (hit.title.toLowerCase().includes(titleLower)) {
      score += 4;
    }
    if (artistLower && hit.artist.toLowerCase().includes(artistLower)) {
      score += 4;
    }
    if (input.preferProviderId && hit.ref.providerId === input.preferProviderId) {
      score -= 2;
    }
    score -= providerRank(hit.ref.providerId) * 0.1;
    return { hit, score };
  }).sort((left, right) => right.score - left.score);
  const limit = Math.max(1, Math.min(input.limit ?? 6, 12));
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const item of scored) {
    const url = item.hit.playableUrl?.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    result.push({
      url,
      providerId: item.hit.ref.providerId,
      remoteId: item.hit.ref.remoteId
    });
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

// src/player.tsx
init_provider_catalog();

// src/resource/ui-smoke.ts
init_music_ids();
init_store();
var MUSIC_UI_SMOKE_REQUEST_KEY = "ui-smoke-request";
var MUSIC_UI_SMOKE_RESULT_KEY = "ui-smoke-result";
function isSmokeRequest(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value;
  return typeof row.nonce === "string" && row.nonce.trim().length > 0 && typeof row.keyword === "string" && row.keyword.trim().length > 0 && typeof row.requestedAt === "number";
}
async function runMusicUiSmoke(hostApi2, request) {
  const steps = [];
  const keyword = request.keyword.trim();
  try {
    useMusicDemoStore.getState().setPlayerSurface("search");
    steps.push({ name: "open-search-surface", ok: true });
    useMusicDemoStore.getState().pushSearchHistory(keyword);
    const history = useMusicDemoStore.getState().searchHistory;
    steps.push({
      name: "push-search-history",
      ok: history.includes(keyword),
      detail: history.join(",")
    });
    const page = await searchMusic({ text: keyword, scope: "track" });
    const playable = page.tracks.filter((hit2) => Boolean(hit2.playableUrl?.trim()));
    steps.push({
      name: "search-playable-hits",
      ok: playable.length > 0,
      detail: `hits=${page.tracks.length} playable=${playable.length}`
    });
    if (playable.length === 0) {
      throw new Error(`\u641C\u7D22\u300C${keyword}\u300D\u6CA1\u6709\u53EF\u64AD\u76F4\u94FE`);
    }
    const hit = playable[0];
    const created = useMusicDemoStore.getState().upsertTrackFromSearchHit(hit);
    const playableUrl = hit.playableUrl?.trim() || null;
    steps.push({
      name: "upsert-track",
      ok: Boolean(created.id) && Boolean(playableUrl),
      detail: `${created.title} (${created.id}) url=${playableUrl ? "yes" : "no"}`
    });
    useMusicDemoStore.getState().updateTrack(created.id, {
      sourceUri: playableUrl,
      sourceKind: "cloud"
    });
    useMusicDemoStore.getState().setNowPlaying(created.id);
    useMusicDemoStore.getState().setWantsPlaying(true);
    useMusicDemoStore.getState().setPlayerSurface("search");
    const afterPlay = useMusicDemoStore.getState();
    const playing = afterPlay.tracks.find((item) => item.id === created.id);
    steps.push({
      name: "cloud-play-stay-search",
      ok: afterPlay.playerSurface === "search" && playing?.sourceKind === "cloud" && Boolean(playing.sourceUri && /^https?:\/\//.test(playing.sourceUri)),
      detail: `surface=${afterPlay.playerSurface} kind=${playing?.sourceKind}`
    });
    const report = await downloadAndPersistTrackBundle(hostApi2, created.id, {
      playableUrl,
      force: true
    });
    const track = useMusicDemoStore.getState().tracks.find((item) => item.id === created.id);
    const localOk = report.sourceByteSize >= 1e3 && track?.sourceKind === "local" && Boolean(track.sourceUri) && !/^https?:\/\//.test(track.sourceUri ?? "");
    steps.push({
      name: "save-local-overwrite",
      ok: localOk,
      detail: `bytes=${report.sourceByteSize} uri=${report.sourceUri}`
    });
    if (!localOk) {
      throw new Error("\u843D\u76D8\u5931\u8D25\u6216\u4ECD\u662F\u8FDC\u7A0B URL");
    }
    const result = {
      nonce: request.nonce,
      ok: steps.every((step) => step.ok),
      steps,
      finishedAt: Date.now(),
      searchHitCount: page.tracks.length,
      playableHitCount: playable.length,
      downloaded: {
        trackId: created.id,
        title: report.title,
        sourceUri: report.sourceUri,
        byteSize: report.sourceByteSize
      }
    };
    await hostApi2.storage.writeJson(MUSIC_APP_ID, MUSIC_UI_SMOKE_RESULT_KEY, result);
    return result;
  } catch (error) {
    const result = {
      nonce: request.nonce,
      ok: false,
      steps,
      error: error instanceof Error ? error.message : String(error),
      finishedAt: Date.now()
    };
    await hostApi2.storage.writeJson(MUSIC_APP_ID, MUSIC_UI_SMOKE_RESULT_KEY, result);
    return result;
  }
}
function startMusicUiSmokeWatcher(hostApi2) {
  let stopped = false;
  let running = false;
  let lastNonce = null;
  const tick = async () => {
    if (stopped || running) {
      return;
    }
    running = true;
    try {
      const raw = await hostApi2.storage.readJson(MUSIC_APP_ID, MUSIC_UI_SMOKE_REQUEST_KEY);
      if (!isSmokeRequest(raw)) {
        return;
      }
      if (raw.nonce === lastNonce) {
        return;
      }
      if (Date.now() - raw.requestedAt > 5 * 6e4) {
        return;
      }
      lastNonce = raw.nonce;
      await runMusicUiSmoke(hostApi2, raw);
    } catch (error) {
      console.warn("[com.example.music] ui smoke watcher failed", error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    void tick();
  }, 1500);
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

// src/player.tsx
init_playback_engine();
init_playback_runtime();

// src/playback-ui-clock.ts
var MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS = 200;
function shouldCommitPlaybackUiTime(input) {
  if (input.force) {
    return { commit: true, reason: "force" };
  }
  const minInterval = input.minIntervalMs ?? MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS;
  if (input.nowMs - input.lastCommitMs >= minInterval) {
    return { commit: true, reason: "interval" };
  }
  return { commit: false };
}

// src/playback-ui-time-store.ts
var timeSec = 0;
var pendingTimeSec = 0;
var lastCommitMs = 0;
var trailingTimer = null;
var listeners = /* @__PURE__ */ new Set();
function emit() {
  for (const listener of listeners) {
    listener();
  }
}
function getPlaybackUiTime() {
  return timeSec;
}
function subscribePlaybackUiTime(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function commitTime(next, nowMs) {
  if (trailingTimer) {
    clearTimeout(trailingTimer);
    trailingTimer = null;
  }
  lastCommitMs = nowMs;
  if (timeSec === next) {
    return;
  }
  timeSec = next;
  emit();
}
function publishPlaybackUiTime(time, force = false) {
  pendingTimeSec = time;
  const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
  const decision = shouldCommitPlaybackUiTime({
    nowMs,
    lastCommitMs,
    force,
    minIntervalMs: MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS
  });
  if (decision.commit) {
    commitTime(time, nowMs);
    return;
  }
  if (trailingTimer) {
    return;
  }
  trailingTimer = setTimeout(() => {
    trailingTimer = null;
    commitTime(pendingTimeSec, typeof performance !== "undefined" ? performance.now() : Date.now());
  }, MUSIC_PLAYBACK_UI_MIN_INTERVAL_MS);
}

// src/music-lyrics-karaoke.tsx
var import_react10 = require("react");
var import_react_native8 = require("react-native");

// src/use-playback-ui-time.ts
var import_react9 = require("react");
function usePlaybackUiTime() {
  return (0, import_react9.useSyncExternalStore)(subscribePlaybackUiTime, getPlaybackUiTime, getPlaybackUiTime);
}
function usePlaybackLyricHighlight(input) {
  const cacheRef = (0, import_react9.useRef)({
    activeIndex: -1,
    progress: 0,
    signature: "-1"
  });
  const unitsRef = (0, import_react9.useRef)(input.units);
  const progressLinesRef = (0, import_react9.useRef)(input.progressLines);
  unitsRef.current = input.units;
  progressLinesRef.current = input.progressLines;
  return (0, import_react9.useSyncExternalStore)(
    subscribePlaybackUiTime,
    () => {
      const time = getPlaybackUiTime();
      const units = unitsRef.current;
      const progressLines = progressLinesRef.current;
      const activeIndex = activeLyricIndex(units, time);
      const rawProgress = lyricLineProgress(progressLines, activeIndex, time);
      const progress = quantizeLyricProgress(rawProgress, 12);
      const signature = `${activeIndex}:${Math.round(progress * 12)}`;
      if (signature === cacheRef.current.signature) {
        return cacheRef.current;
      }
      const next = { activeIndex, progress, signature };
      cacheRef.current = next;
      return next;
    },
    () => cacheRef.current
  );
}

// src/music-lyrics-karaoke.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
var KARAOKE_STYLE_ID = "agnx-music-lyric-karaoke-v8";
var LEGACY_KARAOKE_STYLE_IDS = [
  "agnx-music-lyric-karaoke-v1",
  "agnx-music-lyric-karaoke-v2",
  "agnx-music-lyric-karaoke-v3",
  "agnx-music-lyric-karaoke-v4",
  "agnx-music-lyric-karaoke-v5",
  "agnx-music-lyric-karaoke-v6",
  "agnx-music-lyric-karaoke-v7"
];
var KARAOKE_CLIP_STEPS = 12;
var CLIP_HIDDEN = "inset(0 100% 0 0)";
var CLIP_FULL = "none";
function ensureKaraokeCss() {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(KARAOKE_STYLE_ID)) {
    return;
  }
  for (const legacyId of LEGACY_KARAOKE_STYLE_IDS) {
    document.getElementById(legacyId)?.remove();
  }
  const style = document.createElement("style");
  style.id = KARAOKE_STYLE_ID;
  style.textContent = `
.agnx-music-lyric-karaoke-host {
  position: relative;
  display: block;
  width: 100%;
  max-width: 100%;
  text-align: center;
  box-sizing: border-box;
  contain: layout style;
}
.agnx-music-lyric-karaoke-base,
.agnx-music-lyric-karaoke-fill {
  display: block;
  width: 100%;
  max-width: 100%;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}
.agnx-music-lyric-karaoke-base {
  /* var \u672A\u5C31\u7EEA\u65F6\u52FF\u6389\u8FDB\u6D4F\u89C8\u5668\u9ED8\u8BA4\u9ED1\uFF1B\u7EC4\u4EF6\u8FD8\u4F1A\u5185\u8054 pendingColor \u515C\u5E95 */
  color: var(--agnx-lyric-pending-color, rgba(255, 255, 255, 0.55));
  opacity: var(--agnx-lyric-pending-opacity, 0.4);
}
.agnx-music-lyric-karaoke-fill {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  color: var(--agnx-lyric-lit-color, #fff);
  pointer-events: none;
  will-change: clip-path;
  contain: paint;
}
.agnx-music-lyric-karaoke-host::selection,
.agnx-music-lyric-karaoke-base::selection,
.agnx-music-lyric-karaoke-fill::selection {
  color: #fff;
  background: rgba(59, 130, 246, 0.45);
}
`;
  document.head.appendChild(style);
}
ensureKaraokeCss();
function firstTextNode(root) {
  if (typeof document === "undefined") {
    return null;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const node = walker.nextNode();
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return null;
  }
  return node;
}
function clipPathFromRects(host2, rects) {
  if (rects.length === 0) {
    return CLIP_HIDDEN;
  }
  const hostRect = host2.getBoundingClientRect();
  if (!(hostRect.width > 0) || !(hostRect.height > 0)) {
    return CLIP_HIDDEN;
  }
  const d = rects.map((rect) => {
    const x = Number((rect.left - hostRect.left).toFixed(2));
    const y = Number((rect.top - hostRect.top).toFixed(2));
    const w = Number(Math.max(0, rect.width).toFixed(2));
    const h = Number(Math.max(0, rect.height).toFixed(2));
    return `M${x} ${y}h${w}v${h}h${-w}z`;
  }).join("");
  return `path(evenodd, "${d}")`;
}
function measureRangeRects(textNode, endOffset) {
  const range = document.createRange();
  try {
    range.setStart(textNode, 0);
    range.setEnd(textNode, endOffset);
  } catch {
    return [];
  }
  return Array.from(range.getClientRects()).filter((rect) => rect.width > 0.5 && rect.height > 0.5);
}
function precomputeKaraokeClips(input) {
  const steps = Math.max(1, input.steps ?? KARAOKE_CLIP_STEPS);
  const clips = Array.from({ length: steps + 1 }, () => CLIP_HIDDEN);
  clips[0] = CLIP_HIDDEN;
  clips[steps] = CLIP_FULL;
  const textNode = firstTextNode(input.measureRoot);
  if (!textNode || !input.text) {
    return clips;
  }
  const unitLen = textNode.data.length;
  if (unitLen <= 0) {
    return clips;
  }
  for (let step = 1; step < steps; step += 1) {
    const endOffset = Math.max(1, Math.min(unitLen, Math.round(step / steps * unitLen)));
    const rects = measureRangeRects(textNode, endOffset);
    clips[step] = clipPathFromRects(input.host, rects);
  }
  return clips;
}
function fontKeyOf(props) {
  return `${props.fontSize}|${props.lineHeight}|${props.fontWeight ?? ""}|${props.letterSpacing ?? ""}`;
}
function stepFromProgress(progress, steps) {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(p * steps);
}
function MusicSeekProgress(props) {
  const currentTime = usePlaybackUiTime();
  const progress = props.duration > 0 ? Math.min(1, currentTime / props.duration) : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_jsx_runtime10.Fragment, { children: props.children(progress, currentTime) });
}
function MusicLyricKaraokeText(props) {
  (0, import_react10.useLayoutEffect)(() => {
    ensureKaraokeCss();
  }, []);
  const hostRef = (0, import_react10.useRef)(null);
  const baseRef = (0, import_react10.useRef)(null);
  const cacheRef = (0, import_react10.useRef)(null);
  const progressRef = (0, import_react10.useRef)(props.progress);
  progressRef.current = props.progress;
  const propsRef = (0, import_react10.useRef)(props);
  propsRef.current = props;
  const [clipPath, setClipPath] = (0, import_react10.useState)(CLIP_HIDDEN);
  const applyStep = (step) => {
    const cache = cacheRef.current;
    if (!cache) {
      return;
    }
    const idx = Math.max(0, Math.min(cache.clipByStep.length - 1, step));
    const next = cache.clipByStep[idx] ?? CLIP_HIDDEN;
    setClipPath((prev) => prev === next ? prev : next);
  };
  (0, import_react10.useLayoutEffect)(() => {
    const rebuildCache = () => {
      const host3 = hostRef.current;
      const base = baseRef.current;
      const p = propsRef.current;
      if (!host3 || !base) {
        return;
      }
      const width = Math.round(host3.getBoundingClientRect().width || host3.offsetWidth || 0);
      if (!(width > 0)) {
        return;
      }
      const nextFont = fontKeyOf(p);
      const prev = cacheRef.current;
      if (prev && prev.text === p.text && prev.hostWidth === width && prev.fontKey === nextFont && prev.clipByStep.length === KARAOKE_CLIP_STEPS + 1) {
        applyStep(stepFromProgress(progressRef.current, KARAOKE_CLIP_STEPS));
        return;
      }
      const clipByStep = precomputeKaraokeClips({
        host: host3,
        measureRoot: base,
        text: p.text,
        steps: KARAOKE_CLIP_STEPS
      });
      cacheRef.current = {
        text: p.text,
        hostWidth: width,
        fontKey: nextFont,
        clipByStep
      };
      applyStep(stepFromProgress(progressRef.current, KARAOKE_CLIP_STEPS));
    };
    rebuildCache();
    const host2 = hostRef.current;
    if (!host2 || typeof ResizeObserver === "undefined") {
      return;
    }
    let frame = 0;
    const ro = new ResizeObserver(() => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        rebuildCache();
      });
    });
    ro.observe(host2);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      ro.disconnect();
    };
  }, [props.text, props.fontSize, props.lineHeight, props.fontWeight, props.letterSpacing]);
  (0, import_react10.useLayoutEffect)(() => {
    applyStep(stepFromProgress(props.progress, KARAOKE_CLIP_STEPS));
  }, [props.progress]);
  const hostStyle = {
    fontSize: props.fontSize,
    lineHeight: `${props.lineHeight}px`,
    fontWeight: props.fontWeight,
    letterSpacing: props.letterSpacing,
    ["--agnx-lyric-lit-color"]: props.litColor,
    ["--agnx-lyric-pending-color"]: props.pendingColor,
    ["--agnx-lyric-pending-opacity"]: "0.4",
    opacity: props.opacity,
    userSelect: props.selectable === false ? "none" : "text",
    WebkitUserSelect: props.selectable === false ? "none" : "text",
    cursor: props.onSeekProgress ? "pointer" : void 0
  };
  const sharedFont = {
    fontSize: props.fontSize,
    lineHeight: `${props.lineHeight}px`,
    fontWeight: props.fontWeight,
    letterSpacing: props.letterSpacing
  };
  const baseStyle = {
    ...sharedFont,
    color: props.pendingColor
  };
  const fillStyle = {
    ...sharedFont,
    color: props.litColor,
    clipPath,
    // React/RN-web 可能只认 camelCase；双写保证不丢
    WebkitClipPath: clipPath
  };
  const onClick = (event) => {
    if (!props.onSeekProgress) {
      return;
    }
    const host2 = hostRef.current;
    if (!host2 || !cacheRef.current) {
      return;
    }
    const rect = host2.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) {
      return;
    }
    const relX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const relY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const approx = Math.min(1, Math.max(0, relY * 0.72 + relX * 0.28));
    props.onSeekProgress(approx);
  };
  return (0, import_react10.createElement)(
    "span",
    {
      ref: hostRef,
      className: "agnx-music-lyric-karaoke-host",
      "data-testid": props.testID,
      "data-lyric-selectable": props.selectable === false ? "false" : "true",
      style: hostStyle,
      onClick: props.onSeekProgress ? onClick : void 0
    },
    (0, import_react10.createElement)(
      "span",
      { ref: baseRef, className: "agnx-music-lyric-karaoke-base", style: baseStyle },
      props.text
    ),
    (0, import_react10.createElement)(
      "span",
      {
        className: "agnx-music-lyric-karaoke-fill",
        style: fillStyle,
        "aria-hidden": true
      },
      props.text
    )
  );
}
function MusicLyricPlainActiveText(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
    import_react_native8.Text,
    {
      selectable: props.selectable,
      style: props.style,
      ...{
        dataSet: { lyricSelectable: props.selectable === false ? "false" : "true" }
      },
      children: props.text
    }
  );
}

// src/player.tsx
init_music_host();

// src/perf-self-report.ts
init_music_ids();
init_music_host();
init_store();
var PERF_SELF_REPORT_KEY = "perf-self-report-v1";
var PERF_SELF_REPORT_RING = 24;
var SAMPLE_EVERY_MS = 2e3;
var stopHandle = null;
var longtaskDelta = 0;
var longtaskObserver = null;
function installLongtaskObserver() {
  if (longtaskObserver || typeof PerformanceObserver === "undefined") {
    return;
  }
  try {
    const observer = new PerformanceObserver((list) => {
      longtaskDelta += list.getEntries().length;
    });
    observer.observe({ type: "longtask", buffered: false });
    longtaskObserver = observer;
  } catch {
    longtaskObserver = null;
  }
}
async function writeSample(host2, sample) {
  const raw = await host2.storage.readJson(MUSIC_APP_ID, PERF_SELF_REPORT_KEY);
  const prev = raw && typeof raw === "object" ? {
    version: 1,
    appId: MUSIC_APP_ID,
    samples: Array.isArray(raw.samples) ? raw.samples : []
  } : { version: 1, appId: MUSIC_APP_ID, samples: [] };
  const next = {
    version: 1,
    appId: MUSIC_APP_ID,
    samples: [...prev.samples, sample].slice(-PERF_SELF_REPORT_RING)
  };
  await host2.storage.writeJson(MUSIC_APP_ID, PERF_SELF_REPORT_KEY, next);
}
function startMusicPerfSelfReport(host2) {
  stopMusicPerfSelfReport();
  installLongtaskObserver();
  let timer = null;
  let musicVisible = false;
  const unsubs = [];
  unsubs.push(
    host2.tabs.onVisibleChange((event) => {
      if (event.appId === MUSIC_APP_ID) {
        musicVisible = event.visible;
      }
    })
  );
  unsubs.push(
    host2.tabs.onFocus((event) => {
      if (event.kind === "mini-app" && event.appId === MUSIC_APP_ID) {
        musicVisible = true;
      }
    })
  );
  unsubs.push(
    host2.lifecycle.onSuspend(() => {
      musicVisible = false;
    })
  );
  const tick = () => {
    void (async () => {
      const state = useMusicDemoStore.getState();
      if (!musicVisible || !state.wantsPlaying) {
        return;
      }
      const lt = longtaskDelta;
      longtaskDelta = 0;
      const playing = state.nowPlayingId ? state.getTrack(state.nowPlayingId) : void 0;
      const hasLyrics = Boolean(playing?.lyrics?.trim());
      const sample = {
        at: Date.now(),
        longtaskCountDelta: lt > 0 ? lt : void 0,
        busy: hasLyrics ? "lyrics-karaoke" : "playback",
        note: hasLyrics ? "\u64AD\u653E\u4E2D\u4E14\u6709\u6B4C\u8BCD" : "\u64AD\u653E\u4E2D"
      };
      const live = tryGetMusicHostApi();
      if (!live) {
        return;
      }
      try {
        await writeSample(live, sample);
      } catch {
      }
    })();
  };
  timer = setInterval(tick, SAMPLE_EVERY_MS);
  setTimeout(tick, 1200);
  stopHandle = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    for (const unsub of unsubs) {
      unsub();
    }
    longtaskObserver?.disconnect();
    longtaskObserver = null;
    stopHandle = null;
  };
  return stopHandle;
}
function stopMusicPerfSelfReport() {
  stopHandle?.();
  stopHandle = null;
}

// src/music-player-shortcuts.ts
init_music_ids();
var MUSIC_PLAYER_SHORTCUT_SLOTS = [
  {
    id: "action:pin",
    label: "\u7F6E\u9876",
    macCombo: "Alt+P",
    nonMacCombo: "Alt+P",
    helpKeys: ["alt", "p"]
  },
  {
    id: "action:search",
    label: "\u641C\u7D22",
    macCombo: "Alt+F",
    nonMacCombo: "Alt+F",
    helpKeys: ["alt", "f"]
  },
  {
    id: "action:addPlaylist",
    label: "\u6DFB\u52A0\u5230\u6B4C\u5355",
    macCombo: "Alt+A",
    nonMacCombo: "Alt+A",
    helpKeys: ["alt", "a"]
  },
  {
    id: "action:volume",
    label: "\u9759\u97F3",
    macCombo: "Alt+M",
    nonMacCombo: "Alt+M",
    helpKeys: ["alt", "m"]
  },
  {
    id: "transport:prev",
    label: "\u4E0A\u4E00\u9996",
    macCombo: "Alt+ArrowLeft",
    nonMacCombo: "Alt+ArrowLeft",
    helpKeys: ["alt", "Left"]
  },
  {
    id: "transport:play",
    label: "\u64AD\u653E",
    macCombo: "Space",
    nonMacCombo: "Space",
    helpKeys: ["Space"]
  },
  {
    id: "transport:next",
    label: "\u4E0B\u4E00\u9996",
    macCombo: "Alt+ArrowRight",
    nonMacCombo: "Alt+ArrowRight",
    helpKeys: ["alt", "Right"]
  },
  {
    id: "transport:mode",
    label: "\u64AD\u653E\u6A21\u5F0F",
    macCombo: "Alt+R",
    nonMacCombo: "Alt+R",
    helpKeys: ["alt", "r"]
  },
  {
    id: "transport:queue",
    label: "\u64AD\u653E\u961F\u5217",
    macCombo: "Alt+Q",
    nonMacCombo: "Alt+Q",
    helpKeys: ["alt", "q"]
  },
  {
    id: "lyrics:resumeFollow",
    label: "\u6062\u590D\u6EDA\u52A8",
    macCombo: "Alt+L",
    nonMacCombo: "Alt+L",
    helpKeys: ["alt", "l"]
  }
];
var MUSIC_PLAYER_EXTRA_SHORTCUTS = [
  {
    id: "action:playNext",
    label: "\u4E0B\u4E00\u9996\u64AD\u653E",
    macCombo: "Alt+N",
    nonMacCombo: "Alt+N",
    helpKeys: ["alt", "n"]
  },
  {
    id: "action:detail",
    label: "Tab \u8BE6\u60C5\uFF08\u540C \u2318I\uFF09",
    macCombo: "Alt+Shift+D",
    nonMacCombo: "Alt+Shift+D",
    helpKeys: ["alt", "shift", "d"]
  },
  {
    id: "action:share",
    label: "\u5206\u4EAB",
    macCombo: "Alt+S",
    nonMacCombo: "Alt+S",
    helpKeys: ["alt", "s"]
  },
  {
    id: "action:exportZip",
    label: "\u5BFC\u51FA",
    macCombo: "Alt+E",
    nonMacCombo: "Alt+E",
    helpKeys: ["alt", "e"]
  },
  {
    id: "action:refreshResources",
    label: "\u66F4\u65B0\u6B4C\u66F2",
    macCombo: "Alt+U",
    nonMacCombo: "Alt+U",
    helpKeys: ["alt", "u"]
  },
  {
    id: "action:deleteTrack",
    label: "\u5220\u9664\u6B4C\u66F2",
    macCombo: "Alt+X",
    nonMacCombo: "Alt+X",
    helpKeys: ["alt", "x"]
  }
];
var handlers = /* @__PURE__ */ new Map();
var surfaceActive = false;
function setMusicPlayerShortcutHandlers(next) {
  for (const [id, run] of Object.entries(next)) {
    if (run) {
      handlers.set(id, run);
    }
  }
}
function setMusicPlayerShortcutSurfaceActive(active) {
  surfaceActive = active;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("agnx-workspace-transient-surface", {
        detail: { appId: MUSIC_APP_ID, active }
      })
    );
  }
}
function sanitizeContributionId(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
function registerMusicPlayerShortcuts(host2) {
  host2.registerShortcutGroup({
    id: "music-product",
    appId: MUSIC_APP_ID,
    groupKey: "music",
    title: "\u97F3\u4E50",
    kind: "product"
  });
  for (const slot of MUSIC_PLAYER_SHORTCUT_SLOTS) {
    const contributionId = `transient-music-${sanitizeContributionId(slot.id)}`;
    const helpId = `transient:music:${slot.id}`;
    host2.registerShortcut({
      id: contributionId,
      appId: MUSIC_APP_ID,
      actionId: `workspace.app.transient.music.${sanitizeContributionId(slot.id)}`,
      helpId,
      label: slot.label,
      sectionId: "music",
      sectionTitle: "\u97F3\u4E50",
      macCombo: slot.macCombo,
      nonMacCombo: slot.nonMacCombo,
      helpKeys: [...slot.helpKeys],
      requireTransientSurfaceActive: true,
      run: () => {
        if (!surfaceActive) {
          return;
        }
        handlers.get(slot.id)?.();
      }
    });
  }
  for (const slot of MUSIC_PLAYER_EXTRA_SHORTCUTS) {
    const contributionId = `music-extra-${sanitizeContributionId(slot.id)}`;
    host2.registerShortcut({
      id: contributionId,
      appId: MUSIC_APP_ID,
      actionId: `workspace.app.music.${sanitizeContributionId(slot.id)}`,
      helpId: `music:${slot.id}`,
      label: slot.label,
      sectionId: "music",
      sectionTitle: "\u97F3\u4E50",
      macCombo: slot.macCombo,
      nonMacCombo: slot.nonMacCombo,
      helpKeys: [...slot.helpKeys],
      requireTransientSurfaceActive: true,
      run: () => {
        if (!surfaceActive) {
          return;
        }
        handlers.get(slot.id)?.();
      }
    });
  }
}

// src/player.tsx
var import_jsx_runtime11 = require("react/jsx-runtime");
var MINI_APP_PANE_INTERACTIVE_EVENT = "agnx-mini-app-pane-interactive";
var MUSIC_LYRICS_FOLLOW_ACTIVE_COLOR = "#60A5FA";
function miniAppPaneKey(input) {
  return `${input.appId}\0${input.panelId}\0${input.entityId}`;
}
function isThisMiniAppPaneInteractive(input) {
  if (typeof window === "undefined") {
    return true;
  }
  const bag = window;
  if (!bag.__agnxMiniAppFocusBootstrapped) {
    return true;
  }
  const focused = bag.__agnxFocusedMiniApp ?? null;
  return Boolean(
    focused?.active && focused.appId === input.appId && focused.panelId === input.panelId && focused.entityId === input.entityId
  );
}
function isThisMiniAppPaneVisible(input) {
  if (typeof window === "undefined") {
    return true;
  }
  const bag = window;
  if (!bag.__agnxMiniAppFocusBootstrapped) {
    return true;
  }
  const visibleMap = bag.__agnxVisibleMiniApps;
  if (visibleMap) {
    return Boolean(visibleMap[miniAppPaneKey(input)]);
  }
  return isThisMiniAppPaneInteractive(input);
}
var pendingPlayerSurface = null;
var cloudAutoPersistInFlight = /* @__PURE__ */ new Set();
var SEARCH_CENTER_CONTROLS_OPEN_KEY = "__agnxMusicSearchCenterControlsOpen";
function readPersistedSearchCenterControlsOpen() {
  const bag = globalThis;
  return typeof bag[SEARCH_CENTER_CONTROLS_OPEN_KEY] === "boolean" ? bag[SEARCH_CENTER_CONTROLS_OPEN_KEY] : true;
}
function writePersistedSearchCenterControlsOpen(open) {
  globalThis[SEARCH_CENTER_CONTROLS_OPEN_KEY] = open;
}
var LYRIC_FOLLOW_TOP_INSET_PX = 168;
var LYRIC_LIST_TOP_LEAD_PX = 144;
var LYRIC_LIST_BOTTOM_LEAD_PX = 144;
function stripShortcutSuffix(title) {
  return title.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}
function host() {
  return getMusicHostApi();
}
function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
function playModeLabel(mode) {
  if (mode === "loop-one") {
    return "\u5355\u66F2\u5FAA\u73AF";
  }
  if (mode === "shuffle") {
    return "\u968F\u673A\u64AD\u653E";
  }
  return "\u5217\u8868\u5FAA\u73AF";
}
function refreshMusicControlShortcutHints(input) {
  const { actionBar, playing, muted, pinned, playMode, setControlTitles, setControlShortcutKeys } = input;
  const nextTitles = {};
  const nextKeys = {};
  for (const slot of MUSIC_PLAYER_SHORTCUT_SLOTS) {
    nextTitles[slot.id] = slot.label;
    nextKeys[slot.id] = slot.helpKeys;
  }
  for (const slot of MUSIC_PLAYER_EXTRA_SHORTCUTS) {
    nextTitles[slot.id] = slot.label;
    nextKeys[slot.id] = slot.helpKeys;
    const shortId = slot.id.replace(/^action:/, "");
    nextTitles[shortId] = slot.label;
    nextKeys[shortId] = slot.helpKeys;
  }
  for (const id of actionBar) {
    nextTitles[id] = nextTitles[`action:${id}`] ?? MUSIC_PLAYER_ACTION_LABELS[id];
    const actionKeys = nextKeys[`action:${id}`];
    if (actionKeys) {
      nextKeys[id] = actionKeys;
    }
  }
  nextTitles.more = "\u66F4\u591A";
  if (playing && nextTitles["transport:play"]) {
    nextTitles["transport:play"] = "\u6682\u505C";
  }
  if (muted && nextTitles["action:volume"]) {
    nextTitles["action:volume"] = "\u53D6\u6D88\u9759\u97F3";
    nextTitles.volume = "\u53D6\u6D88\u9759\u97F3";
  }
  if (pinned && nextTitles["action:pin"]) {
    nextTitles["action:pin"] = "\u53D6\u6D88\u7F6E\u9876";
    nextTitles.pin = "\u53D6\u6D88\u7F6E\u9876";
  }
  if (nextTitles["transport:mode"]) {
    nextTitles["transport:mode"] = playModeLabel(playMode);
  }
  setControlTitles(nextTitles);
  setControlShortcutKeys(nextKeys);
}
function resolvePlayModeIcon(mode) {
  if (mode === "loop-one") {
    return import_lucide_react_native8.Repeat1;
  }
  if (mode === "shuffle") {
    return import_lucide_react_native8.Shuffle;
  }
  return import_lucide_react_native8.Repeat;
}
function IconHit(props) {
  const ActionTooltip = host().ui.ActionTooltip;
  const tipLabel = props.tipLabel ?? props.label;
  const tipEnabled = props.tipEnabled !== false;
  const bindDomCursor = (0, import_react11.useCallback)(
    (node) => {
      if (!node || typeof node !== "object") {
        return;
      }
      const el = node;
      el.removeAttribute?.("title");
      if (el.style) {
        el.style.cursor = props.disabled ? "default" : "pointer";
      }
    },
    [props.disabled]
  );
  const button = /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: props.label,
      accessibilityHint: tipLabel,
      disabled: props.disabled,
      onPress: props.onPress,
      style: [
        props.variant === "play" ? styles7.iconHitPlay : styles7.iconHit,
        props.showLabel ? styles7.iconHitLabeled : null,
        props.disabled ? styles7.iconHitDisabled : null
      ],
      testID: props.testID,
      ref: bindDomCursor,
      children: [
        props.children,
        props.showLabel ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.iconHitLabel, numberOfLines: 1, selectable: false, children: props.label }) : null
      ]
    }
  );
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: props.variant === "play" ? styles7.iconHitWrapPlay : styles7.iconHitWrap, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    ActionTooltip,
    {
      label: tipLabel,
      shortcutKeys: props.shortcutKeys,
      side: props.tipSide ?? "top",
      enabled: tipEnabled,
      children: button
    }
  ) });
}
function SearchDesktopLyricScroller(props) {
  const body = props.text.trim() ? props.text : "";
  if (!body) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: [props.textStyle, styles7.searchDesktopLyricCentered], numberOfLines: 2, children: props.emptyLabel });
  }
  if (props.useCssKaraoke) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.searchDesktopLyricCentered, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      MusicLyricKaraokeText,
      {
        text: body,
        progress: props.progress,
        litColor: props.litColor,
        pendingColor: props.pendingColor,
        fontSize: props.fontSize,
        lineHeight: props.lineHeight,
        fontWeight: props.fontWeight,
        selectable: false
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_native9.Text,
    {
      style: [props.textStyle, styles7.searchDesktopLyricCentered, { color: props.litColor }],
      numberOfLines: 2,
      children: body
    }
  );
}
function SeekBar(props) {
  const isEdge = props.variant === "edge";
  const widthRef = (0, import_react11.useRef)(1);
  const handleLayout = (0, import_react11.useCallback)((event) => {
    widthRef.current = Math.max(1, event.nativeEvent.layout.width);
  }, []);
  const ratioFromMouseEvent = (0, import_react11.useCallback)(
    (event) => {
      const clientX = typeof event.clientX === "number" ? event.clientX : typeof event.nativeEvent?.clientX === "number" ? event.nativeEvent.clientX : null;
      const rect = event.currentTarget?.getBoundingClientRect?.();
      if (clientX != null && rect && rect.width > 0) {
        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      }
      const locationX = typeof event.nativeEvent?.locationX === "number" ? event.nativeEvent.locationX : 0;
      return Math.min(1, Math.max(0, locationX / widthRef.current));
    },
    []
  );
  const ratioFromEvent = (0, import_react11.useCallback)(
    (event) => {
      return ratioFromMouseEvent(
        event
      );
    },
    [ratioFromMouseEvent]
  );
  const seekFromEvent = (0, import_react11.useCallback)(
    (event) => {
      const ratio = ratioFromEvent(event);
      props.onSeekRatio(ratio);
      if (props.previewMode === "compact-tap") {
        props.onPreviewChange?.({ visible: true, ratio });
      }
    },
    [props, ratioFromEvent]
  );
  const buffered = Math.min(1, Math.max(0, props.buffered ?? 0));
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      accessibilityRole: "adjustable",
      accessibilityLabel: props.accessibilityLabel ?? "\u64AD\u653E\u8FDB\u5EA6",
      onLayout: handleLayout,
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: seekFromEvent,
      onResponderMove: seekFromEvent,
      style: [styles7.progressHit, isEdge ? styles7.progressHitEdge : null],
      testID: props.testID,
      ...props.previewMode === "desktop-hover" ? {
        onMouseEnter: (event) => {
          props.onPreviewChange?.({ visible: true, ratio: ratioFromMouseEvent(event) });
        },
        onMouseMove: (event) => {
          props.onPreviewChange?.({ visible: true, ratio: ratioFromMouseEvent(event) });
        },
        onMouseLeave: () => {
          props.onPreviewChange?.({
            visible: false,
            ratio: props.previewRatio ?? props.progress
          });
        }
      } : {},
      children: [
        props.previewVisible && props.previewLabel ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.View,
          {
            style: [
              styles7.progressTooltip,
              { left: `${Math.min(100, (props.previewRatio ?? 0) * 100)}%` }
            ],
            pointerEvents: "none",
            children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.progressTooltipText, children: props.previewLabel })
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: [styles7.progressTrack, isEdge ? styles7.progressTrackEdge : null], children: [
          buffered > 0 && buffered < 0.995 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            import_react_native9.View,
            {
              style: [
                styles7.progressBuffered,
                isEdge ? styles7.progressBufferedEdge : null,
                { width: `${buffered * 100}%` }
              ],
              testID: "music-seek-buffered"
            }
          ) : null,
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            import_react_native9.View,
            {
              style: [
                styles7.progressFill,
                isEdge ? styles7.progressFillEdge : null,
                { width: `${Math.min(100, props.progress * 100)}%` }
              ]
            }
          )
        ] }),
        isEdge ? null : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: [styles7.progressThumb, { left: `${Math.min(100, props.progress * 100)}%` }] })
      ]
    }
  );
}
function VolumeBar(props) {
  const sizeRef = (0, import_react11.useRef)(1);
  const handleLayout = (0, import_react11.useCallback)(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      sizeRef.current = Math.max(1, props.vertical ? height : width);
    },
    [props.vertical]
  );
  const changeFromEvent = (0, import_react11.useCallback)(
    (event) => {
      const size = sizeRef.current;
      const ratio = props.vertical ? Math.min(1, Math.max(0, 1 - event.nativeEvent.locationY / size)) : Math.min(1, Math.max(0, event.nativeEvent.locationX / size));
      props.onChange(ratio * 2);
    },
    [props]
  );
  if (props.vertical) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      import_react_native9.View,
      {
        accessibilityRole: "adjustable",
        accessibilityLabel: "\u97F3\u91CF",
        onLayout: handleLayout,
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        onResponderGrant: changeFromEvent,
        onResponderMove: changeFromEvent,
        style: styles7.volumeHitVertical,
        testID: props.testID,
        children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.volumeTrackVertical, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.View,
          {
            style: [
              styles7.volumeFillVertical,
              { height: `${Math.min(100, props.value / 2 * 100)}%` }
            ]
          }
        ) })
      }
    );
  }
  const isEdge = props.variant === "edge";
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_native9.View,
    {
      accessibilityRole: "adjustable",
      accessibilityLabel: "\u97F3\u91CF",
      onLayout: handleLayout,
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: changeFromEvent,
      onResponderMove: changeFromEvent,
      style: [
        // edge：与 SeekBar 完全同一套 hit 几何（progressHit + progressHitEdge）
        isEdge ? styles7.progressHit : styles7.volumeHit,
        isEdge ? styles7.progressHitEdge : null,
        !isEdge && props.wide ? { width: "100%", flexGrow: 1, flexShrink: 1 } : null
      ],
      testID: props.testID,
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        import_react_native9.View,
        {
          style: [
            isEdge ? styles7.progressTrack : styles7.volumeTrack,
            isEdge ? styles7.progressTrackEdge : null
          ],
          children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            import_react_native9.View,
            {
              style: [
                // edge：几何跟 progressFill*，颜色覆盖为灰（volumeFillColor）
                isEdge ? styles7.progressFill : styles7.volumeFill,
                isEdge ? styles7.progressFillEdge : null,
                isEdge ? styles7.volumeFillColor : null,
                { width: `${Math.min(100, props.value / 2 * 100)}%` }
              ]
            }
          )
        }
      )
    }
  );
}
var MusicLyricLineRow = (0, import_react11.memo)(
  function MusicLyricLineRow2(props) {
    const { theme } = (0, import_react_native_unistyles7.useUnistyles)();
    const { index, unit, isActive, lyricProgress, selected, hovered, isCompact, inSearch, accent } = props;
    const showChrome = hovered || selected;
    const bilingual = unit.texts.length > 1;
    const unitLabel = unit.texts.join(" / ");
    const baseFontSize = (() => {
      if (isActive && inSearch) {
        return Number(theme.fontSize.base) || 16;
      }
      if (isActive) {
        return Number(theme.fontSize["2xl"]) || 24;
      }
      if (inSearch) {
        return Number(theme.fontSize.sm) || 14;
      }
      return Number(theme.fontSize.lg) || 18;
    })();
    const baseLineHeight = isActive && !inSearch ? 40 : isActive && inSearch ? 24 : inSearch ? 22 : 32;
    const secondaryFontSize = isActive ? Number(theme.fontSize.lg) || 18 : Number(theme.fontSize.base) || 16;
    const secondaryLineHeight = isActive ? 28 : 24;
    const litColor = theme.colors.accent;
    const pendingColor = theme.colors.foregroundMuted;
    const inactiveColor = theme.colors.foregroundMuted;
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      import_react_native9.Pressable,
      {
        accessibilityRole: "none",
        accessibilityLabel: `\u6B4C\u8BCD\uFF1A${unitLabel}`,
        onLayout: (event) => {
          props.onLayoutY(index, event.nativeEvent.layout.y);
        },
        onPress: () => props.onLinePress(index, unit.timeSec),
        style: [
          styles7.lyricLineHit,
          bilingual ? styles7.lyricLineHitBilingual : null,
          isCompact ? styles7.lyricLineHitCompact : null,
          inSearch ? styles7.lyricLineHitSearchTransport : null,
          hovered && !selected ? styles7.lyricLineHovered : null,
          selected ? styles7.lyricLineSelected : null
        ],
        ...{
          onMouseEnter: () => props.onHoverEnter(index),
          onMouseLeave: () => props.onHoverLeave(index)
        },
        children: [
          unit.texts.map((text, textIndex) => {
            const isSecondary = textIndex > 0;
            const fontSize = isSecondary ? secondaryFontSize : baseFontSize;
            const lineHeight = isSecondary ? secondaryLineHeight : baseLineHeight;
            const fontWeight = isActive ? theme.fontWeight.bold : theme.fontWeight.normal;
            const letterSpacing = isActive ? isSecondary ? 0.15 : 0.3 : void 0;
            const opacity = isSecondary && !isActive ? 0.78 : isSecondary && isActive ? 1 : void 0;
            if (isActive && props.useCssKaraoke) {
              return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                MusicLyricKaraokeText,
                {
                  text,
                  progress: lyricProgress,
                  litColor,
                  pendingColor,
                  fontSize,
                  lineHeight,
                  fontWeight,
                  letterSpacing,
                  opacity,
                  selectable: !isCompact,
                  testID: textIndex === 0 ? `music-lyric-karaoke-${index}` : void 0
                },
                `${index}-${textIndex}-k`
              );
            }
            if (isActive) {
              return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                MusicLyricPlainActiveText,
                {
                  text,
                  selectable: !isCompact,
                  style: [
                    styles7.lyricLine,
                    isSecondary ? styles7.lyricLineBilingualSecondary : null,
                    styles7.lyricActive,
                    isSecondary ? styles7.lyricActiveBilingualSecondary : null,
                    inSearch ? styles7.lyricLineSearchTransport : null,
                    inSearch ? styles7.lyricActiveSearchTransport : null,
                    { color: litColor }
                  ]
                },
                `${index}-${textIndex}-a`
              );
            }
            return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              import_react_native9.Text,
              {
                selectable: !isCompact,
                style: [
                  styles7.lyricLine,
                  isSecondary ? styles7.lyricLineBilingualSecondary : null,
                  inSearch ? styles7.lyricLineSearchTransport : null,
                  { color: inactiveColor }
                ],
                ...{
                  dataSet: { lyricSelectable: isCompact ? "false" : "true" }
                },
                children: text
              },
              `${index}-${textIndex}-${text}`
            );
          }),
          showChrome ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.lyricSelectTime, pointerEvents: "none", children: formatClock(unit.timeSec) }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              import_react_native9.Pressable,
              {
                accessibilityRole: "button",
                accessibilityLabel: "\u64AD\u653E\u6B64\u53E5",
                onPress: (event) => {
                  event.stopPropagation?.();
                  props.onPlayLine(unit.timeSec);
                },
                style: styles7.lyricSelectPlay,
                testID: `music-lyric-play-${index}`,
                children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Play, { size: 14, color: accent, fill: accent })
              }
            )
          ] }) : null
        ]
      }
    );
  },
  (prev, next) => {
    if (prev.isActive || next.isActive) {
      return prev.isActive === next.isActive && prev.lyricProgress === next.lyricProgress && prev.selected === next.selected && prev.hovered === next.hovered && prev.isCompact === next.isCompact && prev.inSearch === next.inSearch && prev.accent === next.accent && prev.useCssKaraoke === next.useCssKaraoke && prev.unit === next.unit && prev.index === next.index;
    }
    return prev.index === next.index && prev.selected === next.selected && prev.hovered === next.hovered && prev.isCompact === next.isCompact && prev.inSearch === next.inSearch && prev.accent === next.accent && prev.unit === next.unit;
  }
);
function MusicLyricsKaraokeBlock(props) {
  const highlight = usePlaybackLyricHighlight({
    units: props.lyricUnits,
    progressLines: props.progressLines
  });
  const lyricActive = highlight.activeIndex;
  const lyricProgress = highlight.progress;
  const lyricDoubleTapRef = (0, import_react11.useRef)(null);
  const lyricSelectTimerRef = (0, import_react11.useRef)(null);
  const propsRef = (0, import_react11.useRef)(props);
  propsRef.current = props;
  const pendingInstantSnapRef = (0, import_react11.useRef)(true);
  const snappedActiveIndexRef = (0, import_react11.useRef)(null);
  const activeIndexRef = (0, import_react11.useRef)(lyricActive);
  activeIndexRef.current = lyricActive;
  const scrollToActiveLine = (0, import_react11.useCallback)((input) => {
    const p = propsRef.current;
    if (input.index < 0 || p.lyricUnits.length === 0) {
      return false;
    }
    const offset = p.lyricLineOffsetRef.current.get(input.index);
    if (offset == null || !Number.isFinite(offset)) {
      return false;
    }
    p.beginProgrammaticLyricsScroll();
    p.lyricsScrollRef.current?.scrollTo({
      y: Math.max(0, offset - p.followTopInsetPx),
      animated: input.animated
    });
    return true;
  }, []);
  const onLayoutY = (0, import_react11.useCallback)(
    (index, y) => {
      propsRef.current.lyricLineOffsetRef.current.set(index, y);
      if (pendingInstantSnapRef.current && index === activeIndexRef.current && propsRef.current.paneVisible && !propsRef.current.lyricsUserBrowsing && propsRef.current.lyricSelectedIndex == null) {
        if (scrollToActiveLine({ index, animated: false })) {
          snappedActiveIndexRef.current = index;
          if (index === activeIndexRef.current) {
            pendingInstantSnapRef.current = false;
            propsRef.current.preferInstantLyricScrollRef.current = false;
          }
        }
      }
    },
    [scrollToActiveLine]
  );
  const onPlayLine = (0, import_react11.useCallback)((timeSec2) => {
    propsRef.current.onLyricLinePress(timeSec2);
  }, []);
  const onHoverEnter = (0, import_react11.useCallback)((index) => {
    propsRef.current.setLyricHoveredIndex(index);
  }, []);
  const onHoverLeave = (0, import_react11.useCallback)((index) => {
    propsRef.current.setLyricHoveredIndex((current) => current === index ? null : current);
  }, []);
  const onLinePress = (0, import_react11.useCallback)((index, timeSec2) => {
    const p = propsRef.current;
    const now = Date.now();
    const prev = lyricDoubleTapRef.current;
    if (prev && prev.index === index && now - prev.at < 320) {
      lyricDoubleTapRef.current = null;
      if (lyricSelectTimerRef.current) {
        clearTimeout(lyricSelectTimerRef.current);
        lyricSelectTimerRef.current = null;
      }
      p.onLyricLinePress(timeSec2);
      return;
    }
    lyricDoubleTapRef.current = { index, at: now };
    if (lyricSelectTimerRef.current) {
      clearTimeout(lyricSelectTimerRef.current);
    }
    lyricSelectTimerRef.current = setTimeout(() => {
      lyricSelectTimerRef.current = null;
      if (p.lyricSelectedIndex === index) {
        p.setLyricSelectedIndex(null);
        if (typeof window !== "undefined") {
          window.getSelection()?.removeAllRanges();
        }
        return;
      }
      if (typeof window !== "undefined") {
        window.getSelection()?.removeAllRanges();
      }
      p.onClearBrowseTimer?.();
      p.setLyricSelectedIndex(index);
    }, 280);
  }, []);
  (0, import_react11.useEffect)(() => {
    return () => {
      if (lyricSelectTimerRef.current) {
        clearTimeout(lyricSelectTimerRef.current);
      }
    };
  }, []);
  (0, import_react11.useEffect)(() => {
    if (props.preferInstantLyricScrollRef.current) {
      pendingInstantSnapRef.current = true;
    }
  }, [props.lyricsFollowEpoch, props.preferInstantLyricScrollRef]);
  (0, import_react11.useEffect)(() => {
    if (!props.paneVisible || props.lyricsUserBrowsing || props.lyricSelectedIndex != null || lyricActive < 0 || props.lyricUnits.length === 0) {
      return;
    }
    const forceInstant = pendingInstantSnapRef.current || props.preferInstantLyricScrollRef.current || snappedActiveIndexRef.current != null && snappedActiveIndexRef.current !== lyricActive && lyricActive >= 0;
    if (!props.playing && !forceInstant) {
      return;
    }
    const tryScroll = () => {
      const ok = scrollToActiveLine({
        index: lyricActive,
        animated: !forceInstant
      });
      if (ok) {
        snappedActiveIndexRef.current = lyricActive;
        if (forceInstant) {
          pendingInstantSnapRef.current = false;
          props.preferInstantLyricScrollRef.current = false;
        }
      }
      return ok;
    };
    if (tryScroll()) {
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let raf = 0;
    const maxAttempts = forceInstant ? 45 : 8;
    const tick = () => {
      if (cancelled) {
        return;
      }
      attempts += 1;
      if (tryScroll() || attempts >= maxAttempts) {
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [
    lyricActive,
    props.lyricSelectedIndex,
    props.lyricUnits.length,
    props.lyricsFollowEpoch,
    props.lyricsUserBrowsing,
    props.paneVisible,
    props.playing,
    props.preferInstantLyricScrollRef,
    scrollToActiveLine
  ]);
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_native9.View,
    {
      style: styles7.lyricsFadeHost,
      ...{ className: "agnx-music-lyrics-fade-host" },
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        import_react_native9.ScrollView,
        {
          ref: props.lyricsScrollRef,
          style: styles7.lyricsPane,
          contentContainerStyle: [
            styles7.lyricsContent,
            props.lyricsDensity === "relaxed" ? styles7.lyricsContentRelaxed : null,
            props.isCompact ? styles7.lyricsContentCompact : null,
            props.isCompact && props.lyricsDensity === "relaxed" ? styles7.lyricsContentCompactRelaxed : null,
            props.inSearch ? styles7.lyricsContentSearchTransport : null,
            props.inSearch && props.lyricsDensity === "relaxed" ? styles7.lyricsContentSearchTransportRelaxed : null
          ],
          testID: "workspace-mini-app-music-lyrics",
          showsVerticalScrollIndicator: false,
          showsHorizontalScrollIndicator: false,
          onScrollBeginDrag: props.markLyricsUserBrowsing,
          onContentSizeChange: () => {
            const need = pendingInstantSnapRef.current || propsRef.current.preferInstantLyricScrollRef.current || snappedActiveIndexRef.current != null && snappedActiveIndexRef.current !== activeIndexRef.current;
            if (!need) {
              return;
            }
            if (!propsRef.current.paneVisible || propsRef.current.lyricsUserBrowsing || propsRef.current.lyricSelectedIndex != null) {
              return;
            }
            const index = activeIndexRef.current;
            if (index < 0) {
              return;
            }
            if (scrollToActiveLine({ index, animated: false })) {
              pendingInstantSnapRef.current = false;
              propsRef.current.preferInstantLyricScrollRef.current = false;
            }
          },
          ...{
            className: "agnx-music-lyrics-scroll",
            dataSet: { scrollbar: "hidden" },
            onWheel: props.markLyricsUserBrowsing
          },
          children: props.lyricUnits.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.lyricsEmptyWrap, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.lyricsEmpty, children: "\u6682\u65E0\u6B4C\u8BCD\uFF0C\u8BF7\u6B23\u8D4F" }) }) : props.lyricUnits.map((unit, index) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            MusicLyricLineRow,
            {
              index,
              unit,
              isActive: index === lyricActive,
              lyricProgress,
              selected: index === props.lyricSelectedIndex,
              hovered: index === props.lyricHoveredIndex,
              isCompact: props.isCompact,
              inSearch: props.inSearch,
              accent: props.accent,
              useCssKaraoke: props.useCssKaraoke,
              onLayoutY,
              onLinePress,
              onPlayLine,
              onHoverEnter,
              onHoverLeave
            },
            `${unit.timeSec}-${index}-${unit.texts.join(" / ")}`
          ))
        }
      )
    }
  );
}
function MusicSearchTransportLyrics(props) {
  const highlight = usePlaybackLyricHighlight({
    units: props.lyricUnits,
    progressLines: props.progressLines
  });
  const lyricActive = highlight.activeIndex;
  const lyricProgress = highlight.progress;
  const searchActiveUnit = lyricActive >= 0 && props.lyricUnits[lyricActive] ? props.lyricUnits[lyricActive] : null;
  const searchActivePrimary = searchActiveUnit?.texts[0] ?? "";
  const searchActiveSecondary = searchActiveUnit && searchActiveUnit.texts.length > 1 ? searchActiveUnit.texts[1] ?? "" : "";
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_native9.Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: searchActiveUnit ? `\u6B4C\u8BCD\uFF1A${searchActiveUnit.texts.join(" / ")}\uFF0C\u70B9\u6309\u663E\u793A\u64AD\u653E\u63A7\u5236` : "\u6682\u65E0\u6B4C\u8BCD\uFF0C\u70B9\u6309\u663E\u793A\u64AD\u653E\u63A7\u5236",
      onPress: props.onShowControls,
      style: props.stripStyle,
      testID: "music-search-transport-lyrics",
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: props.stackStyle, children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          SearchDesktopLyricScroller,
          {
            text: searchActivePrimary,
            progress: lyricProgress,
            emptyLabel: "\u6682\u65E0\u6B4C\u8BCD\uFF0C\u8BF7\u6B23\u8D4F",
            useCssKaraoke: props.useCssKaraoke,
            litColor: props.litColor,
            pendingColor: props.pendingColor,
            fontSize: props.primaryFontSize,
            lineHeight: props.primaryLineHeight,
            fontWeight: props.fontWeight,
            textStyle: props.primaryTextStyle
          },
          `primary-${lyricActive}`
        ),
        searchActiveSecondary ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          SearchDesktopLyricScroller,
          {
            text: searchActiveSecondary,
            progress: lyricProgress,
            emptyLabel: "",
            useCssKaraoke: props.useCssKaraoke,
            litColor: props.litColor,
            pendingColor: props.pendingColor,
            fontSize: props.secondaryFontSize,
            lineHeight: props.secondaryLineHeight,
            fontWeight: props.fontWeight,
            textStyle: props.secondaryTextStyle
          },
          `secondary-${lyricActive}`
        ) : null
      ] })
    }
  );
}
function MusicPlayerContent(props) {
  const { theme, rt } = (0, import_react_native_unistyles7.useUnistyles)();
  const isCompact = rt.breakpoint === "xs" || rt.breakpoint === "sm";
  const mutedIcon = theme.colors.foregroundMuted;
  const accent = theme.colors.accent;
  const track = useMusicDemoStore((state) => {
    if (props.entityId === MUSIC_PLAYER_ENTITY_ID) {
      const playingId = state.nowPlayingId;
      return playingId ? state.tracks.find((item) => item.id === playingId) : void 0;
    }
    return state.tracks.find((item) => item.id === props.entityId);
  });
  const libraryHydrationReady = (0, import_react11.useSyncExternalStore)(
    subscribeMusicHostHydration,
    getMusicHostHydrationCompleted,
    getMusicHostHydrationCompleted
  );
  const tracks = useMusicDemoStore((state) => state.tracks);
  const queueIds = useMusicDemoStore((state) => state.queueIds);
  const playMode = useMusicDemoStore((state) => state.playMode);
  const volume = useMusicDemoStore((state) => state.volume);
  const muted = useMusicDemoStore((state) => state.muted);
  const coverHidden = useMusicDemoStore((state) => state.coverHidden);
  const lyricsDensity = useMusicDemoStore((state) => state.lyricsDensity);
  const setNowPlaying = useMusicDemoStore((state) => state.setNowPlaying);
  const cyclePlayMode = useMusicDemoStore((state) => state.cyclePlayMode);
  const setVolume = useMusicDemoStore((state) => state.setVolume);
  const setMuted = useMusicDemoStore((state) => state.setMuted);
  const setCoverHidden = useMusicDemoStore((state) => state.setCoverHidden);
  const setPlaybackPosition = useMusicDemoStore((state) => state.setPlaybackPosition);
  const setWantsPlaying = useMusicDemoStore((state) => state.setWantsPlaying);
  const playNext = useMusicDemoStore((state) => state.playNext);
  const playPrevious = useMusicDemoStore((state) => state.playPrevious);
  const removeFromQueue = useMusicDemoStore((state) => state.removeFromQueue);
  const moveQueueItem = useMusicDemoStore((state) => state.moveQueueItem);
  const upsertTrackFromSearchHit = useMusicDemoStore((state) => state.upsertTrackFromSearchHit);
  const setQueueIds = useMusicDemoStore((state) => state.setQueueIds);
  const addToQueue = useMusicDemoStore((state) => state.addToQueue);
  const { layout: actionLayout, openEditLayout: openPlayerEntityEditLayout } = useMusicTrackEntityMenuLayout(MUSIC_TRACK_MENU_SURFACE.player);
  const showShellSearch = true;
  const showShellVolume = true;
  const playerSurface = useMusicDemoStore((state) => state.playerSurface);
  const setPlayerSurface = useMusicDemoStore((state) => state.setPlayerSurface);
  const atmospherePushEnabled = useMusicDemoStore((state) => state.atmospherePushEnabled);
  const coverBackdropEnabled = useMusicDemoStore((state) => state.coverBackdropEnabled);
  const coverBackdropBlur = useMusicDemoStore((state) => state.coverBackdropBlur);
  const coverBackdropOpacity = useMusicDemoStore((state) => state.coverBackdropOpacity);
  const coverBackdropIncludeTabBar = useMusicDemoStore((state) => state.coverBackdropIncludeTabBar);
  const wantsPlaying = useMusicDemoStore((state) => state.wantsPlaying);
  const [playing, setPlaying] = (0, import_react11.useState)(false);
  const setError = (0, import_react11.useCallback)((message) => {
    if (!message) {
      return;
    }
    notifyMusicPlayerError(message);
  }, []);
  const [duration, setDuration] = (0, import_react11.useState)(0);
  const [bufferedProgress, setBufferedProgress] = (0, import_react11.useState)(0);
  const currentTimeRef = (0, import_react11.useRef)(0);
  const commitPlaybackUiTime = (0, import_react11.useCallback)((time, force = false) => {
    currentTimeRef.current = time;
    publishPlaybackUiTime(time, force);
  }, []);
  const [queueOpen, setQueueOpen] = (0, import_react11.useState)(false);
  const [compactVolumeOpen, setCompactVolumeOpen] = (0, import_react11.useState)(false);
  const [seekPreview, setSeekPreview] = (0, import_react11.useState)({
    visible: false,
    ratio: 0
  });
  const setPlaceholderToast = (0, import_react11.useCallback)((message) => {
    if (!message) {
      return;
    }
    notifyMusicPlayerToast(message);
  }, []);
  const [streamResolving, setStreamResolving] = (0, import_react11.useState)(false);
  const [searchCenterControlsOpen, setSearchCenterControlsOpen] = (0, import_react11.useState)(
    readPersistedSearchCenterControlsOpen
  );
  const [controlTitles, setControlTitles] = (0, import_react11.useState)({});
  const [controlShortcutKeys, setControlShortcutKeys] = (0, import_react11.useState)(
    {}
  );
  const [coverDisplay, setCoverDisplay] = (0, import_react11.useState)(null);
  const coverDisplayUri = coverDisplay && track?.id && coverDisplay.trackId === track.id ? coverDisplay.uri : null;
  const audioRef = (0, import_react11.useRef)(null);
  const objectUrlRef = (0, import_react11.useRef)(null);
  const loadedTrackIdRef = (0, import_react11.useRef)(null);
  const loadedSourceUriRef = (0, import_react11.useRef)(null);
  const resumeAfterLoadRef = (0, import_react11.useRef)(false);
  const cloudTriedUrlsRef = (0, import_react11.useRef)(/* @__PURE__ */ new Set());
  const cloudRetryingRef = (0, import_react11.useRef)(false);
  const recoverCloudPlaybackRef = (0, import_react11.useRef)(
    async () => false
  );
  const searchResolveGenerationRef = (0, import_react11.useRef)(0);
  const [transportSliderMode, setTransportSliderMode] = (0, import_react11.useState)("progress");
  const [desktopVolumeHoverOpen, setDesktopVolumeHoverOpen] = (0, import_react11.useState)(false);
  const volumeCloseTimerRef = (0, import_react11.useRef)(null);
  const lyricsScrollRef = (0, import_react11.useRef)(null);
  const lyricLineOffsetRef = (0, import_react11.useRef)(/* @__PURE__ */ new Map());
  const lyricsEnrichingRef = (0, import_react11.useRef)(null);
  const lyricsBrowseTimerRef = (0, import_react11.useRef)(null);
  const lyricsProgrammaticScrollRef = (0, import_react11.useRef)(false);
  const lyricsProgrammaticClearTimerRef = (0, import_react11.useRef)(null);
  const [lyricsUserBrowsing, setLyricsUserBrowsing] = (0, import_react11.useState)(false);
  const [lyricHoveredIndex, setLyricHoveredIndex] = (0, import_react11.useState)(null);
  const [lyricSelectedIndex, setLyricSelectedIndex] = (0, import_react11.useState)(null);
  const [paneInteractive, setPaneInteractive] = (0, import_react11.useState)(
    () => isThisMiniAppPaneInteractive({
      appId: props.appId,
      panelId: props.panelId,
      entityId: props.entityId
    })
  );
  const [paneVisible, setPaneVisible] = (0, import_react11.useState)(
    () => isThisMiniAppPaneVisible({
      appId: props.appId,
      panelId: props.panelId,
      entityId: props.entityId
    })
  );
  const [lyricsFollowEpoch, setLyricsFollowEpoch] = (0, import_react11.useState)(0);
  const preferInstantLyricScrollRef = (0, import_react11.useRef)(true);
  const paneInteractiveRef = (0, import_react11.useRef)(paneInteractive);
  paneInteractiveRef.current = paneInteractive;
  const paneVisibleRef = (0, import_react11.useRef)(paneVisible);
  paneVisibleRef.current = paneVisible;
  const [desktopStageWidth, setDesktopStageWidth] = (0, import_react11.useState)(0);
  const isWeb = host().platform.isWeb;
  (0, import_react11.useEffect)(() => {
    const audio = getMusicPlaybackAudio();
    const live = audio?.currentTime;
    if (typeof live === "number" && Number.isFinite(live) && live > 0) {
      commitPlaybackUiTime(live, true);
    }
    preferInstantLyricScrollRef.current = true;
    const timer = setTimeout(() => {
      preferInstantLyricScrollRef.current = true;
      setLyricsFollowEpoch((epoch) => epoch + 1);
    }, 32);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  const lyricLines = (0, import_react11.useMemo)(() => parseLyrics(track?.lyrics), [track?.lyrics]);
  const lyricUnits = (0, import_react11.useMemo)(() => groupLyricUnits(lyricLines), [lyricLines]);
  const lyricFontSizePx = (() => {
    const active = theme.fontSize["2xl"];
    if (typeof active === "number") {
      return active;
    }
    const parsed = Number(active);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  })();
  const desktopStageSplit = (0, import_react11.useMemo)(() => {
    const maxLyricWidth = maxLyricContentWidthPx(lyricUnits, lyricFontSizePx);
    return resolveDesktopStageSplit({
      stageWidthPx: desktopStageWidth,
      maxLyricContentWidthPx: maxLyricWidth
    });
  }, [desktopStageWidth, lyricFontSizePx, lyricUnits]);
  const handleDesktopStageLayout = (0, import_react11.useCallback)((event) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setDesktopStageWidth((prev) => prev === next ? prev : next);
  }, []);
  const lyricProgressLines = (0, import_react11.useMemo)(
    () => lyricUnits.map((unit) => ({
      timeSec: unit.timeSec,
      // 末组估时用组内最长行，避免双语短译文把窗口估太短
      text: unit.texts.reduce(
        (best, text) => Array.from(text).length > Array.from(best).length ? text : best,
        ""
      )
    })),
    [lyricUnits]
  );
  const lyricSelectTimerRef = (0, import_react11.useRef)(null);
  const queueTracks = (0, import_react11.useMemo)(() => {
    const known = new Map(tracks.map((item) => [item.id, item]));
    const fromQueue = queueIds.map((id) => known.get(id)).filter((item) => item != null);
    return fromQueue.length > 0 ? fromQueue : tracks;
  }, [queueIds, tracks]);
  (0, import_react11.useEffect)(() => {
    cloudTriedUrlsRef.current = /* @__PURE__ */ new Set();
    cloudRetryingRef.current = false;
  }, [track?.id]);
  (0, import_react11.useEffect)(() => {
    recoverCloudPlaybackRef.current = async (failedUrl) => {
      const state = useMusicDemoStore.getState();
      const currentId = state.nowPlayingId;
      const current = currentId ? state.getTrack(currentId) : void 0;
      if (!current || current.sourceKind !== "cloud") {
        return false;
      }
      const normalizedFailed = failedUrl.trim();
      if (normalizedFailed) {
        cloudTriedUrlsRef.current.add(normalizedFailed);
      }
      if (current.sourceUri?.trim()) {
        cloudTriedUrlsRef.current.add(current.sourceUri.trim());
      }
      if (cloudRetryingRef.current) {
        return false;
      }
      if (cloudTriedUrlsRef.current.size > 8) {
        setError(cloudPlaybackGaveUpMessage());
        return false;
      }
      cloudRetryingRef.current = true;
      setError(formatMusicPlaybackError(new Error("no supported source"), { cloud: true }));
      try {
        const alternates = await findCloudPlayableAlternates({
          title: current.title,
          artist: current.artist,
          excludeUrls: cloudTriedUrlsRef.current,
          preferProviderId: current.remoteRef?.providerId,
          limit: 6
        });
        const next = alternates[0];
        if (!next?.url) {
          setError(cloudPlaybackGaveUpMessage());
          return false;
        }
        cloudTriedUrlsRef.current.add(next.url);
        resumeAfterLoadRef.current = true;
        state.updateTrack(current.id, {
          sourceUri: next.url,
          sourceKind: "cloud",
          remoteRef: {
            providerId: next.providerId,
            remoteId: next.remoteId,
            pageUrl: current.remoteRef?.pageUrl
          }
        });
        return true;
      } catch {
        setError(cloudPlaybackGaveUpMessage());
        return false;
      } finally {
        cloudRetryingRef.current = false;
      }
    };
  }, []);
  (0, import_react11.useEffect)(() => {
    if (!isWeb) {
      return;
    }
    const audio = getMusicPlaybackAudio();
    if (!audio) {
      return;
    }
    audioRef.current = audio;
    ensureMusicPlaybackRuntime();
    const unsubscribeUi = subscribeMusicPlaybackUi({
      onTimeUpdate: (time) => {
        currentTimeRef.current = time;
        if (typeof document !== "undefined" && document.hidden) {
          return;
        }
        if (!isThisMiniAppPaneVisible({
          appId: props.appId,
          panelId: props.panelId,
          entityId: props.entityId
        })) {
          return;
        }
        commitPlaybackUiTime(time);
      },
      onPlayingChange: (nextPlaying) => {
        setPlaying(nextPlaying);
      }
    });
    const updateBuffered = () => {
      try {
        const playingId = useMusicDemoStore.getState().nowPlayingId;
        const playingTrack = playingId ? useMusicDemoStore.getState().tracks.find((item) => item.id === playingId) : void 0;
        if (playingTrack?.sourceKind === "local" && isMusicLocalPersistedUri(playingTrack.sourceUri)) {
          setBufferedProgress((prev) => prev === 1 ? prev : 1);
          return;
        }
        const total = audio.duration || 0;
        if (!(total > 0) || !Number.isFinite(total) || !audio.buffered || audio.buffered.length === 0) {
          return;
        }
        const end = audio.buffered.end(audio.buffered.length - 1);
        const next = Math.min(1, Math.max(0, Math.round(end / total * 200) / 200));
        setBufferedProgress((prev) => prev === next ? prev : next);
      } catch {
      }
    };
    const handleMeta = () => {
      setDuration(audio.duration || 0);
      updateBuffered();
    };
    const handleError = () => {
      setPlaying(false);
      useMusicDemoStore.getState().setWantsPlaying(false);
      const state = useMusicDemoStore.getState();
      const current = state.nowPlayingId ? state.getTrack(state.nowPlayingId) : void 0;
      const failedUrl = (audio.currentSrc || audio.src || current?.sourceUri || "").trim();
      if (current?.sourceKind === "cloud") {
        void (async () => {
          const recovered = await recoverCloudPlaybackRef.current(failedUrl);
          if (!recovered) {
            setError(cloudPlaybackGaveUpMessage());
          }
        })();
        return;
      }
      setError(formatMusicPlaybackError(new Error("no supported source")));
    };
    audio.addEventListener("loadedmetadata", handleMeta);
    audio.addEventListener("durationchange", handleMeta);
    audio.addEventListener("progress", updateBuffered);
    audio.addEventListener("loadeddata", updateBuffered);
    audio.addEventListener("canplaythrough", updateBuffered);
    audio.addEventListener("error", handleError);
    const mountDuration = readMusicPlaybackDurationSec(audio);
    if (mountDuration > 0) {
      setDuration(mountDuration);
      commitPlaybackUiTime(audio.currentTime || 0, true);
      setPlaying(!audio.paused);
    } else {
      void whenMusicPlaybackMetadataReady(audio).then((sec) => {
        if (sec > 0) {
          setDuration(sec);
        }
        return void 0;
      });
      if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
        commitPlaybackUiTime(audio.currentTime, true);
      }
      setPlaying(!audio.paused);
    }
    return () => {
      syncMusicPlaybackPositionToStore(true);
      unsubscribeUi();
      audio.removeEventListener("loadedmetadata", handleMeta);
      audio.removeEventListener("durationchange", handleMeta);
      audio.removeEventListener("progress", updateBuffered);
      audio.removeEventListener("loadeddata", updateBuffered);
      audio.removeEventListener("canplaythrough", updateBuffered);
      audio.removeEventListener("error", handleError);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [commitPlaybackUiTime, isWeb, props.appId, props.entityId, props.panelId]);
  (0, import_react11.useEffect)(() => {
    applyMusicPlaybackVolume(volume, muted);
  }, [muted, volume]);
  (0, import_react11.useEffect)(() => {
    const active = wantsPlaying || playing;
    setMusicPlaybackBackgroundActive(active);
    return () => {
      if (!useMusicDemoStore.getState().wantsPlaying) {
        setMusicPlaybackBackgroundActive(false);
      }
    };
  }, [playing, wantsPlaying]);
  (0, import_react11.useEffect)(() => {
    const meta = getMusicPlaybackLoadedMeta();
    if (meta && !loadedTrackIdRef.current) {
      loadedTrackIdRef.current = meta.trackId;
      loadedSourceUriRef.current = meta.sourceUri;
    }
  }, []);
  (0, import_react11.useEffect)(() => {
    if (muted) {
      setCompactVolumeOpen(false);
      setDesktopVolumeHoverOpen(false);
    }
  }, [muted]);
  (0, import_react11.useEffect)(() => {
    if (!isCompact) {
      setTransportSliderMode("progress");
    }
  }, [isCompact]);
  (0, import_react11.useEffect)(() => {
    const timerRef = volumeCloseTimerRef;
    return () => {
      const timer = timerRef.current;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);
  (0, import_react11.useEffect)(() => {
    let cancelled = false;
    const sessionTrackId = track?.id ?? null;
    const audio = audioRef.current ?? getMusicPlaybackAudio();
    if (audio && audioRef.current !== audio) {
      audioRef.current = audio;
    }
    if (audio && loadedTrackIdRef.current && sessionTrackId && loadedTrackIdRef.current !== sessionTrackId) {
      prepareMusicPlaybackSourceChange();
      commitPlaybackUiTime(0, true);
      setDuration(0);
      setBufferedProgress(0);
    }
    if (!audio || !track?.sourceUri) {
      if (audio && !audio.paused && audio.src) {
        setPlaying(true);
        commitPlaybackUiTime(audio.currentTime || 0, true);
        const liveDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        if (liveDuration > 0) {
          setDuration(liveDuration);
        }
        return () => {
          cancelled = true;
        };
      }
      if (audio && sessionTrackId && loadedTrackIdRef.current !== sessionTrackId) {
        prepareMusicPlaybackSourceChange();
        try {
          audio.removeAttribute("src");
          audio.load();
        } catch {
        }
        loadedTrackIdRef.current = null;
        loadedSourceUriRef.current = null;
      }
      setError(null);
      setPlaying(false);
      commitPlaybackUiTime(0, true);
      setDuration(0);
      setBufferedProgress(0);
      if (!track?.sourceUri) {
        loadedTrackIdRef.current = null;
        loadedSourceUriRef.current = null;
      }
      return;
    }
    setError(null);
    const playingFromLocalDisk2 = track.sourceKind === "local" && isMusicLocalPersistedUri(track.sourceUri);
    if (playingFromLocalDisk2) {
      setBufferedProgress(1);
    }
    const shouldResume = resumeAfterLoadRef.current || takePendingAutoPlayTrackId(track.id) || useMusicDemoStore.getState().wantsPlaying && track.id === useMusicDemoStore.getState().nowPlayingId;
    const switchingTrack = loadedTrackIdRef.current != null && loadedTrackIdRef.current !== track.id;
    const sessionSnap = readMusicPlaybackSessionSnapshotSync();
    const sessionPos = sessionSnap && sessionSnap.nowPlayingId === track.id ? sessionSnap.playbackPositionSec : 0;
    const resumeAt = resolveMusicResumePositionSec({
      switchingTrack,
      nowPlayingMatches: track.id === useMusicDemoStore.getState().nowPlayingId,
      storePositionSec: Math.max(
        useMusicDemoStore.getState().playbackPositionSec,
        sessionPos
      ),
      audioCurrentTimeSec: audio.currentTime || 0
    });
    if (!switchingTrack && resumeAt > useMusicDemoStore.getState().playbackPositionSec) {
      useMusicDemoStore.getState().setPlaybackPosition(resumeAt);
    }
    resumeAfterLoadRef.current = false;
    const attachedOnSameTrack = isMusicPlaybackAttachedOnTrack({
      trackId: track.id,
      sourceUri: track.sourceUri,
      nowPlayingId: useMusicDemoStore.getState().nowPlayingId,
      audio,
      loadedTrackId: loadedTrackIdRef.current,
      loadedSourceUri: loadedSourceUriRef.current
    });
    if (attachedOnSameTrack) {
      loadedTrackIdRef.current = track.id;
      loadedSourceUriRef.current = track.sourceUri;
      setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: track.sourceUri });
      syncMusicPlaybackPositionToStore(true);
      const liveAt = Math.max(0, audio.currentTime || resumeAt || 0);
      commitPlaybackUiTime(liveAt, true);
      const liveDuration = readMusicPlaybackDurationSec(audio);
      setDuration(liveDuration);
      if (!(liveDuration > 0)) {
        const onMeta = () => {
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return;
          }
          const next = readMusicPlaybackDurationSec(audio);
          if (next > 0) {
            setDuration(next);
          }
          commitPlaybackUiTime(audio.currentTime || 0, true);
        };
        audio.addEventListener("loadedmetadata", onMeta, { once: true });
        void whenMusicPlaybackMetadataReady(audio).then((sec) => {
          if (!cancelled && sec > 0) {
            setDuration(sec);
          }
          return void 0;
        });
      }
      if (playingFromLocalDisk2) {
        setBufferedProgress(1);
      }
      setStreamResolving(false);
      if (shouldResume && audio.paused) {
        void safeMusicPlay(audio).then((ok) => {
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return void 0;
          }
          if (ok) {
            setPlaying(true);
            setWantsPlaying(true);
          } else {
            setPlaying(false);
            setWantsPlaying(true);
            void maybeRestoreMusicPlaybackAfterColdStart();
          }
          return void 0;
        });
      } else {
        setPlaying(!audio.paused);
      }
      return () => {
        cancelled = true;
      };
    }
    const sameTrackUriSwap = loadedTrackIdRef.current === track.id && loadedSourceUriRef.current != null && loadedSourceUriRef.current !== track.sourceUri && track.id === useMusicDemoStore.getState().nowPlayingId && Boolean(audio.src);
    if (sameTrackUriSwap) {
      const preserveAt = Math.max(0, audio.currentTime || resumeAt || 0);
      const wasPlaying = !audio.paused || shouldResume || Boolean(useMusicDemoStore.getState().wantsPlaying);
      if (playingFromLocalDisk2) {
        setBufferedProgress(1);
      }
      void (async () => {
        const rawUri = track.sourceUri;
        try {
          const resolvedUri = /^https?:\/\//.test(rawUri) ? rawUri : await host().files.resolveObjectUrl(rawUri);
          const referer = getMusicProviderReferer(track.remoteRef?.providerId);
          const uri = /^https?:\/\//.test(resolvedUri) ? await resolveMusicPlayableSrc(resolvedUri, { referer }) : resolvedUri;
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return;
          }
          if (objectUrlRef.current?.startsWith("blob:") && objectUrlRef.current !== uri) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          objectUrlRef.current = uri;
          const playbackAudio = setMusicPlaybackSrc(audio, uri);
          audioRef.current = playbackAudio;
          const onReady = () => {
            if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
              return;
            }
            try {
              if (preserveAt > 0 && Number.isFinite(playbackAudio.duration) && preserveAt < playbackAudio.duration) {
                playbackAudio.currentTime = preserveAt;
              }
            } catch {
            }
            commitPlaybackUiTime(playbackAudio.currentTime || preserveAt, true);
            setDuration(playbackAudio.duration || 0);
            if (playingFromLocalDisk2) {
              setBufferedProgress(1);
            }
            if (wasPlaying) {
              void safeMusicPlay(playbackAudio).then((ok) => {
                if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
                  setStreamResolving(false);
                  return void 0;
                }
                if (ok) {
                  setPlaying(true);
                  setWantsPlaying(true);
                  setStreamResolving(false);
                } else {
                  setPlaying(false);
                  setWantsPlaying(true);
                  setStreamResolving(false);
                  void maybeRestoreMusicPlaybackAfterColdStart();
                }
                return void 0;
              });
            } else {
              setStreamResolving(false);
            }
          };
          loadedTrackIdRef.current = track.id;
          loadedSourceUriRef.current = rawUri;
          setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: rawUri });
          playbackAudio.addEventListener("loadeddata", onReady, { once: true });
          void playbackAudio.load();
        } catch (loadError) {
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            return;
          }
          if (isMusicPlayInterruptedError(loadError)) {
            setStreamResolving(false);
            return;
          }
          setStreamResolving(false);
          const message = formatMusicPlaybackError(loadError);
          if (message) {
            setError(message);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    if (!playingFromLocalDisk2) {
      setBufferedProgress(0);
    }
    setPlaying(false);
    commitPlaybackUiTime(resumeAt, true);
    void (async () => {
      const rawUri = track.sourceUri;
      try {
        const resolvedUri = /^https?:\/\//.test(rawUri) ? rawUri : await host().files.resolveObjectUrl(rawUri);
        const referer = getMusicProviderReferer(track.remoteRef?.providerId);
        const uri = /^https?:\/\//.test(resolvedUri) ? await resolveMusicPlayableSrc(resolvedUri, { referer }) : resolvedUri;
        if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
          return;
        }
        const loadedMeta = getMusicPlaybackLoadedMeta();
        const sameSrc = Boolean(audio.src) && (audio.src === uri || objectUrlRef.current === uri) && (loadedTrackIdRef.current === track.id || loadedMeta?.trackId === track.id);
        if (sameSrc) {
          loadedTrackIdRef.current = track.id;
          loadedSourceUriRef.current = rawUri;
          setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: rawUri });
          syncMusicPlaybackPositionToStore(true);
          commitPlaybackUiTime(audio.currentTime || resumeAt || 0, true);
          setDuration(readMusicPlaybackDurationSec(audio));
          if (shouldResume) {
            if (!audio.paused) {
              setPlaying(true);
              setStreamResolving(false);
              return;
            }
            const started = await safeMusicPlay(audio);
            if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
              return;
            }
            if (started) {
              setPlaying(true);
              setWantsPlaying(true);
              setStreamResolving(false);
            } else {
              setPlaying(false);
              setWantsPlaying(true);
              setStreamResolving(false);
              void maybeRestoreMusicPlaybackAfterColdStart();
            }
            return;
          }
          setPlaying(false);
          setStreamResolving(false);
          return;
        }
        if (!switchingTrack && track.id === useMusicDemoStore.getState().nowPlayingId) {
          const liveSec = Math.max(
            0,
            Math.floor(audio.currentTime || 0),
            useMusicDemoStore.getState().playbackPositionSec,
            resumeAt
          );
          if (liveSec > useMusicDemoStore.getState().playbackPositionSec) {
            useMusicDemoStore.getState().setPlaybackPosition(liveSec);
          }
        }
        const seekTo = resolveMusicResumePositionSec({
          switchingTrack,
          nowPlayingMatches: track.id === useMusicDemoStore.getState().nowPlayingId,
          storePositionSec: useMusicDemoStore.getState().playbackPositionSec,
          audioCurrentTimeSec: audio.currentTime || 0
        });
        if (objectUrlRef.current?.startsWith("blob:") && objectUrlRef.current !== uri) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = uri;
        prepareMusicPlaybackSourceChange();
        const playbackAudio = setMusicPlaybackSrc(audio, uri);
        audioRef.current = playbackAudio;
        loadedTrackIdRef.current = track.id;
        loadedSourceUriRef.current = rawUri;
        setMusicPlaybackLoadedMeta({ trackId: track.id, sourceUri: rawUri });
        void playbackAudio.load();
        if (playingFromLocalDisk2) {
          setBufferedProgress(1);
        }
        const durationSec = await whenMusicPlaybackMetadataReady(playbackAudio);
        if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
          return;
        }
        if (durationSec > 0) {
          setDuration(durationSec);
        }
        if (seekTo > 0) {
          try {
            playbackAudio.currentTime = durationSec > 0 ? Math.min(seekTo, Math.max(0, durationSec - 0.05)) : seekTo;
          } catch {
          }
        }
        const syncDurationFromAudio = () => {
          const next = readMusicPlaybackDurationSec(playbackAudio);
          if (next > 0) {
            setDuration(next);
          }
        };
        if (shouldResume) {
          const started = await safeMusicPlay(playbackAudio);
          if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
            try {
              playbackAudio.pause();
            } catch {
            }
            return;
          }
          syncDurationFromAudio();
          if (started) {
            setPlaying(true);
            setWantsPlaying(true);
            setStreamResolving(false);
            setError(null);
          } else {
            setPlaying(false);
            setWantsPlaying(true);
            setStreamResolving(false);
            void maybeRestoreMusicPlaybackAfterColdStart();
          }
        } else {
          syncDurationFromAudio();
          setStreamResolving(false);
        }
      } catch (loadError) {
        if (cancelled || useMusicDemoStore.getState().nowPlayingId !== track.id) {
          return;
        }
        if (isMusicPlayInterruptedError(loadError)) {
          if (!audio.paused) {
            setPlaying(true);
            setWantsPlaying(true);
            setStreamResolving(false);
            setError(null);
            return;
          }
          setStreamResolving(false);
          return;
        }
        setStreamResolving(false);
        if (track.sourceKind === "cloud") {
          const recovered = await recoverCloudPlaybackRef.current(rawUri);
          if (!recovered && !cancelled && useMusicDemoStore.getState().nowPlayingId === track.id) {
            setError(cloudPlaybackGaveUpMessage());
          }
          return;
        }
        const message = formatMusicPlaybackError(loadError);
        if (message) {
          setError(message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [track?.id, track?.sourceUri, setWantsPlaying]);
  (0, import_react11.useEffect)(() => {
    let cancelled = false;
    const trackId = track?.id ?? null;
    const raw = track?.coverUri?.trim() || null;
    if (!raw || !trackId) {
      setCoverDisplay(null);
      return () => {
        cancelled = true;
      };
    }
    setCoverDisplay((prev) => prev?.trackId === trackId ? prev : null);
    const applyCover = (uri) => {
      if (!cancelled && useMusicDemoStore.getState().nowPlayingId === trackId) {
        setCoverDisplay({ trackId, uri: coverUrlForHero(uri) });
      }
    };
    if (/^https?:\/\//.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
      applyCover(raw);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        applyCover(await host().files.resolveObjectUrl(raw));
      } catch {
        if (!cancelled && useMusicDemoStore.getState().nowPlayingId === trackId) {
          setCoverDisplay(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [track?.coverUri, track?.id]);
  (0, import_react11.useEffect)(() => {
    let cancelled = false;
    const sourceId = MUSIC_APP_ID;
    if (!libraryHydrationReady) {
      return () => {
        cancelled = true;
      };
    }
    const label = track?.title?.trim() || void 0;
    const trackId = track?.id;
    const themeBrightness = theme.colorScheme === "light" ? "light" : "dark";
    const pushBand = (palette) => {
      const band = pickAtmosphereBandForTheme(palette, themeBrightness);
      host().ui.setAtmosphere({
        sourceId,
        primary: band.primary,
        secondary: band.secondary,
        tertiary: band.tertiary,
        luminance: band.luminance,
        sourceLabel: label,
        bands: { light: palette.light, dark: palette.dark }
      });
    };
    if (!atmospherePushEnabled) {
      host().ui.clearAtmosphere(sourceId);
      return () => {
        cancelled = true;
      };
    }
    if (!trackId) {
      return () => {
        cancelled = true;
      };
    }
    const coverKey = track?.coverUri?.trim() || null;
    const displayUri = coverDisplay && coverDisplay.trackId === trackId ? coverDisplay.uri.trim() || null : null;
    const extractUri = displayUri || (coverKey && (/^https?:\/\//.test(coverKey) || coverKey.startsWith("data:") || coverKey.startsWith("blob:")) ? coverKey : null);
    const cached = useMusicDemoStore.getState().getTrack(trackId)?.atmospherePalette;
    const cacheOk = Boolean(
      cached?.dark?.primary && cached?.light?.primary && cached.extractVersion === ATMOSPHERE_EXTRACT_VERSION && (!coverKey || !cached.coverKey || cached.coverKey === coverKey)
    );
    if (cacheOk && cached?.dark && cached.light) {
      pushBand({ dark: cached.dark, light: cached.light });
    }
    if (!extractUri) {
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const palette = await ensureTrackAtmospherePalette({
        trackId,
        coverKeyUri: track?.coverUri,
        extractUri
      });
      if (cancelled || !palette) {
        return;
      }
      if (!useMusicDemoStore.getState().atmospherePushEnabled) {
        return;
      }
      if (useMusicDemoStore.getState().nowPlayingId !== trackId) {
        return;
      }
      pushBand(palette);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    atmospherePushEnabled,
    coverDisplay,
    libraryHydrationReady,
    theme.colorScheme,
    track?.coverUri,
    track?.id,
    track?.title
  ]);
  (0, import_react11.useEffect)(() => {
    let cancelled = false;
    const displayUri = coverDisplay && track?.id && coverDisplay.trackId === track.id ? coverDisplay.uri.trim() || null : null;
    void (async () => {
      await syncMusicContentBackdropToHost(host(), { displayUri });
      if (cancelled) {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    coverBackdropEnabled,
    coverBackdropBlur,
    coverBackdropOpacity,
    coverBackdropIncludeTabBar,
    coverDisplay,
    track?.coverUri,
    track?.id,
    track?.title
  ]);
  (0, import_react11.useEffect)(() => {
    lyricLineOffsetRef.current = /* @__PURE__ */ new Map();
    setLyricSelectedIndex(null);
    setLyricHoveredIndex(null);
  }, [track?.id, track?.lyrics]);
  (0, import_react11.useEffect)(() => {
    if (typeof document === "undefined") {
      return;
    }
    const styleId = "agnx-music-lyrics-chrome-v8";
    document.getElementById(styleId)?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v7")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v6")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v5")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v4")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v3")?.remove();
    document.getElementById("agnx-music-lyrics-chrome-v2")?.remove();
    document.getElementById("agnx-music-lyrics-scrollbar-hide")?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
.agnx-music-lyrics-scroll,
.agnx-music-lyrics-scroll > div,
[data-testid="workspace-mini-app-music-lyrics"],
[data-testid="workspace-mini-app-music-lyrics"] * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.agnx-music-lyrics-scroll::-webkit-scrollbar,
.agnx-music-lyrics-scroll *::-webkit-scrollbar,
[data-testid="workspace-mini-app-music-lyrics"]::-webkit-scrollbar,
[data-testid="workspace-mini-app-music-lyrics"] *::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
  background: transparent !important;
}
.agnx-music-lyrics-fade-host {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.agnx-music-lyrics-scroll,
[data-testid="workspace-mini-app-music-lyrics"] {
  cursor: default !important;
}
/* \u9ED8\u8BA4\u7981\u6B62\u9009\u533A\uFF0C\u907F\u514D\u70B9\u9009\u9AD8\u4EAE\u540E\u6B8B\u7559\u6587\u5B57\u9009\u533A\u6321\u4F4F\u300C\u518D\u70B9\u53D6\u6D88\u300D\uFF1B\u684C\u9762\u6B4C\u8BCD\u6B63\u6587\u5355\u72EC\u5F00\u9009 */
.agnx-music-lyrics-scroll *,
[data-testid="workspace-mini-app-music-lyrics"] * {
  user-select: none !important;
  -webkit-user-select: none !important;
}
.agnx-music-lyrics-scroll [data-lyric-selectable="true"],
[data-testid="workspace-mini-app-music-lyrics"] [data-lyric-selectable="true"] {
  user-select: text !important;
  -webkit-user-select: text !important;
}
/* \u9876\u5E95\u52A0\u9AD8\u6E10\u53D8\u900F\u660E\uFF08\u4EC5 mask\uFF0C\u4E0D\u7528 backdrop-filter\uFF0C\u907F\u514D\u6EA2\u51FA\u906E\u6321\u4E0B\u65B9\u6807\u9898\uFF09 */
.agnx-music-lyrics-scroll,
[data-testid="workspace-mini-app-music-lyrics"] {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 200px,
    #000 calc(100% - 200px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 200px,
    #000 calc(100% - 200px),
    transparent 100%
  );
}
`;
    document.head.appendChild(style);
  }, []);
  const beginProgrammaticLyricsScroll = (0, import_react11.useCallback)(() => {
    lyricsProgrammaticScrollRef.current = true;
    if (lyricsProgrammaticClearTimerRef.current) {
      clearTimeout(lyricsProgrammaticClearTimerRef.current);
    }
    lyricsProgrammaticClearTimerRef.current = setTimeout(() => {
      lyricsProgrammaticScrollRef.current = false;
      lyricsProgrammaticClearTimerRef.current = null;
    }, 480);
  }, []);
  (0, import_react11.useEffect)(() => {
    if (!track?.id) {
      return;
    }
    if (lyricsBrowseTimerRef.current) {
      clearTimeout(lyricsBrowseTimerRef.current);
      lyricsBrowseTimerRef.current = null;
    }
    if (lyricSelectTimerRef.current) {
      clearTimeout(lyricSelectTimerRef.current);
      lyricSelectTimerRef.current = null;
    }
    setLyricsUserBrowsing(false);
    setLyricSelectedIndex(null);
    setLyricHoveredIndex(null);
    preferInstantLyricScrollRef.current = true;
    setLyricsFollowEpoch((epoch) => epoch + 1);
  }, [track?.id, track?.lyrics]);
  const markLyricsUserBrowsing = (0, import_react11.useCallback)(() => {
    if (lyricsProgrammaticScrollRef.current) {
      return;
    }
    setLyricsUserBrowsing(true);
    if (lyricsBrowseTimerRef.current) {
      clearTimeout(lyricsBrowseTimerRef.current);
      lyricsBrowseTimerRef.current = null;
    }
  }, []);
  (0, import_react11.useEffect)(() => {
    return () => {
      if (lyricsBrowseTimerRef.current) {
        clearTimeout(lyricsBrowseTimerRef.current);
      }
      if (lyricsProgrammaticClearTimerRef.current) {
        clearTimeout(lyricsProgrammaticClearTimerRef.current);
      }
      if (lyricSelectTimerRef.current) {
        clearTimeout(lyricSelectTimerRef.current);
      }
    };
  }, []);
  const handleLyricLinePress = (0, import_react11.useCallback)(
    (timeSec2) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(timeSec2)) {
        return;
      }
      audio.currentTime = timeSec2;
      commitPlaybackUiTime(timeSec2, true);
      setPlaybackPosition(timeSec2);
      if (lyricsBrowseTimerRef.current) {
        clearTimeout(lyricsBrowseTimerRef.current);
        lyricsBrowseTimerRef.current = null;
      }
      setLyricsUserBrowsing(false);
      setLyricHoveredIndex(null);
      setLyricSelectedIndex(null);
      if (!playing) {
        void safeMusicPlay(audio).then((ok) => {
          if (ok) {
            setPlaying(true);
            setWantsPlaying(true);
          }
          return void 0;
        });
      }
    },
    [commitPlaybackUiTime, playing, setPlaybackPosition, setWantsPlaying]
  );
  const handleResumeLyricsFollow = (0, import_react11.useCallback)(() => {
    if (lyricsBrowseTimerRef.current) {
      clearTimeout(lyricsBrowseTimerRef.current);
      lyricsBrowseTimerRef.current = null;
    }
    if (lyricSelectTimerRef.current) {
      clearTimeout(lyricSelectTimerRef.current);
      lyricSelectTimerRef.current = null;
    }
    setLyricSelectedIndex(null);
    setLyricHoveredIndex(null);
    setLyricsUserBrowsing(false);
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    const time = audioRef.current?.currentTime ?? currentTimeRef.current;
    commitPlaybackUiTime(time || 0, true);
    preferInstantLyricScrollRef.current = true;
    setLyricsFollowEpoch((epoch) => epoch + 1);
  }, [commitPlaybackUiTime]);
  (0, import_react11.useEffect)(() => {
    const trackId = track?.id;
    if (!trackId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const restored = await restoreTrackFromDownloadBundleIfNeeded(host(), trackId);
      if (cancelled || !restored) {
        return;
      }
      loadedTrackIdRef.current = null;
      loadedSourceUriRef.current = null;
    })();
    return () => {
      cancelled = true;
    };
  }, [track?.id]);
  (0, import_react11.useEffect)(() => {
    if (track?.sourceKind === "local" && isMusicLocalPersistedUri(track.sourceUri)) {
      setBufferedProgress(1);
    }
  }, [track?.id, track?.sourceKind, track?.sourceUri]);
  (0, import_react11.useEffect)(() => {
    const trackId = track?.id;
    const title = track?.title?.trim() ?? "";
    const artist = track?.artist ?? "";
    const existingLyrics = track?.lyrics;
    const providerId = track?.remoteRef?.providerId?.trim() ?? "";
    if (isDeferredBrowserProviderId(providerId)) {
      if (trackId && existingLyrics?.trim()) {
        useMusicDemoStore.getState().updateTrack(trackId, { lyrics: null });
      }
      return;
    }
    if (trackId && title && existingLyrics?.trim() && !lyricsLikelyBelongToTrack(existingLyrics, title)) {
      useMusicDemoStore.getState().updateTrack(trackId, { lyrics: null });
      return;
    }
    if (!providerId && track?.sourceKind === "local") {
      return;
    }
    if (!trackId || !title || existingLyrics?.trim()) {
      return;
    }
    if (lyricsEnrichingRef.current === trackId) {
      return;
    }
    lyricsEnrichingRef.current = trackId;
    let cancelled = false;
    void (async () => {
      try {
        const lyrics = await findTxqqLyricsText({
          title,
          artist
        });
        if (cancelled || !lyrics) {
          return;
        }
        const latest = useMusicDemoStore.getState().tracks.find((item) => item.id === trackId);
        if (!latest || latest.lyrics?.trim()) {
          return;
        }
        useMusicDemoStore.getState().updateTrack(trackId, { lyrics });
      } finally {
        if (lyricsEnrichingRef.current === trackId) {
          lyricsEnrichingRef.current = null;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    track?.id,
    track?.title,
    track?.artist,
    track?.lyrics,
    track?.remoteRef?.providerId,
    track?.sourceKind
  ]);
  (0, import_react11.useEffect)(() => {
    const trackId = track?.id;
    const sourceKind = track?.sourceKind;
    const sourceUri = track?.sourceUri;
    const remoteRef = track?.remoteRef;
    if (!trackId) {
      return;
    }
    if (sourceKind === "local" && isMusicLocalPersistedUri(sourceUri)) {
      return;
    }
    const playableUrl = sourceUri && /^https?:\/\//i.test(sourceUri) ? sourceUri.trim() : null;
    if (!playableUrl && !remoteRef) {
      return;
    }
    if (cloudAutoPersistInFlight.has(trackId)) {
      return;
    }
    cloudAutoPersistInFlight.add(trackId);
    let cancelled = false;
    void (async () => {
      try {
        await downloadAndPersistTrackBundle(host(), trackId, {
          playableUrl,
          force: false
        });
        if (cancelled) {
          return;
        }
        const latest = useMusicDemoStore.getState().getTrack(trackId);
        if (!latest || !isMusicLocalPersistedUri(latest.sourceUri)) {
          return;
        }
        setBufferedProgress(1);
      } catch {
        cloudAutoPersistInFlight.delete(trackId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [track?.id, track?.remoteRef, track?.sourceKind, track?.sourceUri]);
  (0, import_react11.useEffect)(() => {
    if (pendingPlayerSurface === "search") {
      pendingPlayerSurface = null;
      setPlayerSurface("search");
    }
  }, [setPlayerSurface]);
  (0, import_react11.useEffect)(() => {
    writePersistedSearchCenterControlsOpen(searchCenterControlsOpen);
  }, [searchCenterControlsOpen]);
  const handleToggle = (0, import_react11.useCallback)(async () => {
    if (!track) {
      return;
    }
    setNowPlaying(track.id);
    const audio = audioRef.current;
    if (!audio || !track.sourceUri) {
      setError(track.remoteRef ? "\u6682\u65E0\u53EF\u7528\u64AD\u653E\u5730\u5740" : "\u8BF7\u5148\u4E0A\u4F20\u672C\u5730\u97F3\u9891");
      return;
    }
    const actuallyPlaying = !audio.paused;
    try {
      if (actuallyPlaying) {
        await applyMusicPlaybackIntent(false);
        setPlaying(false);
        setError(null);
        return;
      }
      const started = await applyMusicPlaybackIntent(true);
      if (started.applied && started.audioPaused === false) {
        setPlaying(true);
        setError(null);
      } else if (!audio.paused) {
        setPlaying(true);
        setWantsPlaying(true);
        setError(null);
      } else {
        setPlaying(false);
        setWantsPlaying(true);
        void maybeRestoreMusicPlaybackAfterColdStart();
      }
    } catch (playError) {
      if (isMusicPlayInterruptedError(playError)) {
        if (!audio.paused) {
          setPlaying(true);
          setWantsPlaying(true);
          setError(null);
        }
        return;
      }
      setPlaying(false);
      if (!isMusicAutoplayBlockedError(playError)) {
        setWantsPlaying(false);
      }
      const message = playError instanceof Error ? formatMusicPlaybackError(playError) : "\u64AD\u653E\u5931\u8D25";
      if (message) {
        setError(message);
      }
    }
  }, [setNowPlaying, setWantsPlaying, track]);
  const handleSeekRatio = (0, import_react11.useCallback)(
    (ratio) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(duration) || duration <= 0) {
        return;
      }
      const next = ratio * duration;
      audio.currentTime = next;
      commitPlaybackUiTime(next, true);
      setPlaybackPosition(next);
    },
    [commitPlaybackUiTime, duration, setPlaybackPosition]
  );
  const invalidateSearchResolve = (0, import_react11.useCallback)(() => {
    searchResolveGenerationRef.current += 1;
    setStreamResolving(false);
    prepareMusicPlaybackSourceChange();
  }, []);
  const handlePrev = (0, import_react11.useCallback)(() => {
    invalidateSearchResolve();
    resumeAfterLoadRef.current = true;
    const prev = playPrevious();
    if (prev) {
      setPlaying(true);
    } else {
      resumeAfterLoadRef.current = false;
    }
  }, [invalidateSearchResolve, playPrevious]);
  const handleNext = (0, import_react11.useCallback)(() => {
    invalidateSearchResolve();
    resumeAfterLoadRef.current = true;
    const next = playNext();
    if (next) {
      setPlaying(true);
    } else {
      resumeAfterLoadRef.current = false;
    }
  }, [invalidateSearchResolve, playNext]);
  const handleCycleMode = (0, import_react11.useCallback)(() => {
    cyclePlayMode();
  }, [cyclePlayMode]);
  const handleVolumeChange = (0, import_react11.useCallback)(
    (ratio) => {
      setMuted(false);
      setVolume(ratio);
    },
    [setMuted, setVolume]
  );
  const handleToggleMute = (0, import_react11.useCallback)(() => {
    setMuted(!muted);
  }, [muted, setMuted]);
  const openDesktopVolumeHover = (0, import_react11.useCallback)(() => {
    if (volumeCloseTimerRef.current) {
      clearTimeout(volumeCloseTimerRef.current);
      volumeCloseTimerRef.current = null;
    }
    setDesktopVolumeHoverOpen(true);
  }, []);
  const scheduleCloseDesktopVolumeHover = (0, import_react11.useCallback)(() => {
    if (volumeCloseTimerRef.current) {
      clearTimeout(volumeCloseTimerRef.current);
    }
    volumeCloseTimerRef.current = setTimeout(() => {
      setDesktopVolumeHoverOpen(false);
      volumeCloseTimerRef.current = null;
    }, 160);
  }, []);
  const handleToggleQueue = (0, import_react11.useCallback)(() => {
    setQueueOpen((open) => !open);
  }, []);
  const handleQueueSelect = (0, import_react11.useCallback)(
    (id) => {
      invalidateSearchResolve();
      resumeAfterLoadRef.current = true;
      setNowPlaying(id);
      setPlaying(true);
      if (isCompact) {
        setQueueOpen(false);
      }
    },
    [invalidateSearchResolve, isCompact, setNowPlaying]
  );
  const handleQueueRemove = (0, import_react11.useCallback)(
    (id) => {
      const wasPlaying = useMusicDemoStore.getState().nowPlayingId === id;
      removeFromQueue(id);
      if (!wasPlaying) {
        return;
      }
      const nextId = useMusicDemoStore.getState().nowPlayingId;
      if (nextId) {
        requestTrackAutoPlay(nextId);
      }
    },
    [removeFromQueue]
  );
  const handleQueueMove = (0, import_react11.useCallback)(
    (fromIndex, toIndex) => {
      moveQueueItem(fromIndex, toIndex);
    },
    [moveQueueItem]
  );
  const handlePlayPress = (0, import_react11.useCallback)(() => {
    void handleToggle();
  }, [handleToggle]);
  const handleReplaceCover = (0, import_react11.useCallback)(async () => {
    if (!track) {
      return;
    }
    try {
      const files = await host().files.pickAndImport({
        title: "\u9009\u62E9\u5C01\u9762",
        multiple: false,
        extensions: [
          "png",
          "jpg",
          "jpeg",
          "webp",
          "gif",
          "bmp",
          "avif",
          "mp4",
          "webm",
          "mov",
          "m4v",
          "ogv"
        ],
        accept: "image/*,video/*,.gif,.png,.jpg,.jpeg,.webp,.bmp,.avif,.mp4,.webm,.mov,.m4v,.ogv",
        filterLabel: "\u56FE\u7247\u6216\u89C6\u9891",
        appId: MUSIC_APP_ID
      });
      const file = files[0];
      if (!file) {
        return;
      }
      useMusicDemoStore.getState().updateTrack(track.id, { coverUri: file.uri });
      setError(null);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : "\u66F4\u6362\u5C01\u9762\u5931\u8D25");
    }
  }, [track]);
  const handleOpenSearch = (0, import_react11.useCallback)(() => {
    setQueueOpen(false);
    setCompactVolumeOpen(false);
    setTransportSliderMode("progress");
    setPlayerSurface("search");
  }, [setPlayerSurface]);
  const handleBackToPlayer = (0, import_react11.useCallback)(() => {
    setTransportSliderMode("progress");
    setPlayerSurface("player");
  }, [setPlayerSurface]);
  const toggleCoverHidden = (0, import_react11.useCallback)(() => {
    setCoverHidden(!useMusicDemoStore.getState().coverHidden);
  }, [setCoverHidden]);
  const handleToggleSearch = (0, import_react11.useCallback)(() => {
    if (useMusicDemoStore.getState().playerSurface === "search") {
      handleBackToPlayer();
      return;
    }
    handleOpenSearch();
  }, [handleBackToPlayer, handleOpenSearch]);
  const handleSeekPreviewChange = (0, import_react11.useCallback)((next) => {
    setSeekPreview(next);
  }, []);
  const dismissFloatingControls = (0, import_react11.useCallback)(() => {
    setCompactVolumeOpen(false);
    setDesktopVolumeHoverOpen(false);
    setSeekPreview((current) => current.visible ? { ...current, visible: false } : current);
  }, []);
  const renderOverflowHoverSidePanel = (0, import_react11.useCallback)(
    (id) => {
      if (id !== "volume" || muted) {
        return null;
      }
      return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.menuVolumePanel, testID: "music-volume-popover", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        VolumeBar,
        {
          value: volume,
          onChange: handleVolumeChange,
          wide: true,
          testID: "music-volume-popover-bar"
        }
      ) });
    },
    [handleVolumeChange, muted, volume]
  );
  const handleTrackMenuAction = (0, import_react11.useCallback)(
    (id, trackIdOverride) => {
      const trackId = trackIdOverride ?? track?.id;
      if (!trackId) {
        return;
      }
      if (id === "refreshResources") {
        setPlaceholderToast("\u6B63\u5728\u66F4\u65B0\u5E76\u4FDD\u5B58\u5230\u672C\u5730\uFF08\u97F3\u6E90/\u5C01\u9762/\u6B4C\u8BCD\uFF09\u2026");
      }
      if (id === "exportZip") {
        setPlaceholderToast("\u6B63\u5728\u51C6\u5907\u5BFC\u51FA\u2026");
      }
      if (id === "deleteTrack") {
        setPlaceholderToast("\u6B63\u5728\u5220\u9664\u672C\u5730\u6587\u4EF6\u2026");
      }
      void (async () => {
        try {
          const result = await runMusicTrackMenuAction({
            hostApi: host(),
            action: id,
            trackId
          });
          if (result.toast) {
            setPlaceholderToast(result.toast);
          }
          if (result.reloadPlayback && useMusicDemoStore.getState().nowPlayingId === trackId) {
            loadedTrackIdRef.current = null;
            loadedSourceUriRef.current = null;
            resumeAfterLoadRef.current = playing;
            setNowPlaying(trackId);
            setWantsPlaying(playing || useMusicDemoStore.getState().wantsPlaying);
          }
        } catch (menuError) {
          const message = menuError instanceof Error ? menuError.message : "\u64CD\u4F5C\u5931\u8D25";
          notifyMusicPlayerError(message);
        }
      })();
    },
    [playing, setNowPlaying, setWantsPlaying, track]
  );
  const handleOpenEditLayout = (0, import_react11.useCallback)(() => {
    openPlayerEntityEditLayout();
  }, [openPlayerEntityEditLayout]);
  (0, import_react11.useEffect)(() => {
    const sync = () => {
      const interactive = isThisMiniAppPaneInteractive({
        appId: props.appId,
        panelId: props.panelId,
        entityId: props.entityId
      });
      const visible = isThisMiniAppPaneVisible({
        appId: props.appId,
        panelId: props.panelId,
        entityId: props.entityId
      });
      setMusicPlayerShortcutSurfaceActive(visible);
      setPaneInteractive(interactive);
      const wasVisible = paneVisibleRef.current;
      setPaneVisible(visible);
      if (visible) {
        const audio = audioRef.current;
        const time = audio?.currentTime ?? currentTimeRef.current;
        commitPlaybackUiTime(time || 0, true);
        if (!wasVisible) {
          if (lyricsBrowseTimerRef.current) {
            clearTimeout(lyricsBrowseTimerRef.current);
            lyricsBrowseTimerRef.current = null;
          }
          setLyricsUserBrowsing(false);
          setLyricSelectedIndex(null);
          preferInstantLyricScrollRef.current = true;
          if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => {
              preferInstantLyricScrollRef.current = true;
              setLyricsFollowEpoch((epoch) => epoch + 1);
            });
          } else {
            setLyricsFollowEpoch((epoch) => epoch + 1);
          }
        }
      }
    };
    sync();
    if (typeof window === "undefined") {
      return () => {
        setMusicPlayerShortcutSurfaceActive(false);
      };
    }
    window.addEventListener(MINI_APP_PANE_INTERACTIVE_EVENT, sync);
    return () => {
      window.removeEventListener(MINI_APP_PANE_INTERACTIVE_EVENT, sync);
      if (!isThisMiniAppPaneVisible({
        appId: props.appId,
        panelId: props.panelId,
        entityId: props.entityId
      })) {
        setMusicPlayerShortcutSurfaceActive(false);
      }
    };
  }, [commitPlaybackUiTime, props.appId, props.entityId, props.panelId]);
  (0, import_react11.useEffect)(() => {
    setMusicPlayerShortcutHandlers({
      "action:pin": () => handleTrackMenuAction("pin"),
      "action:search": () => handleToggleSearch(),
      "action:addPlaylist": () => handleTrackMenuAction("addPlaylist"),
      "action:playNext": () => handleTrackMenuAction("playNext"),
      "action:volume": () => {
        setTransportSliderMode((mode) => mode === "progress" ? "volume" : "progress");
      },
      "action:share": () => handleTrackMenuAction("share"),
      "action:detail": () => handleTrackMenuAction("detail"),
      "action:exportZip": () => handleTrackMenuAction("exportZip"),
      "action:refreshResources": () => handleTrackMenuAction("refreshResources"),
      "action:deleteTrack": () => handleTrackMenuAction("deleteTrack"),
      "transport:prev": () => handlePrev(),
      "transport:play": () => handlePlayPress(),
      "transport:next": () => handleNext(),
      "transport:mode": () => handleCycleMode(),
      "transport:queue": () => handleToggleQueue(),
      "lyrics:resumeFollow": () => handleResumeLyricsFollow()
    });
  }, [
    handleCycleMode,
    handleNext,
    handlePlayPress,
    handlePrev,
    handleResumeLyricsFollow,
    handleToggleQueue,
    handleToggleSearch,
    handleTrackMenuAction
  ]);
  (0, import_react11.useEffect)(() => {
    refreshMusicControlShortcutHints({
      actionBar: actionLayout.bar,
      playing,
      muted,
      pinned: Boolean(track?.pinned),
      playMode,
      setControlTitles,
      setControlShortcutKeys
    });
  }, [actionLayout.bar, muted, playMode, playing, track?.pinned]);
  const handleSearchPlayLocal = (0, import_react11.useCallback)(
    (trackId) => {
      invalidateSearchResolve();
      requestTrackAutoPlay(trackId);
      setNowPlaying(trackId);
      setPlayerSurface("player");
    },
    [invalidateSearchResolve, setNowPlaying, setPlayerSurface]
  );
  const handleSearchSelectTrackHit = (0, import_react11.useCallback)(
    async (hit) => {
      const generation = ++searchResolveGenerationRef.current;
      prepareMusicPlaybackSourceChange();
      const created = upsertTrackFromSearchHit(hit);
      requestTrackAutoPlay(created.id);
      setNowPlaying(created.id);
      setWantsPlaying(true);
      setStreamResolving(true);
      setPlaceholderToast("\u6B63\u5728\u52A0\u8F7D\u2026");
      const stillCurrent = () => generation === searchResolveGenerationRef.current && useMusicDemoStore.getState().nowPlayingId === created.id;
      let playableUrl = hit.playableUrl?.trim() || created.sourceUri?.trim() || "";
      let resolvedMeta = null;
      let awaitAudioStart = false;
      try {
        const needsResolve = !playableUrl && Boolean(hit.ref.pageUrl || hit.ref.remoteId);
        if (needsResolve) {
          try {
            const resolved = await resolveMusicPlayable(hit.ref);
            if (!stillCurrent()) {
              return;
            }
            playableUrl = resolved?.url?.trim() || "";
            if (resolved) {
              resolvedMeta = {
                title: resolved.title?.trim() || void 0,
                artist: resolved.artist?.trim() || void 0,
                coverUrl: resolved.coverUrl?.trim() || void 0
              };
            }
          } catch (resolveError) {
            if (!stillCurrent()) {
              return;
            }
            if (hit.ref.pageUrl) {
              const message = resolveError instanceof Error ? resolveError.message : "\u89E3\u6790\u97F3\u6D41\u5931\u8D25";
              setPlaceholderToast(message);
              setPlaying(false);
              setWantsPlaying(false);
              return;
            }
          }
        }
        if (!stillCurrent()) {
          return;
        }
        if (!playableUrl) {
          setPlaceholderToast(
            hit.ref.pageUrl || hit.ref.remoteId ? "\u89E3\u6790\u97F3\u6D41\u5931\u8D25\uFF0C\u53EF\u91CD\u8BD5\u6216\u6362\u4E00\u9996" : "\u6682\u65E0\u53EF\u7528\u64AD\u653E\u5730\u5740"
          );
          setPlaying(false);
          setWantsPlaying(false);
          return;
        }
        const latest = useMusicDemoStore.getState().getTrack(created.id) ?? created;
        const keepLocalFile = latest.sourceKind === "local" && Boolean(latest.sourceUri) && !/^https?:\/\//i.test(latest.sourceUri ?? "") && !latest.sourceUri?.startsWith("blob:");
        const artist = resolvedMeta?.artist;
        const artistOk = Boolean(artist) && artist.toLowerCase() !== "pixabay" && artist.toLowerCase() !== "soundstripe";
        useMusicDemoStore.getState().updateTrack(created.id, {
          sourceUri: keepLocalFile ? latest.sourceUri : playableUrl,
          sourceKind: keepLocalFile ? "local" : "cloud",
          remoteRef: hit.ref,
          ...artistOk ? { artist } : {},
          ...resolvedMeta?.coverUrl && !latest.coverUri ? { coverUri: resolvedMeta.coverUrl } : {},
          ...resolvedMeta?.title ? { title: resolvedMeta.title } : {}
        });
        if (!stillCurrent()) {
          return;
        }
        awaitAudioStart = true;
        setPlaceholderToast("\u6B63\u5728\u52A0\u8F7D\u2026");
      } finally {
        if (generation === searchResolveGenerationRef.current && !awaitAudioStart) {
          setStreamResolving(false);
        }
      }
    },
    [setNowPlaying, setWantsPlaying, upsertTrackFromSearchHit]
  );
  const handleSearchPlayAllTrackHits = (0, import_react11.useCallback)(
    (hits) => {
      if (hits.length === 0) {
        return;
      }
      const ids = hits.map((hit) => upsertTrackFromSearchHit(hit).id);
      setQueueIds(ids);
      void handleSearchSelectTrackHit(hits[0]);
    },
    [handleSearchSelectTrackHit, setQueueIds, upsertTrackFromSearchHit]
  );
  const handleSearchEnqueueTrackHits = (0, import_react11.useCallback)(
    (hits) => {
      if (hits.length === 0) {
        return;
      }
      for (const hit of hits) {
        const created = upsertTrackFromSearchHit(hit);
        addToQueue(created.id, "end");
      }
      setPlaceholderToast(`\u5DF2\u52A0\u5165\u961F\u5217 ${hits.length} \u9996`);
    },
    [addToQueue, upsertTrackFromSearchHit]
  );
  const handleSearchPlayNextTrackHit = (0, import_react11.useCallback)(
    (hit) => {
      const created = upsertTrackFromSearchHit(hit);
      addToQueue(created.id, "next");
      setPlaceholderToast(`\u4E0B\u4E00\u9996\u64AD\u653E\uFF1A${created.title}`);
    },
    [addToQueue, upsertTrackFromSearchHit]
  );
  const handleSearchEnqueueTrackHit = (0, import_react11.useCallback)(
    (hit) => {
      const created = upsertTrackFromSearchHit(hit);
      addToQueue(created.id, "end");
      setPlaceholderToast(`\u5DF2\u52A0\u5165\u961F\u5217\uFF1A${created.title}`);
    },
    [addToQueue, upsertTrackFromSearchHit]
  );
  const handleSearchSaveTrackHit = (0, import_react11.useCallback)(
    async (hit) => {
      const created = upsertTrackFromSearchHit(hit);
      if (isMusicTrackDownloadedLocally(created) || isMusicLocalPersistedUri(created.sourceUri)) {
        setPlaceholderToast(`\u5DF2\u5728\u672C\u5730\uFF1A${created.title}`);
        return;
      }
      setPlaceholderToast(`\u6B63\u5728\u4FDD\u5B58\uFF1A${created.title}\u2026`);
      try {
        let playableUrl = hit.playableUrl?.trim() || created.sourceUri?.trim() || "";
        if (!playableUrl && Boolean(hit.ref.pageUrl || hit.ref.remoteId)) {
          const resolved = await resolveMusicPlayable(hit.ref);
          playableUrl = resolved?.url?.trim() || "";
          if (resolved) {
            const artist = resolved.artist?.trim();
            const artistOk = Boolean(artist) && artist.toLowerCase() !== "pixabay" && artist.toLowerCase() !== "soundstripe";
            useMusicDemoStore.getState().updateTrack(created.id, {
              ...playableUrl ? { sourceUri: playableUrl, sourceKind: "cloud", remoteRef: hit.ref } : { remoteRef: hit.ref },
              ...artistOk ? { artist } : {},
              ...resolved.coverUrl?.trim() && !created.coverUri ? { coverUri: resolved.coverUrl.trim() } : {}
            });
          }
        }
        if (!playableUrl) {
          setPlaceholderToast(
            hit.ref.pageUrl || hit.ref.remoteId ? "\u89E3\u6790\u97F3\u6D41\u5931\u8D25\uFF0C\u65E0\u6CD5\u4FDD\u5B58" : "\u6682\u65E0\u53EF\u7528\u64AD\u653E\u5730\u5740\uFF0C\u65E0\u6CD5\u4FDD\u5B58"
          );
          return;
        }
        const report = await downloadAndPersistTrackBundle(host(), created.id, {
          playableUrl,
          force: false
        });
        const latest = useMusicDemoStore.getState().getTrack(created.id);
        if (latest && isMusicLocalPersistedUri(latest.sourceUri)) {
          setPlaceholderToast(`\u5DF2\u4FDD\u5B58\u5230\u672C\u5730\uFF1A${latest.title}`);
          return;
        }
        setPlaceholderToast(
          report?.sourceUri ? `\u5DF2\u5199\u5165\u6E05\u5355\uFF1A${created.title}` : `\u4FDD\u5B58\u672A\u5B8C\u6210\uFF1A${created.title}`
        );
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : "\u4FDD\u5B58\u5931\u8D25";
        setPlaceholderToast(message);
      }
    },
    [upsertTrackFromSearchHit]
  );
  const playingFromLocalDisk = track?.sourceKind === "local" && isMusicLocalPersistedUri(track.sourceUri);
  const seekBuffered = playingFromLocalDisk ? 0 : bufferedProgress;
  const ModeIcon = resolvePlayModeIcon(playMode);
  const effectiveVolume = muted ? 0 : volume;
  const inSearch = playerSurface === "search";
  const desktopVolumeHoverEnabled = isWeb && !isCompact;
  const compactFloatingOverlayVisible = isCompact && (compactVolumeOpen || seekPreview.visible);
  if (!track && !inSearch) {
    if (!libraryHydrationReady) {
      return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.root, testID: "workspace-mini-app-music-boot" });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.root, testID: "workspace-mini-app-music-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.emptyTitle, children: "\u6682\u65E0\u66F2\u76EE" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.meta, children: "\u5BFC\u5165\u672C\u5730\u97F3\u9891\u6216\u641C\u7D22\u540E\u518D\u64AD\u653E\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.emptyActionsRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: "\u4E0A\u4F20\u97F3\u4E50",
            onPress: () => {
              void uploadAndOpenTracks();
            },
            style: styles7.emptySearchHit,
            testID: "music-upload-empty",
            children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.emptySearchText, children: "\u4E0A\u4F20" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
          import_react_native9.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: "\u641C\u7D22\u97F3\u4E50",
            onPress: handleOpenSearch,
            style: styles7.emptySearchHit,
            testID: "music-open-search-empty",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Search, { size: 16, color: accent }),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.emptySearchText, children: "\u641C\u7D22" })
            ]
          }
        )
      ] })
    ] });
  }
  if (!track && inSearch) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: [styles7.root, styles7.rootSearch], testID: "workspace-mini-app-music-player", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.searchSurface, testID: "music-search-drawer", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      MusicSearchView,
      {
        onBack: handleBackToPlayer,
        onPlayLocalTrack: handleSearchPlayLocal,
        onSelectTrackHit: handleSearchSelectTrackHit,
        onPlayAllTrackHits: handleSearchPlayAllTrackHits,
        onEnqueueTrackHits: handleSearchEnqueueTrackHits,
        onPlayNextTrackHit: handleSearchPlayNextTrackHit,
        onEnqueueTrackHit: handleSearchEnqueueTrackHit,
        onSaveTrackHit: handleSearchSaveTrackHit
      }
    ) }) });
  }
  if (!track) {
    return null;
  }
  const actionIconSize = isCompact ? 22 : 18;
  const resolveControlShortcutKeys = (id) => {
    return controlShortcutKeys[id] ?? controlShortcutKeys[`action:${id}`];
  };
  const ActionOverflowMenu = host().ui.ActionOverflowMenu;
  const ActionBar = host().ui.ActionBar;
  const buildMoreMenuItems = (mode = "chrome") => {
    const trackShortcutKeys = {};
    const map = [
      ["pin", "action:pin"],
      ["addPlaylist", "action:addPlaylist"],
      ["playNext", "action:playNext"],
      ["share", "action:share"],
      ["detail", "action:detail"],
      ["exportZip", "action:exportZip"],
      ["refreshResources", "action:refreshResources"],
      ["deleteTrack", "action:deleteTrack"]
    ];
    for (const [menuId, shortcutId] of map) {
      const value = controlShortcutKeys[shortcutId] ?? controlShortcutKeys[menuId];
      if (value) {
        trackShortcutKeys[menuId] = value;
      }
    }
    const menuActionIds = resolveMusicPlayerChromeOverflowIds(actionLayout, true);
    const hideBar = mode === "full" || isCompact && coverHidden;
    const fold = (0, import_app_sdk.projectActionBarOverflowFold)({
      barIds: resolveMusicPlayerBarActionIds(actionLayout),
      overflowIds: menuActionIds,
      hideBar
    });
    const trackItems = buildMusicPlayerOverflowMenuItems({
      pinned: track.pinned,
      menuActionIds: fold.menuOverflowIds,
      foldedBarActionIds: fold.foldedBarIds,
      trackShortcutKeys
    });
    return trackItems;
  };
  const handleOverflowMenuSelect = (id) => {
    const actionId = resolveMusicTrackMenuActionId(id);
    if (actionId) {
      handleTrackMenuAction(actionId);
    }
  };
  const actionContributions = MUSIC_PLAYER_ACTION_IDS.map(
    (id) => {
      const label = id === "pin" ? track?.pinned ? "\u53D6\u6D88\u7F6E\u9876" : "\u7F6E\u9876" : MUSIC_PLAYER_ACTION_LABELS[id];
      return {
        id,
        label,
        tipLabel: stripShortcutSuffix(controlTitles[id] ?? controlTitles[`action:${id}`] ?? label),
        icon: resolveMusicTrackMenuIcon(id, Boolean(track?.pinned)),
        active: id === "pin" && Boolean(track?.pinned),
        destructive: isMusicTrackMenuDestructive(id),
        shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[id],
        // 瞬时面已刷新的键帽优先；否则宿主按 shortcutSourceKey 解析默认/Rebind
        shortcutKeys: resolveControlShortcutKeys(`action:${id}`) ?? resolveControlShortcutKeys(id),
        onPress: () => handleTrackMenuAction(id)
      };
    }
  );
  const trackArtistLabel = track ? resolveTrackArtistLabel(track) : null;
  const titleFontSize = isCompact ? 22 : 24;
  const artistFontSize = isCompact ? 16 : 18;
  const identityMenuItems = buildMoreMenuItems("full");
  const titleArtistHit = (mode) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_native9.Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: coverHidden ? "\u663E\u793A\u5C01\u9762" : "\u9690\u85CF\u5C01\u9762",
      onPress: toggleCoverHidden,
      style: mode === "singleLine" ? [
        styles7.titleSingleLineRow,
        isCompact && coverHidden ? styles7.titleSingleLineRowCompact : null,
        !isCompact ? styles7.titleSingleLineRowDesktop : null
      ] : styles7.titleTextColumn,
      children: mode === "singleLine" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        TrackTitleArtist,
        {
          mode: "singleLine",
          title: track.title,
          artistLabel: trackArtistLabel,
          titleFontSize,
          artistFontSize,
          mutedColor: theme.colors.foregroundMuted,
          fitContent: !isCompact && coverHidden,
          titleStyle: [
            styles7.headline,
            styles7.headlineSingleLineMarquee,
            isCompact && coverHidden ? styles7.headlineCompactInline : null,
            !isCompact ? styles7.headlineDesktopCollapsed : null
          ],
          titleTestID: "music-track-title",
          animationPaused: !paneVisible
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        TrackTitleArtist,
        {
          mode: "stacked",
          title: track.title,
          artistLabel: trackArtistLabel,
          titleFontSize,
          artistFontSize,
          mutedColor: theme.colors.foregroundMuted,
          titleStyle: [styles7.headline, styles7.headlineUnderCover, styles7.headlineUnderCoverLarge],
          artistStyle: [styles7.artistMuted, styles7.artistMutedUnderCoverLarge],
          titleTestID: "music-track-title",
          artistTestID: "music-track-artist",
          animationPaused: !paneVisible
        }
      )
    }
  );
  const playerIdentitySurface = coverHidden ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [
        styles7.titleRow,
        isCompact ? styles7.titleRowCompactInline : null,
        !isCompact ? styles7.titleRowDesktopCollapsed : null
      ],
      testID: "music-track-title-hit",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          TrackCoverButton,
          {
            size: "inline",
            displayUri: coverDisplayUri,
            sourceUriForVideoCheck: track.coverUri ?? coverDisplayUri,
            isWeb,
            isCompact,
            accessibilityLabel: "\u663E\u793A\u5C01\u9762",
            onPress: toggleCoverHidden,
            onLongPress: () => {
              void handleReplaceCover();
            },
            testID: "music-title-inline-cover"
          }
        ),
        titleArtistHit("singleLine")
      ]
    }
  ) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [styles7.playerIdentityHero, isCompact ? styles7.playerIdentityHeroCompact : null],
      testID: "music-track-identity-hero",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          TrackCoverButton,
          {
            size: "hero",
            displayUri: coverDisplayUri,
            sourceUriForVideoCheck: track.coverUri ?? coverDisplayUri,
            isWeb,
            isCompact,
            accessibilityLabel: "\u9690\u85CF\u5C01\u9762",
            onPress: toggleCoverHidden,
            onLongPress: () => {
              void handleReplaceCover();
            },
            testID: "music-cover-toggle"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.View,
          {
            style: [
              styles7.metaColumn,
              isCompact ? styles7.metaColumnCompact : null,
              styles7.titleRowUnderCover
            ],
            children: titleArtistHit("stacked")
          }
        )
      ]
    }
  );
  const playerIdentity = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_native9.View,
    {
      style: [
        styles7.metaColumn,
        isCompact ? styles7.metaColumnCompact : null,
        isCompact && coverHidden ? styles7.metaColumnCompactInline : null,
        !isCompact && coverHidden ? styles7.metaColumnDesktopCollapsed : null
      ],
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        ActionOverflowMenu,
        {
          items: identityMenuItems,
          surface: playerIdentitySurface,
          showTrigger: false,
          side: "bottom",
          align: "start",
          showEditLayout: true,
          editLayoutLabel: "\u7F16\u8F91\u5E03\u5C40",
          onEditLayout: handleOpenEditLayout,
          testID: "music-track-title-overflow",
          renderHoverSidePanel: renderOverflowHoverSidePanel,
          onSelect: handleOverflowMenuSelect
        }
      )
    }
  );
  const transportIdentitySurface = /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [
        styles7.transportIdentityRow,
        isCompact && inSearch ? styles7.transportIdentityRowCompact : null,
        !isCompact && inSearch ? styles7.transportIdentityRowDesktop : null
      ],
      testID: "music-transport-title-hit",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          TrackCoverButton,
          {
            size: "transport",
            displayUri: coverDisplayUri,
            sourceUriForVideoCheck: track.coverUri ?? coverDisplayUri,
            isWeb,
            isCompact,
            accessibilityLabel: "\u8FD4\u56DE\u64AD\u653E\u5668",
            onPress: handleBackToPlayer,
            onLongPress: () => {
              void handleReplaceCover();
            },
            testID: "music-transport-cover-hit"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: "\u8FD4\u56DE\u64AD\u653E\u5668",
            onPress: handleBackToPlayer,
            style: [
              styles7.miniMeta,
              isCompact && inSearch ? styles7.miniMetaCompactSearch : null,
              !isCompact && inSearch ? styles7.miniMetaDesktopSearch : null
            ],
            children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              TrackTitleArtist,
              {
                mode: "singleLine",
                title: track.title,
                artistLabel: trackArtistLabel,
                titleFontSize,
                artistFontSize,
                mutedColor: theme.colors.foregroundMuted,
                fitContent: !isCompact && inSearch,
                titleStyle: [
                  styles7.headline,
                  styles7.headlineSingleLineMarquee,
                  isCompact && inSearch ? styles7.headlineCompactInline : null,
                  !isCompact && inSearch ? styles7.headlineDesktopCollapsed : null
                ],
                titleTestID: "music-transport-title",
                animationPaused: !paneVisible
              }
            )
          }
        )
      ]
    }
  );
  const miniNowPlaying = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    import_react_native9.View,
    {
      style: [
        styles7.miniNowPlaying,
        !isCompact && inSearch ? styles7.miniNowPlayingDesktopSearch : null,
        isCompact && inSearch ? styles7.miniNowPlayingCompactSearch : null
      ],
      testID: "music-transport-cover",
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        ActionBar,
        {
          layout: actionLayout,
          actions: actionContributions,
          surface: transportIdentitySurface,
          surfaceLayout: "row",
          hideBar: true,
          distribute: "end",
          iconSize: actionIconSize,
          mutedColor: mutedIcon,
          accentColor: accent,
          testID: "music-transport-actions",
          overflowMenu: {
            side: "top",
            align: "end",
            triggerSize: actionIconSize,
            triggerColor: mutedIcon,
            moreLabel: controlTitles.more ?? "\u66F4\u591A",
            showEditLayout: true,
            editLayoutLabel: "\u7F16\u8F91\u5E03\u5C40",
            onEditLayout: handleOpenEditLayout,
            testID: "music-action-overflow",
            renderHoverSidePanel: renderOverflowHoverSidePanel
          }
        }
      )
    }
  );
  const lyricsBlock = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    MusicLyricsKaraokeBlock,
    {
      lyricUnits,
      progressLines: lyricProgressLines,
      lyricsDensity,
      isCompact,
      inSearch,
      accent,
      lyricsScrollRef,
      lyricLineOffsetRef,
      lyricsUserBrowsing,
      lyricSelectedIndex,
      setLyricSelectedIndex,
      setLyricHoveredIndex,
      lyricHoveredIndex,
      markLyricsUserBrowsing,
      onLyricLinePress: handleLyricLinePress,
      playing,
      useCssKaraoke: isWeb,
      paneVisible,
      lyricsFollowEpoch,
      preferInstantLyricScrollRef,
      followTopInsetPx: LYRIC_FOLLOW_TOP_INSET_PX,
      beginProgrammaticLyricsScroll,
      onClearBrowseTimer: () => {
        if (lyricsBrowseTimerRef.current) {
          clearTimeout(lyricsBrowseTimerRef.current);
          lyricsBrowseTimerRef.current = null;
        }
        setLyricsUserBrowsing(false);
      }
    }
  );
  const hideCompactCollapsedBar = isCompact && coverHidden;
  const actionRail = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    ActionBar,
    {
      layout: actionLayout,
      actions: actionContributions,
      hideBar: hideCompactCollapsedBar,
      distribute: isCompact && !coverHidden ? "even" : isCompact ? "start" : "end",
      iconSize: actionIconSize,
      mutedColor: mutedIcon,
      accentColor: accent,
      testID: "music-action",
      overflowMenu: {
        side: "top",
        align: "end",
        triggerSize: actionIconSize,
        triggerColor: mutedIcon,
        moreLabel: controlTitles.more ?? "\u66F4\u591A",
        showEditLayout: true,
        editLayoutLabel: "\u7F16\u8F91\u5E03\u5C40",
        onEditLayout: handleOpenEditLayout,
        testID: "music-action-overflow",
        renderHoverSidePanel: renderOverflowHoverSidePanel
      }
    }
  );
  const seekRow = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MusicSeekProgress, { duration, children: (seekProgress, seekTime) => {
    const useInlineVolume = isCompact && transportSliderMode === "volume";
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.transportTimes, testID: "music-transport-slider-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.timeText, children: useInlineVolume ? "\u97F3\u91CF" : formatClock(seekTime) }),
      useInlineVolume ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.inlineVolumeBar, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        VolumeBar,
        {
          value: effectiveVolume,
          onChange: handleVolumeChange,
          wide: true,
          testID: "music-volume-inline-bar"
        }
      ) }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        SeekBar,
        {
          progress: seekProgress,
          buffered: seekBuffered,
          onSeekRatio: handleSeekRatio,
          testID: "music-seek-bar",
          previewMode: desktopVolumeHoverEnabled ? "desktop-hover" : isCompact ? "compact-tap" : "none",
          previewVisible: seekPreview.visible,
          previewRatio: seekPreview.ratio,
          previewLabel: duration > 0 ? formatClock(
            (seekPreview.visible ? seekPreview.ratio : seekProgress) * duration
          ) : null,
          onPreviewChange: handleSeekPreviewChange
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.Text, { style: styles7.timeText, children: useInlineVolume ? `${Math.round(effectiveVolume * 100)}%` : formatClock(duration) }),
      isCompact ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        IconHit,
        {
          label: transportSliderMode === "progress" ? muted ? "\u53D6\u6D88\u9759\u97F3" : "\u97F3\u91CF" : "\u8FDB\u5EA6",
          tipLabel: transportSliderMode === "progress" ? stripShortcutSuffix(
            controlTitles["action:volume"] ?? (muted ? "\u53D6\u6D88\u9759\u97F3" : "\u97F3\u91CF")
          ) : "\u5207\u6362\u56DE\u64AD\u653E\u8FDB\u5EA6",
          shortcutKeys: transportSliderMode === "progress" ? resolveControlShortcutKeys("action:volume") : void 0,
          onPress: () => {
            if (transportSliderMode === "progress" && muted) {
              setMuted(false);
            }
            setTransportSliderMode((mode) => mode === "progress" ? "volume" : "progress");
          },
          testID: "music-slider-mode-toggle",
          children: transportSliderMode === "progress" ? muted || volume <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.VolumeX, { size: 18, color: mutedIcon }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Volume2, { size: 18, color: mutedIcon }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Timer, { size: 18, color: accent })
        }
      ) : null
    ] });
  } });
  const searchEdgeSeek = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MusicSeekProgress, { duration, children: (progressValue) => {
    const useInlineVolume = isCompact && transportSliderMode === "volume";
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.searchEdgeSeekRow, testID: "music-search-edge-seek", children: useInlineVolume ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      VolumeBar,
      {
        value: effectiveVolume,
        onChange: handleVolumeChange,
        variant: "edge",
        testID: "music-search-volume-bar"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      SeekBar,
      {
        progress: progressValue,
        buffered: seekBuffered,
        onSeekRatio: handleSeekRatio,
        variant: "edge",
        testID: "music-seek-bar-edge",
        previewMode: desktopVolumeHoverEnabled ? "desktop-hover" : isCompact ? "compact-tap" : "none",
        previewVisible: seekPreview.visible,
        previewRatio: seekPreview.ratio,
        previewLabel: duration > 0 ? formatClock(
          (seekPreview.visible ? seekPreview.ratio : progressValue) * duration
        ) : null,
        onPreviewChange: handleSeekPreviewChange
      }
    ) });
  } });
  const compactTransportVolumeControl = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    IconHit,
    {
      label: transportSliderMode === "progress" ? muted ? "\u53D6\u6D88\u9759\u97F3" : "\u97F3\u91CF" : "\u8FDB\u5EA6",
      tipLabel: transportSliderMode === "progress" ? stripShortcutSuffix(controlTitles["action:volume"] ?? (muted ? "\u53D6\u6D88\u9759\u97F3" : "\u97F3\u91CF")) : "\u5207\u6362\u56DE\u64AD\u653E\u8FDB\u5EA6",
      shortcutKeys: transportSliderMode === "progress" ? resolveControlShortcutKeys("action:volume") : void 0,
      onPress: () => {
        if (transportSliderMode === "progress" && muted) {
          setMuted(false);
        }
        setTransportSliderMode((mode) => mode === "progress" ? "volume" : "progress");
      },
      testID: "music-search-volume-toggle",
      children: transportSliderMode === "progress" ? muted || volume <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.VolumeX, { size: 20, color: mutedIcon }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Volume2, { size: 20, color: mutedIcon }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Timer, { size: 20, color: accent })
    }
  );
  const desktopTransportVolumeControl = /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [styles7.volumeSlot, desktopVolumeHoverOpen ? styles7.volumeSlotRaised : null],
      testID: "music-desktop-volume-slot",
      ...isWeb ? {
        onMouseEnter: openDesktopVolumeHover,
        onMouseLeave: scheduleCloseDesktopVolumeHover
      } : null,
      children: [
        desktopVolumeHoverOpen ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.View,
          {
            style: [styles7.volumePopover, styles7.volumePopoverDesktop],
            testID: "music-desktop-volume-popover",
            children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              VolumeBar,
              {
                value: volume,
                onChange: handleVolumeChange,
                vertical: true,
                testID: "music-desktop-volume-bar"
              }
            )
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          IconHit,
          {
            label: muted || volume <= 0 ? "\u53D6\u6D88\u9759\u97F3" : "\u9759\u97F3",
            tipLabel: stripShortcutSuffix(
              controlTitles["action:volume"] ?? (muted || volume <= 0 ? "\u53D6\u6D88\u9759\u97F3" : "\u9759\u97F3")
            ),
            tipEnabled: !desktopVolumeHoverOpen,
            shortcutKeys: resolveControlShortcutKeys("action:volume"),
            onPress: handleToggleMute,
            testID: "music-desktop-volume-toggle",
            children: muted || volume <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.VolumeX, { size: 16, color: mutedIcon }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Volume2, { size: 16, color: mutedIcon })
          }
        )
      ]
    }
  );
  const transportSideIconSize = isCompact ? 20 : 16;
  const transportControlContext = {
    IconHit,
    controlTitles,
    stripShortcutSuffix,
    resolveControlShortcutKeys
  };
  const transportModeControl = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    TransportModeControl,
    {
      ...transportControlContext,
      playMode,
      playModeLabel,
      ModeIcon,
      accentColor: accent,
      iconSize: transportSideIconSize,
      onCycleMode: handleCycleMode
    }
  );
  const transportQueueControl = /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    TransportQueueControl,
    {
      ...transportControlContext,
      queueOpen,
      accentColor: accent,
      mutedIconColor: mutedIcon,
      iconSize: transportSideIconSize,
      onToggleQueue: handleToggleQueue
    }
  );
  const transportRight = /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: [styles7.transportSideRight, inSearch ? styles7.transportSideRightSearch : null], children: [
    !isCompact ? desktopTransportVolumeControl : inSearch && showShellVolume ? compactTransportVolumeControl : null,
    transportModeControl,
    transportQueueControl
  ] });
  const renderPlaybackCluster = (opts) => {
    const skipSize = opts.density === "compact" ? 22 : 20;
    const playSize = opts.density === "compact" ? 24 : 22;
    const testIds = opts.density === "search" ? {
      prev: "music-search-transport-prev",
      play: "music-search-transport-play",
      next: "music-search-transport-next"
    } : {
      prev: "music-prev",
      play: "music-play-toggle",
      next: "music-next"
    };
    const playLabel = (() => {
      if (streamResolving) {
        return "\u52A0\u8F7D\u4E2D";
      }
      return playing ? "\u6682\u505C" : "\u64AD\u653E";
    })();
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      import_react_native9.View,
      {
        style: [styles7.transportCenter, opts.containerStyle],
        pointerEvents: "box-none",
        testID: opts.containerTestID,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            IconHit,
            {
              label: "\u4E0A\u4E00\u9996",
              tipLabel: stripShortcutSuffix(controlTitles["transport:prev"] ?? "\u4E0A\u4E00\u9996"),
              shortcutKeys: resolveControlShortcutKeys("transport:prev"),
              onPress: handlePrev,
              testID: testIds.prev,
              children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                import_lucide_react_native8.SkipBack,
                {
                  size: skipSize,
                  color: theme.colors.foreground,
                  fill: theme.colors.foreground
                }
              )
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            IconHit,
            {
              label: playLabel,
              tipLabel: stripShortcutSuffix(controlTitles["transport:play"] ?? playLabel),
              shortcutKeys: resolveControlShortcutKeys("transport:play"),
              onPress: handlePlayPress,
              variant: "play",
              testID: testIds.play,
              children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.playButton, children: streamResolving ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.ActivityIndicator, { size: "small", color: theme.colors.background }) : playing ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                import_lucide_react_native8.Pause,
                {
                  size: playSize,
                  color: theme.colors.background,
                  fill: theme.colors.background
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                import_lucide_react_native8.Play,
                {
                  size: playSize,
                  color: theme.colors.background,
                  fill: theme.colors.background
                }
              ) })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            IconHit,
            {
              label: "\u4E0B\u4E00\u9996",
              tipLabel: stripShortcutSuffix(controlTitles["transport:next"] ?? "\u4E0B\u4E00\u9996"),
              shortcutKeys: resolveControlShortcutKeys("transport:next"),
              onPress: handleNext,
              testID: testIds.next,
              children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                import_lucide_react_native8.SkipForward,
                {
                  size: skipSize,
                  color: theme.colors.foreground,
                  fill: theme.colors.foreground
                }
              )
            }
          )
        ]
      }
    );
  };
  const searchCenterShowPlayback = streamResolving || searchCenterControlsOpen;
  const searchDesktopCenter = /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.searchDesktopCenter, testID: "music-search-transport-center", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      import_react_native9.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: searchCenterShowPlayback ? "\u663E\u793A\u6B4C\u8BCD" : "\u663E\u793A\u64AD\u653E\u63A7\u5236",
        onPress: () => {
          if (streamResolving) {
            return;
          }
          setSearchCenterControlsOpen((open) => !open);
        },
        style: styles7.searchDesktopCenterDismiss,
        testID: "music-search-transport-center-dismiss"
      }
    ),
    searchCenterShowPlayback ? renderPlaybackCluster({
      density: "search",
      containerStyle: styles7.searchDesktopCenterControlsRow,
      containerTestID: "music-search-transport-controls"
    }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      MusicSearchTransportLyrics,
      {
        lyricUnits,
        progressLines: lyricProgressLines,
        onShowControls: () => setSearchCenterControlsOpen(true),
        useCssKaraoke: isWeb,
        litColor: theme.colors.accent,
        pendingColor: theme.colors.foregroundMuted,
        primaryFontSize: Number(theme.fontSize.base) || 16,
        primaryLineHeight: 22,
        secondaryFontSize: Number(theme.fontSize.sm) || 14,
        secondaryLineHeight: 18,
        fontWeight: theme.fontWeight.semibold,
        stackStyle: styles7.searchDesktopLyricStack,
        stripStyle: styles7.searchDesktopLyricStrip,
        primaryTextStyle: styles7.searchDesktopLyricText,
        secondaryTextStyle: styles7.searchDesktopLyricTextSecondary
      }
    )
  ] });
  const searchTransport = /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [
        styles7.transport,
        styles7.transportNoDivider,
        isCompact ? styles7.transportCompact : null,
        styles7.transportSearch,
        compactFloatingOverlayVisible ? styles7.floatingChromeAbove : null
      ],
      testID: "workspace-mini-app-music-transport",
      children: [
        searchEdgeSeek,
        isCompact ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: [styles7.transportControls, styles7.transportControlsSearchCompact], children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.View,
          {
            style: [
              styles7.transportSide,
              styles7.transportSideSearch,
              styles7.transportSideSearchCompact
            ],
            children: miniNowPlaying
          }
        ) }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: [styles7.transportControls, styles7.transportControlsSearchDesktop], children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.searchTransportLeft, children: miniNowPlaying }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.searchTransportCenter, children: searchDesktopCenter }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.searchTransportRight, children: transportRight })
        ] })
      ]
    }
  );
  const transport = inSearch ? searchTransport : isCompact ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [
        styles7.transport,
        styles7.transportNoDivider,
        styles7.transportCompact,
        compactFloatingOverlayVisible ? styles7.floatingChromeAbove : null
      ],
      testID: "workspace-mini-app-music-transport",
      children: [
        !coverHidden ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.compactActionRailBottom, testID: "music-compact-action-rail-bottom", children: actionRail }) : null,
        seekRow,
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.compactControls, children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            TransportModeControl,
            {
              ...transportControlContext,
              playMode,
              playModeLabel,
              ModeIcon,
              accentColor: accent,
              iconSize: 20,
              onCycleMode: handleCycleMode
            }
          ),
          renderPlaybackCluster({ density: "compact" }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            TransportQueueControl,
            {
              ...transportControlContext,
              queueOpen,
              accentColor: accent,
              mutedIconColor: mutedIcon,
              iconSize: 20,
              onToggleQueue: handleToggleQueue
            }
          )
        ] })
      ]
    }
  ) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [styles7.transport, styles7.transportNoDivider],
      testID: "workspace-mini-app-music-transport",
      children: [
        seekRow,
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.transportControls, children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.transportSide, children: actionRail }),
          renderPlaybackCluster({ density: "desktop" }),
          transportRight
        ] })
      ]
    }
  );
  const playerStageNode = isCompact ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.compactStage, pointerEvents: inSearch ? "none" : "auto", children: [
    coverHidden ? null : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.compactUnderCoverMeta, children: playerIdentity }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.compactLyricsRow, testID: "workspace-mini-app-music-compact-lyrics", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.compactLyricsMain, children: lyricsBlock }) }),
    coverHidden ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.compactDock, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_react_native9.View, { style: styles7.compactDockRow, children: [
      playerIdentity,
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.actionRailCompactInline, children: actionRail })
    ] }) }) : null
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [styles7.stage, styles7.stageDesktop],
      pointerEvents: inSearch ? "none" : "auto",
      onLayout: handleDesktopStageLayout,
      children: [
        coverHidden ? null : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.View,
          {
            style: [
              styles7.heroColumn,
              {
                width: desktopStageSplit.coverWidthPx,
                minWidth: desktopStageSplit.coverWidthPx,
                maxWidth: desktopStageSplit.coverWidthPx,
                flexGrow: 0,
                flexShrink: 0
              }
            ],
            testID: "music-desktop-hero-column",
            children: playerIdentity
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
          import_react_native9.View,
          {
            style: [
              styles7.lyricsColumn,
              coverHidden ? styles7.lyricsColumnExpanded : null,
              coverHidden ? { flex: 1 } : {
                width: desktopStageSplit.lyricsWidthPx,
                minWidth: desktopStageSplit.lyricsWidthPx,
                maxWidth: desktopStageSplit.lyricsWidthPx,
                flexGrow: 0,
                flexShrink: 0
              }
            ],
            testID: "workspace-mini-app-music-desktop-lyrics",
            children: [
              coverHidden ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.desktopExpandedMeta, children: playerIdentity }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.lyricsRow, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.lyricsMain, children: lyricsBlock }) })
            ]
          }
        )
      ]
    }
  );
  const topLeadingChrome = !inSearch && showShellSearch ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.topLeadingChrome, pointerEvents: "box-none", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    IconHit,
    {
      label: "\u641C\u7D22",
      tipLabel: stripShortcutSuffix(
        controlTitles.search ?? controlTitles["action:search"] ?? "\u641C\u7D22"
      ),
      shortcutKeys: resolveControlShortcutKeys("action:search") ?? resolveControlShortcutKeys("search"),
      onPress: handleOpenSearch,
      testID: "music-top-search-toggle",
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react_native8.Search, { size: 20, color: theme.colors.foreground })
    }
  ) }) : null;
  const topTrailingChrome = !inSearch ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.topTrailingChrome, pointerEvents: "box-none", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    IconHit,
    {
      label: "\u6062\u590D\u6EDA\u52A8",
      tipLabel: "\u6062\u590D\u6EDA\u52A8",
      shortcutKeys: resolveControlShortcutKeys("lyrics:resumeFollow"),
      onPress: handleResumeLyricsFollow,
      testID: "music-lyrics-follow-fab",
      children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        import_lucide_react_native8.LocateFixed,
        {
          size: 20,
          color: lyricsUserBrowsing ? MUSIC_LYRICS_FOLLOW_ACTIVE_COLOR : theme.colors.foregroundMuted
        }
      )
    }
  ) }) : null;
  const searchSurfaceNode = inSearch ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.searchSurface, testID: "music-search-drawer", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    MusicSearchView,
    {
      onBack: handleBackToPlayer,
      onPlayLocalTrack: handleSearchPlayLocal,
      onSelectTrackHit: handleSearchSelectTrackHit,
      onPlayAllTrackHits: handleSearchPlayAllTrackHits,
      onEnqueueTrackHits: handleSearchEnqueueTrackHits,
      onPlayNextTrackHit: handleSearchPlayNextTrackHit,
      onEnqueueTrackHit: handleSearchEnqueueTrackHit,
      onSaveTrackHit: handleSearchSaveTrackHit
    }
  ) }) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    import_react_native9.View,
    {
      style: [
        styles7.root,
        isCompact ? styles7.rootCompact : null,
        inSearch ? styles7.rootSearch : null
      ],
      testID: "workspace-mini-app-music-player",
      children: [
        topLeadingChrome,
        topTrailingChrome,
        compactFloatingOverlayVisible ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          import_react_native9.Pressable,
          {
            accessibilityRole: "button",
            accessibilityLabel: "\u5173\u95ED\u6D6E\u5C42",
            onPress: dismissFloatingControls,
            style: styles7.floatingDismissOverlay
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.playerBody, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_react_native9.View, { style: styles7.playerBodyForeground, children: inSearch ? searchSurfaceNode : playerStageNode }) }),
        transport,
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          MusicQueueDrawer,
          {
            open: queueOpen,
            compact: isCompact,
            tracks: queueTracks,
            activeId: track.id,
            playModeLabel: playModeLabel(playMode),
            ModeIcon,
            onClose: () => setQueueOpen(false),
            onCyclePlayMode: handleCycleMode,
            onSelect: handleQueueSelect,
            onRemove: handleQueueRemove,
            onMove: handleQueueMove,
            onTrackMenuAction: handleTrackMenuAction
          }
        )
      ]
    }
  );
}
var styles7 = import_react_native_unistyles7.StyleSheet.create((theme) => ({
  searchDrawer: {
    flex: 1,
    minHeight: 0,
    width: "100%"
  },
  searchSurface: {
    flex: 1,
    minHeight: 0,
    width: "100%"
  },
  playerBody: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    // 吃掉中间全部高度，把 transport 顶到真底部
    width: "100%"
  },
  playerBodyForeground: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    zIndex: 1
  },
  topLeadingChrome: {
    // 浮层：不参与布局、不占一整行；叠在封面/歌词左上
    position: "absolute",
    top: theme.spacing[1],
    left: theme.spacing[2],
    zIndex: 30,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  /** 与 topLeadingChrome（搜索）左右对称；zIndex 须低于 MusicQueueDrawer，否则压住列表循环钮 */
  topTrailingChrome: {
    position: "absolute",
    top: theme.spacing[1],
    right: theme.spacing[2],
    zIndex: 30,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  compactUnderCoverMeta: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: theme.spacing[3],
    marginTop: 2,
    marginBottom: 2,
    flexGrow: 0,
    flexShrink: 0
  },
  /** @deprecated 名称保留：大封面操作组改贴底部，见 compactActionRailBottom */
  compactActionRailCentered: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0
  },
  /** 移动端大封面：操作组在底部 transport 内、进度条上方；全宽均匀分布 */
  compactActionRailBottom: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginTop: 0,
    marginBottom: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: theme.spacing[1]
  },
  titleSingleLineRowCompactUnderCover: {
    // 移动大封面：占满可用宽，歌名 marquee 才能溢出滚动
    width: "100%",
    maxWidth: 360,
    flexGrow: 0,
    flexShrink: 1,
    justifyContent: "center"
  },
  headlineCompactUnderCoverSingle: {
    textAlign: "left",
    fontSize: theme.fontSize.lg,
    lineHeight: 24
  },
  artistMutedInlineCompactUnderCover: {
    maxWidth: "36%",
    flexShrink: 0
  },
  titleTextColumn: {
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    alignSelf: "stretch",
    // stretch：marquee 必须拿到列宽；center 会 shrink-wrap 导致测不到溢出
    alignItems: "stretch",
    overflow: "hidden",
    gap: 2
  },
  titleSingleLineRow: {
    // 必须有确定宽度上限，MarqueeText 才能测到溢出并滚动
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "nowrap",
    gap: 10
  },
  titleSingleLineRowDesktop: {
    // 短文案随内容收窄以便整组居中；长文案封顶后走 marquee
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 360,
    width: "auto"
  },
  titleSingleLineRowCompact: {
    // 移动小封面：标题行左起吃满，右侧操作组
    flex: 1,
    minWidth: 0,
    maxWidth: "100%"
  },
  /** 单行歌名：吃满剩余宽，溢出走 marquee（勿再 fitContent shrink-wrap） */
  headlineSingleLineMarquee: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: "auto",
    maxWidth: "100%",
    textAlign: "left"
  },
  titleRowUnderCover: {
    justifyContent: "center",
    width: "100%"
  },
  headlineUnderCover: {
    textAlign: "center",
    width: "100%"
  },
  headlineUnderCoverLarge: {
    // 大封面：歌名更大，居中可滚
    textAlign: "center",
    width: "100%",
    lineHeight: 32
  },
  artistMuted: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    textAlign: "center"
  },
  artistMutedUnderCoverLarge: {
    width: "100%",
    textAlign: "center",
    lineHeight: 24
  },
  artistMutedInlineOnLine: {
    flexShrink: 0,
    flexGrow: 0,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    maxWidth: "38%"
  },
  artistMutedInlineOnLineDesktop: {
    // 歌名与艺人间距：gap 之外再加一点左内边距，视觉更疏
    marginLeft: 2,
    maxWidth: 180
  },
  inlineVolumeBar: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center"
  },
  compactControlsLeading: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "42%",
    alignItems: "flex-start",
    justifyContent: "center"
  },
  compactControlsCenter: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2]
  },
  root: {
    flex: 1,
    position: "relative",
    paddingTop: theme.spacing[4],
    // 播放器底栏与窗体边缘留 8px，避免控件贴底
    paddingBottom: 8,
    // 左右留白由歌词区自行 paddingHorizontal，不再用两侧 gutter 触控条
    paddingLeft: 0,
    paddingRight: 0,
    gap: theme.spacing[3],
    // 透明：让宿主氛围 wash / pane 画布底色透出；沉浸染色否则被不透明 background 盖死。
    backgroundColor: "transparent",
    overflow: "hidden"
  },
  /** 搜索面去掉根节点上 padding；底边仍留 8px，与普通播放器一致 */
  rootSearch: {
    paddingTop: 0,
    paddingBottom: 8,
    gap: 0
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground
  },
  emptyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    marginTop: theme.spacing[4]
  },
  emptySearchHit: {
    marginTop: 0,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.22)"
    // 氛围壳 inset；禁止 Theme surface2 灰岛
  },
  emptySearchText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.medium
  },
  miniNowPlaying: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    minWidth: 0,
    maxWidth: 360,
    flexGrow: 1,
    flexShrink: 1,
    alignSelf: "center"
  },
  transportIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0
  },
  transportIdentityRowDesktop: {
    flexGrow: 0,
    flexShrink: 0
  },
  transportIdentityRowCompact: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%"
  },
  miniNowPlayingDesktopSearch: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: "none",
    width: "auto",
    alignSelf: "center"
  },
  miniNowPlayingCompactSearch: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%",
    width: "100%",
    alignSelf: "stretch"
  },
  miniCoverHit: {
    flexGrow: 0,
    flexShrink: 0
  },
  miniNowPlayingMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 200
  },
  miniNowPlayingMainDesktopSearch: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 220
  },
  miniNowPlayingMainCompactSearch: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%"
  },
  miniCover: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.22)",
    // 氛围壳 inset；禁止 Theme surface2 灰岛
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden",
    position: "relative"
  },
  miniCoverImage: {
    width: "100%",
    height: "100%"
  },
  miniCoverGlyph: {
    fontSize: 16,
    color: theme.colors.foregroundMuted
  },
  miniCoverLoading: {
    ...import_react_native9.StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)"
  },
  miniMeta: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 180,
    justifyContent: "center",
    gap: 2
  },
  miniMetaDesktopSearch: {
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: 200
  },
  miniMetaCompactSearch: {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: "100%"
  },
  miniTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.foreground
  },
  miniArtist: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted
  },
  compactScroll: {
    flex: 1,
    minHeight: 0
  },
  compactScrollContent: {
    alignItems: "center",
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[2]
  },
  compactStage: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing[1],
    // 搜索绝对浮层，不占整行；内容顶对齐，底部 chrome 由 root 的 transport 钉死
    paddingTop: 0
  },
  compactLyricsRow: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: theme.spacing[4]
  },
  compactLyricsMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 0
  },
  compactDock: {
    width: "100%",
    maxWidth: 420,
    alignItems: "stretch",
    gap: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: theme.spacing[2]
  },
  compactDockRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
    minWidth: 0,
    minHeight: 44
  },
  actionRailCompactInline: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "center"
  },
  rootCompact: {
    gap: 0,
    paddingTop: 0,
    paddingBottom: theme.spacing[1],
    paddingLeft: 0,
    justifyContent: "flex-start"
  },
  transportCompact: {
    gap: theme.spacing[1],
    paddingTop: theme.spacing[1],
    paddingBottom: theme.spacing[1],
    borderTopWidth: 0,
    flexGrow: 0,
    flexShrink: 0
  },
  transportNoDivider: {
    borderTopWidth: 0,
    borderTopColor: "transparent"
  },
  transportSearch: {
    // 与播放器底栏控制行同高感：保留一点顶 padding，中区 minHeight 56
    paddingTop: theme.spacing[1],
    gap: theme.spacing[1]
  },
  searchEdgeSeekRow: {
    width: "100%",
    marginRight: -theme.spacing[4],
    paddingRight: theme.spacing[4],
    marginTop: 0
  },
  transportSideSearch: {
    flex: 1,
    maxWidth: "100%"
  },
  transportSideSearchDesktop: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "58%",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3]
  },
  transportSideSearchCompact: {
    flex: 1,
    maxWidth: "100%"
  },
  transportControlsSearchDesktop: {
    alignItems: "center",
    minHeight: 56,
    width: "100%"
  },
  transportControlsSearchCompact: {
    width: "100%"
  },
  /** 左：封面+标题+三点（三点紧贴标题，不留大空白） */
  searchTransportLeft: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing[1]
  },
  /** 中：剩余空间；歌词在此区域内水平居中 */
  searchTransportCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[3]
  },
  /** 右：模式+队列，右对齐 */
  searchTransportRight: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing[1]
  },
  searchDesktopLyricStrip: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    zIndex: 1,
    overflow: "hidden",
    paddingHorizontal: theme.spacing[2]
  },
  searchDesktopLyricStack: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 1
  },
  searchDesktopLyricCentered: {
    textAlign: "center",
    width: "100%"
  },
  searchDesktopLyricWord: {
    // Web：禁止单词内断行；RN Text 嵌套时以词为换行单元
    flexShrink: 0,
    ...{ whiteSpace: "nowrap" }
  },
  searchDesktopCenter: {
    position: "relative",
    width: "100%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  searchDesktopCenterDismiss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  },
  searchDesktopCenterControlsRow: {
    zIndex: 1,
    overflow: "visible"
  },
  searchDesktopLyricText: {
    textAlign: "center",
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.foreground
  },
  searchDesktopLyricTextSecondary: {
    textAlign: "center",
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.foregroundMuted
  },
  searchDesktopLyricCharLit: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold
  },
  searchDesktopLyricCharPending: {
    color: theme.colors.foreground,
    opacity: 0.38
  },
  floatingChromeAbove: {
    zIndex: 6
  },
  titleInlineCover: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.22)",
    // 氛围壳 inset；禁止 Theme surface2 灰岛
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0
  },
  titleInlineCoverDesktop: {
    width: 28,
    height: 28,
    borderRadius: 6
  },
  titleInlineCoverImage: {
    width: "100%",
    height: "100%"
  },
  titleInlineCoverGlyph: {
    fontSize: 14,
    color: theme.colors.foregroundMuted
  },
  titleInlineCoverGlyphDesktop: {
    fontSize: 12
  },
  metaColumnDesktopCollapsed: {
    alignItems: "center",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center"
  },
  titleRowDesktopCollapsed: {
    // 桌面收起：整组（小封面+歌名艺人）shrink-wrap 后居中；间距约半个字
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    minHeight: 28,
    paddingVertical: 0,
    width: "auto",
    maxWidth: "90%",
    alignSelf: "center",
    flexGrow: 0
  },
  headlineDesktopCollapsed: {
    textAlign: "left",
    fontSize: 24,
    lineHeight: 30
  },
  compactMiniRow: {
    width: "100%",
    alignItems: "flex-start"
  },
  stage: {
    flex: 1,
    minHeight: 0,
    gap: theme.spacing[4]
  },
  stageDesktop: {
    flexDirection: "row",
    alignItems: "stretch"
  },
  heroColumn: {
    gap: theme.spacing[3],
    justifyContent: "center",
    // 裁切交给标题 marquee 视口；列本身 hidden 会在测宽失败时「静默截断」
    overflow: "visible",
    // 左缘留白：与歌词区右缘呼吸感对称；勿贴死播放器左边界
    paddingLeft: theme.spacing[4],
    paddingRight: theme.spacing[2]
  },
  heroColumnCompact: {
    alignItems: "stretch"
  },
  lyricsColumn: {
    minWidth: 0,
    borderLeftWidth: import_react_native9.StyleSheet.hairlineWidth,
    borderLeftColor: theme.colors.border,
    paddingLeft: theme.spacing[2],
    paddingRight: theme.spacing[2]
  },
  lyricsColumnExpanded: {
    flex: 1,
    borderLeftWidth: 0,
    paddingLeft: 0
  },
  lyricsRow: {
    flex: 1,
    minHeight: 0,
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: theme.spacing[4]
  },
  lyricsMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 0
  },
  desktopExpandedMeta: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    marginBottom: theme.spacing[2],
    flexGrow: 0,
    flexShrink: 0
  },
  cover: {
    width: 280,
    height: 280,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    alignSelf: "center",
    flexGrow: 0,
    flexShrink: 0
  },
  coverDesktop: {
    width: 280,
    height: 280,
    alignSelf: "center"
  },
  coverCompact: {
    width: 120,
    height: 120,
    marginTop: theme.spacing[1],
    flexGrow: 0,
    flexShrink: 0
  },
  coverArt: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: theme.borderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.22)",
    // 氛围壳 inset；禁止 Theme surface2 灰岛
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  coverImage: {
    ...import_react_native9.StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%"
  },
  coverGlyph: {
    fontSize: 48,
    color: theme.colors.foregroundMuted
  },
  metaColumn: {
    gap: theme.spacing[1],
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    alignItems: "stretch",
    overflow: "hidden"
  },
  playerIdentityHero: {
    width: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    alignItems: "center",
    overflow: "hidden",
    gap: theme.spacing[2]
  },
  playerIdentityHeroCompact: {
    gap: theme.spacing[1],
    alignItems: "center"
  },
  metaColumnCompact: {
    maxWidth: 420,
    width: "100%",
    alignItems: "center"
  },
  metaColumnCompactInline: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
    alignItems: "flex-start",
    alignSelf: "center",
    justifyContent: "center",
    // 与右侧 40px 图标行同一垂直中线，避免标题视觉偏上
    minHeight: 44
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    width: "100%",
    minWidth: 0,
    flexWrap: "nowrap",
    overflow: "visible",
    paddingVertical: 2
  },
  titleRowCompactInline: {
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    maxWidth: "100%",
    minHeight: 44,
    height: 44,
    paddingVertical: 0
  },
  headline: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    width: "100%",
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    textAlign: "center",
    lineHeight: 28
  },
  headlineCompact: {
    textAlign: "center",
    fontSize: theme.fontSize["2xl"],
    lineHeight: 36
  },
  headlineCompactInline: {
    // 勿加 maxWidth：否则 dock 单行歌名被掐死，Marquee 测不到溢出 / 可视区过窄
    textAlign: "left",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: theme.fontWeight.semibold
  },
  artist: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted
  },
  artistCompact: {
    textAlign: "center"
  },
  lyricsFadeHost: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    overflow: "hidden"
  },
  lyricsPane: {
    flex: 1,
    minHeight: 0
  },
  lyricsContent: {
    flexGrow: 1,
    paddingTop: LYRIC_LIST_TOP_LEAD_PX,
    paddingBottom: LYRIC_LIST_BOTTOM_LEAD_PX,
    paddingHorizontal: 0,
    gap: 0,
    alignItems: "stretch",
    justifyContent: "flex-start"
  },
  lyricsContentRelaxed: {
    gap: theme.spacing[3]
  },
  lyricsContentCompact: {
    paddingTop: LYRIC_LIST_TOP_LEAD_PX,
    paddingBottom: LYRIC_LIST_BOTTOM_LEAD_PX,
    paddingHorizontal: 0,
    gap: 0
  },
  lyricsContentCompactRelaxed: {
    gap: theme.spacing[2]
  },
  lyricsContentSearchTransport: {
    paddingTop: Math.round(LYRIC_LIST_TOP_LEAD_PX * 0.75),
    paddingBottom: Math.round(LYRIC_LIST_BOTTOM_LEAD_PX * 0.75),
    gap: 0,
    justifyContent: "flex-start"
  },
  lyricsContentSearchTransportRelaxed: {
    gap: theme.spacing[1]
  },
  lyricsEmptyWrap: {
    flexGrow: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[8]
  },
  lyricsEmpty: {
    fontSize: theme.fontSize.base,
    color: theme.colors.foregroundMuted,
    textAlign: "center"
  },
  lyricLine: {
    width: "100%",
    fontSize: theme.fontSize.lg,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 32
  },
  lyricLineHit: {
    position: "relative",
    width: "100%",
    alignSelf: "stretch",
    paddingVertical: theme.spacing[2],
    // 仅留一点给时间/播放钮，高亮框尽量拉满横向
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    // 预留边框占位，避免点选绿框时行高跳动
    borderWidth: 1,
    borderColor: "transparent"
  },
  lyricLineHitBilingual: {
    gap: 2,
    paddingVertical: theme.spacing[1.5]
  },
  lyricLineBilingualSecondary: {
    fontSize: theme.fontSize.base,
    lineHeight: 24,
    opacity: 0.78
  },
  lyricLineHitCompact: {
    paddingHorizontal: theme.spacing[2]
  },
  lyricLineHitSearchTransport: {
    paddingVertical: 4,
    paddingHorizontal: theme.spacing[2]
  },
  lyricLineHovered: {
    backgroundColor: "rgba(0,0,0,0.22)"
    // 氛围壳 inset；禁止 Theme surface2 灰岛
  },
  lyricLineSelected: {
    backgroundColor: "rgba(0,0,0,0.22)",
    // 氛围壳 inset；禁止 Theme surface2 灰岛
    borderColor: theme.colors.accent
  },
  lyricSelectPlay: {
    position: "absolute",
    right: theme.spacing[1],
    top: "50%",
    marginTop: -14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  lyricSelectTime: {
    position: "absolute",
    left: theme.spacing[1],
    top: "50%",
    marginTop: -8,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.foregroundMuted
  },
  lyricActive: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.bold,
    fontSize: theme.fontSize["2xl"],
    lineHeight: 40,
    letterSpacing: 0.3
  },
  lyricActiveBilingualSecondary: {
    fontSize: theme.fontSize.lg,
    lineHeight: 28,
    letterSpacing: 0.15,
    opacity: 1
  },
  lyricLineSearchTransport: {
    fontSize: theme.fontSize.sm,
    lineHeight: 22
  },
  lyricActiveSearchTransport: {
    fontSize: theme.fontSize.base,
    lineHeight: 24
  },
  lyricCharLit: {
    color: theme.colors.accent,
    fontWeight: theme.fontWeight.bold
  },
  lyricCharPending: {
    color: theme.colors.foreground,
    opacity: 0.38
  },
  actionRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexWrap: "nowrap"
  },
  actionRailCompact: {
    // dock 右对齐时保持 auto；大封面底栏在 compactActionRailBottom 内再拉满宽
    width: "auto",
    maxWidth: "100%",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    marginTop: 0,
    gap: theme.spacing[1],
    flexWrap: "nowrap"
  },
  actionRailCompactEven: {
    width: "100%",
    maxWidth: "100%",
    justifyContent: "space-evenly",
    gap: 0
  },
  transport: {
    // 进度条与控制行贴紧，不要大块水平空白
    gap: 0,
    paddingTop: theme.spacing[2],
    paddingLeft: theme.spacing[4],
    paddingRight: theme.spacing[4],
    borderTopWidth: 0,
    borderTopColor: "transparent"
  },
  transportTimes: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2]
  },
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2]
  },
  compactControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    gap: 0,
    width: "100%",
    paddingHorizontal: theme.spacing[1],
    minHeight: 56
  },
  transportControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2]
  },
  transportSide: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing[2]
  },
  transportSideDivider: {
    width: import_react_native9.StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: theme.spacing[1],
    backgroundColor: "rgba(255,255,255,0.18)",
    flexGrow: 0,
    flexShrink: 0
  },
  transportSideRight: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing[1],
    flexWrap: "nowrap"
  },
  transportSideRightSearch: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "center"
  },
  transportCenter: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    minHeight: 56,
    overflow: "visible"
  },
  volumeSlot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6
  },
  volumeSlotRaised: {
    zIndex: 8
  },
  menuVolumePanel: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.28)",
    // 氛围壳更深 inset；禁止 Theme surface1 灰岛
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    minWidth: 132,
    alignSelf: "center"
  },
  volumePopover: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(0,0,0,0.22)",
    // 氛围壳 inset；禁止 Theme surface2 灰岛
    borderWidth: import_react_native9.StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    zIndex: 7
  },
  volumePopoverCompact: {
    left: "50%",
    bottom: 44,
    width: 44,
    marginLeft: -22
  },
  volumePopoverDesktop: {
    left: "50%",
    bottom: 40,
    width: 40,
    marginLeft: -20
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.foreground,
    alignItems: "center",
    justifyContent: "center"
  },
  iconHitWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4
  },
  iconHitWrapPlay: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    overflow: "visible"
  },
  iconHit: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  iconHitPlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  iconHitLabeled: {
    width: "auto",
    minWidth: 40,
    paddingHorizontal: theme.spacing[2],
    flexDirection: "row",
    // 图标与文案约半个字
    gap: 7
  },
  iconHitLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    maxWidth: 88
  },
  iconHitDisabled: {
    opacity: 0.4
  },
  floatingDismissOverlay: {
    ...import_react_native9.StyleSheet.absoluteFillObject,
    zIndex: 5
  },
  chipText: {
    fontSize: 11,
    color: theme.colors.foregroundMuted
  },
  progressHit: {
    flex: 1,
    height: 28,
    justifyContent: "center",
    position: "relative"
  },
  progressHitEdge: {
    flex: 1,
    height: 16,
    justifyContent: "center"
  },
  progressTooltip: {
    position: "absolute",
    top: -30,
    minWidth: 44,
    marginLeft: -22,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.22)",
    // 氛围壳 inset；禁止 Theme surface2 灰岛
    borderWidth: import_react_native9.StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3
  },
  progressTooltipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foreground
  },
  progressTrack: {
    position: "relative",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden"
  },
  progressTrackEdge: {
    // 与非搜索进度条同厚（4），仅保留 edge：无拇指、顶缘铺满
    height: 4,
    borderRadius: 2
  },
  progressBuffered: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    // 勿用 muted：多数主题下与 border 几乎同色，缓冲带会「看不见」
    backgroundColor: theme.colors.foregroundMuted,
    borderRadius: 2,
    opacity: 0.45
  },
  progressBufferedEdge: {
    height: 4,
    borderRadius: 2
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
    zIndex: 1
  },
  progressFillEdge: {
    height: 4,
    borderRadius: 2
  },
  progressThumb: {
    position: "absolute",
    top: 9,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: theme.colors.foreground
  },
  volumeHit: {
    width: 72,
    flexGrow: 0,
    flexShrink: 0,
    height: 28,
    justifyContent: "center"
  },
  // inlineVolumeBar 内拉满，与进度条同宽手感
  volumeHitVertical: {
    width: 28,
    height: 112,
    alignItems: "center",
    justifyContent: "center"
  },
  volumeTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 2,
    overflow: "hidden"
  },
  volumeFill: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.55)"
  },
  /** 叠在 progressFill 几何上时只覆盖颜色，不改高度/定位 */
  volumeFillColor: {
    backgroundColor: "rgba(255,255,255,0.55)"
  },
  volumeTrackVertical: {
    width: 4,
    flex: 1,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 2,
    overflow: "hidden",
    justifyContent: "flex-end"
  },
  volumeFillVertical: {
    width: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
    alignSelf: "stretch"
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.foregroundMuted,
    minWidth: 40
  },
  meta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted
  },
  overflowBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[4]
  },
  overflowSheet: {
    width: "100%",
    maxWidth: 320,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.28)",
    // 氛围壳更深 inset；禁止 Theme surface1 灰岛
    paddingVertical: theme.spacing[2],
    zIndex: 2
  },
  overflowEmpty: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted
  },
  overflowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3]
  },
  overflowLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground
  }
}));
function openMusicPlayerTab(track, context, options) {
  if (track) {
    const state = useMusicDemoStore.getState();
    state.setNowPlaying(track.id);
    if (shouldRequestAutoPlayOnOpenPlayer({
      explicitAutoPlay: options?.autoPlay,
      wantsPlaying: state.wantsPlaying
    })) {
      requestTrackAutoPlay(track.id);
    } else {
      clearPendingTrackAutoPlay();
    }
  }
  return host().openMiniAppTab({
    appId: MUSIC_APP_ID,
    panelId: MUSIC_PANEL_ID,
    entityId: MUSIC_PLAYER_ENTITY_ID,
    serverId: context?.serverId,
    workspaceId: context?.workspaceId,
    currentPathname: context?.currentPathname
  });
}
async function uploadAndOpenTracks(context) {
  const sources = await host().files.pickAndImport({
    title: "\u4E0A\u4F20\u97F3\u4E50",
    multiple: true,
    extensions: ["mp3", "m4a", "aac", "wav", "flac", "ogg", "opus", "webm"],
    accept: "audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,.webm",
    filterLabel: "\u97F3\u9891",
    appId: MUSIC_APP_ID
  });
  if (sources.length === 0) {
    return [];
  }
  const created = useMusicDemoStore.getState().importTracksFromSources(
    sources.map((source) => ({
      title: source.title,
      sourceUri: source.uri,
      kind: source.origin === "remote" ? "cloud" : "local"
    }))
  );
  const first = created[0];
  if (first) {
    openMusicPlayerTab(first, context, { autoPlay: true });
  }
  return created;
}
function getEntityTitle(entityId) {
  const state = useMusicDemoStore.getState();
  const id = entityId === MUSIC_PLAYER_ENTITY_ID ? state.nowPlayingId : entityId;
  if (!id) {
    return null;
  }
  return state.tracks.find((track) => track.id === id)?.title?.trim() || null;
}
function subscribeEntityTitle(entityId, listener) {
  void entityId;
  return useMusicDemoStore.subscribe(listener);
}
function registerMusicApp(nextHost) {
  setMusicHostApi(nextHost);
  setMusicSidecarFetchJson(
    async (url, init) => nextHost.http.fetchJson(url, {
      method: init?.method,
      headers: init?.headers,
      body: init?.body,
      timeoutMs: init?.timeoutMs ?? 15e3
    })
  );
  setMusicHostMediaApis({
    createMediaProxyUrl: nextHost.http.createMediaProxyUrl ? (input) => nextHost.http.createMediaProxyUrl(input) : null,
    captureBrowserMedia: nextHost.browserSession?.captureMedia ? (input) => nextHost.browserSession.captureMedia(input) : null
  });
  ensureMusicColdRestoreWatch();
  nextHost.tabs.onClose((event) => {
    if (event.appId !== MUSIC_APP_ID) {
      return;
    }
    syncMusicPlaybackPositionToStore(true);
  });
  nextHost.lifecycle.onSuspend(() => {
    syncMusicPlaybackPositionToStore(true);
  });
  nextHost.lifecycle.onResume(() => {
    void maybeRestoreMusicPlaybackAfterColdStart();
  });
  startMusicPerfSelfReport(nextHost);
  void bindMusicHostStorage(nextHost.storage, nextHost.sync, nextHost.config).then(() => {
    seedMusicTrackEntityMenuLayouts(nextHost);
    seedMusicSearchMenuLayouts(nextHost);
    nextHost.background.registerSession({
      appId: MUSIC_APP_ID,
      kind: "audio",
      restore: async () => {
        await maybeRestoreMusicPlaybackAfterColdStart();
      }
    });
    void syncMusicContentBackdropToHost(nextHost);
    return void 0;
  });
  useMusicDemoStore.subscribe((state, prev) => {
    if (state.coverBackdropEnabled === prev.coverBackdropEnabled && state.coverBackdropBlur === prev.coverBackdropBlur && state.coverBackdropOpacity === prev.coverBackdropOpacity && state.coverBackdropIncludeTabBar === prev.coverBackdropIncludeTabBar && state.nowPlayingId === prev.nowPlayingId) {
      return;
    }
    void syncMusicContentBackdropToHost(nextHost);
  });
  registerMusicListContributions(nextHost);
  registerMusicPlayerShortcuts(nextHost);
  startMusicUiSmokeWatcher(nextHost);
  nextHost.registerListItemOpenPreparer(MUSIC_APP_ID, (itemId) => {
    requestTrackAutoPlay(itemId);
    useMusicDemoStore.getState().setNowPlaying(itemId);
  });
  nextHost.registerMiniApp({
    id: MUSIC_PANEL_ID,
    appId: MUSIC_APP_ID,
    title: "\u64AD\u653E\u5668",
    icon: MusicTabIcon,
    component: MusicPlayerContent,
    getEntityTitle,
    subscribeEntityTitle,
    isPanelBootReady: getMusicHostHydrationCompleted,
    subscribePanelBootReady: subscribeMusicHostHydration
  });
  const runSidebarTrackMenu = (action, itemId) => {
    void runMusicTrackMenuAction({
      hostApi: host(),
      action,
      trackId: itemId
    });
  };
  for (const actionId of MUSIC_SIDEBAR_TRACK_MENU_IDS) {
    nextHost.registerItemMenu({
      id: MUSIC_TRACK_MENU_CONTRIBUTION_IDS[actionId],
      appId: MUSIC_APP_ID,
      segmentId: MUSIC_SEGMENT_ID,
      label: MUSIC_TRACK_MENU_ACTION_LABELS[actionId],
      icon: MUSIC_TRACK_MENU_ICONS[actionId],
      shortcutKeys: MUSIC_TRACK_MENU_SHORTCUT_KEYS[actionId],
      shortcutSourceKey: MUSIC_TRACK_MENU_SHORTCUT_SOURCE_KEYS[actionId],
      resolveLabel: actionId === "pin" ? (item) => item.pinned ? "\u53D6\u6D88\u7F6E\u9876" : "\u7F6E\u9876" : void 0,
      resolveIcon: actionId === "pin" ? (item) => resolveMusicTrackMenuIcon("pin", Boolean(item.pinned)) : void 0,
      run: (item) => {
        runSidebarTrackMenu(actionId, item.id);
      }
    });
  }
  nextHost.registerShortcut({
    id: "view-music",
    appId: MUSIC_APP_ID,
    actionId: "workspace.app.view.music",
    helpId: "sidebar-wechat-view-music",
    label: "\u5207\u6362\u5230\u97F3\u4E50\u4E3B\u89C6\u56FE",
    sectionId: "music",
    sectionTitle: "\u97F3\u4E50",
    macCombo: "Cmd+6",
    nonMacCombo: "Ctrl+6",
    helpKeys: ["mod", "6"],
    run: () => {
      host().requestPrimaryView(MUSIC_SEGMENT_ID);
    }
  });
  const MUSIC_ON_OFF_OPTIONS = [
    { value: "on", label: "\u5F00" },
    { value: "off", label: "\u5173" }
  ];
  nextHost.ui.registerDetailSheetExtras({
    appId: MUSIC_APP_ID,
    surface: "config",
    buildRows: () => {
      const state = useMusicDemoStore.getState();
      const store = useMusicDemoStore.getState;
      return [
        {
          label: "\u6C89\u6D78\u6A21\u5F0F",
          value: state.atmospherePushEnabled ? "\u5F00" : "\u5173",
          helpText: "\u5F00\u542F\u540E\u6309\u5F53\u524D\u5C01\u9762\u4E3B\u8272\u67D3\u8272\u6574\u7A97\uFF1B\u5173\u95ED\u5219\u6E05\u9664\u672C App \u63A8\u9001\u7684\u6C1B\u56F4\u8272\u3002",
          control: {
            type: "segmented",
            options: [...MUSIC_ON_OFF_OPTIONS],
            value: state.atmospherePushEnabled ? "on" : "off",
            testID: "music-detail-immersion",
            onValueChange: (next) => {
              if (next === "on") {
                store().setAtmospherePushEnabled(true);
                return;
              }
              store().setAtmospherePushEnabled(false);
              try {
                host().ui.clearAtmosphere(MUSIC_APP_ID);
              } catch {
              }
            }
          }
        },
        {
          label: "\u5C01\u9762\u80CC\u666F",
          value: state.coverBackdropEnabled ? "\u5F00" : "\u5173",
          helpText: "\u5F00\u542F\u540E\u5728\u5DE5\u4F5C\u533A\u4E2D\u95F4\u533A\u94FA\u5F53\u524D\u5C01\u9762\u6726\u80E7\u80CC\u666F\uFF08\u5207\u5230\u5176\u5B83 Tab \u4ECD\u7C98\u6EDE\uFF09\uFF1B\u4E0E\u6C89\u6D78\u6A21\u5F0F\uFF08\u6574\u7A97\u53D6\u8272\uFF09\u72EC\u7ACB\u3002",
          control: {
            type: "segmented",
            options: [...MUSIC_ON_OFF_OPTIONS],
            value: state.coverBackdropEnabled ? "on" : "off",
            testID: "music-detail-cover-backdrop",
            onValueChange: (next) => {
              store().setCoverBackdropEnabled(next === "on");
            }
          }
        },
        {
          label: "\u80CC\u666F\u6A21\u7CCA",
          value: String(state.coverBackdropBlur),
          helpText: "\u5C01\u9762\u6726\u80E7\u6A21\u7CCA\u534A\u5F84\uFF080\u201324\uFF09\u3002\u8D8A\u5927\u8D8A\u7CCA\uFF1B0 \u63A5\u8FD1\u6E05\u6670\u5E95\u56FE\u3002",
          valueContent: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MusicCoverBackdropBlurDetailField, {})
        },
        {
          label: "\u80CC\u666F\u900F\u660E\u5EA6",
          value: `${Math.round(state.coverBackdropOpacity * 100)}%`,
          helpText: "\u5C01\u9762\u56FE\u53EF\u89C1\u5EA6\u3002\u8D8A\u5927\u5C01\u9762\u8D8A\u6E05\u6670\uFF1B\u8D8A\u5C0F\u5219\u66F4\u504F\u6697\u7F69\u3001\u5229\u4E8E\u8BFB\u5B57\u3002",
          valueContent: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MusicCoverBackdropOpacityDetailField, {})
        },
        {
          label: "Tab \u4E00\u4F53",
          value: state.coverBackdropIncludeTabBar ? "\u5F00" : "\u5173",
          helpText: "\u5F00\u542F\u540E\u5DE5\u4F5C\u533A Tab \u6761\u534A\u900F\u6DF1\u7F69\u5E76\u900F\u51FA\u540C\u4E00\u5C01\u9762\uFF08\u6BD4\u5185\u5BB9\u533A\u7565\u6DF1\u3001\u66F4\u597D\u626B\u8BFB\uFF09\uFF1B\u5173\u95ED\u5219 Tab \u6761\u4FDD\u6301\u5B9E\u5E95\u3002",
          control: {
            type: "segmented",
            options: [...MUSIC_ON_OFF_OPTIONS],
            value: state.coverBackdropIncludeTabBar ? "on" : "off",
            testID: "music-detail-cover-backdrop-tab-bar",
            onValueChange: (next) => {
              store().setCoverBackdropIncludeTabBar(next === "on");
            }
          }
        },
        {
          label: "\u641C\u7D22\u7F13\u5B58",
          value: `${state.searchCacheTtlMinutes} \u5206\u949F`,
          helpText: "\u540C\u4E00\u5173\u952E\u8BCD\u5728\u6B64\u65F6\u95F4\u5185\u518D\u6B21\u641C\u7D22\u8D70\u672C\u5730\u7ED3\u679C\uFF1B\u8D85\u65F6\u624D\u91CD\u65B0\u6253\u7F51\u3002\u4E0D\u4F1A\u5B9A\u65F6\u6E05\u7A7A\u7F13\u5B58\uFF0C\u4E5F\u4E0D\u4F1A\u5220\u9664\u641C\u7D22\u5386\u53F2\u3002\u6539\u5B8C\u70B9\u300C\u4FDD\u5B58\u300D\u3002",
          valueContent: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MusicSearchCacheTtlDetailField, {})
        },
        {
          label: "\u6B4C\u8BCD\u884C\u8DDD",
          value: state.lyricsDensity === "relaxed" ? "\u5BBD\u677E" : "\u7D27\u51D1",
          helpText: "\u70B9\u300C\u7D27\u51D1/\u5BBD\u677E\u300D\u5207\u6362\uFF1B\u7D27\u51D1\u4EC5\u884C\u5185 padding\uFF0C\u5BBD\u677E\u6062\u590D\u884C\u95F4 gap\u3002",
          control: {
            type: "segmented",
            options: [
              { value: "compact", label: "\u7D27\u51D1" },
              { value: "relaxed", label: "\u5BBD\u677E" }
            ],
            value: state.lyricsDensity === "relaxed" ? "relaxed" : "compact",
            testID: "music-detail-lyrics-density",
            onValueChange: (next) => {
              store().setLyricsDensity(next === "relaxed" ? "relaxed" : "compact");
            }
          }
        }
      ];
    }
  });
  let musicPublicDetailDataRoot = "\u2014";
  const registerMusicPublicDetailExtras = () => {
    nextHost.ui.registerDetailSheetExtras({
      appId: MUSIC_APP_ID,
      surface: "public",
      buildRows: (context) => buildMusicTrackPublicDetailExtraRows({
        hostApi: host(),
        context,
        dataRoot: musicPublicDetailDataRoot
      })
    });
  };
  registerMusicPublicDetailExtras();
  void (async () => {
    try {
      const root = await nextHost.storage.getDataRoot(MUSIC_APP_ID);
      const next = root.trim() || "\u2014";
      if (next === musicPublicDetailDataRoot) {
        return;
      }
      musicPublicDetailDataRoot = next;
      registerMusicPublicDetailExtras();
    } catch {
    }
  })();
  useMusicDemoStore.subscribe((state, prev) => {
    if (state.nowPlayingId === prev.nowPlayingId) {
      return;
    }
    registerMusicPublicDetailExtras();
  });
  nextHost.registerCommand({
    id: MUSIC_OPEN_PLAYER_COMMAND_ID,
    appId: MUSIC_APP_ID,
    title: "\u82AC\u8FBE\u97F3\u4E50",
    keywords: ["music", "player", "\u64AD\u653E\u5668", "\u97F3\u4E50", "\u6253\u5F00\u64AD\u653E\u5668", "\u82AC\u8FBE", "\u82AC\u8FBE\u97F3\u4E50"],
    icon: MusicTabIcon,
    shortcutHelpId: "music-open-player",
    sidebarAction: {
      defaultVisible: true,
      label: "\u82AC\u8FBE\u97F3\u4E50",
      order: 40
    },
    run: (context) => {
      const state = useMusicDemoStore.getState();
      const playing = (state.nowPlayingId ? state.getTrack(state.nowPlayingId) : void 0) ?? state.tracks[0] ?? null;
      openMusicPlayerTab(playing, context);
    }
  });
  nextHost.registerShortcut({
    id: "open-music-player",
    appId: MUSIC_APP_ID,
    actionId: "workspace.app.music.open-player",
    helpId: "music-open-player",
    label: "\u82AC\u8FBE\u97F3\u4E50",
    sectionId: "music",
    sectionTitle: "\u97F3\u4E50",
    macCombo: "Cmd+Shift+M",
    nonMacCombo: "Ctrl+Shift+M",
    helpKeys: ["mod", "shift", "M"],
    run: (context) => {
      const state = useMusicDemoStore.getState();
      const playing = (state.nowPlayingId ? state.getTrack(state.nowPlayingId) : void 0) ?? state.tracks[0] ?? null;
      openMusicPlayerTab(playing, context);
    }
  });
}

// src/agent-tools.ts
init_music_ids();

// src/agent-play-query.ts
init_store();
init_playback_runtime();
function normalizeQuery(raw) {
  return typeof raw === "string" ? raw.trim() : "";
}
var QUERY_NOISE_RE = /(?:帮我|给我|请|一首|首歌|歌曲|音乐|曲目|相关|风格|类型|类似|那种|的歌|播放|播一下|播首|听听|想听|来首|来一首)/g;
var LATIN_STOPWORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "for",
  "from",
  "give",
  "gonna",
  "got",
  "have",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "music",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "play",
  "playing",
  "related",
  "song",
  "songs",
  "the",
  "to",
  "track",
  "up",
  "wanna",
  "with",
  "you",
  "your"
]);
var LOCAL_MATCH_MIN_SCORE = 24;
function hasCjk(text) {
  return /[\u4e00-\u9fff]/.test(text);
}
function isSignificantToken(token) {
  if (token.length < 2) return false;
  if (hasCjk(token)) {
    return token.length >= 2;
  }
  if (LATIN_STOPWORDS.has(token)) return false;
  return token.length >= 4;
}
function extractQueryTokens(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const tokens = /* @__PURE__ */ new Set();
  tokens.add(q);
  for (const part of q.split(/[\s,，、/+\-_|]+/)) {
    if (part.length >= 2) tokens.add(part);
  }
  const cleaned = q.replace(QUERY_NOISE_RE, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length >= 2) {
    tokens.add(cleaned);
    for (const part of cleaned.split(/[\s,，、/+\-_|]+/)) {
      if (part.length >= 2) tokens.add(part);
    }
  }
  const cjkChunks = `${q} ${cleaned}`.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  for (const chunk of cjkChunks) {
    const deNoised = chunk.replace(QUERY_NOISE_RE, "").trim();
    if (deNoised.length >= 2) tokens.add(deNoised);
    if (chunk.length >= 2) tokens.add(chunk.slice(0, 2));
    if (deNoised.length >= 4) tokens.add(deNoised.slice(0, 4));
  }
  return [...tokens].filter((token) => token.length >= 2);
}
function scoreFieldMatch(field, query, tokens) {
  let score = 0;
  if (!field) return 0;
  if (field === query) score += 100;
  else if (isSignificantToken(query) && field.includes(query)) score += 50;
  for (const token of tokens) {
    if (token === query) continue;
    if (!isSignificantToken(token)) continue;
    if (field === token) score += 28;
    else if (field.includes(token)) {
      score += hasCjk(token) ? 28 : 16;
    }
  }
  return score;
}
function significantTokenCoverage(fields, tokens) {
  const unique = [...new Set(tokens.filter(isSignificantToken))];
  if (unique.length === 0) return { hit: 0, total: 0 };
  let hit = 0;
  for (const token of unique) {
    if (fields.some((field) => field.includes(token))) hit += 1;
  }
  return { hit, total: unique.length };
}
function scoreLocalTrack(track, query) {
  const q = query.toLowerCase();
  const title = track.title.toLowerCase();
  const artist = (track.artist || "").toLowerCase();
  const album = (track.album || "").toLowerCase();
  const tokens = extractQueryTokens(q);
  let score = 0;
  score += scoreFieldMatch(title, q, tokens);
  score += Math.floor(scoreFieldMatch(artist, q, tokens) * 0.6);
  score += Math.floor(scoreFieldMatch(album, q, tokens) * 0.3);
  const coverage = significantTokenCoverage([title, artist, album], tokens);
  if (coverage.total >= 2 && coverage.hit === 0) {
    return 0;
  }
  if (coverage.total >= 3 && coverage.hit / coverage.total < 0.34) {
    score = Math.min(score, 10);
  }
  if (score > 0 && isMusicTrackDownloadedLocally(track)) score += 5;
  return score;
}
function findBestLocalTrack(query) {
  const text = query.trim();
  if (!text) return null;
  const items = listTracksAsWorkspaceItems(text);
  const store = useMusicDemoStore.getState();
  let best = null;
  for (const item of items) {
    const track = store.getTrack(item.id);
    if (!track) continue;
    const score = scoreLocalTrack(track, text);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { track, score };
    }
  }
  if (!best) {
    for (const track of store.tracks) {
      const score = scoreLocalTrack(track, text);
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { track, score };
      }
    }
  }
  return best && best.score >= LOCAL_MATCH_MIN_SCORE ? best.track : null;
}
function scoreOnlineHit(hit, query) {
  const q = query.toLowerCase();
  const title = hit.title.toLowerCase();
  const artist = (hit.artist || "").toLowerCase();
  const tokens = extractQueryTokens(q);
  let score = 0;
  score += scoreFieldMatch(title, q, tokens);
  score += Math.floor(scoreFieldMatch(artist, q, tokens) * 0.5);
  if (hit.localTrackId) score += 40;
  if (hit.playableUrl?.trim()) score += 15;
  if (hit.ref.providerId === "local") score += 20;
  return score;
}
function pickBestOnlineHit(hits, query) {
  const scored = [];
  for (const hit of hits) {
    if (hit.kind !== "track") continue;
    const score = scoreOnlineHit(hit, query);
    if (score < 12) continue;
    scored.push({ hit, score });
  }
  if (scored.length === 0) return null;
  const localLinked = scored.filter((entry) => Boolean(entry.hit.localTrackId));
  const pool = localLinked.length > 0 ? localLinked : scored;
  pool.sort((a, b) => b.score - a.score);
  return pool[0]?.hit ?? null;
}
async function playTrackById(trackId) {
  ensureMusicPlaybackRuntime();
  const store = useMusicDemoStore.getState();
  const track = store.getTrack(trackId);
  if (!track) {
    return { ok: false, audioPaused: null, error: `Unknown trackId: ${trackId}` };
  }
  store.setNowPlaying(trackId);
  const uri = track.sourceUri?.trim() || "";
  if (uri) {
    const started = await loadAndPlayTrackUriHeadless({
      trackId,
      sourceUri: uri
    });
    const audioPaused = started ? false : null;
    if (started) {
      return { ok: true, audioPaused };
    }
  }
  const applied = await applyMusicPlaybackIntent(true);
  return { ok: true, audioPaused: applied.audioPaused };
}
var ONLINE_SEARCH_TIMEOUT_MS = 12e3;
async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function buildLocalHitPlayResult(query, hit, trackId, played) {
  const track = useMusicDemoStore.getState().getTrack(trackId);
  return {
    ok: played.ok,
    query,
    source: "local",
    phase: played.ok ? "playing" : "error",
    trackId,
    title: track?.title ?? hit.title,
    artist: track?.artist ?? hit.artist,
    downloaded: track ? isMusicTrackDownloadedLocally(track) : false,
    audioPaused: played.audioPaused,
    message: played.ok ? `\u6B63\u5728\u64AD\u653E\u672C\u5730\u66F2\u76EE\uFF1A${track?.title ?? hit.title}` : played.error || "\u64AD\u653E\u5931\u8D25",
    error: played.ok ? void 0 : played.error || "play_failed"
  };
}
async function tryDownloadTrack(host2, trackId, playableUrl) {
  try {
    await downloadAndPersistTrackBundle(host2, trackId, {
      playableUrl: playableUrl ?? null
    });
    return { downloaded: true };
  } catch (error) {
    return {
      downloaded: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function buildOnlinePlayResult(input) {
  const { query, hit, trackId, downloaded, played, downloadError } = input;
  const latest = useMusicDemoStore.getState().getTrack(trackId);
  const title = latest?.title ?? hit.title;
  const artist = latest?.artist ?? hit.artist;
  if (!played.ok) {
    if (downloadError && !downloaded) {
      return {
        ok: false,
        query,
        source: "online",
        phase: "error",
        trackId,
        title: hit.title,
        artist: hit.artist,
        message: `\u5DF2\u641C\u7D22\u5230\u300C${hit.title}\u300D\u4F46\u4E0B\u8F7D/\u64AD\u653E\u5931\u8D25\uFF1A${downloadError}`,
        error: downloadError
      };
    }
    return {
      ok: false,
      query,
      source: "online",
      phase: downloaded ? "downloaded" : "searched_online",
      trackId,
      title,
      artist,
      downloaded,
      message: played.error || "\u64AD\u653E\u5931\u8D25",
      error: played.error || "play_failed"
    };
  }
  let message = downloaded ? `\u5DF2\u641C\u7D22\u3001\u4E0B\u8F7D\u5E76\u64AD\u653E\uFF1A${title} \u2013 ${artist}` : `\u5DF2\u641C\u7D22\u5E76\u64AD\u653E\uFF1A${title} \u2013 ${artist}`;
  if (downloadError && !downloaded) {
    message = `\u5DF2\u641C\u7D22\u5E76\u64AD\u653E\uFF08\u843D\u76D8\u5931\u8D25\uFF1A${downloadError}\uFF09\uFF1A${title}`;
  }
  return {
    ok: true,
    query,
    source: "online",
    phase: "playing",
    trackId,
    title,
    artist,
    downloaded,
    audioPaused: played.audioPaused,
    message
  };
}
async function playOnlineHit(input) {
  const { host: host2, query, hit, download: shouldDownload } = input;
  if (hit.localTrackId) {
    const played2 = await playTrackById(hit.localTrackId);
    return buildLocalHitPlayResult(query, hit, hit.localTrackId, played2);
  }
  const upserted = useMusicDemoStore.getState().upsertTrackFromSearchHit(hit);
  let downloaded = false;
  let downloadError;
  if (shouldDownload) {
    const result = await tryDownloadTrack(host2, upserted.id, hit.playableUrl);
    downloaded = result.downloaded;
    downloadError = result.error;
  }
  const played = await playTrackById(upserted.id);
  return buildOnlinePlayResult({
    query,
    hit,
    trackId: upserted.id,
    downloaded,
    played,
    downloadError
  });
}
async function playMusicByQuery(input) {
  const query = normalizeQuery(input.query);
  if (!query) {
    return {
      ok: false,
      query: "",
      source: "unknown",
      phase: "error",
      message: "query \u4E0D\u80FD\u4E3A\u7A7A",
      error: "empty_query"
    };
  }
  const local = findBestLocalTrack(query);
  if (local) {
    const played = await playTrackById(local.id);
    if (!played.ok) {
      return {
        ok: false,
        query,
        source: "local",
        phase: "error",
        trackId: local.id,
        title: local.title,
        artist: local.artist,
        message: played.error || "\u672C\u5730\u66F2\u76EE\u64AD\u653E\u5931\u8D25",
        error: played.error || "play_failed"
      };
    }
    return {
      ok: true,
      query,
      source: "local",
      phase: "playing",
      trackId: local.id,
      title: local.title,
      artist: local.artist,
      downloaded: isMusicTrackDownloadedLocally(local),
      audioPaused: played.audioPaused,
      message: `\u6B63\u5728\u64AD\u653E\u672C\u5730\u66F2\u76EE\uFF1A${local.title} \u2013 ${local.artist || "\u672A\u77E5\u827A\u4EBA"}`,
      scorer: "v2-stopwords"
    };
  }
  if (input.preferLocalOnly) {
    return {
      ok: false,
      query,
      source: "local",
      phase: "error",
      message: `\u672C\u5730\u66F2\u5E93\u672A\u627E\u5230\u4E0E\u300C${query}\u300D\u76F8\u5173\u7684\u6B4C\u66F2`,
      error: "local_not_found",
      scorer: "v2-stopwords"
    };
  }
  let page;
  try {
    const providerIds = input.providerIds && input.providerIds.length > 0 ? input.providerIds : useMusicDemoStore.getState().searchProviderIds.slice();
    page = await withTimeout(
      searchPlayableMusic({
        text: query,
        scope: "track",
        limit: 12,
        page: 1,
        providerIds
      }),
      ONLINE_SEARCH_TIMEOUT_MS,
      `\u5728\u7EBF\u641C\u7D22\u8D85\u65F6\uFF08>${ONLINE_SEARCH_TIMEOUT_MS}ms\uFF09`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      query,
      source: "online",
      phase: "searched_online",
      message: `\u641C\u7D22\u300C${query}\u300D\u5931\u8D25\uFF1A${message}`,
      error: message.includes("\u8D85\u65F6") ? "online_search_timeout" : "online_search_failed",
      scorer: "v2-stopwords"
    };
  }
  const hit = pickBestOnlineHit(page.tracks, query);
  if (!hit) {
    return {
      ok: false,
      query,
      source: "online",
      phase: "searched_online",
      message: `\u672A\u641C\u7D22\u5230\u53EF\u64AD\u653E\u7684\u300C${query}\u300D\u76F8\u5173\u6B4C\u66F2`,
      error: "online_not_found",
      scorer: "v2-stopwords",
      candidates: page.tracks.slice(0, 5).map((item) => ({
        title: item.title,
        artist: item.artist,
        source: item.localTrackId ? "local" : "online",
        trackId: item.localTrackId,
        providerId: item.ref.providerId
      }))
    };
  }
  return playOnlineHit({
    host: input.host,
    query,
    hit,
    download: input.download !== false
  });
}

// src/agent-tools.ts
init_playback_engine();
init_playback_runtime();
init_platform_registry();
init_provider_catalog();
init_store();
var DEFAULT_LIST_LIMIT = 30;
var MAX_LIST_LIMIT = 100;
var PLAY_MODES = ["sequence", "loop-one", "shuffle"];
function asObject(raw) {
  return raw && typeof raw === "object" ? raw : {};
}
function asOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asLimit(value, fallback = DEFAULT_LIST_LIMIT, max = MAX_LIST_LIMIT) {
  const n = typeof value === "number" ? value : fallback;
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(1, Math.min(max, Math.floor(n)));
}
function asOffset(value) {
  const n = typeof value === "number" ? value : 0;
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}
function asProviderIds(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const ids = value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);
  return ids.length > 0 ? ids : void 0;
}
function resolveSearchProviderIds(explicit) {
  return asProviderIds(explicit) ?? useMusicDemoStore.getState().searchProviderIds.slice();
}
function requireConfirm(input) {
  if (input.confirm === true) {
    return null;
  }
  return {
    ok: false,
    error: "confirm_required",
    message: "Destructive action requires confirm: true"
  };
}
function resolveQueueIds() {
  const state = useMusicDemoStore.getState();
  const known = new Set(state.tracks.map((track) => track.id));
  const filtered = state.queueIds.filter((id) => known.has(id));
  if (filtered.length > 0) {
    return filtered;
  }
  return state.tracks.map((track) => track.id);
}
function summarizeTrack(track) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album ?? null,
    sourceKind: track.sourceKind,
    pinned: Boolean(track.pinned),
    liked: Boolean(track.liked),
    bookmarked: Boolean(track.bookmarked),
    downloaded: isMusicTrackDownloadedLocally(track),
    providerId: track.remoteRef?.providerId ?? null,
    remoteId: track.remoteRef?.remoteId ?? null
  };
}
function snapshotNowPlaying() {
  const state = useMusicDemoStore.getState();
  const track = state.nowPlayingId ? state.tracks.find((item) => item.id === state.nowPlayingId) ?? null : null;
  const audio = getMusicPlaybackAudio();
  const liveSec = audio && state.nowPlayingId ? Math.max(0, Math.floor(audio.currentTime || 0)) : state.playbackPositionSec;
  return {
    appId: MUSIC_APP_ID,
    nowPlayingId: state.nowPlayingId,
    wantsPlaying: state.wantsPlaying,
    playMode: state.playMode,
    volume: state.volume,
    muted: state.muted,
    playbackPositionSec: liveSec,
    track: track ? {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      sourceKind: track.sourceKind
    } : null,
    queueCount: resolveQueueIds().length
  };
}
function listLibraryTool(raw) {
  const input = asObject(raw);
  const query = asOptionalString(input.query)?.toLowerCase() ?? "";
  const pinnedOnly = input.pinnedOnly === true;
  const limit = asLimit(input.limit);
  const offset = asOffset(input.offset);
  const state = useMusicDemoStore.getState();
  const filtered = state.tracks.filter((track) => {
    if (pinnedOnly && !track.pinned) {
      return false;
    }
    if (!query) {
      return true;
    }
    const hay = `${track.title} ${track.artist} ${track.album || ""}`.toLowerCase();
    return hay.includes(query);
  });
  const page = filtered.slice(offset, offset + limit).map(summarizeTrack);
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    total: filtered.length,
    offset,
    limit,
    tracks: page
  };
}
function listQueueTool(raw) {
  const input = asObject(raw);
  const limit = asLimit(input.limit, 50);
  const offset = asOffset(input.offset);
  const state = useMusicDemoStore.getState();
  const queueIds = resolveQueueIds();
  const tracks = queueIds.map((id) => state.tracks.find((track) => track.id === id)).filter((track) => track != null).map(
    (track, index) => Object.assign(summarizeTrack(track), {
      queueIndex: index,
      isNowPlaying: track.id === state.nowPlayingId
    })
  );
  const page = tracks.slice(offset, offset + limit);
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    nowPlayingId: state.nowPlayingId,
    playMode: state.playMode,
    total: tracks.length,
    offset,
    limit,
    tracks: page
  };
}
function setPlayModeTool(raw) {
  const input = asObject(raw);
  const mode = asOptionalString(input.mode);
  if (!mode || !PLAY_MODES.includes(mode)) {
    return {
      ok: false,
      error: "invalid_mode",
      message: `mode must be one of: ${PLAY_MODES.join(", ")}`
    };
  }
  useMusicDemoStore.getState().setPlayMode(mode);
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    playMode: useMusicDemoStore.getState().playMode
  };
}
function queueOpsTool(raw) {
  const input = asObject(raw);
  const action = asOptionalString(input.action);
  const trackId = asOptionalString(input.trackId);
  const store = useMusicDemoStore.getState();
  if (action === "clear") {
    store.setQueueIds([]);
    return {
      ok: true,
      appId: MUSIC_APP_ID,
      action: "clear",
      queueCount: resolveQueueIds().length,
      queueIds: resolveQueueIds()
    };
  }
  if (action !== "add" && action !== "remove") {
    return {
      ok: false,
      error: "invalid_action",
      message: "action must be add | remove | clear"
    };
  }
  if (!trackId) {
    return { ok: false, error: "trackId_required", message: "trackId is required" };
  }
  if (action === "add") {
    const position = input.position === "next" || input.position === "end" ? input.position : "end";
    const ok2 = store.addToQueue(trackId, position);
    if (!ok2) {
      return { ok: false, error: "unknown_track", message: `Unknown trackId: ${trackId}` };
    }
    return {
      ok: true,
      appId: MUSIC_APP_ID,
      action: "add",
      trackId,
      position,
      queueCount: resolveQueueIds().length,
      queueIds: resolveQueueIds()
    };
  }
  const ok = store.removeFromQueue(trackId);
  if (!ok) {
    return {
      ok: false,
      error: "not_in_queue",
      message: `trackId not in queue: ${trackId}`
    };
  }
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    action: "remove",
    trackId,
    queueCount: resolveQueueIds().length,
    queueIds: resolveQueueIds(),
    nowPlayingId: useMusicDemoStore.getState().nowPlayingId
  };
}
function trackOpsTool(raw) {
  const input = asObject(raw);
  const action = asOptionalString(input.action);
  const trackId = asOptionalString(input.trackId);
  if (!action || action !== "pin" && action !== "unpin" && action !== "delete") {
    return {
      ok: false,
      error: "invalid_action",
      message: "action must be pin | unpin | delete"
    };
  }
  if (!trackId) {
    return { ok: false, error: "trackId_required", message: "trackId is required" };
  }
  const store = useMusicDemoStore.getState();
  const track = store.getTrack(trackId);
  if (!track) {
    return { ok: false, error: "unknown_track", message: `Unknown trackId: ${trackId}` };
  }
  if (action === "delete") {
    const denied = requireConfirm(input);
    if (denied) {
      return denied;
    }
    const deleted = store.deleteTrack(trackId);
    return {
      ok: deleted,
      appId: MUSIC_APP_ID,
      action: "delete",
      trackId,
      message: deleted ? "\u5DF2\u4ECE\u672C\u5730\u66F2\u5E93\u5220\u9664" : "\u5220\u9664\u5931\u8D25",
      nowPlayingId: useMusicDemoStore.getState().nowPlayingId
    };
  }
  if (action === "pin") {
    if (track.pinned) {
      return {
        ok: true,
        appId: MUSIC_APP_ID,
        action: "pin",
        trackId,
        pinned: true,
        changed: false
      };
    }
    const pinned2 = store.togglePinned(trackId);
    return {
      ok: pinned2 === true,
      appId: MUSIC_APP_ID,
      action: "pin",
      trackId,
      pinned: true,
      changed: true
    };
  }
  if (!track.pinned) {
    return {
      ok: true,
      appId: MUSIC_APP_ID,
      action: "unpin",
      trackId,
      pinned: false,
      changed: false
    };
  }
  const pinned = store.togglePinned(trackId);
  return {
    ok: pinned === false,
    appId: MUSIC_APP_ID,
    action: "unpin",
    trackId,
    pinned: false,
    changed: true
  };
}
function resolveTrackPlatformId(track) {
  return track.remoteRef?.providerId ?? (track.sourceKind === "local" ? "local" : "online");
}
function resolveLyricsDetailValue2(track, lyricsText) {
  if (!lyricsText) {
    return null;
  }
  return track.lyricsUri?.trim() || "\u6709\u6B4C\u8BCD\u6587\u672C";
}
function summarizeAtmospherePalette(palette) {
  if (!palette?.dark?.primary || !palette?.light?.primary) {
    return null;
  }
  return {
    dark: palette.dark,
    light: palette.light,
    coverKey: palette.coverKey,
    extractVersion: palette.extractVersion ?? null
  };
}
function buildTrackDetailPayload(track) {
  const downloaded = isMusicTrackDownloadedLocally(track);
  const lyricsText = (track.lyrics || "").trim();
  const playUrl = track.sourceUri || null;
  const isLocalSource = downloaded || track.sourceKind === "local";
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    trackId: track.id,
    // 对齐 ⌥D 详情 sheet 可读字段
    title: track.title,
    artist: track.artist || "\u672A\u77E5\u827A\u4EBA",
    album: track.album || null,
    platform: getMusicPlatformLabel(resolveTrackPlatformId(track)),
    source: isLocalSource ? "\u672C\u5730\u6587\u4EF6" : "\u5728\u7EBF\u4E91\u64AD",
    sourceKind: track.sourceKind,
    pageUrl: track.remoteRef?.pageUrl ?? null,
    playUrl,
    localFile: downloaded ? playUrl : null,
    coverUri: track.coverUri ?? null,
    lyrics: resolveLyricsDetailValue2(track, lyricsText),
    hasLyrics: Boolean(lyricsText),
    lyricsUri: track.lyricsUri ?? null,
    atmospherePalette: summarizeAtmospherePalette(track.atmospherePalette),
    pinned: Boolean(track.pinned),
    liked: Boolean(track.liked),
    bookmarked: Boolean(track.bookmarked),
    downloaded,
    remoteRef: track.remoteRef ?? null,
    updatedAt: track.updatedAt
  };
}
function getTrackDetailTool(raw) {
  const input = asObject(raw);
  const trackId = asOptionalString(input.trackId);
  if (!trackId) {
    return { ok: false, error: "trackId_required", message: "trackId is required" };
  }
  const track = useMusicDemoStore.getState().getTrack(trackId);
  if (!track) {
    return { ok: false, error: "unknown_track", message: `Unknown trackId: ${trackId}` };
  }
  return buildTrackDetailPayload(track);
}
function getAppPrefsTool() {
  const state = useMusicDemoStore.getState();
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    // Cmd+I / View details 相关可读配置
    lyricsDensity: state.lyricsDensity,
    atmospherePushEnabled: state.atmospherePushEnabled,
    coverBackdropEnabled: state.coverBackdropEnabled,
    coverBackdropBlur: state.coverBackdropBlur,
    coverBackdropOpacity: state.coverBackdropOpacity,
    coverBackdropIncludeTabBar: state.coverBackdropIncludeTabBar,
    searchCacheTtlMinutes: state.searchCacheTtlMinutes,
    searchProviderIds: state.searchProviderIds.slice(),
    playMode: state.playMode,
    volume: state.volume,
    muted: state.muted,
    coverHidden: state.coverHidden,
    compactActionRailVisible: state.compactActionRailVisible,
    playerSurface: state.playerSurface,
    wantsPlaying: state.wantsPlaying,
    nowPlayingId: state.nowPlayingId,
    queueCount: resolveQueueIds().length,
    libraryCount: state.tracks.length
  };
}
function providerTraitTags(cap) {
  if (!cap) {
    return ["unknown"];
  }
  const tags = [];
  tags.push(`search:${cap.searchMode}`);
  tags.push(`resolve:${cap.resolveMode}`);
  tags.push(`playable:${cap.playablePolicy}`);
  if (cap.isAggregator) {
    tags.push("aggregator");
  }
  if (cap.browserSearch) {
    tags.push("browser-search");
  }
  if (cap.wiredForSearch) {
    tags.push("wired-for-search");
  }
  if (cap.listCollection && cap.listCollection !== "none") {
    tags.push(`collection:${cap.listCollection}`);
  }
  return tags;
}
function listProvidersTool() {
  const selected = useMusicDemoStore.getState().searchProviderIds;
  const providers2 = listMusicProviders().map((provider) => {
    const cap = getMusicProviderCapabilities(provider.id);
    return {
      id: provider.id,
      label: provider.label,
      traits: providerTraitTags(cap),
      searchMode: cap?.searchMode ?? null,
      resolveMode: cap?.resolveMode ?? null,
      playablePolicy: cap?.playablePolicy ?? null,
      wiredForSearch: Boolean(cap?.wiredForSearch),
      isAggregator: Boolean(cap?.isAggregator),
      browserSearch: Boolean(cap?.browserSearch),
      notes: cap?.notes ?? null,
      selected: selected.includes(provider.id)
    };
  });
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    searchProviderIds: selected.slice(),
    providers: providers2,
    total: providers2.length
  };
}
function setSearchProvidersTool(raw) {
  const input = asObject(raw);
  const providerIds = asProviderIds(input.providerIds);
  if (!providerIds) {
    return {
      ok: false,
      error: "providerIds_required",
      message: "providerIds must be a non-empty string array"
    };
  }
  useMusicDemoStore.getState().setSearchProviderIds(providerIds);
  const next = useMusicDemoStore.getState().searchProviderIds;
  return {
    ok: true,
    appId: MUSIC_APP_ID,
    searchProviderIds: next.slice()
  };
}
var MUSIC_TOOL_GROUP_PLAYBACK = {
  groupId: "playback",
  groupTitle: "\u64AD\u653E"
};
var MUSIC_TOOL_GROUP_LIBRARY = {
  groupId: "library",
  groupTitle: "\u66F2\u5E93\u4E0E\u961F\u5217"
};
var MUSIC_TOOL_GROUP_SEARCH = {
  groupId: "search",
  groupTitle: "\u641C\u7D22\u4E0E\u504F\u597D"
};
function registerMusicAgentTools(host2) {
  return host2.registerAgentTools({
    appId: MUSIC_APP_ID,
    availability: "always",
    tools: [
      {
        name: "now_playing",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description: "Read Music app now-playing state (track title/artist, play/pause intent, queue size).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        execute: async () => snapshotNowPlaying()
      },
      {
        name: "play",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description: "Control Music playback. action=play|pause|toggle (default toggle). Optional trackId to switch track then play. For natural-language song requests prefer play_query.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["play", "pause", "toggle"]
            },
            trackId: { type: "string" }
          },
          additionalProperties: false
        },
        execute: async (raw) => {
          ensureMusicPlaybackRuntime();
          const input = raw && typeof raw === "object" ? raw : {};
          const store = useMusicDemoStore.getState();
          const trackId = typeof input.trackId === "string" ? input.trackId.trim() : "";
          if (trackId) {
            const exists = store.tracks.some((track) => track.id === trackId);
            if (!exists) {
              return { ok: false, error: `Unknown trackId: ${trackId}` };
            }
            store.setNowPlaying(trackId);
            const applied2 = await applyMusicPlaybackIntent(true);
            return {
              ok: true,
              action: "play",
              audioPaused: applied2.audioPaused,
              ...snapshotNowPlaying()
            };
          }
          const action = input.action === "play" || input.action === "pause" || input.action === "toggle" ? input.action : "toggle";
          let nextWants = !store.wantsPlaying;
          if (action === "play") {
            nextWants = true;
          } else if (action === "pause") {
            nextWants = false;
          }
          const applied = await applyMusicPlaybackIntent(nextWants);
          return {
            ok: true,
            action,
            audioPaused: applied.audioPaused,
            ...snapshotNowPlaying()
          };
        }
      },
      {
        name: "list_library",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description: "List tracks in the local Music library. Optional query filter, pinnedOnly, limit/offset.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            pinnedOnly: { type: "boolean" },
            limit: { type: "number" },
            offset: { type: "number" }
          },
          additionalProperties: false
        },
        execute: async (raw) => listLibraryTool(raw)
      },
      {
        name: "list_queue",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description: "List the current play queue in order (includes now-playing marker).",
        inputSchema: {
          type: "object",
          properties: {
            limit: { type: "number" },
            offset: { type: "number" }
          },
          additionalProperties: false
        },
        execute: async (raw) => listQueueTool(raw)
      },
      {
        name: "set_play_mode",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description: "Set play mode: sequence | loop-one | shuffle.",
        inputSchema: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["sequence", "loop-one", "shuffle"] }
          },
          required: ["mode"],
          additionalProperties: false
        },
        execute: async (raw) => setPlayModeTool(raw)
      },
      {
        name: "queue_ops",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description: "Mutate the play queue. action=add|remove|clear. add/remove need trackId; add supports position=end|next.",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "remove", "clear"] },
            trackId: { type: "string" },
            position: { type: "string", enum: ["end", "next"] }
          },
          required: ["action"],
          additionalProperties: false
        },
        execute: async (raw) => queueOpsTool(raw)
      },
      {
        name: "track_ops",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description: "Library track ops: pin | unpin | delete. delete requires confirm:true (destructive).",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["pin", "unpin", "delete"] },
            trackId: { type: "string" },
            confirm: { type: "boolean" }
          },
          required: ["action", "trackId"],
          additionalProperties: false
        },
        execute: async (raw) => trackOpsTool(raw)
      },
      {
        name: "get_track_detail",
        ...MUSIC_TOOL_GROUP_LIBRARY,
        description: "Read one track's detail fields aligned with \u2325D sheet (title/artist/album/platform/source/urls/lyrics/palette).",
        inputSchema: {
          type: "object",
          properties: {
            trackId: { type: "string" }
          },
          required: ["trackId"],
          additionalProperties: false
        },
        execute: async (raw) => getTrackDetailTool(raw)
      },
      {
        name: "get_app_prefs",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description: "Read Music app preferences (lyricsDensity, searchProviderIds, playMode, immersion, search cache TTL, etc.).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        execute: async () => getAppPrefsTool()
      },
      {
        name: "list_providers",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description: "List music search/playback providers with trait tags (search/resolve/playable/aggregator/browser).",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        execute: async () => listProvidersTool()
      },
      {
        name: "set_search_providers",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description: "Set which providers are enabled for search (persisted searchProviderIds). Pass providerIds array.",
        inputSchema: {
          type: "object",
          properties: {
            providerIds: {
              type: "array",
              items: { type: "string" },
              description: 'e.g. ["local","netease","qq"]'
            }
          },
          required: ["providerIds"],
          additionalProperties: false
        },
        execute: async (raw) => setSearchProvidersTool(raw)
      },
      {
        name: "search_tracks",
        ...MUSIC_TOOL_GROUP_SEARCH,
        description: "Search tracks by keyword. Checks local library hits first in results (localTrackId), then online providers. Optional providerIds overrides store searchProviderIds. Use play_query to search+download+play in one step.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search text, e.g. \u6625\u65E5" },
            limit: { type: "number", description: "Max tracks to return (default 10, max 30)" },
            localOnly: {
              type: "boolean",
              description: "If true, only match local library without online search"
            },
            providerIds: {
              type: "array",
              items: { type: "string" },
              description: "Optional provider filter; defaults to store searchProviderIds"
            }
          },
          required: ["query"],
          additionalProperties: false
        },
        execute: async (raw) => {
          const input = raw && typeof raw === "object" ? raw : {};
          const query = typeof input.query === "string" ? input.query.trim() : "";
          if (!query) {
            return { ok: false, error: "query is required" };
          }
          const limitRaw = typeof input.limit === "number" ? input.limit : 10;
          const limit = Math.max(1, Math.min(30, Math.floor(limitRaw)));
          const providerIds = resolveSearchProviderIds(input.providerIds);
          if (input.localOnly) {
            const local = findBestLocalTrack(query);
            const store = useMusicDemoStore.getState();
            const tokens = query.toLowerCase().split(/[\s,，、/+]+/).filter((token) => token.length >= 1);
            const matched = store.tracks.filter((track) => {
              const hay = `${track.title} ${track.artist} ${track.album || ""}`.toLowerCase();
              return tokens.some((token) => hay.includes(token));
            }).slice(0, limit).map((track) => ({
              title: track.title,
              artist: track.artist,
              album: track.album,
              trackId: track.id,
              source: "local",
              local: true
            }));
            return {
              ok: true,
              query,
              localOnly: true,
              bestLocalTrackId: local?.id ?? null,
              tracks: matched,
              total: matched.length
            };
          }
          const page = await searchPlayableMusic({
            text: query,
            scope: "track",
            limit,
            page: 1,
            providerIds
          });
          const tracks = page.tracks.slice(0, limit).map((hit) => ({
            title: hit.title,
            artist: hit.artist,
            album: hit.album,
            providerId: hit.ref.providerId,
            remoteId: hit.ref.remoteId,
            localTrackId: hit.localTrackId ?? null,
            playable: Boolean(hit.playableUrl || hit.localTrackId),
            source: hit.localTrackId ? "local" : "online"
          }));
          return {
            ok: true,
            query,
            providerIds,
            tracks,
            total: tracks.length,
            hasMore: Boolean(page.hasMore),
            providerErrors: page.providerErrors ?? []
          };
        }
      },
      {
        name: "play_query",
        ...MUSIC_TOOL_GROUP_PLAYBACK,
        description: "Play a song by natural-language query [scorer=v2-stopwords]. Priority: (1) match local library, (2) online search, (3) download to local when possible, (4) play. Optional providerIds overrides store searchProviderIds.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Song title / mood / keywords, e.g. \u6625\u65E5\u3001\u6674\u5929\u3001\u5468\u6770\u4F26"
            },
            preferLocalOnly: {
              type: "boolean",
              description: "Only use local library; do not search online"
            },
            download: {
              type: "boolean",
              description: "Download online hit to local storage before play (default true)"
            },
            providerIds: {
              type: "array",
              items: { type: "string" },
              description: "Optional provider filter; defaults to store searchProviderIds"
            }
          },
          required: ["query"],
          additionalProperties: false
        },
        execute: async (raw) => {
          const input = raw && typeof raw === "object" ? raw : {};
          const query = typeof input.query === "string" ? input.query.trim() : "";
          if (!query) {
            return { ok: false, error: "query is required" };
          }
          return playMusicByQuery({
            host: host2,
            query,
            preferLocalOnly: Boolean(input.preferLocalOnly),
            download: input.download !== false,
            providerIds: resolveSearchProviderIds(input.providerIds)
          });
        }
      }
    ]
  });
}

// src/index.ts
init_music_host();
init_store();
init_music_ids();
init_store();
var appId = MUSIC_APP_ID;
function activate(host2) {
  bindMusicRuntimeAppIdFromHost(host2);
  initMusicPlaybackLeader(host2);
  registerMusicApp(host2);
  registerMusicAgentTools(host2);
  ensureMusicPlaybackRuntime();
}
function deactivate(_host) {
  stopMusicPerfSelfReport();
  setMusicPlaybackBackgroundActive(false);
  stopMusicPlaybackAudio();
  useMusicDemoStore.getState().setWantsPlaying(false);
  resetMusicHostApi();
}
var moduleExport = {
  appId: MUSIC_APP_ID,
  activate,
  deactivate
};
var index_default = moduleExport;
