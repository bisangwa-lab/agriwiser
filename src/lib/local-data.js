import { createServerFn } from "@tanstack/react-start";
import { validateLocalRead } from "./local-data-service.js";
import { runLocalRead, runDistrictReview, runDistrictFinding, runLocalFieldWrite } from "./local-data.server.js";
import { validateDistrictReview } from "./district-review-service.js";
import { validateFieldMutation } from "./field-work-service.js";

export const localReadCollection = createServerFn({ method: "GET" })
  .validator(validateLocalRead)
  .handler(({ data }) => runLocalRead(data));

export const localCreateDistrictReview = createServerFn({ method: "POST" })
  .validator(validateDistrictReview)
  .handler(({ data }) => runDistrictReview(data));

export const localSaveDistrictFinding = createServerFn({ method: "POST" })
  .validator(validateDistrictReview)
  .handler(({ data }) => runDistrictFinding(data));

export const localWriteFieldRecord = createServerFn({ method: "POST" })
  .validator(validateFieldMutation)
  .handler(({ data }) => runLocalFieldWrite(data));
