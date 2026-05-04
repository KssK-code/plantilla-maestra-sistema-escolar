#!/bin/bash
# verify-logo.sh — verificar que el logo del cliente NO es placeholder
# Falla con exit 1 si el logo es < 1KB o no existe.
# Se debe ejecutar ANTES de deploy a Netlify.

set -e

LOGO_PATH="public/logo.png"

if [ ! -f "$LOGO_PATH" ]; then
  echo "❌ ERROR: $LOGO_PATH no existe"
  echo ""
  echo "Acción: copia el logo real del cliente a $LOGO_PATH"
  echo "Ejemplo: cp ~/clientes-MEV/[CLIENTE]/assets-cliente/logos/logo.png $LOGO_PATH"
  exit 1
fi

SIZE=$(stat -c%s "$LOGO_PATH" 2>/dev/null || stat -f%z "$LOGO_PATH" 2>/dev/null)

if [ "$SIZE" -lt 1024 ]; then
  echo "❌ ERROR: $LOGO_PATH es muy pequeño ($SIZE bytes)"
  echo ""
  echo "El logo actual es el placeholder MEV genérico."
  echo "Debes reemplazarlo con el logo REAL del cliente antes de deploy."
  echo ""
  echo "Acción:"
  echo "  cp ~/clientes-MEV/[CLIENTE]/assets-cliente/logos/[archivo].png $LOGO_PATH"
  exit 1
fi

# Verificar que es un PNG válido (no archivo vacío con extensión .png)
FILE_TYPE=$(file -b "$LOGO_PATH" | head -c 20)
if [[ ! "$FILE_TYPE" =~ ^PNG ]]; then
  echo "❌ ERROR: $LOGO_PATH no es un PNG válido (es: $FILE_TYPE)"
  exit 1
fi

echo "✅ Logo OK: $LOGO_PATH ($SIZE bytes)"
exit 0
