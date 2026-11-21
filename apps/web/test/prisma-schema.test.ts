import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MAX_STUDY_DESCRIPTION_LENGTH,
  MAX_STUDY_ITEMS,
  MAX_STUDY_NOTES_LENGTH,
  MAX_STUDY_SLUG_LENGTH,
  MAX_STUDY_TITLE_LENGTH,
} from "../src/lib/study-schema";
import { TIMELINE_MAX_YEAR, TIMELINE_MIN_YEAR } from "../src/lib/cosmos-validation";
import { MAX_CAMERA_ALTITUDE, MIN_CAMERA_ALTITUDE } from "../src/stores/globeStore";
import { MAX_STUDY_GEOLOGICAL_MA } from "../src/lib/study-epoch";

const prismaDir = path.resolve(__dirname, "../prisma");
const schemaSource = fs.readFileSync(path.join(prismaDir, "schema.prisma"), "utf8");
const migrationsDir = path.join(prismaDir, "migrations");

function readStudyBlock(schema: string): string {
  const match = schema.match(/model\s+Study\s*\{[\s\S]*?\n\}/);
  assert.ok(match, "model Study deve existir em prisma/schema.prisma");
  return match[0];
}

function readCountryBlock(schema: string): string {
  const match = schema.match(/model\s+Country\s*\{[\s\S]*?\n\}/);
  assert.ok(match, "model Country deve existir em prisma/schema.prisma");
  return match[0];
}

describe("T20 — Migrations Prisma e alinhamento de restrições com Zod", () => {
  test("1. Diretório prisma/migrations possui migration_lock.toml e migration inicial versionada", () => {
    assert.ok(fs.existsSync(migrationsDir), "apps/web/prisma/migrations deve existir");

    const lockPath = path.join(migrationsDir, "migration_lock.toml");
    assert.ok(fs.existsSync(lockPath), "migration_lock.toml deve estar versionado");
    const lockContent = fs.readFileSync(lockPath, "utf8");
    assert.match(lockContent, /provider\s*=\s*"postgresql"/);

    const migrationDirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    assert.ok(migrationDirs.length >= 1, "Deve existir ao menos uma migration versionada");
    const initSqlPath = path.join(migrationsDir, migrationDirs[0], "migration.sql");
    assert.ok(fs.existsSync(initSqlPath), `migration.sql ausente em ${migrationDirs[0]}`);
  });

  test("2. Country.geometryJson removido do schema e das migrations (fronteiras vêm do world-atlas)", () => {
    const countryBlock = readCountryBlock(schemaSource);
    assert.doesNotMatch(countryBlock, /\bgeometryJson\b/);

    const migrationDirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const dir of migrationDirs) {
      const sql = fs.readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8");
      assert.doesNotMatch(sql, /\bgeometryJson\b/);
    }
  });

  test("3. Limites @db.VarChar do modelo Study em schema.prisma batem exatamente com os limites Zod (T07)", () => {
    const studyBlock = readStudyBlock(schemaSource);

    assert.match(studyBlock, new RegExp(`\\bid\\s+String\\s+@id\\s+@db\\.VarChar\\(${MAX_STUDY_SLUG_LENGTH}\\)`));
    assert.match(studyBlock, new RegExp(`\\bparentId\\s+String\\?\\s+@db\\.VarChar\\(${MAX_STUDY_SLUG_LENGTH}\\)`));
    assert.match(studyBlock, new RegExp(`\\btitle\\s+String\\s+@db\\.VarChar\\(${MAX_STUDY_TITLE_LENGTH}\\)`));
    assert.match(studyBlock, new RegExp(`\\bdescription\\s+String\\?\\s+@db\\.VarChar\\(${MAX_STUDY_DESCRIPTION_LENGTH}\\)`));
    assert.match(studyBlock, new RegExp(`\\bmarkdownNotes\\s+String\\?\\s+@db\\.VarChar\\(${MAX_STUDY_NOTES_LENGTH}\\)`));
  });

  test("4. SQL da migration inicial aplica os mesmos limites VARCHAR e CHECK do schema Zod", () => {
    const migrationDirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const initSql = fs.readFileSync(path.join(migrationsDir, migrationDirs[0], "migration.sql"), "utf8");

    assert.match(initSql, new RegExp(`"id"\\s+VARCHAR\\(${MAX_STUDY_SLUG_LENGTH}\\)\\s+NOT NULL`));
    assert.match(initSql, new RegExp(`"parentId"\\s+VARCHAR\\(${MAX_STUDY_SLUG_LENGTH}\\)`));
    assert.match(initSql, new RegExp(`"title"\\s+VARCHAR\\(${MAX_STUDY_TITLE_LENGTH}\\)\\s+NOT NULL`));
    assert.match(initSql, new RegExp(`"description"\\s+VARCHAR\\(${MAX_STUDY_DESCRIPTION_LENGTH}\\)`));
    assert.match(initSql, new RegExp(`"markdownNotes"\\s+VARCHAR\\(${MAX_STUDY_NOTES_LENGTH}\\)`));

    // CHECK constraints coerentes com study-schema.ts
    assert.ok(
      initSql.includes(`"timelineStartYear" >= ${TIMELINE_MIN_YEAR}`) &&
        initSql.includes(`"timelineEndYear" <= ${TIMELINE_MAX_YEAR}`) &&
        initSql.includes(`"timelineStartYear" <= "timelineEndYear"`),
      "Migration deve conter CHECK de faixa de anos igual ao Zod"
    );
    assert.ok(
      initSql.includes(`"cameraAltitude" >= ${MIN_CAMERA_ALTITUDE}`) &&
        initSql.includes(`"cameraAltitude" <= ${MAX_CAMERA_ALTITUDE}`),
      "Migration deve conter CHECK de altitude da câmera igual ao Zod"
    );
    assert.ok(
      initSql.includes(`"geologicalMa" <= ${MAX_STUDY_GEOLOGICAL_MA}`),
      "Migration deve conter CHECK de geologicalMa igual ao Zod"
    );
    assert.ok(
      initSql.includes(`cardinality("selectedCountryIsos") <= ${MAX_STUDY_ITEMS}`),
      "Migration deve conter CHECK de cardinalidade dos arrays igual ao Zod"
    );
  });
});
