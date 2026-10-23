
const $ = id => document.getElementById(id);

const API = "https://cricket-guru-api.silverfound23.workers.dev";

const reduce = n => {
  while (n > 9 && ![11, 22, 33].includes(n)) {
    n = String(n).split("").reduce((s, d) => s + Number(d), 0);
  }
  return n;
};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function teamName(team) {
  if (typeof team === "string") return team;
  return team?.name ?? team?.display_name ?? "Unknown team";
}

function matchDate(match) {
  const value = match.kickoff ?? match.date ?? match.start_time ?? "";
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleString()
    : "Date unavailable";
}

async function loadCricketMatches() {
  const status = $("matches-status");
  const list = $("matches-list");

  if (!status || !list) return;

  status.textContent = "Loading upcoming matches...";
  list.innerHTML = "";

  try {
    const response = await fetch(`${API}/matches?limit=50`);
    if (!response.ok) throw new Error(`API status ${response.status}`);

    const json = await response.json();
    const matches = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.matches)
          ? json.matches
          : [];

    if (!matches.length) {
      status.textContent = "No matches returned by the data provider.";
      return;
    }

    const now = Date.now();

    const upcoming = matches
      .filter(m => {
        const statusText = String(m.status ?? "").toLowerCase();
        const dateValue = m.kickoff ?? m.date ?? m.start_time;
        const time = Date.parse(dateValue ?? "");

        return (
          Number.isFinite(time) &&
          time >= now &&
          !["completed", "finished", "cancelled", "abandoned", "live", "in progress"].includes(statusText)
        );
      })
      .sort((x, y) =>
        Date.parse(x.kickoff ?? x.date ?? x.start_time) -
        Date.parse(y.kickoff ?? y.date ?? y.start_time)
      );

    status.textContent = upcoming.length
      ? `${upcoming.length} upcoming matches found in the matches returned by the API.`
      : "No future fixtures found in this API response. More fixtures may exist beyond the returned results.";

    list.innerHTML = upcoming.map((m, index) => `
      <article class="match-card" style="margin:12px 0;padding:16px;border:1px solid var(--line);border-radius:12px">
        <p class="eyebrow">${esc(m.league ?? m.competition ?? "Cricket")}</p>
        <h3>${esc(teamName(m.home ?? m.home_team))} <em>vs</em> ${esc(teamName(m.away ?? m.away_team))}</h3>
        <p class="meta">${esc(matchDate(m))}</p>
        <p class="meta">Status: ${esc(m.status ?? "Scheduled")}</p>
        <button class="button choose-match" type="button" data-match-index="${index}">
          Analyze this match →
        </button>
      </article>
    `).join("");

    list.querySelectorAll(".choose-match").forEach(button => {
      button.addEventListener("click", () => {
        const m = upcoming[Number(button.dataset.matchIndex)];
        $("a").value = teamName(m.home ?? m.home_team);
        $("b").value = teamName(m.away ?? m.away_team);

        const competition = String(m.league ?? m.competition ?? "").toLowerCase();
        if (competition.includes("ipl")) $("league").value = "IPL";
        else if (competition.includes("psl")) $("league").value = "PSL";
        else if (competition.includes("t20i")) $("format").value = "T20 International";
        else if (competition.includes("odi")) $("format").value = "ODI International";

        const dateValue = m.kickoff ?? m.date ?? m.start_time;
        const date = new Date(dateValue);
        if (!Number.isNaN(date.getTime())) {
          $("date").value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          $("time").value = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        }

        $("lab").scrollIntoView({ behavior: "smooth" });
      });
    });
  } catch (error) {
    status.textContent = `Could not load fixtures: ${error.message}`;
  }
}

$("refresh-matches")?.addEventListener("click", loadCricketMatches);

$("form").addEventListener("submit", async e => {
  e.preventDefault();

  const a = $("a").value.trim();
  const b = $("b").value.trim();
  const date = $("date").value;

  const day = date
    ? new Date(date + "T12:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        timeZone: "UTC"
      })
    : "Not entered";

  const num = date
    ? reduce(date.replaceAll("-", "").split("")
        .reduce((s, d) => s + Number(d), 0))
    : "Not entered";

  const r = $("result");
  r.hidden = false;
  r.innerHTML = "<p>Loading cricket data...</p>";
  r.scrollIntoView({ behavior: "smooth" });

  try {
    const response = await fetch(`${API}/matches?limit=50`);
    if (!response.ok) throw new Error(`API status ${response.status}`);

    const json = await response.json();
    const matches = Array.isArray(json)
      ? json
      : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.matches)
          ? json.matches
          : [];

    const matching = matches.filter(m => {
      const home = teamName(m.home ?? m.home_team).toLowerCase();
      const away = teamName(m.away ?? m.away_team).toLowerCase();
      return (
        (home.includes(a.toLowerCase()) && away.includes(b.toLowerCase())) ||
        (home.includes(b.toLowerCase()) && away.includes(a.toLowerCase()))
      );
    });

    r.innerHTML = `
      <p class="eyebrow">CRICKET GURU AI · MATCH REPORT</p>
      <h3>${esc(a)} <em>vs</em> ${esc(b)}</h3>
      <p class="meta">${esc($("format").value)} · ${esc($("league").value)}<br>
      Day: ${esc(day)} · Date: ${esc(date || "Not entered")}<br>
      Time: ${esc($("time").value || "Not entered")}<br>
      Ground: ${esc($("ground").value || "Not entered")}</p>
      <hr style="border-color:var(--line)">
      <p><b>API connection:</b> Connected successfully.</p>
      <p><b>Matches returned:</b> ${matches.length}</p>
      <p><b>Exact team match found:</b> ${matching.length ? "Yes" : "Not in returned results"}</p>
      ${matching.map(m => `<p>${esc(teamName(m.home ?? m.home_team))} vs ${esc(teamName(m.away ?? m.away_team))} — ${esc(m.status ?? "Unknown")} — ${esc(matchDate(m))}</p>`).join("")}
      <p><b>Winner probability:</b> Not available yet; a validated prediction model is still needed.</p>
      <p><b>Expected score:</b> Not available yet.</p>
      <p><b>Captain names:</b> ${esc($("ca").value || "Not entered")} / ${esc($("cb").value || "Not entered")}</p>
      <p><b>Date numerology:</b> ${num} <span class="meta">(symbolic only)</span></p>
      <p class="meta">Abjad, astrology and numerology are symbolic features, not scientifically validated prediction methods.</p>
    `;
  } catch (error) {
    r.innerHTML = `<p>Could not load cricket data: ${esc(error.message)}</p>`;
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

loadCricketMatches();
