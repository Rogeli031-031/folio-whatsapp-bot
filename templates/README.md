# Plantilla PDF Póliza Cheque

Para que el sistema genere la **Póliza Cheque** con el formato oficial, la plantilla se puede guardar en **S3** (recomendado) o en esta carpeta local.

---

## Opción 1: Plantilla en S3 (recomendado, sirve en cualquier PC)

1. Sube tu **Formato Poliza.pdf** al mismo bucket de Amazon S3 que ya usas (cotizaciones, pólizas).
2. Usa una ruta fija, por ejemplo: **`plantillas/formato-poliza.pdf`**
3. En el servidor (variables de entorno), define:
   ```bash
   POLIZA_TEMPLATE_S3_KEY=plantillas/formato-poliza.pdf
   ```
4. No hace falta tener el PDF en cada computadora; el servidor descargará la plantilla desde S3 al generar cada póliza.

**Subir el archivo a S3:** desde la consola de AWS S3, crea la carpeta `plantillas` en tu bucket y sube ahí el PDF con el nombre `formato-poliza.pdf`. O con AWS CLI:
```bash
aws s3 cp "Formato Poliza.pdf" s3://TU-BUCKET/plantillas/formato-poliza.pdf
```

---

## Opción 2: Plantilla en esta carpeta (local)

1. Copia tu **Formato Poliza.pdf** en esta carpeta.
2. Nómbralo exactamente: **formato-poliza.pdf**

```
templates/
  formato-poliza.pdf   ← tu formato oficial
  README.md
```

---

## Opción 3: Ruta local absoluta

Variable de entorno:
```bash
POLIZA_TEMPLATE_PATH=C:\MisDocs\Formato Poliza.pdf
```

---

**Orden de uso:** el servidor intenta primero S3 (`POLIZA_TEMPLATE_S3_KEY`), luego la ruta local absoluta o `templates/formato-poliza.pdf`, y si no encuentra ninguna, genera la póliza con el layout por código.
