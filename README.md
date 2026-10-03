# status-claude-plan-widget

Muestra en la barra inferior de Claude Code cuánto llevas usado de tu plan:

```
[Claude] Pro | Contexto: 13% (127k/1M) | 5h: 23% (reset 15:40) | Semana: 41% (reset 10-08 14:00) | 13:45
```

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior (comprueba con `node -v`)
- Claude Code con un plan **Pro** o **Max**

## Instalación

```bash
git clone https://github.com/danielleon21/status-claude-plan-widget.git
cd status-claude-plan-widget
npm install
npm run setup
```

`npm run setup` te pregunta tu plan (pro/max) y configura Claude Code automáticamente.
La línea aparece después de la primera respuesta de Claude en la sesión.

## Desinstalar

```bash
npm run setup:remove
```

> Si mueves la carpeta del proyecto, vuelve a ejecutar `npm run setup`.
