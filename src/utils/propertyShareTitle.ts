export type PropertyShareTitleInput = {
  subtipo?: string | null;
  subtype?: string | null;
  tipo?: string | null;
  colonia?: string | null;
  ciudad?: string | null;
  municipio?: string | null;
  estado?: string | null;
};

const clean = (s: string | null | undefined): string => {
  if (!s) return "";
  return String(s).trim();
};

export const buildPropertyShareTitle = (p: PropertyShareTitleInput): string => {
  const tipo = clean(p.subtipo || p.subtype || p.tipo || "");
  const lugar = clean(p.colonia || p.ciudad || p.municipio || p.estado || "");
  const joined = [tipo, lugar].filter(Boolean).join(" | ");
  return joined.toUpperCase();
};

export const propertyTitleToFileName = (title: string): string => {
  return title
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
