# Family Tree

Una aplicación web ligera para el registro, gestión y visualización de árboles genealógicos. Diseñada pensando en la simplicidad y la privacidad del usuario: sin backend, sin cuentas, sin servidores.

## Características

- **Árbol bidireccional (hourglass):** visualiza ancestros hacia arriba y descendientes hacia abajo desde cualquier persona enfocada.
- **Tarjetas RPG:** cada persona muestra avatar, nombre, y badge de estado (vivo/fallecido) con edad calculada automáticamente.
- **Controles flotantes en el canvas:** botones `+` / `−` y centrado (⊕) en la esquina inferior derecha; generaciones de ancestros (↑) y descendientes (↓) en las esquinas superiores; toggle de cónyuges en la esquina inferior izquierda. Todos siguen el estándar Material Design.
- **Pan + Zoom interactivo:** arrastra el canvas, usa la rueda del ratón o pellizca para hacer zoom.
- **Import FTT / JSON:** importa archivos `.ftt` del formato heredado o `.json` exportados por la propia app.
- **Export JSON:** descarga el árbol completo como JSON estándar.
- **Persistencia local:** los datos viven en `localStorage` del navegador; sin servidor backend.

## Arquitectura

El proyecto sigue una separación de responsabilidades por capas, sin build tools ni frameworks de componentes. La carga de scripts en `index.html` respeta el orden de dependencias.

```text
Family-Tree/
├── index.html          # Shell HTML puro — estructura, CDN links, <script> tags
├── css/
│   └── app.css         # Todos los estilos custom (Materialize maneja el base)
└── js/
    ├── db.js           # Capa de datos: estado global (db, treeConfig), LocalStorage,
    │                   # queries (getPerson, getSpouses…) y calculateAge
    ├── tree.js         # Motor de renderizado: generateCardHTML, generateFamilyNode,
    │                   # buildAncestorsNode, buildDescendantsNode, renderTree
    ├── ui.js           # Capa UI: loader, consola debug, updateUI, loadToForm,
    │                   # attachCardEvents
    ├── ftt.js          # Parser del formato .ftt heredado (parseFTT)
    └── app.js          # Bootstrap: DOMContentLoaded, init de Materialize,
                        # wiring de todos los event listeners, arranque inicial
```

### Flujo de datos

```
LocalStorage
    ↓  (al cargar)
  db.js   →  tree.js  →  DOM (árbol HTML)
    ↑             ↑
  ui.js   ←  eventos de usuario (edit, focus, link)
    ↑
  ftt.js  (importación)
    ↑
  app.js  (bootstrap + form handlers)
```

## Compatibilidad GEDCOM

El proyecto está diseñado para ser compatible con [GEDCOM 5.5.1](https://gedcom.io/specifications/), el estándar genealógico más ampliamente soportado.

### Mapeado del modelo de datos

| Campo interno | Tag GEDCOM | Estado |
|---|---|---|
| `id` | `@I<n>@` (INDI) | ✅ Conceptualmente compatible |
| `nombres` | `NAME / GIVN` | ✅ |
| `apellidos` | `NAME / SURN` | ✅ |
| `sex` | `SEX` (M / F / U) | ✅ Capturado en import FTT y formulario |
| `fechaNacimiento` | `BIRT DATE` | ✅ (almacenado como ISO 8601, convertible) |
| `fechaDefuncion` | `DEAT DATE` | ✅ |
| `vivo = false` sin fecha | `DEAT Y` | ✅ Soportado (`fechaDefuncion` null + `vivo: false`) |
| `familyOfOrigin` | `FAMC` | ✅ |
| FAM `parent1Id` / `parent2Id` | `HUSB` / `WIFE` | ⚠️ Los roles no están diferenciados por sexo (ver nota) |
| FAM `childrenIds` | `CHIL` | ✅ |

### Gaps conocidos (backlog)

| Feature | Tag GEDCOM | Nota |
|---|---|---|
| Fecha de matrimonio en FAM | `MARR DATE` | No implementado. Necesitaría extender el modelo FAM y el formulario de vinculación. |
| Export `.ged` | — | Solo se exporta JSON. Para interoperabilidad real con software genealógico (Gramps, Ancestry, etc.) hace falta un serializer GEDCOM. |
| Múltiples nombres / alias | `NAME` (múltiples) | No soportado; actualmente un solo par nombres/apellidos. |
| Notas y fuentes | `NOTE`, `SOUR` | No soportado. Relevante para investigación genealógica seria. |

### Nota sobre HUSB / WIFE

GEDCOM 5.5.1 usa `HUSB` y `WIFE` en registros FAM asumiendo roles de sexo binario. El modelo interno usa `parent1Id` / `parent2Id` sin asumir sexo, lo cual es compatible con **GEDCOM 7** (que reemplazó HUSB/WIFE por `INDI1` / `INDI2`). Si se implementa export `.ged` en formato 5.5.1, se puede derivar el rol usando el campo `sex` de cada individuo.

---

## Formato FTT (importación)

El parser en `ftt.js` entiende el formato tab-delimitado propietario (no es GEDCOM):

| Tipo de fila | Condición | Columnas relevantes |
|---|---|---|
| **Individual** | `cols.length >= 20` | `[0]` id, `[2]` familyOfOrigin, `[12]` apellidos, `[13]` nombres, `[16]` birth flag, `[17]` año nac., `[18]` mes nac., `[19]` día nac., `[20]` death flag, `[21]` año def., `[22]` mes def., `[23]` día def., `[24]` sexo (1=M, 2=F) |
| **Familia** | `5 < cols.length < 20` | `[0]` famId, `[2]` parent1Id, `[4]` parent2Id |

## Dependencias externas (CDN)

- [Materialize CSS v1.0.0](https://materializecss.com/) — sistema de diseño y componentes
- [Google Fonts — Roboto](https://fonts.google.com/specimen/Roboto)
- [Google Material Icons](https://fonts.google.com/icons)
