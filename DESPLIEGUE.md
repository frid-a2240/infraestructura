# Despliegue del Sistema de Infraestructura en IIS (GACENSSV03)

Adaptación de *Guia_Despliegue_React_Python_IIS.docx* para este sistema. La diferencia principal: el backend
es **Node.js (Express)**, no Python. Por eso:

- No hay `venv`, `requirements.txt` ni `runserver.py`. IIS ejecuta `node.exe` directamente.
- Las dependencias se instalan con `npm ci`, en el servidor.
- El mismo backend sirve el build de React, igual que en la guía.

Al terminar, el sistema queda en **http://gacenssv03/infraestructura/**.

> El nombre `infraestructura` (alias de IIS) ya está configurado en el código. Si algún día se cambia, hay que
> cambiarlo en 4 lugares: `frontend/vite.config.js` (`PREFIJO_IIS`), `frontend/.env.production`
> (`VITE_API_URL`), `web.config` (`BASE_PATH`) y el alias en IIS.

---

## Requisitos en el servidor

- **Node.js 24 LTS** (la misma versión que la laptop). Se instala desde nodejs.org en `C:\Program Files\nodejs`.
  Verifícalo con `node --version`.
- IIS con **HttpPlatformHandler v1.2**, el mismo que ya usan las apps de Python.
- Git.
- PostgreSQL. Revisa la versión con `psql --version`.
- Salida a internet para `npm ci` y para mandar correos por `smtp.gmail.com`, puerto **465**.

---

## Parte 1 — Subir el código a GitHub (en la laptop)

El código ya trae los ajustes para producción, así que no hay que tocar archivos.

1. En GitHub crea un repositorio **privado** vacío (sin README, sin .gitignore). Por ejemplo, `infraestructura`.
2. En PowerShell, dentro de `C:\Users\frida.arroyo\Documents\ProgramasISP\infraestructura`:

   ```powershell
   git init
   git add .
   git status
   ```

   **Antes de seguir**, revisa que en la lista NO aparezca ninguno de estos:

   - `node_modules`
   - `backend/.env` o `frontend/.env`
   - `empleados_activos_2026-11-18.xlsx`
   - `backend/src/db/empleados_isp.json`
   - `backend/uploads`

   Si aparece alguno, avísame antes de hacer commit.

   ```powershell
   git commit -m "Versión inicial"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/infraestructura.git
   git push -u origin main
   ```

   Cuando te pida contraseña, usa un **Personal Access Token**, como dice la guía original.

---

## Parte 2 — Pasar la base de datos al servidor (mismo nombre: `infraestructura`)

### 2.1 Exportar en la laptop

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -d infraestructura `
  -F p --no-owner --no-privileges -f "$env:USERPROFILE\Desktop\infraestructura_backup.sql"
```

- Te pide la contraseña de PostgreSQL de la laptop.
- Deja `infraestructura_backup.sql` en el Escritorio.
- **No lo subas a git**, porque trae nombres, correos y contraseñas encriptadas. Cópialo al servidor por
  Remote Desktop o por una carpeta compartida.

### 2.2 Importar en el servidor

En PowerShell del servidor (cambia `18` por la versión de PostgreSQL del servidor):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres infraestructura
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d infraestructura -f "C:\ruta\a\infraestructura_backup.sql"
```

- Si el servidor tiene una versión de PostgreSQL **menor a 18**, pueden salir avisos como
  `invalid command \restrict` o `unrecognized configuration parameter "transaction_timeout"`. Son inofensivos:
  los datos se cargan igual.
- No uses "Restore" de pgAdmin con este archivo: Restore no acepta `.sql` de texto. Si prefieres pgAdmin, usa
  Query Tool → abrir el archivo → ejecutar.

Comprueba que llegó todo:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d infraestructura -c "SELECT COUNT(*) AS actividades FROM solicitudes;"
```

Debe decir **34**: las actividades traídas de Notion.

> Las fotos y PDF viven en `backend\uploads\`, no en la base. Hoy esa carpeta está vacía, así que no hay nada
> que copiar.

---

## Parte 3 — Instalar en el servidor

### 3.1 Traer el código

```powershell
cd D:\Aplicaciones\wwwroot
git clone https://github.com/TU-USUARIO/infraestructura.git
cd infraestructura
```

### 3.2 Instalar dependencias y compilar el frontend

```powershell
cd backend
npm ci --omit=dev
cd ..\frontend
npm ci
npm run build
cd ..
```

Esto crea `frontend\dist\`, que es lo que el backend sirve en producción.

> Si el servidor no tiene salida a internet para `npm`, avísame y lo armamos compilando en la laptop.

### 3.3 Crear `backend\.env` en el servidor

```powershell
copy backend\.env.example backend\.env
notepad backend\.env
```

Llénalo así:

| Variable | Valor en el servidor |
|---|---|
| `DB_PASSWORD` | La contraseña del PostgreSQL **del servidor** |
| `JWT_SECRET` | Uno **nuevo**. Genéralo con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SMTP_USER` / `SMTP_PASSWORD` | Los mismos de la laptop (`isp.amayacuriel@gmail.com` y su contraseña de aplicación) |
| `ADMIN_NOTIFY_EMAILS` | Los mismos de la laptop |
| `FRONTEND_URL` | `http://gacenssv03/infraestructura` |
| `PORT` | **Bórralo**: el puerto lo pone IIS |

Al usar un `JWT_SECRET` nuevo, todos tendrán que volver a iniciar sesión la primera vez. Es normal.

### 3.4 Crear `web.config` en la raíz del proyecto

```powershell
notepad web.config
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="NodeHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified" />
    </handlers>
    <httpPlatform
        processPath="C:\Program Files\nodejs\node.exe"
        arguments="D:\Aplicaciones\wwwroot\infraestructura\backend\src\server.js"
        stdoutLogEnabled="true"
        stdoutLogFile="D:\Aplicaciones\wwwroot\infraestructura\logs\node.log"
        startupTimeLimit="60"
        processesPerApplication="1">
      <environmentVariables>
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%" />
        <environmentVariable name="NODE_ENV" value="production" />
        <environmentVariable name="BASE_PATH" value="/infraestructura" />
      </environmentVariables>
    </httpPlatform>
    <security>
      <requestFiltering>
        <!-- Permite subir varios PDF de órdenes de trabajo a la vez (hasta ~200 MB por envío) -->
        <requestLimits maxAllowedContentLength="209715200" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

- Las rutas `D:\Aplicaciones\wwwroot\infraestructura\...` deben ser **exactamente** donde clonaste. Si no,
  sale el error 502 y no se genera log.
- Comprueba la ruta de Node con `(Get-Command node).Source`. Si no es `C:\Program Files\nodejs\node.exe`,
  pon la que salga.
- `processesPerApplication="1"` es **obligatorio**, a diferencia de la guía de Python que usa 16. Este backend
  manda los correos de recordatorio desde el propio proceso: con 16 procesos, cada recordatorio saldría
  repetido.

Crea la carpeta de logs:

```powershell
mkdir logs
```

### 3.5 IIS: sub-aplicación y Application Pool

Es igual que en la guía original. Usa:

- **Application Pool:** nombre `infraestructura`, **No Managed Code**, Integrated.
- **Sitio:** Default Web Site → Add Application… → Alias `infraestructura` → Physical path
  `D:\Aplicaciones\wwwroot\infraestructura` → Application pool `infraestructura`.

### 3.6 Permisos (PowerShell como Administrador)

```powershell
icacls "D:\Aplicaciones\wwwroot\infraestructura" /grant "IIS AppPool\infraestructura:(OI)(CI)F" /T
icacls "C:\Program Files\nodejs" /grant "IIS AppPool\infraestructura:(OI)(CI)RX" /T
```

El primero también permite guardar las fotos y los PDF en `backend\uploads\`.

### 3.7 Reiniciar y probar

```powershell
iisreset
```

1. **http://gacenssv03/infraestructura/api/health** debe mostrar `{"ok":true}`.
2. **http://gacenssv03/infraestructura/** debe mostrar el login.
3. Entra con un administrador y revisa que el Tablero muestre las 34 actividades.

---

## Parte 4 — Actualizar el sistema después (flujo diario)

**En la laptop**

```powershell
git add .
git commit -m "qué cambiaste"
git push
```

**En el servidor**

```powershell
cd D:\Aplicaciones\wwwroot\infraestructura
git pull
```

Después, según lo que haya cambiado:

- **Si cambió el backend** (o su `package.json`):

  ```powershell
  cd backend
  npm ci --omit=dev
  cd ..
  ```

- **Si cambió el frontend:**

  ```powershell
  cd frontend
  npm ci
  npm run build
  cd ..
  ```

- **Si hay un archivo nuevo `backend\src\db\migration_0XX.sql`:**

  ```powershell
  & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d infraestructura -f backend\src\db\migration_0XX.sql
  ```

Al final, siempre:

```powershell
iisreset
```

En la laptop todo sigue igual que siempre: `npm run dev` en `backend` y en `frontend`.

---

## Parte 5 — Problemas comunes

**502 y la carpeta `logs` vacía**
Las rutas de `web.config` no existen (`processPath`, `arguments` o `stdoutLogFile`). Corrígelas y haz
`iisreset`.

**502 con log en `logs\`**
Revisa el log con `Get-Content D:\Aplicaciones\wwwroot\infraestructura\logs\*.log -Tail 50`. Lo más común:

- Falta `backend\.env`.
- La contraseña de la base no es la del servidor.
- La base `infraestructura` no existe.

**500.19 (error de configuración 0x80070021)**

```powershell
C:\Windows\System32\inetsrv\appcmd.exe unlock config -section:system.webServer/handlers
iisreset
```

**502.3 Access denied**
Vuelve a correr los `icacls` de la sección 3.6.

**Página en blanco o "MIME type text/html"**
Es caché del navegador: Ctrl+Shift+R.

**Error 413 al subir PDF**
Falta el bloque `<requestLimits>` en `web.config`.

**No llegan los correos**
El servidor necesita salida a `smtp.gmail.com`, puerto 465. Revisa el log; aparecerá
`Error enviando correo: …`.

**Los links de los correos abren localhost**
Falta `FRONTEND_URL=http://gacenssv03/infraestructura` en `backend\.env`.

---

## Checklist rápido

**En la laptop**

- [ ] `git status` sin `node_modules`, `.env`, `.xlsx` ni `uploads`.
- [ ] `git push` al repo privado.
- [ ] `pg_dump` → `infraestructura_backup.sql`, copiado al servidor a mano.

**En el servidor**

- [ ] Node.js 24 instalado.
- [ ] `createdb infraestructura` + `psql -f infraestructura_backup.sql` (34 actividades).
- [ ] `git clone` en `D:\Aplicaciones\wwwroot\infraestructura`.
- [ ] `backend: npm ci --omit=dev` · `frontend: npm ci && npm run build`.
- [ ] `backend\.env` con la contraseña del servidor, `JWT_SECRET` nuevo, `FRONTEND_URL` y sin `PORT`.
- [ ] `web.config` con rutas reales y `processesPerApplication="1"`.
- [ ] `mkdir logs`.
- [ ] Application Pool `infraestructura` (No Managed Code) + sub-aplicación `infraestructura`.
- [ ] `icacls` (2 comandos).
- [ ] `iisreset` → `/infraestructura/api/health` y `/infraestructura/`.
