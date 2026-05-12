const { ipcRenderer } = require("electron");

ipcRenderer.send("preload-ready");

let nextNotificationId = 1;
const notifications = new Map();

class LocalNotification extends EventTarget {
  static permission = "granted";

  static requestPermission(callback) {
    if (typeof callback === "function") {
      callback("granted");
    }

    return Promise.resolve("granted");
  }

  constructor(title, options = {}) {
    super();

    this.id = String(nextNotificationId++);
    this.title = title;
    this.body = options.body || "";
    this.silent = Boolean(options.silent);
    this.onclick = null;
    this.onshow = null;
    this.onerror = null;
    this.onclose = null;

    notifications.set(this.id, this);
    ipcRenderer.send("web-notification", {
      id: this.id,
      title: this.title,
      body: this.body,
      silent: this.silent
    });

    queueMicrotask(() => {
      const event = new Event("show");
      this.dispatchEvent(event);
      if (typeof this.onshow === "function") {
        this.onshow(event);
      }
    });
  }

  close() {
    notifications.delete(this.id);
    const event = new Event("close");
    this.dispatchEvent(event);
    if (typeof this.onclose === "function") {
      this.onclose(event);
    }
  }
}

ipcRenderer.on("web-notification-click", (_event, id) => {
  const notification = notifications.get(id);

  if (!notification) {
    return;
  }

  const event = new Event("click");
  notification.dispatchEvent(event);

  if (typeof notification.onclick === "function") {
    notification.onclick(event);
  }
});

Object.defineProperty(window, "Notification", {
  configurable: true,
  value: LocalNotification
});
