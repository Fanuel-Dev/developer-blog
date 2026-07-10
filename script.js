/* ---------------- data ---------------- */
let posts = [
  {
    id: genHash(), title: "Why We Rewrote Our Build System in Rust",
    tags: ["rust","tooling","performance"],
    author: "Jordan Silva", date: "2026-06-02", readTime: 7,
    adds: 214, dels: 38, likes: 42, liked:false,
    excerpt: "Our old build system was a pile of shell scripts held together by hope. Here's what broke, what we learned, and why Rust turned out to be the right tool for a job that had nothing to do with speed.",
    body: [
      {type:"p", text:"The build system started as a single Makefile. Three years later it was forty files deep, half of them shell scripts calling other shell scripts, and nobody on the team could explain the whole thing end to end."},
      {type:"h2", text:"The breaking point"},
      {type:"p", text:"A release shipped with a stale binary because a cache invalidation step silently failed. Nobody noticed until a customer did. That was the moment we stopped patching and started rewriting."},
      {type:"code", lang:"rust", text:"fn invalidate(&self, key: &str) -> Result<(), CacheError> {\n    let path = self.root.join(key);\n    if path.exists() {\n        fs::remove_file(&path)?;\n    }\n    Ok(())\n}"},
      {type:"p", text:"The new system is about 6,000 lines of Rust. It's not faster in any way a benchmark would show. What it gives us is a single binary, a real type system for build graphs, and errors that actually say what went wrong."},
      {type:"h2", text:"What we'd do differently"},
      {type:"p", text:"We underestimated how long the migration would take for teams still depending on the old scripts. Give yourself twice the time you think a parallel-run period needs."}
    ]
  },
  {
    id: genHash(), title: "Debugging a Memory Leak That Only Happened on Fridays",
    tags: ["debugging","production","war-story"],
    author: "Jordan Silva", date: "2026-05-21", readTime: 6,
    adds: 96, dels: 14, likes: 67, liked:false,
    excerpt: "The memory graph looked fine all week, then climbed every Friday afternoon like clockwork. The cause had nothing to do with the day of the week — and everything to do with a batch job we'd forgotten about.",
    body: [
      {type:"p", text:"For two months, one of our services would slowly run out of memory every Friday around 3pm. Restarting it fixed things until the following week."},
      {type:"h2", text:"Chasing the wrong lead"},
      {type:"p", text:"We spent the first week suspecting a cron job. It wasn't. The second week we suspected traffic patterns. Also not it. The actual cause was a weekly report generator that held references to every row it processed instead of streaming them."},
      {type:"code", lang:"python", text:"# before\nrows = [process(r) for r in query_all()]\n\n# after\nfor r in query_all():\n    write(process(r))"},
      {type:"p", text:"The fix was two lines. The lesson was bigger: any job that runs infrequently is a job nobody is watching closely, and that's exactly where leaks hide."}
    ]
  },
  {
    id: genHash(), title: "The Case for Boring Technology",
    tags: ["architecture","opinion"],
    author: "Jordan Silva", date: "2026-05-09", readTime: 5,
    adds: 58, dels: 6, likes: 103, liked:false,
    excerpt: "Every new project tempts you with the newest framework. Most of the time, the boring choice — the one with ten years of production scars — is the one that lets you sleep at night.",
    body: [
      {type:"p", text:"Somewhere in your career you'll be tempted to pick the framework that's three months old because the demo looked great. Resist it for anything that has to still be running in five years."},
      {type:"h2", text:"Innovation tokens"},
      {type:"p", text:"A useful way to think about it: your team has a small budget of genuinely novel technical bets it can make on any project. Spend them on the part of the problem that's actually novel, not on the database."},
      {type:"p", text:"Boring doesn't mean bad. Postgres is boring. It's also had thirty years of people finding its edge cases so you don't have to."}
    ]
  },
  {
    id: genHash(), title: "Understanding the Event Loop by Building One",
    tags: ["javascript","fundamentals"],
    author: "Jordan Silva", date: "2026-04-27", readTime: 9,
    adds: 187, dels: 4, likes: 89, liked:false,
    excerpt: "Reading about the event loop never quite made it click. Building a toy version of one, in about eighty lines, finally did.",
    body: [
      {type:"p", text:"The event loop is one of those things every JavaScript developer nods along to in interviews without fully trusting their own mental model. The fastest way to fix that is to build a small one."},
      {type:"code", lang:"javascript", text:"const microtasks = [];\nconst macrotasks = [];\n\nfunction tick() {\n  while (microtasks.length) microtasks.shift()();\n  if (macrotasks.length) macrotasks.shift()();\n}"},
      {type:"h2", text:"Where it clicks"},
      {type:"p", text:"Once you see that microtasks fully drain before a single macrotask runs, a whole category of async bugs stops being mysterious. Promise chains that seem to jump the queue aren't magic, they're just following this exact rule."}
    ]
  },
  {
    id: genHash(), title: "Building a Rate Limiter From Scratch",
    tags: ["systems","performance","tutorial"],
    author: "Jordan Silva", date: "2026-04-11", readTime: 8,
    adds: 145, dels: 11, likes: 76, liked:false,
    excerpt: "Token buckets, leaky buckets, sliding windows — the theory is everywhere. Here's what actually mattered when we put one in front of a real API.",
    body: [
      {type:"p", text:"We evaluated three rate limiting strategies before picking one. The theory around all of them is well documented. What's less documented is what happens when your limiter itself needs to be highly available."},
      {type:"h2", text:"Sliding window, in practice"},
      {type:"p", text:"A sliding window counter gave us the smoothest behavior under bursty traffic without the memory overhead of storing every request timestamp."},
      {type:"code", lang:"go", text:"func (l *Limiter) Allow(key string) bool {\n    now := time.Now().Unix()\n    count := l.store.Increment(key, now)\n    return count <= l.limit\n}"},
      {type:"p", text:"The hardest part wasn't the algorithm. It was deciding what to do when the rate limiter's own storage backend was slow — fail open, or fail closed. We chose open, and logged loudly."}
    ]
  }
];

let comments = {}; // postId -> array of {name, text, time}
posts.forEach(p => comments[p.id] = []);
comments[posts[1].id] = [
  {name:"maya_dev", text:"The 'nobody watches infrequent jobs' line is going in my postmortem template.", time:"2d ago"},
  {name:"kwrites", text:"Had almost this exact bug with a monthly billing job. Painful to debug.", time:"1d ago"}
];

let currentView = "feed";
let currentPostId = null;

function genHash(){
  return Array.from({length:7}, () => "0123456789abcdef"[Math.floor(Math.random()*16)]).join("");
}

/* ---------------- rendering: feed ---------------- */
function renderFeed(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const activeTag = window._activeTag || null;

  let filtered = posts.filter(p => {
    const matchesQ = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some(t=>t.includes(q));
    const matchesTag = !activeTag || p.tags.includes(activeTag);
    return matchesQ && matchesTag;
  });

  document.getElementById('postCountLabel').textContent = `— ${filtered.length} ${filtered.length===1?'entry':'entries'}` + (activeTag ? ` on #${activeTag}` : '');

  const list = document.getElementById('logList');
  if(filtered.length === 0){
    list.innerHTML = `<div class="empty-state">$ git log --grep="${q||activeTag||''}"<br>no commits found</div>`;
  } else {
    list.innerHTML = filtered.map(p => `
      <div class="log-entry" onclick="openPost('${p.id}')">
        <div class="log-hash mono">${p.id}</div>
        <div class="log-main">
          <p class="log-title">${escapeHtml(p.title)}</p>
          <p class="log-excerpt">${escapeHtml(p.excerpt)}</p>
          <div class="log-tags">${p.tags.map(t=>`<span class="tag-pill" onclick="event.stopPropagation(); filterTag('${t}')">${t}</span>`).join('')}</div>
        </div>
        <div class="log-meta">
          <span>${p.date}</span>
          <span class="diffstat"><span class="add">+${p.adds}</span><span class="del">-${p.dels}</span></span>
          <span>${p.readTime} min read</span>
        </div>
      </div>
    `).join('');
  }

  // totals
  document.getElementById('totalLikes').textContent = posts.reduce((a,p)=>a+p.likes,0);
  document.getElementById('totalComments').textContent = Object.values(comments).reduce((a,c)=>a+c.length,0);

  renderBranches();
  renderTrending();
}

function renderBranches(){
  const tagSet = {};
  posts.forEach(p => p.tags.forEach(t => tagSet[t] = (tagSet[t]||0)+1));
  const tags = Object.keys(tagSet).sort();
  document.getElementById('branchList').innerHTML = tags.map(t =>
    `<span class="tag-pill" style="cursor:pointer" onclick="filterTag('${t}')">${t} (${tagSet[t]})</span>`
  ).join('');
}

function renderTrending(){
  const top = [...posts].sort((a,b)=>b.likes-a.likes).slice(0,4);
  document.getElementById('trendList').innerHTML = top.map((p,i) => `
    <div class="trend-item" onclick="openPost('${p.id}')">
      <div class="trend-rank mono">${i+1}</div>
      <div>
        <div class="trend-title">${escapeHtml(p.title)}</div>
        <div class="trend-sub">${p.likes} likes · ${p.readTime} min</div>
      </div>
    </div>
  `).join('');
}

function filterTag(t){
  window._activeTag = (window._activeTag === t) ? null : t;
  renderFeed();
  document.getElementById('logList').scrollIntoView({behavior:'smooth', block:'start'});
}

function scrollToTags(){
  document.getElementById('tagsBlock').scrollIntoView({behavior:'smooth', block:'center'});
}

function toggleAbout(){
  showToast("devlog — a changelog for the things worth writing down.");
}

/* ---------------- post detail ---------------- */
function openPost(id){
  currentPostId = id;
  currentView = "post";
  document.getElementById('feedView').style.display = "none";
  document.getElementById('postView').style.display = "block";
  renderPost();
  window.scrollTo({top:0, behavior:'instant'});
}

function showFeed(){
  currentView = "feed";
  currentPostId = null;
  document.getElementById('postView').style.display = "none";
  document.getElementById('feedView').style.display = "block";
  renderFeed();
}

function renderPost(){
  const p = posts.find(x => x.id === currentPostId);
  if(!p) return showFeed();

  const bodyHtml = p.body.map(block => {
    if(block.type === "p") return `<p>${escapeHtml(block.text)}</p>`;
    if(block.type === "h2") return `<h2>${escapeHtml(block.text)}</h2>`;
    if(block.type === "code") return `
      <div class="code-block">
        <div class="code-head"><span class="code-dot"></span><span class="code-dot"></span><span class="code-dot"></span></div>
        <pre>${escapeHtml(block.text)}</pre>
      </div>`;
    return "";
  }).join('');

  const postComments = comments[p.id] || [];

  document.getElementById('postView').innerHTML = `
    <div class="post-view">
      <button class="back-btn" onclick="showFeed()">← back to feed</button>
      <div class="post-header">
        <div class="post-hash mono">commit ${p.id}</div>
        <h1>${escapeHtml(p.title)}</h1>
        <div class="post-metabar">
          <span>${p.author}</span><span>·</span><span>${p.date}</span><span>·</span><span>${p.readTime} min read</span>
          <span>·</span><span class="diffstat"><span class="add">+${p.adds}</span><span class="del">-${p.dels}</span></span>
        </div>
      </div>
      <div class="post-body">${bodyHtml}</div>
      <div class="post-tags">${p.tags.map(t=>`<span class="tag-pill" onclick="showFeed(); setTimeout(()=>filterTag('${t}'),0)">${t}</span>`).join('')}</div>
      <div class="post-actions">
        <button class="like-btn ${p.liked?'liked':''}" onclick="toggleLike('${p.id}')">
          ${p.liked ? '♥' : '♡'} <span id="likeCount-${p.id}">${p.likes}</span> likes
        </button>
      </div>
      <div class="comments-section">
        <div class="comments-title mono">$ comments (${postComments.length})</div>
        <div id="commentList">${renderComments(postComments)}</div>
        <div class="comment-form">
          <textarea id="commentInput" placeholder="Leave a comment..." rows="1"></textarea>
          <button onclick="submitComment('${p.id}')">post</button>
        </div>
      </div>
    </div>
  `;
}

function renderComments(list){
  if(list.length === 0) return `<p style="color:var(--text-faint); font-size:13.5px;">No comments yet. Be the first.</p>`;
  return list.map(c => `
    <div class="comment">
      <div class="avatar" style="width:34px;height:34px;font-size:12px;">${c.name.slice(0,2).toUpperCase()}</div>
      <div class="comment-body">
        <span class="comment-name">${escapeHtml(c.name)}</span><span class="comment-time">${c.time}</span>
        <p class="comment-text">${escapeHtml(c.text)}</p>
      </div>
    </div>
  `).join('');
}

function toggleLike(id){
  const p = posts.find(x=>x.id===id);
  p.liked = !p.liked;
  p.likes += p.liked ? 1 : -1;
  renderPost();
}

function submitComment(postId){
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if(!text) return;
  comments[postId] = comments[postId] || [];
  comments[postId].push({name:"you", text, time:"just now"});
  input.value = "";
  renderPost();
  showToast("Comment posted");
}

/* ---------------- new post modal ---------------- */
function openModal(){ document.getElementById('modalOverlay').classList.add('open'); }
function closeModal(){
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('newTitle').value = "";
  document.getElementById('newTags').value = "";
  document.getElementById('newContent').value = "";
}

function submitPost(){
  const title = document.getElementById('newTitle').value.trim();
  const tagsRaw = document.getElementById('newTags').value.trim();
  const content = document.getElementById('newContent').value.trim();

  if(!title || !content){
    showToast("Title and content are required");
    return;
  }
  const tags = tagsRaw ? tagsRaw.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean) : ["untagged"];
  const paragraphs = content.split(/\n\s*\n/).filter(Boolean);
  const body = paragraphs.map(text => ({type:"p", text}));
  const wordCount = content.split(/\s+/).length;

  const newPost = {
    id: genHash(), title, tags,
    author: "you", date: new Date().toISOString().slice(0,10),
    readTime: Math.max(1, Math.round(wordCount/200)),
    adds: wordCount, dels: Math.round(wordCount*0.05),
    likes: 0, liked:false,
    excerpt: paragraphs[0] ? paragraphs[0].slice(0,160) : "",
    body
  };
  posts.unshift(newPost);
  comments[newPost.id] = [];
  closeModal();
  showFeed();
  showToast("Post published");
}

/* ---------------- utils ---------------- */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2600);
}

document.getElementById('modalOverlay').addEventListener('click', e => {
  if(e.target.id === 'modalOverlay') closeModal();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeModal();
});

renderFeed();