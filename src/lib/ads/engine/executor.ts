export function runAdScript(script: string) {
  if (typeof window === "undefined") return;

  const container = document.createElement("div");
  container.setAttribute("data-ad-engine-container", "true");
  container.innerHTML = script;

  const scripts = Array.from(container.querySelectorAll("script"));
  scripts.forEach((scriptNode) => scriptNode.remove());

  if (container.childNodes.length > 0) {
    document.body.appendChild(container);
  }

  for (const scriptNode of scripts) {
    const executableScript = document.createElement("script");

    for (const attribute of Array.from(scriptNode.attributes)) {
      executableScript.setAttribute(attribute.name, attribute.value);
    }

    executableScript.text = scriptNode.text;
    document.body.appendChild(executableScript);
  }
}

export function renderAdScript(target: HTMLElement, script: string) {
  target.innerHTML = "";

  const container = document.createElement("div");
  container.innerHTML = script;

  const scripts = Array.from(container.querySelectorAll("script"));
  scripts.forEach((scriptNode) => scriptNode.remove());

  while (container.firstChild) {
    target.appendChild(container.firstChild);
  }

  for (const scriptNode of scripts) {
    const executableScript = document.createElement("script");

    for (const attribute of Array.from(scriptNode.attributes)) {
      executableScript.setAttribute(attribute.name, attribute.value);
    }

    executableScript.text = scriptNode.text;
    target.appendChild(executableScript);
  }
}
