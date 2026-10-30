import { createServerFn } from "@tanstack/react-start";
import { validateLocalRead } from "./local-data-service.js";
import {
  runLocalRead,
  runLocalCreate,
  runLocalUpdate,
  runLocalDelete,
  runLocalBulkCreate,
  runDistrictReview,
  runDistrictFinding,
} from "./local-data.server.js";
import { validateDistrictReview } from "./district-review-service.js";

export const localReadCollection = createServerFn({ method: "GET" })
  .validator(validateLocalRead)
  .handler(({ data }) => runLocalRead(data));

export const localCreateRecord = createServerFn({ method: "POST" })
  .validator((input) => {
    if (!input || !input.entity || !input.record) throw new Error("Invalid create payload.");
    return input;
  })
  .handler(({ data }) => runLocalCreate(data));

export const localUpdateRecord = createServerFn({ method: "POST" })
  .validator((input) => {
    if (!input || !input.entity || !input.id || !input.patch) throw new Error("Invalid update payload.");
    return input;
  })
  .handler(({ data }) => runLocalUpdate(data));

export const localDeleteRecord = createServerFn({ method: "POST" })
  .validator((input) => {
    if (!input || !input.entity || !input.id) throw new Error("Invalid delete payload.");
    return input;
  })
  .handler(({ data }) => runLocalDelete(data));

export const localBulkCreate = createServerFn({ method: "POST" })
  .validator((input) => {
    if (!input || !input.entity || !Array.isArray(input.records)) throw new Error("Invalid bulkCreate payload.");
    return input;
  })
  .handler(({ data }) => runLocalBulkCreate(data));

export const localCreateDistrictReview = createServerFn({ method: "POST" })
  .validator(validateDistrictReview)
  .handler(({ data }) => runDistrictReview(data));

export const localSaveDistrictFinding = createServerFn({ method: "POST" })
  .validator(validateDistrictReview)
  .handler(({ data }) => runDistrictFinding(data));
