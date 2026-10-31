/* ============================================================
   ⚙️ settings-loader.js
   ملف مشترك: يطبّق الإعدادات (الوضع + حجم الخط) فوراً على كل الصفحات
   ضعه في <head> قبل أي CSS أو سكربت آخر
   ============================================================ */
(function() {
  try {
    const theme = localStorage.getItem('app_theme') || 'light';
    const font  = localStorage.getItem('app_font_size') || 'medium';
    const html  = document.documentElement;

    // 🔠 حجم الخط
    html.classList.add('font-' + font);

    // 🌙 الوضع الداكن
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    console.warn('تعذر تحميل الإعدادات:', e);
  }
})();

/* 🔄 مزامنة فورية بين التبويبات المفتوحة */
window.addEventListener('storage', function(e) {
  const html = document.documentElement;

  if (e.key === 'app_theme') {
    if (e.newValue === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
  }

  if (e.key === 'app_font_size') {
    html.classList.remove('font-small', 'font-medium', 'font-large');
    html.classList.add('font-' + (e.newValue || 'medium'));
  }
});