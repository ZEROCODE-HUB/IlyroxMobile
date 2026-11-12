#!/usr/bin/env python3
"""
apply_app_rev28.py - parche chico de la APP. Se aplica DESPUES de rev27.
  R28  Filtros del mapa: el mapa se actualiza con prioridad baja para que el chip "Sin clasificar" y el conteo respondan al instante.
USO:  python apply_app_rev28.py src --dry-run   y luego   python apply_app_rev28.py src
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
('R28-01', 'components/map/MapSearch.tsx',
'import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";',
'import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";'),
('R28-02', 'components/map/MapSearch.tsx',
'  // PINs de las ubicaciones seleccionadas: un marcador en el centro de cada chip',
'  // REV28 (#9): el mapa (marcadores) se actualiza con prioridad baja; asi el chip y el conteo del modal de filtros\n  // responden al instante y ya no esperan a que se redibuje todo el mapa.\n  const propiedadesMapa = useDeferredValue(filteredProperties);\n\n  // PINs de las ubicaciones seleccionadas: un marcador en el centro de cada chip'),
('R28-03', 'components/map/MapSearch.tsx',
'          properties={filteredProperties}\n          onMarkerPress={handleMarkerPress}',
'          properties={propiedadesMapa}\n          onMarkerPress={handleMarkerPress}'),
('R28-04', 'services/blockService.ts',
'const CACHE_TTL_MS = 60 * 1000;',
'const CACHE_TTL_MS = 15 * 1000; // REV28: un bloqueo hecho por el otro usuario debe notarse en segundos'),
('R28-05', 'components/LocationSearchBar.tsx',
'import { supabase } from "../lib/supabase";',
'import { supabase } from "../lib/supabase";\nimport { blockService } from "@/services/blockService";'),
('R28-06', 'components/LocationSearchBar.tsx',
'      const uid = authUser?.id;\n      if (uid && /^[0-9a-f-]{36}$/i.test(uid)) {\n        codeQuery',
'      const uid = authUser?.id;\n      // REV28: las fichas de usuarios con bloqueo (en cualquier sentido) tampoco salen al buscar por codigo.\n      const bloqueados = await blockService.getBlockedUserIds(uid);\n      if (bloqueados.length > 0) {\n        codeQuery = codeQuery.not("created_by", "in", `(${bloqueados.join(",")})`);\n      }\n      if (uid && /^[0-9a-f-]{36}$/i.test(uid)) {\n        codeQuery'),
]

FILES = []


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
