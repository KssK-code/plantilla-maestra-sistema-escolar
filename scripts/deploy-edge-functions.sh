#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# Deploy automático de Edge Functions a Supabase
# ═══════════════════════════════════════════════════════
# Uso:
#   ./scripts/deploy-edge-functions.sh <PROJECT_REF> [SUPABASE_ACCESS_TOKEN]
#
# Ejemplo:
#   ./scripts/deploy-edge-functions.sh pkexjtmahpysnrucufxh sbp_2423276247b215c968...
#
# Si SUPABASE_ACCESS_TOKEN no se pasa como argumento, lo lee de la env var.
# ═══════════════════════════════════════════════════════

set -e  # Salir si algo falla

# ─── Validar argumentos ─────────────────────────────────
if [ -z "$1" ]; then
    echo "❌ ERROR: Falta el PROJECT_REF de Supabase"
    echo ""
    echo "Uso: ./scripts/deploy-edge-functions.sh <PROJECT_REF> [SUPABASE_ACCESS_TOKEN]"
    echo ""
    echo "El PROJECT_REF lo encuentras en:"
    echo "  https://supabase.com/dashboard/project/<AQUI>/settings/general"
    exit 1
fi

PROJECT_REF="$1"

# Si pasan token como argumento 2, usarlo. Si no, usar env var.
if [ -n "$2" ]; then
    export SUPABASE_ACCESS_TOKEN="$2"
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ ERROR: SUPABASE_ACCESS_TOKEN no definido"
    echo ""
    echo "Opciones:"
    echo "  1) Pasarlo como segundo argumento del script"
    echo "  2) Exportarlo: export SUPABASE_ACCESS_TOKEN=sbp_xxx"
    echo ""
    echo "Genera tu token en:"
    echo "  https://supabase.com/dashboard/account/tokens"
    exit 1
fi

# ─── Verificar que existen las functions ────────────────
if [ ! -d "supabase/functions" ]; then
    echo "❌ ERROR: No se encontró la carpeta supabase/functions/"
    echo "Asegúrate de ejecutar este script desde la raíz del repo del cliente."
    exit 1
fi

# ─── Encabezado ────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "🚀 Deploy de Edge Functions a Supabase"
echo "═══════════════════════════════════════════════════════"
echo "Project ref:  $PROJECT_REF"
echo "Carpeta:      $(pwd)"
echo ""

# ─── Link al proyecto ──────────────────────────────────
echo "🔗 Conectando con el proyecto Supabase..."
npx supabase link --project-ref "$PROJECT_REF"
echo ""

# ─── Listar functions disponibles ─────────────────────
FUNCTIONS=$(ls supabase/functions/ 2>/dev/null | grep -v "_shared" | grep -v "^_" || echo "")

if [ -z "$FUNCTIONS" ]; then
    echo "⚠️  No se encontraron Edge Functions en supabase/functions/"
    exit 0
fi

echo "📦 Edge Functions detectadas:"
echo "$FUNCTIONS" | sed 's/^/   - /'
echo ""

# ─── Deploy de cada function ───────────────────────────
SUCCESS_COUNT=0
FAILED_FUNCTIONS=""

for FUNCTION in $FUNCTIONS; do
    echo "───────────────────────────────────────────────────"
    echo "🚢 Deploying: $FUNCTION"
    echo "───────────────────────────────────────────────────"

    if npx supabase functions deploy "$FUNCTION" --no-verify-jwt; then
        echo "✅ $FUNCTION desplegada exitosamente"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ Error al desplegar $FUNCTION"
        FAILED_FUNCTIONS="$FAILED_FUNCTIONS $FUNCTION"
    fi
    echo ""
done

# ─── Resumen final ─────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "📊 Resumen del deploy"
echo "═══════════════════════════════════════════════════════"
echo "✅ Functions deployadas: $SUCCESS_COUNT"

if [ -n "$FAILED_FUNCTIONS" ]; then
    echo "❌ Functions con errores: $FAILED_FUNCTIONS"
    exit 1
fi

# ─── Verificación final con curl ────────────────────────
echo ""
echo "🔍 Verificando endpoint de user-management..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: https://example.com" \
    -H "Access-Control-Request-Method: POST" \
    "https://${PROJECT_REF}.supabase.co/functions/v1/user-management")

if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "204" ]; then
    echo "✅ CORS preflight OK (HTTP $RESPONSE)"
else
    echo "⚠️  CORS preflight devolvió HTTP $RESPONSE (puede ser normal si no es user-management)"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🎉 Deploy completo. Tu cliente ya puede crear usuarios."
echo "═══════════════════════════════════════════════════════"
