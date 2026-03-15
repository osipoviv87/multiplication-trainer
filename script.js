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
        geometryTotal: 0,
        physicsTotal: 0,
        currentSubject: 'math'
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
    switchSubject(subject) {
        this.state.currentSubject = subject;
        document.querySelectorAll('.subject-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.subject === subject)
        );
        this.renderMap();
    },

    renderMap() {
        const container = document.getElementById('weeks-container');
        container.innerHTML = '';
        const subject = this.state.currentSubject || 'math';
        const weeks = CURRICULUM.subjects[subject].weeks;
        weeks.forEach((week, idx) => {
            const div = document.createElement('div');
            div.className = 'week-card';
            div.innerHTML = `
                <div class="week-num">${idx + 1}</div>
                <div class="week-title">${week.title}</div>
                <div class="week-desc">${week.desc}</div>
                <div class="week-status" style="color:var(--success)">
                    ⚡ Доступно
                </div>
            `;
            div.onclick = () => this.startLesson(week.id);
            container.appendChild(div);
        });
        // Обновить вкладки
        document.querySelectorAll('.subject-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.subject === subject)
        );
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
        } else if (operation === 'divide-remainder') {
            // Деление с остатком: D = d × q + r, где r < d
            const divisors = week.divisors || week.multipliers;
            const divisor = divisors[Math.floor(Math.random() * divisors.length)];
            const quotient = Math.floor(Math.random() * 8) + 2; // 2-9
            const remainder = Math.floor(Math.random() * (divisor - 1)) + 1; // 1..divisor-1
            const dividend = divisor * quotient + remainder;
            question = { n1: dividend, n2: divisor, ans: quotient, ansRemainder: remainder, operation: 'divide-rem' };
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
        } else if (operation === 'angle-type') {
            // Виды углов: случайный угол, определи тип
            const angles = [
                { deg: 30, type: 'acute' }, { deg: 45, type: 'acute' }, { deg: 60, type: 'acute' },
                { deg: 15, type: 'acute' }, { deg: 75, type: 'acute' },
                { deg: 90, type: 'right' },
                { deg: 100, type: 'obtuse' }, { deg: 120, type: 'obtuse' }, { deg: 135, type: 'obtuse' },
                { deg: 150, type: 'obtuse' }, { deg: 170, type: 'obtuse' }
            ];
            const angle = angles[Math.floor(Math.random() * angles.length)];
            question = { degrees: angle.deg, ans: angle.type, operation: 'angle-type' };
        } else if (operation === 'length-units') {
            // Единицы длины: перевод
            const conversions = [
                { from: 'см', to: 'мм', factor: 10, maxVal: 10 },
                { from: 'дм', to: 'см', factor: 10, maxVal: 10 },
                { from: 'м', to: 'см', factor: 100, maxVal: 5 },
                { from: 'м', to: 'дм', factor: 10, maxVal: 10 },
                { from: 'км', to: 'м', factor: 1000, maxVal: 5 },
                { from: 'мм', to: 'см', factor: 0.1, maxVal: 50 },
                { from: 'см', to: 'дм', factor: 0.1, maxVal: 50 }
            ];
            const conv = conversions[Math.floor(Math.random() * conversions.length)];
            const val = (Math.floor(Math.random() * conv.maxVal) + 1) * (conv.factor >= 1 ? 1 : 10);
            const ans = conv.factor >= 1 ? val * conv.factor : val / (1 / conv.factor);
            question = { n1: val, fromUnit: conv.from, toUnit: conv.to, ans: ans, operation: 'length-units' };
        } else if (operation === 'physics-velocity') {
            // Скорость: v=d/t, d=v*t, t=d/v
            const speeds = [10, 20, 30, 40, 50, 60, 80, 100];
            const times = [2, 3, 4, 5, 6];
            const v = speeds[Math.floor(Math.random() * speeds.length)];
            const t = times[Math.floor(Math.random() * times.length)];
            const d = v * t;
            const unknowns = ['v', 'd', 't'];
            const unknown = unknowns[Math.floor(Math.random() * unknowns.length)];
            if (unknown === 'v') question = { d, t, ans: v, unknown: 'v', operation: 'physics-velocity' };
            else if (unknown === 'd') question = { v, t, ans: d, unknown: 'd', operation: 'physics-velocity' };
            else question = { v, d, ans: t, unknown: 't', operation: 'physics-velocity' };
        } else if (operation === 'physics-gravity') {
            // Сила тяжести: W = m * 10 (g≈10)
            const masses = [2, 3, 5, 8, 10, 15, 20, 25, 30, 50];
            const m = masses[Math.floor(Math.random() * masses.length)];
            if (Math.random() < 0.5) {
                // Вес на Земле
                question = { mass: m, planet: 'Земля', g: 10, ans: m * 10, operation: 'physics-gravity' };
            } else {
                // Вес на Луне (÷6, округлённо)
                const mLuna = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60][Math.floor(Math.random() * 10)];
                question = { mass: mLuna, planet: 'Луна', g: 10, ans: mLuna / 6, moonWeight: true, operation: 'physics-gravity' };
            }
        } else if (operation === 'physics-lever') {
            // Рычаги: F1 * l1 = F2 * l2
            const forces = [2, 3, 4, 5, 6, 8, 10];
            const arms = [1, 2, 3, 4, 5, 6];
            const f1 = forces[Math.floor(Math.random() * forces.length)];
            const l1 = arms[Math.floor(Math.random() * arms.length)];
            const product = f1 * l1;
            // Ищем пару, где product делится нацело
            const validPairs = [];
            for (const f2 of forces) { if (product % f2 === 0 && product / f2 <= 6) validPairs.push({ f2, l2: product / f2 }); }
            if (validPairs.length === 0) validPairs.push({ f2: product, l2: 1 });
            const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
            if (Math.random() < 0.5) {
                question = { f1, l1, l2: pair.l2, ans: pair.f2, unknown: 'f2', operation: 'physics-lever' };
            } else {
                question = { f1, l1, f2: pair.f2, ans: pair.l2, unknown: 'l2', operation: 'physics-lever' };
            }
        } else if (operation === 'physics-light') {
            // Свет и тени: качественные вопросы (выбор из 3)
            const questions = [
                { text: 'Что нужно, чтобы появилась тень?', options: ['Только свет', 'Свет + непрозрачный предмет + экран', 'Темнота'], ans: 1 },
                { text: 'Когда тень длиннее?', options: ['В полдень', 'Утром/вечером', 'Ночью'], ans: 1 },
                { text: 'Свет распространяется...', options: ['По кривой', 'Прямолинейно', 'Только вниз'], ans: 1 },
                { text: 'Что произойдёт, если поднести руку ближе к лампе?', options: ['Тень уменьшится', 'Тень увеличится', 'Тень не изменится'], ans: 1 },
                { text: 'Зеркало отражает свет потому что...', options: ['Оно тяжёлое', 'Поверхность гладкая и блестящая', 'Оно прозрачное'], ans: 1 },
                { text: 'Почему мы видим предметы?', options: ['Глаза излучают свет', 'Свет отражается от предметов в глаза', 'Предметы светятся сами'], ans: 1 }
            ];
            const q = questions[Math.floor(Math.random() * questions.length)];
            question = { text: q.text, options: q.options, ans: q.ans, operation: 'physics-light' };
        } else if (operation === 'physics-density') {
            // Плотность: ρ = m / V, тонет или плывёт
            if (Math.random() < 0.5) {
                // Числовая: найди плотность
                const masses = [100, 200, 300, 400, 500, 600, 800];
                const volumes = [50, 100, 200, 250, 400, 500];
                const m = masses[Math.floor(Math.random() * masses.length)];
                const validV = volumes.filter(v => (m / v) === Math.floor(m / v));
                const v = validV.length > 0 ? validV[Math.floor(Math.random() * validV.length)] : 100;
                question = { mass: m, volume: v, ans: m / v, operation: 'physics-density', subType: 'calc' };
            } else {
                // Качественная: тонет или плывёт?
                const items = [
                    { name: 'Камень', density: 2.5, sinks: true },
                    { name: 'Дерево', density: 0.5, sinks: false },
                    { name: 'Железо', density: 7.8, sinks: true },
                    { name: 'Пробка', density: 0.2, sinks: false },
                    { name: 'Лёд', density: 0.9, sinks: false },
                    { name: 'Кирпич', density: 1.8, sinks: true }
                ];
                const item = items[Math.floor(Math.random() * items.length)];
                // ans: 1 = тонет, 2 = плывёт
                question = { itemName: item.name, itemDensity: item.density, ans: item.sinks ? 1 : 2, operation: 'physics-density', subType: 'float' };
            }
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
            'perimeter': `Глава ${this.state.week}: Периметр`,
            'divide-remainder': `Глава ${this.state.week}: Деление с остатком`,
            'angle-type': 'Виды углов',
            'length-units': 'Единицы длины',
            'physics-velocity': 'Скорость, расстояние, время',
            'physics-gravity': 'Сила тяжести и вес',
            'physics-lever': 'Рычаги',
            'physics-light': 'Свет и тени',
            'physics-density': 'Плотность'
        };
        document.getElementById('lesson-title').innerText = titleMap[operation] || week.title || `Глава ${this.state.week}`;

        // Обновляем отображение уравнения
        const opEl = document.getElementById('q-op');
        const n1El = document.getElementById('q-n1');
        const n2El = document.getElementById('q-n2');
        const answerInput = document.getElementById('answer-input');
        const fractionChoice = document.getElementById('fraction-choice');
        const equationContainer = document.getElementById('equation-container');
        const remainderBlock = document.getElementById('remainder-input-block');
        const angleChoice = document.getElementById('angle-choice');
        const physicsChoice = document.getElementById('physics-choice');

        // Скрываем по умолчанию
        fractionChoice.style.display = 'none';
        answerInput.style.display = 'inline-block';
        equationContainer.style.display = 'block';
        remainderBlock.style.display = 'none';
        angleChoice.style.display = 'none';
        physicsChoice.style.display = 'none';

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
        } else if (question.operation === 'divide-rem') {
            // Деление с остатком: скрываем стандартное поле, показываем два поля
            n1El.textContent = question.n1;
            n2El.textContent = question.n2;
            opEl.textContent = '÷';
            answerInput.style.display = 'none';
            equationContainer.style.display = 'block';
            remainderBlock.style.display = 'flex';
            document.getElementById('quotient-input').value = '';
            document.getElementById('remainder-input').value = '';
        } else if (question.operation === 'area' || question.operation === 'perimeter') {
            n1El.textContent = question.n1;
            n2El.textContent = question.n2;
            opEl.textContent = question.operation === 'area' ? '×' : '+';
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'angle-type') {
            // Углы: скрываем уравнение, показываем кнопки выбора
            equationContainer.style.display = 'none';
            answerInput.style.display = 'none';
            angleChoice.style.display = 'flex';
            this.selectedAngle = null;
            angleChoice.querySelectorAll('.fraction-choice-btn').forEach(b => b.classList.remove('selected'));
        } else if (question.operation === 'length-units') {
            // Единицы длины
            n1El.textContent = question.n1;
            opEl.textContent = question.fromUnit + ' →';
            n2El.textContent = question.toUnit;
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'physics-velocity') {
            equationContainer.style.display = 'block';
            if (question.unknown === 'v') {
                n1El.textContent = question.d + ' км';
                opEl.textContent = '÷';
                n2El.textContent = question.t + ' ч';
            } else if (question.unknown === 'd') {
                n1El.textContent = question.v + ' км/ч';
                opEl.textContent = '×';
                n2El.textContent = question.t + ' ч';
            } else {
                n1El.textContent = question.d + ' км';
                opEl.textContent = '÷';
                n2El.textContent = question.v + ' км/ч';
            }
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'physics-gravity') {
            equationContainer.style.display = 'block';
            if (question.moonWeight) {
                n1El.textContent = question.mass + ' кг';
                opEl.textContent = '÷ 6';
                n2El.textContent = '(Луна)';
            } else {
                n1El.textContent = question.mass + ' кг';
                opEl.textContent = '× 10';
                n2El.textContent = '= ? Н';
            }
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'physics-lever') {
            equationContainer.style.display = 'block';
            if (question.unknown === 'f2') {
                n1El.textContent = `${question.f1}×${question.l1}`;
                opEl.textContent = '=';
                n2El.textContent = `?×${question.l2}`;
            } else {
                n1El.textContent = `${question.f1}×${question.l1}`;
                opEl.textContent = '=';
                n2El.textContent = `${question.f2}×?`;
            }
            answerInput.value = '';
            answerInput.style.display = 'inline-block';
        } else if (question.operation === 'physics-light') {
            // Качественный вопрос: 3 варианта ответа
            equationContainer.style.display = 'none';
            answerInput.style.display = 'none';
            physicsChoice.style.display = 'flex';
            physicsChoice.innerHTML = '';
            question.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'fraction-choice-btn';
                btn.dataset.value = idx;
                btn.textContent = opt;
                btn.onclick = () => this.selectPhysicsChoice(idx);
                physicsChoice.appendChild(btn);
            });
            this.selectedPhysicsAnswer = null;
        } else if (question.operation === 'physics-density') {
            equationContainer.style.display = 'block';
            if (question.subType === 'calc') {
                n1El.textContent = question.mass + ' г';
                opEl.textContent = '÷';
                n2El.textContent = question.volume + ' см³';
                answerInput.value = '';
                answerInput.style.display = 'inline-block';
            } else {
                // Тонет/плывёт — 2 кнопки
                equationContainer.style.display = 'none';
                answerInput.style.display = 'none';
                physicsChoice.style.display = 'flex';
                physicsChoice.innerHTML = '';
                ['Тонет', 'Плывёт'].forEach((opt, idx) => {
                    const btn = document.createElement('button');
                    btn.className = 'fraction-choice-btn';
                    btn.dataset.value = idx + 1;
                    btn.textContent = opt;
                    btn.onclick = () => this.selectPhysicsChoice(idx + 1);
                    physicsChoice.appendChild(btn);
                });
                this.selectedPhysicsAnswer = null;
            }
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
        
        // Фокус на поле ввода (если не выбор из кнопок)
        if (question.operation === 'divide-rem') {
            document.getElementById('quotient-input').focus();
        } else if (['angle-type', 'physics-light'].includes(question.operation) ||
                   (question.operation === 'physics-density' && question.subType === 'float') ||
                   (question.operation === 'compare' && question.subOperation)) {
            // Не фокусируем — выбор из кнопок
        } else {
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
        } else if (operation === 'divide-remainder') {
            return {
                strategy: `Деление с остатком: ${question.n1} ÷ ${question.n2}. Найди наибольшее кратное ${question.n2}, не превышающее ${question.n1}!`,
                hint: week.lessons[0].hint,
                fingerTip: week.lessons[0].fingerTip
            };
        } else if (operation === 'angle-type' || operation === 'length-units' ||
                   operation.startsWith('physics-')) {
            return week.lessons[0];
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
        } else if (q.operation === 'divide-rem') {
            desc.innerText = `${q.n1} ÷ ${q.n2} = ? ост. ? (Делимое = Делитель × Частное + Остаток)`;
        } else if (q.operation === '÷') {
            desc.innerText = `${q.n1} ÷ ${q.n2} = ? (${q.n2} × ? = ${q.n1})`;
        } else if (q.operation === 'area') {
            desc.innerText = `Прямоугольник ${q.n1} × ${q.n2}. Чему равна площадь S = ${q.n1} × ${q.n2} = ?`;
        } else if (q.operation === 'perimeter') {
            desc.innerText = `Прямоугольник ${q.n1} × ${q.n2}. Чему равен периметр P = (${q.n1} + ${q.n2}) × 2 = ?`;
        } else if (q.operation === 'angle-type') {
            desc.innerText = `Угол ${q.degrees}°. Какой это угол: острый, прямой или тупой?`;
        } else if (q.operation === 'length-units') {
            desc.innerText = `${q.n1} ${q.fromUnit} = ? ${q.toUnit}`;
        } else if (q.operation === 'physics-velocity') {
            if (q.unknown === 'v') desc.innerText = `Расстояние ${q.d} км, время ${q.t} ч. Найди скорость v = ?`;
            else if (q.unknown === 'd') desc.innerText = `Скорость ${q.v} км/ч, время ${q.t} ч. Найди расстояние d = ?`;
            else desc.innerText = `Расстояние ${q.d} км, скорость ${q.v} км/ч. Найди время t = ?`;
        } else if (q.operation === 'physics-gravity') {
            if (q.moonWeight) desc.innerText = `На Земле ${q.mass} кг. Сколько кг весит на Луне? (в 6 раз меньше)`;
            else desc.innerText = `Масса ${q.mass} кг. Найди вес W = m × g (g = 10 м/с²)`;
        } else if (q.operation === 'physics-lever') {
            desc.innerText = `F₁=${q.f1}, l₁=${q.l1}. ${q.unknown === 'f2' ? `l₂=${q.l2}. Найди F₂ = ?` : `F₂=${q.f2}. Найди l₂ = ?`}`;
        } else if (q.operation === 'physics-light') {
            desc.innerText = q.text;
        } else if (q.operation === 'physics-density') {
            if (q.subType === 'calc') desc.innerText = `Масса ${q.mass} г, объём ${q.volume} см³. Найди плотность ρ = m ÷ V = ?`;
            else desc.innerText = `${q.itemName} (плотность ${q.itemDensity} г/см³). Тонет или плывёт в воде?`;
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
        } else if (operation === 'divide-rem') {
            if (type === 'array') this.renderRemainderArray(container, q.n1, q.n2);
            else if (type === 'line') this.renderRemainderNumberLine(container, q.n1, q.n2);
            else this.renderRemainderFormula(container, q.n1, q.n2);
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
        } else if (operation === 'angle-type') {
            if (type === 'array') this.renderAngleSVG(container, q);
            else if (type === 'line') this.renderAngleNumberLine(container, q);
            else this.renderAngleTypes(container, q);
        } else if (operation === 'length-units') {
            if (type === 'array') this.renderRuler(container, q);
            else if (type === 'line') this.renderUnitStairs(container, q);
            else this.renderUnitFormula(container, q);
        } else if (operation === 'physics-velocity') {
            if (type === 'array') this.renderVelocityAnimation(container, q);
            else if (type === 'line') this.renderTriangleFormula(container, q);
            else this.renderVelocityFormula(container, q);
        } else if (operation === 'physics-gravity') {
            if (type === 'array') this.renderGravityVisual(container, q);
            else if (type === 'line') this.renderTriangleFormula(container, q);
            else this.renderGravityFormula(container, q);
        } else if (operation === 'physics-lever') {
            if (type === 'array') this.renderLeverSVG(container, q);
            else if (type === 'line') this.renderTriangleFormula(container, q);
            else this.renderLeverFormula(container, q);
        } else if (operation === 'physics-light') {
            if (type === 'array') this.renderLightSVG(container, q);
            else if (type === 'line') this.renderLightFacts(container, q);
            else this.renderLightFormula(container, q);
        } else if (operation === 'physics-density') {
            if (type === 'array') this.renderDensityVisual(container, q);
            else if (type === 'line') this.renderDensityTable(container, q);
            else this.renderDensityFormula(container, q);
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

    // ─── ДЕЛЕНИЕ С ОСТАТКОМ: Визуализация ───
    renderRemainderArray(container, dividend, divisor) {
        const quotient = Math.floor(dividend / divisor);
        const remainder = dividend % divisor;
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '4px';
        container.style.justifyContent = 'center';
        container.style.padding = '10px';

        // Полные группы
        for (let g = 0; g < quotient; g++) {
            const group = document.createElement('div');
            group.style.cssText = 'display:flex; flex-direction:column; gap:4px; border:2px solid var(--primary); border-radius:6px; padding:4px;';
            for (let r = 0; r < divisor; r++) {
                const dot = document.createElement('div');
                dot.className = 'dot row-even';
                dot.style.animationDelay = `${(g * divisor + r) * 25}ms`;
                group.appendChild(dot);
            }
            container.appendChild(group);
        }

        // Остаток (если есть)
        if (remainder > 0) {
            const remGroup = document.createElement('div');
            remGroup.style.cssText = 'display:flex; flex-direction:column; gap:4px; border:2px dashed var(--secondary); border-radius:6px; padding:4px;';
            for (let r = 0; r < remainder; r++) {
                const dot = document.createElement('div');
                dot.className = 'dot row-odd';
                dot.style.animationDelay = `${(quotient * divisor + r) * 25}ms`;
                remGroup.appendChild(dot);
            }
            container.appendChild(remGroup);
        }

        const label = document.createElement('div');
        label.style.cssText = 'width:100%; text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:8px;';
        label.innerHTML = `<span style="color:var(--primary)">${quotient}</span> полных групп по ${divisor} + <span style="color:var(--secondary)">${remainder}</span> остаток`;
        container.appendChild(label);
    },

    renderRemainderNumberLine(container, dividend, divisor) {
        container.style.display = 'block';
        container.style.padding = '10px 0';

        const quotient = Math.floor(dividend / divisor);
        const remainder = dividend % divisor;
        const line = document.createElement('div');
        line.className = 'number-line';

        // Прыжки от dividend к 0
        for (let i = 0; i <= quotient; i++) {
            const step = document.createElement('div');
            step.className = 'nl-step';
            step.style.animationDelay = `${i * 100}ms`;

            const num = document.createElement('div');
            const val = dividend - i * divisor;
            num.className = `nl-num ${i === quotient ? 'final' : ''}`;
            num.textContent = i === quotient ? (remainder > 0 ? remainder : '0') : val;
            step.appendChild(num);

            if (i < quotient) {
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
        label.innerHTML = `Вычитаем <strong>${divisor}</strong> из <strong>${dividend}</strong> — <strong>${quotient}</strong> раз${quotient === 1 ? '' : 'а'}. Остаток: <strong style="color:var(--secondary)">${remainder}</strong>`;
        container.appendChild(label);
    },

    renderRemainderFormula(container, dividend, divisor) {
        const quotient = Math.floor(dividend / divisor);
        const remainder = dividend % divisor;
        container.style.display = 'block';
        container.style.padding = '10px';

        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Формула деления с остатком:</strong><br>
<strong style="color:var(--accent)">Делимое = Делитель × Частное + Остаток</strong><br><br>
Шаг 1: Найди наибольшее кратное <strong>${divisor}</strong>, не превышающее <strong>${dividend}</strong><br>
→ <strong>${divisor}</strong> × <strong style="color:var(--primary)">${quotient}</strong> = <strong>${divisor * quotient}</strong><br><br>
Шаг 2: Вычти: <strong>${dividend}</strong> − <strong>${divisor * quotient}</strong> = <strong style="color:var(--secondary)">${remainder}</strong> (остаток)<br><br>
Проверка: <strong>${divisor}</strong> × <strong>${quotient}</strong> + <strong>${remainder}</strong> = <strong>${dividend}</strong> ✓<br>
<em>Остаток всегда меньше делителя: ${remainder} &lt; ${divisor} ✓</em>`;
        container.appendChild(info);
    },

    // ─── ГЕОМЕТРИЯ: Визуализация ───
    renderAngleSVG(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.padding = '20px';

        const svgW = 200, svgH = 160;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgW);
        svg.setAttribute('height', svgH);
        svg.style.overflow = 'visible';

        const cx = 40, cy = svgH - 30, len = 120;
        const rad = q.degrees * Math.PI / 180;
        const x2 = cx + len * Math.cos(rad);
        const y2 = cy - len * Math.sin(rad);

        // Горизонтальный луч
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', cx); line1.setAttribute('y1', cy);
        line1.setAttribute('x2', cx + len); line1.setAttribute('y2', cy);
        line1.setAttribute('stroke', 'var(--primary)'); line1.setAttribute('stroke-width', '3');
        svg.appendChild(line1);

        // Наклонный луч
        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', cx); line2.setAttribute('y1', cy);
        line2.setAttribute('x2', x2); line2.setAttribute('y2', y2);
        line2.setAttribute('stroke', 'var(--secondary)'); line2.setAttribute('stroke-width', '3');
        svg.appendChild(line2);

        // Дуга угла
        const arcR = 30;
        const ax = cx + arcR; const ay = cy;
        const bx = cx + arcR * Math.cos(rad); const by = cy - arcR * Math.sin(rad);
        const largeArc = q.degrees > 180 ? 1 : 0;
        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arc.setAttribute('d', `M ${ax} ${ay} A ${arcR} ${arcR} 0 ${largeArc} 0 ${bx} ${by}`);
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', 'var(--accent)'); arc.setAttribute('stroke-width', '2');
        svg.appendChild(arc);

        // Подпись градусов
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const lx = cx + (arcR + 15) * Math.cos(rad / 2);
        const ly = cy - (arcR + 15) * Math.sin(rad / 2);
        label.setAttribute('x', lx); label.setAttribute('y', ly);
        label.setAttribute('fill', 'var(--accent)'); label.setAttribute('font-size', '14');
        label.setAttribute('font-weight', '700');
        label.textContent = q.degrees + '°';
        svg.appendChild(label);

        container.appendChild(svg);
    },

    renderAngleNumberLine(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const scale = document.createElement('div');
        scale.style.cssText = 'position:relative; height:40px; background:linear-gradient(to right, var(--primary), var(--accent), var(--secondary)); border-radius:8px; margin:10px;';
        const marker = document.createElement('div');
        const pct = (q.degrees / 180) * 100;
        marker.style.cssText = `position:absolute; top:-8px; left:${pct}%; transform:translateX(-50%); font-size:1.2rem; font-weight:900; color:var(--text);`;
        marker.textContent = '▼ ' + q.degrees + '°';
        scale.appendChild(marker);

        // Метки 0, 90, 180
        ['0°', '90°', '180°'].forEach((txt, i) => {
            const m = document.createElement('div');
            m.style.cssText = `position:absolute; bottom:-20px; left:${i * 50}%; transform:translateX(-50%); font-size:0.8rem; color:var(--text-dim);`;
            m.textContent = txt;
            scale.appendChild(m);
        });

        container.appendChild(scale);

        const legend = document.createElement('div');
        legend.style.cssText = 'text-align:center; margin-top:28px; color:var(--text-dim); font-size:0.85rem;';
        legend.innerHTML = '<span style="color:var(--primary)">Острый (0°-89°)</span> | <span style="color:var(--accent)">Прямой (90°)</span> | <span style="color:var(--secondary)">Тупой (91°-180°)</span>';
        container.appendChild(legend);
    },

    renderAngleTypes(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Виды углов:</strong><br><br>
<strong style="color:var(--primary)">Острый</strong> — меньше 90° (как клюв птицы)<br>
<strong style="color:var(--accent)">Прямой</strong> — ровно 90° (угол тетрадки, буква L)<br>
<strong style="color:var(--secondary)">Тупой</strong> — больше 90° (как открытая книга)<br><br>
Текущий угол: <strong>${q.degrees}°</strong> — это <strong style="color:var(--accent)">?</strong>`;
        container.appendChild(info);
    },

    // ─── ЕДИНИЦЫ ДЛИНЫ: Визуализация ───
    renderRuler(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.padding = '20px';

        const svgW = 250, svgH = 60;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgW);
        svg.setAttribute('height', svgH);

        // Линейка
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', 10); rect.setAttribute('y', 10);
        rect.setAttribute('width', 230); rect.setAttribute('height', 30);
        rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', 'var(--primary)');
        rect.setAttribute('stroke-width', '2'); rect.setAttribute('rx', '4');
        svg.appendChild(rect);

        const ticks = 10;
        for (let i = 0; i <= ticks; i++) {
            const x = 10 + (i / ticks) * 230;
            const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            tick.setAttribute('x1', x); tick.setAttribute('y1', 10);
            tick.setAttribute('x2', x); tick.setAttribute('y2', i % 5 === 0 ? 35 : 25);
            tick.setAttribute('stroke', 'var(--text-dim)'); tick.setAttribute('stroke-width', '1');
            svg.appendChild(tick);

            if (i % 5 === 0 || i === ticks) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', x); label.setAttribute('y', 55);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', 'var(--text-dim)'); label.setAttribute('font-size', '10');
                label.textContent = i;
                svg.appendChild(label);
            }
        }
        container.appendChild(svg);

        const info = document.createElement('div');
        info.style.cssText = 'text-align:center; color:var(--text-dim); font-size:0.85rem; margin-top:8px;';
        info.innerHTML = `<strong>${q.n1} ${q.fromUnit}</strong> = <strong style="color:var(--accent)">? ${q.toUnit}</strong>`;
        container.appendChild(info);
    },

    renderUnitStairs(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';

        const stairs = document.createElement('div');
        stairs.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:4px;';
        const units = ['мм', 'см', 'дм', 'м', 'км'];
        const factors = ['×10', '×10', '×10', '×1000'];
        units.forEach((u, i) => {
            const step = document.createElement('div');
            const isFrom = u === q.fromUnit;
            const isTo = u === q.toUnit;
            step.style.cssText = `padding:6px 16px; border-radius:8px; font-weight:700; font-size:0.9rem; ${isFrom ? 'background:var(--primary); color:#fff;' : isTo ? 'background:var(--secondary); color:#000;' : 'background:var(--bg-card); color:var(--text-dim);'}`;
            step.textContent = u;
            stairs.appendChild(step);
            if (i < factors.length) {
                const arrow = document.createElement('div');
                arrow.style.cssText = 'color:var(--accent); font-size:0.75rem; font-weight:600;';
                arrow.textContent = `↕ ${factors[i]}`;
                stairs.appendChild(arrow);
            }
        });
        container.appendChild(stairs);
    },

    renderUnitFormula(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Единицы длины — лесенка:</strong><br><br>
1 см = 10 мм<br>1 дм = 10 см<br>1 м = 10 дм = 100 см<br>1 км = 1000 м<br><br>
Задача: <strong style="color:var(--primary)">${q.n1} ${q.fromUnit}</strong> = <strong style="color:var(--accent)">? ${q.toUnit}</strong>`;
        container.appendChild(info);
    },

    // ─── ФИЗИКА: Визуализация ───
    renderVelocityAnimation(container, q) {
        container.style.display = 'block';
        container.style.padding = '20px';

        const track = document.createElement('div');
        track.style.cssText = 'position:relative; height:40px; background:var(--bg-card); border-radius:8px; overflow:hidden; border:1px solid var(--border);';

        const car = document.createElement('div');
        car.style.cssText = 'position:absolute; top:8px; left:5px; font-size:1.5rem; transition:left 2s linear;';
        car.textContent = '🚗';
        track.appendChild(car);

        container.appendChild(track);
        setTimeout(() => { car.style.left = '85%'; }, 100);

        const info = document.createElement('div');
        info.style.cssText = 'text-align:center; margin-top:12px; color:var(--text-dim); font-size:0.85rem;';
        if (q.unknown === 'v') info.innerHTML = `Расстояние: <strong>${q.d} км</strong>, Время: <strong>${q.t} ч</strong>. Скорость = ?`;
        else if (q.unknown === 'd') info.innerHTML = `Скорость: <strong>${q.v} км/ч</strong>, Время: <strong>${q.t} ч</strong>. Расстояние = ?`;
        else info.innerHTML = `Расстояние: <strong>${q.d} км</strong>, Скорость: <strong>${q.v} км/ч</strong>. Время = ?`;
        container.appendChild(info);
    },

    renderTriangleFormula(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.padding = '20px';

        const svgW = 180, svgH = 140;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgW);
        svg.setAttribute('height', svgH);

        // Треугольник
        const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        tri.setAttribute('points', `${svgW/2},10 10,${svgH-10} ${svgW-10},${svgH-10}`);
        tri.setAttribute('fill', 'none');
        tri.setAttribute('stroke', 'var(--primary)');
        tri.setAttribute('stroke-width', '2');
        svg.appendChild(tri);

        // Линия разделения
        const midLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        midLine.setAttribute('x1', 40); midLine.setAttribute('y1', svgH/2 + 10);
        midLine.setAttribute('x2', svgW - 40); midLine.setAttribute('y2', svgH/2 + 10);
        midLine.setAttribute('stroke', 'var(--text-dim)'); midLine.setAttribute('stroke-width', '1');
        svg.appendChild(midLine);

        let topText, leftText, rightText;
        if (q.operation === 'physics-velocity') {
            topText = 'd'; leftText = 'v'; rightText = 't';
        } else if (q.operation === 'physics-gravity') {
            topText = 'W'; leftText = 'm'; rightText = 'g';
        } else {
            topText = 'F₁l₁'; leftText = 'F₂'; rightText = 'l₂';
        }

        [[svgW/2, 45, topText], [50, svgH - 25, leftText], [svgW - 50, svgH - 25, rightText]].forEach(([x, y, txt]) => {
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', x); t.setAttribute('y', y);
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('fill', 'var(--accent)'); t.setAttribute('font-size', '16');
            t.setAttribute('font-weight', '700');
            t.textContent = txt;
            svg.appendChild(t);
        });

        container.appendChild(svg);
    },

    renderVelocityFormula(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        let html = '<strong>Формулы движения:</strong><br><br>';
        html += 'v = d ÷ t (скорость = расстояние ÷ время)<br>';
        html += 'd = v × t (расстояние = скорость × время)<br>';
        html += 't = d ÷ v (время = расстояние ÷ скорость)<br><br>';
        if (q.unknown === 'v') html += `v = ${q.d} ÷ ${q.t} = <strong style="color:var(--accent)">?</strong>`;
        else if (q.unknown === 'd') html += `d = ${q.v} × ${q.t} = <strong style="color:var(--accent)">?</strong>`;
        else html += `t = ${q.d} ÷ ${q.v} = <strong style="color:var(--accent)">?</strong>`;
        info.innerHTML = html;
        container.appendChild(info);
    },

    renderGravityVisual(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.gap = '30px';
        container.style.padding = '20px';

        const planets = q.moonWeight ?
            [{ name: '🌍 Земля', val: q.mass + ' кг' }, { name: '🌙 Луна', val: '? кг' }] :
            [{ name: '🌍 Земля', val: q.mass + ' кг → ? Н' }];
        planets.forEach(p => {
            const div = document.createElement('div');
            div.style.cssText = 'text-align:center; padding:12px; border:2px solid var(--border); border-radius:12px; background:var(--bg-card);';
            div.innerHTML = `<div style="font-size:2rem; margin-bottom:8px;">${p.name}</div><div style="font-weight:700; color:var(--accent);">${p.val}</div>`;
            container.appendChild(div);
        });
    },

    renderGravityFormula(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        let html = '<strong>Сила тяжести:</strong><br><br>';
        html += 'W = m × g (вес = масса × ускорение свободного падения)<br>';
        html += 'g на Земле ≈ 10 м/с²<br>';
        html += 'g на Луне ≈ в 6 раз меньше<br><br>';
        if (q.moonWeight) html += `На Земле: ${q.mass} кг. На Луне: ${q.mass} ÷ 6 = <strong style="color:var(--accent)">?</strong> кг`;
        else html += `W = ${q.mass} × 10 = <strong style="color:var(--accent)">?</strong> Н`;
        info.innerHTML = html;
        container.appendChild(info);
    },

    renderLeverSVG(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.padding = '20px';

        const svgW = 240, svgH = 100;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgW);
        svg.setAttribute('height', svgH);

        // Балка
        const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        beam.setAttribute('x1', 20); beam.setAttribute('y1', 40);
        beam.setAttribute('x2', svgW - 20); beam.setAttribute('y2', 40);
        beam.setAttribute('stroke', 'var(--text)'); beam.setAttribute('stroke-width', '4');
        svg.appendChild(beam);

        // Опора (треугольник)
        const pivot = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        pivot.setAttribute('points', `${svgW/2},40 ${svgW/2-12},70 ${svgW/2+12},70`);
        pivot.setAttribute('fill', 'var(--accent)');
        svg.appendChild(pivot);

        // Грузы
        [[30, `F₁=${q.f1}`, `l₁=${q.l1}`], [svgW - 30, `${q.unknown === 'f2' ? 'F₂=?' : 'F₂='+q.f2}`, `${q.unknown === 'l2' ? 'l₂=?' : 'l₂='+(q.l2||q.ans)}`]].forEach(([x, f, l]) => {
            const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            box.setAttribute('x', x - 15); box.setAttribute('y', 15);
            box.setAttribute('width', 30); box.setAttribute('height', 25);
            box.setAttribute('rx', 4); box.setAttribute('fill', 'var(--primary)');
            svg.appendChild(box);

            const fText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            fText.setAttribute('x', x); fText.setAttribute('y', 32);
            fText.setAttribute('text-anchor', 'middle');
            fText.setAttribute('fill', '#fff'); fText.setAttribute('font-size', '9');
            fText.setAttribute('font-weight', '700');
            fText.textContent = f;
            svg.appendChild(fText);

            const lText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lText.setAttribute('x', x); lText.setAttribute('y', 90);
            lText.setAttribute('text-anchor', 'middle');
            lText.setAttribute('fill', 'var(--text-dim)'); lText.setAttribute('font-size', '10');
            lText.textContent = l;
            svg.appendChild(lText);
        });

        container.appendChild(svg);
    },

    renderLeverFormula(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Правило рычага:</strong><br><br>
F₁ × l₁ = F₂ × l₂<br><br>
${q.f1} × ${q.l1} = ${q.f1 * q.l1}<br>
${q.unknown === 'f2' ? `? × ${q.l2} = ${q.f1 * q.l1} → F₂ = ${q.f1 * q.l1} ÷ ${q.l2}` : `${q.f2} × ? = ${q.f1 * q.l1} → l₂ = ${q.f1 * q.l1} ÷ ${q.f2}`} = <strong style="color:var(--accent)">?</strong>`;
        container.appendChild(info);
    },

    renderLightSVG(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.padding = '20px';

        const svgW = 220, svgH = 100;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', svgW);
        svg.setAttribute('height', svgH);

        // Солнце
        const sun = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sun.setAttribute('cx', 30); sun.setAttribute('cy', 25);
        sun.setAttribute('r', 15);
        sun.setAttribute('fill', '#fae22a');
        svg.appendChild(sun);

        // Лучи
        for (let i = 0; i < 3; i++) {
            const ray = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ray.setAttribute('x1', 45); ray.setAttribute('y1', 25 + i * 5);
            ray.setAttribute('x2', 100); ray.setAttribute('y2', 50 + i * 10);
            ray.setAttribute('stroke', '#fae22a'); ray.setAttribute('stroke-width', '1');
            ray.setAttribute('stroke-dasharray', '4,4');
            svg.appendChild(ray);
        }

        // Объект
        const obj = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        obj.setAttribute('x', 100); obj.setAttribute('y', 40);
        obj.setAttribute('width', 20); obj.setAttribute('height', 50);
        obj.setAttribute('fill', 'var(--primary)'); obj.setAttribute('rx', 2);
        svg.appendChild(obj);

        // Тень
        const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        shadow.setAttribute('points', '120,90 200,90 120,60');
        shadow.setAttribute('fill', 'rgba(0,0,0,0.3)');
        svg.appendChild(shadow);

        // Пол
        const floor = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        floor.setAttribute('x1', 0); floor.setAttribute('y1', 90);
        floor.setAttribute('x2', svgW); floor.setAttribute('y2', 90);
        floor.setAttribute('stroke', 'var(--text-dim)'); floor.setAttribute('stroke-width', '1');
        svg.appendChild(floor);

        container.appendChild(svg);
    },

    renderLightFacts(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Факты о свете:</strong><br><br>
💡 Свет распространяется прямолинейно<br>
🌑 Тень = свет + непрозрачный предмет + экран<br>
🔄 Угол падения = Угол отражения<br>
☀️ Низкое солнце → длинная тень<br>
👁️ Мы видим, потому что свет отражается`;
        container.appendChild(info);
    },

    renderLightFormula(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Вопрос:</strong><br><br>${q.text}<br><br>
Подумай: как свет ведёт себя в реальной жизни?`;
        container.appendChild(info);
    },

    renderDensityVisual(container, q) {
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.padding = '20px';

        const glass = document.createElement('div');
        glass.style.cssText = 'width:100px; height:120px; border:3px solid var(--primary); border-top:none; border-radius:0 0 10px 10px; position:relative; background:linear-gradient(to top, rgba(83,110,223,0.3) 70%, transparent 70%);';

        if (q.subType === 'float' && q.itemName) {
            const item = document.createElement('div');
            const topPos = q.itemDensity > 1 ? '60%' : '30%';
            item.style.cssText = `position:absolute; left:50%; top:${topPos}; transform:translate(-50%,-50%); font-size:1.5rem; text-align:center;`;
            item.innerHTML = `<div>${q.itemDensity > 1 ? '⬇️' : '🔄'}</div><div style="font-size:0.7rem; color:var(--text-dim);">${q.itemName}</div>`;
            glass.appendChild(item);
        }

        const waterLabel = document.createElement('div');
        waterLabel.style.cssText = 'position:absolute; right:-50px; bottom:35px; font-size:0.7rem; color:var(--text-dim);';
        waterLabel.textContent = 'вода (ρ=1)';
        glass.appendChild(waterLabel);

        container.appendChild(glass);
    },

    renderDensityTable(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        info.innerHTML = `<strong>Плотности веществ (г/см³):</strong><br><br>
🪵 Дерево: 0.5 — плывёт<br>
🧊 Лёд: 0.9 — плывёт<br>
💧 <strong>Вода: 1.0 (граница!)</strong><br>
🧱 Кирпич: 1.8 — тонет<br>
🪨 Камень: 2.5 — тонет<br>
🔩 Железо: 7.8 — тонет`;
        container.appendChild(info);
    },

    renderDensityFormula(container, q) {
        container.style.display = 'block';
        container.style.padding = '10px';
        const info = document.createElement('div');
        info.className = 'fingers-explanation';
        if (q.subType === 'calc') {
            info.innerHTML = `<strong>Формула плотности:</strong><br><br>
ρ = m ÷ V (плотность = масса ÷ объём)<br><br>
ρ = ${q.mass} ÷ ${q.volume} = <strong style="color:var(--accent)">?</strong> г/см³<br><br>
Если ρ > 1 — тонет в воде.<br>Если ρ < 1 — плывёт!`;
        } else {
            info.innerHTML = `<strong>Тонет или плывёт?</strong><br><br>
${q.itemName}: плотность ${q.itemDensity} г/см³<br>
Вода: плотность 1.0 г/см³<br><br>
${q.itemDensity} ${q.itemDensity > 1 ? '> 1 → скорее всего тонет!' : '< 1 → скорее всего плывёт!'}`;
        }
        container.appendChild(info);
    },

    // ─── CHECK ANSWER ───
    check() {
        const q = this.state.currentQ;
        let input;
        
        // Для деления с остатком — два поля
        if (q.operation === 'divide-rem') {
            const quotient = parseInt(document.getElementById('quotient-input').value);
            const remainder = parseInt(document.getElementById('remainder-input').value);
            if (isNaN(quotient) || isNaN(remainder)) return;
            input = quotient; // главный ответ — частное
            const feedback = document.getElementById('feedback');
            this.state.total++;
            if (quotient === q.ans && remainder === q.ansRemainder) {
                this.state.correct++;
                this.state.streak++;
                this.state.divideTotal = (this.state.divideTotal || 0) + 1;
                if (this.state.streak > this.state.bestStreak) this.state.bestStreak = this.state.streak;
                this.state.wasWrong = false;
                feedback.innerText = `⚡ ${this.getMotivation('correct')}`;
                feedback.className = 'feedback ok';
                this.showEnergyBurst();
                this.triggerSpeedLines();
                if (this.state.lessonIdx >= 9) {
                    setTimeout(() => this.showModal('🎉', 'Глава пройдена!', `${this.getMotivation('correct')}\nТы решил 10 примеров подряд!`, 'Супер!'), 500);
                }
                setTimeout(() => { this.state.lessonIdx++; this.loadQuestion(); }, 1200);
            } else {
                this.state.streak = 0;
                this.state.wasWrong = true;
                feedback.innerText = `${this.getMotivation('wrong')}\n${this.getExplanation(q)}`;
                feedback.className = 'feedback err';
                setTimeout(() => this.loadQuestion(), 3500);
            }
            this.save();
            this.updateStats();
            this.checkAchievements();
            return;
        }

        // Для углов — кнопки выбора
        if (q.operation === 'angle-type') {
            if (!this.selectedAngle) return;
            input = this.selectedAngle;
            const isCorrect = input === q.ans;
            const feedback = document.getElementById('feedback');
            this.state.total++;
            if (isCorrect) {
                this.state.correct++;
                this.state.streak++;
                this.state.physicsTotal = (this.state.physicsTotal || 0) + 1;
                if (this.state.streak > this.state.bestStreak) this.state.bestStreak = this.state.streak;
                this.state.wasWrong = false;
                feedback.innerText = `⚡ ${this.getMotivation('correct')}`;
                feedback.className = 'feedback ok';
                this.showEnergyBurst();
                this.triggerSpeedLines();
                if (this.state.lessonIdx >= 9) setTimeout(() => this.showModal('🎉', 'Глава пройдена!', `${this.getMotivation('correct')}\nТы решил 10 примеров!`, 'Супер!'), 500);
                setTimeout(() => { this.state.lessonIdx++; this.loadQuestion(); }, 1200);
            } else {
                this.state.streak = 0;
                this.state.wasWrong = true;
                feedback.innerText = `${this.getMotivation('wrong')}\n${this.getExplanation(q)}`;
                feedback.className = 'feedback err';
                setTimeout(() => this.loadQuestion(), 3500);
            }
            this.save(); this.updateStats(); this.checkAchievements();
            return;
        }

        // Для физики-света и плотности (тонет/плывёт) — кнопки выбора
        if (q.operation === 'physics-light' || (q.operation === 'physics-density' && q.subType === 'float')) {
            if (this.selectedPhysicsAnswer === null || this.selectedPhysicsAnswer === undefined) return;
            input = this.selectedPhysicsAnswer;
            const isCorrect = input === q.ans;
            const feedback = document.getElementById('feedback');
            this.state.total++;
            if (isCorrect) {
                this.state.correct++;
                this.state.streak++;
                this.state.physicsTotal = (this.state.physicsTotal || 0) + 1;
                if (this.state.streak > this.state.bestStreak) this.state.bestStreak = this.state.streak;
                this.state.wasWrong = false;
                feedback.innerText = `⚡ ${this.getMotivation('correct')}`;
                feedback.className = 'feedback ok';
                this.showEnergyBurst();
                this.triggerSpeedLines();
                if (this.state.lessonIdx >= 9) setTimeout(() => this.showModal('🎉', 'Глава пройдена!', `${this.getMotivation('correct')}\nТы решил 10 примеров!`, 'Супер!'), 500);
                setTimeout(() => { this.state.lessonIdx++; this.loadQuestion(); }, 1200);
            } else {
                this.state.streak = 0;
                this.state.wasWrong = true;
                feedback.innerText = `${this.getMotivation('wrong')}\n${this.getExplanation(q)}`;
                feedback.className = 'feedback err';
                setTimeout(() => this.loadQuestion(), 3500);
            }
            this.save(); this.updateStats(); this.checkAchievements();
            return;
        }

        // Для сравнения дробей (1 или 2)
        if (q.operation === 'compare' && q.subOperation === 'fraction') {
            // Получаем значение из кнопок
            const selectedBtn = document.querySelector('#fraction-choice .fraction-choice-btn.selected');
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
            if (q.operation === '÷' || q.operation === 'divide-rem') this.state.divideTotal = (this.state.divideTotal || 0) + 1;
            if (q.operation === 'area' || q.operation === 'perimeter') this.state.geometryTotal = (this.state.geometryTotal || 0) + 1;
            if (q.operation && q.operation.startsWith('physics-') || q.operation === 'angle-type' || q.operation === 'length-units') this.state.physicsTotal = (this.state.physicsTotal || 0) + 1;
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
        } else if (operation === 'divide-rem') {
            return `Правильный ответ: частное ${q.ans}, остаток ${q.ansRemainder}.\nФормула: ${q.n1} = ${q.n2} × ${q.ans} + ${q.ansRemainder}\nПроверка: ${q.n2} × ${q.ans} = ${q.n2 * q.ans}, ${q.n2 * q.ans} + ${q.ansRemainder} = ${q.n1} ✓`;
        } else if (operation === '÷') {
            return `Правильный ответ: ${q.ans}.\nМетод: ${q.n2} × ? = ${q.n1} → ? = ${q.ans}\nПроверка: ${q.n2} × ${q.ans} = ${q.n1} ✓`;
        } else if (operation === 'area') {
            return `Правильный ответ: ${q.ans}.\nПлощадь S = ${q.n1} × ${q.n2} = ${q.ans} кв. единиц`;
        } else if (operation === 'perimeter') {
            return `Правильный ответ: ${q.ans}.\nПериметр P = (${q.n1} + ${q.n2}) × 2 = ${q.n1+q.n2} × 2 = ${q.ans}`;
        } else if (operation === 'angle-type') {
            const types = { acute: 'Острый (< 90°)', right: 'Прямой (= 90°)', obtuse: 'Тупой (> 90°)' };
            return `Правильный ответ: ${types[q.ans]}.\nУгол ${q.degrees}° ${q.degrees < 90 ? '< 90° → острый' : q.degrees === 90 ? '= 90° → прямой' : '> 90° → тупой'}`;
        } else if (operation === 'length-units') {
            return `Правильный ответ: ${q.ans} ${q.toUnit}.\n${q.n1} ${q.fromUnit} = ${q.ans} ${q.toUnit}`;
        } else if (operation === 'physics-velocity') {
            if (q.unknown === 'v') return `Правильный ответ: ${q.ans} км/ч.\nv = d ÷ t = ${q.d} ÷ ${q.t} = ${q.ans}`;
            if (q.unknown === 'd') return `Правильный ответ: ${q.ans} км.\nd = v × t = ${q.v} × ${q.t} = ${q.ans}`;
            return `Правильный ответ: ${q.ans} ч.\nt = d ÷ v = ${q.d} ÷ ${q.v} = ${q.ans}`;
        } else if (operation === 'physics-gravity') {
            if (q.moonWeight) return `Правильный ответ: ${q.ans} кг.\nНа Луне в 6 раз легче: ${q.mass} ÷ 6 = ${q.ans}`;
            return `Правильный ответ: ${q.ans} Н.\nW = m × g = ${q.mass} × 10 = ${q.ans}`;
        } else if (operation === 'physics-lever') {
            return `Правильный ответ: ${q.ans}.\nF₁ × l₁ = F₂ × l₂\n${q.f1} × ${q.l1} = ${q.f1 * q.l1}\n${q.unknown === 'f2' ? `F₂ = ${q.f1 * q.l1} ÷ ${q.l2} = ${q.ans}` : `l₂ = ${q.f1 * q.l1} ÷ ${q.f2} = ${q.ans}`}`;
        } else if (operation === 'physics-light') {
            return `Правильный ответ: ${q.options[q.ans]}.`;
        } else if (operation === 'physics-density') {
            if (q.subType === 'calc') return `Правильный ответ: ${q.ans} г/см³.\nρ = m ÷ V = ${q.mass} ÷ ${q.volume} = ${q.ans}`;
            return `Правильный ответ: ${q.ans === 1 ? 'Тонет' : 'Плывёт'}.\n${q.itemName}: плотность ${q.itemDensity} г/см³ ${q.itemDensity > 1 ? '> 1 → тонет' : '< 1 → плывёт'}`;
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
        document.querySelectorAll('#fraction-choice .fraction-choice-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
        });
    },

    selectAngleChoice(value) {
        this.selectedAngle = value;
        document.querySelectorAll('#angle-choice .fraction-choice-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.value === value);
        });
    },

    selectPhysicsChoice(value) {
        this.selectedPhysicsAnswer = value;
        document.querySelectorAll('#physics-choice .fraction-choice-btn').forEach(btn => {
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
            if (ach.type === 'physics_total' && (this.state.physicsTotal || 0) >= ach.req) earned = true;

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
