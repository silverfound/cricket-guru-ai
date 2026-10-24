const $=id=>document.getElementById(id);let historicalData=null;
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function teamName(v){return typeof v==='string'?v:v?.name??'Unknown team';}
function fmt(){return $('format').value.toLowerCase().includes('odi')?'ODI':$('format').value.toLowerCase().includes('international')?'T20I':'LEAGUE';}
function leagueKey(v){let n=norm(v);if(n.includes('wbbl'))return 'wbbl';if(n.includes('bbl'))return 'bbl';if(n.includes('wcpl'))return 'wcpl';if(n.includes('cpl'))return 'cpl';return ({ipl:'ipl',psl:'psl',ilt20:'ilt20',majorleaguecricket:'majorleaguecricket',sa20:'sa20',bpl:'bpl',lankapremierleague:'lankapremierleague',wpl:'wpl',thehundred:'thehundred'})[n]||n;}
const groups=[['sydney sixers','sidney sixers','sixers'],['brisbane heat','heat'],['melbourne stars','stars'],['perth scorchers','scorchers'],['adelaide strikers','strikers'],['hobart hurricanes','hurricanes'],['sydney thunder','thunder'],['melbourne renegades','renegades'],['lahore qalandars'],['karachi kings'],['islamabad united'],['peshawar zalmi'],['quetta gladiators'],['multan sultans'],['mumbai indians','mi'],['chennai super kings','csk'],['royal challengers bengaluru','royal challengers bangalore','rcb'],['kolkata knight riders','kkr'],['rajasthan royals','rr'],['sunrisers hyderabad','srh'],['punjab kings','pbks'],['delhi capitals','dc'],['gujarat titans','gt'],['lucknow super giants','lsg']];
function bucket(){if(!historicalData)return null;let f=fmt();if(f==='ODI')return historicalData.formats?.ODI;if(f==='T20I')return historicalData.formats?.T20I||historicalData.formats?.T20;let k=leagueKey($('league').value);return historicalData.competitions?.[k]||historicalData.formats?.LEAGUE?.competitions?.[k]||null;}
function statsFor(name){let b=bucket();if(!b)return null;let t=b.teams||b,keys=Object.keys(t),n=norm(name),key=keys.find(k=>norm(k)===n);if(!key){let g=groups.find(g=>g.some(x=>norm(x)===n));if(g)key=keys.find(k=>g.some(x=>norm(x)===norm(k)));}if(!key){let poss=keys.filter(k=>norm(k).includes(n)||n.includes(norm(k)));if(poss.length===1)key=poss[0];}return key?t[key]:null;}
const flag={pakistan:'pk',india:'in',england:'gb-eng',australia:'au',newzealand:'nz',southafrica:'za',srilanka:'lk',bangladesh:'bd',afghanistan:'af',ireland:'ie',zimbabwe:'zw',westindies:'jm'};
function badge(n){let c=flag[norm(n)],ini=n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();return c?`<div class="cg-team-badge"><img src="https://flagcdn.com/w160/${c}.png" alt="${esc(n)} flag"></div>`:`<div class="cg-team-badge cg-initials">${esc(ini)}</div>`;}
function teamCard(n){let s=statsFor(n);if(!s)return `<section class="cg-stats"><h4>${esc(n)}</h4><p>Is selected format/competition mein record nahi mila. Doosri league ka data substitute nahi kiya gaya. Spelling ya source coverage check karein.</p></section>`;let m=+s.matches||0,w=+s.wins||0,l=+s.losses||0,avg=+s.innings_batted?(+s.runs_scored/+s.innings_batted).toFixed(1):'N/A',recent=(s.recent_results||[]).slice(-5).reverse();return `<section class="cg-stats"><h4>${esc(n)} — ${esc(fmt()==='LEAGUE'?$('league').value:fmt())}</h4><p>Historical matches: <b>${m}</b></p><p>Wins: <b>${w}</b> · Losses: <b>${l}</b></p><p>Draws: <b>${+s.draws||0}</b> · No results: <b>${+s.no_results||0}</b></p><p>Historical win rate: <b>${m?(w/m*100).toFixed(1):'0.0'}%</b></p><p>Average runs per innings: <b>${avg}</b></p>${recent.length?'<p><b>Latest recorded results</b></p><ul>'+recent.map(x=>`<li>${esc(x.date)} — ${esc(x.result)} vs ${esc(x.opponent)} (${+x.runs||0}–${+x.opponent_runs||0})</li>`).join('')+'</ul>':''}</section>`;}
function compare(a,b){let x=statsFor(a),y=statsFor(b);if(!x||!y)return `<section class="cg-prediction"><h3>${esc(a)} vs ${esc(b)}</h3><p>Comparison unavailable: one or both teams have no record in this selected dataset.</p></section>`;let mx=+x.matches||0,my=+y.matches||0;if(!mx||!my)return '<section class="cg-prediction">Insufficient records for comparison.</section>';let rx=(+x.wins+1)/(mx+2),ry=(+y.wins+1)/(my+2),pa=Math.round(rx/(rx+ry)*100),pb=100-pa,msg=pa===pb?'Relative historical estimates are equal.':pa>pb?`${esc(a)} ka historical win-rate estimate zyada hai.`:`${esc(b)} ka historical win-rate estimate zyada hai.`;return `<section class="cg-prediction"><p class="eyebrow">PRELIMINARY COMPARISON</p><h3>${esc(a)} vs ${esc(b)}</h3><div class="cg-team-row">${badge(a)}<div class="cg-team-info"><b>${esc(a)}</b><div class="cg-percent">${pa}%</div><div class="cg-track"><div class="cg-bar cg-bar-a" style="width:${pa}%"></div></div></div></div><div class="cg-team-row">${badge(b)}<div class="cg-team-info"><b>${esc(b)}</b><div class="cg-percent">${pb}%</div><div class="cg-track"><div class="cg-bar cg-bar-b" style="width:${pb}%"></div></div></div></div><p>${msg}</p><p class="cg-disclaimer">Historical win-rate comparison only, not a calibrated winning probability. Toss, playing XI, pitch, venue and current conditions are not included. Exact-score prediction is not available.</p></section>`;}
function addStyles(){if($('cg-style'))return;let s=document.createElement('style');s.id='cg-style';s.textContent='.cg-prediction,.cg-stats{margin:18px 0;padding:18px;border:1px solid var(--line);border-radius:16px;background:#0b1a2b}.cg-team-row{display:flex;align-items:center;gap:14px;margin:18px 0}.cg-team-badge{flex:0 0 60px;width:60px;height:60px;display:grid;place-items:center;overflow:hidden;border-radius:14px;background:#eaf0f7;color:#102033;font-weight:800}.cg-team-badge img{width:100%;height:100%;object-fit:cover}.cg-initials{background:#18334a;color:white;font-size:21px}.cg-team-info{flex:1;min-width:0}.cg-percent{font-size:28px;font-weight:800}.cg-track{height:9px;border-radius:20px;background:#303640;overflow:hidden}.cg-bar{height:100%}.cg-bar-a{background:#43d9a0}.cg-bar-b{background:#70aaff}.cg-disclaimer{font-size:13px;color:var(--muted);line-height:1.6}';document.head.appendChild(s);}
async function loadHistory(){try{let r=await fetch('./data/cricsheet-team-stats.json?v='+Date.now());if(!r.ok)throw Error(r.status);let j=await r.json();if(!j.formats)throw Error('formats missing');historicalData=j;return true;}catch(e){console.error(e);return false;}}

async function loadMatches() {
  const st = $('matches-status');
  const list = $('matches-list');
  if (!st || !list) return;

  try {
    const r = await fetch('./matches.json?v=' + Date.now());
    if (!r.ok) throw Error(r.status);

    const j = await r.json();
    const all = Array.isArray(j) ? j : j.data || j.matches || [];

    const getName = value =>
      typeof value === 'string'
        ? value
        : value?.name || value?.short_name || 'Unknown team';

    const getDate = m =>
      m.kickoff_utc || m.kickoff || m.date || m.start_time || '';

    const now = Date.now();

    const up = all
      .filter(m => {
        const d = Date.parse(getDate(m));
        const status = String(m.status || 'scheduled').toLowerCase();

        return Number.isFinite(d) &&
          d >= now &&
          ['scheduled', 'upcoming', 'not_started'].includes(status);
      })
      .sort((a, b) =>
        Date.parse(getDate(a)) - Date.parse(getDate(b))
      );

    if (!up.length) {
      st.textContent = 'No future scheduled matches found.';
      list.innerHTML = '';
      return;
    }

    st.textContent = up.length + ' upcoming matches loaded.';

    list.innerHTML = up.map((m, i) => {
      const home = getName(m.home || m.teams?.[0] || 'Team A');
      const away = getName(m.away || m.teams?.[1] || 'Team B');
      const league = m.league || m.competition || 'Cricket';
      const timestamp = Date.parse(getDate(m));
      const readableDate = Number.isFinite(timestamp)
        ? new Date(timestamp).toLocaleString()
        : 'Date unavailable';

      return `<article class="match-card">
        <h3>${esc(home)} vs ${esc(away)}</h3>
        <p class="meta">${esc(league)} · ${esc(readableDate)}</p>
        <button class="button" data-i="${i}">Analyze this match →</button>
      </article>`;
    }).join('');

    list.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        const m = up[Number(btn.dataset.i)];
        $('a').value = getName(m.home || m.teams?.[0]);
        $('b').value = getName(m.away || m.teams?.[1]);
        
const matchDate = new Date(getDate(m));

if (!Number.isNaN(matchDate.getTime())) {
  const pad = n => String(n).padStart(2, '0');

  $('date').value =
    `${matchDate.getFullYear()}-${pad(matchDate.getMonth() + 1)}-${pad(matchDate.getDate())}`;

  $('time').value =
    `${pad(matchDate.getHours())}:${pad(matchDate.getMinutes())}`;
}
        

        const league = String(m.league || m.competition || '').toLowerCase();
        if (league.includes('odi')) {
          $('format').value = 'ODI International';
        } else if (league.includes('t20i')) {
          $('format').value = 'T20 International';
        }

        $('lab').scrollIntoView({ behavior: 'smooth' });
      };
    });
  } catch (e) {
    st.textContent = 'Fixtures could not be loaded: ' + e.message;
  }
}

$('refresh-matches')?.addEventListener('click',loadMatches);
$('form')?.addEventListener('submit',async e=>{e.preventDefault();let r=$('result');r.hidden=false;r.innerHTML='<p>Loading competition-specific records…</p>';if(!historicalData&&!(await loadHistory())){r.innerHTML='<p>Historical data failed to load. Check that data/cricsheet-team-stats.json exists.</p>';return;}let a=$('a').value.trim(),b=$('b').value.trim();if(!a||!b||norm(a)===norm(b)){r.innerHTML='<p>Enter two different team names.</p>';return;}if(fmt()==='LEAGUE'&&$('league').value==='International'){$('league').focus();r.innerHTML='<p>Major T20 format ke liye specific league select karein.</p>';return;}addStyles();r.innerHTML=`<h3>${esc(a)} vs ${esc(b)}</h3><p><b>Format:</b> ${esc(fmt()==='LEAGUE'?'Major T20 League':fmt())} · <b>Competition:</b> ${esc($('league').value)} · <b>Venue:</b> ${esc($('ground').value||'Not provided')}</p>${compare(a,b)}${teamCard(a)}${teamCard(b)}`;});
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));Promise.all([loadHistory(),loadMatches()]);
                                                                                                        
                                                                                                        
