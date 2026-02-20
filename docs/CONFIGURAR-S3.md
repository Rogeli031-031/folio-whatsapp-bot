# Cómo configurar AWS S3 para el bot de folios

Con S3 configurado, los PDF de cotizaciones y proyectos se guardan en tu bucket y el bot puede evitar duplicados, validar importes y usar aprobación CDMX.

---

## 1. Crear una cuenta AWS (si no tienes)

1. Entra a [https://aws.amazon.com](https://aws.amazon.com) y crea una cuenta.
2. Inicia sesión en la **Consola de AWS**.

---

## 2. Crear un usuario IAM para el bot (recomendado)

No uses la clave de la cuenta raíz. Crea un usuario solo para el bot:

1. En la consola AWS, ve a **IAM** → **Usuarios** → **Crear usuario**.
2. Nombre sugerido: `folio-bot-s3`.
3. En **Permisos**, elige **Adjuntar políticas directamente** y busca **AmazonS3FullAccess** (o crea una política más restrictiva solo para tu bucket).
4. Crea el usuario y luego entra a él → pestaña **Credenciales de seguridad** → **Crear clave de acceso**.
5. Elige **Tipo: Clave de acceso para uso en código/CLI**.
6. **Guarda en un lugar seguro**:
   - **ID de clave de acceso** → será `AWS_ACCESS_KEY_ID`
   - **Clave de acceso secreta** → será `AWS_SECRET_ACCESS_KEY`  
   (solo se muestra una vez).

---

## 3. Crear el bucket S3

1. En la consola AWS, ve a **S3** → **Crear bucket**.
2. **Nombre del bucket**: uno único globalmente (ej: `mi-empresa-folios-bot-2025`).
3. **Región**: elige la más cercana (ej: `us-east-1` o `us-east-2`). Anótala para `AWS_REGION`.
4. **Opciones**:
   - Bloquear acceso público si quieres que solo el bot acceda por URL firmada (recomendado).
   - O desbloquear si quieres URLs públicas (menos seguro).
5. Crear bucket.

---

## 4. Variables de entorno que usa el bot

El bot espera estas variables (todas necesarias para S3):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | ID de la clave de acceso IAM | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Clave secreta IAM | `wJalrXUtnFEMI/K7MDENG/...` |
| `AWS_REGION` | Región del bucket | `us-east-1` |
| `S3_BUCKET_NAME` | Nombre del bucket | `mi-empresa-folios-bot-2025` |

También se acepta **`S3_BUCKET`** en lugar de `S3_BUCKET_NAME`.

---

## 5. Dónde configurarlas

### En tu máquina (desarrollo local)

1. En la raíz del proyecto crea un archivo **`.env`** (no lo subas a Git).
2. Añade algo como:

```env
# Base de datos (ya las tienes)
DATABASE_URL=postgresql://...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=...

# S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=mi-empresa-folios-bot-2025
```

3. Si tu `server.js` no carga `.env`, instala y usa `dotenv` al inicio:

```bash
npm install dotenv
```

Y en la primera línea de `server.js` (después de "use strict"):

```js
require("dotenv").config();
```

### En Render (producción)

1. Entra a tu **Service** en Render.
2. **Environment** → **Environment Variables**.
3. Añade cada variable:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`
4. Guarda. Render reiniciará el servicio con las nuevas variables.

---

## 6. Comprobar que funciona

1. Reinicia el bot (o despliega de nuevo en Render).
2. Desde WhatsApp: **Adjuntar F-YYYYMM-XXX** y envía un PDF.
3. En la consola del bot deberías ver logs como `[PDF] Descargando` y `[HASH] sha256=...`.
4. En S3, en tu bucket, revisa la carpeta **cotizaciones/** y que aparezca el archivo subido.

Si no ves esos logs o el PDF no aparece en S3, revisa que las cuatro variables estén bien escritas y que el usuario IAM tenga permisos sobre ese bucket.

---

## Resumen rápido

1. Crear usuario IAM y obtener **Access Key ID** y **Secret Access Key**.
2. Crear bucket S3 y anotar **nombre** y **región**.
3. Definir `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` y `S3_BUCKET_NAME` (o `S3_BUCKET`) en tu entorno (`.env` o Render).
4. Reiniciar el bot y probar adjuntando un PDF a un folio.
