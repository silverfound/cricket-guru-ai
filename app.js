
const $ = id => document.getElementById(id);

let historicalData = null;

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
  return typeof team === "string"
    ? team
    : team?.name ?? "Unknown team";
}

function kickoff(match) {
  return match.kickoff_utc ??
    match.kickoff ??
    match.date ??
    match.start_time ??
    "";
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

  if (text.includes("test")) return "Test International";
  if (text.includes("odi") || text.includes("one day")) {
    return "ODI International";
  }
  if (text.includes("t20")) return "T20 International";

  return "Major T20 League";
}

function getCompetition(match) {
  const league = String(
    match.league ?? match.competition ?? ""
  ).toLowerCase();

  if (league.includes("ipl")) return "IPL";
  if (league.includes("psl")) return "PSL";
  if (league.includes("bbl") || league.includes("wbbl")) {
    return "BBL / WBBL";
  }
  if (league.includes("cpl") || league.includes("wcpl")) {
    return "CPL / WCPL";
  }
  if (league.includes("ilt20")) return "ILT20 (UAE)";
  if (league.includes("major league cricket")) {
    return "Major League Cricket";
  }
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

  const option = [...select.options].find(item =>
    item.text.trim().toLowerCase() === value.toLowerCase() ||
    item.value.trim().toLowerCase() === value.toLowerCase()
  );

  if (option) select.value = option.value;
}

function selectedFormatKey() {
  const value = (
    $("format")?.selectedOptions?.[0]?.textContent ||
    $("format")?.value ||
    ""
  ).toLowerCase();

  if (value.includes("test")) return "Test";
  if (value.includes("odi") || value.includes("one day")) return "ODI";
  if (value.includes("t20")) return "T20";

  return "T20";
}

function getFormatData() {
  const key = selectedFormatKey();
  return historicalData?.formats?.[key]?.teams ?? {};
}

function findTeamStats(teamName) {
  const teams = getFormatData();
  if (!teamName) return null;

  const target = teamName.trim().toLowerCase();

  const exactMatch = Object.keys(teams).find(
    team => team.trim().toLowerCase() === target
  );

  if (exactMatch) return teams[exactMatch];

  const aliases = {
    "india": ["india", "india men"],
    "new zealand": ["new zealand", "new zealand men"],
    "pakistan": ["pakistan", "pakistan men"],
    "australia": ["australia", "australia men"],
    "england": ["england", "england men"],
    "south africa": ["south africa"],
    "sri lanka": ["sri lanka"],
    "bangladesh": ["bangladesh"],
    "west indies": ["west indies"],
    "afghanistan": ["afghanistan"],
    "zimbabwe": ["zimbabwe"],
    "ireland": ["ireland"],
    "scotland": ["scotland"]
  };

  const candidates = aliases[target] ?? [target];

  const found = Object.keys(teams).find(team =>
    candidates.includes(team.trim().toLowerCase())
  );

  return found ? teams[found] : null;
}

function teamSummary(teamName) {
  const stats = findTeamStats(teamName);
  const format = selectedFormatKey();

  if (!stats) {
    return `
      <section style="margin:12px 0;padding:14px;border:1px solid var(--line);border-radius:12px">
        <h4>${esc(teamName)}</h4>
        <p>${esc(format)} ke liye is team ka record Cricsheet data mein nahi mila.</p>
      </section>
    `;
  }

  const matches = Number(stats.matches) || 0;
  const wins = Number(stats.wins) || 0;
  const losses = Number(stats.losses) || 0;
  const winRate = matches ? (wins / matches * 100).toFixed(1) : "0.0";

  const avgRuns = Number(stats.innings_batted)
    ? (Number(stats.runs_scored) / Number(stats.innings_batted)).toFixed(1)
    : "N/A";

  const recent = Array.isArray(stats.recent_results)
    ? stats.recent_results.slice(-5).reverse()
    : [];

  return `
    <section style="margin:12px 0;padding:14px;border:1px solid var(--line);border-radius:12px">
      <h4>${esc(teamName)} — ${esc(format)}</h4>
      <p>Historical matches: <strong>${matches.toLocaleString()}</strong></p>
      <p>Wins: <strong>${wins.toLocaleString()}</strong> · Losses: <strong>${losses.toLocaleString()}</strong></p>
      <p>Draws: <strong>${Number(stats.draws) || 0}</strong> · No results: <strong>${Number(stats.no_results) || 0}</strong></p>
      <p>Win rate: <strong>${winRate}%</strong></p>
      <p>Average runs per batting innings: <strong>${avgRuns}</strong></p>
      ${
        recent.length
          ? `<p><strong>Latest recorded results:</strong></p>
             <ul>${recent.map(item => `
               <li>
                 ${esc(item.date)} — ${esc(item.result)}
                 vs ${esc(item.opponent)}
                 (${Number(item.runs) || 0}–${Number(item.opponent_runs) || 0})
               </li>
             `).join("")}</ul>`
          : ""
      }
    </section>
  `;
}

async function loadHistoricalData() {
  try {
    const response = await fetch(
      "./data/cricsheet-team-stats.json?v=" + Date.now()
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    if (!json.formats || typeof json.formats !== "object") {
      throw new Error("Format-wise historical data not found");
    }

    historicalData = json;
    return true;
  } catch (error) {
    console.error("Historical data could not load:", error);
    historicalData = null;
    return false;
  }
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
      .sort((a, b) =>
        Date.parse(kickoff(a)) - Date.parse(kickoff(b))
      );

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

        const date = new Date(kickoff(match));

        if ($("a")) $("a").value = name(match.home);
        if ($("b")) $("b").value = name(match.away);

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
  $("form").addEventListener("submit", async event => {
    event.preventDefault();

    const result = $("result");
    if (!result) return;

    result.hidden = false;
    result.innerHTML = "<p>Loading format-specific records...</p>";

    if (!historicalData && !(await loadHistoricalData())) {
      result.innerHTML = `
        <p>Historical data load nahi ho saka. Data file aur website deployment check karein.</p>
      `;
      return;
    }

    const teamA = $("a")?.value?.trim() || "";
    const teamB = $("b")?.value?.trim() || "";
    const format = selectedFormatKey();

    if (!teamA || !teamB) {
      result.innerHTML = "<p>Please select both teams first.</p>";
      return;
    }

    result.innerHTML = `
      <h3>${esc(teamA)} vs ${esc(teamB)}</h3>
      <p><strong>Selected format:</strong> ${esc(format)}</p>
      <p>Historical data source: Cricsheet</p>
      ${teamSummary(teamA)}
      ${teamSummary(teamB)}
      <p style="padding:12px;border-radius:10px;border:1px solid var(--line)">
        <strong>Prediction status:</strong> Format-specific historical records connected hain. Abhi validated winner aur exact-score prediction model available nahi hai.
      </p>
    `;
  });
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

async function initialiseApp() {
  await Promise.all([
    loadHistoricalData(),
    loadCricketMatches()
  ]);
}

initialiseApp();
