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

    // Spouse toggle: pill acts as selected icon button (MD3 pattern)
    const spousesBtn = document.getElementById('btn-toggle-spouses');
    const spousesCb  = document.getElementById('config-spouses');
    function syncSpousesBtn() {
        spousesBtn.classList.toggle('ctrl-active', spousesCb.checked);
    }
    syncSpousesBtn();
    spousesBtn.addEventListener('click', function () {
        spousesCb.checked = !spousesCb.checked;
        syncSpousesBtn();
        saveTreeConfig();
    });
    spousesCb.addEventListener('change', function () {
        syncSpousesBtn();
        saveTreeConfig();
    });

    /* --- Pan + Zoom on the tree canvas ---------------- */
    const treeCanvas = document.getElementById('tree-canvas');
    const treeInner  = document.getElementById('tree-inner');
    const MIN_ZOOM = 0.15, MAX_ZOOM = 3;
    let panX = 0, panY = 0, zoom = 1;
    let isPanning = false, panStartX, panStartY;

    function applyTransform() {
        treeInner.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }

    // Exposed globally so renderTree() in tree.js can reset on focus change
    window.resetPanZoom = function () {
        panX = 0; panY = 0; zoom = 1;
        applyTransform();
    };

    // Mouse drag
    treeCanvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        isPanning = true;
        panStartX = e.clientX - panX;
        panStartY = e.clientY - panY;
        treeCanvas.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
        if (!isPanning) return;
        isPanning = false;
        treeCanvas.style.cursor = 'grab';
    });
    window.addEventListener('mousemove', e => {
        if (!isPanning) return;
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        applyTransform();
    });

    // Wheel zoom (zooms toward cursor position)
    treeCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const rect     = treeCanvas.getBoundingClientRect();
        const mouseX   = e.clientX - rect.left;
        const mouseY   = e.clientY - rect.top;
        const factor   = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const newZoom  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
        // Adjust pan so the content point under the cursor stays fixed
        panX = mouseX - (mouseX - panX) * (newZoom / zoom);
        panY = mouseY - (mouseY - panY) * (newZoom / zoom);
        zoom = newZoom;
        applyTransform();
    }, { passive: false });

    // Touch: single-finger pan, two-finger pinch-zoom
    let lastTouchDist = null;
    treeCanvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            isPanning = true;
            panStartX = e.touches[0].clientX - panX;
            panStartY = e.touches[0].clientY - panY;
        } else if (e.touches.length === 2) {
            isPanning = false;
            lastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: true });
    treeCanvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && isPanning) {
            panX = e.touches[0].clientX - panStartX;
            panY = e.touches[0].clientY - panStartY;
            applyTransform();
        } else if (e.touches.length === 2 && lastTouchDist) {
            const dist    = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const rect    = treeCanvas.getBoundingClientRect();
            const midX    = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY    = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * dist / lastTouchDist));
            panX = midX - (midX - panX) * (newZoom / zoom);
            panY = midY - (midY - panY) * (newZoom / zoom);
            zoom = newZoom;
            lastTouchDist = dist;
            applyTransform();
        }
    }, { passive: false });
    treeCanvas.addEventListener('touchend', e => {
        if (e.touches.length < 2) lastTouchDist = null;
        if (e.touches.length === 0) isPanning = false;
    }, { passive: true });

    // Button controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        const cx = treeCanvas.clientWidth / 2, cy = treeCanvas.clientHeight / 2;
        const newZoom = Math.min(MAX_ZOOM, zoom * 1.25);
        panX = cx - (cx - panX) * (newZoom / zoom);
        panY = cy - (cy - panY) * (newZoom / zoom);
        zoom = newZoom;
        applyTransform();
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        const cx = treeCanvas.clientWidth / 2, cy = treeCanvas.clientHeight / 2;
        const newZoom = Math.max(MIN_ZOOM, zoom / 1.25);
        panX = cx - (cx - panX) * (newZoom / zoom);
        panY = cy - (cy - panY) * (newZoom / zoom);
        zoom = newZoom;
        applyTransform();
    });
    document.getElementById('btn-center').addEventListener('click', () => window.resetPanZoom());

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
        this.style.display           = 'none';
        isAliveSwitch.checked        = true;
        deathContainer.style.display = 'none';
        M.FormSelect.init(document.getElementById('person-sex'));
        // Reset relation form selects back to defaults
        const selChild = document.getElementById('select-child');
        const selP1    = document.getElementById('select-parent1');
        const selP2    = document.getElementById('select-parent2');
        selChild.selectedIndex = 0;
        selP1.selectedIndex    = 0;
        selP2.selectedIndex    = 0;
        M.FormSelect.init(selChild);
        M.FormSelect.init(selP1);
        M.FormSelect.init(selP2);
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
                sex:             document.getElementById('person-sex').value,
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
