# GaritaFlow 2.0 — Mobile App

Aplicación móvil (iOS/Android) + API Express para la plataforma GaritaFlow de tiempos de cruce fronterizo.

---

## Estructura del proyecto

```
GaritaFlowAPP/
├── garitaflow-api/   # Express.js + TypeScript — API REST
└── garitaflow-app/   # Expo React Native — App móvil
```

---

## garitaflow-api

### Setup

```bash
cd garitaflow-api
npm install
```

### Variables de entorno

Copia `.env.example` a `.env` y llena los valores:

```env
DATABASE_URL=postgresql://...    # Railway PostgreSQL
JWT_SECRET=tu_secreto_jwt
PORT=3001
NODE_ENV=development
CRON_SECRET=tu_secreto_cron
```

### Ejecutar en desarrollo

```bash
npm run dev
```

La API corre en `http://localhost:3001`

### Migración de base de datos (PASO OBLIGATORIO)

Ejecuta la migración para agregar tablas `push_tokens` y `user_alerts`:

```bash
npm run migrate
```

O copia el contenido de `src/lib/migration_v2.sql` al Railway Console > PostgreSQL > Query.

### Build para producción

```bash
npm run build
npm start
```

### Endpoints disponibles

| Method | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | /auth/register | ❌ | Crear cuenta con email |
| POST | /auth/login | ❌ | Login con email |
| POST | /auth/google | ❌ | Login con Google |
| GET | /auth/me | ✅ | Mi perfil completo |
| GET | /ports | ✅ | Listar puertos |
| GET | /flow-index | ✅ | Flow Index todos los puertos |
| GET | /flow-index/:portId | ✅ | Flow Index un puerto |
| GET | /flow-index/:portId/history | ✅ | Historial de scores |
| POST | /crossings/start | ✅ | Iniciar cruce |
| POST | /crossings/:id/end | ✅ | Terminar cruce |
| GET | /crossings/active | ✅ | Cruce activo |
| GET | /crossings/history | ✅ | Historial de cruces |
| GET | /flow-events/:portId | ✅ | Eventos recientes |
| POST | /flow-events | ✅ | Reportar evento |
| POST | /flow-events/:id/confirm | ✅ | Confirmar evento |
| GET | /profile | ✅ | Mi perfil |
| PATCH | /profile | ✅ | Actualizar preferencias |
| POST | /push-tokens | ✅ | Registrar push token |
| DELETE | /push-tokens/:token | ✅ | Eliminar push token |
| GET | /alerts | ✅ | Mis alertas |
| PUT | /alerts/:portId | ✅ | Crear/actualizar alerta |
| DELETE | /alerts/:portId | ✅ | Eliminar alerta |
| POST | /cron/refresh-flow-index | 🔐 | Refrescar cache (cron) |
| POST | /cron/cleanup | 🔐 | Limpiar datos viejos |
| GET | /cron/health | ❌ | Health check |

✅ = Bearer JWT token requerido  
🔐 = Header `x-cron-secret` requerido

---

## garitaflow-app

### Requisitos previos

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Para iOS: Mac con Xcode + Simulator
- Para Android: Android Studio + Emulator o dispositivo físico

### Setup

```bash
cd garitaflow-app
npm install
```

### Configurar API URL

En `src/lib/api.ts` cambia `BASE_URL` según el entorno:

```typescript
const BASE_URL = __DEV__
  ? 'http://localhost:3001'           // Desarrollo local
  : 'https://tu-api.up.railway.app';  // Producción Railway
```

### Ejecutar

```bash
# Iniciar servidor Expo
npm start

# iOS (Mac requerido)
npm run ios

# Android
npm run android
```

### Flujo de pantallas

```
Splash → Welcome → Login/Register
                           ↓ (primer registro)
                    Personalización → Notificaciones → Ubicación
                                                           ↓
                                                        Home ⇄ Perfil
                                                          ↓
                                                    Cruce Activo
                                                          ↓
                                                    Reportar → Reporte Enviado
```

### Deploy con EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

---

## Arquitectura

- **DB**: Railway PostgreSQL (shared con web app Next.js, sin tocarlo)
- **Pool**: max 8 conexiones en la API (Railway $5 = 10 conexiones totales)
- **Auth**: JWT 30 días — almacenado en SecureStore (iOS Keychain)
- **Polling**: Flow Index cada 30s, sin Supabase Realtime
- **Geofence**: expo-location "When In Use" — cronómetro termina automáticamente
- **Push**: expo-notifications — tokens guardados en push_tokens table

## ⚠️ Importante

- El `.env` NO se sube a git (incluido en `.gitignore`)
- La web app Next.js en Railway NO se modifica — API y app corren en nuevo servicio
- `CRON_SECRET` debe configurarse también en Railway (Variables de entorno del servicio API)
