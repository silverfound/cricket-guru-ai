
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

function getFormat(match) {
  const text = `${match.league ?? ""} ${match.format ?? ""} ${match.sport ?? ""}`.toLowerCase();

  if (text.includes("odi") || text.includes("one day")) {
    return "ODI International";
  }

  if (text.includes("t20")) {
    return "T20 International";
  }

  if (text.includes("test")) {
    return "Test International";
  }

  return "Major T20 League";
}

function getCompetition(match) {
  const league = String(match.league ?? match.competition ?? "").toLowerCase();

  if (league.includes("ipl")) return "IPL";
  if (league.includes("psl")) return "PSL";
  if (league.includes("bbl") || league.includes("wbbl")) return "BBL / WBBL";
  if (league.includes("cpl") || league.includes("wcpl")) return "CPL / WCPL";
  if (league.includes("ilt20")) return "ILT20 (UAE)";
  if (league.includes("major league cricket")) return "Major League Cricket";
  if (league.includes("sa20")) return "SA20";
  if (league.includes("bpl")) return "BPL";
  if (league.includes("lanka premier")) return "Lanka Premier League";
  if (league.includes("wpl")) return "WPL";
  if (league.includes("hundred")) return "The Hundred";

  return "International";
}

function fillSelect(id, value) {
  const select = $(id);
  if (!select || !value) return;

  const option = [...select.options].find(
    item => item.text.trim().toLowerCase() === value.toLowerCase()
  );

  if (option) select.value = option.value;
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
    const matches = Array.isArray(json)
      ? json
      : json.data ?? json.matches ?? [];

    const now = Date.now();

    const upcoming = matches
      .filter(match => {
        const time = Date.parse(kickoff(match));
        const matchStatus = String(match.status ?? "").toLowerCase();

        return Number.isFinite(time) &&
          time >= now &&
          ["scheduled", "upcoming", "not_started"].includes(matchStatus);
      })
      .sort((a, b) => Date.parse(kickoff(a)) - Date.parse(kickoff(b)));

    if (!upcoming.length) {
      status.textContent =
        `Data file mein ${matches.length} matches hain, lekin future scheduled matches nahi mile.`;
      return;
    }

    status.textContent = `${upcoming.length} upcoming matches loaded.`;

    list.innerHTML = upcoming.map((match, index) => `
      <article class="match-card" style="margin:12px 0;padding:16px;border:1px solid var(--line);border-radius:12px">
        <p class="eyebrow">${esc(match.league ?? match.competition ?? "Cricket")}</p>
        <h3>${esc(name(match.home))} <em>vs</em> ${esc(name(match.away))}</h3>
        <p class="meta">${esc(showDate(match))} · ${esc(match.status ?? "scheduled")}</p>
        <button class="button choose-match" type="button" data-index="${index}">
          Analyze this match →
        </button>
      </article>
    `).join("");

    list.querySelectorAll(".choose-match").forEach(button => {
      button.addEventListener("click", () => {
        const match = upcoming[Number(button.dataset.index)];
        if (!match) return;

        const teamA = name(match.home);
        const teamB = name(match.away);
        const dateValue = kickoff(match);
        const date = new Date(dateValue);

        if ($("a")) $("a").value = teamA;
        if ($("b")) $("b").value = teamB;

        fillSelect("format", getFormat(match));
        fillSelect("league", getCompetition(match));

        if (!Number.isNaN(date.getTime())) {
          if ($("date")) {
            $("date").value =
              `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          }

          if ($("time")) {
            $("time").value =
              `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
          }
        }

        if ($("lab")) {
          $("lab").scrollIntoView({ behavior: "smooth" });
        }
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
