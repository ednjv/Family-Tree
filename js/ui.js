// =========================================================
// ui.js — UI layer
// Loader, debug console, form management (load/edit person),
// select population, and card event delegation.
// Depends on: db.js, tree.js
// =========================================================

/* --- Loader ------------------------------------------- */

function showLoader(txt = 'Procesando...') {
    document.getElementById('loader-text').innerText = txt;
    document.getElementById('loader-overlay').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-overlay').style.display = 'none';
}

/* --- Debug console ------------------------------------ */

function logDebug(msg, type = 'info') {
    const panel = document.getElementById('debug-panel');
    const css   = type === 'error' ? 'debug-error' : type === 'warn' ? 'debug-warn' : 'debug-info';
    panel.innerHTML += `<p style="margin:2px 0"><span class="grey-text">[${new Date().toLocaleTimeString()}]</span> <span class="${css}">${msg}</span></p>`;
    panel.scrollTop = panel.scrollHeight;
}

/* --- Form management ---------------------------------- */

// Populates the edit form with an existing person's data.
function loadToForm(id) {
    const p = getPerson(id);
    if (!p) return;

    document.getElementById('form-title').innerText   = 'Editar Persona';
    document.getElementById('member-id').value        = p.id;
    document.getElementById('first-names').value      = p.nombres;
    document.getElementById('last-names').value       = p.apellidos;
    document.getElementById('birth-date').value       = p.fechaNacimiento || '';
    document.getElementById('death-date').value       = p.fechaDefuncion  || '';

    const isAliveSwitch  = document.getElementById('is-alive');
    const deathContainer = document.getElementById('death-date-container');
    isAliveSwitch.checked          = (p.vivo !== false);
    deathContainer.style.display   = isAliveSwitch.checked ? 'none' : 'block';

    document.getElementById('btn-cancel-edit').style.display = 'inline-block';
    M.updateTextFields();
    M.toast({ html: 'Cargado para editar' });
}

/* --- Global UI refresh -------------------------------- */

// Rebuilds the relationship selects and triggers tree re-render
// after any data mutation (add / edit / import / delete).
function updateUI() {
    const selC  = document.getElementById('select-child');
    const selP1 = document.getElementById('select-parent1');
    const selP2 = document.getElementById('select-parent2');

    selC.innerHTML  = '<option value="" disabled selected>Elige al Hijo/a</option>';
    selP1.innerHTML = '<option value="" selected>Desconocido / Ninguno</option>';
    selP2.innerHTML = '<option value="" selected>Desconocido / Ninguno</option>';

    if (db.individuals.length === 0) {
        M.FormSelect.init(document.querySelectorAll('select'));
        return;
    }

    db.individuals.forEach(m => {
        const opt = `<option value="${m.id}">${m.nombres} ${m.apellidos}</option>`;
        selC.innerHTML  += opt;
        selP1.innerHTML += opt;
        selP2.innerHTML += opt;
    });

    M.FormSelect.init(document.querySelectorAll('select'));
    attachCardEvents();

    // Auto-focus: prefer the known "home person" (Edwin, FTT id 908571), else first in list.
    if (db.individuals.length > 0 && !currentFocusId) {
        const homePerson = getPerson('908571') || db.individuals[0];
        renderTree(homePerson.id);
    } else if (currentFocusId) {
        renderTree(currentFocusId);
    }
}

/* --- Card event delegation ---------------------------- */

// Called after updateUI(); wires delete/edit buttons in any
// non-tree card contexts (currently only the debug panel area
// would need this — kept as an extension point).
function attachCardEvents() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            if (confirm('¿Seguro que deseas eliminar a esta persona?')) {
                db.individuals = db.individuals.filter(i => i.id !== id);
                db.families.forEach(f => { f.childrenIds = f.childrenIds.filter(cid => cid !== id); });
                if (currentFocusId === id) currentFocusId = null;
                saveDB();
                updateUI();
            }
        });
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function () { loadToForm(this.getAttribute('data-id')); });
    });
}
