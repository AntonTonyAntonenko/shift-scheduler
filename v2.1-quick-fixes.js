// ========================================
// מערכת שיבוץ משמרות v2.1 - תיקונים מהירים
// ========================================
// העתק את כל הקוד הזה והדבק בסוף תג ה-<script>
// (לפני </script> האחרון)
// ========================================

// ========================================
// 1. NOTIFICATION SYSTEM (מערכת התראות)
// ========================================
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(el => el.remove());
    
    // Create notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-' + type;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideDown 0.3s ease-out;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations
if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateX(-50%) translateY(0); opacity: 1; }
            to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ========================================
// 2. ENHANCED SAVE WITH NOTIFICATIONS
// ========================================
const originalSaveData = saveData;
saveData = async function() {
    try {
        await originalSaveData();
        showNotification('✅ הנתונים נשמרו בהצלחה!', 'success');
        return true;
    } catch (error) {
        console.error('Save error:', error);
        showNotification('❌ שגיאה בשמירה: ' + error.message, 'error');
        return false;
    }
};

// ========================================
// 3. POSITIVE CONSTRAINTS (אילוצים חיוביים)
// ========================================
// Update addConstraint to support positive constraints
const originalAddConstraint = addConstraint;
addConstraint = function() {
    const employeeId = parseInt(document.getElementById('constraint-employee').value);
    const day = parseInt(document.getElementById('constraint-day').value);
    const shiftIndex = parseInt(document.getElementById('constraint-shift').value);
    const isPermanent = document.getElementById('constraint-permanent').checked;
    const blockDay = document.getElementById('constraint-block-day')?.checked || false;
    const wfhRequired = document.getElementById('constraint-wfh-required')?.checked || false;
    const mustWork = document.getElementById('constraint-must-work')?.checked || false; // NEW

    if (!employeeId || isNaN(day)) {
        showNotification('❌ נא למלא את כל השדות', 'error');
        return;
    }

    const employee = employees.find(e => e.id === employeeId);
    
    let constraint = {
        id: Date.now(),
        employeeId: employeeId,
        employeeName: employee.name,
        day: day,
        isPermanent: isPermanent,
        blockDay: blockDay,
        wfhRequired: wfhRequired,
        mustWork: mustWork // NEW
    };

    // Add shift info if not blocking entire day
    if (!blockDay && !isNaN(shiftIndex)) {
        const shift = shifts[shiftIndex];
        constraint.shiftStart = shift.start;
        constraint.shiftEnd = shift.end;
    }

    constraints.push(constraint);
    
    // Sort: permanent first
    constraints.sort((a, b) => {
        if (a.isPermanent && !b.isPermanent) return -1;
        if (!a.isPermanent && b.isPermanent) return 1;
        return 0;
    });

    saveData();
    renderConstraints();

    // Reset checkboxes
    document.getElementById('constraint-permanent').checked = false;
    if (document.getElementById('constraint-block-day')) {
        document.getElementById('constraint-block-day').checked = false;
    }
    if (document.getElementById('constraint-wfh-required')) {
        document.getElementById('constraint-wfh-required').checked = false;
    }
    if (document.getElementById('constraint-must-work')) {
        document.getElementById('constraint-must-work').checked = false;
    }
    
    showNotification(`✅ אילוץ נוסף ל-${employee.name}`, 'success');
};

// Update renderConstraints to show positive constraints
const originalRenderConstraints = renderConstraints;
renderConstraints = function() {
    const container = document.getElementById('constraints-list');
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    
    if (constraints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚫</div>
                <p>אין אילוצים מוגדרים</p>
            </div>
        `;
        return;
    }

    container.innerHTML = constraints.map(c => {
        let constraintText = '';
        let badgeColor = '';
        
        if (c.mustWork) {
            constraintText = `✅ חובה לעבוד ביום ${days[c.day]}`;
            if (c.shiftStart) {
                constraintText += ` | ${formatTime(c.shiftStart)} - ${formatTime(c.shiftEnd)}`;
            }
            badgeColor = 'background: #4CAF50; color: white;';
        } else if (c.blockDay) {
            constraintText = `🚫 חסום ביום ${days[c.day]}`;
            badgeColor = 'background: #f44336; color: white;';
        } else if (c.wfhRequired && c.shiftStart) {
            constraintText = `🏡 עבודה מהבית ביום ${days[c.day]} | ${formatTime(c.shiftStart)} - ${formatTime(c.shiftEnd)}`;
            badgeColor = 'background: #2196F3; color: white;';
        } else if (c.shiftStart) {
            constraintText = `יום ${days[c.day]} | ${formatTime(c.shiftStart)} - ${formatTime(c.shiftEnd)}`;
        } else {
            constraintText = `יום ${days[c.day]}`;
        }
        
        return `
        <div class="constraint-item">
            <div>
                <strong style="font-size: 1.1em;">${c.employeeName}</strong>
                <div style="color: #666; margin-top: 5px;">
                    <span style="padding: 4px 8px; border-radius: 4px; ${badgeColor}">${constraintText}</span>
                    ${c.isPermanent ? ' <span class="badge badge-fixed">✓ קבוע</span>' : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-icon" onclick="editConstraint(${c.id})">✏️ ערוך</button>
                <button class="btn-icon btn-delete" onclick="deleteConstraint(${c.id})">🗑️ מחק</button>
            </div>
        </div>
    `}).join('');
};

// ========================================
// 4. WEEKEND ON-CALL IN REGULAR SCHEDULE
// ========================================
// This will be integrated into renderSchedule
// We'll add the on-call employee directly in the shift table with cyan background

// ========================================
// 5. DRAG TO EMPTY SHIFT
// ========================================
function allowDropOnEmpty(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.target.style.background = '#e3f2fd';
}

function dropOnEmpty(event, shiftTime, dayOfWeek) {
    event.preventDefault();
    event.target.style.background = '';
    
    if (!draggedEmployee || !currentSchedule) {
        showNotification('❌ שגיאה בגרירה', 'error');
        return;
    }
    
    const emp = employees.find(e => e.id === draggedEmployee);
    const shiftMinutes = timeToMinutes(shiftTime);
    
    // Validate constraints
    const hasConstraint = constraints.some(c => 
        c.employeeId === draggedEmployee && 
        c.day === dayOfWeek && 
        (c.blockDay || c.shiftStart === shiftTime)
    );
    
    if (hasConstraint) {
        showNotification(`❌ ל-${emp.name} יש אילוץ על משמרת זו`, 'error');
        return;
    }
    
    // Check manager restrictions
    if (emp.isManager) {
        const validShifts = [450, 540, 600]; // 07:30, 09:00, 10:00
        if (!validShifts.includes(shiftMinutes)) {
            showNotification(`❌ אחמ"ש יכול לעבוד רק ב-07:30, 09:00, 10:00`, 'error');
            return;
        }
    }
    
    // Check WFH restrictions
    if (shiftMinutes === 720 || shiftMinutes === 900) {
        if (!emp.canWFH) {
            showNotification(`❌ ${emp.name} לא מורשה לעבודה מהבית`, 'error');
            return;
        }
    }
    
    // Add to shift
    currentSchedule.days.forEach(day => {
        if (day.dayOfWeek === dayOfWeek) {
            const shift = day.shifts.find(s => s.start === shiftTime);
            if (shift) {
                const isWFH = shiftMinutes === 720 || shiftMinutes === 900;
                shift.employees.push({
                    employee: emp,
                    isWFH: isWFH,
                    isWeekendOnCall: false
                });
            }
        }
    });
    
    renderSchedule();
    showNotification(`✅ ${emp.name} נוסף למשמרת`, 'success');
}

// ========================================
// 6. PRIORITY LOGIC FOR SHIFT FILLING
// ========================================
// Night → Evening → Afternoon → Morning
function getShiftPriority(shiftStart) {
    const minutes = timeToMinutes(shiftStart);
    
    // Night (22:00-06:00) - Priority 1 (highest)
    if (minutes >= 1320 || minutes < 360) return 1;
    
    // Evening (15:00-22:00) - Priority 2
    if (minutes >= 900 && minutes < 1320) return 2;
    
    // Afternoon (12:00-15:00) - Priority 3
    if (minutes >= 720 && minutes < 900) return 3;
    
    // Morning (06:00-12:00) - Priority 4 (lowest)
    return 4;
}

// Update getApplicableShifts to sort by priority
const originalGetApplicableShifts = getApplicableShifts;
getApplicableShifts = function(dayOfWeek) {
    const applicableShifts = originalGetApplicableShifts(dayOfWeek);
    
    // Sort by priority: night → evening → afternoon → morning
    return applicableShifts.sort((a, b) => {
        const priorityA = getShiftPriority(a.start);
        const priorityB = getShiftPriority(b.start);
        return priorityA - priorityB;
    });
};

// ========================================
// 7. IMPROVED EMPLOYEE NUMBER DISPLAY
// ========================================
// This CSS should be added to the <style> section:
const numberBoxStyle = `
    .employee-number-box {
        background: white;
        color: #333;
        padding: 4px 10px;
        border-radius: 5px;
        font-weight: bold;
        font-size: 1em;
        border: 2px solid #ddd;
        margin-left: 8px;
        display: inline-block;
        min-width: 35px;
        text-align: center;
    }
`;

if (!document.getElementById('number-box-style')) {
    const style = document.createElement('style');
    style.id = 'number-box-style';
    style.textContent = numberBoxStyle;
    document.head.appendChild(style);
}

// ========================================
// 8. ENHANCED SCHEDULE HEADER WITH SHARE BUTTONS
// ========================================
// This will be used in renderSchedule
function createScheduleHeader(week, weekIndex) {
    const startDate = week[0].date.toLocaleDateString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
    });
    const endDate = week[6].date.toLocaleDateString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: '2-digit' 
    });
    
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 10px;">
            <div style="font-size: 1.3em; font-weight: bold; color: #667eea;">
                משמרת: ${startDate} - ${endDate}
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="shareWhatsApp()" style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); padding: 10px 20px; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    💬 שתף בוואטסאפ
                </button>
                <button onclick="downloadScheduleImage()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 10px 20px; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    📸 שמור כתמונה
                </button>
            </div>
        </div>
    `;
}

// ========================================
// 9. FIX SATURDAY - NO ADD BUTTON
// ========================================
// This is already included in the check rendering logic
// Just make sure day.dayOfWeek === 6 doesn't show button

// ========================================
// 10. WEEKEND ON-CALL IN MAIN TABLE
// ========================================
function addWeekendOnCallToSchedule(html, day, isWeekend) {
    if (!isWeekend) return '';
    
    const onCallEmp = employees.find(e => e.weekendOnCall);
    if (!onCallEmp) return '';
    
    const empNum = onCallEmp.employeeNumber || employees.findIndex(e => e.id === onCallEmp.id) + 1;
    
    return `
        <div class="cell-employee" style="background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%); color: white; padding: 12px; border-radius: 5px; font-weight: bold; text-align: center; border: 3px solid #006064; box-shadow: 0 3px 10px rgba(0, 188, 212, 0.4); cursor: pointer; margin-bottom: 5px;" onclick="editWeekendOnCall()">
            <div class="employee-number-box" style="background: rgba(255,255,255,0.9); color: #00BCD4; display: inline-block;">#${empNum}</div>
            <span style="margin-right: 8px;">${onCallEmp.name}</span>
            <div style="font-size: 0.85em; margin-top: 5px; opacity: 0.95;">📞 כונן ${day.dayOfWeek === 5 ? 'שישי' : 'שבת'}</div>
        </div>
    `;
}

// ========================================
// 11. CONSOLE LOG FOR DEBUGGING
// ========================================
console.log('✅ v2.1 Quick Fixes loaded successfully!');
console.log('📋 Features added:');
console.log('  - Notification system');
console.log('  - Positive constraints');
console.log('  - Priority shift filling');
console.log('  - Drag to empty shift');
console.log('  - Enhanced save notifications');
console.log('  - Weekend on-call in main table');
console.log('  - Improved employee numbers');
console.log('  - Schedule header with share buttons');

// Show success notification
setTimeout(() => {
    showNotification('🎉 גרסה 2.1 נטענה בהצלחה!', 'success');
}, 1000);
