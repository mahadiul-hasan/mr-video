export function runAdScript(
  script: string,
  options: { renderMarkup?: boolean } = {},
) {
  if (typeof window === "undefined") return;

  const container = document.createElement("div");
  container.setAttribute("data-ad-engine-container", "true");
  container.innerHTML = script;

  const scripts = Array.from(container.querySelectorAll("script"));
  scripts.forEach((scriptNode) => scriptNode.remove());

  if (options.renderMarkup && container.childNodes.length > 0) {
    document.body.appendChild(container);
  }

  for (const scriptNode of scripts) {
    const executableScript = document.createElement("script");

    for (const attribute of Array.from(scriptNode.attributes)) {
      executableScript.setAttribute(attribute.name, attribute.value);
    }

    if (!executableScript.hasAttribute("async")) {
      executableScript.async = false;
    }

    executableScript.text = scriptNode.text;
    document.body.appendChild(executableScript);
  }
}

type RenderAdScriptOptions = {
  appendScriptsTo?: "target" | "body";
};

let renderQueue = Promise.resolve();

function createDocumentWriteRedirect(target: HTMLElement) {
  const originalWrite = document.write.bind(document);
  const originalWriteln = document.writeln.bind(document);

  const writeToTarget = (...html: string[]) => {
    if (!target.isConnected) return;
    target.insertAdjacentHTML("beforeend", html.join(""));
  };

  document.write = writeToTarget;
  document.writeln = (...html: string[]) => writeToTarget(...html, "\n");

  return () => {
    document.write = originalWrite;
    document.writeln = originalWriteln;
  };
}

function renderAdScriptNow(
  target: HTMLElement,
  script: string,
  options: RenderAdScriptOptions = {},
): Promise<void> {
  target.innerHTML = "";

  const container = document.createElement("div");
  container.innerHTML = script;

  const scripts = Array.from(container.querySelectorAll("script"));
  scripts.forEach((scriptNode) => scriptNode.remove());

  while (container.firstChild) {
    target.appendChild(container.firstChild);
  }

  const restoreDocumentWrite = createDocumentWriteRedirect(target);
  const scriptParent =
    options.appendScriptsTo === "body" ? document.body : target;
  let pendingExternalScripts = 0;
  let restored = false;

  const restoreOnce = () => {
    if (restored) return;
    restored = true;
    restoreDocumentWrite();
  };

  return new Promise((resolve) => {
    const finish = () => {
      restoreOnce();
      resolve();
    };

    for (const scriptNode of scripts) {
      const executableScript = document.createElement("script");

      for (const attribute of Array.from(scriptNode.attributes)) {
        executableScript.setAttribute(attribute.name, attribute.value);
      }

      if (!executableScript.hasAttribute("async")) {
        executableScript.async = false;
      }

      executableScript.text = scriptNode.text;

      if (executableScript.src) {
        pendingExternalScripts++;
        executableScript.addEventListener(
          "load",
          () => {
            pendingExternalScripts--;
            if (pendingExternalScripts <= 0) finish();
          },
          { once: true },
        );
        executableScript.addEventListener(
          "error",
          () => {
            pendingExternalScripts--;
            if (pendingExternalScripts <= 0) finish();
          },
          { once: true },
        );
      }

      scriptParent.appendChild(executableScript);
    }

    if (pendingExternalScripts === 0) {
      window.setTimeout(finish, 0);
    } else {
      window.setTimeout(finish, 15000);
    }
  });
}

export function renderAdScript(
  target: HTMLElement,
  script: string,
  options: RenderAdScriptOptions = {},
) {
  renderQueue = renderQueue
    .catch(() => {})
    .then(() => renderAdScriptNow(target, script, options));
}
