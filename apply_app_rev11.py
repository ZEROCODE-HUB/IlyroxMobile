#!/usr/bin/env python3
"""
apply_app_rev11.py - parche de la APP, iteracion 11. Se aplica sobre el commit ed5e84f (o posterior).
  R11-01  REV10-02 historial: elegir una zona en el buscador del feed dejaba DOS filas (una sin chip y otra con chip).
          Una zona la registra el mapa (con su chip y sus coordenadas); el buscador ya no la guarda por su cuenta.
          Usuarios, fichas, posts y reels se siguen guardando igual que antes.

USO (desde la raiz del repo):
    python apply_app_rev11.py src --dry-run
    python apply_app_rev11.py src

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
('R11-01', 'components/search/SearchOverlay.tsx',
r"""      if (userId && (resultData?.name || resultData?.resultadoTitulo)) {
        await createSearchFromResult({ ...resultData, tipo }, userId);
      }
""",
r"""      // REV10-02 / REV11-01: una zona elegida desde el feed la registra el MAPA (createSearchFromMap, con su chip y sus
      // coordenadas). Guardarla tambien aqui dejaba dos filas en el historial. Los demas tipos (usuario, ficha, post,
      // reel) se siguen guardando aqui, igual que antes.
      if (tipo !== TIPO_BUSQUEDA.UBICACION && userId && (resultData?.name || resultData?.resultadoTitulo)) {
        await createSearchFromResult({ ...resultData, tipo }, userId);
      }
"""),
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
