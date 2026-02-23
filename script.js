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

    // ─── PRACTICE ───
    startPractice(mode) {
        this.showModal(
            '🔧',
            'Скоро!',
            `Режим «${mode}» ещё в разработке, ${this.state.playerName}! Пока тренируйся на Карте Приключений.`,
            'Понятно!'
        );
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
        if (document.getElementById('screen-lesson').classList.contains('active')) {
            app.check();
        } else if (document.getElementById('screen-welcome').classList.contains('active')) {
            app.submitName();
        }
    }
});
