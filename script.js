const app = {
    state: {
        playerName: '',
        tutorialDone: false,
        total: 0,
        correct: 0,
        streak: 0,
        bestStreak: 0,
        wasWrong: false,   // для comebackAfterError
        week: 1,
        lessonIdx: 0,
        currentQ: null,
        currentVisual: 'array',
        unlockedWeeks: [1],
        achievements: [],
        divideTotal: 0,
        geometryTotal: 0
    },

    // ─── INIT ───
    init() {
        this.load();
        if (!this.state.playerName) {
            this.showWelcome();
        } else {
            this.showHome();
        }
    },

    // ─── WELCOME ───
    showWelcome() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-welcome').classList.add('active');
        setTimeout(() => document.getElementById('name-input').focus(), 300);
    },

    submitName() {
        const input = document.getElementById('name-input').value.trim();
        if (!input) {
            document.getElementById('name-input').style.borderColor = 'var(--error)';
            document.getElementById('name-input').setAttribute('placeholder', 'Пожалуйста, введи имя!');
            document.getElementById('name-input').focus();
            return;
        }
        this.state.playerName = input;
        this.save();
        this.showHome();

        // Запустить онбординг если первый раз
        if (!this.state.tutorialDone) {
            setTimeout(() => this.tutorial.start(), 600);
        }
    },

    // ─── HOME ───
    showHome() {
        this.nav('screen-home');
        this.updateHomeGreeting();
        this.renderMap();
        this.renderAchievements();
        this.updateStats();
    },

    updateHomeGreeting() {
        const name = this.state.playerName;
        const el = document.getElementById('home-greeting');
        const sub = document.getElementById('home-subtitle');

        if (name) {
            el.textContent = `Привет, ${name}!`;
            const t = this.state.total;
            if (t === 0) sub.textContent = 'Готов начать путь ниндзя?';
            else if (t < 50) sub.textContent = `Хорошее начало, ${name}!`;
            else if (t < 100) sub.textContent = `Ты настоящий боец, ${name}!`;
            else sub.textContent = `${name} — легенда Математики Исаги!`;
        }
    },

    // ─── NAVIGATION ───
    nav(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        if (screenId === 'screen-map') this.renderMap();
        if (screenId === 'screen-achievements') this.renderAchievements();
        if (screenId === 'screen-home') this.updateHomeGreeting();
    },

    // ─── MOTIVATION ───
    getMotivation(category) {
        const phrases = MOTIVATION[category];
        if (!phrases || phrases.length === 0) return '';
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        return phrase
            .replace(/\{name\}/g, this.state.playerName || 'Ниндзя')
            .replace(/\{n\}/g, this.state.streak);
    },

    // ─── TUTORIAL ───
    tutorial: {
        currentStep: 0,

        start() {
            this.currentStep = 0;
            this.show();
        },

        show() {
            if (this.currentStep >= TUTORIAL.length) {
                this.finish();
                return;
            }
            const step = TUTORIAL[this.currentStep];
            const name = app.state.playerName || 'Ниндзя';

            // Navigate to the right screen
            if (step.screen && this.currentStep > 0) {
                app.nav(step.screen);
                // If navigating to lesson screen, start a lesson
                if (step.screen === 'screen-lesson' && !app.state.currentQ) {
                    app.startLesson(1);
                }
            }

            // Fill modal
            document.getElementById('modal-title').textContent = step.title;
            document.getElementById('modal-text').textContent = step.text.replace(/\{name\}/g, name);
            document.getElementById('modal-btn').textContent = step.btn;
            document.getElementById('modal-skip').style.display = this.currentStep < TUTORIAL.length - 1 ? 'block' : 'none';

            // Show modal
            document.getElementById('modal-overlay').classList.add('visible');
        },

        next() {
            document.getElementById('modal-overlay').classList.remove('visible');
            this.currentStep++;

            if (this.currentStep >= TUTORIAL.length) {
                this.finish();
                return;
            }

            // Small delay before showing next step
            setTimeout(() => this.show(), 400);
        },

        skip() {
            document.getElementById('modal-overlay').classList.remove('visible');
            this.finish();
        },

        finish() {
            app.state.tutorialDone = true;
            app.save();
            document.getElementById('modal-overlay').classList.remove('visible');
        }
    },

    // ─── MAP ───
    renderMap() {
        const container = document.getElementById('weeks-container');
        container.innerHTML = '';
        CURRICULUM.weeks.forEach(week => {
            // Все главы доступны сразу!
            const isLocked = false;
            const div = document.createElement('div');
            div.className = `week-card`;
            div.innerHTML = `
                <div class="week-num">${week.id}</div>
                <div class="week-title">${week.title}</div>
                <div class="week-desc">${week.desc}</div>
                <div class="week-status" style="color:var(--success)">
                    ⚡ Доступно
                </div>
            `;
            div.onclick = () => this.startLesson(week.id);
            container.appendChild(div);
        });
    },

    // ─── LESSON ───
    startLesson(weekId) {
        this.state.week = weekId;
        this.state.lessonIdx = 0;
        this.nav('screen-lesson');
        this.loadQuestion();
    },

    loadQuestion() {
        const week = CURRICULUM.weeks.find(w => w.id === this.state.week);
        const operation = week.operation || 'multiply';
        
        let question = {};
        
        if (operation === 'add') {
            // Сложение: числа от 1 до 20
            const n1 = Math.floor(Math.random() * 15) + 1;
            const n2 = Math.floor(Math.random() * 10) + 1;
            question = { n1, n2, ans: n1 + n2, operation: '+' };
        } else if (operation === 'subtract') {
            // Вычитание: первое число больше второго, результат положительный
            const n1 = Math.floor(Math.random() * 15) + 5;
            const n2 = Math.floor(Math.random() * (n1 - 1)) + 1;
            question = { n1, n2, ans: n1 - n2, operation: '−' };
        } else if (operation === 'fraction') {
            const subOp = week.subOperation || 'concept';
            if (subOp === 'concept') {
                // Понятие дроби: показываем дробь, нужно ввести числитель или знаменатель
                const denom = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
                const num = Math.floor(Math.random() * (denom - 1)) + 1;
                // Спрашиваем либо числитель, либо знаменатель
                const askFor = Math.random() > 0.5 ? 'numerator' : 'denominator';
                if (askFor === 'numerator') {
                    // Показываем знаменатель и часть, спрашиваем числитель
                    question = { num, denom, showPart: num, ans: num, operation: 'fraction-concept-num' };
                } else {
                    // Показываем числитель и часть, спрашиваем знаменатель
                    question = { num, denom, showPart: num, ans: denom, operation: 'fraction-concept-denom' };
                }
            } else if (subOp === 'compare') {
                // Сравнение дробей: какая больше?
                const denom = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
                const num1 = Math.floor(Math.random() * (denom - 1)) + 1;
                let num2 = Math.floor(Math.random() * (denom - 1)) + 1;
                while (num2 === num1) num2 = Math.floor(Math.random() * (denom - 1)) + 1;
                const val1 = num1 / denom;
                const val2 = num2 / denom;
                question = {
                    n1: num1, n2: num2, denom,
                    ans: val1 > val2 ? 1 : 2,
                    operation: 'compare',
                    subOperation: 'fraction'
                };
            } else if (subOp === 'add') {
                // Сложение дробей с одинаковым знаменателем
                const denom = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
                const maxNum = Math.floor(denom / 2);
                const num1 = Math.floor(Math.random() * maxNum) + 1;
                const num2 = Math.floor(Math.random() * (maxNum - num1)) + 1;
                question = { n1: num1, n2: num2, denom, ans: num1 + num2, operation: 'fraction-add' };
            } else if (subOp === 'subtract') {
                // Вычитание дробей с одинаковым знаменателем
                const denom = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
                const num1 = Math.floor(Math.random() * (denom - 1)) + 2;
                const num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
                question = { n1: num1, n2: num2, denom, ans: num1 - num2, operation: 'fraction-sub' };
            } else if (subOp === 'equivalent') {
                // Равные дроби: 1/2 = ?/4 — найти числитель
                const bases = [{n:1,d:2},{n:1,d:3},{n:2,d:3},{n:1,d:4},{n:3,d:4},{n:1,d:5},{n:2,d:5}];
                const base = bases[Math.floor(Math.random() * bases.length)];
                const factor = Math.floor(Math.random() * 3) + 2; // 2, 3, или 4
                question = {
                    n1: base.n, n2: base.d,
                    factor, newDenom: base.d * factor,
                    ans: base.n * factor,
                    operation: 'fraction-equiv'
                };
            } else if (subOp === 'mixed') {
                // Смешанные числа: неправильная дробь → целая + остаток
                const denom = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
                const whole = Math.floor(Math.random() * 3) + 1; // 1, 2, или 3
                const remainder = Math.floor(Math.random() * (denom - 1)) + 1;
                const numerator = whole * denom + remainder;
                question = { numerator, denom, whole, remainder, ans: whole, ansRemainder: remainder, operation: 'fraction-mixed' };
            }
        } else if (operation === 'divide') {
            // Деление: гарантированно целый ответ
            const divisors = week.divisors || week.multipliers;
            const divisor = divisors[Math.floor(Math.random() * divisors.length)];
            const quotient = Math.floor(Math.random() * 9) + 2; // 2-10
            const dividend = divisor * quotient;
            question = { n1: dividend, n2: divisor, ans: quotient, operation: '÷' };
        } else if (operation === 'mix-mult-div') {
            // Микс умножения и деления
            const mult = week.multipliers[Math.floor(Math.random() * week.multipliers.length)];
            const num2 = Math.floor(Math.random() * 9) + 2;
            if (Math.random() < 0.5) {
                question = { n1: mult, n2: num2, ans: mult * num2, operation: '×' };
            } else {
                question = { n1: mult * num2, n2: mult, ans: num2, operation: '÷' };
            }
        } else if (operation === 'area') {
            // Площадь прямоугольника: S = a × b
            const a = Math.floor(Math.random() * 9) + 2;
            const b = Math.floor(Math.random() * 9) + 2;
            question = { n1: a, n2: b, ans: a * b, operation: 'area' };
        } else if (operation === 'perimeter') {
            // Периметр прямоугольника: P = (a + b) × 2
            const a = Math.floor(Math.random() * 8) + 2;
            const b = Math.floor(Math.random() * 8) + 2;
            question = { n1: a, n2: b, ans: (a + b) * 2, operation: 'perimeter' };
        } else if (operation === 'mix') {
            // Великий микс: случайная операция
            const ops = ['multiply', 'add', 'subtract', 'fraction'];
            const randomOp = ops[Math.floor(Math.random() * ops.length)];
            
            if (randomOp === 'multiply') {
                const mult = [2,3,4,5,6,7,8,9,10][Math.floor(Math.random() * 9)];
                const num2 = Math.floor(Math.random() * 9) + 1;
                question = { n1: mult, n2: num2, ans: mult * num2, operation: '×' };
            } else if (randomOp === 'add') {
                const n1 = Math.floor(Math.random() * 15) + 1;
                const n2 = Math.floor(Math.random() * 10) + 1;
                question = { n1, n2, ans: n1 + n2, operation: '+' };
            } else if (randomOp === 'subtract') {
                const n1 = Math.floor(Math.random() * 15) + 5;
                const n2 = Math.floor(Math.random() * (n1 - 1)) + 1;
                question = { n1, n2, ans: n1 - n2, operation: '−' };
            } else if (randomOp === 'fraction') {
                const denom = 4;
                const num1 = Math.floor(Math.random() * 2) + 1;
                const num2 = Math.floor(Math.random() * (3 - num1)) + 1;
                question = { n1: num1, n2: num2, denom, ans: num1 + num2, operation: 'fraction-add' };
            }
        } else {
            // Умножение (по умолчанию)
            let mult = week.multipliers[this.state.lessonIdx % week.multipliers.length];
            if (week.id === 4) mult = week.multipliers[Math.floor(Math.random() * week.multipliers.length)];
            const num2 = Math.floor(Math.random() * 9) + 1;
            question = { n1: mult, n2: num2, ans: mult * num2, operation: '×' };
        }

        this.state.currentQ = question;

        // Обновляем заголовок и отображение вопроса
        const titleMap = {
            'multiply': `Глава ${this.state.week}: Умножение`,
            'add': `Глава ${this.state.week}: Сложение`,
            'subtract': `Глава ${this.state.week}: Вычитание`,
            'fraction': `Глава ${this.state.week}: Дроби`,
            'mix': `Глава ${this.state.week}: Великий Микс`,
            'divide': `Глава ${this.state.week}: Деление`,
            'mix-mult-div': `Глава ${this.state.week}: Умножение и Деление`,
            'area': `Глава ${this.state.week}: Площадь`,
            'perimeter': `Глава ${this.state.week}: Периметр`
        };
        document.getElementById('lesson-title').innerText = titleMap[operation] || `Глава ${this.state.week}`;

        // Обновляем отображение уравнения
        const opEl = document.getElementById('q-op');
        const n1El = document.getElementById('q-n1');
        const n2El = document.getElementById('q-n2');
        const answerInput = document.getElementById('answer-input');
        const fractionChoice = document.getElementById('fraction-choice');
        const equationContainer = document.getElementById('equation-container');

        // Скрываем по умолчанию
        fractionChoice.style.display = 'none';
        answerInput.style.display = 'inline-block';
        equationContainer.style.display = 'block';

        if (question.subOperation === 'fraction' && question.operation === 'compare') {
            // Сравнение дробей: показываем кнопки 1 или 2
            equationContainer.style.display = 'none';
            fractionChoice.style.display = 'flex';
            // Сбрасываем выбор
            this.selectFractionChoice(0);
        } else if (question.operation === 'fraction-concept-num' || question.operation === 'fraction-concept-denom') {
            // Понятие дроби: показываем уравнение с вопросом
            equationContainer.style.display = 'block';
            fractionChoice.style.display = 'none';
            n1El.textContent = question.num || question.showPart;
            opEl.textContent = '/';
            n2El.textContent = question.denom;
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'fraction-add') {
            // Сложение дробей: ответ - числитель
            n1El.textContent = question.n1;
            n2El.textContent = question.n2;
            opEl.textContent = '+';
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'fraction-sub') {
            // Вычитание дробей: ответ - числитель
            n1El.textContent = question.n1;
            n2El.textContent = question.n2;
            opEl.textContent = '−';
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'fraction-equiv') {
            // Равные дроби: найти числитель
            n1El.textContent = question.n1;
            n2El.textContent = question.n2;
            opEl.textContent = '=';
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'fraction-mixed') {
            // Смешанные числа: найти целую часть (потом остаток проверяем тоже)
            n1El.textContent = question.numerator;
            n2El.textContent = question.denom;
            opEl.textContent = '/';
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'area' || question.operation === 'perimeter') {
            n1El.textContent = question.n1;
            n2El.textContent = question.n2;
            opEl.textContent = question.operation === 'area' ? '×' : '+';
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else {
            // Обычные операции: сложение, вычитание, умножение, деление
            n1El.textContent = question.n1;
            n2El.textContent = question.n2;
            opEl.textContent = question.operation || '×';
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        }

        // Очищаем подсказки
        document.getElementById('feedback').innerText = '';
        document.getElementById('feedback').className = 'feedback';
        document.getElementById('hint-display').style.display = 'none';

        const lessonData = this.getLessonData(week, question);
        document.getElementById('strategy-text').innerText = lessonData.strategy;
        this.updateVisualDesc(question);
        this.setVisual(this.state.currentVisual, question);
        this.updateProgress();
        
        // Фокус на поле ввода (если не дроби-сравнение)
        if (question.operation !== 'compare' || !question.subOperation) {
            document.getElementById('answer-input').focus();
        }
    },

    getLessonData(week, question) {
        const operation = week.operation || 'multiply';
        
        if (operation === 'multiply') {
            const mult = question.n1;
            if (week.id === 4 && CURRICULUM.strategyByMult[mult]) {
                const s = CURRICULUM.strategyByMult[mult];
                const n = question.n2;
                return {
                    strategy: `Приём «${s.name}»: ${s.formula(n)}`,
                    hint: `Стратегия для умножения на ${mult}: ${s.name}`,
                    fingerTip: ''
                };
            }
            return week.lessons.find(l => l.mult === mult) || week.lessons[0];
        } else if (operation === 'add') {
            const s = CURRICULUM.strategyForOperation.add;
            return {
                strategy: `${s.name}: ${s.formula(question.n1, question.n2)}`,
                hint: `Сложение: ${question.n1} + ${question.n2}`,
                fingerTip: week.lessons[0].fingerTip
            };
        } else if (operation === 'subtract') {
            const s = CURRICULUM.strategyForOperation.subtract;
            return {
                strategy: `${s.name}: ${s.formula(question.n1, question.n2)}`,
                hint: `Вычитание: ${question.n1} − ${question.n2}`,
                fingerTip: week.lessons[0].fingerTip
            };
        } else if (operation === 'fraction') {
            return week.lessons[0];
        } else if (operation === 'mix') {
            return week.lessons[0];
        } else if (operation === 'divide') {
            const divisorLesson = week.lessons.find(l => l.mult === question.n2);
            if (divisorLesson) return divisorLesson;
            const s = CURRICULUM.strategyForOperation.divide;
            return {
                strategy: `${s.name}: ${s.formula(question.n1, question.n2)}`,
                hint: `Деление: ${question.n1} ÷ ${question.n2}`,
                fingerTip: `${question.n2} × ? = ${question.n1} → ? = ${question.ans}`
            };
        } else if (operation === 'mix-mult-div') {
            return week.lessons[0];
        } else if (operation === 'area') {
            const s = CURRICULUM.strategyForOperation.area;
            return {
                strategy: `${s.name}: ${s.formula(question.n1, question.n2)}`,
                hint: week.lessons[0].hint,
                fingerTip: week.lessons[0].fingerTip
            };
        } else if (operation === 'perimeter') {
            const s = CURRICULUM.strategyForOperation.perimeter;
            return {
                strategy: `${s.name}: ${s.formula(question.n1, question.n2)}`,
                hint: week.lessons[0].hint,
                fingerTip: week.lessons[0].fingerTip
            };
        }
        return week.lessons[0];
    },

    updateVisualDesc(q) {
        const desc = document.getElementById('visual-desc');
        const operation = q.operation || '×';

        if (operation === 'fraction-concept-num') {
            desc.innerHTML = `Дробь: <span class="frac"><span class="frac-n">?</span><span class="frac-d">${q.denom}</span></span>. Сколько частей взяли? (числитель)`;
        } else if (operation === 'fraction-concept-denom') {
            desc.innerHTML = `Дробь: <span class="frac"><span class="frac-n">${q.num}</span><span class="frac-d">?</span></span>. На сколько частей разделили? (знаменатель)`;
        } else if (q.subOperation === 'fraction' && operation === 'compare') {
            desc.innerHTML = `Какая дробь больше: <span class="frac"><span class="frac-n">${q.n1}</span><span class="frac-d">${q.denom}</span></span> или <span class="frac"><span class="frac-n">${q.n2}</span><span class="frac-d">${q.denom}</span></span>?`;
        } else if (q.operation === 'fraction-add') {
            desc.innerHTML = `<span class="frac"><span class="frac-n">${q.n1}</span><span class="frac-d">${q.denom}</span></span> + <span class="frac"><span class="frac-n">${q.n2}</span><span class="frac-d">${q.denom}</span></span> = <span class="frac"><span class="frac-n">?</span><span class="frac-d">${q.denom}</span></span>`;
        } else if (q.operation === 'fraction-sub') {
            desc.innerHTML = `<span class="frac"><span class="frac-n">${q.n1}</span><span class="frac-d">${q.denom}</span></span> − <span class="frac"><span class="frac-n">${q.n2}</span><span class="frac-d">${q.denom}</span></span> = <span class="frac"><span class="frac-n">?</span><span class="frac-d">${q.denom}</span></span>`;
        } else if (q.operation === 'fraction-equiv') {
            desc.innerHTML = `<span class="frac"><span class="frac-n">${q.n1}</span><span class="frac-d">${q.n2}</span></span> = <span class="frac"><span class="frac-n">?</span><span class="frac-d">${q.newDenom}</span></span>`;
        } else if (q.operation === 'fraction-mixed') {
            desc.innerHTML = `Неправильная дробь <span class="frac"><span class="frac-n">${q.numerator}</span><span class="frac-d">${q.denom}</span></span> = ? целых и <span class="frac"><span class="frac-n">?</span><span class="frac-d">${q.denom}</span></span> — введи целую часть`;
        } else if (q.operation === '÷') {
            desc.innerText = `${q.n1} ÷ ${q.n2} = ? (${q.n2} × ? = ${q.n1})`;
        } else if (q.operation === 'area') {
            desc.innerText = `Прямоугольник ${q.n1} × ${q.n2}. Чему равна площадь S = ${q.n1} × ${q.n2} = ?`;
        } else if (q.operation === 'perimeter') {
            desc.innerText = `Прямоугольник ${q.n1} × ${q.n2}. Чему равен периметр P = (${q.n1} + ${q.n2}) × 2 = ?`;
        } else {
            desc.innerText = `${q.n1} ${operation} ${q.n2} = ?`;
        }
    },

    // ─── VISUALS ───
    setVisual(type, question) {
        this.state.currentVisual = type;
        const container = document.getElementById('visual-container');
        container.innerHTML = '';
        container.removeAttribute('style');

        document.querySelectorAll('.visual-controls button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        const q = question || this.state.currentQ;
        const operation = q.operation || '×';

        // Для дробей и новых операций используем специальные рендеры
        if (operation.startsWith('fraction') || q.subOperation === 'fraction') {
            if (type === 'array') this.renderFractionVisual(container, q);
            else if (type === 'line') this.renderFractionLine(container, q);
            else this.renderFractionPie(container, q);
        } else if (operation === '÷') {
            if (type === 'array') this.renderDivideArray(container, q.n1, q.n2);
            else if (type === 'line') this.renderDivideNumberLine(container, q.n1, q.n2);
            else this.renderFactFamily(container, q.n1, q.n2, q.ans);
        } else if (operation === 'area') {
            // Площадь = тот же массив точек, только подпись другая
            if (type === 'array') this.renderAreaArray(container, q.n1, q.n2);
            else if (type === 'line') this.renderNumberLine(container, q.n1, q.n2);
            else this.renderAreaFormula(container, q.n1, q.n2);
        } else if (operation === 'perimeter') {
            if (type === 'array') this.renderPerimeterRect(container, q.n1, q.n2);
            else if (type === 'line') this.renderAddNumberLine(container, q.n1, q.n2);
            else this.renderPerimeterFormula(container, q.n1, q.n2);
        } else if (operation === '+') {
            if (type === 'array') this.renderAddArray(container, q.n1, q.n2);
            else if (type === 'line') this.renderAddNumberLine(container, q.n1, q.n2);
            else this.renderFingersAdd(container, q.n1, q.n2);
        } else if (operation === '−') {
            if (type === 'array') this.renderSubArray(container, q.n1, q.n2);
            else if (type === 'line') this.renderSubNumberLine(container, q.n1, q.n2);
            else this.renderFingersSub(container, q.n1, q.n2);
        } else {
            // Умножение (по умолчанию)
            const { n1, n2 } = q;
            if (type === 'array') this.renderArray(container, n1, n2);
            else if (type === 'line') this.renderNumberLine(container, n1, n2);
            else if (type === 'fingers') this.renderFingers(container, n1, n2);
        }
    },

    // ─── ДРОБИ: Визуализация ───
    renderFractionVisual(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.gap = '20px';
        container.style.padding = '10px';

        // Для concept дробей показываем одну дробь
        if (q.operation === 'fraction-concept-num' || q.operation === 'fraction-concept-denom') {
            const wrap = this.createFractionPie(q.num || q.showPart, q.denom, 'primary');
            container.appendChild(wrap);

            const label = document.createElement('div');
            label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:12px;';
            if (q.operation === 'fraction-concept-num') {
                label.innerHTML = `Знаменатель: <strong>${q.denom}</strong>. Сколько частей закрашено?`;
            } else {
                label.innerHTML = `Закрашено: <strong>${q.num || q.showPart}</strong> частей. На сколько всего разделили?`;
            }
            container.appendChild(label);
        } else if (q.operation === 'fraction-add' || q.operation === 'fraction-sub') {
            // Показываем две дроби
            const wrap1 = this.createFractionPie(q.n1, q.denom, 'primary');
            const wrap2 = this.createFractionPie(q.n2, q.denom, 'secondary');
            container.appendChild(wrap1);
            container.appendChild(wrap2);

            const label = document.createElement('div');
            label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:12px;';
            label.innerHTML = `Знаменатель: <strong>${q.denom}</strong>`;
            container.appendChild(label);
        } else if (q.operation === 'fraction-equiv') {
            // Равные дроби: два пирога с одинаковой закрашенной долей
            const wrap1 = this.createFractionPie(q.n1, q.n2, 'primary');
            const wrap2 = this.createFractionPie(q.ans, q.newDenom, 'secondary');
            container.appendChild(wrap1);
            container.appendChild(wrap2);

            const label = document.createElement('div');
            label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:12px;';
            label.innerHTML = `Одинаковая доля — разные записи! Знаменатель ×${q.factor}`;
            container.appendChild(label);
        } else if (q.operation === 'fraction-mixed') {
            // Смешанные числа: несколько целых пицц
            for (let i = 0; i < q.whole; i++) {
                const wrap = this.createFractionPie(q.denom, q.denom, 'primary');
                container.appendChild(wrap);
            }
            if (q.remainder > 0) {
                const wrap = this.createFractionPie(q.remainder, q.denom, 'secondary');
                container.appendChild(wrap);
            }

            const label = document.createElement('div');
            label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:12px;';
            label.innerHTML = `<strong>${q.whole}</strong> целых пицц + <strong>${q.remainder}/${q.denom}</strong> от пиццы`;
            container.appendChild(label);
        } else {
            // Сравнение дробей
            const wrap1 = this.createFractionPie(q.n1, q.denom, q.n1 >= q.n2 ? 'primary' : 'secondary');
            const wrap2 = this.createFractionPie(q.n2, q.denom, q.n1 >= q.n2 ? 'secondary' : 'primary');
            
            container.appendChild(wrap1);
            container.appendChild(wrap2);

            const label = document.createElement('div');
            label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:12px;';
            label.innerHTML = q.operation === 'compare'
                ? 'Нажми 1 или 2 для ответа'
                : `Знаменатель: <strong>${q.denom}</strong>`;
            container.appendChild(label);
        }
    },

    createFractionPie(numerator, denominator, colorVar) {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '5px';

        const svgSize = 80;
        const radius = 35;
        const center = svgSize / 2;
        const percentage = numerator / denominator;
        const dashArray = 2 * Math.PI * radius;
        const dashOffset = dashArray * (1 - percentage);

        // Яркие контрастные цвета для дробей
        const colors = {
            'primary': '#00d4ff',      // Яркий циан
            'secondary': '#ff6b6b',    // Яркий коралловый
            'accent': '#ffd93d'        // Яркий жёлтый
        };
        const strokeColor = colors[colorVar] || colors.primary;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgSize);
        svg.setAttribute('height', svgSize);
        svg.style.overflow = 'visible';

        // Фон (серый круг)
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', center);
        bgCircle.setAttribute('cy', center);
        bgCircle.setAttribute('r', radius);
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', '#e2e8f0');
        bgCircle.setAttribute('stroke-width', '4');
        svg.appendChild(bgCircle);

        // Сегмент (цветной)
        const fgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        fgCircle.setAttribute('cx', center);
        fgCircle.setAttribute('cy', center);
        fgCircle.setAttribute('r', radius);
        fgCircle.setAttribute('fill', 'none');
        fgCircle.setAttribute('stroke', strokeColor);
        fgCircle.setAttribute('stroke-width', '4');
        fgCircle.setAttribute('stroke-dasharray', dashArray);
        fgCircle.setAttribute('stroke-dashoffset', dashOffset);
        fgCircle.setAttribute('transform', `rotate(-90 ${center} ${center})`);
        fgCircle.style.transition = 'stroke-dashoffset 0.5s ease';
        fgCircle.style.filter = 'drop-shadow(0 0 6px ' + strokeColor + ')';
        svg.appendChild(fgCircle);

        // Линии разделения
        for (let i = 0; i < denominator; i++) {
            const angle = (i / denominator) * 2 * Math.PI - Math.PI / 2;
            const x2 = center + radius * Math.cos(angle);
            const y2 = center + radius * Math.sin(angle);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', center);
            line.setAttribute('y1', center);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#64748b');
            line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
        }

        wrap.appendChild(svg);

        const frac = document.createElement('div');
        frac.className = 'frac';
        frac.innerHTML = `<span class="frac-n">${numerator}</span><span class="frac-d">${denominator}</span>`;
        wrap.appendChild(frac);

        return wrap;
    },

    renderFractionPie(container, q) {
        this.renderFractionVisual(container, q);
    },

    renderFractionLine(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const info = document.createElement('div');
        info.style.cssText = 'text-align:center; margin-bottom:10px;';

        if (q.operation === 'compare') {
            info.innerHTML = `Сравни дроби с одинаковым знаменателем <strong>${q.denom}</strong>`;
        } else if (q.operation === 'fraction-add') {
            info.innerHTML = `Сложи числители: <strong>${q.n1} + ${q.n2} = ?</strong>`;
        } else if (q.operation === 'fraction-sub') {
            info.innerHTML = `Вычти числители: <strong>${q.n1} − ${q.n2} = ?</strong>`;
        } else if (q.operation === 'fraction-equiv') {
            info.innerHTML = `Одинаковая доля — разные знаменатели: <strong>${q.n2}</strong> и <strong>${q.newDenom}</strong>`;
        } else if (q.operation === 'fraction-mixed') {
            info.innerHTML = `Неправильная дробь: числитель больше знаменателя!`;
        }
        container.appendChild(info);

        this.renderFractionVisual(container, q);
    },

    // ─── СЛОЖЕНИЕ: Визуализация ───
    renderAddArray(container, n1, n2) {
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.justifyContent = 'center';
        container.style.gap = '10px';
        container.style.padding = '10px';

        // Первая группа точек
        const group1 = document.createElement('div');
        group1.style.display = 'flex';
        group1.style.flexWrap = 'wrap';
        group1.style.gap = '4px';
        group1.style.padding = '8px';
        group1.style.border = '2px solid var(--primary)';
        group1.style.borderRadius = '8px';
        for (let i = 0; i < n1; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot row-even';
            dot.style.width = '14px';
            dot.style.height = '14px';
            group1.appendChild(dot);
        }
        container.appendChild(group1);

        const plus = document.createElement('span');
        plus.style.cssText = 'font-size:1.5rem; color:var(--primary); align-self:center;';
        plus.textContent = '+';
        container.appendChild(plus);

        // Вторая группа точек
        const group2 = document.createElement('div');
        group2.style.display = 'flex';
        group2.style.flexWrap = 'wrap';
        group2.style.gap = '4px';
        group2.style.padding = '8px';
        group2.style.border = '2px solid var(--secondary)';
        group2.style.borderRadius = '8px';
        for (let i = 0; i < n2; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot row-odd';
            dot.style.width = '14px';
            dot.style.height = '14px';
            group2.appendChild(dot);
        }
        container.appendChild(group2);

        const label = document.createElement('div');
        label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:8px;';
        label.innerHTML = `<span style="color:var(--primary)">${n1}</span> + <span style="color:var(--secondary)">${n2}</span> = <strong style="color:var(--text)">?</strong>`;
        container.appendChild(label);
    },

    renderAddNumberLine(container, n1, n2) {
        container.style.display = 'block';
        container.style.padding = '10px 0';

        const line = document.createElement('div');
        line.className = 'number-line';

        const total = n1 + n2;
        for (let i = 0; i <= total; i++) {
            const step = document.createElement('div');
            step.className = 'nl-step';
            step.style.animationDelay = `${i * 100}ms`;

            const num = document.createElement('div');
            num.className = `nl-num ${i === total ? 'final' : ''}`;
            num.textContent = i === total ? '?' : i;
            step.appendChild(num);

            if (i < total) {
                const arrow = document.createElement('span');
                arrow.className = 'nl-arrow';
                arrow.textContent = ' +1 →';
                step.appendChild(arrow);
            }

            line.appendChild(step);
        }
        container.appendChild(line);

        const label = document.createElement('div');
        label.className = 'nl-label';
        label.innerHTML = `Начни с <strong>${n1}</strong>, сделай <strong>${n2}</strong> шага вперёд = <strong style="color:var(--primary)">?</strong>`;
        container.appendChild(label);
    },

    renderFingersAdd(container, n1, n2) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Сложение на пальцах:</strong><br>
1. Покажи первое число <strong>${n1}</strong> на пальцах<br>
2. Загни ещё <strong>${n2}</strong> пальца<br>
3. Посчитай все вытянутые пальцы`;
        container.appendChild(info);

        const row = document.createElement('div');
        row.className = 'fingers-row';
        row.style.justifyContent = 'center';

        const total = n1 + n2;
        for (let i = 1; i <= 10; i++) {
            const finger = document.createElement('div');
            finger.className = 'finger';

            const stick = document.createElement('div');
            stick.className = `finger-stick ${i <= total ? 'up' : 'bent'}`;
            finger.appendChild(stick);

            const num = document.createElement('div');
            num.className = 'finger-num';
            num.textContent = i;
            finger.appendChild(num);

            row.appendChild(finger);
        }
        container.appendChild(row);

        const groups = document.createElement('div');
        groups.style.cssText = 'display:flex; justify-content:center; gap:20px; margin-top:8px;';
        groups.innerHTML = `
            <span class="finger-group-label finger-group-tens">${n1} + ${n2}</span>
            <span class="finger-group-label finger-group-ones">= ${total}</span>
        `;
        container.appendChild(groups);
    },

    // ─── ВЫЧИТАНИЕ: Визуализация ───
    renderSubArray(container, n1, n2) {
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.justifyContent = 'center';
        container.style.gap = '10px';
        container.style.padding = '10px';

        // Все точки
        const all = document.createElement('div');
        all.style.display = 'flex';
        all.style.flexWrap = 'wrap';
        all.style.gap = '4px';
        all.style.padding = '8px';
        all.style.border = '2px solid var(--primary)';
        all.style.borderRadius = '8px';
        for (let i = 0; i < n1; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot row-even';
            dot.style.width = '14px';
            dot.style.height = '14px';
            all.appendChild(dot);
        }
        container.appendChild(all);

        const minus = document.createElement('span');
        minus.style.cssText = 'font-size:1.5rem; color:var(--error); align-self:center;';
        minus.textContent = '−';
        container.appendChild(minus);

        // Вычитаемые точки (зачёркнутые)
        const removed = document.createElement('div');
        removed.style.display = 'flex';
        removed.style.flexWrap = 'wrap';
        removed.style.gap = '4px';
        removed.style.padding = '8px';
        removed.style.border = '2px solid var(--error)';
        removed.style.borderRadius = '8px';
        removed.style.opacity = '0.6';
        for (let i = 0; i < n2; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot row-odd';
            dot.style.width = '14px';
            dot.style.height = '14px';
            dot.style.position = 'relative';
            const cross = document.createElement('div');
            cross.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--error); font-weight:bold; font-size:12px;';
            cross.textContent = '×';
            dot.appendChild(cross);
            removed.appendChild(dot);
        }
        container.appendChild(removed);

        const label = document.createElement('div');
        label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:8px;';
        label.innerHTML = `<span style="color:var(--primary)">${n1}</span> − <span style="color:var(--error)">${n2}</span> = <strong style="color:var(--text)">?</strong>`;
        container.appendChild(label);
    },

    renderSubNumberLine(container, n1, n2) {
        container.style.display = 'block';
        container.style.padding = '10px 0';

        const line = document.createElement('div');
        line.className = 'number-line';

        for (let i = 0; i <= n1; i++) {
            const step = document.createElement('div');
            step.className = 'nl-step';
            step.style.animationDelay = `${i * 100}ms`;

            const num = document.createElement('div');
            num.className = `nl-num ${i === n1 - n2 ? 'final' : ''}`;
            num.textContent = i;
            step.appendChild(num);

            if (i < n1) {
                const arrow = document.createElement('span');
                arrow.className = 'nl-arrow';
                arrow.textContent = ' +1 →';
                step.appendChild(arrow);
            }

            line.appendChild(step);
        }
        container.appendChild(line);

        const label = document.createElement('div');
        label.className = 'nl-label';
        label.innerHTML = `Начни с <strong>${n1}</strong>, отсчитай <strong>${n2}</strong> шага назад = <strong style="color:var(--primary)">?</strong>`;
        container.appendChild(label);
    },

    renderFingersSub(container, n1, n2) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Вычитание на пальцах:</strong><br>
1. Покажи первое число <strong>${n1}</strong> на пальцах<br>
2. Загни <strong>${n2}</strong> пальца (убери их)<br>
3. Посчитай оставшиеся вытянутые пальцы`;
        container.appendChild(info);

        const row = document.createElement('div');
        row.className = 'fingers-row';
        row.style.justifyContent = 'center';

        const result = n1 - n2;
        for (let i = 1; i <= 10; i++) {
            const finger = document.createElement('div');
            finger.className = 'finger';

            const stick = document.createElement('div');
            stick.className = `finger-stick ${i <= result ? 'up' : 'bent'}`;
            finger.appendChild(stick);

            const num = document.createElement('div');
            num.className = 'finger-num';
            num.textContent = i;
            finger.appendChild(num);

            row.appendChild(finger);
        }
        container.appendChild(row);

        const groups = document.createElement('div');
        groups.style.cssText = 'display:flex; justify-content:center; gap:20px; margin-top:8px;';
        groups.innerHTML = `
            <span class="finger-group-label finger-group-tens">${n1} − ${n2}</span>
            <span class="finger-group-label finger-group-ones">= ${result}</span>
        `;
        container.appendChild(groups);
    },

    renderArray(container, rows, cols) {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = `repeat(${cols}, 18px)`;
        container.style.gap = '6px';
        container.style.justifyContent = 'center';
        container.style.padding = '10px';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const dot = document.createElement('div');
                dot.className = `dot ${r % 2 === 0 ? 'row-even' : 'row-odd'}`;
                dot.style.animationDelay = `${(r * cols + c) * 30}ms`;
                container.appendChild(dot);
            }
        }

        const label = document.createElement('div');
        label.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--text-dim); font-size: 0.85rem; margin-top: 8px;';
        label.innerHTML = `<span style="color:var(--primary)">${rows} строк</span> × <span style="color:var(--secondary)">${cols} столбцов</span> = <strong style="color:var(--text)">?</strong>`;
        container.appendChild(label);
    },

    renderNumberLine(container, n1, n2) {
        container.style.display = 'block';
        container.style.padding = '10px 0';

        const line = document.createElement('div');
        line.className = 'number-line';

        const steps = Math.min(n1, 10);
        for (let i = 0; i <= steps; i++) {
            const step = document.createElement('div');
            step.className = 'nl-step';
            step.style.animationDelay = `${i * 100}ms`;

            const num = document.createElement('div');
            num.className = `nl-num ${i === steps ? 'final' : ''}`;
            // Последний шаг — скрываем ответ
            num.textContent = i === steps ? '?' : n2 * i;
            step.appendChild(num);

            if (i < steps) {
                const arrow = document.createElement('span');
                arrow.className = 'nl-arrow';
                arrow.textContent = ` +${n2} →`;
                step.appendChild(arrow);
            }

            line.appendChild(step);
        }
        container.appendChild(line);

        const label = document.createElement('div');
        label.className = 'nl-label';
        label.innerHTML = `${n1} скачков по <strong>${n2}</strong> = <strong style="color:var(--primary)">?</strong>`;
        container.appendChild(label);
    },

    renderFingers(container, n1, n2) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const isNine = (n1 === 9 || n2 === 9);

        if (isNine) {
            const other = n1 === 9 ? n2 : n1;
            const tens = other - 1;
            const ones = 10 - other;

            const title = document.createElement('div');
            title.style.cssText = 'font-weight:800; font-size:1rem; margin-bottom:12px; color:var(--accent);';
            title.textContent = `Метод пальцев: ${n1} × ${n2}`;
            container.appendChild(title);

            const instr = document.createElement('div');
            instr.className = 'fingers-explanation';
            instr.innerHTML = `<strong>Как это работает:</strong><br>
1. Вытяни все 10 пальцев перед собой<br>
2. Пронумеруй их слева направо: 1, 2, 3... 10<br>
3. <strong style="color:var(--primary)">Загни палец №${other}</strong><br>
4. Пальцы слева от загнутого = <strong style="color:var(--primary)">десятки</strong><br>
5. Пальцы справа от загнутого = <strong style="color:var(--secondary)">единицы</strong>`;
            container.appendChild(instr);

            const row = document.createElement('div');
            row.className = 'fingers-row';

            for (let i = 1; i <= 10; i++) {
                const finger = document.createElement('div');
                finger.className = 'finger';

                const stick = document.createElement('div');
                stick.className = `finger-stick ${i === other ? 'bent' : 'up'}`;
                finger.appendChild(stick);

                const num = document.createElement('div');
                num.className = 'finger-num';
                num.textContent = i;
                finger.appendChild(num);

                row.appendChild(finger);
            }
            container.appendChild(row);

            const groups = document.createElement('div');
            groups.style.cssText = 'display:flex; justify-content:center; gap:20px; margin-top:8px;';
            groups.innerHTML = `
                <span class="finger-group-label finger-group-tens">← ${tens} палец${tens === 1 ? '' : tens < 5 ? 'а' : 'ев'} = ${tens}0</span>
                <span class="finger-group-label finger-group-ones">${ones} палец${ones === 1 ? '' : ones < 5 ? 'а' : 'ев'} → = ${ones}</span>
            `;
            container.appendChild(groups);

            const formula = document.createElement('div');
            formula.className = 'fingers-formula';
            formula.innerHTML = `<span class="tens">${tens}0</span> + <span class="ones">${ones}</span> = <strong>?</strong>`;
            container.appendChild(formula);

        } else {
            const info = document.createElement('div');
            info.className = 'fingers-explanation';
            info.innerHTML = `<strong>Метод пальцев</strong> — это специальный трюк для <strong style="color:var(--primary)">умножения на 9</strong>.<br><br>
<strong>Почему именно 9?</strong><br>
Потому что 9 = 10 − 1, и наши 10 пальцев идеально подходят для этого!<br><br>
<strong>Как работает:</strong><br>
Допустим, тебе нужно решить <strong>9 × 4</strong>:<br>
1. Вытяни все 10 пальцев<br>
2. Загни 4-й палец (считая слева)<br>
3. Слева осталось <strong style="color:var(--primary)">3</strong> пальца — это десятки<br>
4. Справа осталось <strong style="color:var(--secondary)">6</strong> пальцев — это единицы<br>
5. Ответ: <strong>36</strong>!<br><br>
Для текущего примера <strong>${n1} × ${n2}</strong> лучше использовать другой приём — переключись на «Массив» или «Числовую прямую».`;
            container.appendChild(info);
        }
    },

    // ─── ДЕЛЕНИЕ: Визуализация ───
    renderDivideArray(container, dividend, divisor) {
        const quotient = dividend / divisor;
        container.style.display = 'grid';
        container.style.gridTemplateColumns = `repeat(${quotient}, 18px)`;
        container.style.gap = '6px';
        container.style.justifyContent = 'center';
        container.style.padding = '10px';

        for (let r = 0; r < divisor; r++) {
            for (let c = 0; c < quotient; c++) {
                const dot = document.createElement('div');
                dot.className = `dot ${r % 2 === 0 ? 'row-even' : 'row-odd'}`;
                dot.style.animationDelay = `${(r * quotient + c) * 30}ms`;
                container.appendChild(dot);
            }
        }

        const label = document.createElement('div');
        label.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--text-dim); font-size: 0.85rem; margin-top: 8px;';
        label.innerHTML = `<span style="color:var(--primary)">${dividend}</span> точек, <span style="color:var(--secondary)">${divisor}</span> строк → сколько столбцов?`;
        container.appendChild(label);
    },

    renderDivideNumberLine(container, dividend, divisor) {
        container.style.display = 'block';
        container.style.padding = '10px 0';

        const line = document.createElement('div');
        line.className = 'number-line';
        const steps = dividend / divisor;

        for (let i = 0; i <= steps; i++) {
            const step = document.createElement('div');
            step.className = 'nl-step';
            step.style.animationDelay = `${i * 100}ms`;

            const num = document.createElement('div');
            num.className = `nl-num ${i === steps ? 'final' : ''}`;
            num.textContent = i === steps ? '?' : dividend - i * divisor;
            step.appendChild(num);

            if (i < steps) {
                const arrow = document.createElement('span');
                arrow.className = 'nl-arrow';
                arrow.textContent = ` −${divisor} →`;
                step.appendChild(arrow);
            }
            line.appendChild(step);
        }
        container.appendChild(line);

        const label = document.createElement('div');
        label.className = 'nl-label';
        label.innerHTML = `Сколько раз вычтем <strong>${divisor}</strong> из <strong>${dividend}</strong>, чтобы дойти до 0?`;
        container.appendChild(label);
    },

    renderFactFamily(container, dividend, divisor, quotient) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const title = document.createElement('div');
        title.style.cssText = 'text-align:center; font-weight:800; font-size:0.95rem; color:var(--accent); margin-bottom:14px;';
        title.textContent = 'Семья фактов';
        container.appendChild(title);

        const triangle = document.createElement('div');
        triangle.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:8px;';

        const top = document.createElement('div');
        top.style.cssText = 'font-size:1.6rem; font-weight:900; color:var(--primary); text-shadow:0 0 10px var(--primary);';
        top.textContent = dividend;
        triangle.appendChild(top);

        const lines = document.createElement('div');
        lines.style.cssText = 'color:var(--text-dim); font-size:0.8rem;';
        lines.textContent = '╱ ╲';
        triangle.appendChild(lines);

        const bottom = document.createElement('div');
        bottom.style.cssText = 'display:flex; gap:24px; font-size:1.3rem; font-weight:700;';
        bottom.innerHTML = `<span style="color:var(--secondary)">${divisor}</span><span style="color:var(--accent)">?</span>`;
        triangle.appendChild(bottom);

        container.appendChild(triangle);

        const facts = document.createElement('div');
        facts.style.cssText = 'margin-top:14px; display:flex; flex-direction:column; gap:4px; font-size:0.9rem; color:var(--text-dim);';
        facts.innerHTML = `
            <div>✖️ <strong>${divisor}</strong> × <strong style="color:var(--accent)">?</strong> = <strong style="color:var(--primary)">${dividend}</strong></div>
            <div>➗ <strong style="color:var(--primary)">${dividend}</strong> ÷ <strong>${divisor}</strong> = <strong style="color:var(--accent)">?</strong></div>
        `;
        container.appendChild(facts);
    },

    // ─── ГЕОМЕТРИЯ: Визуализация ───
    renderAreaArray(container, rows, cols) {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = `repeat(${cols}, 18px)`;
        container.style.gap = '4px';
        container.style.justifyContent = 'center';
        container.style.padding = '10px';
        container.style.border = '2px dashed var(--accent)';
        container.style.borderRadius = '8px';
        container.style.position = 'relative';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = `dot ${r % 2 === 0 ? 'row-even' : 'row-odd'}`;
                cell.style.animationDelay = `${(r * cols + c) * 25}ms`;
                container.appendChild(cell);
            }
        }

        const label = document.createElement('div');
        label.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--accent); font-size: 0.85rem; margin-top: 8px; font-weight:700;';
        label.innerHTML = `S = <span style="color:var(--primary)">${rows}</span> × <span style="color:var(--secondary)">${cols}</span> = <strong>?</strong> кв. ед.`;
        container.appendChild(label);
    },

    renderAreaFormula(container, a, b) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Площадь прямоугольника:</strong><br>
Длина: <strong style="color:var(--primary)">${a}</strong><br>
Ширина: <strong style="color:var(--secondary)">${b}</strong><br><br>
Шаг 1: S = длина × ширина<br>
Шаг 2: S = <strong>${a}</strong> × <strong>${b}</strong> = <strong style="color:var(--accent)">?</strong>`;
        container.appendChild(info);
    },

    renderPerimeterRect(container, a, b) {
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.padding = '20px';

        const scale = Math.min(120 / Math.max(a, b), 14);
        const w = b * scale;
        const h = a * scale;
        const svgW = w + 80;
        const svgH = h + 80;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgW);
        svg.setAttribute('height', svgH);
        svg.style.overflow = 'visible';

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', 40);
        rect.setAttribute('y', 40);
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', 'rgba(var(--primary-rgb,0,212,255),0.1)');
        rect.setAttribute('stroke', 'var(--primary)');
        rect.setAttribute('stroke-width', '3');
        rect.setAttribute('rx', '4');
        svg.appendChild(rect);

        // Подписи сторон
        const lblTop = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lblTop.setAttribute('x', 40 + w / 2);
        lblTop.setAttribute('y', 28);
        lblTop.setAttribute('text-anchor', 'middle');
        lblTop.setAttribute('fill', 'var(--secondary)');
        lblTop.setAttribute('font-size', '14');
        lblTop.setAttribute('font-weight', '700');
        lblTop.textContent = b;
        svg.appendChild(lblTop);

        const lblLeft = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        lblLeft.setAttribute('x', 24);
        lblLeft.setAttribute('y', 40 + h / 2);
        lblLeft.setAttribute('text-anchor', 'middle');
        lblLeft.setAttribute('fill', 'var(--primary)');
        lblLeft.setAttribute('font-size', '14');
        lblLeft.setAttribute('font-weight', '700');
        lblLeft.textContent = a;
        svg.appendChild(lblLeft);

        container.appendChild(svg);

        const label = document.createElement('div');
        label.style.cssText = 'text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:8px; width:100%;';
        label.innerHTML = `P = (<span style="color:var(--primary)">${a}</span> + <span style="color:var(--secondary)">${b}</span>) × 2 = ?`;
        container.appendChild(label);
    },

    renderPerimeterFormula(container, a, b) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Периметр прямоугольника:</strong><br>
Длина: <strong style="color:var(--primary)">${a}</strong><br>
Ширина: <strong style="color:var(--secondary)">${b}</strong><br><br>
Шаг 1: Сложи длину и ширину: ${a} + ${b} = <strong>${a+b}</strong><br>
Шаг 2: Умножь на 2: ${a+b} × 2 = <strong style="color:var(--accent)">?</strong>`;
        container.appendChild(info);
    },

    // ─── CHECK ANSWER ───
    check() {
        const q = this.state.currentQ;
        let input;
        
        // Для сравнения дробей (1 или 2)
        if (q.operation === 'compare' && q.subOperation === 'fraction') {
            // Получаем значение из кнопок
            const selectedBtn = document.querySelector('.fraction-choice-btn.selected');
            if (!selectedBtn) return;
            input = parseInt(selectedBtn.dataset.value);
        } else {
            input = parseInt(document.getElementById('answer-input').value);
            if (isNaN(input)) return;
        }

        const feedback = document.getElementById('feedback');
        this.state.total++;

        if (input === q.ans) {
            this.state.correct++;
            this.state.streak++;
            // Трекинг для специальных достижений
            if (q.operation === '÷') this.state.divideTotal = (this.state.divideTotal || 0) + 1;
            if (q.operation === 'area' || q.operation === 'perimeter') this.state.geometryTotal = (this.state.geometryTotal || 0) + 1;
            if (this.state.streak > this.state.bestStreak) {
                this.state.bestStreak = this.state.streak;
            }

            // Pick the right motivational message
            let msg;
            if (this.state.wasWrong && this.state.streak === 1) {
                msg = this.getMotivation('comebackAfterError');
            } else if (this.state.streak >= 10) {
                msg = this.getMotivation('streak10');
            } else if (this.state.streak >= 5) {
                msg = this.getMotivation('streak5');
            } else if (this.state.streak >= 3) {
                msg = this.getMotivation('streak3');
            } else {
                msg = this.getMotivation('correct');
            }

            this.state.wasWrong = false;
            feedback.innerText = `⚡ ${msg}`;
            feedback.className = "feedback ok";
            this.showEnergyBurst();
            this.triggerSpeedLines();

            // Показываем сообщение после 10 правильных в главе
            if (this.state.lessonIdx >= 9) {
                setTimeout(() => {
                    this.showModal(
                        '🎉',
                        'Глава пройдена!',
                        `${this.getMotivation('correct')}\nТы решил 10 примеров подряд!`,
                        'Супер!'
                    );
                }, 500);
            }

            setTimeout(() => {
                this.state.lessonIdx++;
                this.loadQuestion();
            }, 1200);
        } else {
            this.state.streak = 0;
            this.state.wasWrong = true;
            
            let motivation = this.getMotivation('wrong');
            let explanation = this.getExplanation(q);

            feedback.innerText = `${motivation}\n${explanation}`;
            feedback.className = "feedback err";
            setTimeout(() => this.loadQuestion(), 3500);
        }

        this.save();
        this.updateStats();
        this.checkAchievements();
    },

    getExplanation(q) {
        const operation = q.operation || '×';

        if (operation === 'fraction-concept-num') {
            return `Правильный ответ: ${q.ans} (числитель).\nЧислитель показывает, сколько частей взяли из ${q.denom}.`;
        } else if (operation === 'fraction-concept-denom') {
            return `Правильный ответ: ${q.ans} (знаменатель).\nЗнаменатель показывает, на сколько частей разделили целое.`;
        } else if (q.subOperation === 'fraction' && operation === 'compare') {
            const correctLabel = q.ans === 1 ? 'первая' : 'вторая';
            const val1 = (q.n1 / q.denom).toFixed(2);
            const val2 = (q.n2 / q.denom).toFixed(2);
            return `Правильно: ${correctLabel} дробь больше.\n${q.n1}/${q.denom} = ${val1}, ${q.n2}/${q.denom} = ${val2}`;
        } else if (operation === 'fraction-add') {
            return `Правильный ответ: ${q.ans}/${q.denom}.\nСложи числители: ${q.n1} + ${q.n2} = ${q.ans}`;
        } else if (operation === 'fraction-sub') {
            return `Правильный ответ: ${q.ans}/${q.denom}.\nВычти числители: ${q.n1} − ${q.n2} = ${q.ans}`;
        } else if (operation === 'fraction-equiv') {
            return `Правильный ответ: ${q.ans}/${q.newDenom}.\nУмножь числитель и знаменатель на ${q.factor}: ${q.n1}×${q.factor}=${q.ans}, ${q.n2}×${q.factor}=${q.newDenom}`;
        } else if (operation === 'fraction-mixed') {
            return `Правильный ответ: ${q.whole} целых и ${q.remainder}/${q.denom}.\n${q.numerator} ÷ ${q.denom} = ${q.whole} остаток ${q.remainder}`;
        } else if (operation === '÷') {
            return `Правильный ответ: ${q.ans}.\nМетод: ${q.n2} × ? = ${q.n1} → ? = ${q.ans}\nПроверка: ${q.n2} × ${q.ans} = ${q.n1} ✓`;
        } else if (operation === 'area') {
            return `Правильный ответ: ${q.ans}.\nПлощадь S = ${q.n1} × ${q.n2} = ${q.ans} кв. единиц`;
        } else if (operation === 'perimeter') {
            return `Правильный ответ: ${q.ans}.\nПериметр P = (${q.n1} + ${q.n2}) × 2 = ${q.n1+q.n2} × 2 = ${q.ans}`;
        } else if (operation === '+') {
            const s = CURRICULUM.strategyForOperation.add;
            return `Правильный ответ: ${q.ans}.\n${s.name}: ${s.formula(q.n1, q.n2)}`;
        } else if (operation === '−') {
            const s = CURRICULUM.strategyForOperation.subtract;
            return `Правильный ответ: ${q.ans}.\n${s.name}: ${s.formula(q.n1, q.n2)}`;
        } else {
            // Умножение
            const s = CURRICULUM.strategyByMult[q.n1];
            let explanation = `Правильный ответ: ${q.ans}`;
            if (s) explanation += `\n${s.name}: ${s.formula(q.n2)}`;
            return explanation;
        }
    },

    // ─── SHOW MODAL (reusable) ───
    showModal(icon, title, text, btnText, onClose) {
        document.getElementById('modal-icon').textContent = icon;
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-text').textContent = text;
        document.getElementById('modal-btn').textContent = btnText;
        document.getElementById('modal-skip').style.display = 'none';

        const overlay = document.getElementById('modal-overlay');
        overlay.classList.add('visible');

        // Override next to just close
        const origNext = this.tutorial.next.bind(this.tutorial);
        document.getElementById('modal-btn').onclick = () => {
            overlay.classList.remove('visible');
            document.getElementById('modal-btn').onclick = () => this.tutorial.next();
            if (onClose) onClose();
        };
    },

    // ─── HINT ───
    showHint() {
        const week = CURRICULUM.weeks.find(w => w.id === this.state.week);
        const q = this.state.currentQ;
        const lessonData = this.getLessonData(week, q);
        const hintBox = document.getElementById('hint-display');

        let hintText = lessonData.hint || '';
        if (this.state.currentVisual === 'fingers' && lessonData.fingerTip) {
            hintText = lessonData.fingerTip;
        }

        hintBox.innerText = hintText;
        hintBox.style.display = 'block';
    },

    // Выбор для сравнения дробей
    selectFractionChoice(value) {
        document.querySelectorAll('.fraction-choice-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
        });
    },

    // ─── PROGRESS ───
    updateProgress() {
        const pct = ((this.state.lessonIdx % 10) / 10) * 100;
        document.getElementById('lesson-bar').style.width = `${pct}%`;
        document.getElementById('lesson-progress-text').innerText = `${(this.state.lessonIdx % 10) + 1} / 10`;
        document.getElementById('streak-val').innerText = this.state.streak;
    },

    updateStats() {
        document.getElementById('stat-total').innerText = this.state.total;
        const acc = this.state.total ? Math.round((this.state.correct / this.state.total) * 100) : 0;
        document.getElementById('stat-accuracy').innerText = acc + '%';
        document.getElementById('stat-streak').innerText = this.state.bestStreak;
    },

    // ─── ACHIEVEMENTS ───
    renderAchievements() {
        const list = document.getElementById('achievements-list');
        list.innerHTML = '';
        CURRICULUM.achievements.forEach(ach => {
            const unlocked = this.state.achievements.includes(ach.id);
            const div = document.createElement('div');
            div.className = `ach-item ${unlocked ? 'unlocked' : ''}`;
            div.innerHTML = `<div class="ach-icon">${ach.icon}</div><div><strong>${ach.name}</strong><br><small>${ach.desc}</small></div>`;
            list.appendChild(div);
        });
    },

    checkAchievements() {
        const accuracy = this.state.total ? (this.state.correct / this.state.total) * 100 : 0;

        CURRICULUM.achievements.forEach(ach => {
            if (this.state.achievements.includes(ach.id)) return;
            let earned = false;
            if (ach.type === 'total' && this.state.total >= ach.req) earned = true;
            if (ach.type === 'accuracy' && accuracy >= ach.req && this.state.total >= 10) earned = true;
            if (ach.type === 'weeks' && this.state.unlockedWeeks.length >= ach.req) earned = true;
            if (ach.type === 'streak' && this.state.bestStreak >= ach.req) earned = true;
            if (ach.type === 'divide_total' && (this.state.divideTotal || 0) >= ach.req) earned = true;
            if (ach.type === 'geometry_total' && (this.state.geometryTotal || 0) >= ach.req) earned = true;

            if (earned) {
                this.state.achievements.push(ach.id);
                this.showAchievementPopup(ach);
                this.save();
            }
        });
    },

    showAchievementPopup(ach) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `<div style="font-size:2.2rem">${ach.icon}</div><strong style="color:var(--primary)">🏆 ${ach.name}!</strong><br><small style="color:var(--text-dim)">${ach.desc}</small>`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    },

    // ─── ANIME EFFECTS ───
    showEnergyBurst() {
        const burst = document.createElement('div');
        burst.className = 'energy-burst';
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 600);
    },

    triggerSpeedLines() {
        const container = document.getElementById('speed-lines');
        if (!container) return;
        container.classList.add('active');
        container.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const line = document.createElement('div');
            line.className = 'speed-line';
            line.style.top = (15 + Math.random() * 70) + '%';
            line.style.width = (60 + Math.random() * 120) + 'px';
            line.style.animationDelay = (i * 50) + 'ms';
            container.appendChild(line);
        }
        setTimeout(() => {
            container.classList.remove('active');
            container.innerHTML = '';
        }, 800);
    },

    // ─── PRACTICE SETUP ───
    practiceSetup: { mode: '', selectedMults: [] },

    getUnlockedMultipliers() {
        const mults = new Set();
        this.state.unlockedWeeks.forEach(weekId => {
            const week = CURRICULUM.weeks.find(w => w.id === weekId);
            if (week) week.multipliers.forEach(m => mults.add(m));
        });
        return [...mults].sort((a, b) => a - b);
    },

    startPractice(mode) {
        console.log('[Practice] startPractice:', mode);
        this.practiceSetup.mode = mode;
        const allMults = [2,3,4,5,6,7,8,9,10];
        this.practiceSetup.selectedMults = [...allMults];

        const titles = {
            flash: '🃏 Карточки', time: '⏱️ Марафон',
            boss: '👹 Босс', fluency: '🧠 Пойми'
        };
        const descs = {
            flash: 'Переворачивай карточки и оценивай себя: «Знаю» или «Ещё учу». Карточки, которые ты ещё учишь, появятся чаще.',
            time: 'Решай примеры в своём темпе — без ограничений. При первом появлении множителя увидишь подсказку стратегии.',
            boss: 'Победи босса! 10 правильных ответов подряд. Одна ошибка — и босс восстанавливает здоровье! Но ты увидишь разбор.',
            fluency: 'Пойми стратегию по шагам, примени её на практике. Ошибёшься — попробуешь ещё раз, пока не поймёшь.'
        };

        document.getElementById('setup-title').textContent = titles[mode] || 'Тренировка';
        document.getElementById('setup-desc').textContent = descs[mode] || '';

        const picker = document.getElementById('mult-picker');
        picker.innerHTML = '';
        allMults.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'mult-btn selected';
            btn.textContent = `×${m}`;
            btn.dataset.mult = m;
            btn.onclick = () => this.toggleMult(m, btn);
            picker.appendChild(btn);
        });

        this.nav('screen-practice-setup');
    },

    toggleMult(m, btn) {
        const idx = this.practiceSetup.selectedMults.indexOf(m);
        if (idx >= 0) {
            this.practiceSetup.selectedMults.splice(idx, 1);
            btn.classList.remove('selected');
        } else {
            this.practiceSetup.selectedMults.push(m);
            btn.classList.add('selected');
        }
    },

    startSelectedPractice() {
        const { mode, selectedMults } = this.practiceSetup;
        console.log('[Practice] startSelectedPractice:', mode, 'mults:', selectedMults);
        if (selectedMults.length === 0) {
            this.showModal('⚠️', 'Выбери множители',
                'Нужно выбрать хотя бы один множитель для тренировки!', 'Понятно!');
            return;
        }
        const mults = [...selectedMults].sort((a, b) => a - b);
        try {
            switch (mode) {
                case 'flash': this.flash.start(mults); break;
                case 'time': this.marathon.start(mults); break;
                case 'boss': this.boss.start(mults); break;
                case 'fluency': this.fluency.start(mults); break;
                default: console.error('[Practice] Unknown mode:', mode);
            }
        } catch (e) {
            console.error('[Practice] Error starting mode:', mode, e);
        }
    },

    endPractice() {
        // Итог марафона
        if (document.getElementById('screen-marathon').classList.contains('active') && this.marathon.solved > 0) {
            const acc = Math.round((this.marathon.correct / this.marathon.solved) * 100);
            this.showModal('🏁', 'Марафон завершён!',
                `Решено: ${this.marathon.solved}\nПравильных: ${this.marathon.correct}\nТочность: ${acc}%\nЛучшая серия: ${this.marathon.best}`,
                'Супер!', () => this.nav('screen-practice'));
            return;
        }
        // Итог босса (если уходит не победив)
        if (document.getElementById('screen-boss').classList.contains('active') && this.boss.totalAttempts > 0) {
            this.showModal('🏃', 'Отступление...',
                `Попыток: ${this.boss.totalAttempts}\nОшибок: ${this.boss.totalErrors}\nЛучшая серия: ${this.boss.streak}\nБосс не побеждён — попробуй ещё!`,
                'Ладно!', () => this.nav('screen-practice'));
            return;
        }
        this.nav('screen-practice');
    },

    // Общая функция: пошаговое объяснение стратегии
    getStepByStep(mult, n) {
        const ans = mult * n;
        switch (mult) {
            case 2: return `Удвоение: ${n} + ${n} = ${ans}`;
            case 3: return `Удвой + прибавь: ${n}×2 = ${n*2}, потом ${n*2} + ${n} = ${ans}`;
            case 4: return `Двойное удвоение: ${n}×2 = ${n*2}, потом ${n*2}×2 = ${ans}`;
            case 5: return `Пятёрки (часы): ${n}-я минутная отметка = ${ans}`;
            case 6: return `×5 + число: ${n}×5 = ${n*5}, потом ${n*5} + ${n} = ${ans}`;
            case 7: return `Разбей 5+2: ${n}×5 = ${n*5}, ${n}×2 = ${n*2}, сложи ${n*5}+${n*2} = ${ans}`;
            case 8: return `Тройное удвоение: ${n}→${n*2}→${n*4}→${ans}`;
            case 9: return `×10 − число: ${n}×10 = ${n*10}, потом ${n*10} − ${n} = ${ans}`;
            case 10: return `Допиши 0: ${n}0 = ${ans}`;
            default: return `${mult} × ${n} = ${ans}`;
        }
    },

    // ─── 🃏 КАРТОЧКИ (Flash Cards) ───
    // Научная основа: retrieval practice + метакогнитивный мониторинг + spaced repetition
    flash: {
        deck: [],
        currentCard: null,
        knownCount: 0,
        milestoneShown: {},

        start(mults) {
            console.log('[Flash] Starting with', mults.length, 'multipliers');
            this.deck = [];
            this.milestoneShown = {};
            mults.forEach(m => {
                for (let n = 2; n <= 9; n++) {
                    this.deck.push({ n1: m, n2: n, ans: m * n, known: false, againCount: 0 });
                }
            });
            this.knownCount = 0;
            app.nav('screen-flash');
            document.getElementById('flash-buttons').classList.remove('visible');
            this.showCard();
        },

        showCard() {
            const remaining = this.deck.filter(c => !c.known);
            if (remaining.length === 0) {
                this.victory();
                return;
            }

            // Weighted selection: карточки с «Ещё учу» появляются в 3 раза чаще
            const weighted = [];
            remaining.forEach(c => {
                const weight = c.againCount > 0 ? 3 : 1;
                for (let i = 0; i < weight; i++) weighted.push(c);
            });
            this.currentCard = weighted[Math.floor(Math.random() * weighted.length)];
            const { n1, n2, ans } = this.currentCard;

            // Лицевая сторона: пример + название стратегии
            document.getElementById('flash-problem').textContent = `${n1} × ${n2} = ?`;
            const s = CURRICULUM.strategyByMult[n1];
            const hintEl = document.getElementById('flash-hint');
            if (hintEl) {
                hintEl.textContent = s ? `Стратегия: ${s.name}` : '';
            }

            // Обратная сторона: ответ + пошаговый разбор
            document.getElementById('flash-answer').textContent = ans;
            document.getElementById('flash-strategy').textContent = app.getStepByStep(n1, n2);

            document.getElementById('flash-card').classList.remove('flipped');
            document.getElementById('flash-buttons').classList.remove('visible');

            // Прогресс
            const pct = (this.knownCount / this.deck.length) * 100;
            document.getElementById('flash-bar').style.width = pct + '%';
            document.getElementById('flash-counter').textContent = `${this.knownCount}/${this.deck.length}`;
            document.getElementById('flash-progress-text').textContent =
                `Изучено: ${this.knownCount} / ${this.deck.length}`;
        },

        flip() {
            if (document.getElementById('flash-card').classList.contains('flipped')) return;
            document.getElementById('flash-card').classList.add('flipped');
            document.getElementById('flash-buttons').classList.add('visible');
        },

        know() {
            if (!this.currentCard) return;
            this.currentCard.known = true;
            this.knownCount++;
            this.checkMilestone();
            this.showCard();
        },

        again() {
            if (this.currentCard) this.currentCard.againCount++;
            this.showCard();
        },

        checkMilestone() {
            const pct = Math.round((this.knownCount / this.deck.length) * 100);
            const milestones = [25, 50, 75];
            for (const m of milestones) {
                if (pct >= m && !this.milestoneShown[m]) {
                    this.milestoneShown[m] = true;
                    const msgs = {
                        25: `Четверть пройдена! ${this.knownCount} из ${this.deck.length} — отличный старт!`,
                        50: `Половина! ${this.knownCount} карточек изучено — ты на верном пути!`,
                        75: `Три четверти! Финиш уже близко — осталось ${this.deck.length - this.knownCount}!`
                    };
                    app.showModal('🌟', `${m}% готово!`, msgs[m], 'Продолжить!');
                    break;
                }
            }
        },

        victory() {
            const againTotal = this.deck.reduce((sum, c) => sum + c.againCount, 0);
            let msg = `${app.state.playerName}, ты разобрал все ${this.deck.length} карточек!`;
            if (againTotal === 0) msg += '\nИ ни одна не вызвала затруднений — ты мастер!';
            else msg += `\nКарточек на повтор: ${againTotal} — это нормально, повторение укрепляет память!`;
            app.showModal('🎉', 'Все карточки пройдены!', msg, 'Супер!', () => app.nav('screen-practice'));
        }
    },

    // ─── ⏱️ МАРАФОН (Marathon) ───
    // Научная основа: distributed practice + снижение тревожности без давления временем
    marathon: {
        solved: 0,
        correct: 0,
        streak: 0,
        best: 0,
        mults: [],
        currentQ: null,
        lastQ: null,
        seenMults: null,
        waiting: false,

        start(mults) {
            console.log('[Marathon] Starting with', mults.length, 'multipliers');
            this.mults = mults;
            this.solved = 0;
            this.correct = 0;
            this.streak = 0;
            this.best = 0;
            this.waiting = false;
            this.lastQ = null;
            this.seenMults = new Set();
            app.nav('screen-marathon');
            this.loadQ();
        },

        loadQ() {
            this.waiting = false;
            let m, n;
            // Избегаем повторов: не даём тот же пример дважды подряд
            do {
                m = this.mults[Math.floor(Math.random() * this.mults.length)];
                n = Math.floor(Math.random() * 8) + 2; // 2-9 (×1 слишком легко)
            } while (this.lastQ && this.lastQ.n1 === m && this.lastQ.n2 === n);

            this.currentQ = { n1: m, n2: n, ans: m * n };
            this.lastQ = this.currentQ;

            document.getElementById('marathon-n1').textContent = m;
            document.getElementById('marathon-n2').textContent = n;
            document.getElementById('marathon-input').value = '';
            document.getElementById('marathon-feedback').textContent = '';
            document.getElementById('marathon-feedback').className = 'feedback';

            // Подсказка стратегии при первом появлении множителя
            const hintEl = document.getElementById('marathon-hint');
            if (hintEl) {
                if (!this.seenMults.has(m)) {
                    this.seenMults.add(m);
                    const s = CURRICULUM.strategyByMult[m];
                    if (s) {
                        hintEl.innerHTML = `<span class="hint-emoji">💡</span> Помни: ×${m} — ${s.name}`;
                        hintEl.style.display = 'block';
                    }
                } else {
                    hintEl.style.display = 'none';
                }
            }

            document.getElementById('marathon-input').focus();
            this.updateStats();
        },

        check() {
            if (this.waiting) return;
            const val = parseInt(document.getElementById('marathon-input').value);
            if (isNaN(val)) return;

            const fb = document.getElementById('marathon-feedback');
            this.solved++;
            app.state.total++;

            // Скрываем хинт после ответа
            const hintEl = document.getElementById('marathon-hint');
            if (hintEl) hintEl.style.display = 'none';

            if (val === this.currentQ.ans) {
                this.correct++;
                this.streak++;
                app.state.correct++;
                app.state.streak = this.streak;
                if (this.streak > this.best) this.best = this.streak;
                if (this.streak > app.state.bestStreak) app.state.bestStreak = this.streak;

                let msg;
                if (app.state.wasWrong && this.streak === 1) msg = app.getMotivation('comebackAfterError');
                else if (this.streak >= 10) msg = app.getMotivation('streak10');
                else if (this.streak >= 5) msg = app.getMotivation('streak5');
                else if (this.streak >= 3) msg = app.getMotivation('streak3');
                else msg = app.getMotivation('correct');

                app.state.wasWrong = false;
                fb.textContent = `⚡ ${msg}`;
                fb.className = 'feedback ok';
                app.showEnergyBurst();

                // Веха каждые 10 примеров
                if (this.solved % 10 === 0) {
                    const acc = Math.round((this.correct / this.solved) * 100);
                    setTimeout(() => {
                        app.showModal('📊', `${this.solved} примеров!`,
                            `Решено: ${this.solved}\nТочность: ${acc}%\nЛучшая серия: ${this.best}\n\nПродолжай в том же духе!`,
                            'Дальше!');
                    }, 500);
                }

                this.waiting = true;
                setTimeout(() => this.loadQ(), 1000);
            } else {
                this.streak = 0;
                app.state.streak = 0;
                app.state.wasWrong = true;

                const { n1, n2 } = this.currentQ;
                // Пошаговое объяснение вместо просто формулы
                let txt = `${app.getMotivation('wrong')}\n${app.getStepByStep(n1, n2)}`;
                fb.textContent = txt;
                fb.className = 'feedback err';

                this.waiting = true;
                setTimeout(() => this.loadQ(), 3500);
            }
            app.save();
            app.updateStats();
            app.checkAchievements();
            this.updateStats();
        },

        updateStats() {
            document.getElementById('marathon-solved').textContent = this.solved;
            const acc = this.solved ? Math.round((this.correct / this.solved) * 100) + '%' : '0%';
            document.getElementById('marathon-accuracy').textContent = acc;
            document.getElementById('marathon-streak').textContent = this.streak;
        }
    },

    // ─── 👹 БОСС (Boss Battle) ───
    // Научная основа: desirable difficulty + gamification + narrative framing
    boss: {
        hp: 10,
        maxHp: 10,
        streak: 0,
        mults: [],
        currentQ: null,
        waiting: false,
        totalAttempts: 0,
        totalErrors: 0,

        pickTaunt(category) {
            const arr = (typeof BOSS_TAUNTS !== 'undefined') && BOSS_TAUNTS[category];
            if (!arr || arr.length === 0) return '';
            return arr[Math.floor(Math.random() * arr.length)];
        },

        start(mults) {
            console.log('[Boss] Starting with', mults.length, 'multipliers');
            this.mults = mults;
            this.hp = this.maxHp;
            this.streak = 0;
            this.waiting = false;
            this.totalAttempts = 0;
            this.totalErrors = 0;
            app.nav('screen-boss');

            document.getElementById('boss-emoji').textContent = '👹';
            document.getElementById('boss-taunt').textContent = this.pickTaunt('intro');
            this.updateHP();
            this.loadQ();
        },

        loadQ() {
            this.waiting = false;
            const m = this.mults[Math.floor(Math.random() * this.mults.length)];
            const n = Math.floor(Math.random() * 8) + 2; // 2-9
            this.currentQ = { n1: m, n2: n, ans: m * n };

            document.getElementById('boss-n1').textContent = m;
            document.getElementById('boss-n2').textContent = n;
            document.getElementById('boss-input').value = '';
            document.getElementById('boss-feedback').textContent = '';
            document.getElementById('boss-feedback').className = 'feedback';
            document.getElementById('boss-input').focus();
        },

        check() {
            if (this.waiting) return;
            const val = parseInt(document.getElementById('boss-input').value);
            if (isNaN(val)) return;

            const fb = document.getElementById('boss-feedback');
            app.state.total++;
            this.totalAttempts++;

            if (val === this.currentQ.ans) {
                app.state.correct++;
                this.streak++;
                this.hp--;
                app.state.streak = this.streak;
                if (this.streak > app.state.bestStreak) app.state.bestStreak = this.streak;

                this.updateHP();
                app.showEnergyBurst();

                // Boss hit animation
                const el = document.getElementById('boss-emoji');
                el.classList.add('hit');
                setTimeout(() => el.classList.remove('hit'), 500);
                this.triggerBossSpeedLines();

                if (this.hp <= 0) {
                    fb.textContent = '';
                    this.victory();
                } else {
                    this.updateTaunt();
                    // Фразы для серий ударов
                    let streakMsg = `⚔️ Удар! Осталось ${this.hp} HP!`;
                    if (this.streak === 7) streakMsg = `⚔️ ${this.pickTaunt('playerStreak7')}`;
                    else if (this.streak === 5) streakMsg = `⚔️ ${this.pickTaunt('playerStreak5')}`;
                    else if (this.streak === 3) streakMsg = `⚔️ ${this.pickTaunt('playerStreak3')}`;
                    fb.textContent = streakMsg;
                    fb.className = 'feedback ok';
                    this.waiting = true;
                    setTimeout(() => this.loadQ(), 1000);
                }
            } else {
                this.streak = 0;
                this.totalErrors++;
                app.state.streak = 0;
                this.hp = this.maxHp;
                this.updateHP();

                const { n1, n2 } = this.currentQ;
                // Пошаговый разбор вместо просто ответа
                fb.textContent = `👹 ${this.pickTaunt('healed')}\n${app.getStepByStep(n1, n2)}`;
                fb.className = 'feedback err';

                document.getElementById('boss-emoji').textContent = '👹';
                document.getElementById('boss-taunt').textContent = this.pickTaunt('healed');

                this.waiting = true;
                setTimeout(() => this.loadQ(), 3500);
            }
            app.save();
            app.updateStats();
            app.checkAchievements();
        },

        updateHP() {
            const pct = (this.hp / this.maxHp) * 100;
            const fill = document.getElementById('boss-hp-fill');
            fill.style.width = pct + '%';
            fill.classList.toggle('low', this.hp <= 3);
            document.getElementById('boss-hp-text').textContent = `HP: ${this.hp} / ${this.maxHp}`;
        },

        updateTaunt() {
            const el = document.getElementById('boss-taunt');
            const emoji = document.getElementById('boss-emoji');
            let category, emojiChar;
            if (this.hp >= 8) { category = 'hp_high'; emojiChar = '👹'; }
            else if (this.hp >= 5) { category = 'hp_mid'; emojiChar = '😤'; }
            else if (this.hp >= 3) { category = 'hp_low'; emojiChar = '😰'; }
            else { category = 'hp_critical'; emojiChar = '😱'; }
            el.textContent = this.pickTaunt(category);
            emoji.textContent = emojiChar;
        },

        triggerBossSpeedLines() {
            const container = document.getElementById('boss-speed-lines');
            if (!container) return;
            container.classList.add('active');
            container.innerHTML = '';
            for (let i = 0; i < 6; i++) {
                const line = document.createElement('div');
                line.className = 'speed-line';
                line.style.top = (15 + Math.random() * 70) + '%';
                line.style.width = (60 + Math.random() * 120) + 'px';
                line.style.animationDelay = (i * 50) + 'ms';
                container.appendChild(line);
            }
            setTimeout(() => {
                container.classList.remove('active');
                container.innerHTML = '';
            }, 800);
        },

        victory() {
            document.getElementById('boss-emoji').textContent = '💀';
            document.getElementById('boss-taunt').textContent = 'Нееееет...';
            document.getElementById('boss-hp-fill').style.width = '0%';

            setTimeout(() => {
                let msg = `${app.state.playerName} победил босса!\n10 правильных ответов подряд!`;
                msg += `\n\nПопыток: ${this.totalAttempts}`;
                if (this.totalErrors === 0) msg += '\nБез единой ошибки — идеально!';
                else msg += `\nОшибок: ${this.totalErrors} — но ты не сдался!`;
                app.showModal('🏆', 'Босс повержен!', msg,
                    'Победа!', () => app.nav('screen-practice'));
            }, 600);
        }
    },

    // ─── 🧠 ПОЙМИ (Understand / Fluency) ───
    // Научная основа: conceptual understanding + стратегический подход + модель Брунера
    fluency: {
        mults: [],
        multIdx: 0,
        currentQ: null,
        totalCorrect: 0,
        totalAttempts: 0,

        start(mults) {
            console.log('[Fluency] Starting with', mults.length, 'multipliers');
            this.mults = mults;
            this.multIdx = 0;
            this.totalCorrect = 0;
            this.totalAttempts = 0;
            app.nav('screen-fluency');
            this.updateCounter();
            this.loadStrategy();
        },

        updateCounter() {
            const el = document.getElementById('fluency-counter');
            if (el) {
                const current = Math.min(this.multIdx + 1, this.mults.length);
                el.textContent = `${current}/${this.mults.length}`;
            }
        },

        loadStrategy() {
            // Проверяем завершение — все множители пройдены
            if (this.multIdx >= this.mults.length) {
                this.victory();
                return;
            }

            const mult = this.mults[this.multIdx];
            const n = Math.floor(Math.random() * 8) + 2; // 2-9
            this.currentQ = { n1: mult, n2: n, ans: mult * n };
            this.updateCounter();

            const s = CURRICULUM.strategyByMult[mult];
            document.getElementById('fluency-name').textContent = s ? s.name : `Умножение на ${mult}`;
            document.getElementById('fluency-strategy').textContent = this.explain(mult, n);

            // Пошаговый разбор
            const stepsEl = document.getElementById('fluency-steps');
            stepsEl.innerHTML = '';
            this.getSteps(mult, n).forEach((txt, i) => {
                const div = document.createElement('div');
                div.className = 'fluency-step';
                div.innerHTML = `<span class="step-num">${i + 1}</span><span class="step-text">${txt}</span>`;
                stepsEl.appendChild(div);
            });

            document.getElementById('fluency-n1').textContent = mult;
            document.getElementById('fluency-n2').textContent = n;
            document.getElementById('fluency-input').value = '';
            document.getElementById('fluency-feedback').textContent = '';
            document.getElementById('fluency-feedback').className = 'feedback';
            document.getElementById('fluency-input').focus();
        },

        explain(mult, n) {
            // Объясняем ПОЧЕМУ метод работает, а не просто КАК
            switch (mult) {
                case 2: return `Удвоение: 2 группы — это число + число. Сложи ${n} с самим собой: ${n} + ${n} = ?`;
                case 3: return `3 группы = 2 группы + ещё 1. Сначала удвой (${n} × 2 = ${n*2}), потом прибавь ещё ${n}: ${n*2} + ${n} = ?`;
                case 4: return `4 = 2 × 2, поэтому удваиваем дважды: ${n} × 2 = ${n*2}, потом ${n*2} × 2 = ?`;
                case 5: return `Каждые 5 минут на часах — новая отметка. Считай пятёрками до ${n}-й: 5, 10, 15... Найди ${n}-ю отметку.`;
                case 6: return `6 = 5 + 1, значит 6 групп = 5 групп + ещё 1 группа. ${n} × 5 = ${n*5}, плюс ещё ${n}: ${n*5} + ${n} = ?`;
                case 7: return `7 = 5 + 2, значит 7 групп = 5 групп + 2 группы. ${n} × 5 = ${n*5}, ${n} × 2 = ${n*2}. Сложи: ${n*5} + ${n*2} = ?`;
                case 8: return `8 = 2 × 2 × 2, поэтому удваиваем три раза: ${n} → ${n*2} → ${n*4} → ?`;
                case 9: return `9 = 10 − 1, значит 9 групп = 10 групп минус 1. ${n} × 10 = ${n*10}, вычти ${n}: ${n*10} − ${n} = ?`;
                case 10: return `Умножить на 10 = сдвинуть число на разряд. Просто допиши 0 к числу ${n}: ${n}0.`;
                default: return '';
            }
        },

        getSteps(mult, n) {
            switch (mult) {
                case 2: return [
                    `Возьми число <strong>${n}</strong>`,
                    `Прибавь к самому себе: ${n} + ${n} = <strong>?</strong>`
                ];
                case 3: return [
                    `Удвой: ${n} × 2 = <strong>${n*2}</strong>`,
                    `Прибавь ещё раз ${n}: ${n*2} + ${n} = <strong>?</strong>`
                ];
                case 4: return [
                    `Первое удвоение: ${n} × 2 = <strong>${n*2}</strong>`,
                    `Второе удвоение: ${n*2} × 2 = <strong>?</strong>`
                ];
                case 5: return [
                    `Представь циферблат часов`,
                    `Считай пятёрками: 5, 10, 15... до <strong>${n}-й</strong> отметки`
                ];
                case 6: return [
                    `Умножь на 5: ${n} × 5 = <strong>${n*5}</strong>`,
                    `Прибавь ${n}: ${n*5} + ${n} = <strong>?</strong>`
                ];
                case 7: return [
                    `${n} × 5 = <strong>${n*5}</strong>`,
                    `${n} × 2 = <strong>${n*2}</strong>`,
                    `Сложи: ${n*5} + ${n*2} = <strong>?</strong>`
                ];
                case 8: return [
                    `${n} × 2 = <strong>${n*2}</strong>`,
                    `${n*2} × 2 = <strong>${n*4}</strong>`,
                    `${n*4} × 2 = <strong>?</strong>`
                ];
                case 9: return [
                    `${n} × 10 = <strong>${n*10}</strong>`,
                    `Вычти ${n}: ${n*10} − ${n} = <strong>?</strong>`
                ];
                case 10: return [
                    `Возьми число <strong>${n}</strong>`,
                    `Допиши 0 справа: <strong>${n}0</strong>`
                ];
                default: return [];
            }
        },

        check() {
            const val = parseInt(document.getElementById('fluency-input').value);
            if (isNaN(val)) return;

            const fb = document.getElementById('fluency-feedback');
            app.state.total++;
            this.totalAttempts++;

            if (val === this.currentQ.ans) {
                app.state.correct++;
                this.totalCorrect++;
                // Показываем проверку: полное решение для закрепления
                const { n1, n2 } = this.currentQ;
                fb.textContent = `⚡ Правильно! Проверка: ${app.getStepByStep(n1, n2)}`;
                fb.className = 'feedback ok';
                app.showEnergyBurst();

                this.multIdx++;
                setTimeout(() => this.loadStrategy(), 2000);
            } else {
                fb.textContent = `Не совсем. Перечитай шаги внимательно и попробуй ещё раз!`;
                fb.className = 'feedback err';
                // Не переходим к следующей — ребёнок пробует снова
            }
            app.save();
            app.updateStats();
            app.checkAchievements();
        },

        victory() {
            let msg = `${app.state.playerName}, ты разобрал все ${this.mults.length} стратегий!`;
            msg += `\n\nПравильных: ${this.totalCorrect}`;
            msg += `\nПопыток: ${this.totalAttempts}`;
            if (this.totalCorrect === this.totalAttempts) msg += '\nВсё с первого раза — невероятно!';
            else msg += '\nГлавное — ты ПОНЯЛ, как это работает!';
            app.showModal('🧠', 'Все стратегии пройдены!', msg,
                'Супер!', () => app.nav('screen-practice'));
        }
    },

    // ─── SAVE/LOAD ───
    save() {
        localStorage.setItem('mathSempaiSave', JSON.stringify(this.state));
    },

    load() {
        const saved = localStorage.getItem('mathSempaiSave');
        if (saved) {
            try {
                this.state = { ...this.state, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('Не удалось загрузить сохранение:', e);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());

// Enter для ответа и для ввода имени
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const active = (id) => document.getElementById(id).classList.contains('active');
        if (active('screen-lesson')) app.check();
        else if (active('screen-welcome')) app.submitName();
        else if (active('screen-marathon')) app.marathon.check();
        else if (active('screen-boss')) app.boss.check();
        else if (active('screen-fluency')) app.fluency.check();
        else if (active('screen-flash')) app.flash.flip();
        else if (active('screen-practice-setup')) app.startSelectedPractice();
    }
});
