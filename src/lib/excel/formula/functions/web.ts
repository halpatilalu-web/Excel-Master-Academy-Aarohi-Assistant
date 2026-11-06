/**
 * Web functions. The browser cannot synchronously fetch, so these return the
 * same #CONNECT!/#BLOCKED! errors Excel shows when a link is unavailable rather
 * than pretending to work.
 */
import { VALUE, isErr } from "../core";
import { str, type FnImpl } from "../helpers";

import type { XErr } from "../core";

const blocked: XErr = {
  err: "#BLOCKED!",
  hint: "Live web data needs Excel's Power Query / WEBSERVICE — in this free browser lab the practice data is local, so this returns #BLOCKED!.",
};

export const webFns: Record<string, FnImpl> = {
  ENCODEURL: (args, ctx) => {
    const s = str(args, ctx, 0);
    if (isErr(s)) return s;
    return encodeURIComponent(s);
  },
  WEBSERVICE: () => blocked,
  FILTERXML: () => blocked,
  IMAGE: () => blocked,
  STOCKHISTORY: () => blocked,
  RTD_: () => blocked,
  HYPERLINK: (args, ctx) => {
    const url = str(args, ctx, 0, "");
    if (isErr(url)) return url;
    if (args[1] && args[1].t !== "missing") return ctx.evalNode(args[1]);
    return url === "" ? VALUE : url;
  },
};
