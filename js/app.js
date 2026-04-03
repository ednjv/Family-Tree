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
        // Reset photo state
        window._pendingPhotoDataUrl = undefined;
        pendingRemovePhoto = false;
        resetFormPhotoPreview();
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

            let savedId = id;
            if (id) {
                const idx = db.individuals.findIndex(i => i.id === id);
                if (idx > -1) db.individuals[idx] = { ...db.individuals[idx], ...data };
            } else {
                savedId = 'P' + Date.now();
                db.individuals.push({ id: savedId, familyOfOrigin: null, ...data });
                if (!currentFocusId) currentFocusId = savedId;
            }

            saveDB();

            // Persist photo change (GEDCOM OBJE)
            if (typeof window._pendingPhotoDataUrl !== 'undefined') {
                if (window._pendingPhotoDataUrl) {
                    setPhoto(savedId, window._pendingPhotoDataUrl);
                } else if (pendingRemovePhoto) {
                    removePhoto(savedId);
                }
                window._pendingPhotoDataUrl = undefined;
                pendingRemovePhoto = false;
            }

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
                    try {
                        const parsed = JSON.parse(ev.target.result);
                        // Restore embedded photos if present
                        if (parsed._photos && typeof parsed._photos === 'object') {
                            photosDB = parsed._photos;
                            savePhotosDB();
                            delete parsed._photos;
                        }
                        db = parsed;
                        saveDB();
                        updateUI();
                    } catch (_) {}
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
        // Embed photos (_photos key) so the JSON is self-contained
        const exportData = Object.keys(photosDB).length > 0
            ? { ...db, _photos: photosDB }
            : { ...db };
        const a    = document.createElement('a');
        a.href     = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
        a.download = 'family_tree.json';
        a.click();
    });

    /* --- Clear all data ------------------------------- */
    document.getElementById('btn-clear-db').addEventListener('click', e => {
        e.preventDefault();
        if (!confirm('¿Borrar todo?')) return;
        db             = { individuals: [], families: [] };
        photosDB       = {};
        currentFocusId = null;
        saveDB();
        savePhotosDB();
        updateUI();
        document.getElementById('tree-canvas').style.display      = 'none';
        document.getElementById('tree-placeholder').style.display  = 'block';
    });

    /* =========================================================
       Photo Upload + Crop (GEDCOM OBJE — 200×200 px JPEG)
       ========================================================= */

    let pendingRemovePhoto = false;
    let cropImg = null;
    let cropX = 0, cropY = 0, cropScale = 1;
    let cropMinScale = 1, cropMaxScale = 4;
    let cropDragging = false, cropDragStartX = 0, cropDragStartY = 0;
    let cropModalInstance = null;
    let cropLastTouchDist = null;

    // Init Materialize modal
    cropModalInstance = M.Modal.init(document.getElementById('modal-photo-crop'), {
        dismissible: false
    });

    function resetFormPhotoPreview() {
        const formPhotoImg     = document.getElementById('form-photo-img');
        const formPhotoInitial = document.getElementById('form-photo-initial');
        formPhotoImg.src               = '';
        formPhotoImg.style.display     = 'none';
        formPhotoInitial.style.display = 'flex';
        formPhotoInitial.textContent   = '?';
        document.getElementById('btn-remove-photo').style.display = 'none';
    }

    function renderCrop() {
        if (!cropImg) return;
        const canvas = document.getElementById('crop-canvas');
        const ctx    = canvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);
        ctx.drawImage(cropImg, cropX, cropY, cropImg.width * cropScale, cropImg.height * cropScale);
        // Dim outside the circle
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.rect(0, 0, 200, 200);
        ctx.arc(100, 100, 97, 0, Math.PI * 2, true); // CCW arc = hole
        ctx.fill();
        ctx.restore();
        // Circle border
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(100, 100, 97, 0, Math.PI * 2);
        ctx.stroke();
    }

    function setCropScale(newScale) {
        newScale = Math.max(cropMinScale, Math.min(cropMaxScale, newScale));
        // Keep canvas centre fixed in image space
        const imgPtX = (100 - cropX) / cropScale;
        const imgPtY = (100 - cropY) / cropScale;
        cropScale = newScale;
        cropX = 100 - imgPtX * cropScale;
        cropY = 100 - imgPtY * cropScale;
        renderCrop();
    }

    function openCropModal(imgSrc) {
        const img = new Image();
        img.onload = function () {
            cropImg = img;
            // Minimum scale fills the 200×200 box
            cropMinScale = Math.max(200 / img.width, 200 / img.height);
            cropMaxScale = cropMinScale * 5;
            cropScale = cropMinScale;
            cropX = (200 - img.width * cropScale) / 2;
            cropY = (200 - img.height * cropScale) / 2;
            document.getElementById('crop-zoom-slider').value = 0;
            renderCrop();
            cropModalInstance.open();
        };
        img.src = imgSrc;
    }

    // Canvas drag
    const cropCanvas = document.getElementById('crop-canvas');
    cropCanvas.addEventListener('mousedown', e => {
        cropDragging = true;
        cropDragStartX = e.offsetX - cropX;
        cropDragStartY = e.offsetY - cropY;
    });
    cropCanvas.addEventListener('mousemove', e => {
        if (!cropDragging) return;
        cropX = e.offsetX - cropDragStartX;
        cropY = e.offsetY - cropDragStartY;
        renderCrop();
    });
    cropCanvas.addEventListener('mouseup',    () => { cropDragging = false; });
    cropCanvas.addEventListener('mouseleave', () => { cropDragging = false; });

    // Canvas wheel zoom
    cropCanvas.addEventListener('wheel', e => {
        e.preventDefault();
        const factor   = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newScale = cropScale * factor;
        const ratio    = Math.max(0, Math.min(100,
            (newScale - cropMinScale) / (cropMaxScale - cropMinScale) * 100));
        document.getElementById('crop-zoom-slider').value = Math.round(ratio);
        setCropScale(newScale);
    }, { passive: false });

    // Canvas touch (single-finger drag + pinch zoom)
    cropCanvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            cropDragging = true;
            const r = cropCanvas.getBoundingClientRect();
            cropDragStartX = e.touches[0].clientX - r.left - cropX;
            cropDragStartY = e.touches[0].clientY - r.top  - cropY;
        } else if (e.touches.length === 2) {
            cropDragging = false;
            cropLastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: true });
    cropCanvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && cropDragging) {
            const r = cropCanvas.getBoundingClientRect();
            cropX = e.touches[0].clientX - r.left - cropDragStartX;
            cropY = e.touches[0].clientY - r.top  - cropDragStartY;
            renderCrop();
        } else if (e.touches.length === 2 && cropLastTouchDist) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const newScale = cropScale * (dist / cropLastTouchDist);
            cropLastTouchDist = dist;
            const ratio = Math.max(0, Math.min(100,
                (newScale - cropMinScale) / (cropMaxScale - cropMinScale) * 100));
            document.getElementById('crop-zoom-slider').value = Math.round(ratio);
            setCropScale(newScale);
        }
    }, { passive: false });
    cropCanvas.addEventListener('touchend', e => {
        if (e.touches.length < 2) cropLastTouchDist = null;
        if (e.touches.length === 0) cropDragging = false;
    }, { passive: true });

    // Zoom slider
    document.getElementById('crop-zoom-slider').addEventListener('input', function () {
        const newScale = cropMinScale + (cropMaxScale - cropMinScale) * (this.value / 100);
        setCropScale(newScale);
    });

    // Save crop → store as pending, update form preview
    document.getElementById('btn-save-crop').addEventListener('click', function () {
        const out = document.createElement('canvas');
        out.width = 200; out.height = 200;
        out.getContext('2d').drawImage(
            cropImg, cropX, cropY, cropImg.width * cropScale, cropImg.height * cropScale
        );
        const dataUrl = out.toDataURL('image/jpeg', 0.85);
        window._pendingPhotoDataUrl = dataUrl;
        pendingRemovePhoto = false;

        const formPhotoImg     = document.getElementById('form-photo-img');
        const formPhotoInitial = document.getElementById('form-photo-initial');
        formPhotoImg.src               = dataUrl;
        formPhotoImg.style.display     = 'block';
        formPhotoInitial.style.display = 'none';
        document.getElementById('btn-remove-photo').style.display = 'inline-flex';

        cropModalInstance.close();
    });

    // Upload button → open file picker
    document.getElementById('btn-upload-photo').addEventListener('click', function () {
        document.getElementById('photo-file-input').click();
    });

    // File selected → load into crop modal
    document.getElementById('photo-file-input').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => openCropModal(ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    });

    // Remove photo button
    document.getElementById('btn-remove-photo').addEventListener('click', function () {
        pendingRemovePhoto = true;
        window._pendingPhotoDataUrl = null;
        const firstNames = document.getElementById('first-names').value;
        document.getElementById('form-photo-img').style.display     = 'none';
        document.getElementById('form-photo-initial').style.display = 'flex';
        document.getElementById('form-photo-initial').textContent   =
            firstNames ? firstNames.charAt(0).toUpperCase() : '?';
        this.style.display = 'none';
    });

    // Keep photo initial in sync with first-names while typing
    document.getElementById('first-names').addEventListener('input', function () {
        if (document.getElementById('form-photo-img').style.display === 'none') {
            document.getElementById('form-photo-initial').textContent =
                this.value ? this.value.charAt(0).toUpperCase() : '?';
        }
    });

    /* --- Initial render ------------------------------- */
    updateUI();
});
