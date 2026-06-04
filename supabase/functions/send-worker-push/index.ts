import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type JobRow = {
  id: string
  title: string
  status: string | null
  assigned_to: string | null
  scheduled_date: string | null
  scheduled_start_time: string | null
  last_updated_by: string | null
}

type NoteRow = {
  id: string
  job_id: string
  author_id: string
  body: string
}

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: JobRow | NoteRow
  old_record?: JobRow | null
}

type DirectPayload = {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
}

function formatStatus(status: string | null) {
  if (!status) return 'pending'
  return status.replace(/_/g, ' ')
}

function shouldSkipSelfUpdate(workerId: string, lastUpdatedBy: string | null) {
  return lastUpdatedBy != null && lastUpdatedBy === workerId
}

function normalizeTableName(table: string): string {
  return table.replace(/^public\./, '')
}

function buildJobNotifications(
  record: JobRow,
  oldRecord: JobRow | null,
  eventType: string,
): DirectPayload[] {
  const workerId = record.assigned_to
  if (!workerId) return []

  if (shouldSkipSelfUpdate(workerId, record.last_updated_by)) {
    return []
  }

  const notifications: DirectPayload[] = []
  const data = { jobId: record.id, type: 'job' }

  if (eventType === 'INSERT') {
    notifications.push({
      userId: workerId,
      title: 'New job assigned',
      body: `You have been assigned: ${record.title}`,
      data,
    })
    return notifications
  }

  if (eventType !== 'UPDATE') return []

  // Some Supabase webhook integrations omit old_record; still notify the assignee.
  if (!oldRecord) {
    notifications.push({
      userId: workerId,
      title: 'Job updated',
      body: `${record.title} was updated`,
      data,
    })
    return notifications
  }

  if (oldRecord.assigned_to !== record.assigned_to) {
    notifications.push({
      userId: workerId,
      title: 'Job assigned',
      body: `You have been assigned: ${record.title}`,
      data,
    })
    return notifications
  }

  if (oldRecord.status !== record.status) {
    notifications.push({
      userId: workerId,
      title: 'Job status updated',
      body: `${record.title} is now ${formatStatus(record.status)}`,
      data,
    })
    return notifications
  }

  const scheduleChanged =
    oldRecord.scheduled_date !== record.scheduled_date ||
    oldRecord.scheduled_start_time !== record.scheduled_start_time

  const detailsChanged = oldRecord.title !== record.title || scheduleChanged

  if (detailsChanged) {
    notifications.push({
      userId: workerId,
      title: 'Job updated',
      body: `${record.title} was updated`,
      data,
    })
  }

  return notifications
}

async function buildNoteNotification(
  supabase: ReturnType<typeof createClient>,
  note: NoteRow,
): Promise<DirectPayload | null> {
  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, assigned_to')
    .eq('id', note.job_id)
    .maybeSingle()

  if (!job?.assigned_to || job.assigned_to === note.author_id) {
    return null
  }

  const preview = note.body.trim().slice(0, 80)
  return {
    userId: job.assigned_to,
    title: 'New note on your job',
    body: preview ? `${job.title}: ${preview}` : `New note on ${job.title}`,
    data: { jobId: job.id, type: 'note' },
  }
}

async function sendPushToUser(
  supabase: ReturnType<typeof createClient>,
  payload: DirectPayload,
) {
  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', payload.userId)

  if (error || !tokens?.length) {
    return { sent: 0, error: error?.message }
  }

  const messages = tokens.map((row) => ({
    to: row.token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  }))

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  })

  const result = await response.json()
  const tickets = Array.isArray(result?.data) ? result.data : []
  const expoErrors = tickets.filter(
    (ticket: { status?: string }) => ticket.status === 'error',
  )

  if (!response.ok) {
    console.error('Expo push HTTP error', response.status, result)
  }
  if (expoErrors.length) {
    console.error('Expo push ticket errors', JSON.stringify(expoErrors))
  }

  console.log('Expo push sent', {
    userId: payload.userId,
    title: payload.title,
    tokenCount: messages.length,
    tickets,
  })

  return {
    sent: messages.length,
    result,
    expoErrors: expoErrors.length ? expoErrors : undefined,
  }
}

function isDatabaseWebhookPayload(body: unknown): body is WebhookPayload {
  if (!body || typeof body !== 'object') return false
  const row = body as Record<string, unknown>
  return typeof row.table === 'string' && typeof row.type === 'string' && row.record != null
}

function isDirectPayload(body: unknown): body is DirectPayload {
  if (!body || typeof body !== 'object') return false
  const row = body as Record<string, unknown>
  return typeof row.userId === 'string' && typeof row.title === 'string' && typeof row.body === 'string'
}

function getServiceRoleKey(): string {
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''
}

function getWebhookSecretFromRequest(req: Request): string | null {
  const direct = req.headers.get('x-push-secret')?.trim()
  if (direct) return direct

  const auth = req.headers.get('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }

  return null
}

function isAuthorizedWebhookRequest(req: Request, body: unknown): boolean {
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET')
  const provided = getWebhookSecretFromRequest(req)

  if (webhookSecret && provided === webhookSecret) return true

  // Manual test body { userId, title, body } — allow service role key (curl / API secret).
  if (isDirectPayload(body)) {
    const serviceKey = getServiceRoleKey()
    if (serviceKey && provided === serviceKey) return true
  }

  if (!webhookSecret) return true

  // Dashboard "Supabase Edge Functions" webhooks use pg_net and do not forward custom headers.
  const userAgent = req.headers.get('user-agent') ?? ''
  if (userAgent.includes('pg_net') && isDatabaseWebhookPayload(body)) return true

  return false
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!isAuthorizedWebhookRequest(req, body)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey)
  const notifications: DirectPayload[] = []

  if (body.userId && body.title && body.body) {
    notifications.push(body as DirectPayload)
  } else if (body.table && body.record) {
    const webhook = body as WebhookPayload
    const table = normalizeTableName(webhook.table)

    if (table === 'jobs') {
      notifications.push(
        ...buildJobNotifications(
          webhook.record as JobRow,
          (webhook.old_record as JobRow | null) ?? null,
          webhook.type,
        ),
      )
    }

    if (table === 'job_notes' && webhook.type === 'INSERT') {
      const noteNotification = await buildNoteNotification(
        supabase,
        webhook.record as NoteRow,
      )
      if (noteNotification) notifications.push(noteNotification)
    }
  }

  const results = []
  for (const notification of notifications) {
    results.push(await sendPushToUser(supabase, notification))
  }

  const summary = {
    ok: true,
    queued: notifications.length,
    results,
  }

  console.log('send-worker-push complete', summary)

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  })
})
