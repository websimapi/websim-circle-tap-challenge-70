import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@websim/remotion/player";
import { ReplayComposition } from "./composition.jsx";
const rootElement = document.getElementById("player-root");
const root = createRoot(rootElement);
let replayData = null;
const blobToDataURL = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
const prefetchAvatar = async (user) => {
  if (!user) return null;
  const originalUrl = user.avatar_url || user.avatarUrl;
  if (!originalUrl) {
    return null;
  }
  const sources = [
    `https://api.cors.lol/?url=${encodeURIComponent(originalUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(originalUrl)}`,
    `https://api.everyorigin.workers.dev/raw?url=${encodeURIComponent(originalUrl)}`,
    originalUrl
  ];
  for (const source of sources) {
    try {
      const response = await fetch(source, { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        if (blob.type.startsWith("image/")) {
          return await blobToDataURL(blob);
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch avatar from ${source}`, e);
    }
  }
  return null;
};
const renderPlayer = async (data) => {
  if (!data || !data.frames || data.frames.length === 0) {
    console.error("No replay data to render");
    return;
  }
  const prefetchedAvatarUrl = data.config && data.config.currentUser ? await prefetchAvatar(data.config.currentUser) : null;
  const prefetchedOpponentAvatarUrl = data.config && data.config.opponent ? await prefetchAvatar(data.config.opponent) : null;
  const durationInSeconds = (data.frames[data.frames.length - 1].timestamp - data.frames[0].timestamp) / 1e3;
  const durationInFrames = Math.ceil(durationInSeconds * 30) + 90;
  root.render(
    /* @__PURE__ */ jsxDEV(
      Player,
      {
        component: ReplayComposition,
        durationInFrames,
        fps: 30,
        compositionWidth: 540,
        compositionHeight: 960,
        loop: true,
        controls: true,
        autoplay: true,
        inputProps: { replayData: data, prefetchedAvatarUrl, prefetchedOpponentAvatarUrl },
        style: { width: "100%", height: "100%" },
        numberOfSharedAudioTags: 100
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 64,
        columnNumber: 7
      }
    )
  );
};
window.addEventListener("showReplay", (e) => {
  replayData = e.detail;
  renderPlayer(replayData);
});
window.addEventListener("hideReplay", () => {
  root.render(null);
});
