// quiz.js - منطق صفحة الاختبار

document.addEventListener('DOMContentLoaded', () => {

    const quizTitle = document.getElementById('quiz-title'); // هذا العنصر لم يعد في الهيدر المرئي دائماً
    const quizContent = document.getElementById('quiz-content');
    // زر "إنهاء الاختبار" الرئيسي
    const endQuizHeaderBtn = document.getElementById('end-quiz-header');
    // العنصر الجديد لعرض النتيجة في الهيدر
    const quizResultDisplay = document.getElementById('quiz-result-display');

    let quizFile = null;
    let quizData = [];
    let questionsOrder = []; // يخزن فهارس الأسئلة في الترتيب الذي ستظهر به (بعد ترتيب الأنواع والعشوائية)
    let choicesOrder = []; // يخزن فهارس خيارات كل سؤال في الترتيب العشوائي الذي ستظهر به
    let userAnswers = []; // يخزن فهرس الخيار الذي اختاره المستخدم في الترتيب المعروض لكل سؤال
    let submitted = false;

    function getQuizFile() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('quiz');
    }

    function humanQuizName(file) {
        return file.replace('.json', '').replace(/_/g, ' - ');
    }

    function shuffle(arr) {
        let a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    async function loadQuiz() {
        quizFile = getQuizFile();
        if (!quizFile) {
            quizContent.innerHTML = '<p>لم يتم تحديد ملف الاختبار.</p>';
            endQuizHeaderBtn.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(quizFile);
            let data = await response.json();
            // إذا كان هناك عنوان في ملف الجيسون استخدمه، وإلا استخدم اسم الملف
            let quizTitleText = data.title ? data.title : humanQuizName(quizFile);
            quizData = Array.isArray(data) ? data : data.questions;

            // ترتيب الأسئلة: MCQ أولاً (عشوائي) ثم TF (عشوائي)
            let mcqs = quizData.filter(q => q.type === 'mcq');
            let tfs = quizData.filter(q => q.type === 'tf');
            mcqs = shuffle(mcqs);
            tfs = shuffle(tfs);
            let orderedAndShuffledQuizData = mcqs.concat(tfs);

            // Map back to original quizData indices if needed, or just use the new order
            // Let's create questionsOrder based on the original indices in quizData
            questionsOrder = orderedAndShuffledQuizData.map(shuffledQ =>
                quizData.findIndex(originalQ => originalQ.id === shuffledQ.id) // Find the original index
            );
             // Update quizData to be the ordered and shuffled one for easier access by displayed index
            quizData = orderedAndShuffledQuizData;


            // توحيد اسم حقل الخيارات ودعم أنواع الإجابات المختلفة في البيانات
            quizData = quizData.map(q => {
                let correctAns = q.correctAnswer;
                const options = q.options || q.choices; // دعم أي اسم لحقل الخيارات

                // إذا كانت correctAnswer حرف (A/B/C/D)
                if (typeof correctAns === 'string' && correctAns.length === 1 && /^[A-Z]$/i.test(correctAns)) {
                    const idx = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(correctAns.toUpperCase());
                    if (idx >= 0 && options && options[idx]) {
                        correctAns = options[idx]; // خذ النص المقابل للخيار
                    }
                }
                // إذا كانت رقم (فهرس في array الخيارات الأصلية)
                 // تأكد من أن options موجودة وأن الرقم ضمن النطاق
                if (!isNaN(Number(correctAns)) && options && options.length > Number(correctAns) && Number(correctAns) >= 0) {
                    correctAns = options[Number(correctAns)]; // خذ النص المقابل للخيار
                }
                 // إذا كان نص مطابق لأحد الخيارات (تطابق كامل أو جزئي)
                 // هذا التحقق تم تحسينه في اللوب أدناه
                 // لا حاجة لتغيير correctAnswer هنا إذا كان نصًا يطابق أحد الخيارات

                return {
                    ...q,
                    correctAnswer: String(correctAns), // تأكد أنها نص للمقارنة لاحقاً
                    options: options // استخدام options كاسم موحد
                };
            });


            // إنشاء ترتيب عشوائي للخيارات لكل سؤال (خاص لأسئلة الاختيارات)
            choicesOrder = quizData.map(q => {
                if (q.type === 'tf') {
                    return [0, 1]; // صواب/خطأ لديهم ترتيب ثابت (0=صحيح, 1=خطأ)
                } else if (q.options) {
                     // أسئلة الاختيارات: رتب فهارس الخيارات عشوائياً
                    return shuffle([...Array(q.options.length).keys()]);
                } else {
                    return []; // لا خيارات
                }
            });

            // تهيئة إجابات المستخدم
            userAnswers = Array(quizData.length).fill(null);
            submitted = false;

             // عرض عنوان الاختبار أسفل الهيدر مباشرة (بقي في HTML)
            quizTitle.textContent = quizTitleText;
            document.title = quizTitleText; // تحديث عنوان الصفحة في المتصفح

            displayQuestions();
            endQuizHeaderBtn.style.display = ''; // إظهار زر إنهاء الاختبار
            quizResultDisplay.textContent = ''; // إخفاء عرض النتيجة حتى يتم الانتهاء
             quizResultDisplay.style.color = ''; // مسح لون النتيجة
        } catch (error) {
            quizContent.innerHTML = `<p style='color:red'>تعذر تحميل الاختبار. تحقق من اسم الملف أو من وجوده في نفس المجلد.</p>`;
            endQuizHeaderBtn.style.display = 'none';
            console.error('فشل تحميل ملف الأسئلة:', quizFile, error);
        }
    }

    function displayQuestions(review = false) { // لا نحتاج wrongs هنا لأننا نحسبها في وقت المراجعة
        quizContent.innerHTML = '';
        // تم التعديل مسبقاً في CSS لجعل الاتجاه LTR افتراضياً

        quizData.forEach((q, i) => { // loop through the currently ordered and shuffled quizData
            const qDiv = document.createElement('div');
            qDiv.className = 'question';
            // ترقيم السؤال
            let questionNumber = i + 1;

            let questionHtml = `<h3>${questionNumber}. ${q.question}</h3>`;
            const choicesDiv = document.createElement('div');
            choicesDiv.className = 'choices';

            if (q.type === 'tf') {
                 // سؤال صواب/خطأ
                // استخدام نصوص عربية للصواب والخطأ
                const tfOptions = ['صحيح', 'خطأ'];
                 // الترتيب هنا ثابت للصواب والخطأ (0, 1)
                tfOptions.forEach((txt, cIdx) => { // cIdx will be 0 or 1
                    const label = document.createElement('label');
                    // userAnswers[i] stores 0 for صحيح or 1 for خطأ
                    let checked = userAnswers[i] === cIdx ? 'checked' : '';
                    let extraClass = '';

                     // determine if this option text matches the correct answer string (True/False from JSON)
                     let isCorrectOptionTextMatch = (txt === 'صحيح' && String(q.correctAnswer).toLowerCase() === 'true') || (txt === 'خطأ' && String(q.correctAnswer).toLowerCase() === 'false');

                    if (review) {
                         // If this is the correct option text
                        if (isCorrectOptionTextMatch) {
                           extraClass = 'correct';
                        }
                        // If user selected this option AND it's wrong
                        else if (userAnswers[i] === cIdx && !isCorrectOptionTextMatch) {
                           extraClass = 'wrong selected';
                        }
                         // If user selected this option (and it's correct - already handled above, but for clarity)
                        else if (userAnswers[i] === cIdx) {
                           extraClass = 'selected'; // Should be correct class, but added for robustness
                        }
                    } else if (userAnswers[i] === cIdx) {
                        extraClass = 'selected'; // Mark as selected in quiz mode
                    }

                    label.className = extraClass;
                    label.innerHTML = `
                        <input type="radio" name="q${i}" value="${cIdx}" ${checked} ${review ? 'disabled' : ''}>
                        <span>${txt}</span>
                    `;
                    // تلوين الخيار المختار مباشرة عند الضغط في وضع الاختبار
                    if (!review) {
                        label.querySelector('input').addEventListener('change', function() {
                            Array.from(choicesDiv.children).forEach(lab => lab.classList.remove('selected'));
                            label.classList.add('selected');
                            userAnswers[i] = parseInt(this.value); // Update user answer here
                        });
                    }
                    choicesDiv.appendChild(label);
                });
            } else if (q.options) {
                // سؤال اختيارات
                 // loop through the shuffled indices for this question
                choicesOrder[i].forEach((originalOptionIndex, j) => { // originalOptionIndex is the index in q.options
                    const label = document.createElement('label');
                    // userAnswers[i] stores the index within the shuffled choicesOrder[i] array
                    // So we compare j (the current position in shuffled order) with userAnswers[i]
                    let checked = userAnswers[i] === j ? 'checked' : '';
                    let extraClass = '';

                    // Determine if the text of this option (using original index) matches the correct answer string
                    let isCorrectOptionTextMatch = q.options[originalOptionIndex] && String(q.options[originalOptionIndex]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();

                    if (review) {
                        // If this is the correct option text
                        if (isCorrectOptionTextMatch) {
                           extraClass = 'correct';
                        }
                        // If user selected THIS option (at shuffled position j) AND it's wrong
                        else if (userAnswers[i] === j && !isCorrectOptionTextMatch) {
                           extraClass = 'wrong selected';
                        }
                         // If user selected THIS option (and it's correct - already handled above)
                        else if (userAnswers[i] === j) {
                           extraClass = 'selected'; // Should be correct class
                        }

                    } else if (userAnswers[i] === j) {
                         extraClass = 'selected'; // Mark as selected in quiz mode
                    }


                    label.className = extraClass;
                    // إزالة البادئة مثل 'A)' من بداية الخيار إذا وجدت
                    let cleanOption = q.options[originalOptionIndex].replace(/^[A-Z]\)\s*/, '');
                    label.innerHTML = `
                        <input type="radio" name="q${i}" value="${j}" ${checked} ${review ? 'disabled' : ''}>
                        <span>${cleanOption}</span>
                    `;
                    // تلوين الخيار المختار مباشرة عند الضغط في وضع الاختبار
                    if (!review) {
                        label.querySelector('input').addEventListener('change', function() {
                            Array.from(choicesDiv.children).forEach(lab => lab.classList.remove('selected'));
                            label.classList.add('selected');
                             userAnswers[i] = parseInt(this.value); // Update user answer here
                        });
                    }
                    choicesDiv.appendChild(label);
                });
            }


            qDiv.innerHTML = questionHtml;
            qDiv.appendChild(choicesDiv);

            // Modified: Show explanation ONLY if in review mode AND the answer was wrong
            let isAnswerCorrectInReview = false;
             // Recalculate correctness based on stored user answer and correct answer text
             let userSelectedOptionText = null;
             if (userAnswers[i] !== null) {
                 if (q.type === 'tf') {
                     userSelectedOptionText = userAnswers[i] === 0 ? 'true' : userAnswers[i] === 1 ? 'false' : null;
                 } else if (q.options && choicesOrder[i]) {
                      // Get the original index of the selected option
                     const originalIndex = choicesOrder[i][userAnswers[i]];
                     if (q.options[originalIndex]) {
                         userSelectedOptionText = String(q.options[originalIndex]);
                     }
                 }

                 if (userSelectedOptionText !== null && String(userSelectedOptionText).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
                     isAnswerCorrectInReview = true;
                 }
             }


            // عرض الشرح فقط في وضع المراجعة وعند الإجابة الخاطئة
            if (review && q.explanation && !isAnswerCorrectInReview) {
                const expl = document.createElement('div');
                expl.className = 'explanation';
                expl.innerHTML = `<strong>الإجابة الصحيحة:</strong> ${q.correctAnswer}<br><strong>الشرح:</strong> ${q.explanation}`;
                qDiv.appendChild(expl);
            }
            quizContent.appendChild(qDiv);
        });

        // في وضع المراجعة لا حاجة لزر الإرسال
        if (review) endQuizHeaderBtn.style.display = 'none';
        else if (!submitted) endQuizHeaderBtn.style.display = ''; // تأكد من إظهاره في وضع الاختبار إذا لم يتم الإرسال بعد
    }


    // Event listener for radio button changes - Keep this for initial selection styling,
    // but the actual user answer update is handled in displayQuestions change listener
    // quizContent.addEventListener('change', (e) => {
    //     if (submitted) return; // لا تسمح بالتغيير بعد الإرسال
    //     if (e.target && e.target.type === 'radio') {
    //          // The actual update of userAnswers[i] is now in displayQuestions change listener
    //     }
    // });


    endQuizHeaderBtn.onclick = () => {
        if (submitted) return;
        submitted = true; // منع الإرسالات المتعددة
        let score = 0;
        let wrongs = []; // تخزين فهارس الأسئلة التي تمت الإجابة عليها بشكل خاطئ في الترتيب المعروض

        quizData.forEach((q, i) => { // loop through the currently ordered and shuffled quizData
            let userVal = userAnswers[i]; // إجابة المستخدم في الترتيب المعروض (فهرس الخيار في الترتيب العشوائي لهذا السؤال)

            let isCorrect = false;

             // إذا لم يتم اختيار إجابة لهذا السؤال، فهو خاطئ تلقائياً
            if (userVal === null || userVal === undefined) { // Added undefined check
                 isCorrect = false;
             } else {
                if (q.type === 'tf') {
                    // صواب/خطأ: 0 = صحيح, 1 = خطأ
                    let userTxt = userVal === 0 ? 'true' : userVal === 1 ? 'false' : null;
                    if (userTxt !== null && String(q.correctAnswer).trim().toLowerCase() === userTxt) {
                        isCorrect = true;
                    }
                } else if (q.options && choicesOrder[i]) { // Check if options and choicesOrder exist
                    // الاختيارات: مقارنة نص الخيار المختار بالإجابة الصحيحة
                     // نحتاج فهرس الخيار الأصلي من خلال choicesOrder
                     const originalOptionIndex = choicesOrder[i][userVal]; // userVal is index in shuffled array
                     // Added check for originalOptionIndex validity
                     if (originalOptionIndex !== undefined && q.options[originalOptionIndex]) {
                         if (String(q.options[originalOptionIndex]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
                              isCorrect = true;
                         }
                     } else {
                         // If original option index is invalid, it's wrong
                         isCorrect = false;
                     }
                } else {
                     // Handle case with missing options or invalid question type
                     isCorrect = false;
                }
            }


            if (isCorrect) {
                score++;
            } else {
                wrongs.push(i); // إضافة فهرس السؤال في الترتيب المعروض إلى قائمة الأخطاء
            }
        });

        const totalQuestions = quizData.length;
        const percent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
        const pass = percent >= 50; // يمكن تعديل نسبة النجاح

        // حفظ النتيجة في localStorage (اختياري، ولكن جيد للاستمرارية)
        localStorage.setItem('quiz_result_' + quizFile, JSON.stringify({
            score: score,
            total: totalQuestions,
            percent: percent,
            pass: pass,
            wrongs: wrongs // حفظ فهارس الأسئلة الخاطئة في الترتيب المعروض
        }));

        // --- عرض النتيجة في الهيدر ---
        quizResultDisplay.textContent = `النتيجة: ${score} / ${totalQuestions}`;
         quizResultDisplay.style.color = pass ? 'var(--success-color)' : 'var(--error-color)';


        // إخفاء زر إنهاء الاختبار
        endQuizHeaderBtn.style.display = 'none';

        // إظهار popup النتيجة (إذا كنت لا تزال تريده)
        showResultPopup(score, totalQuestions, percent, pass, wrongs);

        // عرض الأسئلة في وضع المراجعة مع إظهار الإجابات الصحيحة والشرح للأخطاء
        // Pass the indices of the questions that were answered incorrectly in the *displayed* order
        displayQuestions(true); // displayQuestions function will recalculate correctness for review display


    };


    function showResultPopup(score, total, percent, pass, wrongQs) {
        const popup = document.createElement('div');
        popup.className = 'result-popup';
        popup.innerHTML = `
            <div class="result-box">
                <svg class="progress-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" stroke-width="10" fill="none" stroke="var(--progress-bg)"/>
                    <circle cx="50" cy="50" r="44" stroke-width="10" fill="none" stroke="${pass ? 'var(--progress-success)' : 'var(--error-color)'}" stroke-dasharray="${2 * Math.PI * 44}" stroke-dashoffset="${2 * Math.PI * 44 * (1 - percent / 100)}"/>
                </svg>
                <div class="result-score">${score} / ${total}</div>
                <div>نسبة النجاح: <b>${percent}%</b></div>
                <div class="result-actions">
                    <button id="close-btn">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

         // إزالة زر المراجعة من الـ popup بما أن المراجعة تظهر تلقائياً
         const reviewBtn = popup.querySelector('#review-btn');
         if (reviewBtn) reviewBtn.remove();

        document.getElementById('close-btn').onclick = () => {
             popup.remove();
             // يمكنك إضافة إعادة توجيه لصفحة الاختبارات هنا إذا أردت
             // window.location.href = 'index.html';
        };
         // لا حاجة لزر المراجعة المنفصل لأنه يتم عرض المراجعة مباشرة
    }

    // دعم الوضع الداكن تلقائياً
    (function initDark() {
        const saved = localStorage.getItem('dark_mode');
        document.body.classList.toggle('dark-mode', saved === '1');
    })();

    // زر تغيير الوضع يتحرك يمين أو يسار حسب الوضع
    var toggleDarkBtn = document.getElementById('toggle-dark');
     // لا حاجة لتحريك الزر بال float بعد الآن مع استخدام flexbox للهيدر
    // function updateToggleDarkPosition() {
    //     if (document.body.classList.contains('dark-mode')) {
    //         toggleDarkBtn.style.float = 'right';
    //     } else {
    //         toggleDarkBtn.style.float = 'left';
    //     }
    // }
    if (toggleDarkBtn) {
        toggleDarkBtn.onclick = () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('dark_mode', document.body.classList.contains('dark-mode') ? '1' : '0');
            // updateToggleDarkPosition();
        };
        // updateToggleDarkPosition();
    }

    loadQuiz();
});