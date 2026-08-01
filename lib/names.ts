/** "Emiliano Erginos" -> "Emiliano" */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Nombres cortos para mostrar en listas apretadas.
 *
 * Usa el nombre de pila, salvo que dos personas del mismo grupo lo compartan:
 * en ese caso agrega la inicial del apellido para poder distinguirlas
 * ("Martín P." y "Martín S." en vez de dos "Martín").
 */
export function shortNames<T extends { id: string; name: string }>(
  people: T[],
): Map<string, string> {
  const repeated = new Map<string, number>();
  for (const person of people) {
    const first = firstName(person.name);
    repeated.set(first, (repeated.get(first) ?? 0) + 1);
  }

  const result = new Map<string, string>();
  for (const person of people) {
    const first = firstName(person.name);
    if ((repeated.get(first) ?? 0) <= 1) {
      result.set(person.id, first);
      continue;
    }
    const rest = person.name.trim().split(/\s+/).slice(1);
    result.set(person.id, rest.length > 0 ? `${first} ${rest[rest.length - 1][0].toUpperCase()}.` : first);
  }

  return result;
}
