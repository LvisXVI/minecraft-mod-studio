/* A small, pointer- and keyboard-accessible preview of the texture workflow. */
(() => {
  const canvas = document.getElementById("texture");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const palette = document.getElementById("palette");
  const status = document.getElementById("texture-status");
  const colors = [
    ["#e6c44b", "Gelb"],
    ["#3fe0b2", "Mint"],
    ["#1f9e7a", "Grün"],
    ["#e9fff6", "Weiß"],
    ["#5fb4ff", "Blau"],
    ["#a98bff", "Violett"],
    ["#ffb547", "Orange"],
    ["#ff6b6b", "Rot"],
  ];
  let selected = colors[0][0],
    drawing = false,
    erase = false,
    cursor = 119;
  let pixels = Array(256).fill(null);
  const render = () => {
    for (let i = 0; i < 256; i++) {
      const x = i % 16,
        y = Math.floor(i / 16);
      ctx.fillStyle = pixels[i] || ((x + y) % 2 ? "#272923" : "#33362d");
      ctx.fillRect(x * 20, y * 20, 20, 20);
    }
    if (document.activeElement === canvas) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        (cursor % 16) * 20 + 1,
        Math.floor(cursor / 16) * 20 + 1,
        18,
        18,
      );
    }
  };
  colors.forEach(([color, name], i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.style.backgroundColor = color;
    button.setAttribute("aria-label", name);
    button.setAttribute("aria-pressed", String(i === 0));
    button.addEventListener("click", () => {
      selected = color;
      palette
        .querySelectorAll("button")
        .forEach((node) =>
          node.setAttribute("aria-pressed", String(node === button)),
        );
    });
    palette.append(button);
  });
  const paint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * 16),
      y = Math.floor(((event.clientY - rect.top) / rect.height) * 16);
    if (x < 0 || x > 15 || y < 0 || y > 15) return;
    cursor = y * 16 + x;
    pixels[cursor] = erase ? null : selected;
    render();
  };
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    canvas.focus();
    drawing = true;
    erase = event.button === 2;
    canvas.setPointerCapture(event.pointerId);
    paint(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (drawing) paint(event);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, () => {
      drawing = false;
    });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("focus", render);
  canvas.addEventListener("blur", render);
  canvas.addEventListener("keydown", (event) => {
    const movements = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -16,
      ArrowDown: 16,
    };
    if (event.key in movements) {
      event.preventDefault();
      cursor = Math.max(0, Math.min(255, cursor + movements[event.key]));
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      pixels[cursor] = selected;
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      pixels[cursor] = null;
    } else return;
    status.textContent = `Pixel ${(cursor % 16) + 1}, ${Math.floor(cursor / 16) + 1}.`;
    render();
  });
  const example = () => {
    const shades = ["#1f9e7a", "#3fe0b2", "#e6c44b", "#e9fff6"];
    pixels = Array.from({ length: 256 }, (_, i) => {
      const distance =
        Math.abs((i % 16) - 7.5) + Math.abs(Math.floor(i / 16) - 7.5);
      return distance > 9
        ? null
        : shades[distance > 7.5 ? 0 : distance > 5 ? 1 : distance > 2 ? 2 : 3];
    });
    render();
    status.textContent = "Beispiel geladen. Zeichne einfach weiter.";
  };
  document.getElementById("texture-clear").addEventListener("click", () => {
    pixels.fill(null);
    render();
    status.textContent = "Textur geleert.";
  });
  document.getElementById("texture-example").addEventListener("click", example);
  example();
})();
