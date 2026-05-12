/** Clasifica categoría ARR (Casa vs Comisionista), sin acentos — misma regla que el resumen ARR / DICF. */
export function categoriaEsComisionista(categoria: string): boolean {
  const n = String(categoria || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return n.includes("comisionista");
}

export function dicfClienteEsComisionista(c: {
  canal?: string;
  subcanal?: string;
}): boolean {
  return (
    categoriaEsComisionista(c.canal || "") || categoriaEsComisionista(c.subcanal || "")
  );
}
