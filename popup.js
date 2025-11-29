// popup.js (snippet)
const API_BASE = "https://kiron-boq-auth.vercel.app/pages/api/auth/verify";

const emailInput = document.getElementById("email");
const verifyBtn = document.getElementById("verify");
const injectBtn = document.getElementById("inject");
const status = document.getElementById("status");
document.getElementById("serverUrl").textContent = API_BASE.replace('/api/auth/verify','');

function setStatus(txt, ok) {
  status.textContent = txt;
  status.className = ok === true ? "ok" : ok === false ? "err" : "";
}
function generateDeviceId() {
  const parts = [
    navigator.userAgent,
    navigator.platform,
    screen.width + "x" + screen.height,
    navigator.language,
    (navigator.hardwareConcurrency || 0)
  ];
  return btoa(parts.join("|"));
}
const DEVICE_ID = generateDeviceId();

verifyBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) { setStatus("Enter a valid email", false); return; }
  setStatus("Verifying...");
  try {
    const url = `${API_BASE}?email=${encodeURIComponent(email)}&device=${encodeURIComponent(DEVICE_ID)}`;
    const res = await fetch(url, { method: "GET", mode: "cors", cache: "no-cache" });
    const j = await res.json();
    if (j.allowed === true) {
      await chrome.storage.local.set({ authorizedEmail: email, deviceId: DEVICE_ID });
      setStatus("Access granted ✅ (" + email + ")", true);
    } else {
      await chrome.storage.local.remove(["authorizedEmail", "deviceId"]);
      setStatus(j.message || "Access denied ✖", false);
    }
  } catch (e) {
    console.error(e);
    setStatus("Server/network error", false);
  }
});
