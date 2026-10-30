import { env } from 'cloudflare:workers';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { backendMode, supabaseRequestClient, supabaseAdminClient } from './supabase.server.js';
import { localSessionUser } from './local-auth.server.js';
import { createFieldWorkflow, workflowError } from './field-workflow.js';
import { localFieldRepository, supabaseFieldRepository } from './field-repository.js';
import { loadFieldFindings } from './field-findings.server.js';
import schema from '../../migrations/0004_field_workflow.sql?raw';
import recordsSchema from '../../migrations/0002_local_data.sql?raw';

let initialized;
async function context(user) {
  setResponseHeader('Cache-Control', 'private, no-store');
  if (!user) throw workflowError('Sign in to continue.', 401);
  let repository;
  if (backendMode() === 'supabase') {
    repository = supabaseFieldRepository(supabaseRequestClient(), supabaseAdminClient);
  } else {
    initialized ??= env.LOCAL_AUTH_DB.batch(
      (recordsSchema + '\n' + schema)
        .split(';')
        .map((sql) => sql.trim())
        .filter(Boolean)
        .map((sql) => env.LOCAL_AUTH_DB.prepare(sql)),
    ).catch((error) => {
      initialized = undefined;
      throw error;
    });
    await initialized;
    repository = localFieldRepository(env.LOCAL_AUTH_DB);
  }
  const workflow = createFieldWorkflow(repository, user, {
    findingsProvider: () => loadFieldFindings(repository),
  });
  return { repository, workflow };
}

export async function workflowForUser(user) {
  return (await context(user)).workflow;
}

const ACTIONS = new Set(['review', 'report', 'read', 'findings', 'directory', 'attachEvidence', 'verifyEvidence']);

export async function runFieldAction(action, input) {
  const request = getRequest();
  if (request.method !== 'GET' && request.headers.get('origin') !== new URL(request.url).origin)
    throw workflowError('Invalid request origin.', 403);
  if (!ACTIONS.has(action)) throw workflowError('Unsupported field action.');
  const workflow = await workflowForUser(await localSessionUser());
  return workflow[action](input);
}
