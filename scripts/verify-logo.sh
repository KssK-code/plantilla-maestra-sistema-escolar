#!/bin/bash
# verify-logo.sh — verificar que el logo del cliente NO es placeholder MEV
# Falla con exit 1 si:
#   - Logo no existe
#   - Logo pesa <1KB
#   - Logo NO es PNG válido
#   - Logo tiene marker MEV-PLACEHOLDER embebido (tEXt chunk)
#
# Cuando el cliente sobrescribe logo.png con su logo real, el marker
# desaparece automáticamente y este script pasa.

set -e

LOGO_PATH="public/logo.png"

# Check 1: existe
if [ ! -f "$LOGO_PATH" ]; then
  echo "❌ ERROR: $LOGO_PATH no existe"
  echo ""
  echo "Acción: copia el logo real del cliente a $LOGO_PATH"
  echo "Ejemplo: cp ~/clientes-MEV/[CLIENTE]/assets-cliente/logos/logo.png $LOGO_PATH"
  exit 1
fi

# Check 2: tamaño mínimo
SIZE=$(stat -c%s "$LOGO_PATH" 2>/dev/null || stat -f%z "$LOGO_PATH" 2>/dev/null)
if [ "$SIZE" -lt 1024 ]; then
  echo "❌ ERROR: $LOGO_PATH es muy pequeño ($SIZE bytes)"
  echo ""
  echo "El logo es un placeholder transparente o vacío."
  echo "Debes reemplazarlo con el logo REAL del cliente antes de deploy."
  exit 1
fi

# Check 3: PNG válido
FILE_TYPE=$(file -b "$LOGO_PATH" | head -c 20)
if [[ ! "$FILE_TYPE" =~ ^PNG ]]; then
  echo "❌ ERROR: $LOGO_PATH no es un PNG válido (es: $FILE_TYPE)"
  exit 1
fi

# Check 4: marker MEV-PLACEHOLDER embebido en tEXt chunk
if grep -aq "MEV-PLACEHOLDER-DO-NOT-DEPLOY" "$LOGO_PATH" 2>/dev/null; then
  echo "❌ ERROR: $LOGO_PATH es el placeholder MEV"
  echo ""
  echo "Detectado marker 'MEV-PLACEHOLDER-DO-NOT-DEPLOY' embebido en el PNG."
  echo ""
  echo "Acción: copia el logo REAL del cliente:"
  echo "  cp ~/clientes-MEV/[CLIENTE]/assets-cliente/logos/[archivo].png $LOGO_PATH"
  echo ""
  echo "Después ejecuta este script de nuevo para verificar."
  exit 1
fi

echo "✅ Logo OK: $LOGO_PATH ($SIZE bytes, sin marker placeholder)"
exit 0
