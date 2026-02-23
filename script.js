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
        achievements: []
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
            else sub.textContent = `${name} — легенда Математики Семпай!`;
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
            const isLocked = !this.state.unlockedWeeks.includes(week.id);
            const div = document.createElement('div');
            div.className = `week-card ${isLocked ? 'locked' : ''}`;
            div.innerHTML = `
                <div class="week-num">${week.id}</div>
                <div class="week-title">${week.title}</div>
                <div class="week-desc">${week.desc}</div>
                <div class="week-status" style="color:${isLocked ? '#475569' : 'var(--success)'}">
                    ${isLocked ? '🔒 Закрыто' : '⚡ Доступно'}
                </div>
            `;
            if (!isLocked) div.onclick = () => this.startLesson(week.id);
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
        let mult = week.multipliers[this.state.lessonIdx % week.multipliers.length];
        if (week.id === 4) mult = week.multipliers[Math.floor(Math.random() * week.multipliers.length)];

        const num2 = Math.floor(Math.random() * 9) + 1;
        this.state.currentQ = { n1: mult, n2: num2, ans: mult * num2 };

        document.getElementById('lesson-title').innerText = `Глава ${this.state.week}: Умножение на ${mult}`;
        document.getElementById('q-n1').innerText = mult;
        document.getElementById('q-n2').innerText = num2;
        document.getElementById('answer-input').value = '';
        document.getElementById('feedback').innerText = '';
        document.getElementById('feedback').className = 'feedback';
        document.getElementById('hint-display').style.display = 'none';

        const lessonData = this.getLessonData(week, mult);
        document.getElementById('strategy-text').innerText = lessonData.strategy;
        this.updateVisualDesc(mult);
        this.setVisual(this.state.currentVisual);
        this.updateProgress();
        document.getElementById('answer-input').focus();
    },

    getLessonData(week, mult) {
        if (week.id === 4 && CURRICULUM.strategyByMult[mult]) {
            const s = CURRICULUM.strategyByMult[mult];
            const n = this.state.currentQ.n2;
            return {
                strategy: `Приём «${s.name}»: ${s.formula(n)}`,
                hint: `Стратегия для умножения на ${mult}: ${s.name}`,
                fingerTip: ''
            };
        }
        return week.lessons.find(l => l.mult === mult) || week.lessons[0];
    },

    updateVisualDesc(mult) {
        const { n1, n2 } = this.state.currentQ;
        const desc = document.getElementById('visual-desc');
        desc.innerText = `${n1} × ${n2} = ?`;
    },

    // ─── VISUALS ───
    setVisual(type) {
        this.state.currentVisual = type;
        const container = document.getElementById('visual-container');
        container.innerHTML = '';
        container.removeAttribute('style');

        document.querySelectorAll('.visual-controls button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        const { n1, n2 } = this.state.currentQ;

        if (type === 'array') this.renderArray(container, n1, n2);
        else if (type === 'line') this.renderNumberLine(container, n1, n2);
        else if (type === 'fingers') this.renderFingers(container, n1, n2);
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

    // ─── CHECK ANSWER ───
    check() {
        const input = parseInt(document.getElementById('answer-input').value);
        if (isNaN(input)) return;

        const feedback = document.getElementById('feedback');
        this.state.total++;

        if (input === this.state.currentQ.ans) {
            this.state.correct++;
            this.state.streak++;
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

            // Unlock next week after 10 correct in this lesson
            if (this.state.lessonIdx >= 9 && this.state.week < 4) {
                const nextWeek = this.state.week + 1;
                if (!this.state.unlockedWeeks.includes(nextWeek)) {
                    this.state.unlockedWeeks.push(nextWeek);
                    // Show unlock message via modal
                    setTimeout(() => {
                        this.showModal(
                            '🎉',
                            'Новая глава!',
                            this.getMotivation('newWeekUnlocked'),
                            'Супер!'
                        );
                    }, 500);
                }
            }

            setTimeout(() => {
                this.state.lessonIdx++;
                this.loadQuestion();
            }, 1200);
        } else {
            this.state.streak = 0;
            this.state.wasWrong = true;
            const { n1, n2, ans } = this.state.currentQ;
            const s = CURRICULUM.strategyByMult[n1];

            let motivation = this.getMotivation('wrong');
            let explanation = `Правильный ответ: ${ans}`;
            if (s) explanation += `\n${s.name}: ${s.formula(n2)}`;

            feedback.innerText = `${motivation}\n${explanation}`;
            feedback.className = "feedback err";
            setTimeout(() => this.loadQuestion(), 3500);
        }

        this.save();
        this.updateStats();
        this.checkAchievements();
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
        const mult = this.state.currentQ.n1;
        const lessonData = this.getLessonData(week, mult);
        const hintBox = document.getElementById('hint-display');

        let hintText = lessonData.hint || '';
        if (this.state.currentVisual === 'fingers' && lessonData.fingerTip) {
            hintText = lessonData.fingerTip;
        }

        hintBox.innerText = hintText;
        hintBox.style.display = 'block';
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
        this.practiceSetup.mode = mode;
        const allMults = [2,3,4,5,6,7,8,9,10];
        this.practiceSetup.selectedMults = [...allMults];

        const titles = {
            flash: '🃏 Карточки', time: '⏱️ Марафон',
            boss: '👹 Босс', fluency: '🧠 Пойми'
        };
        const descs = {
            flash: 'Переворачивай карточки и оценивай себя: «Знаю» или «Ещё учу». Карточки, которые ты ещё учишь, появятся снова.',
            time: 'Решай примеры в своём темпе — без ограничений по времени. Завершай, когда захочешь.',
            boss: 'Победи босса! Нужно дать 10 правильных ответов подряд. Одна ошибка — и босс восстанавливает здоровье!',
            fluency: 'Разбери стратегию по шагам, пойми КАК она работает, а потом примени её на практике.'
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
        if (selectedMults.length === 0) {
            this.showModal('⚠️', 'Выбери множители',
                'Нужно выбрать хотя бы один множитель для тренировки!', 'Понятно!');
            return;
        }
        const mults = [...selectedMults].sort((a, b) => a - b);
        switch (mode) {
            case 'flash': this.flash.start(mults); break;
            case 'time': this.marathon.start(mults); break;
            case 'boss': this.boss.start(mults); break;
            case 'fluency': this.fluency.start(mults); break;
        }
    },

    endPractice() {
        if (document.getElementById('screen-marathon').classList.contains('active') && this.marathon.solved > 0) {
            const acc = Math.round((this.marathon.correct / this.marathon.solved) * 100);
            this.showModal('🏁', 'Марафон завершён!',
                `Решено: ${this.marathon.solved}\nПравильных: ${this.marathon.correct}\nТочность: ${acc}%\nЛучшая серия: ${this.marathon.best}`,
                'Супер!', () => this.nav('screen-practice'));
            return;
        }
        this.nav('screen-practice');
    },

    // ─── 🃏 КАРТОЧКИ (Flash Cards) ───
    // Научная основа: retrieval practice (Roediger & Karpicke, 2006),
    // метакогнитивный мониторинг (Dunlosky & Rawson, 2012)
    flash: {
        deck: [],
        currentCard: null,
        knownCount: 0,

        start(mults) {
            this.deck = [];
            mults.forEach(m => {
                for (let n = 2; n <= 9; n++) {
                    this.deck.push({ n1: m, n2: n, ans: m * n, known: false });
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
            this.currentCard = remaining[Math.floor(Math.random() * remaining.length)];
            const { n1, n2, ans } = this.currentCard;

            document.getElementById('flash-problem').textContent = `${n1} × ${n2} = ?`;
            document.getElementById('flash-answer').textContent = ans;

            const s = CURRICULUM.strategyByMult[n1];
            document.getElementById('flash-strategy').textContent =
                s ? `${s.name}: ${s.formula(n2)}` : `${n1} × ${n2} = ${ans}`;

            document.getElementById('flash-card').classList.remove('flipped');
            document.getElementById('flash-buttons').classList.remove('visible');

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
            this.showCard();
        },

        again() {
            this.showCard();
        },

        victory() {
            app.showModal('🎉', 'Все карточки пройдены!',
                `${app.state.playerName}, ты разобрал все ${this.deck.length} карточек! Отличная работа!`,
                'Супер!', () => app.nav('screen-practice'));
        }
    },

    // ─── ⏱️ МАРАФОН (Marathon) ───
    // Научная основа: distributed practice (Cepeda et al., 2006),
    // снижение тревожности без давления временем (Ashcraft & Moore, 2009)
    marathon: {
        solved: 0,
        correct: 0,
        streak: 0,
        best: 0,
        mults: [],
        currentQ: null,
        waiting: false,

        start(mults) {
            this.mults = mults;
            this.solved = 0;
            this.correct = 0;
            this.streak = 0;
            this.best = 0;
            this.waiting = false;
            app.nav('screen-marathon');
            this.loadQ();
        },

        loadQ() {
            this.waiting = false;
            const m = this.mults[Math.floor(Math.random() * this.mults.length)];
            const n = Math.floor(Math.random() * 9) + 1;
            this.currentQ = { n1: m, n2: n, ans: m * n };

            document.getElementById('marathon-n1').textContent = m;
            document.getElementById('marathon-n2').textContent = n;
            document.getElementById('marathon-input').value = '';
            document.getElementById('marathon-feedback').textContent = '';
            document.getElementById('marathon-feedback').className = 'feedback';
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

                this.waiting = true;
                setTimeout(() => this.loadQ(), 1000);
            } else {
                this.streak = 0;
                app.state.streak = 0;
                app.state.wasWrong = true;

                const { n1, n2, ans } = this.currentQ;
                const s = CURRICULUM.strategyByMult[n1];
                let txt = `${app.getMotivation('wrong')}\nПравильный ответ: ${ans}`;
                if (s) txt += `\n${s.name}: ${s.formula(n2)}`;
                fb.textContent = txt;
                fb.className = 'feedback err';

                this.waiting = true;
                setTimeout(() => this.loadQ(), 3000);
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
    // Научная основа: desirable difficulty (Bjork, 1994),
    // goal-setting theory (Locke & Latham, 2002),
    // gamification + narrative framing (Deterding et al., 2011)
    boss: {
        hp: 10,
        maxHp: 10,
        streak: 0,
        mults: [],
        currentQ: null,
        waiting: false,

        start(mults) {
            this.mults = mults;
            this.hp = this.maxHp;
            this.streak = 0;
            this.waiting = false;
            app.nav('screen-boss');

            document.getElementById('boss-emoji').textContent = '👹';
            document.getElementById('boss-taunt').textContent = 'Ха-ха! Попробуй победи меня!';
            this.updateHP();
            this.loadQ();
        },

        loadQ() {
            this.waiting = false;
            const m = this.mults[Math.floor(Math.random() * this.mults.length)];
            const n = Math.floor(Math.random() * 9) + 1;
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

                // Boss speed lines
                this.triggerBossSpeedLines();

                if (this.hp <= 0) {
                    fb.textContent = '';
                    this.victory();
                } else {
                    this.updateTaunt();
                    fb.textContent = `⚔️ Удар! Осталось ${this.hp} HP!`;
                    fb.className = 'feedback ok';
                    this.waiting = true;
                    setTimeout(() => this.loadQ(), 1000);
                }
            } else {
                this.streak = 0;
                app.state.streak = 0;
                this.hp = this.maxHp;
                this.updateHP();

                const { n1, n2, ans } = this.currentQ;
                const s = CURRICULUM.strategyByMult[n1];
                let txt = `Правильный ответ: ${ans}`;
                if (s) txt += `\n${s.name}: ${s.formula(n2)}`;
                fb.textContent = `👹 Босс восстановил здоровье!\n${txt}`;
                fb.className = 'feedback err';

                document.getElementById('boss-emoji').textContent = '👹';
                document.getElementById('boss-taunt').textContent = 'Ха-ха! Я снова в полной силе!';

                this.waiting = true;
                setTimeout(() => this.loadQ(), 3000);
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
            if (this.hp >= 8) {
                el.textContent = 'Неплохо... но я ещё силён!';
                emoji.textContent = '👹';
            } else if (this.hp >= 5) {
                el.textContent = 'Ой! Это было больно!';
                emoji.textContent = '😤';
            } else if (this.hp >= 3) {
                el.textContent = 'Стой! Мне нужна передышка!';
                emoji.textContent = '😰';
            } else {
                el.textContent = 'Нет! Я не хочу проигрывать!';
                emoji.textContent = '😱';
            }
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
                app.showModal('🏆', 'Босс повержен!',
                    `${app.state.playerName} победил босса!\n10 правильных ответов подряд — ты настоящий чемпион!`,
                    'Победа!', () => app.nav('screen-practice'));
            }, 600);
        }
    },

    // ─── 🧠 ПОЙМИ (Understand / Fluency) ───
    // Научная основа: conceptual understanding (Hiebert & Lefevre, 1986),
    // стратегический подход (Brendefur, 2015), модель Брунера (iconic → symbolic)
    fluency: {
        mults: [],
        multIdx: 0,
        currentQ: null,

        start(mults) {
            this.mults = mults;
            this.multIdx = 0;
            app.nav('screen-fluency');
            this.loadStrategy();
        },

        loadStrategy() {
            const mult = this.mults[this.multIdx % this.mults.length];
            const n = Math.floor(Math.random() * 8) + 2; // 2-9
            this.currentQ = { n1: mult, n2: n, ans: mult * n };

            const s = CURRICULUM.strategyByMult[mult];
            document.getElementById('fluency-name').textContent = s ? s.name : `Умножение на ${mult}`;
            document.getElementById('fluency-strategy').textContent = this.explain(mult, n);

            // Build step-by-step
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
            switch (mult) {
                case 2: return `Удвоение: сложи ${n} с самим собой. ${n} + ${n} = ?`;
                case 3: return `Сначала удвой (${n} × 2 = ${n*2}), потом прибавь ${n}. Итого: ${n*2} + ${n} = ?`;
                case 4: return `Двойное удвоение: ${n} × 2 = ${n*2}, потом ${n*2} × 2 = ?`;
                case 5: return `Считай пятёрками, как минуты на часах: 5, 10, 15... Найди ${n}-ю отметку.`;
                case 6: return `Умножь на 5, потом прибавь число: ${n} × 5 = ${n*5}, затем ${n*5} + ${n} = ?`;
                case 7: return `Разбей на 5 + 2: ${n} × 5 = ${n*5}, ${n} × 2 = ${n*2}. Сложи: ${n*5} + ${n*2} = ?`;
                case 8: return `Тройное удвоение: ${n}→${n*2}→${n*4}→?`;
                case 9: return `Умножь на 10 и вычти число: ${n} × 10 = ${n*10}, затем ${n*10} − ${n} = ?`;
                case 10: return `Просто допиши 0 к числу ${n}. Получается ${n}0.`;
                default: return '';
            }
        },

        getSteps(mult, n) {
            switch (mult) {
                case 2: return [
                    `Возьми число <strong>${n}</strong>`,
                    `Прибавь к самому себе: ${n} + ${n} = ...`
                ];
                case 3: return [
                    `Удвой: ${n} × 2 = <strong>${n*2}</strong>`,
                    `Прибавь ещё раз ${n}: ${n*2} + ${n} = ...`
                ];
                case 4: return [
                    `Первое удвоение: ${n} × 2 = <strong>${n*2}</strong>`,
                    `Второе удвоение: ${n*2} × 2 = ...`
                ];
                case 5: return [
                    `Представь циферблат часов`,
                    `Считай пятёрками: 5, 10, 15... до <strong>${n}-й</strong> отметки`
                ];
                case 6: return [
                    `Умножь на 5: ${n} × 5 = <strong>${n*5}</strong>`,
                    `Прибавь ${n}: ${n*5} + ${n} = ...`
                ];
                case 7: return [
                    `${n} × 5 = <strong>${n*5}</strong>`,
                    `${n} × 2 = <strong>${n*2}</strong>`,
                    `Сложи: ${n*5} + ${n*2} = ...`
                ];
                case 8: return [
                    `${n} × 2 = <strong>${n*2}</strong>`,
                    `${n*2} × 2 = <strong>${n*4}</strong>`,
                    `${n*4} × 2 = ...`
                ];
                case 9: return [
                    `${n} × 10 = <strong>${n*10}</strong>`,
                    `Вычти ${n}: ${n*10} − ${n} = ...`
                ];
                case 10: return [
                    `Возьми число <strong>${n}</strong>`,
                    `Допиши 0 справа: ${n}0`
                ];
                default: return [];
            }
        },

        check() {
            const val = parseInt(document.getElementById('fluency-input').value);
            if (isNaN(val)) return;

            const fb = document.getElementById('fluency-feedback');
            app.state.total++;

            if (val === this.currentQ.ans) {
                app.state.correct++;
                fb.textContent = `⚡ Правильно! Ты понимаешь стратегию!`;
                fb.className = 'feedback ok';
                app.showEnergyBurst();

                this.multIdx++;
                setTimeout(() => this.loadStrategy(), 1500);
            } else {
                fb.textContent = `Не совсем. Перечитай шаги и попробуй ещё раз!`;
                fb.className = 'feedback err';
                // Не переходим к следующей — ребёнок пробует снова
            }
            app.save();
            app.updateStats();
            app.checkAchievements();
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
