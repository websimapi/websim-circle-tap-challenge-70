import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img } from "remotion";
import { GameCanvas } from "./composition-visuals.jsx";
const LevelDisplay = ({ level, isVisible, scaleFactor = 1, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = isVisible ? spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 150
    }
  }) : 0;
  const opacity = isVisible ? interpolate(frame, [0, 15], [0, 0.5]) : 0;
  const displayColor = color || "rgba(220, 220, 220, 0.5)";
  return /* @__PURE__ */ jsxDEV("div", { style: {
    position: "absolute",
    fontSize: `${8 * scaleFactor}rem`,
    fontWeight: "bold",
    color: displayColor,
    textShadow: "0 0 10px rgba(0,0,0,0.5)",
    opacity,
    transform: `scale(${scale})`,
    zIndex: 1,
    pointerEvents: "none"
  }, children: level }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 22,
    columnNumber: 9
  });
};
const Avatar = ({ user, prefetchedAvatarUrl }) => {
  if (!prefetchedAvatarUrl) {
    return /* @__PURE__ */ jsxDEV("div", { style: { width: "50px", height: "50px", borderRadius: "50%", backgroundColor: "#4a4a6a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold" }, children: user ? user.username.charAt(0).toUpperCase() : "?" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 41,
      columnNumber: 13
    });
  }
  return /* @__PURE__ */ jsxDEV(
    Img,
    {
      src: prefetchedAvatarUrl,
      style: { width: "50px", height: "50px", borderRadius: "50%" }
    },
    void 0,
    false,
    {
      fileName: "<stdin>",
      lineNumber: 48,
      columnNumber: 9
    }
  );
};
const EndScreenOverlay = ({ score, level, user, isGameOver, prefetchedAvatarUrl, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isVS = config.mode === "vs";
  const scaleIn = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 150
    }
  });
  const opacity = interpolate(frame, [0, 15], [0, 1]);
  if (isVS) {
    const result = config.result;
    const playerWon = result === "win";
    return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { fontFamily: "Arial, sans-serif", fontWeight: "bold", opacity }, children: [
      /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { height: "50%", top: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" }, children: /* @__PURE__ */ jsxDEV("div", { style: {
        fontSize: "4rem",
        color: playerWon ? "#e94560" : "#4CAF50",
        textShadow: "0 4px 10px rgba(0,0,0,0.8)",
        transform: `scale(${scaleIn})`
      }, children: playerWon ? "DEFEAT" : "VICTORY" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 79,
        columnNumber: 21
      }) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 78,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { height: "50%", top: "50%", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.1)" }, children: /* @__PURE__ */ jsxDEV("div", { style: {
        fontSize: "4rem",
        color: playerWon ? "#4CAF50" : "#e94560",
        textShadow: "0 4px 10px rgba(0,0,0,0.8)",
        transform: `scale(${scaleIn})`
      }, children: playerWon ? "VICTORY" : "DEFEAT" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 91,
        columnNumber: 21
      }) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 90,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 76,
      columnNumber: 13
    });
  }
  const finalScoreText = `Final Score: ${score}`;
  const finalLevelText = `Level: ${level}`;
  return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { padding: "20px", fontFamily: "Arial, sans-serif", color: "white", opacity }, children: [
    user && /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", top: "20px", left: "20px", display: "flex", alignItems: "center", gap: "10px", transform: `scale(${scaleIn})` }, children: [
      /* @__PURE__ */ jsxDEV(Avatar, { user, prefetchedAvatarUrl }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 112,
        columnNumber: 21
      }),
      /* @__PURE__ */ jsxDEV("span", { style: { fontSize: "24px", fontWeight: "bold", textShadow: "2px 2px 4px #000" }, children: user.username }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 113,
        columnNumber: 21
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 111,
      columnNumber: 18
    }),
    /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", top: "30px", right: "20px", fontSize: "24px", fontWeight: "bold", textShadow: "2px 2px 4px #000", transform: `scale(${scaleIn})`, textAlign: "right" }, children: [
      /* @__PURE__ */ jsxDEV("div", { children: finalScoreText }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 120,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("div", { children: finalLevelText }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 121,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 119,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 108,
    columnNumber: 9
  });
};
const HeartIcon = ({ percentage }) => {
  const insetVal = 100 - percentage * 100;
  return /* @__PURE__ */ jsxDEV("div", { style: { width: "24px", height: "24px", position: "relative" }, children: /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 24 24", style: { width: "100%", height: "100%", overflow: "visible" }, children: [
    /* @__PURE__ */ jsxDEV("path", { fill: "#330000", stroke: "#550000", strokeWidth: "2", d: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 134,
      columnNumber: 17
    }),
    /* @__PURE__ */ jsxDEV(
      "path",
      {
        fill: "#ff0000",
        d: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
        style: { clipPath: `inset(${insetVal}% 0 0 0)` }
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 135,
        columnNumber: 17
      }
    )
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 133,
    columnNumber: 13
  }) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 132,
    columnNumber: 9
  });
};
const PlayerSection = ({ user, avatarUrl, frameData, config, isOpponent }) => {
  const level = isOpponent ? frameData.level || 1 : frameData.level || 1;
  const health = isOpponent ? frameData.health || 0 : frameData.health || 0;
  const hearts = [];
  for (let i = 0; i < 3; i++) {
    const h = Math.max(0, Math.min(100, health - i * 100)) / 100;
    hearts.push(/* @__PURE__ */ jsxDEV(HeartIcon, { percentage: h }, i, false, {
      fileName: "<stdin>",
      lineNumber: 152,
      columnNumber: 21
    }));
  }
  return /* @__PURE__ */ jsxDEV("div", { style: { flex: 1, position: "relative", borderBottom: isOpponent ? "2px solid rgba(255,255,255,0.1)" : "none", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: isOpponent ? "rgba(0,0,0,0.2)" : "transparent", overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", top: 15, left: 15, display: "flex", alignItems: "center", gap: "10px", zIndex: 10 }, children: [
      /* @__PURE__ */ jsxDEV(Avatar, { user, prefetchedAvatarUrl: avatarUrl }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 160,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("span", { style: { fontSize: "1.2rem", fontWeight: "bold", color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }, children: user ? user.username : "Unknown" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 161,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 159,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", top: 15, right: 15, display: "flex", flexDirection: "column", alignItems: "flex-end", zIndex: 10 }, children: [
      /* @__PURE__ */ jsxDEV("div", { style: { fontSize: "1.5rem", fontWeight: "bold", color: config.colors.fail, marginBottom: "5px" }, children: [
        "Score: ",
        frameData.score || 0
      ] }, void 0, true, {
        fileName: "<stdin>",
        lineNumber: 166,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", gap: "4px" }, children: hearts }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 167,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 165,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { style: { width: "80%", height: "80%", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", zIndex: 5, width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }, children: /* @__PURE__ */ jsxDEV(
        LevelDisplay,
        {
          level,
          isVisible: true,
          scaleFactor: 0.5
        },
        void 0,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 175,
          columnNumber: 21
        }
      ) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 174,
        columnNumber: 17
      }),
      /* @__PURE__ */ jsxDEV("div", { style: { width: "100%", height: "100%" }, children: /* @__PURE__ */ jsxDEV(GameCanvas, { frameData, config }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 182,
        columnNumber: 22
      }) }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 181,
        columnNumber: 17
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 173,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 156,
    columnNumber: 9
  });
};
const getLevelColor = (level) => {
  const hue = (level - 1) * 40 % 360;
  return `hsl(${hue}, 100%, 60%)`;
};
const VSLayout = ({ frameData, config, prefetchedAvatarUrl, prefetchedOpponentAvatarUrl }) => {
  const oppData = frameData.opponent || { angle: -Math.PI / 2, targetStart: 0, targetSize: 0, level: 1, health: 300, score: 0 };
  const oppLevel = oppData.level || 1;
  const opponentFrame = {
    angle: oppData.angle,
    targetStartAngle: oppData.targetStart,
    targetSize: oppData.targetSize,
    targetColor: getLevelColor(oppLevel),
    pulseAmount: frameData.pulseAmount,
    success: false,
    fail: false,
    level: oppLevel,
    health: oppData.health,
    score: oppData.score || 0
  };
  return /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", flexDirection: "column", width: "100%", height: "100%" }, children: [
    /* @__PURE__ */ jsxDEV(
      PlayerSection,
      {
        user: config.opponent,
        avatarUrl: prefetchedOpponentAvatarUrl,
        frameData: opponentFrame,
        config,
        isOpponent: true
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 213,
        columnNumber: 13
      }
    ),
    /* @__PURE__ */ jsxDEV(
      PlayerSection,
      {
        user: config.currentUser,
        avatarUrl: prefetchedAvatarUrl,
        frameData,
        config,
        isOpponent: false
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 220,
        columnNumber: 13
      }
    )
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 212,
    columnNumber: 9
  });
};
export {
  Avatar,
  EndScreenOverlay,
  LevelDisplay,
  VSLayout
};
