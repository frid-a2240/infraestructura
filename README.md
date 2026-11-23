# Sistema de Infraestructura ISP

Sistema de solicitudes de necesidades de infraestructura: formulario → aprobación/rechazo → calendario de ejercicio → historial, con un listado por prioridad (arrastrable) que muestra el avance (%) de cada solicitud aprobada, y recordatorios automáticos por correo cuando se acerca la fecha objetivo.

## Estructura

- `backend/` — Node.js + Express + PostgreSQL + Nodemailer (API REST, JWT, subida de imágenes).
- `frontend/` — React + Vite + Tailwind (login estandarizado, formulario, dashboard con gráficas, calendario, historial).

## Requisitos

- Node.js 18+
- PostgreSQL corriendo localmente con la base de datos `infraestructura` ya creada.

## 1. Backend

```bash
cd backend
npm install
npm run db:init          # crea las tablas y siembra a los admins iniciales
node src/db/seedEmpleados.js   # precarga el personal de ISP (ver abajo)
npm run dev               # http://localhost:4000
```

Las credenciales de PostgreSQL y del correo de notificaciones (Gmail) ya están en `backend/.env`. **Ese archivo no se sube a git** — usa `backend/.env.example` como plantilla si necesitas recrearlo en otra máquina.

### Roles

Solo existen tres:

- **admin** — aprueba/rechaza solicitudes, dashboard con gráficas, historial, notificaciones, y asigna quién es admin/colaborador en **Usuarios**.
- **colaborador** — personal de ISP; envía solicitudes y da seguimiento a las suyas. Es el rol por defecto de todo el personal precargado.
- **invitado** — gente externa (otras empresas, visitantes); se registra ella misma desde el login con su correo y contraseña.

### Personal de ISP precargado

`backend/src/db/empleados_isp.json` contiene el padrón completo (número de control, nombre, área) exportado de `empleados_isp.xlsx`. `node src/db/seedEmpleados.js` crea/actualiza a todos como **colaborador** con la contraseña genérica `123456` (primer ingreso les pide crearla). Es seguro correrlo varias veces: si el número de control ya existe, solo actualiza nombre/área — nunca toca el rol, la contraseña o si ya hizo su primer ingreso.

Para actualizar el padrón (altas/bajas de personal): reemplaza `empleados_isp.xlsx`, regenera el JSON (mismo formato: `[{clave, nombre, puesto, departamento}]`, con `nombre` en formato "APELLIDOS, NOMBRES") y vuelve a correr el script.

**Nadie fuera de este padrón puede entrar con número de control.** El admin ya no da de alta gente nueva manualmente — solo asigna el rol Administrador/Colaborador desde **Usuarios** a quien ya está en el padrón.

### Admins iniciales

`npm run db:init` crea a **Gilberto M.** (ID `203076`) y **Juan Lapizco** (ID `202244`) como admin con la contraseña genérica `123456`. Si `seedEmpleados.js` también los encuentra en el padrón (por su número de control), actualiza su nombre/área pero respeta que ya sean admin.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

`frontend/.env` apunta al backend en `http://localhost:4000` (`VITE_API_URL`).

## Flujo del sistema

1. **Login** — un solo campo acepta **número de control** (colaboradores/admins) **o correo** (invitados). Si es tu primer ingreso con número de control, el sistema te saluda ("Bienvenido Colaborador ISP") y te pide crear tu contraseña; de ahí en adelante entras con esa contraseña. Los invitados se registran una sola vez desde "Regístrate aquí" — si alguien intenta registrarse otra vez con el mismo correo, se le avisa que ya existe y se le manda a iniciar sesión.
2. **Nueva solicitud** — cualquier colaborador o invitado llena el Formato (nombre, área, imágenes, explicación de la necesidad) y se envía; los admins reciben un correo de notificación con diseño de marca.
3. **Solicitudes** (solo Admin) — bandeja de pendientes: **Aprobar** (eligiendo la fecha objetivo) o **Rechazar** (con motivo); el solicitante recibe un correo con el resultado. Debajo, el **Listado por prioridad** (arrastrable) de las solicitudes aprobadas activas.
4. **Dashboard** (solo Admin) — tarjetas resumen (pendientes / aprobadas activas / completadas / rechazadas) y gráficas: solicitudes por semana, distribución por estado, solicitudes por área.
5. **Calendario** — cada solicitud aprobada se marca en su fecha objetivo (no un rango), con color según urgencia.
6. **Notificaciones** (solo Admin) — actividades aprobadas pendientes por concluir, con recordatorio automático por correo cuando faltan 15 días o menos.
7. **Historial** (solo Admin) — aprobadas y rechazadas; las rechazadas tienen botones para **Reabrir** o **Eliminar permanentemente**; las aprobadas se pueden **Marcar como completada**.
8. **Usuarios** (solo Admin) — busca a cualquiera del padrón precargado y asígnale rol Administrador o Colaborador; también puede desactivar cuentas.

## Colores y tipografía institucionales

Tomados del logo real (`isp.jpg`) y el manual de marca: navy `#24334A` / botón `#1B2638`, teal `#00AFAA`. La tipografía de marca es **Mont** (peso **Mont Book** para texto normal según el manual). El CSS ya pide `'Mont'` primero en todo el sistema — hoy solo se ve si el navegador la tiene instalada localmente (por eso se ve distinto en Edge vs. Brave: las protecciones anti-fingerprinting de Brave bloquean esa detección de fuentes del sistema). Para que se vea igual en **cualquier** navegador y computadora, hace falta autohospedar la fuente: consigue los archivos `.woff2` de Mont (con licencia de uso web, normalmente los vende la fundidora junto con la licencia de escritorio), colócalos en `frontend/public/fonts/` y agrégalos con `@font-face` en `frontend/src/index.css` — dímelo cuando los tengas y lo conecto.
