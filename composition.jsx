import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, useVideoConfig } from "remotion";
import { StarfieldBackground } from "./composition-background.jsx";
import { GameCanvas } from "./composition-visuals.jsx";
import { LevelDisplay, EndScreenOverlay, VSLayout } from "./composition-ui.jsx";
const ReplayComposition = ({ replayData, prefetchedAvatarUrl, prefetchedOpponentAvatarUrl }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (!replayData || !replayData.frames || replayData.frames.length < 2) {
    return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { backgroundColor: "#1a1a2e", color: "white", justifyContent: "center", alignItems: "center" }, children: "Loading replay..." }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 20,
      columnNumber: 16
    });
  }
  const { frames, config } = replayData;
  const { currentUser } = config;
  const isVS = config.mode === "vs";
  const startTime = frames[0].timestamp;
  const gameEndTime = frames[frames.length - 1].timestamp;
  const gameEndFrame = Math.ceil((gameEndTime - startTime) / 1e3 * 30);
  const currentTimestamp = startTime + frame / 30 * 1e3;
  let frameIndex;
  if (frame < gameEndFrame) {
    frameIndex = frames.findIndex((f) => f.timestamp >= currentTimestamp);
    if (frameIndex === -1) frameIndex = frames.length - 1;
  } else {
    frameIndex = frames.length - 1;
  }
  const currentFrameData = frames[frameIndex];
  const score = currentFrameData.score;
  const level = currentFrameData.level || 1;
  const isGameOver = frameIndex === frames.length - 1 && !currentFrameData.success;
  const showEndScreen = frame >= gameEndFrame;
  const isDuringEndScreen = frame >= gameEndFrame && frame < gameEndFrame + 90;
  const successFrames = frames.filter((f) => f.success);
  const MAX_VOLUME = 0.3;
  const FADE_DURATION_FRAMES = 15 * fps;
  let musicVolume;
  if (durationInFrames <= 2 * FADE_DURATION_FRAMES) {
    const midPoint = durationInFrames / 2;
    musicVolume = interpolate(
      frame,
      [0, midPoint, durationInFrames],
      [0, MAX_VOLUME, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  } else {
    musicVolume = interpolate(
      frame,
      [0, FADE_DURATION_FRAMES, durationInFrames - FADE_DURATION_FRAMES, durationInFrames],
      [0, MAX_VOLUME, MAX_VOLUME, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  }
  return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { backgroundColor: "#1a1a2e" }, children: [
    /* @__PURE__ */ jsxDEV(StarfieldBackground, {}, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 73,
      columnNumber: 13
    }),
    !showEndScreen && /* @__PURE__ */ jsxDEV("div", { style: {
      position: "absolute",
      top: "20px",
      left: "20px",
      fontSize: "clamp(1.2rem, 4vw, 2.2rem)",
      fontWeight: "bold",
      color: config.colors.fail.trim(),
      fontFamily: "Arial, sans-serif",
      zIndex: 10,
      textShadow: "0 2px 4px rgba(0,0,0,0.3)"
    }, children: isVS ? "" : `Score: ${score}` }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 76,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { justifyContent: "center", alignItems: "center" }, children: [
      !isVS && /* @__PURE__ */ jsxDEV(
        LevelDisplay,
        {
          level,
          isVisible: !showEndScreen || isDuringEndScreen
        },
        `level-${level}`,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 93,
          columnNumber: 21
        }
      ),
      isVS ? /* @__PURE__ */ jsxDEV(
        VSLayout,
        {
          frameData: currentFrameData,
          config,
          prefetchedAvatarUrl,
          prefetchedOpponentAvatarUrl
        },
        void 0,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 101,
          columnNumber: 21
        }
      ) : /* @__PURE__ */ jsxDEV("div", { style: { width: "90%", height: "auto", aspectRatio: "1 / 1" }, children: /* @__PURE__ */ jsxDEV(GameCanvas, { frameData: currentFrameData, config }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 109,
        columnNumber: 25
      }) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 108,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 91,
      columnNumber: 13
    }),
    showEndScreen && /* @__PURE__ */ jsxDEV(EndScreenOverlay, { score, level, user: currentUser, isGameOver, prefetchedAvatarUrl, config }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 114,
      columnNumber: 32
    }),
    /* @__PURE__ */ jsxDEV(Audio, { src: "/Infinite Orbit - Track 1 (Extended 2) - Sonauto.ogg", volume: musicVolume, loop: true }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 116,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV(Audio, { src: "/start_sound.mp3", volume: 0.5 }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 117,
      columnNumber: 13
    }),
    successFrames.map((f, i) => {
      const frameForAudio = Math.round((f.timestamp - startTime) / 1e3 * 30);
      if (frameForAudio < gameEndFrame) {
        return /* @__PURE__ */ jsxDEV(Sequence, { from: frameForAudio, children: /* @__PURE__ */ jsxDEV(Audio, { src: "/success.mp3" }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 124,
          columnNumber: 25
        }) }, `success-${i}`, false, {
          fileName: "<stdin>",
          lineNumber: 123,
          columnNumber: 22
        });
      }
      return null;
    }),
    isGameOver && /* @__PURE__ */ jsxDEV(Sequence, { from: gameEndFrame - 1, children: /* @__PURE__ */ jsxDEV(Audio, { src: "/fail.mp3" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 133,
      columnNumber: 21
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 132,
      columnNumber: 17
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 72,
    columnNumber: 9
  });
};
export {
  ReplayComposition
};
