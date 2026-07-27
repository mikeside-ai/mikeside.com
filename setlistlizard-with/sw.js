/* Setlist Lizard ... With — minimal service worker.
 *
 * Exists for one reason today: Android Chrome only allows notifications via
 * ServiceWorkerRegistration.showNotification(), not the bare Notification
 * constructor. No caching happens here on purpose — the live board's data
 * must always come from the network. This file is also the natural hook if
 * real Web Push (phone-locked notifications) is added later.
 */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if ("focus" in list[i]) return list[i].focus();
    }
    return self.clients.openWindow("/setlistlizard-with/");
  }));
});
