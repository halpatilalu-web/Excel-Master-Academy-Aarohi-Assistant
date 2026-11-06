/**
 * Function registry. Each module registers its own table slice so the bundle
 * stays tree-shakeable and it is obvious where a missing function belongs.
 */
import { fnTable } from "../helpers";
import { mathFns } from "./math";
import { logicalFns } from "./logical";
import { textFns } from "./text";
import { dateFns } from "./date";
import { lookupFns } from "./lookup";
import { statFns } from "./stat";
import { infoFns } from "./info";
import { financialFns } from "./financial";
import { databaseFns } from "./database";
import { arrayFns } from "./arrays";
import { engineeringFns } from "./engineering";
import { webFns } from "./web";

Object.assign(
  fnTable,
  mathFns,
  logicalFns,
  textFns,
  dateFns,
  lookupFns,
  statFns,
  infoFns,
  financialFns,
  databaseFns,
  arrayFns,
  engineeringFns,
  webFns,
);
