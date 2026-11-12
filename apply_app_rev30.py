#!/usr/bin/env python3
"""
apply_app_rev30.py - parche de la APP. Se aplica DESPUES de rev29.
  R30-01  Al bloquear un usuario, se eliminan de inmediato los matches mutuos con ese usuario.
          Asi el bloqueado no detecta que fue desbloqueado y vuelto a bloquear viendo sus matches.
  R30-02  Importar supabase en useUserBlock.
USO:  python apply_app_rev30.py src --dry-run   y luego   python apply_app_rev30.py src
"""
import sys, os, re, argparse, hashlib


def dec(s):
    return re.sub(r"@@u([0-9a-f]{4})@@", lambda m: chr(int(m.group(1), 16)), s)


def rx(s):
    return re.compile(r"\r?\n".join(re.escape(p) for p in s.split("\n")))


def norm_hash(txt):
    t = txt.replace("\r\n", "\n")
    if t.endswith("\n"):
        t = t.rstrip("\n") + "\n"
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


PATCHES = [
# R30-02: importar supabase
('R30-02', 'hooks/useUserBlock.ts',
 'import { blockService } from "@/services/blockService";\nimport { logger } from "@/utils/logger";',
 'import { blockService } from "@/services/blockService";\nimport { supabase } from "@/lib/supabase";\nimport { logger } from "@/utils/logger";'),
# R30-01: al bloquear, eliminar matches mutuos en Supabase
('R30-01', 'hooks/useUserBlock.ts',
 '  const block = useCallback(async () => {\n    if (!blockerId || !blockedId) return;\n    setLoading(true);\n    try {\n      await blockService.blockUser(blockerId, blockedId);\n      setIsBlocked(true);\n      invalidateBlockedContent();\n    } finally {\n      setLoading(false);\n    }\n  }, [blockerId, blockedId, invalidateBlockedContent]);',
 '  const block = useCallback(async () => {\n    if (!blockerId || !blockedId) return;\n    setLoading(true);\n    try {\n      await blockService.blockUser(blockerId, blockedId);\n      setIsBlocked(true);\n      // REV30: al bloquear, eliminar matches mutuos de inmediato.\n      // Asi el bloqueado no puede detectar el re-bloqueo viendo que sus matches desaparecen con demora.\n      try {\n        await Promise.all([\n          supabase.from("matches").delete()\n            .eq("usuario_id", blockerId).eq("matched_usuario_id", blockedId),\n          supabase.from("matches").delete()\n            .eq("usuario_id", blockedId).eq("matched_usuario_id", blockerId),\n        ]);\n      } catch {\n        /* sin efecto visual; el backend los filtra igual por bloqueo */\n      }\n      invalidateBlockedContent();\n    } finally {\n      setLoading(false);\n    }\n  }, [blockerId, blockedId, invalidateBlockedContent]);'),
]

FILES = []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", help="carpeta src/ del proyecto")
    ap.add_argument("--only", default="", help="IDs separados por coma")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    only = {s.strip() for s in a.only.split(",") if s.strip()}
    if not os.path.isdir(a.root):
        print("ERROR: no existe la carpeta %r" % a.root)
        sys.exit(2)
    known = {p[0] for p in PATCHES} | {f[0] for f in FILES}
    unknown = only - known
    if unknown:
        print("ERROR: id(s) desconocido(s): %s" % ", ".join(sorted(unknown)))
        sys.exit(2)
    cache = {}
    report = []
    errors = []
    writes = []

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
    print("\nListo.")


if __name__ == "__main__":
    main()
