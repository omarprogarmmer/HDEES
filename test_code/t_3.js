/* ============================================================
   🧠 منطق المرحلة الثالثة — اختيار من متعدد (قلب واحد)
   ============================================================ */

(function() {
  const questionBox  = document.getElementById('questionBox');
  const optionsList  = document.getElementById('optionsList');
  const resultMsg    = document.getElementById('resultMsg');
  const resetBtn     = document.getElementById('resetBtn');
  const exitBtn      = document.getElementById('exitBtn');
  const lessonName   = document.getElementById('lessonName');
  const winOverlay   = document.getElementById('winOverlay');
  const loseOverlay  = document.getElementById('loseOverlay');
  const clickSound   = document.getElementById('clickSound');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  if (lessonName) lessonName.textContent = CONFIG.id;

  let activeQuestions = [];   // الأسئلة المختارة عشوائياً
  let currentIndex = 0;       // السؤال الحالي
  let answered = false;       // منع الضغط المتكرر
  let finished = false;       // منع المزيد بعد الخسارة/الفوز

  /* ---------- بدء المرحلة ---------- */
  function startExercise() {
    // 1) اختيار أسئلة عشوائية
    const all = [...CONFIG.questions];
    const shuffled = all.sort(() => Math.random() - 0.5);
    const count = Math.min(CONFIG.questionsToShow, shuffled.length);
    activeQuestions = shuffled.slice(0, count);

    currentIndex = 0;
    answered = false;
    finished = false;

    resultMsg.textContent = '';
    resultMsg.classList.remove('error');
    winOverlay.classList.remove('show');
    loseOverlay.classList.remove('show');

    showQuestion();
  }

  /* ---------- عرض السؤال الحالي ---------- */
  function showQuestion() {
    if (finished) return;

    const q = activeQuestions[currentIndex];
    if (!q) return;

    // حدّث شريط التقدم
    const progress = ((currentIndex) / activeQuestions.length) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `السؤال ${currentIndex + 1} من ${activeQuestions.length}`;

    // نص السؤال
    questionBox.textContent = q.question;

    // بناء الخيارات (مع خلط ترتيبها)
    optionsList.innerHTML = '';

    const indices = q.options.map((_, i) => i);
    const shuffledIndices = indices.sort(() => Math.random() - 0.5);

    const letters = ['أ', 'ب', 'ج', 'د'];

    shuffledIndices.forEach((originalIndex, displayIndex) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.letter = letters[displayIndex] || '?';
      btn.dataset.originalIndex = originalIndex;
      btn.textContent = q.options[originalIndex];
      btn.addEventListener('click', () => handleAnswer(btn, originalIndex, q));
      optionsList.appendChild(btn);
    });

    answered = false;
  }

  /* ---------- معالجة الإجابة ---------- */
  function handleAnswer(btn, originalIndex, q) {
    if (answered || finished) return;
    answered = true;

    // عطّل كل الخيارات
    document.querySelectorAll('.option-btn').forEach(b => b.classList.add('disabled'));

    const isCorrect = (originalIndex === q.correct);

    if (isCorrect) {
      // ✅ إجابة صحيحة
      btn.classList.add('correct');
      playSound();
      resultMsg.textContent = "✅ إجابة صحيحة!";
      resultMsg.classList.remove('error');

      // انتقل للسؤال التالي بعد لحظة
      setTimeout(() => {
        currentIndex += 1;

        if (currentIndex >= activeQuestions.length) {
          // 🎉 انتهت المرحلة بنجاح
          onSuccess();
        } else {
          resultMsg.textContent = '';
          showQuestion();
        }
      }, 900);
    } else {
      // ❌ إجابة خاطئة → خسر
      btn.classList.add('wrong');
      playSound();

      // أظهر الإجابة الصحيحة
      document.querySelectorAll('.option-btn').forEach(b => {
        if (parseInt(b.dataset.originalIndex) === q.correct) {
          b.classList.add('correct');
        }
      });

      resultMsg.textContent = CONFIG.wrongMessage;
      resultMsg.classList.add('error');

      setTimeout(() => onLose(), 1200);
    }
  }

  /* ---------- النجاح ---------- */
  function onSuccess() {
    finished = true;
    progressFill.style.width = '100%';
    resultMsg.textContent = CONFIG.successMessage;
    resultMsg.classList.remove('error');

    saveProgress();
    showWinOverlay();

    setTimeout(() => {
      if (CONFIG.successRedirectUrl) window.location.href = CONFIG.successRedirectUrl;
    }, CONFIG.successRedirectDelay);
  }

  /* ---------- الخسارة ---------- */
  function onLose() {
    finished = true;
    resultMsg.textContent = CONFIG.loseMessage;
    resultMsg.classList.add('error');

    loseOverlay.classList.add('show');

    // ❌ لا نحفظ التقدم عند الخسارة
    setTimeout(() => {
      if (CONFIG.loseRedirectUrl) window.location.href = CONFIG.loseRedirectUrl;
    }, CONFIG.loseRedirectDelay);
  }

  /* ---------- حفظ التقدم (مرة واحدة فقط) ---------- */
  function saveProgress() {
    try {
      let solved = JSON.parse(localStorage.getItem(CONFIG.solvedListKey) || '[]');

      // ✅ لا تزد العدد إذا كان قد لعبها سابقاً
      if (solved.includes(CONFIG.id)) {
        console.log('ℹ️ المرحلة مكتملة مسبقاً — لن يُزاد العدد');
        return;
      }

      let count = parseInt(localStorage.getItem(CONFIG.exercisesStagesKey) || '0');
      count += 1;
      localStorage.setItem(CONFIG.exercisesStagesKey, count);

      solved.push(CONFIG.id);
      localStorage.setItem(CONFIG.solvedListKey, JSON.stringify(solved));
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
  resetBtn.addEventListener('click', () => {
    startExercise();
  });

  exitBtn.addEventListener('click', () => {
    if (confirm(CONFIG.exitConfirmMessage)) {
      window.location.href = CONFIG.exitUrl;
    }
  });

  /* ---------- تشغيل ---------- */
  startExercise();
})();