# GaritaFlow 2.0 — Estado del proyecto
**Última sesión:** 25 de julio 2026  
**Próximo paso inmediato:** → ver sección "Pendiente" abajo

---

## ✅ Lo que está listo y funcionando

### Base de datos (Railway PostgreSQL)
- Migración completa ejecutada: tablas `users`, `profiles`, `crossings`, `flow_events`, `flow_event_confirmations`, `flow_index_cache`, `push_tokens`, `user_alerts`
- Todos los `port_id` usan INTEGER (correcto para la tabla `ports` existente)
- Script de migración: `garitaflow-api/src/lib/migrate-all.ts`
- Cómo re-ejecutar si hace falta: `cd C:\GaritaFlowAPP\garitaflow-api && npm run migrate:all`

### API (`garitaflow-api`) — rutas corregidas
| Archivo | Qué se corrigió |
|---|---|
| `src/routes/ports.ts` | Eliminadas columnas inexistentes `city`, `cbp_port_code` |
| `src/routes/crossings.ts` | Eliminada `p.city` del SELECT |
| `src/routes/alerts.ts` | Eliminada `p.city`, corregido ORDER BY |
| `src/routes/flow-index.ts` | Eliminada llamada a `calculate_flow_index()` (no existe); score calculado inline desde `wait_snapshots` |
| `src/routes/flow-events.ts` | **SEGURIDAD**: removidos tipos `document_check`, `officer_change`, `vehicle_inspection`, `dog_unit`, `x_ray` |

### App (`garitaflow-app`) — pantallas corregidas
| Archivo | Qué se hizo |
|---|---|
| `src/lib/storage.ts` | Compatible con web: usa `localStorage` en browser, `SecureStore` en nativo |
| `src/screens/auth/RegisterScreen.tsx` | Error inline en lugar de `Alert.alert` (no funciona en web) |
| `src/screens/main/HomeScreen.tsx` | **REDISEÑADO**: jerarquía Ciudad → Zona → Tipo → Carril; selector bloqueado durante cruce activo |
| `src/screens/crossing/ActiveCrossingScreen.tsx` | Botón "Terminar" funciona en web (inline confirm); tipos de evento seguros únicamente |
| `src/screens/crossing/ReportScreen.tsx` | Solo 6 tipos de evento seguros |
| `src/screens/profile/AlertSettingsScreen.tsx` | **REDISEÑADA**: tabla limpia Locación \| Cruce \| Activar (4 filas TJ únicamente) |

### Jerarquía de selección (HomeScreen)
```
Ciudad: Tijuana
  └─ San Ysidro  → Vehicular (SAN_YSIDRO) / Peatonal (PED_WEST)
  └─ Otay Mesa   → Vehicular (OTAY)
  └─ Tecate      → Vehicular (TECATE)
       └─ Carril: General / Ready Lane / SENTRI·TSA (vehicular)
                  General / SENTRI (peatonal)
```

### Seguridad (no revertir)
Los siguientes tipos de evento fueron eliminados deliberadamente por política de seguridad. **No restaurar:**
- `document_check`, `officer_change`, `vehicle_inspection`, `dog_unit`, `x_ray`

---

## ⏳ Pendiente — Retomar aquí mañana

### 1. DECISIÓN: Elegir plantilla visual (bloqueante)
Se presentaron 3 opciones de rediseño visual. El usuario debe elegir una antes de desarrollar:

| Opción | Concepto | Esfuerzo | Estado |
|---|---|---|---|
| **A — Signal** | Tarjetas de estado por garita, header navy fijo, tiempos por carril con color | Bajo | Pendiente selección |
| **B — Transit** | Lista vertical tipo tablero aeropuerto, barra de acento por carril, FAB verde | Medio | Pendiente selección |
| **C — Pulse** | Mapa de fondo + bottom sheet deslizable, pills de tiempo por carril, mayor impacto visual | Alto (requiere Mapbox o expo-maps) | Pendiente selección |

**Para retomar:** Preguntar al usuario "¿Cuál opción elegiste, A, B o C?" y mostrar el widget de comparación si no recuerda.

### 2. Navegación de 5 tabs (después de elegir plantilla)
Actualmente solo hay 2 tabs: Inicio, Perfil.  
El diseño objetivo tiene 5: **Inicio · Garitas · Reportar · Comunidad · Perfil**

Archivos a modificar:
- `garitaflow-app/src/navigation/index.tsx` — agregar tabs y screens
- `garitaflow-app/src/lib/types.ts` — actualizar `MainTabParamList`
- Crear pantallas nuevas: `GaritasScreen.tsx`, `ReportarScreen.tsx` (tab), `ComunidadScreen.tsx`

### 3. Test en Android (Expo Go)
- Instalar Expo Go desde Play Store
- Escanear QR del servidor de desarrollo
- Verificar que el flujo de registro → cruce → reporte funciona en nativo

### 4. Deploy API a Railway (longer term)
- La API corre localmente en puerto 3001
- Crear nuevo servicio en Railway apuntando a `garitaflow-api/`
- Variable de entorno `DATABASE_URL` ya está en `.env` (no en git)

---

## Contexto técnico clave

```
Stack:
  API:  Express.js + TypeScript  →  puerto 3001  →  garitaflow-api/
  App:  Expo SDK ~54 + React Native 0.74.5 (old arch)  →  garitaflow-app/
  DB:   Railway PostgreSQL  →  DATABASE_URL en garitaflow-api/.env (nunca en git)

Port codes → DB ids (se cargan dinámicamente desde portsApi.list()):
  SAN_YSIDRO  →  vehicular San Ysidro
  PED_WEST    →  peatonal San Ysidro
  OTAY        →  Otay Mesa vehicular
  TECATE      →  Tecate vehicular

Colores de marca GaritaFlow:
  Verde:  #00834F   (Colors.green)
  Navy:   #071E5B   (Colors.navyGarita)
  Azul:   #0B5EFF   (Colors.blueFlow)

Auth: JWT 30 días, storage web-compatible (localStorage / SecureStore)
Nav:  React Navigation v6, Stack root + BottomTabs main, headerShown: false en todo
```

---

## Cómo arrancar mañana

```bash
# Terminal 1 — API
cd C:\GaritaFlowAPP\garitaflow-api
npm run dev

# Terminal 2 — App
cd C:\GaritaFlowAPP\garitaflow-app
npx expo start --web   # para probar en browser
# o  npx expo start    # para Expo Go en móvil
```

Luego abrir el proyecto en Cowork y decirle a Claude:
> "Retomamos GaritaFlow — ya elegí la opción [A/B/C] para el rediseño visual."
