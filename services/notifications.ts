
import { APP_NAME } from '../constants';

export const notificationService = {
  // Check if the browser supports notifications
  isSupported: () => 'Notification' in window && 'serviceWorker' in navigator,

  // Check current permission status
  getPermission: () => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  // Request permission from the user
  requestPermission: async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    return permission;
  },

  // Send a notification via Service Worker
  send: async (title: string, body?: string, tag?: string) => {
    if (Notification.permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/ortho-app-icon-192.png',
        badge: '/ortho-app-icon-192.png',
        vibrate: [100, 50, 100],
        tag: tag || 'general',
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
      } as any);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  },

  // Specific helper for scheduled events
  sendSummary: (count: number, type: 'TRANSACTION' | 'WORK_LOG') => {
      const title = type === 'TRANSACTION' ? 'Bills Paid' : 'Work Logged';
      const body = type === 'TRANSACTION' 
        ? `${count} recurring transaction${count > 1 ? 's' : ''} processed successfully.`
        : `${count} automated work entr${count > 1 ? 'ies' : 'y'} added to your schedule.`;
      
      notificationService.send(title, body, type);
  }
};
