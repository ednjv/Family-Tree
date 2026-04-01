// =========================================================
// db.js — Data layer
// Owns the in-memory database, LocalStorage persistence,
// and all read-only data-access primitives.
// No DOM interaction here; pure data operations only.
// =========================================================

/* global state ----------------------------------------- */
let db = JSON.parse(localStorage.getItem('familyTreeDB')) || { individuals: [], families: [] };
let currentFocusId = null;
let treeConfig = JSON.parse(localStorage.getItem('familyTreeConfig')) || { anc: 2, desc: 999, spouses: true };

/* persistence ------------------------------------------ */
function saveDB() {
    localStorage.setItem('familyTreeDB', JSON.stringify(db));
}

function saveTreeConfig() {
    treeConfig = {
        anc:     parseInt(document.getElementById('config-anc').value),
        desc:    parseInt(document.getElementById('config-desc').value),
        spouses: document.getElementById('config-spouses').checked
    };
    localStorage.setItem('familyTreeConfig', JSON.stringify(treeConfig));
    if (currentFocusId) renderTree(currentFocusId); // renderTree defined in tree.js
}

/* queries ---------------------------------------------- */
function getPerson(id) {
    return db.individuals.find(i => i.id === id);
}

function getFamiliesWhereIsParent(id) {
    return db.families.filter(f => f.parent1Id === id || f.parent2Id === id);
}

function getSpouses(id) {
    const spouses = [];
    getFamiliesWhereIsParent(id).forEach(f => {
        if (f.parent1Id === id && f.parent2Id) spouses.push(getPerson(f.parent2Id));
        if (f.parent2Id === id && f.parent1Id) spouses.push(getPerson(f.parent1Id));
    });
    return spouses.filter(Boolean);
}

/* domain logic ----------------------------------------- */
function calculateAge(birth, death, isAlive) {
    if (!birth) return '?';
    const b = new Date(birth);
    const end = (isAlive || !death) ? new Date() : new Date(death);
    if (isNaN(b.getTime())) return '?';
    let age = end.getFullYear() - b.getFullYear();
    const m = end.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < b.getDate())) age--;
    return age;
}
