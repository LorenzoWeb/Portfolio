const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/images', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const DATA_FILE = path.join(__dirname, 'portfolio-data.json');
function readData()    { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(d)  { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

// API
app.get('/api/data',    (req, res) => res.json(readData()));
app.put('/api/data',    (req, res) => { try { writeData(req.body); res.json({ success: true }); } catch(e) { res.status(500).json({ error: e.message }); } });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });
  res.json({ url: `/images/${req.file.filename}`, filename: req.file.filename });
});

app.get('/api/images', (req, res) => {
  const dir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir)
    .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .map(f => { const s = fs.statSync(path.join(dir, f)); return { filename: f, url: `/images/${f}`, mtime: s.mtime }; })
    .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  res.json(files);
});

app.delete('/api/images/:filename', (req, res) => {
  const fp = path.join(__dirname, 'uploads', path.basename(req.params.filename));
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  res.json({ success: true });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/',      (req, res) => { try { res.send(generatePortfolioHTML(readData())); } catch(e) { res.status(500).send('<h1>Error: '+e.message+'</h1>'); } });

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function generatePortfolioHTML(d) {
  const h=d.hero||{}, ab=d.about||{}, ct=d.contact||{};

  const statsHTML = (h.stats||[]).map(s=>`<div><div class="hero-stat-label">${esc(s.label)}</div><div class="hero-stat-value">${esc(s.value)}</div></div>`).join('');

  const skillsHTML = (d.skills||[]).map(g=>`<div class="skill-group"><h4>${esc(g.category)}</h4><div class="skill-tags">${(g.items||[]).map(i=>`<div class="skill-tag">${esc(i)}</div>`).join('')}</div></div>`).join('');

  const expHTML = (d.experience||[]).map(e=>`
    <div class="exp-item">
      <div class="exp-date">${esc(e.period)}</div><div class="exp-dot"></div>
      <div class="exp-body">
        <div class="exp-company">${esc(e.company)}</div>
        <div class="exp-role">${esc(e.role)}</div>
        <ul class="exp-bullets">${(e.bullets||[]).map(b=>`<li>${esc(b)}</li>`).join('')}</ul>
      </div>
    </div>`).join('');

  const projHTML = (d.projects||[]).map(p=>{
    const imgs=p.images||[];
    let media = imgs.length===0
      ? `<div style="height:220px;background:linear-gradient(135deg,#1B4F8A,#0d3060);display:flex;align-items:center;justify-content:center;font-size:2.5rem">🔧</div>`
      : imgs.length===1
        ? `<img class="project-img" src="${esc(imgs[0])}" alt="${esc(p.title)}">`
        : `<div class="carousel" data-carousel><div class="carousel-track">${imgs.map(src=>`<img src="${esc(src)}" alt="${esc(p.title)}">`).join('')}</div><button class="carousel-btn prev">&#8592;</button><button class="carousel-btn next">&#8594;</button><div class="carousel-dots">${imgs.map((_,i)=>`<button class="carousel-dot${i===0?' active':''}" aria-label="Slide ${i+1}"></button>`).join('')}</div></div>`;
    return `<div class="project-card">${media}<div class="project-body"><div class="project-tag">${esc(p.tag)}</div><div class="project-title">${esc(p.title)}</div><p class="project-desc">${esc(p.description)}</p><div class="project-meta">${esc(p.meta)}</div></div></div>`;
  }).join('');

  const credsHTML = (d.credentials||[]).map(c=>`<div class="cert-card"><div class="cert-icon">${c.icon||'🎓'}</div><div><div class="cert-name">${esc(c.name)}</div><div class="cert-detail">${esc(c.detail).replace(/\n/g,'<br>')}</div></div></div>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(h.name)} ${esc(h.surname)} — Mechanical Engineer</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#F5F7FA;--surface:#fff;--dark:#0F1923;--primary:#1B4F8A;--accent:#E8A020;--accent-light:#FFF3D6;--muted:#8892A0;--border:#DDE2EA;--text:#2C3547}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);line-height:1.6}a{text-decoration:none;color:inherit}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:1rem 3rem;background:rgba(255,255,255,.93);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.nav-logo{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1rem;color:var(--primary)}.nav-logo span{color:var(--accent)}
.nav-links{display:flex;gap:2rem;list-style:none}.nav-links a{font-size:.875rem;font-weight:500;color:var(--muted);transition:color .2s}.nav-links a:hover{color:var(--primary)}
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:6rem 3rem 4rem;background-color:var(--dark);background-image:linear-gradient(rgba(27,79,138,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(27,79,138,.18) 1px,transparent 1px);background-size:32px 32px;position:relative;overflow:hidden}
.hero::after{content:'';position:absolute;bottom:-100px;right:-100px;width:520px;height:520px;background:radial-gradient(circle,rgba(232,160,32,.13),transparent 68%);pointer-events:none}
.hero-eyebrow{font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--accent);letter-spacing:.14em;text-transform:uppercase;margin-bottom:1.5rem}
.hero h1{font-family:'Space Grotesk',sans-serif;font-size:clamp(2.8rem,7vw,5.5rem);font-weight:700;color:#fff;line-height:1.05;letter-spacing:-.03em;margin-bottom:1.5rem;max-width:18ch}.hero h1 .accent{color:var(--accent)}
.hero-sub{font-size:1.1rem;color:rgba(255,255,255,.58);max-width:48ch;margin-bottom:2.5rem;line-height:1.75}
.hero-actions{display:flex;gap:1rem;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;padding:.75rem 1.75rem;border-radius:4px;font-size:.9rem;font-weight:600;transition:all .2s;cursor:pointer;border:none}
.btn-primary{background:var(--accent);color:var(--dark)}.btn-primary:hover{background:#F5B030;transform:translateY(-1px)}
.btn-outline{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.28)}.btn-outline:hover{border-color:#fff;background:rgba(255,255,255,.07)}
.hero-stats{display:flex;gap:3rem;margin-top:4rem;padding-top:2.5rem;border-top:1px solid rgba(255,255,255,.1);flex-wrap:wrap}
.hero-stat-label{font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.25rem}
.hero-stat-value{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:#fff}
.section-inner{padding:5rem 3rem;max-width:1100px;margin:0 auto}
.section-label{font-family:'JetBrains Mono',monospace;font-size:.7rem;font-weight:500;color:var(--accent);letter-spacing:.15em;text-transform:uppercase;margin-bottom:.75rem}
.section-title{font-family:'Space Grotesk',sans-serif;font-size:clamp(1.6rem,3.5vw,2.25rem);font-weight:700;color:var(--dark);letter-spacing:-.02em;margin-bottom:3rem}
#about{background:var(--bg)}.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
.about-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.75rem}
.about-card h3{font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem}
.about-card p{font-size:1rem;color:var(--dark);font-weight:500}
.gpa-badge{display:inline-flex;align-items:center;background:var(--accent-light);color:#8B6000;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.5rem;padding:.35rem .9rem;border-radius:4px;border:1px solid #F5D070}
.about-bio{grid-column:1/-1;background:var(--primary);border-radius:8px;padding:2rem;color:rgba(255,255,255,.82);font-size:1rem;line-height:1.8}.about-bio strong{color:var(--accent)}
#skills{background:var(--surface);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.skills-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:2rem}
.skill-group h4{font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}
.skill-tags{display:flex;flex-direction:column;gap:.6rem}
.skill-tag{display:inline-flex;align-items:center;gap:.6rem;font-size:.875rem;color:var(--text);font-weight:500}
.skill-tag::before{content:'';display:block;width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0}
#experience{background:var(--bg)}.experience-list{display:flex;flex-direction:column}
.exp-item{display:grid;grid-template-columns:155px 1fr;gap:2.5rem;position:relative;padding-bottom:2.75rem}
.exp-item:not(:last-child)::after{content:'';position:absolute;left:154px;top:24px;bottom:0;width:1px;background:var(--border)}
.exp-date{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--muted);text-align:right;padding-top:.2rem}
.exp-dot{position:absolute;left:147px;top:6px;width:16px;height:16px;border-radius:50%;background:var(--surface);border:2px solid var(--accent);z-index:1}
.exp-body{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.5rem;transition:border-color .2s,box-shadow .2s}
.exp-body:hover{border-color:var(--primary);box-shadow:0 2px 18px rgba(27,79,138,.09)}
.exp-company{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:.2rem}
.exp-role{font-size:.875rem;font-weight:600;color:var(--dark);margin-bottom:.875rem}
.exp-bullets{list-style:none;display:flex;flex-direction:column;gap:.45rem}
.exp-bullets li{font-size:.875rem;color:var(--text);padding-left:1.1rem;position:relative}
.exp-bullets li::before{content:'→';position:absolute;left:0;color:var(--accent);font-size:.72rem;top:.1em}
#projects{background:var(--surface);border-top:1px solid var(--border)}
.projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:2rem}
.project-card{background:var(--bg);border:1px solid var(--border);border-radius:8px;overflow:hidden;transition:border-color .2s,box-shadow .2s}
.project-card:hover{border-color:var(--primary);box-shadow:0 4px 20px rgba(27,79,138,.1)}
.project-img{width:100%;height:220px;object-fit:cover;display:block}
.project-body{padding:1.5rem}
.project-tag{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--accent);background:var(--accent-light);border:1px solid #F5D070;border-radius:3px;padding:.2rem .55rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem}
.project-title{font-family:'Space Grotesk',sans-serif;font-size:1.05rem;font-weight:700;color:var(--dark);margin-bottom:.6rem}
.project-desc{font-size:.875rem;color:var(--text);line-height:1.7}
.project-meta{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted)}
.carousel{position:relative;overflow:hidden;background:#000;height:240px}
.carousel-track{display:flex;height:100%;transition:transform .4s cubic-bezier(.4,0,.2,1)}
.carousel-track img{flex:0 0 100%;width:100%;height:240px;object-fit:cover}
.carousel-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(15,25,35,.65);border:1px solid rgba(255,255,255,.2);color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;padding:0;font-size:.85rem}
.carousel-btn:hover{background:rgba(232,160,32,.8)}.carousel-btn.prev{left:10px}.carousel-btn.next{right:10px}
.carousel-dots{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:2}
.carousel-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.4);cursor:pointer;transition:background .2s;border:none;padding:0}
.carousel-dot.active{background:var(--accent)}
#certifications{background:var(--bg);border-top:1px solid var(--border)}
.certs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem}
.cert-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1.75rem;display:flex;gap:1.1rem;align-items:flex-start}
.cert-icon{width:42px;height:42px;background:var(--accent-light);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0}
.cert-name{font-family:'Space Grotesk',sans-serif;font-size:.9rem;font-weight:700;color:var(--dark);margin-bottom:.4rem}
.cert-detail{font-size:.8rem;color:var(--muted);line-height:1.6}
#contact{background:var(--dark);background-image:linear-gradient(rgba(27,79,138,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(27,79,138,.12) 1px,transparent 1px);background-size:32px 32px}
.contact-inner{max-width:620px;margin:0 auto;text-align:center;padding:6rem 3rem}
#contact .section-label{color:var(--accent)}#contact .section-title{color:#fff;margin-bottom:1rem}
.contact-sub{color:rgba(255,255,255,.52);margin-bottom:2.5rem}
.contact-links{display:flex;justify-content:center;gap:1.25rem;flex-wrap:wrap}
.contact-link{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:4px;color:#fff;font-size:.875rem;font-weight:500;transition:all .2s}
.contact-link:hover{background:rgba(232,160,32,.13);border-color:var(--accent);color:var(--accent)}
footer{background:#080E15;padding:1.5rem 3rem;text-align:center;font-family:'JetBrains Mono',monospace;font-size:.68rem;color:rgba(255,255,255,.22)}
.reveal{opacity:0;transform:translateY(22px);transition:opacity .65s ease,transform .65s ease}.reveal.visible{opacity:1;transform:none}
@media(max-width:768px){nav{padding:1rem 1.5rem}.nav-links{display:none}.hero{padding:5rem 1.5rem 3rem}.section-inner{padding:3.5rem 1.5rem}.about-grid{grid-template-columns:1fr}.exp-item{grid-template-columns:1fr;gap:.5rem}.exp-item::after,.exp-dot{display:none}.exp-date{text-align:left}}
</style></head><body>
<nav><div class="nav-logo">L<span>.</span>S. Osei-tutu</div><ul class="nav-links"><li><a href="#about">About</a></li><li><a href="#skills">Skills</a></li><li><a href="#experience">Experience</a></li><li><a href="#projects">Projects</a></li><li><a href="#certifications">Credentials</a></li><li><a href="#contact">Contact</a></li></ul></nav>
<div id="home"><div class="hero"><div class="hero-eyebrow">// ${esc(h.eyebrow)}</div><h1>${esc(h.name)}<br><span class="accent">${esc(h.surname)}</span></h1><p class="hero-sub">${esc(h.subtitle)}</p><div class="hero-actions"><a href="mailto:${esc(ct.email)}" class="btn btn-primary">Get in Touch</a><a href="#experience" class="btn btn-outline">View Experience ↓</a></div><div class="hero-stats">${statsHTML}</div></div></div>
<div id="about"><div class="section-inner"><div class="section-label">01 · About</div><h2 class="section-title">Who I Am</h2><div class="about-grid reveal"><div class="about-card"><h3>University</h3><p>${esc(ab.university)}</p></div><div class="about-card"><h3>GPA</h3><div class="gpa-badge">${esc(ab.gpa)}</div></div><div class="about-card"><h3>Degree</h3><p>${esc(ab.degree)}</p></div><div class="about-card"><h3>Expected Graduation</h3><p>${esc(ab.graduation)}</p></div><div class="about-bio">${ab.bio||''}</div></div></div></div>
<div id="skills"><div class="section-inner"><div class="section-label">02 · Skills</div><h2 class="section-title">Technical Toolkit</h2><div class="skills-grid reveal">${skillsHTML}</div></div></div>
<div id="experience"><div class="section-inner"><div class="section-label">03 · Experience</div><h2 class="section-title">Work History</h2><div class="experience-list reveal">${expHTML}</div></div></div>
<div id="projects"><div class="section-inner"><div class="section-label">04 · Projects</div><h2 class="section-title">Engineering Work</h2><div class="projects-grid reveal">${projHTML}</div></div></div>
<div id="certifications"><div class="section-inner"><div class="section-label">05 · Credentials</div><h2 class="section-title">Certifications & Education</h2><div class="certs-grid reveal">${credsHTML}</div></div></div>
<div id="contact"><div class="contact-inner"><div class="section-label">06 · Contact</div><h2 class="section-title">Let's Build Something</h2><p class="contact-sub">${esc(ct.availability)}</p><div class="contact-links"><a href="mailto:${esc(ct.email)}" class="contact-link">✉ ${esc(ct.email)}</a><a href="${esc(ct.linkedin)}" target="_blank" class="contact-link">↗ LinkedIn Profile</a></div></div></div>
<footer>© ${new Date().getFullYear()} ${esc(h.name)} ${esc(h.surname)} · Mechanical Engineering · ${esc(ab.university)}</footer>
<script>
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
document.querySelectorAll('[data-carousel]').forEach(c=>{
  const track=c.querySelector('.carousel-track'),imgs=track.querySelectorAll('img'),dots=c.querySelectorAll('.carousel-dot');let idx=0;
  function go(n){idx=(n+imgs.length)%imgs.length;track.style.transform='translateX(-'+(idx*100)+'%)';dots.forEach((d,i)=>d.classList.toggle('active',i===idx));}
  c.querySelector('.prev').addEventListener('click',()=>go(idx-1));c.querySelector('.next').addEventListener('click',()=>go(idx+1));
  dots.forEach((d,i)=>d.addEventListener('click',()=>go(i)));
});
</script></body></html>`;
}

app.listen(PORT, () => {
  console.log('\n✅  Running!');
  console.log(`   Portfolio  →  http://localhost:${PORT}`);
  console.log(`   Admin      →  http://localhost:${PORT}/admin\n`);
});
