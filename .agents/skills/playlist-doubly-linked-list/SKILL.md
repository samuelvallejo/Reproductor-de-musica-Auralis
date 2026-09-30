---
name: playlist-doubly-linked-list
description: "Implement or review the TypeScript music playlist's real doubly linked list, insertion/removal behavior, current-node navigation, serialization, and structural invariants. Use for playlist-domain changes."
---

# Lista doblemente enlazada y cursor

Lee [el contrato del dominio](../../../docs/domain-contract.md). Implementa las decisiones allí definidas mediante nodos con referencias reales `previous` y `next`. Mantén este paquete independiente de infraestructura y UI.

## Operaciones

Separa la estructura genérica `DoublyLinkedList<T>` del controlador de selección y reproducción. Obtén identificadores por un generador inyectable o una abstracción compatible con los runtimes elegidos. No confundas el ID de Spotify con el ID de un nodo.

Para insertar en el interior, localiza vecinos, enlaza el nuevo nodo en ambas direcciones y actualiza tamaño; para extremos, actualiza también `head` o `tail`. Valida posición antes de crear efectos observables. Para retirar, captura vecinos antes de limpiar referencias, conecta ambos lados y actualiza extremos y cursor mediante el controlador.

Los arrays son válidos como snapshots obtenidos recorriendo enlaces. No uses `splice`, un índice actual ni una librería de listas como implementación del taller. Un `Map` opcional puede acelerar la búsqueda por ID, pero no sustituye los enlaces y debe mantenerse durante insertar, retirar, limpiar y rehidratar.

Expón snapshots de depuración con IDs de vecino y del actual; evita entregar referencias mutables del dominio a los componentes. La UI puede mostrar `null ← A ⇄ B ⇄ C → null` como ayuda académica, generada desde la misma lista y no desde una simulación aparte.

## Pruebas que demuestran corrección

- Listas vacía, de un nodo y de varios; inserciones al inicio, final e interior; entradas inválidas sin mutación parcial.
- Retirar cabeza, cola, interior y último nodo; retirar el actual con sucesor y sin sucesor; ID inexistente sin modificar la lista.
- Duplicados con IDs distintos; límites de navegación; selección y cambio de playlist.
- Orden inverso igual al orden directo invertido, enlaces recíprocos, extremos, tamaño y ausencia de ciclos tras secuencias de ediciones.
- Roundtrip de persistencia con orden, IDs y cursor conservados; rechazo controlado de snapshots corruptos.

Usa un arreglo como oráculo externo en las pruebas si ayuda a comparar operaciones aleatorias, nunca como implementación del dominio. Comprueba las invariantes después de cada mutación en pruebas. Incluye una explicación en inglés dentro del código de los costes relevantes y una explicación en español para la entrega del taller.
