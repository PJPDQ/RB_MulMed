const START_DATE = new Date(2026, 5, 7); 
const END_DATE = new Date(2027, 5, 6);  

let currentMonth = new Date(2026, 5, 1);
let currentView = 'calendar';
let selectedDate = null;
let tempAssignment = { morning: [], evening: [] };

let members = {
    morning: ['Acha', 'Dicky', 'Dimas', 'Nikita'],
    evening: ['Nathan C', 'Andrew W', 'Ezekiel', 'Nathan T', 'Debora', 'Nadine'],
    pending: ['Jane', 'Ko Tommy', 'Jess', 'Gabby', 'Richard']
};

let roster = {};

document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    generateSundays();
    if (Object.keys(roster).length === 0) {
        generateRoster();
    }
    // renderCalendar();
    renderStats();
    updateMemberDisplay();
});

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function parseDate(str) {
    return new Date(str + 'T00:00:00');
}

function getSundays() {
    const sundays = [];
    let d = new Date(START_DATE);
    while (d <= END_DATE) {
        sundays.push(formatDate(d));
        d.setDate(d.getDate() + 7);
    }
    return sundays;
}

function generateSundays() {
    const sundays = getSundays();
    sundays.forEach(date => {
        if (!roster[date]) {
            roster[date] = { morning: [], evening: [] };
        }
    });
}

function isSunday(date) {
    return date.getDay() === 0;
}

function getMonthData(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month - 1, prevMonthLastDay - i),
            isCurrentMonth: false
        });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true
        });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false
        });
    }
    
    return days;
}

function generateRoster() {
    const sundays = getSundays();
    const morningPool = [...members.morning];
    const eveningPool = [...members.evening];
    
    // Shuffle arrays (Fisher-Yates)
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    
    const shuffledMorning = shuffle(morningPool);
    const shuffledEvening = shuffle(eveningPool);
    
    sundays.forEach((date, index) => {
        const morningCount = Math.floor(Math.random() * 1) + 1;
        const eveningCount = Math.floor(Math.random() * 1) + 1;
        
        roster[date] = {
            morning: shuffledMorning.slice(
                (index * morningCount) % shuffledMorning.length,
                ((index * morningCount) % shuffledMorning.length + morningCount) % shuffledMorning.length || shuffledMorning.length
            ),
            evening: shuffledEvening.slice(
                (index * eveningCount) % shuffledEvening.length,
                ((index * eveningCount) % shuffledEvening.length + eveningCount) % shuffledEvening.length || shuffledEvening.length
            )
        };
        
        if (roster[date].morning.length === 0) {
            roster[date].morning = shuffledMorning.slice(0, morningCount);
        }
        if (roster[date].evening.length === 0) {
            roster[date].evening = shuffledEvening.slice(0, eveningCount);
        }
    });
    
    saveToStorage();
    renderCalendar();
    renderStats();
    renderListView();
    showToast('Roster generated successfully!');
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('currentMonthLabel');
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    monthLabel.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const days = getMonthData(year, month);
    grid.innerHTML = '';
    
    days.forEach(({ date, isCurrentMonth }) => {
        const dateStr = formatDate(date);
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        if (!isCurrentMonth) dayEl.classList.add('other-month');
        if (isSunday(date)) dayEl.classList.add('sunday');
        
        let html = `<div class="day-number">${date.getDate()}</div>`;
        
        if (roster[dateStr] && (roster[dateStr].morning.length > 0 || roster[dateStr].evening.length > 0)) {
            html += '<div class="roster-badges">';
            roster[dateStr].morning.forEach(m => {
                html += `<span class="roster-badge badge-morning">${m}</span>`;
            });
            roster[dateStr].evening.forEach(m => {
                html += `<span class="roster-badge badge-evening">${m}</span>`;
            });
            html += '</div>';
        }
        
        dayEl.innerHTML = html;
        
        if (isSunday(date) && isCurrentMonth) {
            dayEl.onclick = () => openAssignModal(dateStr);
        }
        
        grid.appendChild(dayEl);
    });
    
    renderListView();
}

function renderCalendarView() {
    const calendarView = document.getElementById('calendarView');
    calendarView.innerHTML = `
        <div class="calendar-header">
            <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div> 
        <div class="calendar-grid" id="calendarGrid"></div>
    `;
    return renderCalendar();
}

function renderListView() {
    const listView = document.getElementById('listView');
    const sundays = getSundays().filter(d => {
        const date = parseDate(d);
        return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
    });
    
    if (sundays.length === 0) {
        listView.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div>No Sunday sessions this month</div>
            </div>
        `;
        return;
    }
    
    listView.innerHTML = sundays.map(date => {
        const d = parseDate(date);
        const data = roster[date] || { morning: [], evening: [] };
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        
        return `
            <div class="list-item" onclick="openAssignModal('${date}')">
                <div class="list-item-header">
                    <span class="list-date">${dateStr}</span>
                    <span style="font-size: 0.8rem; color: var(--accent-light);">Click to edit</span>
                </div>
                <div class="list-services">
                    <div class="service-block morning">
                        <div class="service-title">🌅 Morning Service</div>
                        <div class="member-list">
                            ${data.morning.length > 0 
                                ? data.morning.map(m => `<span class="member-tag">${m}</span>`).join('')
                                : '<span style="color: var(--text-secondary); font-size: 0.8rem;">No assignments</span>'
                            }
                        </div>
                    </div>
                    <div class="service-block evening">
                        <div class="service-title">🌙 Evening Service</div>
                        <div class="member-list">
                            ${data.evening.length > 0 
                                ? data.evening.map(m => `<span class="member-tag">${m}</span>`).join('')
                                : '<span style="color: var(--text-secondary); font-size: 0.8rem;">No assignments</span>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStats() {
    const sundays = getSundays();
    document.getElementById('totalSessions').textContent = sundays.length;
    
    // Count frequencies
    const freq = { morning: {}, evening: {}, pending: {} };
    let morningTotal = 0, eveningTotal = 0;
    
    sundays.forEach(date => {
        const data = roster[date] || { morning: [], evening: [] };
        data.morning.forEach(m => {
            freq.morning[m] = (freq.morning[m] || 0) + 1;
            morningTotal++;
        });
        data.evening.forEach(m => {
            freq.evening[m] = (freq.evening[m] || 0) + 1;
            eveningTotal++;
        });
    });
    
    members.pending.forEach(m => {
        freq.pending[m] = 0;
    });
    
    document.getElementById('morningCount').textContent = morningTotal;
    document.getElementById('eveningCount').textContent = eveningTotal;
    document.getElementById('pendingCount').textContent = members.pending.length;
    
    renderFreqBars('morningFreq', freq.morning, 'morning');
    renderFreqBars('eveningFreq', freq.evening, 'evening');
    renderFreqBars('pendingFreq', freq.pending, 'pending');
    
    const allMembers = [...members.morning, ...members.evening];
    const totalAssignments = morningTotal + eveningTotal;
    const avgPerPerson = allMembers.length > 0 ? (totalAssignments / allMembers.length).toFixed(1) : 0;
    
    document.getElementById('quickStats').innerHTML = `
        <div class="freq-item">
            <div class="freq-header">
                <span class="freq-name">Total Members</span>
                <span class="freq-count">${allMembers.length}</span>
            </div>
        </div>
        <div class="freq-item">
            <div class="freq-header">
                <span class="freq-name">Avg per Person</span>
                <span class="freq-count">${avgPerPerson}</span>
            </div>
        </div>
        <div class="freq-item">
            <div class="freq-header">
                <span class="freq-name">Weeks Covered</span>
                <span class="freq-count">${sundays.length}</span>
            </div>
        </div>
    `;
}

function renderFreqBars(containerId, freqData, type) {
    const container = document.getElementById(containerId);
    const entries = Object.entries(freqData).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(e => e[1]), 1);
    
    if (entries.length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.8rem;">No data yet</div>';
        return;
    }
    
    container.innerHTML = entries.map(([name, count]) => `
        <div class="freq-item">
            <div class="freq-header">
                <span class="freq-name">${name}</span>
                <span class="freq-count">${count}</span>
            </div>
            <div class="freq-bar-bg">
                <div class="freq-bar-fill ${type}" style="width: ${(count / max * 100)}%"></div>
            </div>
        </div>
    `).join('');
}

function toggleView(view) {
    currentView = view;
    const calendarView = document.getElementById('calendarView');
    const listView = document.getElementById('listView');
    const sopView = document.getElementById('sopView');
    const monthNav = document.querySelector('.month-nav');
    const btnCalendar = document.getElementById('btn-calendar');
    const btnList = document.getElementById('btn-list');
    const btnSop = document.getElementById('btn-sop');
    console.log(`Toggling view to: ${view}`);
    console.log(view);
    if (view === 'manual') {
        sopView.style.display = 'block';
        calendarView.style.display = 'none';
        listView.classList.remove('active');
        monthNav.style.display = 'none';
        btnSop.classList.add('active');
        btnCalendar.classList.remove('active');
        btnList.classList.remove('active');
    }
    else if (view === 'calendar') {
        calendarView.style.display = 'block';
        sopView.style.display = 'none';
        monthNav.style.display = 'flex';
        listView.classList.remove('active');
        sopView.classList.remove('active');
        btnCalendar.classList.add('active');
        btnList.classList.remove('active');
        btnSop.classList.remove('active');
        renderCalendarView();
    } else {
        calendarView.style.display = 'none';
        monthNav.style.display = 'flex';
        sopView.style.display = 'none';
        listView.classList.add('active');
        btnCalendar.classList.remove('active');
        btnList.classList.add('active');
        btnSop.classList.remove('active');
        renderListView();
    }
    console.log(`Toggling view to: ${view}`);
    console.log(view);
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

function openMemberModal() {
    document.getElementById('memberModal').classList.add('active');
    updateMemberDisplay();
}

function closeMemberModal() {
    document.getElementById('memberModal').classList.remove('active');
}

function updateMemberDisplay() {
    const createChips = (list, type) => list.map(m => `
        <span class="member-chip ${type === 'pending' ? 'pending-chip' : ''}">
            ${m}
            <span class="remove-btn" onclick="removeMember('${type}', '${m}')">&times;</span>
        </span>
    `).join('');
    
    document.getElementById('morningMembers').innerHTML = createChips(members.morning, 'morning') || '<span style="color: var(--text-secondary); font-size: 0.8rem;">No members</span>';
    document.getElementById('eveningMembers').innerHTML = createChips(members.evening, 'evening') || '<span style="color: var(--text-secondary); font-size: 0.8rem;">No members</span>';
    document.getElementById('pendingMembers').innerHTML = createChips(members.pending, 'pending') || '<span style="color: var(--text-secondary); font-size: 0.8rem;">No pending members</span>';
}

function addMember() {
    const name = document.getElementById('newMemberName').value.trim();
    const group = document.getElementById('newMemberGroup').value;
    
    if (!name) {
        showToast('Please enter a member name');
        return;
    }
    
    if (members.morning.includes(name) || members.evening.includes(name) || members.pending.includes(name)) {
        showToast('Member already exists!');
        return;
    }
    
    members[group].push(name);
    document.getElementById('newMemberName').value = '';
    updateMemberDisplay();
    saveToStorage();
    showToast(`Added ${name} to ${group} group`);
}

function removeMember(type, name) {
    event.stopPropagation();
    members[type] = members[type].filter(m => m !== name);
    updateMemberDisplay();
    saveToStorage();
    showToast(`Removed ${name}`);
}

function openAssignModal(dateStr) {
    selectedDate = dateStr;
    const data = roster[dateStr] || { morning: [], evening: [] };
    tempAssignment = {
        morning: [...data.morning],
        evening: [...data.evening]
    };
    
    const date = parseDate(dateStr);
    document.getElementById('assignModalTitle').textContent = 
        `Assign Members - ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
    
    const body = document.getElementById('assignModalBody');
    body.innerHTML = `
        <div class="service-assign morning-assign">
            <div class="assign-title">🌅 Morning Service</div>
            <div class="assign-members" id="morningAssign">
                ${renderAssignChips('morning')}
            </div>
        </div>
        <div class="service-assign evening-assign">
            <div class="assign-title">🌙 Evening Service</div>
            <div class="assign-members" id="eveningAssign">
                ${renderAssignChips('evening')}
            </div>
        </div>
        <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px; font-size: 0.8rem; color: var(--text-secondary);">
            💡 Click on members to toggle their assignment. Pending members can be assigned to either service.
        </div>
    `;
    
    document.getElementById('assignModal').classList.add('active');
}

function renderAssignChips(service) {
    const assigned = tempAssignment[service];
    let html = '';
    
    if (service === 'morning') {
        members.morning.forEach(m => {
            const isSelected = assigned.includes(m);
            html += `<span class="assign-chip morning-chip ${isSelected ? 'selected' : ''}" onclick="toggleAssign('morning', '${m}')">${m}</span>`;
        });
    }
    
    if (service === 'evening') {
        members.evening.forEach(m => {
            const isSelected = assigned.includes(m);
            html += `<span class="assign-chip evening-chip ${isSelected ? 'selected' : ''}" onclick="toggleAssign('evening', '${m}')">${m}</span>`;
        });
    }
    
    members.pending.forEach(m => {
        const isSelected = assigned.includes(m);
        html += `<span class="assign-chip pending-chip-select ${isSelected ? 'selected' : ''}" onclick="toggleAssign('${service}', '${m}')">${m} ⏳</span>`;
    });
    
    return html;
}

function toggleAssign(service, member) {
    const idx = tempAssignment[service].indexOf(member);
    if (idx > -1) {
        tempAssignment[service].splice(idx, 1);
    } else {
        tempAssignment[service].push(member);
    }
    
    document.getElementById('morningAssign').innerHTML = renderAssignChips('morning');
    document.getElementById('eveningAssign').innerHTML = renderAssignChips('evening');
}

function saveAssignment() {
    roster[selectedDate] = {
        morning: [...tempAssignment.morning],
        evening: [...tempAssignment.evening]
    };
    saveToStorage();
    closeAssignModal();
    renderCalendar();
    renderStats();
    showToast('Assignment saved!');
}

function closeAssignModal() {
    document.getElementById('assignModal').classList.remove('active');
    selectedDate = null;
}

function exportRoster() {
    const sundays = getSundays();
    let csv = 'Date,Day,Morning Service,Evening Service\\n';
    
    sundays.forEach(date => {
        const d = parseDate(date);
        const data = roster[date] || { morning: [], evening: [] };
        csv += `${date},${d.toLocaleDateString('en-US', { weekday: 'long' })},"${data.morning.join('; ')}","${data.evening.join('; ')}"\\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pro presenter roster ${formatDate(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Roster exported to CSV!');
}

function saveToStorage() {
    try {
        localStorage.setItem('proPresenterRoster', JSON.stringify(roster));
        localStorage.setItem('proPresenterMembers', JSON.stringify(members));
    } catch (e) {
        console.warn('Storage not available');
    }
}

function loadFromStorage() {
    try {
        const savedRoster = localStorage.getItem('proPresenterRoster');
        const savedMembers = localStorage.getItem('proPresenterMembers');
        
        if (savedRoster) roster = JSON.parse(savedRoster);
        if (savedMembers) members = JSON.parse(savedMembers);
    } catch (e) {
        console.warn('Storage not available');
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }
});

if ('serviceWorker' in navigator) {
    const swCode = `
        self.addEventListener('install', e => {
            e.waitUntil(self.skipWaiting());
        });
        self.addEventListener('activate', e => {
            e.waitUntil(self.clients.claim());
        });
        self.addEventListener('fetch', e => {
            e.respondWith(fetch(e.request).catch(() => new Response('Offline')));
        });
    `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl).catch(() => {});
}

const TOTAL = 7;
let current = 0;
let done = new Array(TOTAL).fill(false);

function updateUI() {
  const pct = Math.round((done.filter(Boolean).length / TOTAL) * 100);
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-text').textContent = done.filter(Boolean).length + ' of ' + TOTAL + ' steps complete';
  document.getElementById('hdr-pct').textContent = pct + '% done';
  document.getElementById('hdr-label').textContent = 'Step ' + (current + 1) + ' of ' + TOTAL;

  document.querySelectorAll('[data-nav]').forEach(btn => {
    const i = parseInt(btn.dataset.nav);
    btn.className = 'nav-item' + (done[i] ? ' done' : '') + (i === current ? ' active' : '');
  });
}

function showStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('done-screen').classList.remove('active');
  const panel = document.querySelector('[data-step="' + n + '"]');
  if (panel) panel.classList.add('active');
  current = n;
  updateUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goTo(n) { showStep(n); }
function next() { if (current < TOTAL - 1) showStep(current + 1); }
function prev() { if (current > 0) showStep(current - 1); }
function markDone(n) { done[n] = true; updateUI(); }
function ck(el) { el.classList.toggle('ck'); }

function finish() {
  done[TOTAL - 1] = true;
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('done-screen').classList.add('active');
  document.getElementById('prog-fill').style.width = '100%';
  document.getElementById('prog-text').textContent = TOTAL + ' of ' + TOTAL + ' steps complete';
  document.getElementById('hdr-pct').textContent = '100% done';
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.className = 'nav-item done';
  });
}

function restart() {
  done = new Array(TOTAL).fill(false);
  showStep(0);
}

updateUI();