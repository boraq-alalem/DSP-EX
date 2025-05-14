// script.js - الصفحة الرئيسية

const quizListElem = document.getElementById('quiz-list');
const darkToggle = document.getElementById('toggle-dark');
function setMainMode(isDark) {
  if(isDark) {
    document.body.classList.add('dark-mode');
    darkToggle.textContent = 'الوضع الفاتح';
  } else {
    document.body.classList.remove('dark-mode');
    darkToggle.textContent = 'الوضع الداكن';
  }
  localStorage.setItem('quiz_mode_dark', isDark ? '1' : '0');
}
darkToggle.onclick = function() {
  setMainMode(!document.body.classList.contains('dark-mode'));
};
setMainMode(localStorage.getItem('quiz_mode_dark') === '1');
const quizzes = [
  { file: 'ch_3.json',      name: 'Z-Transform' },
  { file: 'ch_4.json',      name: 'DFT & FFT' },
  { file: 'ch_4_3.json',    name: 'Z-Transform & DFT' },
  { file: 'ch_5.json',      name: 'FIR & IIR Filter' },
  { file: 'ch_5_4_3.json',  name: 'مراجعة شاملة' }
];

function getQuizResult(quizFile) {
  const key = 'quiz_result_' + quizFile;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function humanQuizName(file) {
  const quiz = quizzes.find(q => q.file === file);
  return quiz ? quiz.name : file.replace('.json', '');
}

function renderQuizList() {
  quizListElem.innerHTML = '';
  quizzes.forEach(quiz => {
    const result = getQuizResult(quiz.file);
    const item = document.createElement('div');
    item.className = 'quiz-item';
    item.innerHTML = `
      <div>
        <strong>${quiz.name}</strong>
        ${result ? `<div class="last-result">آخر نتيجة: <span style="color:${result.pass ? 'var(--success-color)' : 'var(--error-color)'}">${result.score}/${result.total} (${result.percent}%)</span></div>` : '<div class="last-result">لم يتم الحل بعد</div>'}
      </div>
      <button onclick="location.href='quiz.html?quiz=${encodeURIComponent(quiz.file)}'">ابدأ الاختبار</button>
    `;
    quizListElem.appendChild(item);
  });
}

// الوضع الداكن
function setDarkMode(on) {
  document.body.classList.toggle('dark-mode', on);
  localStorage.setItem('dark_mode', on ? '1' : '0');
  darkToggle.textContent = on ? '☀️' : '🌙';
}
darkToggle.onclick = () => setDarkMode(!document.body.classList.contains('dark-mode'));
(function initDark() {
  const saved = localStorage.getItem('dark_mode');
  setDarkMode(saved === '1');
})();

renderQuizList();

