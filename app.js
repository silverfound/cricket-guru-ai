
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

async function loadCricketMatches() {
  try {
    const response = await fetch(`${API}/matches?limit=10`);
    if (!response.ok) throw new Error(`API status ${response.status}`);

    const json = await response.json();
    const matches = Array.isArray(json) ? json : json.data;

    if (!Array.isArray(matches)) {
      throw new Error("Unexpected API response");
    }

    return { matches, error: null };
  } catch (error) {
    return { matches: [], error: error.message };
  }
}

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

  const { matches, error } = await loadCricketMatches();

  const teamA = a.toLowerCase();
  const teamB = b.toLowerCase();

  const matching = matches.filter(m => {
    const home = String(m.home?.name ?? m.home ?? "").toLowerCase();
    const away = String(m.away?.name ?? m.away ?? "").toLowerCase();

    return (
      (home.includes(teamA) && away.includes(teamB)) ||
      (home.includes(teamB) && away.includes(teamA))
    );
  });

  const liveData = error
    ? `<p><b>Live data:</b> Could not load matches. ${esc(error)}</p>`
    : `
      <p><b>API connection:</b> Connected successfully.</p>
      <p><b>Matches returned:</b> ${matches.length}</p>
      ${
        matching.length
          ? matching.map(m => `
              <p>
                <b>${esc(m.home?.name ?? m.home)} vs
                ${esc(m.away?.name ?? m.away)}</b><br>
                Status: ${esc(m.status ?? "Unknown")}<br>
                Score: ${esc(
                  m.score
                    ? `${m.score.home ?? "-"} / ${m.score.away ?? "-"}`
                    : "Not available"
                )}<br>
                Date: ${esc(m.kickoff ?? m.date ?? "Not available")}
              </p>
            `).join("")
          : `<p>No exact match between these teams was found in the 10 matches returned by the API. This does not prove the fixture is unavailable.</p>`
      }
      <p><b>Recent matches from API:</b></p>
      ${
        matches.slice(0, 5).map(m => `
          <p>${esc(m.home?.name ?? m.home ?? "Unknown")}
          vs ${esc(m.away?.name ?? m.away ?? "Unknown")}
          — ${esc(m.status ?? "Unknown")}</p>
        `).join("")
      }
    `;

  r.innerHTML = `
    <p class="eyebrow">CRICKET GURU AI · MATCH REPORT</p>
    <h3>${esc(a)} <em>vs</em> ${esc(b)}</h3>
    <p class="meta">
      ${esc($("format").value)} · ${esc($("league").value)}<br>
      Day: ${esc(day)} · Date: ${esc(date || "Not entered")}<br>
      Time: ${esc($("time").value || "Not entered")}<br>
      Ground: ${esc($("ground").value || "Not entered")}
    </p>
    <hr style="border-color:var(--line)">
    ${liveData}
    <hr style="border-color:var(--line)">
    <p><b>Winner probability:</b> Not available yet; a validated model is still needed.</p>
    <p><b>Expected score:</b> Not available yet; no score will be invented.</p>
    <p><b>Captain names:</b>
      ${esc($("ca").value || "Not entered")} /
      ${esc($("cb").value || "Not entered")}
    </p>
    <p><b>Date numerology:</b> ${num}
      <span class="meta">(symbolic date-number reduction only)</span>
    </p>
    <p class="meta">
      Abjad, astrology and numerology are symbolic features, not
      scientifically validated prediction methods.
    </p>
  `;

  r.scrollIntoView({ behavior: "smooth" });
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
