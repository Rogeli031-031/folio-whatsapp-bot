/** Normaliza texto de canal/categoría ARR (sin acentos, minúsculas). */
function normalizarCategoria(categoria: string): string {
  return String(categoria || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Clasifica canal ARR (Casa vs Comisionista).
 * Solo el canal determina la categoría — el subcanal es una subetiqueta y no debe
 * reclasificar (p. ej. un cliente Casa con subcanal que mencione otra cosa).
 * Vacío / desconocido ≡ Casa (misma regla que COALESCE(canal,'Casa') y el resumen ARR).
 */
export function categoriaEsComisionista(categoria: string): boolean {
  const n = normalizarCategoria(categoria);
  if (!n) return false;
  return n === "comisionista" || n.startsWith("comisionista ") || n.includes(" comisionista");
}

export function dicfClienteEsComisionista(c: {
  canal?: string;
  subcanal?: string;
}): boolean {
  // Subcanal no define Casa/Comisionista; solo el canal.
  return categoriaEsComisionista(c.canal || "");
}

/** Clases Tailwind para el nombre de cliente: amarillo Casa, azul Comisionista. */
export function claseColorNombreClientePorCategoria(categoria: string): string {
  if (categoriaEsComisionista(categoria)) {
    return "text-blue-400 hover:text-blue-300";
  }
  return "text-yellow-300 hover:text-yellow-200";
}
