/* ============================================================
   🧠 منطق التطبيق — ضغطة واحدة → أول فراغ فاضي
   ============================================================ */

(function() {
  const dropZone   = document.getElementById('dropZone');
  const itemsPool  = document.getElementById('itemsPool');
  const resultMsg  = document.getElementById('resultMsg');
  const resetBtn   = document.getElementById('resetBtn');
  const checkBtn   = document.getElementById('checkBtn');
  const exitBtn    = document.getElementById('exitBtn');
  const lessonName = document.getElementById('lessonName');
  const winOverlay = document.getElementById('winOverlay');
  const clickSound = document.getElementById('clickSound');

  if (lessonName) lessonName.textContent = CONFIG.id;

  /* ---------- بناء الواجهة ---------- */
  function render() {
    dropZone.innerHTML = '';
    itemsPool.innerHTML = '';

    const shuffled = [...CONFIG.items].sort(() => Math.random() - 0.5);

    // بناء الفراغات (الأسئلة) بالترتيب
    CONFIG.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'question-row';

      const label = document.createElement('div');
      label.className = 'question-label';
      label.textContent = item.label;

      const slot = document.createElement('div');
      slot.className = 'drop-slot';
      slot.dataset.correctId = item.id;
      slot.dataset.slotIndex = index;

      row.appendChild(label);
      row.appendChild(slot);
      dropZone.appendChild(row);
    });

    // بناء العناصر في المخزون (مرتبة عشوائياً)
    shuffled.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'item-slot';
      slot.dataset.itemId = item.id;

      const dragEl = document.createElement('div');
      dragEl.className = 'drag-item';
      dragEl.textContent = item.text;
      dragEl.dataset.itemId = item.id;

      slot.appendChild(dragEl);
      itemsPool.appendChild(slot);
    });

    resultMsg.textContent = '';
    resultMsg.classList.remove('error');
    winOverlay.classList.remove('show');
    updateSlotsState();
  }

  /* ---------- ✅ تحديث حالة الفراغات والمخزون ---------- */
  function updateSlotsState() {
    document.querySelectorAll('.drop-slot').forEach(slot => {
      if (slot.querySelector('.drag-item')) {
        slot.classList.add('filled');
      } else {
        slot.classList.remove('filled');
      }
    });

    document.querySelectorAll('.item-slot').forEach(slot => {
      if (slot.querySelector('.drag-item')) {
        slot.classList.remove('taken');
      } else {
        slot.classList.add('taken');
      }
    });
  }

  /* ---------- 🎯 المعالج المركزي ---------- */
  function handleClick(e) {
    const dragEl = e.target.closest('.drag-item');
    if (!dragEl) return;

    const parent = dragEl.parentElement;

    // الحالة 1: العنصر داخل فراغ → أرجعه للمخزون
    if (parent.classList.contains('drop-slot')) {
      returnToPool(dragEl);
      playSound();
      return;
    }

    // الحالة 2: العنصر في المخزون → ضعه في أول فراغ فاضي
    const firstEmptySlot = Array.from(document.querySelectorAll('.drop-slot'))
      .find(slot => !slot.querySelector('.drag-item'));

    if (firstEmptySlot) {
      firstEmptySlot.appendChild(dragEl);
      updateSlotsState();
      playSound();
    } else {
      // لا يوجد فراغ فاضي → رسالة تنبيه
      resultMsg.textContent = "⚠️ كل الفراغات ممتلئة — أخرج عنصراً أولاً";
      resultMsg.classList.add('error');
      setTimeout(() => {
        resultMsg.textContent = '';
        resultMsg.classList.remove('error');
      }, 2000);
    }
  }

  /* ---------- إعادة عنصر إلى المخزون ---------- */
  function returnToPool(dragEl) {
    const itemId = dragEl.dataset.itemId;
    const originalSlot = document.querySelector(`.item-slot[data-item-id="${itemId}"]`);
    if (originalSlot) {
      originalSlot.appendChild(dragEl);
    }
    updateSlotsState();
  }

  /* ---------- إعادة تعيين ---------- */
  function resetExercise() {
    document.querySelectorAll('.drop-slot .drag-item').forEach(dragEl => {
      returnToPool(dragEl);
    });
    updateSlotsState();
    resultMsg.textContent = '';
    resultMsg.classList.remove('error');
    winOverlay.classList.remove('show');
  }

  /* ---------- التحقق ---------- */
  function checkAnswers() {
    const slots = document.querySelectorAll('.drop-slot');
    let allFilled = true;
    let allCorrect = true;

    slots.forEach(slot => {
      const dragEl = slot.querySelector('.drag-item');
      if (!dragEl) { allFilled = false; allCorrect = false; return; }
      if (dragEl.dataset.itemId !== slot.dataset.correctId) allCorrect = false;
    });

    if (!allFilled) {
      resultMsg.textContent = CONFIG.emptyMessage;
      resultMsg.classList.add('error');
      return;
    }

    if (allCorrect) {
      resultMsg.textContent = CONFIG.successMessage;
      resultMsg.classList.remove('error');
      saveProgress();
      showWinOverlay();

      setTimeout(() => {
        if (CONFIG.successRedirectUrl) window.location.href = CONFIG.successRedirectUrl;
      }, CONFIG.successRedirectDelay);
    } else {
      resultMsg.textContent = CONFIG.retryMessage;
      resultMsg.classList.add('error');
    }
  }

  /* ---------- حفظ التقدم ---------- */
  function saveProgress() {
    try {
      let count = parseInt(localStorage.getItem(CONFIG.exercisesStagesKey) || '0');
      count += 1;
      localStorage.setItem(CONFIG.exercisesStagesKey, count);

      let solved = JSON.parse(localStorage.getItem(CONFIG.solvedListKey) || '[]');
      if (!solved.includes(CONFIG.id)) {
        solved.push(CONFIG.id);
        localStorage.setItem(CONFIG.solvedListKey, JSON.stringify(solved));
      }
    } catch (e) {
      console.warn('⚠️ لا يمكن حفظ التقدم:', e);
    }
  }

  /* ---------- تأثير الفوز ---------- */
  function showWinOverlay() {
    winOverlay.classList.add('show');
    document.querySelectorAll('.confetti').forEach(el => el.remove());

    const colors = ['#ffd54f', '#ff8a65', '#4fc3f7', '#aed581', '#f06292', '#ba68c8'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (Math.random() * 2 + 2) + 's';
      c.style.animationDelay = (Math.random() * 1.5) + 's';
      c.style.width  = (Math.random() * 8 + 6) + 'px';
      c.style.height = (Math.random() * 12 + 8) + 'px';
      winOverlay.appendChild(c);
      setTimeout(() => c.remove(), 5000);
    }
  }

  /* ---------- 🔊 تشغيل صوت ---------- */
  function playSound() {
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
    }
  }

  /* ---------- الأحداث ---------- */
  resetBtn.addEventListener('click', resetExercise);
  checkBtn.addEventListener('click', checkAnswers);

  exitBtn.addEventListener('click', () => {
    if (confirm(CONFIG.exitConfirmMessage)) {
      window.location.href = CONFIG.exitUrl;
    }
  });

  // 🎯 مستمع واحد على منطقة المحتوى
  document.querySelector('.page-wrapper').addEventListener('click', handleClick);

  /* ---------- تشغيل ---------- */
  render();
})();