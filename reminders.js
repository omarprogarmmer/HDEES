/* Browser fallback; the Android app schedules reminders with native alarms. */
(function() {
  if (window.AndroidNotifications) return;

  const REMINDERS_KEY = 'app_reminders';
  const LAST_SENT_KEY = 'app_reminders_last_sent';
  const CHECK_INTERVAL = 15 * 1000;
  const appBaseUrl = new URL('.', document.currentScript.src);

  function getReminders() {
    try {
      const saved = JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn('تعذر قراءة التذكيرات المحفوظة:', error);
      return [];
    }
  }

  function getTodayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  async function sendReminder(reminder, sentToday) {
    const message = typeof reminder.message === 'string' ? reminder.message.trim() : '';
    if (!reminder.id || !/^\d{2}:\d{2}$/.test(reminder.time) || !message) return;
    if (Notification.permission !== 'granted') return;

    sentToday[reminder.id] = getTodayKey();
    localStorage.setItem(LAST_SENT_KEY, JSON.stringify(sentToday));

    const options = {
      body: message,
      icon: new URL('icon-192.png', appBaseUrl).href,
      tag: `app-reminder-${reminder.id}`
    };

    try {
      const registration = 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration()
        : null;

      if (registration) {
        await registration.showNotification('تذكير من تطبيق حديث', options);
        return;
      }

      const notification = new Notification('تذكير من تطبيق حديث', options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('تعذر إرسال التذكير:', error);
    }
  }

  async function checkReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    let sentToday = {};
    try {
      sentToday = JSON.parse(localStorage.getItem(LAST_SENT_KEY) || '{}');
      if (!sentToday || typeof sentToday !== 'object' || Array.isArray(sentToday)) {
        sentToday = {};
      }
    } catch (error) {
      console.warn('تعذر قراءة سجل التذكيرات:', error);
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = getTodayKey();

    for (const reminder of getReminders()) {
      if (reminder.time === currentTime && sentToday[reminder.id] !== today) {
        await sendReminder(reminder, sentToday);
      }
    }
  }

  checkReminders();
  window.setInterval(checkReminders, CHECK_INTERVAL);
})();
