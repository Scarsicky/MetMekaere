/**
 * Vervanger voor het pakket `server-only` tijdens tests.
 *
 * Dat pakket bestaat om te voorkomen dat servercode per ongeluk in de
 * browserbundel belandt: importeer je het buiten een servercomponent, dan
 * klapt het. In een test is dat juist waar we zijn, dus hier staat een lege
 * module. Zie vitest.config.mts.
 */
export {};
