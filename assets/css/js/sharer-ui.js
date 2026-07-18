(function () {
  "use strict";

  if (window.SharerUI) return;

  const ICONS = {
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6M12 7.5h.01"/></svg>',
    success: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/></svg>',
    warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 4.2 3.1 17a2 2 0 0 0 1.7 3h14.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 16.5h.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
  };

  let layer;
  let toastTimer;
  let activeDialog;

  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.className = "sharer-ui-layer";
    layer.setAttribute("aria-live", "off");
    document.body.appendChild(layer);
    return layer;
  }

  function normalizeOptions(input, defaults) {
    if (typeof input === "string") return { ...defaults, message: input };
    return { ...defaults, ...(input || {}) };
  }

  function toast(input) {
    const options = normalizeOptions(input, { type: "info", duration: 2800 });
    const type = ICONS[options.type] ? options.type : "info";
    const host = ensureLayer();
    const previous = host.querySelector(".sharer-ui-toast");
    if (previous) previous.remove();
    clearTimeout(toastTimer);

    const element = document.createElement("div");
    element.className = `sharer-ui-toast sharer-ui-toast--${type}`;
    element.setAttribute("role", type === "error" ? "alert" : "status");
    element.setAttribute("aria-live", type === "error" ? "assertive" : "polite");

    const icon = document.createElement("span");
    icon.className = "sharer-ui-toast__icon";
    icon.innerHTML = ICONS[type];

    const message = document.createElement("span");
    message.className = "sharer-ui-toast__message";
    message.textContent = options.message || "알림이 있습니다.";

    element.append(icon, message);

    if (options.action && options.action.label) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "sharer-ui-toast__action";
      action.textContent = options.action.label;
      action.addEventListener("click", () => {
        dismissToast(element);
        if (typeof options.action.onClick === "function") options.action.onClick();
      });
      element.appendChild(action);
    }

    host.appendChild(element);
    requestAnimationFrame(() => element.classList.add("is-visible"));

    if (options.duration !== 0) {
      toastTimer = window.setTimeout(() => dismissToast(element), Math.max(1200, options.duration));
    }
    return element;
  }

  function dismissToast(element) {
    if (!element) element = layer?.querySelector(".sharer-ui-toast");
    if (!element || !element.isConnected) return;
    clearTimeout(toastTimer);
    element.classList.remove("is-visible");
    window.setTimeout(() => element.remove(), 220);
  }

  function confirmDialog(input) {
    const options = normalizeOptions(input, {
      title: "계속할까요?",
      description: "이 작업을 계속 진행합니다.",
      confirmLabel: "계속",
      cancelLabel: "취소",
      danger: false,
    });

    if (activeDialog) activeDialog(false);

    return new Promise((resolve) => {
      const host = ensureLayer();
      const previouslyFocused = document.activeElement;
      const previousOverflow = document.body.style.overflow;
      const overlay = document.createElement("div");
      overlay.className = "sharer-ui-dialog-overlay";
      overlay.setAttribute("role", "presentation");

      const dialog = document.createElement("section");
      dialog.className = "sharer-ui-dialog";
      dialog.setAttribute("role", "alertdialog");
      dialog.setAttribute("aria-modal", "true");

      const titleId = `sharer-dialog-title-${Date.now()}`;
      const descriptionId = `sharer-dialog-description-${Date.now()}`;
      dialog.setAttribute("aria-labelledby", titleId);
      dialog.setAttribute("aria-describedby", descriptionId);

      const icon = document.createElement("span");
      icon.className = `sharer-ui-dialog__icon sharer-ui-dialog__icon--${options.danger ? "error" : "info"}`;
      icon.innerHTML = ICONS[options.danger ? "warning" : "info"];

      const title = document.createElement("h2");
      title.id = titleId;
      title.className = "sharer-ui-dialog__title";
      title.textContent = options.title;

      const description = document.createElement("p");
      description.id = descriptionId;
      description.className = "sharer-ui-dialog__description";
      description.textContent = options.description;

      const buttons = document.createElement("div");
      buttons.className = "sharer-ui-dialog__buttons";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "sharer-ui-button sharer-ui-button--secondary";
      cancel.textContent = options.cancelLabel;
      const proceed = document.createElement("button");
      proceed.type = "button";
      proceed.className = `sharer-ui-button ${options.danger ? "sharer-ui-button--danger" : "sharer-ui-button--primary"}`;
      proceed.textContent = options.confirmLabel;
      buttons.append(cancel, proceed);
      dialog.append(icon, title, description, buttons);
      overlay.appendChild(dialog);

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        activeDialog = null;
        overlay.classList.remove("is-visible");
        document.removeEventListener("keydown", onKeydown);
        document.body.style.overflow = previousOverflow;
        window.setTimeout(() => overlay.remove(), 220);
        if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
        resolve(value);
      };
      activeDialog = finish;

      const onKeydown = (event) => {
        if (event.key === "Escape") finish(false);
        if (event.key !== "Tab") return;
        const focusable = [cancel, proceed];
        const currentIndex = focusable.indexOf(document.activeElement);
        if (event.shiftKey && currentIndex <= 0) {
          event.preventDefault();
          proceed.focus();
        } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
          event.preventDefault();
          cancel.focus();
        }
      };

      cancel.addEventListener("click", () => finish(false));
      proceed.addEventListener("click", () => finish(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);
      });
      document.addEventListener("keydown", onKeydown);
      document.body.style.overflow = "hidden";
      host.appendChild(overlay);
      requestAnimationFrame(() => {
        overlay.classList.add("is-visible");
        cancel.focus();
      });
    });
  }

  function setFieldMessage(target, input) {
    const field = typeof target === "string" ? document.querySelector(target) : target;
    if (!field) return null;
    const options = normalizeOptions(input, { type: "error", message: "" });
    const id = `${field.id || "sharer-field"}-message`;
    let message = document.getElementById(id);
    if (!message) {
      message = document.createElement("p");
      message.id = id;
      message.className = "sharer-ui-field-message";
      field.insertAdjacentElement("afterend", message);
    }
    message.className = `sharer-ui-field-message sharer-ui-field-message--${options.type}`;
    message.textContent = options.message || "";
    message.hidden = !options.message;
    field.setAttribute("aria-describedby", id);
    field.setAttribute("aria-invalid", options.type === "error" && options.message ? "true" : "false");
    return message;
  }

  window.SharerUI = Object.freeze({
    toast,
    confirm: confirmDialog,
    setFieldMessage,
    dismissToast,
  });
})();
