import { rosterRowSchema } from "@/lib/validation";

/**
 * Strict roster CSV parser (pure function, exhaustively unit-tested).
 *
 * Format: header + rows with columns name/email/team. Accepts pt-BR headers
 * (nome/e-mail/time|equipe), comma or semicolon delimiters (pt-BR Excel
 * exports use ";"), quoted fields, BOM and CRLF. Extra columns are ignored.
 *
 * Error messages are user-facing copy (pt-BR), consistent with
 * lib/validation.ts. Line numbers are 1-based including the header.
 */

export type RosterRow = { name: string; email: string; team: string };
export type RosterRowError = { line: number; message: string };
export type RosterParseResult = {
  rows: RosterRow[];
  errors: RosterRowError[];
};

export const MAX_ROSTER_ROWS = 2000;

const HEADER_ALIASES: Record<keyof RosterRow, string[]> = {
  name: ["name", "nome"],
  email: ["email", "e-mail"],
  team: ["team", "time", "equipe"],
};

/** Splits one CSV line honoring double quotes ("Silva; João" stays whole). */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(headerLine: string): "," | ";" {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export function parseRosterCsv(input: string): RosterParseResult {
  const text = input.replace(/^﻿/, ""); // strip BOM
  const lines = text.split(/\r\n|\n|\r/);
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  if (lines.length === 0 || lines[0].trim() === "") {
    return { rows: [], errors: [{ line: 1, message: "arquivo vazio" }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = splitLine(lines[0], delimiter).map((cell) =>
    cell.toLowerCase(),
  );

  const columnIndex: Partial<Record<keyof RosterRow, number>> = {};
  for (const key of Object.keys(HEADER_ALIASES) as (keyof RosterRow)[]) {
    const index = headerCells.findIndex((cell) =>
      HEADER_ALIASES[key].includes(cell),
    );
    if (index !== -1) columnIndex[key] = index;
  }

  const missing = (Object.keys(HEADER_ALIASES) as (keyof RosterRow)[]).filter(
    (key) => columnIndex[key] === undefined,
  );
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `cabeçalho inválido — esperado name,email,team (ou nome,email,time); faltando: ${missing.join(", ")}`,
        },
      ],
    };
  }

  if (lines.length - 1 > MAX_ROSTER_ROWS) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: `arquivo com mais de ${MAX_ROSTER_ROWS} linhas — divida em arquivos menores`,
        },
      ],
    };
  }

  const rows: RosterRow[] = [];
  const errors: RosterRowError[] = [];
  const seenEmails = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const line = i + 1; // 1-based, header included
    if (lines[i].trim() === "") continue;

    const cells = splitLine(lines[i], delimiter);
    const candidate = {
      name: cells[columnIndex.name!] ?? "",
      email: cells[columnIndex.email!] ?? "",
      team: cells[columnIndex.team!] ?? "",
    };

    const parsed = rosterRowSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({ line, message: parsed.error.issues[0].message });
      continue;
    }

    const previousLine = seenEmails.get(parsed.data.email);
    if (previousLine !== undefined) {
      errors.push({
        line,
        message: `e-mail repetido no arquivo (já usado na linha ${previousLine})`,
      });
      continue;
    }

    seenEmails.set(parsed.data.email, line);
    rows.push(parsed.data);
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: 1, message: "nenhuma linha de dados no arquivo" });
  }

  return { rows, errors };
}
