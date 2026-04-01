// =========================================================
// tree.js — Tree rendering engine
// Builds the bidirectional (hourglass) HTML tree from the
// in-memory db. Depends on: db.js
// =========================================================

/* --- Card / node builders ----------------------------- */

function generateCardHTML(person, isRoot = false) {
    if (!person) return '';
    const age         = calculateAge(person.fechaNacimiento, person.fechaDefuncion, person.vivo !== false);
    const statusClass = person.vivo !== false ? 'rpg-alive' : 'rpg-dead';
    const statusIcon  = person.vivo !== false ? 'favorite' : 'sentiment_very_dissatisfied';
    const init        = person.nombres ? person.nombres.charAt(0).toUpperCase() : '?';
    const bg          = person.vivo !== false ? '#4CAF50' : '#9e9e9e';

    return `
<div class="tree-card ${isRoot ? 'is-root' : ''}">
  <div class="card-controls">
    <i class="material-icons edit-btn"  data-id="${person.id}" title="Editar">edit</i>
    ${!isRoot
        ? `<i class="material-icons focus-btn" data-id="${person.id}" title="Enfocar aquí">my_location</i>`
        : '<i></i>'}
  </div>
  <div class="avatar" style="background-color:${bg};">${init}</div>
  <div class="name" title="${person.nombres} ${person.apellidos}">${person.nombres}<br>${person.apellidos}</div>
  <div class="rpg-status ${statusClass}"><i class="material-icons">${statusIcon}</i> ${age} años</div>
</div>`;
}

// Wraps a person card with spouse card(s) when treeConfig.spouses is enabled.
function generateFamilyNode(person, isRoot = false) {
    let html = generateCardHTML(person, isRoot);
    if (treeConfig.spouses) {
        const spouses = getSpouses(person.id);
        if (spouses.length > 0) {
            html = `<div class="family-node">${html}`;
            spouses.forEach(spouse => {
                html += `<i class="material-icons spouse-connector">join_inner</i>${generateCardHTML(spouse, false)}`;
            });
            html += `</div>`;
        }
    }
    return html;
}

/* --- Recursive engines -------------------------------- */

// Builds the ancestor sub-tree upward from `person`.
// Ancestors show only their own card (no spouse repetition) to avoid visual crosses.
function buildAncestorsNode(person, currentDepth) {
    if (!person || currentDepth > treeConfig.anc) return '';

    let html = `<li>${generateCardHTML(person, false)}`;

    if (currentDepth < treeConfig.anc && person.familyOfOrigin) {
        const originFam = db.families.find(f => f.id === person.familyOfOrigin);
        if (originFam) {
            const p1 = getPerson(originFam.parent1Id);
            const p2 = getPerson(originFam.parent2Id);
            let parentsHtml = '';
            if (p1) parentsHtml += buildAncestorsNode(p1, currentDepth + 1);
            if (p2) parentsHtml += buildAncestorsNode(p2, currentDepth + 1);
            if (parentsHtml) html += `<ul>${parentsHtml}</ul>`;
        }
    }

    html += `</li>`;
    return html;
}

// Builds the descendant sub-tree downward from `person`.
function buildDescendantsNode(person, currentDepth, isRoot) {
    if (!person || currentDepth > treeConfig.desc) return '';

    let html = `<li>${generateFamilyNode(person, isRoot)}`;

    if (currentDepth < treeConfig.desc) {
        const families = getFamiliesWhereIsParent(person.id);
        let childrenHtml = '';
        families.forEach(fam => {
            fam.childrenIds.forEach(childId => {
                const child = getPerson(childId);
                if (child) childrenHtml += buildDescendantsNode(child, currentDepth + 1, false);
            });
        });
        if (childrenHtml) html += `<ul>${childrenHtml}</ul>`;
    }

    html += `</li>`;
    return html;
}

/* --- Main render entry point -------------------------- */

function renderTree(focusId) {
    const focusPerson = getPerson(focusId);
    if (!focusPerson) return;

    const isNewFocus = focusId !== currentFocusId;
    currentFocusId = focusId;

    document.getElementById('tree-placeholder').style.display = 'none';
    document.getElementById('tree-canvas').style.display = 'block';

    // Reset pan/zoom when switching focus so the new root is always visible
    if (isNewFocus && typeof window.resetPanZoom === 'function') window.resetPanZoom();

    // Ancestors (hourglass top — upward CSS tree)
    const ancestorsCanvas = document.getElementById('ancestors-canvas');
    let ancestorsHtml = '';
    if (treeConfig.anc > 0 && focusPerson.familyOfOrigin) {
        const originFam = db.families.find(f => f.id === focusPerson.familyOfOrigin);
        if (originFam) {
            const p1 = getPerson(originFam.parent1Id);
            const p2 = getPerson(originFam.parent2Id);
            if (p1) ancestorsHtml += buildAncestorsNode(p1, 1);
            if (p2) ancestorsHtml += buildAncestorsNode(p2, 1);
        }
    }
    ancestorsCanvas.innerHTML = ancestorsHtml ? `<ul>${ancestorsHtml}</ul>` : '';

    // Root + descendants (hourglass bottom — downward CSS tree)
    const descendantsCanvas = document.getElementById('descendants-canvas');
    descendantsCanvas.innerHTML = `<ul>${buildDescendantsNode(focusPerson, 0, true)}</ul>`;

    // Re-attach interactive card events after innerHTML replacement
    document.querySelectorAll('.tree-card .focus-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); renderTree(btn.getAttribute('data-id')); });
    });
    document.querySelectorAll('.tree-card .edit-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); loadToForm(btn.getAttribute('data-id')); });
    });
}
