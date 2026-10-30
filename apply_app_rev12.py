#!/usr/bin/env python3
"""
apply_app_rev12.py - parche de la APP, iteracion 11, parte 2. Se aplica DESPUES de apply_app_rev11.py (commit 3838657).
  R11-02  REV10-02 historial, caso "escribir + pulsar Buscar + tocar un resultado": ya no queda el texto escrito ademas
          del resultado (zona, usuario, ficha, post o reel). Solo se retiran los borradores que esa misma visita al
          buscador creo. Un texto buscado al que no sigue ningun resultado se sigue guardando como hoy.
          Una busqueda vieja repetida desde el historial no se toca.

USO (desde la raiz del repo):
    python apply_app_rev12.py src --dry-run
    python apply_app_rev12.py src

Reglas: ancla exacta (debe aparecer 1 vez, si no ABORTA sin escribir nada), respeta CRLF/LF y BOM, idempotente, solo ASCII.
"""
import sys, os, re, argparse, hashlib


def dec(s):
    return re.sub(r"@@u([0-9a-f]{4})@@", lambda m: chr(int(m.group(1), 16)), s)


def rx(s):
    """Regex que acepta CRLF o LF en cada salto de linea (para archivos con finales de linea mezclados)."""
    return re.compile(r"\r?\n".join(re.escape(p) for p in s.split("\n")))


def norm_hash(txt):
    t = txt.replace("\r\n", "\n")
    if t.endswith("\n"):
        t = t.rstrip("\n") + "\n"
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


PATCHES = [
('R11-02', 'store/searchStore.ts',
r"""  clearSearch: () => void;
  setCurrentSearchId: (id: string | null) => void;
}""",
r"""  clearSearch: () => void;
  setCurrentSearchId: (id: string | null) => void;
  discardDraft: (id: string, userId: string) => Promise<void>;
}"""),
('R11-02', 'store/searchStore.ts',
r"""  clearSearch: () => {
    set({ currentSearchId: null, currentQuery: '', isUpdating: false });
  },
""",
r"""  clearSearch: () => {
    set({ currentSearchId: null, currentQuery: '', isUpdating: false });
  },

  // REV11-02: al elegir un resultado despues de escribir + Buscar, el borrador con el texto escrito se retira del historial
  // (queda solo el resultado). Solo toca filas de tipo "draft" del propio usuario; es un borrado suave (deleted_at).
  // No recarga el historial: se quita de la cache y asi no pisa la fila de la zona que el mapa esta guardando.
  discardDraft: async (id: string, userId: string): Promise<void> => {
    queryClient.setQueryData<HistorialBusqueda[]>(
      ['searchHistory', userId],
      (old: HistorialBusqueda[] | undefined) => old?.filter((item: HistorialBusqueda) => item.id !== id)
    );
    const { error } = await supabase
      .from('historial_busquedas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('usuario_id', userId)
      .eq('tipo_busqueda', TIPO_BUSQUEDA.DRAFT);
    if (error) {
      console.error('[SearchStore] Error discarding draft:', error);
      queryClient.invalidateQueries({ queryKey: ['searchHistory', userId] });
    }
    // Que la busqueda actual no siga apuntando a una fila ya retirada (el mapa actualizaria una fila oculta y no
    // registraria la siguiente busqueda).
    if (get().currentSearchId === id) {
      set({ currentSearchId: null, currentQuery: '' });
    }
  },
"""),
('R11-02', 'components/search/SearchOverlay.tsx',
r"""  const { startSearch, createSearchFromResult, touchTimestamp, setCurrentSearchId } = useSearchStore();
""",
r"""  const { startSearch, createSearchFromResult, touchTimestamp, setCurrentSearchId, discardDraft } = useSearchStore();
  // REV11-02: borradores que esta visita al buscador creo al pulsar Buscar (se retiran si luego se elige un resultado).
  const borradoresRef = useRef<Promise<string | undefined>[]>([]);
"""),
('R11-02', 'components/search/SearchOverlay.tsx',
r"""    startSearch(q, userId).catch((e) => {
""",
r"""    const creando = startSearch(q, userId);
    borradoresRef.current.push(creando.then((id: string) => id, () => undefined));
    creando.catch((e) => {
"""),
('R11-02', 'components/search/SearchOverlay.tsx',
r"""      // REV10-02 / REV11-01: una zona elegida desde el feed la registra el MAPA (createSearchFromMap, con su chip y sus
""",
r"""      // REV11-02: una busqueda debe quedar UNA sola vez en el historial. Si se escribio y se pulso Buscar en el teclado,
      // esa visita creo un borrador con el texto; al elegir un resultado (zona, usuario, ficha, post o reel) el resultado
      // lo reemplaza. Solo se retiran los borradores creados en esta visita; los de visitas anteriores no se tocan.
      if (userId && borradoresRef.current.length > 0) {
        const pendientes = borradoresRef.current;
        borradoresRef.current = [];
        try {
          const ids = await Promise.all(pendientes);
          await Promise.all(ids.map((id: string | undefined) => (id ? discardDraft(id, userId) : undefined)));
        } catch (e) {
          console.error('[SearchOverlay] Error discarding draft:', e);
        }
      }

      // REV10-02 / REV11-01: una zona elegida desde el feed la registra el MAPA (createSearchFromMap, con su chip y sus
"""),
('R11-02', 'components/search/SearchOverlay.tsx',
r"""    setExpandedSections(new Set());
    setCurrentSearchId(null);
    onClose();""",
r"""    setExpandedSections(new Set());
    setCurrentSearchId(null);
    borradoresRef.current = [];
    onClose();"""),
('R11-02', 'components/search/SearchOverlay.tsx',
r"""    if (visible) {
      setQuery(initialQuery);
      setExpandedSections(new Set());
      setActiveTab("todos");
    }""",
r"""    if (visible) {
      setQuery(initialQuery);
      setExpandedSections(new Set());
      setActiveTab("todos");
      borradoresRef.current = [];
    }"""),
]

# (id, ruta, hash_del_original_o_None, contenido_nuevo)
FILES = [
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", help="carpeta src/ del proyecto")
    ap.add_argument("--only", default="", help="IDs separados por coma, p. ej. LEG-03,LEG-04")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    only = {s.strip() for s in a.only.split(",") if s.strip()}
    if not os.path.isdir(a.root):
        print("ERROR: no existe la carpeta %r (ejecuta desde la raiz del repo y pasa 'src')" % a.root)
        sys.exit(2)
    known = {p[0] for p in PATCHES} | {f[0] for f in FILES}
    unknown = only - known
    if unknown:
        print("ERROR: id(s) desconocido(s): %s" % ", ".join(sorted(unknown)))
        sys.exit(2)
    cache = {}
    report = []
    errors = []
    writes = []  # (ruta, bytes)

    for issue, rel, old, new in PATCHES:
        if only and issue not in only:
            continue
        old = dec(old)
        new = dec(new)
        path = os.path.join(a.root, rel)
        if rel not in cache:
            if not os.path.isfile(path):
                errors.append("%s: NO EXISTE %s" % (issue, rel))
                continue
            raw = open(path, "rb").read().decode("utf-8")
            crlf = raw.count("\r\n")
            lf = raw.count("\n")
            mixed = crlf not in (0, lf)
            dominant = "\r\n" if crlf * 2 >= lf else "\n"
            cache[rel] = {"eol": dominant, "mixed": mixed, "changed": False,
                          "text": raw if mixed else raw.replace("\r\n", "\n")}
        st = cache[rel]
        text = st["text"]
        if st["mixed"]:
            if (rx(new).search(text) if new else not rx(old).search(text)):
                report.append((issue, rel, "YA APLICADO"))
                continue
            found = list(rx(old).finditer(text))
            if len(found) != 1:
                errors.append("%s: ancla encontrada %d veces (se esperaba 1) en %s -> %r" % (issue, len(found), rel, old[:80]))
                continue
            m = found[0]
            st["text"] = text[:m.start()] + new.replace("\n", st["eol"]) + text[m.end():]
            st["changed"] = True
            report.append((issue, rel, "OK (EOL mixto)"))
            continue
        if (new in text) if new else (old not in text):
            report.append((issue, rel, "YA APLICADO"))
            continue
        n = text.count(old)
        if n != 1:
            errors.append("%s: ancla encontrada %d veces (se esperaba 1) en %s -> %r" % (issue, n, rel, old[:80]))
            continue
        st["text"] = text.replace(old, new, 1)
        st["changed"] = True
        report.append((issue, rel, "OK"))

    for issue, rel, orig_hash, content in FILES:
        if only and issue not in only:
            continue
        content = dec(content)
        path = os.path.join(a.root, rel)
        if not os.path.isfile(path):
            if orig_hash is not None:
                errors.append("%s: NO EXISTE %s (se esperaba el archivo original)" % (issue, rel))
                continue
            writes.append((path, content.replace("\r\n", "\n").encode("utf-8")))
            report.append((issue, rel, "NUEVO"))
            continue
        raw = open(path, "rb").read().decode("utf-8")
        eol = "\r\n" if raw.count("\r\n") else "\n"
        cur = raw.replace("\r\n", "\n")
        if norm_hash(cur) == norm_hash(content):
            report.append((issue, rel, "YA APLICADO"))
            continue
        if orig_hash is None:
            errors.append("%s: %s ya existe y es distinto al esperado; no se sobreescribe" % (issue, rel))
            continue
        if norm_hash(cur) != orig_hash:
            errors.append("%s: %s no coincide con el original esperado (alguien lo cambio); no se sobreescribe" % (issue, rel))
            continue
        writes.append((path, content.replace("\r\n", "\n").replace("\n", eol).encode("utf-8")))
        report.append((issue, rel, "REEMPLAZADO"))

    for r in report:
        print("%-9s %-58s %s" % r)
    n_ok = sum(1 for r in report if r[2].startswith("OK") or r[2] in ("NUEVO", "REEMPLAZADO"))
    n_done = sum(1 for r in report if r[2] == "YA APLICADO")
    print("\nRESUMEN: %d cambios OK, %d YA APLICADO, %d errores" % (n_ok, n_done, len(errors)))

    if errors:
        print("\nERRORES (no se escribio NADA):")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    if a.dry_run:
        print("\nDRY-RUN: anclas verificadas, no se escribio nada.")
        return

    for rel, st in cache.items():
        if not st["changed"]:
            continue
        data = (st["text"] if st["mixed"] else st["text"].replace("\n", st["eol"])).encode("utf-8")
        with open(os.path.join(a.root, rel), "wb") as fh:
            fh.write(data)
        print("escrito:", rel)
    for path, data in writes:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data)
        print("escrito:", os.path.relpath(path, a.root))
    print("\nListo.")


if __name__ == "__main__":
    main()
