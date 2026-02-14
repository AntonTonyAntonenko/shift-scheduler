// ========================================
// מערכת שיבוץ משמרות v2.0 - פונקציות נוספות
// ========================================
// העתק את כל הקוד הזה והדבק בסוף תג ה-<script>
// (לפני </script> האחרון)
// ========================================

// ========================================
// Context Menu Management (תפריט הקשר)
// ========================================
let contextMenu = null;

function showEmployeeContextMenu(event, employeeId, shiftTime, dayOfWeek) {
    event.preventDefault();
    event.stopPropagation();
    
    // Remove existing menu
    if (contextMenu) {
        contextMenu.remove();
    }
    
    // Create menu
    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    
    const employee = employees.find(e => e.id === employeeId);
    
    contextMenu.innerHTML = `
        <div class="context-menu-item" style="background: #f5f5f5; font-weight: bold; cursor: default;">
            ${employee.name}
        </div>
        <div class="context-menu-item" onclick="swapEmployee(${employeeId}, '${shiftTime}', ${dayOfWeek})">
            🔄 החלף עם עובד אחר
        </div>
        <div class="context-menu-item" onclick="removeFromShift(${employeeId}, '${shiftTime}', ${dayOfWeek})">
            ❌ הסר ממשמרת
        </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Close menu on click outside
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 100);
}

function closeContextMenu() {
    if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
    }
    document.removeEventListener('click', closeContextMenu);
}

// ========================================
// Employee Swap (החלפת עובדים)
// ========================================
function swapEmployee(employeeId, shiftTime, dayOfWeek) {
    closeContextMenu();
    
    const currentEmp = employees.find(e => e.id === employeeId);
    const shiftMinutes = timeToMinutes(shiftTime);
    
    // Find eligible employees for this shift
    const eligible = employees.filter(emp => {
        if (emp.id === employeeId) return false;
        
        // Check manager restrictions
        if (emp.isManager) {
            const validShifts = [450, 540, 600]; // 07:30, 09:00, 10:00
            if (!validShifts.includes(shiftMinutes)) return false;
        }
        
        // Check WFH restrictions
        if (shiftMinutes === 720 || shiftMinutes === 900) { // 12:00, 15:00
            if (!emp.canWFH) return false;
        }
        
        // Check constraints
        const hasConstraint = constraints.some(c => 
            c.employeeId === emp.id && 
            c.day === dayOfWeek && 
            (c.blockDay || c.shiftStart === shiftTime)
        );
        
        if (hasConstraint) return false;
        
        return true;
    });
    
    if (eligible.length === 0) {
        alert('❌ אין עובדים זמינים להחלפה במשמרת זו\n\nכל העובדים האחרים חסומים או לא עומדים בדרישות המשמרת.');
        return;
    }
    
    // Show selection dialog
    const options = eligible.map(e => `${e.employeeNumber}. ${e.name}`).join('\n');
    const selection = prompt(`בחר עובד להחלפה עם ${currentEmp.name}:\n\n${options}\n\n👉 הזן מספר עובד:`);
    
    if (!selection) return;
    
    const selectedEmp = eligible.find(e => e.employeeNumber === parseInt(selection));
    
    if (!selectedEmp) {
        alert('❌ מספר עובד לא תקין. נסה שוב.');
        return;
    }
    
    // Perform swap in current schedule
    if (!currentSchedule) {
        alert('❌ אין שיבוץ פעיל');
        return;
    }
    
    let swapped = false;
    currentSchedule.days.forEach(day => {
        if (day.dayOfWeek === dayOfWeek) {
            const shift = day.shifts.find(s => s.start === shiftTime);
            if (shift) {
                const assignment = shift.employees.find(a => a.employee.id === employeeId);
                if (assignment) {
                    assignment.employee = selectedEmp;
                    swapped = true;
                }
            }
        }
    });
    
    if (swapped) {
        renderSchedule();
        alert(`✅ הצלחה!\n\n${currentEmp.name} הוחלף עם ${selectedEmp.name}`);
    } else {
        alert('❌ שגיאה בהחלפה. נסה שוב.');
    }
}

// ========================================
// Remove from Shift (הסרת עובד)
// ========================================
function removeFromShift(employeeId, shiftTime, dayOfWeek) {
    closeContextMenu();
    
    const emp = employees.find(e => e.id === employeeId);
    
    if (!confirm(`❓ האם להסיר את ${emp.name} מהמשמרת?\n\nפעולה זו תסיר את העובד מהשיבוץ.`)) {
        return;
    }
    
    if (!currentSchedule) {
        alert('❌ אין שיבוץ פעיל');
        return;
    }
    
    let removed = false;
    currentSchedule.days.forEach(day => {
        if (day.dayOfWeek === dayOfWeek) {
            const shift = day.shifts.find(s => s.start === shiftTime);
            if (shift) {
                const before = shift.employees.length;
                shift.employees = shift.employees.filter(a => a.employee.id !== employeeId);
                const after = shift.employees.length;
                if (before > after) removed = true;
            }
        }
    });
    
    if (removed) {
        renderSchedule();
        alert(`✅ ${emp.name} הוסר מהמשמרת בהצלחה`);
    } else {
        alert('❌ שגיאה בהסרה. העובד לא נמצא במשמרת.');
    }
}

// ========================================
// Weekend On-Call Management (ניהול כונן)
// ========================================
function editWeekendOnCall() {
    const onCallEmployees = employees.filter(e => e.weekendOnCall);
    
    if (onCallEmployees.length === 0) {
        alert('⚠️ אין עובדים מסומנים ככונן סופ"ש\n\n👉 הוסף עובדים ככוננים בטאב "עובדים"\n(סמן את התיבה "כונן סופ"ש" בהוספת/עריכת עובד)');
        return;
    }
    
    const options = onCallEmployees.map((e, i) => `${i + 1}. ${e.name} (#${e.employeeNumber})`).join('\n');
    const message = `📞 כוננים זמינים:\n\n${options}\n\n💡 לשנות את הכונן:\n• עבור לטאב "עובדים"\n• ערוך את העובד הרצוי\n• סמן/בטל "כונן סופ"ש"\n• שמור`;
    
    alert(message);
}

// ========================================
// Check Assignment (שיבוץ לבדיקות)
// ========================================
function assignToCheck(checkKey, dayOfWeek) {
    if (!currentSchedule) {
        alert('❌ אין שיבוץ פעיל\n\nצור שיבוץ תחילה בטאב "שיבוץ"');
        return;
    }
    
    // Find available employees with permission
    const availableEmployees = employees.filter(e => {
        const perms = e.checkPermissions || {};
        if (checkKey === 'morning') {
            return perms.morning;
        }
        return perms[checkKey];
    });
    
    if (availableEmployees.length === 0) {
        alert(`❌ אין עובדים עם הרשאה לבדיקה זו\n\n👉 הוסף הרשאות בטאב "עובדים"\n(בחלק "הרשאות בדיקות בוקר")`);
        return;
    }
    
    const options = availableEmployees.map(e => `${e.employeeNumber}. ${e.name}`).join('\n');
    const selection = prompt(`בחר עובד לבדיקה:\n\n${options}\n\n👉 הזן מספר עובד:`);
    
    if (!selection) return;
    
    const selectedEmp = availableEmployees.find(e => e.employeeNumber === parseInt(selection));
    
    if (!selectedEmp) {
        alert('❌ מספר עובד לא תקין. נסה שוב.');
        return;
    }
    
    alert(`✅ ${selectedEmp.name} שובץ לבדיקה!\n\n💡 הבדיקות מתעדכנות אוטומטית בשיבוץ הבא.\nכרגע הזכר מי אחראי על הבדיקה הזו.`);
}

function changeCheckAssignment(checkKey, dayOfWeek, currentEmpId) {
    if (!currentSchedule) return;
    
    const currentEmp = employees.find(e => e.id === currentEmpId);
    
    if (!currentEmp) return;
    
    const confirmed = confirm(`❓ החלף את ${currentEmp.name} בבדיקה זו?\n\nתוכל לבחור עובד אחר מהרשימה.`);
    
    if (confirmed) {
        assignToCheck(checkKey, dayOfWeek);
    }
}

// ========================================
// Share and Export (שיתוף וייצוא)
// ========================================
function shareWhatsApp() {
    if (!currentSchedule) {
        alert('❌ אין שיבוץ לשיתוף\n\nצור שיבוץ תחילה בטאב "שיבוץ"');
        return;
    }
    
    const startDate = currentSchedule.startDate.toLocaleDateString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    
    const text = `📅 שיבוץ משמרות\n\nתאריך: ${startDate}\n\n👉 לצפייה בשיבוץ המלא:`;
    const url = encodeURIComponent(window.location.href);
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}%0A${url}`, '_blank');
}

function downloadScheduleImage() {
    const instructions = `📸 שמירה כתמונה:\n\n` +
        `🪟 Windows:\n` +
        `1. לחץ Win + Shift + S\n` +
        `2. בחר את אזור השיבוץ\n` +
        `3. התמונה נשמרת ללוח\n` +
        `4. הדבק בוואטסאפ (Ctrl+V)\n\n` +
        `🍎 Mac:\n` +
        `1. לחץ Cmd + Shift + 4\n` +
        `2. בחר את אזור השיבוץ\n` +
        `3. התמונה נשמרת לשולחן העבודה\n` +
        `4. שתף בוואטסאפ\n\n` +
        `💡 ייצוא אוטומטי יתווסף בגרסה 2.1`;
    
    alert(instructions);
}

// ========================================
// Settings Management (ניהול הגדרות)
// ========================================
function saveSettings() {
    try {
        // Save manager icon
        const managerIcon = document.getElementById('manager-icon')?.value || '⭐';
        localStorage.setItem('manager_icon', managerIcon);
        
        // Save check names and icons
        const checks = ['qf', 'apps', 'screens', 'rooms'];
        checks.forEach(check => {
            const nameEl = document.getElementById(`check-${check}-name`);
            const iconEl = document.getElementById(`check-${check}-icon`);
            
            if (nameEl) localStorage.setItem(`check_${check}_name`, nameEl.value);
            if (iconEl) localStorage.setItem(`check_${check}_icon`, iconEl.value);
        });
        
        alert('✅ ההגדרות נשמרו בהצלחה!\n\nהשינויים ייכנסו לתוקף בשיבוץ הבא.');
        
        // Re-render if schedule exists
        if (currentSchedule) {
            renderSchedule();
        }
        
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('❌ שגיאה בשמירת ההגדרות. נסה שוב.');
        return false;
    }
}

function loadSettingsFromStorage() {
    try {
        // Load manager icon
        const managerIconEl = document.getElementById('manager-icon');
        if (managerIconEl) {
            managerIconEl.value = localStorage.getItem('manager_icon') || '⭐';
        }
        
        // Load check settings
        const checks = [
            { key: 'qf', defaultName: 'QF', defaultIcon: '🔴' },
            { key: 'apps', defaultName: 'בדיקת אפליקציות', defaultIcon: '📱' },
            { key: 'screens', defaultName: 'בדיקת מסכים', defaultIcon: '🖥️' },
            { key: 'rooms', defaultName: 'בדיקת חדרי ישיבות', defaultIcon: '🚪' }
        ];
        
        checks.forEach(check => {
            const nameEl = document.getElementById(`check-${check.key}-name`);
            const iconEl = document.getElementById(`check-${check.key}-icon`);
            
            if (nameEl) {
                nameEl.value = localStorage.getItem(`check_${check.key}_name`) || check.defaultName;
            }
            if (iconEl) {
                iconEl.value = localStorage.getItem(`check_${check.key}_icon`) || check.defaultIcon;
            }
        });
        
        console.log('Settings loaded successfully');
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function resetSettings() {
    if (!confirm('❓ האם לאפס את כל ההגדרות לברירת מחדל?\n\nכל השינויים שלך יאבדו.')) {
        return;
    }
    
    try {
        // Remove all settings from localStorage
        localStorage.removeItem('manager_icon');
        localStorage.removeItem('check_qf_name');
        localStorage.removeItem('check_qf_icon');
        localStorage.removeItem('check_apps_name');
        localStorage.removeItem('check_apps_icon');
        localStorage.removeItem('check_screens_name');
        localStorage.removeItem('check_screens_icon');
        localStorage.removeItem('check_rooms_name');
        localStorage.removeItem('check_rooms_icon');
        
        // Reload settings to defaults
        loadSettingsFromStorage();
        
        alert('✅ ההגדרות אופסו לברירת מחדל!\n\nהשינויים ייכנסו לתוקף בשיבוץ הבא.');
        
        // Re-render if schedule exists
        if (currentSchedule) {
            renderSchedule();
        }
    } catch (error) {
        console.error('Error resetting settings:', error);
        alert('❌ שגיאה באיפוס ההגדרות. נסה שוב.');
    }
}

// ========================================
// Employee Management Updates (עדכוני ניהול עובדים)
// ========================================

// Update addEmployee to include morning checks permission
const originalAddEmployee = addEmployee;
addEmployee = function() {
    const name = document.getElementById('employee-name').value.trim();
    const isManager = document.getElementById('employee-manager').checked;
    const canWFH = document.getElementById('employee-wfh').checked;
    const weekendOnCall = document.getElementById('employee-weekend-oncall').checked;
    
    // Check permissions
    const checkMorning = document.getElementById('employee-check-morning')?.checked || false;
    const checkQF = document.getElementById('employee-check-qf').checked;
    const checkApps = document.getElementById('employee-check-apps').checked;
    const checkScreens = document.getElementById('employee-check-screens').checked;
    const checkRooms = document.getElementById('employee-check-rooms').checked;
    
    const color = document.getElementById('employee-color').value;
    const showBorder = document.getElementById('employee-show-border').checked;

    if (!name) {
        alert('❌ נא להזין שם עובד');
        return;
    }

    const employee = {
        id: Date.now(),
        employeeNumber: employees.length + 1,
        name: name,
        isManager: isManager,
        canWFH: canWFH,
        weekendOnCall: weekendOnCall,
        checkPermissions: {
            morning: checkMorning,
            qf: checkQF,
            apps: checkApps,
            screens: checkScreens,
            rooms: checkRooms
        },
        color: color,
        showBorder: showBorder,
        fridayCount: 0,
        lastFridayWeek: null,
        wfhThisWeek: 0
    };

    employees.push(employee);
    
    // Sort: managers first
    employees.sort((a, b) => {
        if (a.isManager && !b.isManager) return -1;
        if (!a.isManager && b.isManager) return 1;
        return a.name.localeCompare(b.name, 'he');
    });

    saveData();
    updateEmployeeStats();
    renderEmployees();

    // Clear form
    document.getElementById('employee-name').value = '';
    document.getElementById('employee-manager').checked = false;
    document.getElementById('employee-wfh').checked = false;
    document.getElementById('employee-weekend-oncall').checked = false;
    if (document.getElementById('employee-check-morning')) {
        document.getElementById('employee-check-morning').checked = false;
    }
    document.getElementById('employee-check-qf').checked = false;
    document.getElementById('employee-check-apps').checked = false;
    document.getElementById('employee-check-screens').checked = false;
    document.getElementById('employee-check-rooms').checked = false;
    document.getElementById('employee-color').value = employeeColors[employees.length % employeeColors.length];
    document.getElementById('employee-show-border').checked = true;
    
    alert(`✅ העובד ${name} נוסף בהצלחה!`);
};

// ========================================
// Initialize Settings on Load
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // Load settings when page loads
    setTimeout(() => {
        loadSettingsFromStorage();
    }, 500);
});

// ========================================
// סיום הקובץ
// ========================================
console.log('✅ v2.0 Functions loaded successfully!');
