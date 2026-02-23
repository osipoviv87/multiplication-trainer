const app = {
    state: {
        total: 0,
        correct: 0,
        streak: 0,
        week: 1,
        lessonIdx: 0,
        currentQ: null,
        unlockedWeeks: [1],
        achievements: []
    },

    init() {
        this.load();
        this.renderMap();
        this.renderAchievements();
        this.updateStats();
    },

    nav(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        if (screenId === 'screen-map') this.renderMap();
        if (screenId === 'screen-achievements') this.renderAchievements();
    },

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
                <div style="margin-top:10px; color:${isLocked ? '#ccc' : 'var(--success)'}">
                    ${isLocked ? '🔒 Закрыто' : '✅ Доступно'}
                </div>
            `;
            if (!isLocked) div.onclick = () => this.startLesson(week.id);
            container.appendChild(div);
        });
    },

    startLesson(weekId) {
        this.state.week = weekId;
        this.state.lessonIdx = 0;
        this.nav('screen-lesson');
        this.loadQuestion();
    },

    loadQuestion() {
        const week = CURRICULUM.weeks.find(w => w.id === this.state.week);
        let mult = week.multipliers[this.state.lessonIdx % week.multipliers.length];
        if (week.id === 4) mult = Math.floor(Math.random() * 9) + 2;

        const num2 = Math.floor(Math.random() * 9) + 1;
        this.state.currentQ = { n1: mult, n2: num2, ans: mult * num2 };

        document.getElementById('lesson-title').innerText = `Неделя ${this.state.week}: ×${mult}`;
        document.getElementById('q-n1').innerText = mult;
        document.getElementById('q-n2').innerText = num2;
        document.getElementById('answer-input').value = '';
        document.getElementById('feedback').innerText = '';
        document.getElementById('feedback').className = 'feedback';
        document.getElementById('hint-display').style.display = 'none';

        const lessonData = week.lessons.find(l => l.mult === mult) || week.lessons[0];
        document.getElementById('strategy-text').innerText = lessonData.strategy;
        document.getElementById('visual-desc').innerText = lessonData.hint;

        this.setVisual('array');
        this.updateProgress();
        document.getElementById('answer-input').focus();
    },

    setVisual(type) {
        const container = document.getElementById('visual-container');
        container.innerHTML = '';
        const { n1, n2 } = this.state.currentQ;

        if (type === 'array') {
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.justifyContent = 'center';
            container.style.maxWidth = (n2 * 20) + 'px';
            for (let i = 0; i < n1 * n2; i++) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                container.appendChild(dot);
            }
        } else if (type === 'line') {
            container.style.display = 'block';
            container.style.maxWidth = '';
            const steps = [];
            for (let i = 0; i <= n1; i++) steps.push(n2 * i);
            container.innerHTML = `
                <div style="font-size:1.2rem; margin-bottom:8px">${steps.join(' → ')}</div>
                <div style="color:#888">${n1} шагов по ${n2}</div>
            `;
        } else if (type === 'fingers') {
            container.style.display = 'block';
            container.style.maxWidth = '';
            if (n1 === 9 || n2 === 9) {
                const finger = n1 === 9 ? n2 : n1;
                container.innerHTML = `
                    <div style="font-size:3rem">👐</div>
                    <div>Загни палец №${finger}</div>
                    <div style="margin-top:5px; color:#888">Слева: ${finger - 1} десятков, справа: ${10 - finger} единиц</div>
                `;
            } else {
                container.innerHTML = `<div style="color:#888">Метод пальцев лучше всего работает для ×9</div>`;
            }
        }
    },

    check() {
        const input = parseInt(document.getElementById('answer-input').value);
        if (isNaN(input)) return;

        const feedback = document.getElementById('feedback');
        this.state.total++;

        if (input === this.state.currentQ.ans) {
            this.state.correct++;
            this.state.streak++;
            feedback.innerText = "✨ Верно!";
            feedback.className = "feedback ok";

            if (this.state.lessonIdx >= 9 && this.state.week < 4) {
                const nextWeek = this.state.week + 1;
                if (!this.state.unlockedWeeks.includes(nextWeek)) {
                    this.state.unlockedWeeks.push(nextWeek);
                }
            }

            setTimeout(() => {
                this.state.lessonIdx++;
                this.loadQuestion();
            }, 1000);
        } else {
            this.state.streak = 0;
            feedback.innerText = `❌ Правильный ответ: ${this.state.currentQ.ans}`;
            feedback.className = "feedback err";
            setTimeout(() => this.loadQuestion(), 2000);
        }

        this.save();
        this.updateStats();
        this.checkAchievements();
    },

    showHint() {
        const week = CURRICULUM.weeks.find(w => w.id === this.state.week);
        const lessonData = week.lessons.find(l => l.mult === this.state.currentQ.n1) || week.lessons[0];
        const hintBox = document.getElementById('hint-display');
        hintBox.innerText = "💡 " + lessonData.hint;
        hintBox.style.display = 'block';
    },

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
        document.getElementById('stat-week').innerText = this.state.week;
    },

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

            if (earned) {
                this.state.achievements.push(ach.id);
                this.showAchievementPopup(ach);
                this.save();
            }
        });
    },

    showAchievementPopup(ach) {
        const popup = document.createElement('div');
        popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:white;padding:15px 25px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);z-index:1000;text-align:center;animation:fade 0.4s';
        popup.innerHTML = `<div style="font-size:2rem">${ach.icon}</div><strong>🏆 ${ach.name}!</strong><br><small>${ach.desc}</small>`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 3000);
    },

    startPractice(mode) {
        alert("Режим «" + mode + "» скоро откроется! Пока тренируйся на карте.");
    },

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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('screen-lesson').classList.contains('active')) {
        app.check();
    }
});
