# Análisis ético de Clicbiota

## Caso

Una ficha por país presenta especies y un número de registros georreferenciados publicados. Si una persona interpreta ese número como cantidad de animales o plantas existentes, o toma el nombre de la ficha como prueba de que la especie es nativa, la interfaz puede inducir a una conclusión equivocada. Además, un mapa que mostrara observaciones individuales podría revelar la ubicación de especies o sitios sensibles.

## Personas, comunidades y entornos afectados

- Estudiantes y público general que usan la página para aprender.
- Instituciones, investigadores y observadores cuyos datos se agregan en GBIF.
- Comunidades locales e indígenas relacionadas con los territorios y el conocimiento ecológico.
- Especies y ecosistemas, si se divulgaran puntos de observación vulnerables.
- Personas con baja visión, daltonismo, movilidad limitada o que no pueden usar un control de arrastre.

## Alternativas consideradas

1. **Mostrar el número sin contexto.** Es simple de comparar, pero puede confundirse con abundancia y no comunica el sesgo de cobertura.
2. **Mostrar registros individuales con coordenadas.** Facilita revisar cada observación, pero aumenta la posibilidad de exponer ubicaciones sensibles y abruma la lectura de un prototipo escolar.
3. **Mostrar una selección agregada por país y grupo, acompañada de una explicación y enlaces a la fuente.** Mantiene una exploración comprensible y limita la exposición de ubicaciones precisas, aunque no sustituye una descarga científica con cita formal.

## Decisión justificada

Clicbiota aplica la tercera alternativa. La versión incluida contiene registros agregados por país y reino (Plantae y Animalia); presenta hasta ocho nombres por grupo de acuerdo con el número de registros georreferenciados y, cuando hay dato disponible, muestra el nombre común junto al científico. No publica coordenadas individuales. La ficha aclara que el número representa registros publicados, no individuos, abundancia ni estatus nativo, y enlaza a GBIF para revisar la consulta.

La selección de país se realiza con una lista accesible además del globo, para que el movimiento de arrastre no sea la única forma de explorar. El prototipo no pide crear una cuenta ni acceder a la ubicación del dispositivo y no guarda un historial de selección. Como el sitio carga bibliotecas, tipografía y geometrías desde servicios externos, esos servicios reciben las solicitudes técnicas habituales del navegador. La selección de un país carga un archivo JSON desde el sitio.

## Límites que comunicamos

- Los datos disponibles en GBIF no tienen cobertura uniforme; un recuento bajo puede significar menos publicación o esfuerzo de observación, no menor abundancia.
- Los registros pueden incluir especies introducidas, cultivadas o naturalizadas; el conteo no identifica por sí mismo si una especie es nativa.
- Los nombres comunes varían por idioma y fuente. Se conserva la fuente del nombre cuando GBIF la publica; si no hay nombre común, la ficha lo indica.
- Los datos de ocurrencia mantienen las licencias fijadas por sus publicadores. El prototipo consulta facetas agregadas de la API, no genera un DOI de descarga ni expone la atribución de cada conjunto y publicador. Por ello, es material educativo exploratorio, no una descarga adecuada para análisis científico formal. Para una reutilización de investigación se debe hacer una descarga con DOI, conservar los identificadores y licencias de cada conjunto, y citar a sus publicadores.
- El catálogo incluido es una instantánea del 19 de noviembre de 2026 (hora de Ciudad de México); puede quedar desactualizado.
- La interfaz usa texto legible, controles con etiquetas y selector alternativo. Es una medida de inclusión, no una certificación WCAG; una versión futura debe probar teclado, contraste y lector de pantalla con usuarios.

## Conclusión

Se prioriza que la información sea útil sin presentar los recuentos como verdades ecológicas completas ni divulgar puntos sensibles. La decisión combina contexto, atribución y una vía de verificación; los límites se hacen visibles y se propone trazabilidad por DOI como mejora antes de cualquier uso de investigación.

## Referencias consultadas

- GBIF, acuerdo de uso de datos: https://www.gbif.org/terms/data-user
- GBIF, guía de citación: https://www.gbif.org/citation-guidelines
- GBIF, documentación de Occurrence API: https://techdocs.gbif.org/en/openapi/v1/occurrence
- GBIF, documentación de Species API: https://techdocs.gbif.org/en/openapi/v1/species
- Natural Earth, términos de uso: https://www.naturalearthdata.com/about/terms-of-use/
