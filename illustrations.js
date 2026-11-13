(() => {
  "use strict";

  // Self-contained images keep repeated icon gradients independent in each card.
  const ink = "#64516f";
  const gradients = {
    mint: ["#cefae8", "#71d3ba", "#379d9a"],
    pink: ["#ffb9d7", "#f983b1", "#d95793"],
    rosy: ["#ffe2ed", "#ffaacb", "#f686ae"],
    honey: ["#fff2ab", "#ffd167", "#efa344"],
    peach: ["#ffe9cf", "#ffd2b6", "#e9a289"],
    lilac: ["#ede2ff", "#c7b1ef", "#a084cf"],
    pool: ["#dbfff4", "#88dfd8", "#47b3c1"],
  };
  const defs = Object.entries(gradients).map(([name, stops]) =>
    '<linearGradient id="' + name + '" x1="0" y1="0" x2=".55" y2="1" gradientUnits="objectBoundingBox">' +
    '<stop stop-color="' + stops[0] + '"/><stop offset=".53" stop-color="' + stops[1] +
    '"/><stop offset="1" stop-color="' + stops[2] + '"/></linearGradient>'
  ).join("");
  const surface = (d, material, width = 2.6) =>
    '<path d="' + d + '" fill="url(#' + material + ')" stroke="' + ink + '" stroke-width="' + width + '"/>';
  const line = (d, color, width = 2) =>
    '<path d="' + d + '" stroke="' + color + '" stroke-width="' + width + '" fill="none"/>';
  const dot = (cx, cy, r, color) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '"/>';
  const ground = (cx, cy, rx, ry) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx +
    '" ry="' + ry + '" fill="#70517e" opacity=".10"/>';

  const art = {
    squish: [
      ground(42, 70, 31, 4.2),
      // The sides spread out at the base of a compressed block of pillowy foam.
      surface("M14 43 Q15 38 22 38 L57 37 Q65 36 68 42 L73 56 Q78 67 61 69 Q40 74 17 67 Q8 64 10 57Z", "mint"),
      surface("M15 43 Q17 39 23 39 L56 38 Q63 37 67 41 Q66 48 57 49 Q40 52 23 49 Q17 49 15 43Z", "pool", 1.7),
      line("M16 57 Q14 62 20 63", "#e6fff2", 3.1),
      line("M54 65 Q65 65 67 61", "#43ae9f", 2.4),
      dot(28, 59, 1.4, "#65c2b1"), dot(32, 62, .9, "#65c2b1"),
      // A broad padded palm rests on the flattened top.
      surface("M58 10 Q63 7 68 14 L72 20 Q73 23 69 26 L60 33 Q56 38 50 40 L35 44 Q30 46 28 42 Q25 42 23 39 Q19 39 18 36 Q15 33 20 30 L35 22 L29 23 Q23 24 22 20 Q21 17 26 15 L39 11 Q45 9 51 13Z", "peach"),
      line("M19 35 L35 27 M23 39 L38 31 M28 42 L42 35", "#c98f87", 1.55),
      surface("M61 8 Q64 6 67 10 L76 21 Q78 24 75 26 L70 30 L56 12Z", "lilac", 2.1),
      line("M26 18 L34 15", "#fff4dd", 2.1),
      line("M7 49 L5 53 M76 42 L79 45", "#a985b8", 2.3),
    ],
    poke: [
      ground(39, 70, 30, 3.8),
      surface("M9 56 Q11 43 24 40 Q34 38 38 41 Q41 44 45 42 Q53 38 60 41 Q70 45 72 56 Q74 64 64 68 Q41 75 17 68 Q7 65 9 56Z", "pink"),
      line("M16 53 Q17 47 24 46", "#ffe5ed", 3.2),
      line("M54 66 Q62 65 65 61", "#dd6493", 2.3),
      line("M31 46 Q37 51 45 47 M50 45 L53 45", "#c65e8d", 2),
      dot(24, 61, 1.2, "#f184aa"), dot(29, 64, 1, "#ef83a8"),
      // A single extended fingertip sinks into the small dimple.
      surface("M60 9 Q65 7 69 12 L74 19 Q77 23 72 27 L64 32 Q60 36 56 34 L54 33 Q51 35 48 33 L45 38 Q42 45 37 45 Q32 45 34 39 L41 23 Q43 18 48 16Z", "peach"),
      line("M48 33 L51 27 M55 33 L58 27 M61 32 L64 27", "#c88f85", 1.65),
      line("M39 35 L43 26", "#fff6e8", 2.35),
      surface("M61 9 L66 6 Q69 4 72 8 L78 16 Q81 19 78 22 L74 25Z", "honey", 2.1),
      line("M29 32 L24 28 M30 37 L25 36 M48 40 L51 37", "#bb90ba", 1.8),
    ],
    stretch: [
      ground(42, 63, 33, 4.0),
      // One continuous band of taffy narrows across the two handles.
      surface("M9 39 Q13 31 19 32 Q25 33 29 37 Q36 43 43 39 Q52 35 55 26 Q57 20 63 20 Q70 19 73 26 Q77 35 73 42 Q70 48 64 47 Q54 48 47 52 Q38 57 34 63 Q30 68 22 64 Q14 61 10 53 Q7 45 9 39Z", "honey"),
      surface("M16 32 Q22 29 28 35 Q34 42 41 40 Q49 38 55 28 Q48 44 38 48 Q24 53 16 62 Q11 59 10 55 Q19 44 30 43 Q23 42 16 45 Q9 48 9 50 Q6 39 16 32Z", "lilac", 1.7),
      surface("M52 29 Q56 17 64 19 Q74 21 75 32 Q75 38 71 42 Q68 34 62 34 Q56 35 49 40 Q56 32 55 26Z", "lilac", 1.65),
      line("M17 37 Q20 35 23 37 M59 24 Q64 21 68 25", "#fff8f3", 2.7),
      line("M32 57 Q40 49 48 47", "#fff3bf", 2.1),
      // Direction marks also distinguish this tool from a wrapped sweet.
      line("M6 23 L16 16 M6 23 L7 17 M6 23 L13 23 M77 52 L69 59 M77 52 L70 52 M77 52 L76 58", "#a388bc", 2.4),
    ],
    slice: [
      ground(41, 71, 34, 4.0),
      // The back section and a little slice tipped forwards to show its filling.
      surface("M6 54 Q6 46 13 40 Q21 33 33 35 Q43 36 49 44 L51 56 Q49 62 39 64 L22 66 Q9 64 6 59Z", "pink"),
      line("M11 50 Q15 41 22 40", "#ffe1eb", 3.1),
      surface("M39 52 Q43 44 52 44 Q60 44 65 52 L68 58 Q69 63 61 66 L46 70 Q40 72 35 67 L32 62 Q31 57 39 52Z", "rosy", 2.2),
      surface("M42 54 Q46 48 52 48 Q58 48 61 53 Q64 58 57 61 L45 65 Q39 67 37 63 Q35 59 42 54Z", "honey", 1.4),
      line("M40 60 Q46 60 49 55 Q52 52 57 53", "#d78bb7", 2.8),
      // Wide blunt plastic cutting paddle, with a small hanging hole in the grip.
      surface("M32 42 L50 24 L60 30 L40 52 Q34 58 29 54 Q24 51 32 42Z", "pool", 2.4),
      line("M32 48 L48 32", "#e0fff6", 2.4),
      surface("M47 26 L62 10 Q65 6 69 8 L74 11 Q77 15 73 19 L57 34 Q54 36 51 33 L47 30 Q45 29 47 26Z", "honey"),
      line("M56 23 L65 13", "#fff5c8", 2.25),
      dot(69, 14, 2, "#aa8190"),
      line("M22 28 L25 33 M29 26 L29 31", "#b891bf", 1.8),
    ],
    brand: [
      ground(40, 72, 32, 4),
      // A tiny mint cloud of steam from the striped factory stack.
      surface("M20 23 Q11 23 12 17 Q12 12 17 12 Q15 7 21 5 Q26 3 29 8 Q31 3 36 5 Q40 7 37 11 Q43 10 43 15 Q43 20 35 19 Q29 18 26 24Z", "mint", 2.8),
      line("M17 16 Q19 14 21 15 M23 9 L25 9", "#f3fff3", 1.8),
      surface("M17 25 L30 25 L33 53 L14 53Z", "rosy", 2.9),
      surface("M17 33 L30 29 L31 36 L16 40Z", "honey", 1.7),
      surface("M15 21 L30 21 Q32 21 32 24 L32 26 Q32 29 29 29 L16 29 Q13 29 13 26 L13 24 Q13 21 15 21Z", "lilac", 2.45),
      // Candy pink shed and a yellow scalloped roof.
      surface("M9 48 L23 41 L37 46 L52 34 L56 42 L66 40 L73 47 L72 66 Q72 71 66 71 L14 71 Q9 71 9 66Z", "pink", 3.3),
      surface("M8 45 L23 37 Q24 36 26 38 L35 42 L50 31 Q52 30 54 32 L59 40 L66 36 Q68 35 70 37 L75 43 Q77 47 73 49 Q71 51 68 48 L66 46 L58 50 L51 41 L37 51 L24 45 L12 52 Q8 53 6 49 Q5 47 8 45Z", "honey", 2.8),
      surface("M45 71 L45 62 Q45 56 51 55 Q57 54 59 59 L60 71Z", "lilac", 2.6),
      dot(55, 64, 1.1, "#faf1ff"),
      surface("M16 55 Q16 53 19 53 L26 53 Q28 53 28 56 L28 60 Q28 62 26 62 L19 62 Q16 62 16 60Z", "pool", 2.2),
      line("M19 57 L21 55", "#f1fff8", 1.7),
      line("M33 56 L35 55 M15 66 L23 66", "#ffbad6", 1.8),
    ],
  };

  const images = Object.fromEntries(Object.entries(art).map(([name, marks]) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 80" width="84" height="80">' +
      '<defs>' + defs + '</defs><g stroke-linejoin="round" stroke-linecap="round">' +
      marks.join("") + '</g></svg>';
    const uri = "data:image/svg+xml," + encodeURIComponent(svg);
    return [name, '<img class="factory-art" alt="" aria-hidden="true" draggable="false" width="84" height="80" src="' + uri + '">'];
  }));
  window.FactoryArt = name => Object.hasOwn(images, name) ? images[name] : "";
})();
