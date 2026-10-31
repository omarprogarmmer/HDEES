/* ============================================================
   🧠 منطق المرحلة الثانية — كل مربع له إجابة صحيحة محددة
   ============================================================ */

(function() {
  const dropZone    = document.getElementById('dropZone');
  const itemsPool   = document.getElementById('itemsPool');
  const resultMsg   = document.getElementById('resultMsg');
  const resetBtn    = document.getElementById('resetBtn');
  const checkBtn    = document.getElementById('checkBtn');
  const exitBtn     = document.getElementById('exitBtn');
  const lessonName  = document.getElementById('lessonName');
  const winOverlay  = document.getElementById('winOverlay');
  const clickSound  = document.getElementById('clickSound');
  const sentenceBox = document.getElementById('sentenceBox');

  if (lessonName) lessonName.textContent = CONFIG.id;

  /* ---------- بناء الواجهة ---------- */
  function render() {
    dropZone.innerHTML = '';
    itemsPool.innerHTML = '';
    sentenceBox.textContent = CONFIG.sentence;

    // 1) بناء المربعات
    CONFIG.slots.forEach((slotData, index) => {
      const slot = document.createElement('div');
      slot.className = 'drop-slot';
      slot.dataset.slotIndex = index;
      slot.dataset.correctAnswer = slotData.correctAnswer;
      dropZone.appendChild(slot);
    });

    // 2) بناء المخزون — كل عنصر له itemId ثابت
    const allAnswers = CONFIG.slots.map(s => s.correctAnswer);
    const shuffled = [...allAnswers].sort(() => Math.random() - 0.5);

    shuffled.forEach((text, i) => {
      const slot = document.createElement('div');
      slot.className = 'item-slot';
      slot.dataset.itemId = 'item_' + i;   // ✅ itemId ثابت

      const dragEl = document.createElement('div');
      dragEl.className = 'drag-item';
      dragEl.textContent = text;
      dragEl.dataset.answer = text;
      dragEl.dataset.itemId = 'item_' + i;  // ✅ نفس المعرّف على العنصر نفسه

      slot.appendChild(dragEl);
      itemsPool.appendChild(slot);
    });

    resultMsg.textContent = '';
    resultMsg.classList.remove('error');
    winOverlay.classList.remove('show');
    updateSlotsState();
  }

  /* ---------- تحديث الحالة ---------- */
  function updateSlotsState() {
    document.querySelectorAll('.drop-slot').forEach(slot => {
      slot.classList.remove('correct', 'wrong');
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

  /* ---------- المعالج المركزي ---------- */
  function handleClick(e) {
    const dragEl = e.target.closest('.drag-item');
    if (!dragEl) return;

    const parent = dragEl.parentElement;

    // 1) العنصر داخل مربع → أرجعه للمخزون
    if (parent.classList.contains('drop-slot')) {
      returnToPool(dragEl);
      playSound();
      return;
    }

    // 2) العنصر في المخزون → أول مربع فاضي
    const firstEmptySlot = Array.from(document.querySelectorAll('.drop-slot'))
      .find(slot => !slot.querySelector('.drag-item'));

    if (firstEmptySlot) {
      firstEmptySlot.appendChild(dragEl);
      updateSlotsState();
      playSound();
    } else {
      resultMsg.textContent = "⚠️ كل المربعات ممتلئة — أخرج عنصراً أولاً";
      resultMsg.classList.add('error');
      setTimeout(() => {
        resultMsg.textContent = '';
        resultMsg.classList.remove('error');
      }, 2000);
    }
  }

  /* ---------- إعادة عنصر للمخزون ---------- */
  function returnToPool(dragEl) {
    const itemId = dragEl.dataset.itemId;   // ✅ نستخدم itemId بدل answer
    const originalSlot = document.querySelector(`.item-slot[data-item-id="${itemId}"]`);
    if (originalSlot) {
      originalSlot.appendChild(dragEl);
    }
    updateSlotsState();
  }

  /* ---------- إعادة تعيين ---------- */
  function resetExercise() {
    // ✅ خذ نسخة من العناصر ثم أرجعها لأماكنها الأصلية
    const itemsInSlots = Array.from(document.querySelectorAll('.drop-slot .drag-item'));

    itemsInSlots.forEach(dragEl => {
      const itemId = dragEl.dataset.itemId;
      const originalSlot = document.querySelector(`.item-slot[data-item-id="${itemId}"]`);
      if (originalSlot) {
        originalSlot.appendChild(dragEl);
      }
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
      slot.classList.remove('correct', 'wrong');

      if (!dragEl) {
        allFilled = false;
        allCorrect = false;
        return;
      }

      const isCorrect = dragEl.dataset.answer === slot.dataset.correctAnswer;
      if (isCorrect) {
        slot.classList.add('correct');
      } else {
        slot.classList.add('wrong');
        allCorrect = false;
      }
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

  /* ---------- 🔊 الصوت ---------- */
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

  // ✅ استخدم capture: true لضمان التقاط النقرات حتى لو حصل تعارض
  document.querySelector('.page-wrapper').addEventListener('click', handleClick, true);

  /* ---------- تشغيل ---------- */
  render();
})();