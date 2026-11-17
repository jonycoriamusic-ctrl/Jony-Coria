import type { IconType } from "react-icons";
import { FaAmazon, FaLinkedinIn } from "react-icons/fa6";
import {
  SiApplemusic,
  SiAudiomack,
  SiBandcamp,
  SiBandsintown,
  SiBeatport,
  SiBluesky,
  SiDeezer,
  SiDiscord,
  SiFacebook,
  SiInstagram,
  SiKofi,
  SiLastdotfm,
  SiLine,
  SiLinktree,
  SiMastodon,
  SiMessenger,
  SiMixcloud,
  SiPatreon,
  SiPinterest,
  SiReddit,
  SiSignal,
  SiSnapchat,
  SiSongkick,
  SiSoundcloud,
  SiSpotify,
  SiSubstack,
  SiTelegram,
  SiThreads,
  SiTidal,
  SiTiktok,
  SiTumblr,
  SiTwitch,
  SiVimeo,
  SiVk,
  SiWechat,
  SiWhatsapp,
  SiX,
  SiYoutube,
  SiYoutubemusic,
} from "react-icons/si";

export type SocialPlatformGroup = "music" | "social" | "messaging" | "creators";
export type SocialPlatform = {
  name: string;
  group: SocialPlatformGroup;
  icon: IconType;
  urlHint: string;
};

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  { name: "Spotify", group: "music", icon: SiSpotify, urlHint: "https://open.spotify.com/artist/…" },
  { name: "Apple Music", group: "music", icon: SiApplemusic, urlHint: "https://music.apple.com/…" },
  { name: "SoundCloud", group: "music", icon: SiSoundcloud, urlHint: "https://soundcloud.com/…" },
  { name: "YouTube Music", group: "music", icon: SiYoutubemusic, urlHint: "https://music.youtube.com/…" },
  { name: "Bandcamp", group: "music", icon: SiBandcamp, urlHint: "https://….bandcamp.com" },
  { name: "Deezer", group: "music", icon: SiDeezer, urlHint: "https://www.deezer.com/…" },
  { name: "TIDAL", group: "music", icon: SiTidal, urlHint: "https://tidal.com/…" },
  { name: "Amazon Music", group: "music", icon: FaAmazon, urlHint: "https://music.amazon.com/…" },
  { name: "Audiomack", group: "music", icon: SiAudiomack, urlHint: "https://audiomack.com/…" },
  { name: "Mixcloud", group: "music", icon: SiMixcloud, urlHint: "https://www.mixcloud.com/…" },
  { name: "Beatport", group: "music", icon: SiBeatport, urlHint: "https://www.beatport.com/artist/…" },
  { name: "Last.fm", group: "music", icon: SiLastdotfm, urlHint: "https://www.last.fm/music/…" },
  { name: "Songkick", group: "music", icon: SiSongkick, urlHint: "https://www.songkick.com/artists/…" },
  { name: "Bandsintown", group: "music", icon: SiBandsintown, urlHint: "https://www.bandsintown.com/a/…" },
  { name: "Instagram", group: "social", icon: SiInstagram, urlHint: "https://www.instagram.com/…" },
  { name: "Facebook", group: "social", icon: SiFacebook, urlHint: "https://www.facebook.com/…" },
  { name: "TikTok", group: "social", icon: SiTiktok, urlHint: "https://www.tiktok.com/@…" },
  { name: "YouTube", group: "social", icon: SiYoutube, urlHint: "https://www.youtube.com/@…" },
  { name: "X", group: "social", icon: SiX, urlHint: "https://x.com/…" },
  { name: "Threads", group: "social", icon: SiThreads, urlHint: "https://www.threads.net/@…" },
  { name: "Bluesky", group: "social", icon: SiBluesky, urlHint: "https://bsky.app/profile/…" },
  { name: "LinkedIn", group: "social", icon: FaLinkedinIn, urlHint: "https://www.linkedin.com/in/…" },
  { name: "Snapchat", group: "social", icon: SiSnapchat, urlHint: "https://www.snapchat.com/add/…" },
  { name: "Pinterest", group: "social", icon: SiPinterest, urlHint: "https://www.pinterest.com/…" },
  { name: "Reddit", group: "social", icon: SiReddit, urlHint: "https://www.reddit.com/user/…" },
  { name: "Twitch", group: "social", icon: SiTwitch, urlHint: "https://www.twitch.tv/…" },
  { name: "Vimeo", group: "social", icon: SiVimeo, urlHint: "https://vimeo.com/…" },
  { name: "Mastodon", group: "social", icon: SiMastodon, urlHint: "https://…/@…" },
  { name: "Tumblr", group: "social", icon: SiTumblr, urlHint: "https://….tumblr.com" },
  { name: "VK", group: "social", icon: SiVk, urlHint: "https://vk.com/…" },
  { name: "WhatsApp", group: "messaging", icon: SiWhatsapp, urlHint: "https://wa.me/…" },
  { name: "Telegram", group: "messaging", icon: SiTelegram, urlHint: "https://t.me/…" },
  { name: "Discord", group: "messaging", icon: SiDiscord, urlHint: "https://discord.gg/…" },
  { name: "Signal", group: "messaging", icon: SiSignal, urlHint: "https://signal.me/#…" },
  { name: "Messenger", group: "messaging", icon: SiMessenger, urlHint: "https://m.me/…" },
  { name: "LINE", group: "messaging", icon: SiLine, urlHint: "https://line.me/…" },
  { name: "WeChat", group: "messaging", icon: SiWechat, urlHint: "https://…" },
  { name: "Patreon", group: "creators", icon: SiPatreon, urlHint: "https://www.patreon.com/…" },
  { name: "Ko-fi", group: "creators", icon: SiKofi, urlHint: "https://ko-fi.com/…" },
  { name: "Substack", group: "creators", icon: SiSubstack, urlHint: "https://….substack.com" },
  { name: "Linktree", group: "creators", icon: SiLinktree, urlHint: "https://linktr.ee/…" },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const legacyNames: Record<string, string> = {
  twitter: "X",
  facebookmessenger: "Messenger",
};

export function socialPlatform(name: string): SocialPlatform | undefined {
  const normalized = normalize(name);
  const canonical = legacyNames[normalized] ?? name;
  return SOCIAL_PLATFORMS.find((platform) => normalize(platform.name) === normalize(canonical));
}
