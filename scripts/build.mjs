import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'content');
const postsDir = path.join(contentDir, 'posts');
const pagesDir = path.join(contentDir, 'pages');
const manifestPath = path.join(root, '.site-build-manifest.json');
const generatedFiles = new Set();

const siteText = await fs.readFile(path.join(contentDir, 'site.json'), 'utf8');
const site = JSON.parse(siteText.charCodeAt(0) === 65279 ? siteText.slice(1) : siteText);
const assetVersion = await buildAssetVersion();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function buildAssetVersion() {
  const { createHash } = await import('node:crypto');
  const assetPaths = [
    path.join(root, 'css', 'diaspora.css'),
    path.join(root, 'js', 'diaspora.js')
  ];
  const hash = createHash('sha1');

  for (const assetPath of assetPaths) {
    hash.update(await fs.readFile(assetPath));
  }

  return hash.digest('hex').slice(0, 10);
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^['"]|['"]$/g, ''));
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(source) {
  const normalized = source.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---\n') && !normalized.startsWith('---\r\n')) {
    return { data: {}, body: normalized };
  }

  const lines = normalized.split(/\r?\n/);
  const data = {};
  let index = 1;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '---') {
      index += 1;
      break;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }

    const [, key, rawValue] = match;
    if (rawValue.trim() !== '') {
      data[key] = parseScalar(rawValue);
      index += 1;
      continue;
    }

    const list = [];
    index += 1;
    while (index < lines.length) {
      const listLine = lines[index];
      if (listLine.trim() === '---') break;
      const listMatch = listLine.match(/^\s*-\s+(.+)$/);
      if (!listMatch) break;
      list.push(parseScalar(listMatch[1]));
      index += 1;
    }
    data[key] = list;
  }

  return { data, body: lines.slice(index).join('\n').trim() };
}

function slugSegment(value) {
  return String(value)
    .trim()
    .replace(/[<>:"\\|?*]/g, '-')
    .replace(/\s+/g, '-');
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function buildInline(text) {
  const codeTokens = [];
  const tokenized = text.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE${codeTokens.length}@@`;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  let html = escapeHtml(tokenized)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const external = /^https?:\/\//.test(href);
      const attrs = external ? ' target="_blank" rel="noreferrer"' : '';
      return `<a href="${href}"${attrs}>${label}</a>`;
    });

  codeTokens.forEach((token, index) => {
    html = html.replace(`@@CODE${index}@@`, token);
  });

  return html;
}

function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      index += 1;
      const codeLines = [];
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      const langClass = language ? ` class="language-${escapeHtml(language)}"` : '';
      blocks.push(`<pre><code${langClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${buildInline(headingMatch[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(`<blockquote><p>${quoteLines.map(buildInline).join('<br>')}</p></blockquote>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(`<ol>${items.map((item) => `<li>${buildInline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${buildInline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (
        !current ||
        current.startsWith('```') ||
        current.startsWith('>') ||
        /^#{1,4}\s+/.test(current) ||
        /^\d+\.\s+/.test(current) ||
        /^[-*]\s+/.test(current)
      ) {
        break;
      }
      paragraph.push(current);
      index += 1;
    }
    blocks.push(`<p>${buildInline(paragraph.join(' '))}</p>`);
  }

  return blocks.join('\n');
}

function extractSummary(markdown) {
  const plain = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('-') && !/^\d+\./.test(line));
  return plain || '';
}

function headerMarkup() {
  return `
<header class="site-header">
  <div class="site-header-inner">
    <a class="brand" href="/">
      <span class="brand-mark">${escapeHtml(site.siteTitle)}</span>
      <span class="brand-note">${escapeHtml(site.siteTagline)}</span>
    </a>
    <button class="nav-toggle" type="button" aria-label="打开导航" aria-expanded="false" data-nav-toggle>
      <span></span>
    </button>
    <nav class="site-nav" aria-label="主导航" data-site-nav>
      <a href="/">首页</a>
      <a href="/post/">文章</a>
      <a href="/archives/">归档</a>
      <a href="/categories/">分类</a>
      <a href="/tags/">标签</a>
      <a href="/oracle/">卜签</a>
      <a href="/HankZ/about.html">关于</a>
      <a href="https://github.com/HankZhangZ" target="_blank" rel="noreferrer">GitHub</a>
    </nav>
  </div>
</header>`;
}

function footerMarkup() {
  return `
<footer class="footer">
  <span>${escapeHtml(site.footerNote)}</span>
  <div class="footer-links">
    ${site.socialLinks.map((item) => `<a href="${item.href}"${item.href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''}>${escapeHtml(item.label)}</a>`).join('')}
  </div>
</footer>`;
}

function documentMarkup({ title, description, bodyClass, content }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="Hank Zhang">
  <link rel="icon" href="/img/favicon.png">
  <link rel="stylesheet" href="/css/diaspora.css?v=${assetVersion}">
</head>
<body class="${bodyClass}">
  <!-- Generated by scripts/build.mjs. Edit content/ sources instead of this file. -->
  <div class="site-shell">
    ${headerMarkup()}
    ${content}
    ${footerMarkup()}
  </div>
  <script src="/js/diaspora.js?v=${assetVersion}"></script>
</body>
</html>`;
}

function articleCard(post, actionLabel = '阅读文章') {
  return `<article class="post-card reveal is-visible">
    <a class="post-card-media" href="${post.path}"><img src="${post.cover}" alt="${escapeHtml(post.title)}"></a>
    <div class="post-card-body">
      <span class="post-card-date">${escapeHtml(post.date)}</span>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.summary)}</p>
      <div class="card-actions"><a class="btn btn-secondary" href="${post.path}">${actionLabel}</a></div>
    </div>
  </article>`;
}

function timelineItems(posts) {
  return posts.map((post) => `
    <div class="timeline-item">
      <span class="timeline-time">${escapeHtml(post.date)}</span>
      <div>
        <a href="${post.path}">${escapeHtml(post.title)}</a>
        <p>${escapeHtml(post.summary)}</p>
      </div>
    </div>`).join('');
}

function taxonomyPath(type, name) {
  return `/${type}/${slugSegment(name)}/`;
}

function urlToFilePath(urlPath) {
  const normalized = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  if (!normalized || normalized.endsWith('/')) {
    return path.join(root, normalized, 'index.html');
  }
  return path.join(root, normalized);
}

function relativeFilePath(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

async function pruneEmptyDirs(startDir) {
  let current = startDir;
  while (current.startsWith(root) && current !== root) {
    const entries = await fs.readdir(current).catch(() => []);
    if (entries.length) break;
    await fs.rmdir(current).catch(() => {});
    current = path.dirname(current);
  }
}

async function cleanupPreviousBuild() {
  const exists = await fs.access(manifestPath).then(() => true).catch(() => false);
  if (!exists) return;

  const manifestText = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestText.charCodeAt(0) === 65279 ? manifestText.slice(1) : manifestText);

  for (const relativePath of manifest.files || []) {
    const absolutePath = path.join(root, relativePath);
    const fileExists = await fs.access(absolutePath).then(() => true).catch(() => false);
    if (!fileExists) continue;
    await fs.unlink(absolutePath).catch(() => {});
    await pruneEmptyDirs(path.dirname(absolutePath));
  }

  await fs.unlink(manifestPath).catch(() => {});
}

async function writePage(urlPath, html) {
  const filePath = urlToFilePath(urlPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${html}\n`, 'utf8');
  generatedFiles.add(relativeFilePath(filePath));
}

async function saveManifest() {
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({ files: [...generatedFiles].sort() }, null, 2)}\n`,
    'utf8'
  );
}


async function walkHtmlFiles(dir) {
  const results = [];
  const exists = await fs.access(dir).then(() => true).catch(() => false);
  if (!exists) return results;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkHtmlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function removeUnmanagedGeneratedFiles() {
  const topEntries = await fs.readdir(root, { withFileTypes: true });
  const managedRoots = topEntries
    .filter((entry) => entry.isDirectory() && (/^\\d{4}$/.test(entry.name) || ['archives', 'categories', 'tags', 'post', 'HankZ'].includes(entry.name)))
    .map((entry) => path.join(root, entry.name));

  for (const managedRoot of managedRoots) {
    const files = await walkHtmlFiles(managedRoot);
    for (const file of files) {
      const relativePath = relativeFilePath(file);
      if (generatedFiles.has(relativePath)) continue;
      await fs.unlink(file).catch(() => {});
      await pruneEmptyDirs(path.dirname(file));
    }
  }
}
async function loadPosts() {
  const files = (await fs.readdir(postsDir)).filter((file) => file.endsWith('.md'));
  const posts = [];

  for (const file of files) {
    const source = await fs.readFile(path.join(postsDir, file), 'utf8');
    const { data, body } = parseFrontmatter(source);
    const [year, month] = String(data.date).split('-');
    posts.push({
      sourceFile: file,
      title: data.title,
      date: String(data.date),
      path: data.path,
      summary: data.summary || extractSummary(body),
      cover: data.cover || '/img/cover.jpg',
      lead: data.lead || data.summary || extractSummary(body),
      featured: Boolean(data.featured),
      category: data.category || '未分类',
      tags: ensureArray(data.tags),
      audio: ensureArray(data.audio),
      contentHtml: renderMarkdown(body),
      year,
      month,
      dateObject: parseDate(String(data.date))
    });
  }

  return posts.sort((a, b) => b.dateObject - a.dateObject || a.title.localeCompare(b.title, 'zh-CN'));
}

async function loadAboutPage() {
  const source = await fs.readFile(path.join(pagesDir, 'about.md'), 'utf8');
  const { data, body } = parseFrontmatter(source);
  return {
    title: data.title || site.about.title,
    description: data.description || site.about.description,
    lead: data.lead || site.about.lead,
    contentHtml: renderMarkdown(body)
  };
}

async function loadOraclePage() {
  const source = await fs.readFile(path.join(pagesDir, 'oracle.md'), 'utf8');
  const { data, body } = parseFrontmatter(source);
  return {
    title: data.title || '六爻与每日抽签',
    description: data.description || '一个只放在导航里的独立占卜页面。',
    lead: data.lead || '用更轻量的方式放一个独立入口，既不挤占首页，也方便后续继续扩展。',
    contentHtml: renderMarkdown(body)
  };
}

function groupPosts(posts, key) {
  const map = new Map();
  for (const post of posts) {
    const values = ensureArray(post[key]).filter(Boolean);
    for (const value of values) {
      const current = map.get(value) || [];
      current.push(post);
      map.set(value, current);
    }
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-CN'));
}

async function buildHome(posts) {
  const featured = posts.find((post) => post.featured) || posts[0];
  await writePage('/', documentMarkup({
    title: `${site.siteTitle} | 一个更现代的个人博客`,
    description: site.siteDescription,
    bodyClass: 'page-home',
    content: `
<main class="page-main">
  <section class="hero">
    <div class="hero-copy reveal is-visible">
      <span class="eyebrow">${escapeHtml(site.hero.eyebrow)}</span>
      <h1>${escapeHtml(site.hero.title)}</h1>
      <p class="hero-lead">${escapeHtml(site.hero.lead)}</p>
      <div class="hero-actions">
        <button class="btn btn-primary" type="button" data-scroll-target="#latest-posts">浏览最新文章</button>
        <a class="btn btn-secondary" href="/HankZ/about.html">认识作者</a>
        <button class="btn btn-ghost" type="button" data-copy-link>复制站点链接</button>
      </div>
      <ul class="hero-metrics">
        <li>${posts.length} 篇公开文章</li>
        <li>${posts[posts.length - 1].year} - ${posts[0].year} 写作存档</li>
        <li>Markdown 内容驱动更新</li>
      </ul>
    </div>
    <aside class="hero-side reveal is-visible">
      <div class="hero-visual">
        <img src="${featured.cover}" alt="${escapeHtml(featured.title)}">
        <div class="floating-note">
          <strong>${escapeHtml(site.hero.featuredNoteTitle)}</strong>
          <span>${escapeHtml(site.hero.featuredNoteBody)}</span>
        </div>
      </div>
      <div class="info-card">
        <span class="eyebrow-muted">${escapeHtml(site.hero.featuredEyebrow)}</span>
        <h3>${escapeHtml(featured.title)}</h3>
        <p>${escapeHtml(featured.lead)}</p>
        <div class="card-actions">
          <a class="btn btn-primary" href="${featured.path}">阅读这篇文章</a>
        </div>
      </div>
    </aside>
  </section>

  <section class="section-shell section-stack" id="latest-posts">
    <div class="section-heading reveal is-visible">
      <div>
        <h2>文章列表</h2>
        <p>首页不再只是一张大图和几段文案，而是改成了一个面向后续更新的内容入口。新增文章后，这里的卡片会自动更新。</p>
      </div>
    </div>
    <div class="cards-grid">${posts.map((post) => articleCard(post, '打开文章')).join('')}</div>
  </section>

  <section class="section-shell section-stack split-grid">
    <div class="timeline-card reveal is-visible">
      <span class="eyebrow-muted">Quick Access</span>
      <h3>快速入口</h3>
      <div class="timeline-list">
        <div class="timeline-item">
          <span class="timeline-time">/post</span>
          <div><a href="/post/">文章索引</a><p>集中查看目前所有公开文章。</p></div>
        </div>
        <div class="timeline-item">
          <span class="timeline-time">/archives</span>
          <div><a href="/archives/">归档页</a><p>按年份和月份自动整理。</p></div>
        </div>
        <div class="timeline-item">
          <span class="timeline-time">/categories</span>
          <div><a href="/categories/">分类页</a><p>根据文章 frontmatter 自动聚合。</p></div>
        </div>
      </div>
    </div>
    <div class="info-card reveal is-visible">
      <span class="eyebrow-muted">Current Direction</span>
      <h3>后续更新怎么做</h3>
      <ul class="info-list">
        <li>文章内容写在 <code>content/posts/*.md</code>。</li>
        <li>主题结构和页面列表由 <code>scripts/build.mjs</code> 统一生成。</li>
        <li>分类、标签、归档页会随着文章元数据自动刷新。</li>
      </ul>
      <div class="card-actions"><a class="btn btn-primary" href="/archives/">查看全部归档</a></div>
    </div>
  </section>
</main>`
  }));
}

async function buildPostIndex(posts) {
  await writePage('/post/', documentMarkup({
    title: `文章索引 | ${site.siteTitle}`,
    description: site.listingDescriptions.posts,
    bodyClass: 'page-listing',
    content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">Collection</span>
    <h1>文章索引</h1>
    <p>${escapeHtml(site.listingDescriptions.posts)}</p>
  </section>
  <section class="page-content">
    <div class="cards-grid">${posts.map((post) => articleCard(post)).join('')}</div>
  </section>
</main>`
  }));
}

async function buildArticlePages(posts) {
  for (const post of posts) {
    const tagLinks = post.tags.map((tag) => `<li><a href="${taxonomyPath('tags', tag)}"># ${escapeHtml(tag)}</a></li>`).join('');
    await writePage(post.path, documentMarkup({
      title: `${post.title} | ${site.siteTitle}`,
      description: post.summary,
      bodyClass: 'page-article',
      content: `
<div class="reading-progress"></div>
<main class="page-main">
  <article class="article-wrap" data-reading-root>
    <section class="article-intro reveal is-visible">
      <span class="eyebrow">Article</span>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="hero-lead">${escapeHtml(post.lead)}</p>
      <ul class="meta-list">
        <li>${escapeHtml(post.date)}</li>
        <li><a href="${taxonomyPath('categories', post.category)}">${escapeHtml(post.category)}</a></li>
        <li>适合桌面与移动端阅读</li>
      </ul>
      ${post.tags.length ? `<ul class="pill-list">${tagLinks}</ul>` : ''}
      <div class="article-actions">
        <a class="btn btn-secondary" href="/archives/">查看归档</a>
        <button class="btn btn-ghost" type="button" data-copy-link>复制文章链接</button>
        <button class="btn btn-primary" type="button" data-audio-toggle${post.audio.length ? '' : ' hidden'}>播放随文音乐</button>
      </div>
    </section>
    <section class="article-surface reveal is-visible">
      <div class="prose">${post.contentHtml}</div>
      <div class="audio-panel" data-audio-panel>
        <strong>随文音乐</strong>
        <p class="audio-meta" data-audio-label>点击按钮播放精选曲目</p>
        <audio data-audio-player preload="none"></audio>
        <ul class="audio-playlist" hidden>${post.audio.map((url) => `<li data-url="${url}"></li>`).join('')}</ul>
      </div>
      <div class="article-footer-card">
        <strong>继续浏览</strong>
        <p>如果你是第一次来到这里，可以从归档页回看这个博客最初的记录，也可以直接回首页看新的信息布局。</p>
        <div class="article-actions">
          <a class="btn btn-secondary" href="/">返回首页</a>
          <a class="btn btn-ghost" href="/post/">文章索引</a>
        </div>
      </div>
    </section>
  </article>
</main>`
    }));
  }
}

async function buildArchives(posts) {
  const years = [...new Set(posts.map((post) => post.year))];
  await writePage('/archives/', documentMarkup({
    title: `归档 | ${site.siteTitle}`,
    description: site.listingDescriptions.archives,
    bodyClass: 'page-listing',
    content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">Collection</span>
    <h1>归档</h1>
    <p>${escapeHtml(site.listingDescriptions.archives)}</p>
  </section>
  <section class="page-content">
    <div class="split-grid">
      <section class="timeline-card reveal is-visible">
        <span class="eyebrow-muted">Timeline</span>
        <h3>全部归档</h3>
        <div class="timeline-list">${timelineItems(posts)}</div>
      </section>
      <aside class="info-card reveal is-visible">
        <span class="eyebrow-muted">Year Jump</span>
        <h3>按时间进入</h3>
        <div class="card-actions">${years.map((year) => `<a class="btn btn-secondary" href="/archives/${year}/">${year}</a>`).join('')}</div>
      </aside>
    </div>
  </section>
</main>`
  }));

  for (const year of years) {
    const yearPosts = posts.filter((post) => post.year === year);
    await writePage(`/archives/${year}/`, documentMarkup({
      title: `${year} 归档 | ${site.siteTitle}`,
      description: `${year} 年的博客归档。`,
      bodyClass: 'page-listing',
      content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">Archive</span>
    <h1>${year} 归档</h1>
    <p>按年份筛选之后，这里只保留 ${year} 年的内容。</p>
  </section>
  <section class="page-content">
    <section class="timeline-card reveal is-visible">
      <span class="eyebrow-muted">Archive · ${year}</span>
      <h3>${year} 年</h3>
      <div class="timeline-list">${timelineItems(yearPosts)}</div>
    </section>
  </section>
</main>`
    }));

    const months = [...new Set(yearPosts.map((post) => post.month))];
    for (const month of months) {
      const monthPosts = yearPosts.filter((post) => post.month === month);
      await writePage(`/archives/${year}/${month}/`, documentMarkup({
        title: `${year} 年 ${month} 月归档 | ${site.siteTitle}`,
        description: `${year} 年 ${month} 月的博客归档。`,
        bodyClass: 'page-listing',
        content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">Archive</span>
    <h1>${year} 年 ${month} 月归档</h1>
    <p>这一页只保留 ${year} 年 ${month} 月的内容。</p>
  </section>
  <section class="page-content">
    <section class="timeline-card reveal is-visible">
      <span class="eyebrow-muted">Archive · ${year} / ${month}</span>
      <h3>${year} 年 ${month} 月</h3>
      <div class="timeline-list">${timelineItems(monthPosts)}</div>
    </section>
  </section>
</main>`
      }));
    }
  }
}

async function buildTaxonomy(posts, type, label) {
  const groups = groupPosts(posts, type === 'categories' ? 'category' : 'tags');
  await writePage(`/${type}/`, documentMarkup({
    title: `${label} | ${site.siteTitle}`,
    description: site.listingDescriptions[type],
    bodyClass: 'page-listing',
    content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">Collection</span>
    <h1>${label}</h1>
    <p>${escapeHtml(site.listingDescriptions[type])}</p>
  </section>
  <section class="page-content">
    ${groups.length ? `<div class="cards-grid">${groups.map(([name, items]) => `
      <article class="info-card reveal is-visible">
        <span class="eyebrow-muted">${label}</span>
        <h3>${escapeHtml(name)}</h3>
        <p>${items.length} 篇文章，后续新增内容后这里会自动更新。</p>
        <div class="card-actions"><a class="btn btn-secondary" href="${taxonomyPath(type, name)}">查看${label}</a></div>
      </article>`).join('')}</div>` : `<section class="empty-state reveal is-visible"><strong>${label} 还没有内容</strong><p>等后续文章写多以后，这里会自动出现聚合结果。</p></section>`}
  </section>
</main>`
  }));

  for (const [name, items] of groups) {
    await writePage(taxonomyPath(type, name), documentMarkup({
      title: `${name} | ${label} | ${site.siteTitle}`,
      description: `${name} 下的文章列表。`,
      bodyClass: 'page-listing',
      content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">${label}</span>
    <h1>${escapeHtml(name)}</h1>
    <p>${items.length} 篇文章聚合在这个页面里。以后只要 frontmatter 继续维护，页面会自动更新。</p>
  </section>
  <section class="page-content">
    <section class="timeline-card reveal is-visible">
      <span class="eyebrow-muted">${label} · ${escapeHtml(name)}</span>
      <h3>${escapeHtml(name)}</h3>
      <div class="timeline-list">${timelineItems(items)}</div>
    </section>
  </section>
</main>`
    }));
  }
}

async function buildAboutPage() {
  const about = await loadAboutPage();
  const profileItems = site.about.profileItems.map((item) => `
    <div class="timeline-item">
      <span class="timeline-time">${escapeHtml(item.label)}</span>
      <div>${item.href ? `<a href="${item.href}" target="_blank" rel="noreferrer">${escapeHtml(item.text)}</a>` : `<p>${escapeHtml(item.text)}</p>`}</div>
    </div>`).join('');

  await writePage('/HankZ/about.html', documentMarkup({
    title: `${about.title} | ${site.siteTitle}`,
    description: about.description,
    bodyClass: 'page-listing',
    content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">About</span>
    <h1>${escapeHtml(about.title)}</h1>
    <p>${escapeHtml(about.lead)}</p>
  </section>
  <section class="page-content">
    <div class="split-grid">
      <section class="info-card reveal is-visible">
        <span class="eyebrow-muted">About Me</span>
        <h3>这里是 Hank Zhang</h3>
        <div class="prose">${about.contentHtml}</div>
      </section>
      <aside class="timeline-card reveal is-visible">
        <span class="eyebrow-muted">Profile</span>
        <h3>目前的公开信息</h3>
        <div class="timeline-list">${profileItems}</div>
      </aside>
    </div>
  </section>
</main>`
  }));
}

async function buildOraclePage() {
  const oracle = await loadOraclePage();

  await writePage('/oracle/', documentMarkup({
    title: `${oracle.title} | ${site.siteTitle}`,
    description: oracle.description,
    bodyClass: 'page-oracle',
    content: `
<main class="page-main">
  <section class="page-hero reveal is-visible">
    <span class="eyebrow">Oracle</span>
    <h1>${escapeHtml(oracle.title)}</h1>
    <p>${escapeHtml(oracle.lead)}</p>
  </section>
  <section class="page-content section-stack">
    <section class="info-card reveal is-visible">
      <span class="eyebrow-muted">独立入口</span>
      <h3>只放在导航，不进入正文流</h3>
      <div class="prose">${oracle.contentHtml}</div>
    </section>
    <div class="oracle-grid">
      <section class="oracle-panel reveal is-visible" data-oracle-daily>
        <span class="eyebrow-muted">Daily Draw</span>
        <h3>每日抽签</h3>
        <p class="oracle-panel-copy">当天只保留一支签。刷新页面不会变，第二天会自动更新。</p>
        <div class="card-actions">
          <button class="btn btn-primary" type="button" data-daily-draw>抽取今日签</button>
          <button class="btn btn-ghost" type="button" data-copy-link>复制页面链接</button>
        </div>
        <div class="fortune-display" data-daily-result hidden>
          <div class="fortune-head">
            <strong data-fortune-title>今日签</strong>
            <span data-fortune-tag></span>
          </div>
          <p class="fortune-date" data-fortune-date></p>
          <p class="fortune-summary" data-fortune-summary></p>
          <ul class="fortune-points">
            <li data-fortune-career></li>
            <li data-fortune-action></li>
          </ul>
        </div>
      </section>
      <section class="oracle-panel reveal is-visible" data-oracle-yao>
        <span class="eyebrow-muted">Six Lines</span>
        <h3>六爻起卦</h3>
        <p class="oracle-panel-copy">输入一个当前想问的问题，然后选择投铜钱或时间起卦。前者会逐次成卦，后者按当前时间直接起卦。</p>
        <label class="oracle-label" for="oracle-question">所问之事</label>
        <textarea class="oracle-input" id="oracle-question" rows="4" placeholder="例如：这个阶段是否适合推进当前项目？"></textarea>
        <div class="oracle-mode-switch" data-yao-mode-switch>
          <button class="oracle-mode is-active" type="button" data-yao-mode="coins">投铜钱</button>
          <button class="oracle-mode" type="button" data-yao-mode="time">时间起卦</button>
        </div>
        <div class="oracle-mode-panel" data-yao-panel="coins">
          <p class="oracle-mode-copy">每次点击都模拟一次三枚铜钱，累计六次后自动生成本卦和变卦。</p>
          <div class="card-actions">
            <button class="btn btn-primary" type="button" data-coin-toss>投一次铜钱</button>
            <button class="btn btn-ghost" type="button" data-coin-reset>重新开始</button>
          </div>
          <p class="oracle-status" data-coin-status>当前进度：0 / 6</p>
          <div class="coin-log" data-coin-log hidden></div>
        </div>
        <div class="oracle-mode-panel" data-yao-panel="time" hidden>
          <p class="oracle-mode-copy">按当前年、月、日、时起卦，适合快速得到一卦做参考。</p>
          <div class="card-actions">
            <button class="btn btn-primary" type="button" data-time-generate>按当前时间起卦</button>
          </div>
        </div>
        <div class="yao-result" data-yao-result hidden>
          <div class="yao-meta">
            <strong data-yao-question></strong>
            <span data-yao-time></span>
          </div>
          <div class="yao-boards">
            <div class="yao-board">
              <span class="eyebrow-muted">本卦</span>
              <div class="yao-stack" data-yao-primary></div>
            </div>
            <div class="yao-board">
              <span class="eyebrow-muted">变卦</span>
              <div class="yao-stack" data-yao-changed></div>
            </div>
          </div>
          <div class="yao-summary">
            <p data-yao-judgement></p>
            <ul class="fortune-points">
              <li data-yao-lines></li>
              <li data-yao-balance></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </section>
</main>`
  }));
}

async function main() {
  await cleanupPreviousBuild();
  const posts = await loadPosts();
  await buildHome(posts);
  await buildPostIndex(posts);
  await buildArticlePages(posts);
  await buildArchives(posts);
  await buildTaxonomy(posts, 'categories', '分类');
  await buildTaxonomy(posts, 'tags', '标签');
  await buildAboutPage();
  await buildOraclePage();
  await saveManifest();
  console.log(`Built ${posts.length} posts with content-driven theme workflow.`);
}

await main();

