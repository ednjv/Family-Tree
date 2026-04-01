// =========================================================
// app.js — Application bootstrap
// Initialises Materialize components, wires all event
// listeners, and starts the app with updateUI().
// Depends on: db.js, tree.js, ui.js, ftt.js (load order
// enforced by <script> tags in index.html)
// =========================================================

document.addEventListener('DOMContentLoaded', function () {

    /* --- Materialize component init ------------------- */
    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {
        alignment: 'right',
        coverTrigger: false
    });

    /* --- Tree config bar ------------------------------ */
    document.getElementById('config-anc').value       = treeConfig.anc;
    document.getElementById('config-desc').value      = treeConfig.desc;
    document.getElementById('config-spouses').checked = treeConfig.spouses;

    document.getElementById('config-anc').addEventListener('change', saveTreeConfig);
    document.getElementById('config-desc').addEventListener('change', saveTreeConfig);
    document.getElementById('config-spouses').addEventListener('change', saveTreeConfig);

    /* --- Drag-to-pan on the tree canvas --------------- */
    const slider = document.getElementById('tree-canvas');
    let isDown = false, startX, scrollLeft;
    slider.addEventListener('mousedown',  e  => { isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup',    () => { isDown = false; });
    slider.addEventListener('mousemove',  e  => {
        if (!isDown) return;
        e.preventDefault();
        const walk = (e.pageX - slider.offsetLeft - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });

    /* --- Is-alive toggle (shows/hides death date) ----- */
    const isAliveSwitch  = document.getElementById('is-alive');
    const deathContainer = document.getElementById('death-date-container');
    isAliveSwitch.addEventListener('change', function () {
        deathContainer.style.display = this.checked ? 'none' : 'block';
        if (this.checked) document.getElementById('death-date').value = '';
    });

    /* --- Cancel edit ---------------------------------- */
    document.getElementById('btn-cancel-edit').addEventListener('click', function () {
        document.getElementById('family-form').reset();
        document.getElementById('form-title').innerText  = 'Registrar Persona';
        document.getElementById('member-id').value       = '';
        this.style.display       = 'none';
        isAliveSwitch.checked    = true;
        deathContainer.style.display = 'none';
    });

    /* --- Add / edit person form ----------------------- */
    document.getElementById('family-form').addEventListener('submit', function (e) {
        e.preventDefault();
        showLoader('Guardando...');
        setTimeout(() => {
            const id   = document.getElementById('member-id').value;
            const data = {
                nombres:         document.getElementById('first-names').value,
                apellidos:       document.getElementById('last-names').value,
                fechaNacimiento: document.getElementById('birth-date').value,
                vivo:            isAliveSwitch.checked,
                fechaDefuncion:  isAliveSwitch.checked ? null : document.getElementById('death-date').value
            };

            if (id) {
                const idx = db.individuals.findIndex(i => i.id === id);
                if (idx > -1) db.individuals[idx] = { ...db.individuals[idx], ...data };
            } else {
                const newId = 'P' + Date.now();
                db.individuals.push({ id: newId, familyOfOrigin: null, ...data });
                if (!currentFocusId) currentFocusId = newId;
            }

            saveDB();
            updateUI();
            document.getElementById('btn-cancel-edit').click();
            hideLoader();
        }, 300);
    });

    /* --- Link family form ----------------------------- */
    document.getElementById('relation-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const c  = document.getElementById('select-child').value;
        const p1 = document.getElementById('select-parent1').value;
        const p2 = document.getElementById('select-parent2').value;

        if (!p1 && !p2) return M.toast({ html: 'Selecciona un padre/madre', classes: 'red' });

        showLoader('Vinculando...');
        setTimeout(() => {
            let fam = db.families.find(f =>
                (f.parent1Id === p1 && f.parent2Id === p2) ||
                (f.parent1Id === p2 && f.parent2Id === p1)
            );
            if (!fam) {
                fam = { id: 'F' + Date.now(), parent1Id: p1 || null, parent2Id: p2 || null, childrenIds: [] };
                db.families.push(fam);
            }
            if (!fam.childrenIds.includes(c)) fam.childrenIds.push(c);
            const child = getPerson(c);
            if (child) child.familyOfOrigin = fam.id;

            saveDB();
            updateUI();
            hideLoader();
            M.toast({ html: 'Familia Vinculada' });
        }, 300);
    });

    /* --- Import --------------------------------------- */
    document.getElementById('btn-import-trigger').addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        showLoader();
        const reader = new FileReader();
        reader.onload = function (ev) {
            setTimeout(() => {
                if (file.name.endsWith('.json')) {
                    try { db = JSON.parse(ev.target.result); saveDB(); updateUI(); } catch (_) {}
                } else {
                    parseFTT(ev.target.result);
                }
                e.target.value = '';
                hideLoader();
            }, 500);
        };
        reader.readAsText(file);
    });

    /* --- Export --------------------------------------- */
    document.getElementById('btn-export').addEventListener('click', e => {
        e.preventDefault();
        const a    = document.createElement('a');
        a.href     = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
        a.download = 'family_tree.json';
        a.click();
    });

    /* --- Clear all data ------------------------------- */
    document.getElementById('btn-clear-db').addEventListener('click', e => {
        e.preventDefault();
        if (!confirm('¿Borrar todo?')) return;
        db             = { individuals: [], families: [] };
        currentFocusId = null;
        saveDB();
        updateUI();
        document.getElementById('tree-canvas').style.display      = 'none';
        document.getElementById('tree-placeholder').style.display  = 'block';
    });

    /* --- Initial render ------------------------------- */
    updateUI();
});
