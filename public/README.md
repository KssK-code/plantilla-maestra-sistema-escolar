# Assets del cliente — REEMPLAZAR antes de entregar

Esta carpeta contiene placeholders genéricos. Cada cliente debe reemplazar
sus archivos antes de habilitar el sistema en producción.

## Reemplazar SIEMPRE para cada cliente nuevo

| Archivo | Descripción | Si NO se reemplaza |
|---|---|---|
| `logo.png` | Logo del cliente (PNG con transparencia, mín. 200x80px) | Login, sidebar y PDFs muestran placeholder transparente |

## Reemplazo de logo

Desde la raíz del repo del cliente:

```bash
cp /ruta/al/logo-cliente.png public/logo.png
git add public/logo.png && git commit -m "feat(assets): logo del cliente"
git push
```

## El logo se usa en

- `src/components/Login.jsx` — pantalla de login
- `src/components/Sidebar.jsx` — sidebar de la app
- `src/lib/pdfReceiptGenerator.js` — comprobantes de pago PDF
- `src/lib/utils.js` — fallback global

## Por qué placeholder transparente y no logo de cliente

Antes esta plantilla traía logos hardcoded de IVS/CEEVA/CJVB/CUEN, lo que
causaba que clientes nuevos arrancaran con logos de otros institutos visibles
en sus PDFs y branding. El placeholder transparente hace visible que falta
el logo del cliente sin contaminar identidad cruzada.
