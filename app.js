
const $ = id => document.getElementById(id);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function name(team) {
  return typeof team === "string" ? team : team?.name ?? "Unknown team";
}

function kickoff(match) {
  return match.kickoff_utc ?? match.kickoff ?? match.date ?? match.start_time ?? "";
}

function showDate(match) {
  const value = kickoff(match);
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleString()
    : "Date unavailable";
}

async function loadCricketMatches() {
  const status = $("matches-status");
  const list = $("matches-list");
  if (!status || !list) return;

  status.textContent = "Loading matches...";
  list.innerHTML = "";

  try {
    const response = await fetch("./matches.json?v=" + Date.now());
    if (!response.ok) {
      throw new Error(`Could not load matches.json (${response.status})`);
    }

    const json = await response.json();
    const matches = Array.isArray(json) ? json : json.data ?? json.matches ?? [];

    const upcoming = matches
      .filter(m => {
        const time = Date.parse(kickoff(m));
        const matchStatus = String(m.status ?? "").toLowerCase();

        return Number.isFinite(time) &&
          time >= Date.now() &&
          ["scheduled", "upcoming", "not_started"].includes(matchStatus);
      })
      .sort((a, b) => Date.parse(kickoff(a)) - Date.parse(kickoff(b)));

    if (!upcoming.length) {
      status.textContent =
        `Data file mein ${matches.length} matches hain, lekin future scheduled matches nahi mile.`;
      return;
    }

    status.textContent = `${upcoming.length} upcoming matches loaded.`;

    list.innerHTML = upcoming.map((m, i) => `
      <article class="match-card" style="margin:12px 0;padding:16px;border:1px solid var(--line);border-radius:12px">
        <p class="eyebrow">${esc(m.league ?? m.competition ?? "Cricket")}</p>
        <h3>${esc(name(m.home))} <em>vs</em> ${esc(name(m.away))}</h3>
        <p class="meta">${esc(showDate(m))} · ${esc(m.status ?? "scheduled")}</p>
        <button class="button choose-match" type="button" data-index="${i}">
          Analyze this match →
        </button>
      </article>
    `).join("");

    list.querySelectorAll(".choose-match").forEach(button => {
      button.addEventListener("click", () => {
        const m = upcoming[Number(button.dataset.index)];
        if ($("a")) $("a").value = name(m.home);
        if ($("b")) $("b").value = name(m.away);
        if ($("date")) $("date").value = kickoff(m).slice(0, 10);
        if ($("lab")) $("lab").scrollIntoView({ behavior: "smooth" });
      });
    });
  } catch (error) {
    status.textContent = `Could not load matches: ${error.message}`;
  }
}

$("refresh-matches")?.addEventListener("click", loadCricketMatches);

if ($("form")) {
  $("form").addEventListener("submit", event => {
    event.preventDefault();
    const result = $("result");
    if (!result) return;

    result.hidden = false;
    result.innerHTML = `
      <h3>${esc($("a")?.value)} vs ${esc($("b")?.value)}</h3>
      <p>Match data connection is available, but a validated winner prediction model is not connected yet.</p>
      <p>Expected score is not available yet; no score will be invented.</p>
    `;
  });
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

loadCricketMatches();
