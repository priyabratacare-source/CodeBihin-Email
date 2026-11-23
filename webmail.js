import { auth } from "./firebase-config.js";
import { API_BASE_URL } from "./api-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const $ = (id) => document.getElementById(id);
const notice = $("notice");
const messageList = $("messageList");
const readerPanel = $("readerPanel");
const folderList = $("folderList");
const composeDialog = $("composeDialog");
let currentUser = null;
let currentFolder = "INBOX";
let loadedMessages = [];
let selectedUid = null;

function setNotice(text, isError = false) {
  notice.textContent = text;
  notice.classList.add("show");
  notice.classList.toggle("error", isError);
}
function clearNotice() {
  notice.textContent = "";
  notice.classList.remove("show", "error");
}
function escapeText(value) {
  return String(value ?? "");
}
function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
function displayAddress(address) {
  if (!address) return "Unknown sender";
  if (typeof address === "string") return address;
  const name = [address.name, address.address].filter(Boolean);
  return name.join(" ");
}
async function api(path, options = {}) {
  if (!API_BASE_URL) throw new Error("Backend URL is not configured. Set API_BASE_URL in api-config.js after the backend is deployed.");
  const token = await currentUser.getIdToken();
  const response = await fetch(API_BASE_URL.replace(/\/$/, "") + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function renderFolders(folders) {
  folderList.replaceChildren();
  const preferred = ["INBOX", "Sent", "Drafts", "Junk", "Trash", "Archive"];
  const sorted = [...folders].sort((a, b) => {
    const ai = preferred.indexOf(a.path);
    const bi = preferred.indexOf(b.path);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  for (const folder of sorted) {
    const button = document.createElement("button");
    button.className = "folder" + (folder.path === currentFolder ? " active" : "");
    button.dataset.folder = folder.path;
    button.textContent = folder.specialUse === "\\Sent" ? "↗ " : folder.path === "INBOX" ? "▣ " : "▤ ";
    const label = document.createElement("span");
    label.textContent = folder.name || folder.path;
    button.append(label);
    button.addEventListener("click", () => loadFolder(folder.path));
    folderList.append(button);
  }
}
function renderMessages() {
  const query = $("searchInput").value.trim().toLowerCase();
  const visible = loadedMessages.filter((message) =>
    [message.from, message.subject, message.preview].join(" ").toLowerCase().includes(query)
  );
  messageList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = loadedMessages.length ? "No messages match your search." : "No messages in this folder.";
    messageList.append(empty);
    return;
  }
  for (const message of visible) {
    const button = document.createElement("button");
    button.className = "message-row" + (String(message.uid) === String(selectedUid) ? " selected" : "");
    const top = document.createElement("div");
    top.className = "row-top";
    const from = document.createElement("strong");
    from.textContent = message.from || "Unknown sender";
    const time = document.createElement("time");
    time.textContent = formatDate(message.date);
    top.append(from, time);
    const subject = document.createElement("span");
    subject.className = "subject";
    subject.textContent = message.subject || "(No subject)";
    const preview = document.createElement("span");
    preview.className = "preview";
    preview.textContent = message.preview || "No preview available";
    button.append(top, subject, preview);
    button.addEventListener("click", () => openMessage(message.uid));
    messageList.append(button);
  }
}
async function loadFolder(folder) {
  currentFolder = folder;
  selectedUid = null;
  $("folderTitle").textContent = folder.split(/[/.]/).filter(Boolean).pop() || "Inbox";
  readerPanel.innerHTML = '<div class="reader-empty"><div class="reader-icon">✉</div><h2>Select a message</h2><p>Choose an email from your inbox to read it here.</p></div>';
  try {
    clearNotice();
    messageList.innerHTML = '<div class="empty-state">Loading messages…</div>';
    const data = await api(`/api/mail/messages?folder=${encodeURIComponent(folder)}&page=1`);
    loadedMessages = data.messages || [];
    renderFolders(data.folders || []);
    renderMessages();
  } catch (error) {
    loadedMessages = [];
    renderMessages();
    setNotice(error.message, true);
  }
}
async function loadFolders() {
  const data = await api("/api/mail/folders");
  renderFolders(data.folders || []);
}
async function openMessage(uid) {
  selectedUid = uid;
  renderMessages();
  try {
    clearNotice();
    const data = await api(`/api/mail/messages/${encodeURIComponent(uid)}?folder=${encodeURIComponent(currentFolder)}`);
    const message = data.message;
    readerPanel.replaceChildren();
    const article = document.createElement("article");
    article.className = "reader-content";
    const actions = document.createElement("div");
    actions.className = "reader-actions";
    const reply = document.createElement("button");
    reply.className = "quiet-button";
    reply.textContent = "↶ Reply";
    reply.addEventListener("click", () => openCompose({
      to: message.replyTo || message.fromAddress || "",
      subject: /^re:/i.test(message.subject || "") ? message.subject : `Re: ${message.subject || ""}`,
      text: `\n\n--- Original message ---\nFrom: ${message.from || ""}\n\n${message.text || ""}`
    }));
    actions.append(reply);
    const heading = document.createElement("h2");
    heading.textContent = message.subject || "(No subject)";
    article.append(actions, heading);
    for (const [label, value] of [["From", message.from], ["To", message.to], ["Date", formatDate(message.date)]]) {
      const line = document.createElement("div");
      line.className = "meta-line";
      const strong = document.createElement("strong");
      strong.textContent = label;
      line.append(strong, document.createTextNode(escapeText(value)));
      article.append(line);
    }
    const body = document.createElement("div");
    body.className = "reader-body";
    body.textContent = message.text || "(This email has no plain-text body.)";
    article.append(body);
    readerPanel.append(article);
    renderMessages();
  } catch (error) {
    setNotice(error.message, true);
  }
}
function openCompose(prefill = {}) {
  $("composeTo").value = prefill.to || "";
  $("composeSubject").value = prefill.subject || "";
  $("composeText").value = prefill.text || "";
  $("composeMessage").textContent = "";
  composeDialog.showModal();
}
$("composeButton").addEventListener("click", () => openCompose());
$("closeCompose").addEventListener("click", () => composeDialog.close());
$("searchInput").addEventListener("input", renderMessages);
$("refreshButton").addEventListener("click", () => loadFolder(currentFolder));
$("logoutButton").addEventListener("click", async () => {
  try { await api("/api/audit/logout", { method: "POST" }); } catch {}
  await signOut(auth);
  window.location.replace("./index.html");
});
$("composeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("sendButton");
  button.disabled = true;
  button.textContent = "Sending…";
  $("composeMessage").textContent = "";
  try {
    await api("/api/mail/send", {
      method: "POST",
      body: JSON.stringify({
        to: $("composeTo").value.trim(),
        subject: $("composeSubject").value.trim(),
        text: $("composeText").value
      })
    });
    $("composeMessage").textContent = "Message sent.";
    setTimeout(() => composeDialog.close(), 700);
    if (currentFolder.toLowerCase().includes("sent")) await loadFolder(currentFolder);
  } catch (error) {
    $("composeMessage").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Send message";
  }
});
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("./index.html");
    return;
  }
  currentUser = user;
  $("signedInUser").textContent = user.email || "Authorised official";
  if ((user.email || "").toLowerCase() === "admin@codebihin.in") { try { await api("/api/admin/status"); $("adminLink").hidden = false; } catch {} }
  try {
    await loadFolders();
    await loadFolder("INBOX");
  } catch (error) {
    setNotice(error.message, true);
  }
});
