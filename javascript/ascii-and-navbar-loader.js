/* ============================
   GLOBAL CACHE
   ============================ */
let cachedDoc = null;
let asciiTypeTimeout = null;
/* ============================
   LOAD TERMINAL PARTS
   ============================ */

function loadTerminalParts(titleId, callback) {
  if (cachedDoc) {
    updatePage(cachedDoc, titleId, callback);
  } else {
    fetch('ascii-and-navbar.html')
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        cachedDoc = parser.parseFromString(html, 'text/html');
        updatePage(cachedDoc, titleId, callback);
      })
      .catch(err => console.error('Error loading terminal parts:', err));
  }
}

/* ============================
   UPDATE PAGE CONTENT
   ============================ */

function updatePage(doc, titleId, callback) {
  const asciiTemplate = doc.getElementById(titleId);

  if (asciiTemplate) {
    const asciiText = asciiTemplate.content.textContent;

    typeAscii(asciiText, document.getElementById('ascii-title'), () => {

      // Load nav bar
      const navTemplate = doc.getElementById('nav-template');
      if (navTemplate) {
        document.getElementById('nav-bar').innerHTML = navTemplate.innerHTML;
        attachTerminalLinkEvents();
      }

      // Load page content
      const contentTemplate = doc.getElementById(titleId + '-content');
      const pageContentDiv = document.getElementById('page-content');
      if (contentTemplate && pageContentDiv) {
        pageContentDiv.innerHTML = contentTemplate.innerHTML;
      }

      if (titleId === "projects") {
        window.initProjectsPage();
      }

      // Update browser tab title
      document.title = capitalizeFirstLetter(titleId) + " - Terminal";

      if (callback) callback();
    });

  } else {
    console.error('ASCII template not found:', titleId);
  }
}

/* ============================
   HELPERS
   ============================ */

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/* ============================
   ASCII TYPING EFFECT
   ============================ */

function typeAscii(text, targetElement, callback) {
    if (asciiTypeTimeout) {
        clearTimeout(asciiTypeTimeout);
        asciiTypeTimeout = null;
    }

    targetElement.innerHTML = "";
    const lines = text.split("\n");
    let lineIndex = 0;

    function typeLine() {
        if (lineIndex < lines.length) {
            const textNode = document.createTextNode(lines[lineIndex]);
            targetElement.appendChild(textNode);

            if (lineIndex < lines.length - 1) {
                targetElement.appendChild(document.createElement("br"));
            }

            lineIndex++;
            asciiTypeTimeout = setTimeout(typeLine, 50);
        } else {
            asciiTypeTimeout = null;
            if (callback) callback();
        }
    }

    typeLine();
}

/* ============================
   TERMINAL OUTPUT (BOTTOM LEFT)
   ============================ */

let terminalTypeTimeout = null;
let terminalFadeTimeout = null;

function showTerminalOutput(text) {
    const box = document.getElementById("terminal-output");

    // Cancel any previous typing animation
    if (terminalTypeTimeout) {
        clearTimeout(terminalTypeTimeout);
        terminalTypeTimeout = null;
    }

    // Cancel any previous fade-out
    if (terminalFadeTimeout) {
        clearTimeout(terminalFadeTimeout);
        terminalFadeTimeout = null;
    }

    // Reset + show box
    box.style.opacity = 1;
    box.textContent = "";

    let i = 0;

    function typeChar() {
        if (i < text.length) {
            box.textContent += text[i];
            i++;
            terminalTypeTimeout = setTimeout(typeChar, 20);
        } else {
            // Schedule fade-out AFTER typing finishes
            terminalFadeTimeout = setTimeout(() => {
                box.style.opacity = 0;
            }, 4000);
        }
    }

    typeChar();
}

/* ============================
   NAV BAR + FAKE CMD HANDLERS
   ============================ */

function attachTerminalLinkEvents() {
  const blinkingCursor = document.querySelector('.blinking-cursor');

  // NEW: nav bar terminal messages
  const navButtons = document.querySelectorAll('#nav-bar a[data-term]');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {

      runScanlineWipe();

      document.getElementById('page-content').innerHTML = "";
      document.getElementById('ascii-title').innerHTML = "";

      const msg = btn.dataset.term;
      if (msg) showTerminalOutput(msg);
    });
  });

  // Fake command links (cd /Certificates, etc.)
  const fakeLinks = document.querySelectorAll('.fake-cmd');

  fakeLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      blinkingCursor.style.display = 'none';

      const cmd = link.dataset.cmd;
      const titleId = getTitleIdFromCmd(cmd);

      if (titleId) {
        loadTerminalParts(titleId);
      }

      blinkingCursor.style.display = 'inline-block';
    });
  });
}

/* ============================
   COMMAND → PAGE MAPPING
   ============================ */

function getTitleIdFromCmd(cmd) {
  switch(cmd) {
    case "cd": return "profile";
    case "cd /Certificates": return "certificates";
    case "cd /Projects": return "projects";
    case "cd /Contact": return "contact";
    default: return null;
  }
}

/* ============================
   SCANLINE SCREEN CLEAR
   ============================ */

function runScanlineWipe() {
    const wipe = document.getElementById("scanline-wipe");

    // Reset animation
    wipe.style.animation = "none";
    wipe.offsetHeight; // force reflow
    wipe.style.animation = "scanline-wipe 0.35s linear";
}

/* ============================
   GITHUB AUTOLOADER & ClICK HANDLE
   ============================ */

// ===============================
// Config
// ===============================
const GITHUB_USER = 'Mezith';
const GITHUB_API_BASE = 'https://api.github.com';

// Optional: simple in-memory cache to avoid refetching
const repoTreeCache = new Map();

// ===============================
// Entry point
// ===============================
async function initProjectsPage() {
    const container = document.getElementById('projects-output');
    if (!container) return;

    container.textContent = 'Scanning GitHub repositories...';

    try {
        const repos = await fetchRepos(GITHUB_USER);
        if (!repos.length) {
            container.textContent = 'No repositories found.';
            return;
        }

        container.textContent = '';
        const listEl = document.createElement('div');
        listEl.className = 'projects-list';
        container.appendChild(listEl);

        for (const repo of repos) {
            const repoEl = createRepoBlock(repo);
            listEl.appendChild(repoEl);
        }
    } catch (err) {
        console.error(err);
        container.textContent = 'Error loading repositories. Please try again later.';
    }
}

// ===============================
// GitHub API helpers
// ===============================

async function fetchRepos(username) {
    const url = `${GITHUB_API_BASE}/users/${username}/repos?per_page=100&sort=updated`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch repos');
    return res.json();
}

async function fetchRepoTree(repoName, defaultBranch) {
    const cacheKey = `${repoName}@${defaultBranch}`;
    if (repoTreeCache.has(cacheKey)) {
        return repoTreeCache.get(cacheKey);
    }

    const url = `${GITHUB_API_BASE}/repos/${GITHUB_USER}/${repoName}/git/trees/${defaultBranch}?recursive=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch tree for ${repoName}`);
    const data = await res.json();

    const tree = data.tree || [];
    repoTreeCache.set(cacheKey, tree);
    return tree;
}

// ===============================
// Rendering
// ===============================
function createRepoBlock(repo) {
    const wrapper = document.createElement('div');
    wrapper.className = 'repo-block';

    const header = document.createElement('div');
    header.className = 'repo-header';

    const title = document.createElement('button');
    title.className = 'repo-toggle crt-link';
    title.textContent = `▶ ${repo.name}`;
    title.setAttribute('data-open', 'false');

    const meta = document.createElement('span');
    meta.className = 'repo-meta';
    meta.textContent = ` (${repo.language || 'Unknown'}, updated ${new Date(repo.updated_at).toLocaleDateString()})`;

    const githubLink = document.createElement('a');
    githubLink.className = 'repo-gh-link crt-link';
    githubLink.href = repo.html_url;
    githubLink.target = '_blank';
    githubLink.rel = 'noopener noreferrer';
    githubLink.textContent = '[open]';

    header.appendChild(title);
    header.appendChild(meta);
    header.appendChild(githubLink);

    const body = document.createElement('div');
    body.className = 'repo-body';
    body.style.display = 'none';
    body.textContent = 'Loading tree...';

    title.addEventListener('click', async () => {
        const isOpen = title.getAttribute('data-open') === 'true';
        if (isOpen) {
            body.style.display = 'none';
            title.setAttribute('data-open', 'false');
            title.textContent = `▶ ${repo.name}`;   // collapsed indicator
        } else {
            title.setAttribute('data-open', 'true');
            body.style.display = 'block';
            title.textContent = `▼ ${repo.name}`;   // expanded indicator
        }

        // Only load once
        if (!body.getAttribute('data-loaded')) {
            try {
                const tree = await fetchRepoTree(repo.name, repo.default_branch);
                renderRepoTree(repo, tree, body);
                body.setAttribute('data-loaded', 'true');
            } catch (err) {
                console.error(err);
                body.textContent = 'Error loading file tree.';
            }
        }
    });

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
}

function renderRepoTree(repo, tree, container) {
    container.textContent = '';

    // Build a nested structure from flat paths
    const root = {};

    for (const item of tree) {
        const parts = item.path.split('/');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            if (!current[part]) {
                current[part] = {
                    __type: isLast ? item.type : 'tree',
                    __children: {}
                };
            }

            current = current[part].__children;
        }
    }

    const ul = document.createElement('ul');
    ul.className = 'tree-root';
    buildTreeDom(repo, root, ul, '');
    container.appendChild(ul);
}

function buildTreeDom(repo, node, parentEl, currentPath) {
    const entries = Object.entries(node).sort(([aKey, aVal], [bKey, bVal]) => {
        // Folders first, then files, alphabetical
        const aIsDir = aVal.__type === 'tree';
        const bIsDir = bVal.__type === 'tree';
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return aKey.localeCompare(bKey);
    });

    for (const [name, info] of entries) {
        const li = document.createElement('li');
        li.className = info.__type === 'tree' ? 'tree-dir' : 'tree-file';

        const fullPath = currentPath ? `${currentPath}/${name}` : name;
        const ghUrl = `https://github.com/${GITHUB_USER}/${repo.name}/` +
                      (info.__type === 'tree'
                        ? `tree/${repo.default_branch}/${fullPath}`
                        : `blob/${repo.default_branch}/${fullPath}`);

        if (info.__type === 'tree') {
            const toggle = document.createElement('button');
            toggle.className = 'tree-toggle crt-link';
            toggle.textContent = `[+] ${name}`;
            toggle.setAttribute('data-open', 'false');

            const childUl = document.createElement('ul');
            childUl.style.display = 'none';

            toggle.addEventListener('click', () => {
                const isOpen = toggle.getAttribute('data-open') === 'true';
                toggle.setAttribute('data-open', isOpen ? 'false' : 'true');
                toggle.textContent = `${isOpen ? '[+]' : '[-]'} ${name}`;
                childUl.style.display = isOpen ? 'none' : 'block';
            });

            const link = document.createElement('a');
            link.href = ghUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'tree-gh-link crt-link';
            link.textContent = ' [git]';

            li.appendChild(toggle);
            li.appendChild(link);

            buildTreeDom(repo, info.__children, childUl, fullPath);
            li.appendChild(childUl);
        } else {
            const fileLink = document.createElement('a');
            fileLink.href = ghUrl;
            fileLink.target = '_blank';
            fileLink.rel = 'noopener noreferrer';
            fileLink.className = 'tree-file-link crt-link';
            fileLink.textContent = name;
            li.appendChild(fileLink);
        }

        parentEl.appendChild(li);
    }
}

// Expose entry for your page loader
window.initProjectsPage = initProjectsPage;


/* ============================
   INITIAL PAGE LOAD
   ============================ */

function loadPage(pageId) {
  loadTerminalParts(pageId);
}

loadPage('profile');

