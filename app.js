
const $ = id => document.getElementById(id);

let historicalData = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
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
  if (text.includes("test")) return "Test International";
  if (text.includes("odi") || text.includes("one day")) return "ODI International";
  if (text.includes("t20")) return "T20 International";
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

  const option = [...select.options].find(item =>
    item.text.trim().toLowerCase() === value.toLowerCase() ||
    item.value.trim().toLowerCase() === value.toLowerCase()
  );

  if (option) select.value = option.value;
}

function selectedFormatKey() {
  const value = (
    $("format")?.selectedOptions?.[0]?.textContent ||
    $("format")?.value || ""
  ).toLowerCase();

  if (value.includes("test")) return "Test";
  if (value.includes("odi") || value.includes("one day")) return "ODI";
  return "T20";
}

function getFormatData() {
  return historicalData?.formats?.[selectedFormatKey()]?.teams ?? {};
}

/* Country flags used as team badges.
   Franchise teams without a country match use initials. */
function teamBadge(teamName) {
  const rawName = String(teamName ?? "").trim();
  const key = rawName.toLowerCase();

  const countries = {
    "pakistan": "pk",
    "india": "in",
    "england": "gb-eng",
    "new zealand": "nz",
    "australia": "au",
    "south africa": "za",
    "sri lanka": "lk",
    "bangladesh": "bd",
    "afghanistan": "af",
    "zimbabwe": "zw",
    "ireland": "ie",
    "scotland": "gb-sct",
    "west indies": "jm",
    "nepal": "np",
    "netherlands": "nl",
    "united arab emirates": "ae",
    "oman": "om",
    "united states": "us",
    "usa": "us",
    "canada": "ca",
    "namibia": "na",
    "uganda": "ug",
    "kenya": "ke",
    "hong kong": "hk",
    "papua new guinea": "pg"
  };

  const initials = rawName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase() || "🏏";

  const code = countries[key];

  if (code) {
    return `
      <div class="cg-team-badge" aria-label="${esc(rawName)} badge">
        <img
          src="https://flagcdn.com/w160/${code}.png"
          alt="${esc(rawName)} flag"
          loading="lazy"
          onerror="this.onerror=null;this.outerHTML='<span class=&quot;cg-initials&quot;>${initials}</span>'"
        >
      </div>
    `;
  }

  return `
    <div class="cg-team-badge cg-initials"
         aria-label="${esc(rawName)} badge">
      ${esc(initials)}
    </div>
  `;
}

function findTeamStats(teamName) {
  const teams = getFormatData();
  if (!teamName) return null;

  const target = teamName.trim().toLowerCase();

  const exact = Object.keys(teams).find(
    team => team.trim().toLowerCase() === target
  );

  if (exact) return teams[exact];

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
  const found = Object.keys(teams).find(
    team => candidates.includes(team.trim().toLowerCase())
  );

  return found ? teams[found] : null;
}

function teamSummary(teamName) {
  const stats = findTeamStats(teamName);
  const format = selectedFormatKey();

  if (!stats) {
    return `
      <section class="cg-stats">
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
    <section class="cg-stats">
      <h4>${esc(teamName)} — ${esc(format)}</h4>
      <p>Historical matches: <strong>${matches.toLocaleString()}</strong></p>
      <p>Wins: <strong>${wins.toLocaleString()}</strong> ·
         Losses: <strong>${losses.toLocaleString()}</strong></p>
      <p>Draws: <strong>${Number(stats.draws) || 0}</strong> ·
         No results: <strong>${Number(stats.no_results) || 0}</strong></p>
      <p>Historical win rate: <strong>${winRate}%</strong></p>
      <p>Average runs per batting innings: <strong>${avgRuns}</strong></p>
      ${
        recent.length
          ? `<p><strong>Latest recorded results:</strong></p>
             <ul>${recent.map(item => `
               <li>${esc(item.date)} — ${esc(item.result)}
               vs ${esc(item.opponent)}
               (${Number(item.runs) || 0}–${Number(item.opponent_runs) || 0})</li>
             `).join("")}</ul>`
          : ""
      }
    </section>
  `;
}

function experimentalWinnerPrediction(teamA, teamB) {
  const statsA = findTeamStats(teamA);
  const statsB = findTeamStats(teamB);

  if (!statsA || !statsB) {
    return `
      <section class="cg-prediction">
        <h3>🏏 Historical comparison</h3>
        <p>Dono teams ka selected format mein historical record zaroori hai.</p>
      </section>
    `;
  }

  const matchesA = Number(statsA.matches) || 0;
  const matchesB = Number(statsB.matches) || 0;
  const winsA = Number(statsA.wins) || 0;
  const winsB = Number(statsB.wins) || 0;

  if (!matchesA || !matchesB) {
    return `<section class="cg-prediction"><p>Historical sample available nahi hai.</p></section>`;
  }

  const rateA = (winsA + 1) / (matchesA + 2);
  const rateB = (winsB + 1) / (matchesB + 2);
  const total = rateA + rateB;

  const chanceA = Math.round(rateA / total * 100);
  const chanceB = 100 - chanceA;

  let comparison = "Dono teams ka estimate barabar hai.";
  if (chanceA > chanceB) comparison = `${esc(teamA)} ka historical win-rate estimate zyada hai.`;
  if (chanceB > chanceA) comparison = `${esc(teamB)} ka historical win-rate estimate zyada hai.`;

  return `
    <section class="cg-prediction">
      <div class="cg-prediction-heading">
        <span>🏏</span>
        <div>
          <p class="cg-eyebrow">MATCH LAB</p>
          <h3>${esc(teamA)} vs ${esc(teamB)}</h3>
          <p class="cg-subtitle">${esc(selectedFormatKey())} · Historical comparison</p>
        </div>
      </div>

      <div class="cg-team-row">
        ${teamBadge(teamA)}
        <div class="cg-team-info">
          <div class="cg-team-name">${esc(teamA)}</div>
          <div class="cg-percent">${chanceA}%</div>
          <div class="cg-track">
            <div class="cg-bar cg-bar-a" style="width:${chanceA}%"></div>
          </div>
        </div>
      </div>

      <div class="cg-team-row">
        ${teamBadge(teamB)}
        <div class="cg-team-info">
          <div class="cg-team-name">${esc(teamB)}</div>
          <div class="cg-percent">${chanceB}%</div>
          <div class="cg-track">
            <div class="cg-bar cg-bar-b" style="width:${chanceB}%"></div>
          </div>
        </div>
      </div>

      <div class="cg-divider"></div>
      <p class="cg-comparison">${comparison}</p>
      <p class="cg-disclaimer">
        Yeh percentages selected format ke historical win rates ka relative comparison hain,
        verified match-winning probabilities nahi. Toss, playing XI, current form,
        venue aur pitch is calculation mein shamil nahi hain. Exact score prediction nahi hai.
      </p>
    </section>
  `;
}

function addPredictionStyles() {
  if ($("cg-prediction-styles")) return;

  const style = document.createElement("style");
  style.id = "cg-prediction-styles";
  style.textContent = `
    .cg-prediction {
      margin: 22px 0;
      padding: 22px;
      border: 1px solid var(--line, #303642);
      border-radius: 22px;
      background: linear-gradient(145deg, #101b2a, #080d16);
      color: #f8fafc;
      box-shadow: 0 14px 40px rgba(0,0,0,.2);
    }
    .cg-prediction-heading {
      display: flex; align-items: center; gap: 14px; margin-bottom: 25px;
    }
    .cg-prediction-heading > span {
      display: grid; place-items: center; width: 48px; height: 48px;
      border-radius: 15px; background: #18334a; font-size: 25px;
    }
    .cg-prediction h3 { margin: 0 0 5px; overflow-wrap: anywhere; }
    .cg-eyebrow { margin: 0 0 4px; color: #5eead4; font-size: 11px; letter-spacing: 2px; }
    .cg-subtitle { margin: 0; color: #9caec2; font-size: 13px; }
    .cg-team-row { display: flex; align-items: center; gap: 16px; margin: 20px 0; }
    .cg-team-badge {
      flex: 0 0 76px; width: 76px; height: 76px; overflow: hidden;
      display: grid; place-items: center; border-radius: 19px;
      background: #f8fafc; border: 1px solid rgba(255,255,255,.15);
    }
    .cg-team-badge img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .cg-initials {
      background: #18334a; color: #fff; font-size: 24px; font-weight: 800;
    }
    .cg-team-info { flex: 1; min-width: 0; }
    .cg-team-name { font-size: 17px; font-weight: 700; overflow-wrap: anywhere; }
    .cg-percent { margin: 3px 0 9px; font-size: 31px; font-weight: 800; }
    .cg-track { height: 10px; background: #303640; border-radius: 20px; overflow: hidden; }
    .cg-bar { height: 100%; border-radius: 20px; transition: width .4s ease; }
    .cg-bar-a { background: linear-gradient(90deg, #0f9f6e, #43d9a0); }
    .cg-bar-b { background: linear-gradient(90deg, #397de5, #70aaff); }
    .cg-divider { height: 1px; background: rgba(255,255,255,.12); margin: 25px 0; }
    .cg-comparison { font-weight: 700; }
    .cg-disclaimer { color: #aab6c5; font-size: 13px; line-height: 1.65; margin-bottom: 0; }
    .cg-stats {
      margin: 12px 0; padding: 16px;
      border: 1px solid var(--line, #303642); border-radius: 14px;
    }
    .cg-stats h4 { margin-top: 0; }
    @media (max-width: 380px) {
      .cg-prediction { padding: 15px; }
      .cg-team-badge { flex-basis: 60px; width: 60px; height: 60px; border-radius: 14px; }
      .cg-percent { font-size: 27px; }
    }
  `;
  document.head.appendChild(style);
}

async function loadHistoricalData() {
  try {
    const response = await fetch("./data/cricsheet-team-stats.json?v=" + Date.now());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const matches = Array.isArray(json) ? json : json.data ?? json.matches ?? [];
    const now = Date.now();

    const upcoming = matches
      .filter(match => {
        const time = Date.parse(kickoff(match));
        const matchStatus = String(match.status ?? "").toLowerCase();
        return Number.isFinite(time) && time >= now &&
          ["scheduled", "upcoming", "not_started"].includes(matchStatus);
      })
      .sort((a, b) => Date.parse(kickoff(a)) - Date.parse(kickoff(b)));

    if (!upcoming.length) {
      status.textContent = `Data file mein ${matches.length} matches hain, lekin future scheduled matches nahi mile.`;
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
          if ($("date")) $("date").value =
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          if ($("time")) $("time").value =
            `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        }

        $("lab")?.scrollIntoView({ behavior: "smooth" });
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
    result.innerHTML = "<p>Loading historical records...</p>";

    if (!historicalData && !(await loadHistoricalData())) {
      result.innerHTML = "<p>Historical data load nahi ho saka. Data file aur deployment check karein.</p>";
      return;
    }

    const teamA = $("a")?.value?.trim() || "";
    const teamB = $("b")?.value?.trim() || "";

    if (!teamA || !teamB) {
      result.innerHTML = "<p>Please select both teams first.</p>";
      return;
    }

    if (teamA.toLowerCase() === teamB.toLowerCase()) {
      result.innerHTML = "<p>Bhai, analysis ke liye do different teams select karein.</p>";
      return;
    }

    addPredictionStyles();

    result.innerHTML = `
      <h3>${esc(teamA)} vs ${esc(teamB)}</h3>
      <p><strong>Selected format:</strong> ${esc(selectedFormatKey())}</p>
      <p>Historical data source: Cricsheet</p>
      ${experimentalWinnerPrediction(teamA, teamB)}
      ${teamSummary(teamA)}
      ${teamSummary(teamB)}
    `;
  });
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

async function initialiseApp() {
  await Promise.all([loadHistoricalData(), loadCricketMatches()]);
}

initialiseApp();
    
