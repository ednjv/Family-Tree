# Family Tree

Una aplicación web ligera para el registro, gestión y visualización de árboles genealógicos. Diseñada pensando en la simplicidad y la privacidad del usuario: sin backend, sin cuentas, sin servidores.

## Características

- **Árbol bidireccional (hourglass):** visualiza ancestros hacia arriba y descendientes hacia abajo desde cualquier persona enfocada.
- **Tarjetas RPG:** cada persona muestra avatar, nombre, y badge de estado (vivo/fallecido) con edad calculada automáticamente.
- **Configuración en tiempo real:** controla las generaciones de ancestros/descendientes visibles y si se muestran cónyuges.
- **Drag-to-pan:** arrastra el canvas del árbol para navegar sin scroll bars.
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

## Formato FTT (importación)

El parser en `ftt.js` entiende el formato tab-delimitado:

| Tipo de fila | Condición | Columnas relevantes |
|---|---|---|
| **Individual** | `cols.length >= 20` | `[0]` id, `[2]` familyOfOrigin, `[12]` apellidos, `[13]` nombres, `[18-20]` nacimiento (año/mes/día), `[22-24]` defunción, `[25]` sexo |
| **Familia** | `5 < cols.length < 20` | `[0]` famId, `[2]` parent1Id, `[4]` parent2Id |

## Dependencias externas (CDN)

- [Materialize CSS v1.0.0](https://materializecss.com/) — sistema de diseño y componentes
- [Google Fonts — Roboto](https://fonts.google.com/specimen/Roboto)
- [Google Material Icons](https://fonts.google.com/icons)
