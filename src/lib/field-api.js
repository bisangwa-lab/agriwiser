import { createServerFn } from '@tanstack/react-start';
import { runFieldAction } from './field-workflow.server.js';

const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, max = 2000) => typeof value === 'string' && value.length <= max;

function validQuery(input) {
  if (input == null) return {};
  if (!object(input)) throw new Error('Invalid findings query.');
  const query = {};
  for (const key of ['crop', 'district', 'season', 'priority', 'validation', 'classification', 'indicator', 'sort', 'search']) {
    if (input[key] !== undefined) {
      if (!bounded(input[key], 120)) throw new Error('Invalid findings filter.');
      query[key] = input[key];
    }
  }
  for (const key of ['page', 'pageSize', 'year']) {
    if (input[key] !== undefined) {
      const number = Number(input[key]);
      if (!Number.isFinite(number) || number < 0) throw new Error('Invalid findings page.');
      query[key] = number;
    }
  }
  return query;
}

export const getFieldFindings = createServerFn({ method: 'GET' })
  .validator(validQuery)
  .handler(({ data }) => runFieldAction('findings', data));

export const getFieldDirectory = createServerFn({ method: 'GET' }).handler(() => runFieldAction('directory', undefined));

export const decideFieldReview = createServerFn({ method: 'POST' })
  .validator((input) => {
    if (!object(input) || !bounded(input.case_id, 500) || !bounded(input.reason, 10000))
      throw new Error('Invalid review payload.');
    return input;
  })
  .handler(({ data }) => runFieldAction('review', data));

export const attachFieldEvidence = createServerFn({ method: 'POST' })
  .validator((input) => {
    if (
      !object(input) ||
      !bounded(input.investigation_id, 500) ||
      !bounded(input.title, 300) ||
      !bounded(input.reference, 1000) ||
      !bounded(input.description ?? '', 4000)
    )
      throw new Error('Invalid evidence payload.');
    return input;
  })
  .handler(({ data }) => runFieldAction('attachEvidence', data));

export const verifyFieldEvidence = createServerFn({ method: 'POST' })
  .validator((input) => {
    if (!object(input) || !bounded(input.attachment_id, 500) || !bounded(input.reason, 10000))
      throw new Error('Invalid evidence verification payload.');
    return input;
  })
  .handler(({ data }) => runFieldAction('verifyEvidence', data));

export const getFieldReport = createServerFn({ method: 'GET' })
  .validator((input) => {
    if (typeof input !== 'string' || input.length > 500) throw new Error('Invalid case ID.');
    return input;
  })
  .handler(({ data }) => runFieldAction('report', data));
