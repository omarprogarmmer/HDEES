/* ============================================================
   🚀 تشغيل الدرس
   ============================================================ */

document.getElementById('lessonName').textContent = CONFIG.lessonName;

const img        = document.getElementById('slideImage');
const textEl     = document.getElementById('slideText');
const pageNumEl  = document.getElementById('pageNumber');
const prevBtn    = document.getElementById('prevBtn');
const nextBtn    = document.getElementById('nextBtn');
const finalMsg   = document.getElementById('finalMessage');
const winOverlay = document.getElementById('winOverlay');

/* 🎧 عناصر الصوت */
const listenBtn  = document.getElementById('listenBtn');
const slideAudio = document.getElementById('slideAudio');

const totalPages = CONFIG.slides.length;

/* 🔑 مفتاح localStorage لحفظ رقم الصفحة */
const PAGE_KEY = "current_page_" + CONFIG.lessonId;

let currentIndex = 0;

/* ============================================================
   📄 عرض الصفحة
   ============================================================ */

function showSlide(index) {
  const slide = CONFIG.slides[index];
  img.src = slide.image;
  textEl.textContent = slide.text;
  pageNumEl.textContent = `صفحة ${slide.id}`;

  /* 🎧 إعداد صوت الصفحة الجديدة */
  loadSlideAudio(slide.audio);

  prevBtn.disabled = (index === 0);

  if (index === totalPages - 1) {
    nextBtn.textContent = CONFIG.finishButtonText;
    nextBtn.classList.add('finish');
    nextBtn.classList.remove('next');
  } else {
    nextBtn.textContent = "التالي ←";
    nextBtn.classList.add('next');
    nextBtn.classList.remove('finish');
  }

  /* ✅ نص أسفل الصفحة (متغير حسب كل صفحة) */
  if (finalMsg) {
    finalMsg.textContent = slide.footer || '';
    finalMsg.classList.toggle('show', !!slide.footer);
  }

  currentIndex = index;

  /* 💾 احفظ رقم الصفحة */
  try {
    localStorage.setItem(PAGE_KEY, String(index));
  } catch(_) {}

  /* 🎨 تأثير الظهور */
  const w = document.querySelector('.content-wrapper');
  w.style.animation = 'none'; void w.offsetWidth;
  w.style.animation = 'fadeIn 0.45s ease';
}

/* ============================================================
   🎧 إدارة صوت الصفحة
   ============================================================ */

function loadSlideAudio(src) {
  /* 🛑 أوقف الصوت الحالي */
  try {
    slideAudio.pause();
    slideAudio.currentTime = 0;
  } catch(_) {}

  slideAudio.src = src || "";

  /* 🔄 أعد الزر لحالته الافتراضية */
  updateListenBtn(false);
}

function updateListenBtn(isPlaying) {
  const icon  = listenBtn.querySelector('.listen-icon');
  const label = listenBtn.querySelector('.listen-label');

  if (isPlaying) {
    icon.textContent  = "⏸️";
    label.textContent = "إيقاف";
    listenBtn.classList.add('playing');
  } else {
    icon.textContent  = "🔊";
    label.textContent = "اسمع";
    listenBtn.classList.remove('playing');
  }
}

/* 🖱️ زر الاستماع: تشغيل / إيقاف */
listenBtn.onclick = () => {
  if (!slideAudio.src) return;

  if (slideAudio.paused) {
    slideAudio.play().catch(() => {});
    updateListenBtn(true);
  } else {
    slideAudio.pause();
    updateListenBtn(false);
  }
};

/* 🔁 عند انتهاء الصوت تلقائيًا */
slideAudio.addEventListener('ended', () => updateListenBtn(false));

/* ============================================================
   🎉 تشغيل تأثير الفوز
   ============================================================ */

function showWinCelebration(callback) {
  const winTextEl = winOverlay.querySelector('.win-text');
  winTextEl.textContent = CONFIG.winText;

  createConfetti(winOverlay);
  winOverlay.classList.add('show');

  setTimeout(() => {
    winOverlay.classList.remove('show');
    if (typeof callback === 'function') callback();
  }, CONFIG.winDuration);
}

/* 🎊 إنشاء قصاصات الاحتفال */
function createConfetti(container) {
  const colors = ['#ffd54f', '#ff7043', '#4caf50', '#42a5f5', '#ab47bc', '#ffffff'];
  const count = 60;

  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
    c.style.animationDelay = (Math.random() * 0.5) + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    c.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';
    container.appendChild(c);

    setTimeout(() => c.remove(), 4000);
  }
}

/* ============================================================
   🖱️ أزرار التنقل
   ============================================================ */

prevBtn.onclick = () => {
  if (currentIndex > 0) showSlide(currentIndex - 1);
};

nextBtn.onclick = () => {
  if (currentIndex < totalPages - 1) {
    showSlide(currentIndex + 1);
    return;
  }

  /* 🔒 عطّل الزر لمنع الضغط المتكرر */
  nextBtn.disabled = true;

  /* 🛑 أوقف صوت الصفحة */
  try {
    slideAudio.pause();
    slideAudio.currentTime = 0;
  } catch(_) {}
  updateListenBtn(false);

  /* 🎊 شغّل تأثير الفوز ثم انتقل */
  showWinCelebration(() => {
    /* 🧹 امسح رقم الصفحة */
    try { localStorage.removeItem(PAGE_KEY); } catch(_) {}

    /* 🏆 سجّل الدرس كمكتمل */
    markLessonAsSolved(CONFIG.lessonId);

    /* 🏁 انتقل */
    window.location.href = CONFIG.finishRedirectUrl;
  });
};

/* ============================================================
   🔙 زر الخروج
   ============================================================ */

document.getElementById('exitBtn').onclick = () => {
  if (!confirm(CONFIG.exitConfirmMessage)) return;

  try {
    slideAudio.pause();
    slideAudio.currentTime = 0;
  } catch(_) {}

  try {
    localStorage.removeItem(PAGE_KEY);
    console.log("✅ تم مسح الصفحة المحفوظة");
  } catch(_) {}

  window.location.href = CONFIG.exitUrl;
};

/* ============================================================
   🏆 تسجيل الدرس كمكتمل
   ============================================================ */

function markLessonAsSolved(lessonId) {
  try {
    let solvedList = [];
    try {
      solvedList = JSON.parse(localStorage.getItem(CONFIG.solvedListKey) || "[]");
    } catch (_) { solvedList = []; }

    if (solvedList.includes(lessonId)) {
      console.log("🔒 تم حل هذا الدرس من قبل");
      return;
    }

    solvedList.push(lessonId);
    localStorage.setItem(CONFIG.solvedListKey, JSON.stringify(solvedList));

    const current  = parseInt(localStorage.getItem(CONFIG.lessonsStagesKey) || "0", 10);
    const newCount = current + 1;
    localStorage.setItem(CONFIG.lessonsStagesKey, String(newCount));

    console.log("✅ تم تسجيل الدرس:", lessonId, "| الإجمالي:", newCount);
  } catch (e) {
    console.error("markLessonAsSolved error:", e);
  }
}

/* ============================================================
   🔊 صوت الأزرار (لكل الأزرار ما عدا زر الاستماع)
   ============================================================ */

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.disabled) return;
  if (btn.id === 'listenBtn') return;

  const s = document.getElementById('clickSound');
  if (!s) return;
  s.currentTime = 0;
  s.play().catch(() => {});
}, true);

/* ============================================================
   🚀 استرجاع الحالة عند الفتح
   ============================================================ */

(function init() {
  let savedIndex = 0;

  try {
    const raw = localStorage.getItem(PAGE_KEY);
    if (raw !== null) {
      savedIndex = parseInt(raw, 10);
      if (isNaN(savedIndex) || savedIndex < 0 || savedIndex >= totalPages) {
        savedIndex = 0;
      }
    }
  } catch(_) {
    savedIndex = 0;
  }

  console.log("📖 بدء من الصفحة:", savedIndex + 1);
  showSlide(savedIndex);
})();