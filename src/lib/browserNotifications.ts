/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Check if notifications are enabled
 */
export function isNotificationEnabled(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

/**
 * Show a browser notification
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isNotificationEnabled()) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn("Notification permission denied");
      return;
    }
  }

  try {
    const notification = new Notification(title, {
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: options?.tag || "claimpilot-reminder",
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options?.data?.url) {
        window.location.href = options.data.url;
      }
    };
  } catch (error) {
    console.error("Error showing notification:", error);
  }
}

