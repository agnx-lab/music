// 场景：Music appId 常量（无侧向 import，避免 list-contributions ↔ store ↔ app-prefs 循环依赖）。
/** P4 短 appId；config.aliases 保留 legacy 至 P6。 */
export const MUSIC_APP_ID = "music";
export const MUSIC_LEGACY_APP_ID = "com.example.music";
