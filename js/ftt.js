// =========================================================
// ftt.js — FTT import parser
// Parses the legacy tab-delimited .ftt format and merges
// individuals/families into the in-memory db.
// Depends on: db.js, ui.js (saveDB, updateUI, M.toast)
//
// FTT column layout (individual rows, cols.length >= 20):
//   [0]  id
//   [2]  familyOfOrigin (0 = none)
//   [12] apellidos
//   [13] nombres
//   [14-15] empty
//   [16] birth flag  (128 = known date, 2 = unknown)
//   [17] birth year
//   [18] birth month
//   [19] birth day
//   [20] death flag  (128 = known date, 2 = unknown)
//   [21] death year
//   [22] death month
//   [23] death day
//   [24] sex (1 = M, 2 = F)
//
// FTT column layout (family rows, 5 <= cols.length < 20):
//   [0]  family id
//   [2]  parent1 id  (0 = none)
//   [4]  parent2 id  (0 = none)
// =========================================================

function parseFTT(text) {
    const lines = text.split('\n');
    const tInd  = [];
    const tFam  = [];

    lines.forEach(line => {
        const cols = line.split('\t');

        // Family row
        if (cols.length > 5 && cols.length < 20 && !isNaN(parseInt(cols[0]))) {
            tFam.push({
                id:         cols[0],
                parent1Id:  cols[2] !== '0' ? cols[2] : null,
                parent2Id:  cols[4] !== '0' ? cols[4] : null,
                childrenIds: []
            });
            return;
        }

        // Individual row
        if (cols.length >= 20 && !isNaN(parseInt(cols[0])) && (cols[12] || cols[13])) {
            const by = cols[17], bm = cols[18], bd = cols[19];
            const dob = (by && by !== '0')
                ? by + '-' + (bm && bm !== '0' ? bm.padStart(2, '0') : '01') + '-' + (bd && bd !== '0' ? bd.padStart(2, '0') : '01')
                : null;

            const dy = cols[21], dm = cols[22], dd = cols[23];
            const dod = (dy && dy !== '0')
                ? dy + '-' + (dm && dm !== '0' ? dm.padStart(2, '0') : '01') + '-' + (dd && dd !== '0' ? dd.padStart(2, '0') : '01')
                : null;

            tInd.push({
                id:              cols[0],
                nombres:         cols[13] ? cols[13].trim() : '',
                apellidos:       cols[12] ? cols[12].trim() : '',
                fechaNacimiento: dob,
                fechaDefuncion:  dod,
                familyOfOrigin:  cols[2] !== '0' ? cols[2] : null,
                vivo:            !dod
            });
        }
    });

    // Merge — skip duplicates (import is additive, not destructive)
    tInd.forEach(ind => { if (!db.individuals.find(i => i.id === ind.id)) db.individuals.push(ind); });
    tFam.forEach(fam => { if (!db.families.find(f => f.id === fam.id)) db.families.push(fam); });

    // Build childrenIds from each individual's familyOfOrigin pointer
    db.individuals.forEach(ind => {
        if (!ind.familyOfOrigin) return;
        let fam = db.families.find(f => f.id === ind.familyOfOrigin);
        if (!fam) {
            fam = { id: ind.familyOfOrigin, parent1Id: null, parent2Id: null, childrenIds: [] };
            db.families.push(fam);
        }
        if (!fam.childrenIds.includes(ind.id)) fam.childrenIds.push(ind.id);
    });

    saveDB();
    updateUI();
    M.toast({ html: 'Archivo importado', classes: 'green' });
}
