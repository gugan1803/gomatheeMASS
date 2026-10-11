/* AI Decision Network Simulator – logic. Sections: helpers, simulator, multi-attribute, quiz, UI effects */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => (Math.round(n * 100) / 100).toString();
const DEFAULTS = {s0:'Sunny',s1:'Rainy',p0:70,p1:30,d0:'Carry Umbrella',d1:'Do Not Carry Umbrella',u00:5,u01:10,u10:8,u11:-10};
const IDS = Object.keys(DEFAULTS);

/* ---------- 1. Decision network simulator ---------- */
function readSim() {
  const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v; };
  const nm = (id, fb) => $(id).value.trim() || fb;
  return {
    S: [nm('s0','State 1'), nm('s1','State 2')],
    D: [nm('d0','Decision 1'), nm('d1','Decision 2')],
    P: [num('p0'), num('p1')],
    U: [[num('u00'), num('u01')], [num('u10'), num('u11')]]
  };
}
function updateSim() {
  const m = readSim(), total = m.P[0] + m.P[1];
  const bad = m.P.some(p => p < 0 || p > 100) ? 'Each probability must be between 0 and 100.'
            : Math.abs(total - 100) > 0.001 ? `Probabilities add up to ${fmt(total)}%. They must total 100%.` : '';
  $('warn').hidden = !bad; $('warn').textContent = bad;
  const eu = m.D.map((_, d) => m.U[d][0] * m.P[0] / 100 + m.U[d][1] * m.P[1] / 100);
  const w = eu[0] === eu[1] ? -1 : (eu[0] > eu[1] ? 0 : 1);
  [0, 1].forEach(d => {
    const r = $('r' + d);
    r.className = 'glass res' + (d === w ? ' win' : '');
    r.innerHTML = `<h3>${esc(m.D[d])}</h3><div class="v">EU = ${fmt(eu[d])}</div>
      <small>(${fmt(m.P[0]/100)} × ${m.U[d][0]}) + (${fmt(m.P[1]/100)} × ${m.U[d][1]})</small>`;
  });
  const bestTxt = bad ? 'Fix the probabilities first' : (w < 0 ? 'Tie: both decisions are equal' : m.D[w]);
  $('best').textContent = bestTxt;
  // visual network
  $('nS').textContent = `${m.S[0]} ${fmt(m.P[0])}% / ${m.S[1]} ${fmt(m.P[1])}%`;
  $('nO0').textContent = m.D[0]; $('nO1').textContent = m.D[1];
  $('nE').textContent = `EU: ${fmt(eu[0])} vs ${fmt(eu[1])}`;
  $('nB').textContent = '🏆 ' + bestTxt;
  // step-by-step
  const q = d => `<p><b>EU(${esc(m.D[d])})</b> = (${fmt(m.P[0]/100)} × ${m.U[d][0]}) + (${fmt(m.P[1]/100)} × ${m.U[d][1]})
    = ${fmt(m.U[d][0]*m.P[0]/100)} + ${fmt(m.U[d][1]*m.P[1]/100)} = <code>${fmt(eu[d])}</code></p>`;
  $('steps').innerHTML = q(0) + q(1) + `<p><b>Choose the larger EU →</b> <code>${esc(bestTxt)}</code></p>`;
  // value of perfect information
  const perfect = [0, 1].reduce((a, s) => a + m.P[s] / 100 * Math.max(m.U[0][s], m.U[1][s]), 0);
  const maxEU = Math.max(eu[0], eu[1]);
  $('voiBox').innerHTML = `<p><b>Without a forecast:</b> best EU = <code>${fmt(maxEU)}</code></p>
    <p><b>With a perfect forecast:</b> you pick the best action in each state: (${fmt(m.P[0]/100)} × ${Math.max(m.U[0][0],m.U[1][0])}) + (${fmt(m.P[1]/100)} × ${Math.max(m.U[0][1],m.U[1][1])}) = <code>${fmt(perfect)}</code></p>
    <p><b>EVPI</b> = ${fmt(perfect)} − ${fmt(maxEU)} = <code>${fmt(perfect - maxEU)}</code></p>`;
}
IDS.forEach(id => $(id).addEventListener('input', updateSim));
$('reset').onclick = () => { IDS.forEach(id => $(id).value = DEFAULTS[id]); updateSim(); };
$('norm').onclick = () => {
  const a = parseFloat($('p0').value) || 0, b = parseFloat($('p1').value) || 0, t = a + b;
  if (t <= 0) { $('p0').value = 50; $('p1').value = 50; }
  else { $('p0').value = fmt(a / t * 100); $('p1').value = fmt(100 - a / t * 100 > 0 ? 100 - fmt(a / t * 100) : 0); }
  updateSim();
};

/* ---------- 2. Multi-attribute utility (smartphones) ---------- */
const ATTR = ['Price', 'Performance', 'Battery', 'Camera'];
const PHONES = [{n:'Phone A (Budget)', s:[9,5,8,5]}, {n:'Phone B (Flagship)', s:[3,10,7,10]}, {n:'Phone C (Balanced)', s:[6,8,9,7]}];
$('sliders').innerHTML = ATTR.map((a, i) => `<div><label for="w${i}">${a} weight: <b id="wv${i}">5</b></label>
  <input type="range" id="w${i}" min="0" max="10" value="5"></div>`).join('');
function updatePhones() {
  const w = ATTR.map((_, i) => +$('w' + i).value); w.forEach((v, i) => $('wv' + i).textContent = v);
  const tot = w.reduce((a, b) => a + b, 0);
  if (!tot) { $('pbest').textContent = 'Set at least one weight above 0'; return; }
  const sc = PHONES.map(p => p.s.reduce((a, s, i) => a + s * w[i] / tot, 0));
  const top = sc.indexOf(Math.max(...sc));
  $('ptable').innerHTML = `<tr><th>Phone</th>${ATTR.map(a => `<th>${a}</th>`).join('')}<th>Utility</th></tr>` +
    PHONES.map((p, j) => `<tr><td>${p.n}</td>${p.s.map(s => `<td>${s}</td>`).join('')}
    <td><b>${fmt(sc[j])}</b><div class="bar" style="width:${sc[j] * 10}%"></div></td></tr>`).join('');
  $('pbest').textContent = PHONES[top].n + ' (' + fmt(sc[top]) + ')';
}
$('sliders').addEventListener('input', updatePhones);

/* ---------- 3. Quiz ---------- */
const QS = [
 {q:'Which node represents an uncertain event with probabilities?', o:['Chance node','Decision node','Utility node','Root node'], a:0},
 {q:'Which node represents the choices available to the agent?', o:['Chance node','Decision node','Utility node','Evidence node'], a:1},
 {q:'What does a utility node store?', o:['Probability of an event','The list of actions','The value of an outcome','The prior belief'], a:2},
 {q:'A rational agent chooses the decision with the…', o:['Lowest probability','Highest expected utility','Lowest utility','Most states'], a:1},
 {q:'Probabilities of all states in a chance node must sum to…', o:['0','0.5','10','1 (100%)'], a:3}];
let qi = 0, score = 0;
function showQ() {
  const box = $('quizBox');
  if (qi >= QS.length) {
    box.innerHTML = `<h3>Final score: ${score} / ${QS.length}</h3><p>${score >= 4 ? 'Excellent work!' : 'Review the theory above and try again.'}</p><button class="btn primary" id="rq">Restart Quiz</button>`;
    $('rq').onclick = () => { qi = 0; score = 0; showQ(); }; return;
  }
  const q = QS[qi];
  box.innerHTML = `<p>Question ${qi + 1} of ${QS.length}</p><h3>${q.q}</h3>` +
    q.o.map((t, i) => `<button class="opt" data-i="${i}">${t}</button>`).join('') + `<p id="fb" aria-live="polite"></p><button class="btn" id="nx" hidden>${qi === QS.length - 1 ? 'See score' : 'Next question'}</button>`;
  box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, ok = i === q.a; if (ok) score++;
    box.querySelectorAll('.opt').forEach((x, j) => { x.disabled = true; if (j === q.a) x.classList.add('ok'); });
    if (!ok) b.classList.add('no');
    $('fb').textContent = ok ? '✅ Correct!' : '❌ Incorrect. Correct answer: ' + q.o[q.a];
    $('nx').hidden = false; $('nx').focus();
  });
  $('nx') && ($('nx').onclick = () => { qi++; showQ(); });
}

/* ---------- 4. UI: menu, reveal, counters ---------- */
$('burger').onclick = () => { const o = $('menu').classList.toggle('open'); $('burger').setAttribute('aria-expanded', o); };
$('menu').addEventListener('click', e => { if (e.target.tagName === 'A') $('menu').classList.remove('open'); });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {threshold: .1});
document.querySelectorAll('section:not(.hero) > h2, .grid, .net, .sim').forEach(el => { el.classList.add('rv'); io.observe(el); });
document.querySelectorAll('[data-count]').forEach(el => {
  const t = +el.dataset.count; let n = 0;
  const id = setInterval(() => { el.textContent = ++n; if (n >= t) clearInterval(id); }, 350);
});

updateSim(); updatePhones(); showQ();
