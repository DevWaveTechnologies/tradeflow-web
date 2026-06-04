import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type JobRow = {
  id: string
  title: string
  status: string | null
  assigned_to: string | null
  address: string | null
  notes: string | null
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

function normalizedText(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\r\n/g, '\n')
}

function normalizeEventType(eventType: string): string {
  return eventType.trim().toUpperCase()
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function isDatabaseWebhookPayload(body: unknown): body is WebhookPayload {
  if (!body || typeof body !== 'object') return false
  const row = body as Record<string, unknown>
  const table = row.table
  const record = row.record ?? row.new ?? row.new_record
  return typeof table === 'string' && record != null && typeof record === 'object'
}

function parseDatabaseWebhook(body: unknown): WebhookPayload | null {
  if (!isDatabaseWebhookPayload(body)) return null
  const row = body as Record<string, unknown>
  const oldRecord = row.old_record ?? row.old
  return {
    type: normalizeEventType(String(row.type ?? 'UPDATE')) as WebhookPayload['type'],
    table: String(row.table),
    record: (row.record ?? row.new ?? row.new_record) as JobRow | NoteRow,
    old_record: (oldRecord as JobRow | null | undefined) ?? null,
  }
}

function isDirectPayload(body: unknown): body is DirectPayload {
  if (!body || typeof body !== 'object') return false
  const row = body as Record<string, unknown>
  return (
    typeof row.userId === 'string' &&
    typeof row.title === 'string' &&
    typeof row.body === 'string' &&
    !('table' in row)
  )
}

function collectJobChangeParts(record: JobRow, oldRecord: JobRow): string[] {
  const changeParts: string[] = []

  if (oldRecord.status !== record.status) {
    changeParts.push(`status is now ${formatStatus(record.status)}`)
  }
  if (
    normalizeDate(oldRecord.scheduled_date) !== normalizeDate(record.scheduled_date) ||
    normalizeTime(oldRecord.scheduled_start_time) !== normalizeTime(record.scheduled_start_time)
  ) {
    changeParts.push('schedule updated')
  }
  if (normalizedText(oldRecord.address) !== normalizedText(record.address)) {
    changeParts.push('job site updated')
  }
  if (normalizedText(oldRecord.notes) !== normalizedText(record.notes)) {
    changeParts.push('description updated')
  }
  if (normalizedText(oldRecord.title) !== normalizedText(record.title)) {
    changeParts.push('title updated')
  }

  return changeParts
}

function buildJobNotifications(
  record: JobRow,
  oldRecord: JobRow | null,
  eventType: string,
): DirectPayload[] {
  const workerId = record.assigned_to
  if (!workerId) {
    console.log('send-worker-push: skip job — no assignee', { jobId: record.id })
    return []
  }

  if (shouldSkipSelfUpdate(workerId, record.last_updated_by)) {
    console.log('send-worker-push: skip job — worker self-update', { jobId: record.id })
    return []
  }

  const data = { jobId: record.id, type: 'job' }
  const normalizedEvent = normalizeEventType(eventType)

  if (normalizedEvent === 'INSERT') {
    return [
      {
        userId: workerId,
        title: 'New job assigned',
        body: `You have been assigned: ${record.title}`,
        data,
      },
    ]
  }

  if (normalizedEvent !== 'UPDATE') return []

  // Webhook without old_record — still notify on any admin edit.
  if (!oldRecord) {
    return [
      {
        userId: workerId,
        title: 'Job updated',
        body: `${record.title} was updated`,
        data,
      },
    ]
  }

  if (oldRecord.assigned_to !== record.assigned_to) {
    return [
      {
        userId: workerId,
        title: 'Job assigned',
        body: `You have been assigned: ${record.title}`,
        data,
      },
    ]
  }

  const changeParts = collectJobChangeParts(record, oldRecord)

  // Admin saved but field diff missed (partial old_record, formatting, etc.)
  const editorId = record.last_updated_by
  const oldEditorId = oldRecord.last_updated_by ?? null
  if (
    changeParts.length === 0 &&
    editorId &&
    editorId !== workerId &&
    editorId !== oldEditorId
  ) {
    changeParts.push('details updated')
  }

  if (changeParts.length === 0) {
    console.log('send-worker-push: skip job — no detected changes', {
      jobId: record.id,
      eventType: normalizedEvent,
    })
    return []
  }

  const body =
    changeParts.length === 1
      ? `${record.title}: ${changeParts[0]}`
      : `${record.title} was updated`

  return [
    {
      userId: workerId,
      title: 'Job updated',
      body,
      data,
    },
  ]
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

  if (isDirectPayload(body)) {
    notifications.push(body)
  } else {
    const webhook = parseDatabaseWebhook(body)
    if (webhook) {
      const table = normalizeTableName(webhook.table)
      const eventType = normalizeEventType(String(webhook.type))

      if (table === 'jobs') {
        notifications.push(
          ...buildJobNotifications(
            webhook.record as JobRow,
            (webhook.old_record as JobRow | null) ?? null,
            eventType,
          ),
        )
      }

      if (table === 'job_notes' && eventType === 'INSERT') {
        const noteNotification = await buildNoteNotification(
          supabase,
          webhook.record as NoteRow,
        )
        if (noteNotification) notifications.push(noteNotification)
      }
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
