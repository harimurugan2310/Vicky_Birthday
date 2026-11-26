"use strict";

const $ = (id) => document.getElementById(id);
const pages = [...document.querySelectorAll(".page")];

function showPage(id) {
  pages.forEach(page => page.classList.toggle("active", page.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* PIN PAGE */
const pinInput = $("pinInput");
const pinMessage = $("pinMessage");

function updatePinDots() {
  [...$("pinDots").children].forEach((dot, index) => {
    dot.classList.toggle("filled", index < pinInput.value.length);
  });
}

pinInput.addEventListener("input", () => {
  pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4);
  updatePinDots();
  pinMessage.textContent = "Hint: a special date 💖";
});

function unlockPin() {
  if (pinInput.value === "0412") {
    pinMessage.textContent = "Surprise unlocked! 💖";
    showPage("page-arrow");
  } else {
    pinMessage.textContent = "That PIN is not quite right. Try again 💗";
    pinInput.value = "";
    updatePinDots();
    pinInput.focus();
  }
}
$("pinButton").addEventListener("click", unlockPin);
pinInput.addEventListener("keydown", event => {
  if (event.key === "Enter") unlockPin();
});

/* ARROW / HEART */
$("heartTarget").addEventListener("click", () => showPage("page-balloons"));

/* BALLOONS: 5 HAPPY + 8 BIRTHDAY + 5 VICKY = 18 */
const balloonColors = [
  "#ff4f91", "#8a63ff", "#ff9b42", "#29b9d1", "#e34dca",
  "#58c878", "#ff6b6b", "#f1bd36", "#5c86ff"
];

const balloonSets = [
  { id: "happyBalloons", wordId: "happyWord", word: "HAPPY" },
  { id: "birthdayBalloons", wordId: "birthdayWord", word: "BIRTHDAY" },
  { id: "vickyBalloons", wordId: "vickyWord", word: "VICKY" }
];

let poppedTotal = 0;

balloonSets.forEach((set, setIndex) => {
  const container = $(set.id);
  [...set.word].forEach((letter, index) => {
    const balloon = document.createElement("button");
    balloon.className = "balloon";
    balloon.type = "button";
    balloon.style.backgroundColor = balloonColors[(index + setIndex * 2) % balloonColors.length];
    balloon.style.color = balloonColors[(index + setIndex * 2) % balloonColors.length];
    balloon.style.animationDelay = `${index * 0.12}s`;
    balloon.setAttribute("aria-label", `Pop balloon ${index + 1} to reveal a letter`);

    balloon.addEventListener("click", () => {
      if (balloon.classList.contains("popped")) return;
      balloon.classList.add("popped");
      balloon.textContent = letter;
      balloon.style.color = "#fff";
      balloon.style.background = "rgba(255,255,255,.13)";
      balloon.style.boxShadow = "none";
      balloon.disabled = true;

      const revealed = $(set.wordId);
      revealed.textContent += letter;
      poppedTotal++;

      if (poppedTotal === 18) {
        $("balloonsNext").classList.remove("hidden");
      }
    });
    container.appendChild(balloon);
  });
});

$("balloonsNext").addEventListener("click", () => showPage("page-candles"));

/* CANDLES: 5 + 8 + 5 = 18 */
const candleRows = [
  { id: "candlesHappy", count: 5 },
  { id: "candlesBirthday", count: 8 },
  { id: "candlesVicky", count: 5 }
];
let candlesOut = false;

candleRows.forEach((row, rowIndex) => {
  for (let i = 0; i < row.count; i++) {
    const candle = document.createElement("div");
    candle.className = "candle";
    candle.style.setProperty("--candle-color", balloonColors[(i + rowIndex * 3) % balloonColors.length]);
    $(row.id).appendChild(candle);
  }
});

function extinguishCandles() {
  if (candlesOut) return;
  candlesOut = true;
  document.querySelectorAll(".candle").forEach((candle, index) => {
    setTimeout(() => candle.classList.add("out"), index * 45);
  });
  $("micMessage").textContent = "Wish made! All the candles are out. ✨";
  $("fireMessage").classList.remove("hidden");
  $("candlesNext").classList.remove("hidden");
  stopMic();
}

$("blowButton").addEventListener("click", extinguishCandles);
$("candlesNext").addEventListener("click", () => showPage("page-memories"));

/* MICROPHONE: permission is requested only after the user presses the button */
let audioContext = null;
let analyser = null;
let micStream = null;
let micFrame = null;
let micActive = false;
let loudSince = 0;

async function enableMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $("micMessage").textContent = "Microphone is not available here. Use the blow-out button.";
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    micActive = true;
    loudSince = 0;
    $("micMessage").textContent = "Microphone is on. Blow toward your phone or laptop mic!";
    $("micButton").textContent = "🎤 Microphone enabled";
    monitorMic();
  } catch (error) {
    $("micMessage").textContent = "Mic permission was not granted. Use the blow-out button instead.";
  }
}

function monitorMic() {
  if (!micActive || !analyser || candlesOut) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);

  let sum = 0;
  for (const value of data) {
    const normalized = (value - 128) / 128;
    sum += normalized * normalized;
  }
  const volume = Math.sqrt(sum / data.length);

  if (volume > 0.12) {
    if (!loudSince) loudSince = performance.now();
    if (performance.now() - loudSince > 450) {
      extinguishCandles();
      return;
    }
  } else {
    loudSince = 0;
  }

  micFrame = requestAnimationFrame(monitorMic);
}

function stopMic() {
  micActive = false;
  if (micFrame) cancelAnimationFrame(micFrame);
  if (micStream) micStream.getTracks().forEach(track => track.stop());
  if (audioContext && audioContext.state !== "closed") audioContext.close();
  micStream = null;
  audioContext = null;
  analyser = null;
}

$("micButton").addEventListener("click", enableMic);
$("memoriesNext").addEventListener("click", () => showPage("page-letter"));

/* MEMORIES AUDIO */
const birthdayAudio = $("birthdayAudio");
birthdayAudio.addEventListener("error", () => {
  $("memoriesNext").insertAdjacentHTML(
    "beforebegin",
    '<p class="hint">Audio file not found. Check that audio/birthday-song.mp3 exists.</p>'
  );
});

/* ENVELOPE */
let letterOpened = false;
$("openLetterButton").addEventListener("click", () => {
  if (letterOpened) return;
  letterOpened = true;
  $("envelope").classList.add("open");
  $("letterMessage").textContent = "A letter from my heart, just for you. 💌";
  $("openLetterButton").classList.add("hidden");
  $("letterNext").classList.remove("hidden");
});
$("letterNext").addEventListener("click", () => showPage("page-gift"));

/* FINAL GIFT + FIREWORKS */
const canvas = $("fireworksCanvas");
const ctx = canvas.getContext("2d");
let fireworks = [];
let animationId = null;
let fireworksRunning = false;

function resizeCanvas() {
  const page = $("page-gift");
  canvas.width = Math.max(1, page.clientWidth * devicePixelRatio);
  canvas.height = Math.max(1, page.clientHeight * devicePixelRatio);
  canvas.style.width = `${page.clientWidth}px`;
  canvas.style.height = `${page.clientHeight}px`;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resizeCanvas);

function launchFirework() {
  const width = $("page-gift").clientWidth;
  const height = $("page-gift").clientHeight;
  const x = Math.random() * width;
  const y = Math.random() * height * 0.55 + 20;
  const hue = Math.floor(Math.random() * 360);

  for (let i = 0; i < 65; i++) {
    const angle = (Math.PI * 2 * i) / 65;
    const speed = Math.random() * 3.5 + 1.2;
    fireworks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      hue,
      size: Math.random() * 2.5 + 1
    });
  }
}

function animateFireworks() {
  if (!fireworksRunning) return;
  const width = $("page-gift").clientWidth;
  const height = $("page-gift").clientHeight;
  ctx.clearRect(0, 0, width, height);

  if (Math.random() < 0.07) launchFirework();

  fireworks = fireworks.filter(particle => particle.life > 0.02);
  fireworks.forEach(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.985;
    particle.vy = particle.vy * 0.985 + 0.025;
    particle.life *= 0.975;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${particle.hue}, 100%, 65%, ${particle.life})`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsl(${particle.hue}, 100%, 65%)`;
    ctx.fill();
  });

  animationId = requestAnimationFrame(animateFireworks);
}

function startFireworks() {
  resizeCanvas();
  fireworksRunning = true;
  if (animationId) cancelAnimationFrame(animationId);
  animateFireworks();
  for (let i = 0; i < 4; i++) setTimeout(launchFirework, i * 220);
}

$("giftBox").addEventListener("click", () => {
  $("giftBox").classList.add("hidden");
  $("finalSurprise").classList.remove("hidden");
  startFireworks();
});

$("replayFireworks").addEventListener("click", () => {
  fireworks = [];
  launchFirework();
  launchFirework();
  launchFirework();
});

/* Clean up the microphone if the visitor leaves the page */
window.addEventListener("pagehide", stopMic);