# Fuentes RAG Visual — imágenes de referencia

24 imágenes de diseños de invitaciones **listas para subir a la biblioteca del
RAG Visual** (Admin → RAG Visual → Biblioteca → arrastrar). Al subirlas, el
análisis IA les genera automáticamente estilo, paleta, tags y aptitud; luego
activas el método visual y los clientes eligen su diseño favorito en el
generador.

**Abre `index.html` para verlas todas con descripción.**

| Carpeta | Cantidad | Contenido |
|---|---|---|
| `xv/` | 4 | Arco dorado + tiara morada, mariposas/princesa, glitter laser-cut, moño lavanda sobre mármol |
| `boda/` | 8 | Arco floral acuarela, azul floral, rosa/beige, tela+flor blanca, hortensias azules, navy laser-cut, oro botánico, glicina morada |
| `baby-shower/` | 3 | Tarjetas florales apiladas, peonías rojas sobre rosa, otoño con moño |
| `bautizo/` | 3 | Navy floral, griega azul+oro, corona floral sobre encaje |
| `comunion/` | 2 | Cáliz dorado, espejadas oro/plata con cruz |
| `cumpleanos/` | 4 | 50 fabulous oro, 18 floral rosa, negro/oro 60, confeti dorado 25 |

- `manifest.json` — lista estructurada (categoría, archivo, KB, descripción y fuente).
- Todas verificadas como JPEG/PNG válidos y ≥ 70 KB.
- Las de comunión traen un logo pequeño de la fuente (Canva/proveedor) en una
  esquina; sirven como referencia de estilo igualmente.

## Cómo usarlas

1. Admin → **RAG Visual** → *Biblioteca RAG Visual* → arrastra las imágenes
   (o carpetas completas) — cada una se analiza con IA al subir.
2. Configura el proveedor (Gemini u OpenAI-compatible) y pasa el **test de visión**.
3. Activa el **método visual** — los clientes verán el rack "Elige el diseño de
   tus sueños" en el generador.
