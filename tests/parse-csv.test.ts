import { describe, expect, it } from "vitest";

import { MAX_ROSTER_ROWS, parseRosterCsv } from "@/lib/roster/parse-csv";

const HEADER = "name,email,team";

describe("parseRosterCsv", () => {
  it("parses a valid comma-separated file", () => {
    const result = parseRosterCsv(
      `${HEADER}\nAna Souza,ana@acme.dev,Engineering\nBruno Lima,bruno@acme.dev,Marketing`,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { name: "Ana Souza", email: "ana@acme.dev", team: "Engineering" },
      { name: "Bruno Lima", email: "bruno@acme.dev", team: "Marketing" },
    ]);
  });

  it("accepts pt-BR headers and semicolon delimiter (pt-BR Excel export)", () => {
    const result = parseRosterCsv(
      "nome;e-mail;time\nCarla Dias;carla@acme.dev;Data",
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { name: "Carla Dias", email: "carla@acme.dev", team: "Data" },
    ]);
  });

  it("accepts 'equipe' as team header and ignores extra columns", () => {
    const result = parseRosterCsv(
      "cargo,nome,email,equipe\nDev,Diego Alves,diego@acme.dev,Product",
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual({
      name: "Diego Alves",
      email: "diego@acme.dev",
      team: "Product",
    });
  });

  it("strips BOM and handles CRLF line endings", () => {
    const result = parseRosterCsv(
      `﻿${HEADER}\r\nAna Souza,ana@acme.dev,Engineering\r\n`,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
  });

  it("honors quoted fields containing the delimiter", () => {
    const result = parseRosterCsv(
      `name;email;team\n"Silva; João";joao@acme.dev;Ops`,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0].name).toBe("Silva; João");
  });

  it("lowercases emails and trims whitespace", () => {
    const result = parseRosterCsv(
      `${HEADER}\n  Ana Souza  ,  ANA@Acme.DEV , Engineering `,
    );
    expect(result.rows[0]).toEqual({
      name: "Ana Souza",
      email: "ana@acme.dev",
      team: "Engineering",
    });
  });

  it("rejects a missing/incorrect header with a line-1 error", () => {
    const result = parseRosterCsv("foo,bar\nx,y");
    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(1);
    expect(result.errors[0].message).toContain("cabeçalho inválido");
  });

  it("reports invalid rows with their 1-based line numbers (header = line 1)", () => {
    const result = parseRosterCsv(
      `${HEADER}\nAna,not-an-email,Engineering\nBruno Lima,bruno@acme.dev,Marketing\nX,carla@acme.dev,Data`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([
      { line: 2, message: "e-mail inválido" },
      { line: 4, message: expect.stringContaining("nome muito curto") },
    ]);
  });

  it("flags duplicate emails within the file (case-insensitive)", () => {
    const result = parseRosterCsv(
      `${HEADER}\nAna Souza,ana@acme.dev,Engineering\nAna Duplicada,ANA@acme.dev,Data`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0].line).toBe(3);
    expect(result.errors[0].message).toContain("linha 2");
  });

  it("rejects rows with an empty team, and the reserved 'unattributed' name", () => {
    const result = parseRosterCsv(
      `${HEADER}\nAna Souza,ana@acme.dev,\nBruno Lima,bruno@acme.dev,Unattributed`,
    );
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toContain("time vazio");
    expect(result.errors[1].message).toContain("reservado");
  });

  it("skips blank lines without generating errors", () => {
    const result = parseRosterCsv(
      `${HEADER}\n\nAna Souza,ana@acme.dev,Engineering\n\n`,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
  });

  it("rejects an empty file and a header-only file", () => {
    expect(parseRosterCsv("").errors[0].message).toBe("arquivo vazio");
    expect(parseRosterCsv(HEADER).errors[0].message).toBe(
      "nenhuma linha de dados no arquivo",
    );
  });

  it("caps the number of rows", () => {
    const big =
      HEADER +
      "\n" +
      Array.from(
        { length: MAX_ROSTER_ROWS + 1 },
        (_, i) => `Pessoa ${i} Silva,p${i}@acme.dev,Time`,
      ).join("\n");
    const result = parseRosterCsv(big);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toContain(`${MAX_ROSTER_ROWS}`);
  });
});
