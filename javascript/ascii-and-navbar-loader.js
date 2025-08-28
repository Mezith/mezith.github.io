let cachedDoc = null;

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

function updatePage(doc, titleId, callback) {
  const asciiTemplate = doc.getElementById(titleId);
  if (asciiTemplate) {
    const asciiText = asciiTemplate.content.textContent;
    typeAscii(asciiText, document.getElementById('ascii-title'), () => {
      const navTemplate = doc.getElementById('nav-template');
      if (navTemplate) {
        document.getElementById('nav-bar').innerHTML = navTemplate.innerHTML;
        attachTerminalLinkEvents();
      }
      const contentTemplate = doc.getElementById(titleId + '-content');
      const pageContentDiv = document.getElementById('page-content');
      if (contentTemplate && pageContentDiv) {
        pageContentDiv.innerHTML = contentTemplate.innerHTML;
      }
      // Update browser tab title here:
      document.title = capitalizeFirstLetter(titleId) + " - Terminal";

      if (callback) callback();
    });
  } else {
    console.error('ASCII template not found:', titleId);
  }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


function typeAscii(text, targetElement, callback) {
  targetElement.innerHTML = ""; // Clear old content
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
      setTimeout(typeLine, 50);
    } else {
      if (callback) callback();
    }
  }

  typeLine();
}

function attachTerminalLinkEvents() {
  const fakeLinks = document.querySelectorAll('.fake-cmd');
  const responseBox = document.getElementById('terminal-response');
  const blinkingCursor = document.querySelector('.blinking-cursor');

  function typeCommand(command, callback) {
    responseBox.textContent = 'devin@terminal:~$ ';
    let i = 0;
    function typeChar() {
      if (i < command.length) {
        responseBox.textContent += command[i];
        i++;
        setTimeout(typeChar, 50);
      } else {
        responseBox.textContent += "\n";
        setTimeout(callback, 300);
      }
    }
    typeChar();
  }

  function simulateCommandOutput(command, callback) {
    const outputs = {
      "cd": "Loading Profile Page...",
      "cd /Certificates": "Loading Certificates Page...",
      "cd /Projects": "Loading Projects Page...",
      "cd /Contact": "Loading Contact Page..."
    };

    let output = outputs[command] || "Command not found.";
    let i = 0;

    function typeChar() {
      if (i < output.length) {
        responseBox.textContent += output[i];
        i++;
        setTimeout(typeChar, 10);
      } else {
        if (callback) callback();
      }
    }

    typeChar();
  }

  function getTitleIdFromCmd(cmd) {
    switch(cmd) {
      case "cd": return "profile";
      case "cd /Certificates": return "certificates";
      case "cd /Projects": return "projects";
      case "cd /Contact": return "contact";
      default: return null;
    }
  }

  fakeLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      blinkingCursor.style.display = 'none';
      const cmd = link.dataset.cmd;
      document.getElementById('page-content').innerHTML = '';
      responseBox.textContent = "";

      typeCommand(cmd, () => {
        simulateCommandOutput(cmd, () => {
          const titleId = getTitleIdFromCmd(cmd);
          if (titleId) {
            loadTerminalParts(titleId);
          }
          blinkingCursor.style.display = 'inline-block';
        });
      });
    });
  });
}

// Exposed for initial page load
function loadPage(pageId) {
  loadTerminalParts(pageId);
}

// Initial call to load profile page on script load
loadPage('profile');

