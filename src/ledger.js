import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class TaskLedger {
  /**
   * @param {string} dbPath - Path to SQLite database file.
   */
  constructor(dbPath) {
    this.dbPath = dbPath || resolve(homedir(), '.openclaw', 'task-metrics.db')
    this.db = null
  }

  /** Initialize database and run migrations. */
  init() {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')

    const migrationPath = resolve(__dirname, '..', 'db', 'migrations', '001_initial.sql')
    const sql = readFileSync(migrationPath, 'utf-8')
    this.db.exec(sql)

    return this
  }

  /**
   * Create a new task record.
   * @param {string} taskId
   * @param {object} metadata
   */
  startTask(taskId, metadata = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (task_id, parent_task_id, started_at, status, complexity_score, complexity_level,
        models_used, sessions, cron_id, cron_triggered, intent_summary)
      VALUES (@task_id, @parent_task_id, @started_at, 'in_progress', @complexity_score, @complexity_level,
        @models_used, @sessions, @cron_id, @cron_triggered, @intent_summary)
    `)

    stmt.run({
      task_id: taskId,
      parent_task_id: metadata.parent_task_id || null,
      started_at: metadata.started_at || new Date().toISOString(),
      complexity_score: metadata.complexity_score || 0,
      complexity_level: metadata.complexity_level || 'L1',
      models_used: JSON.stringify(metadata.models_used || []),
      sessions: JSON.stringify(metadata.sessions || []),
      cron_id: metadata.cron_id || null,
      cron_triggered: metadata.cron_triggered ? 1 : 0,
      intent_summary: metadata.intent_summary || '',
    })
  }

  /**
   * Update task fields.
   * @param {string} taskId
   * @param {object} updates
   */
  updateTask(taskId, updates) {
    const allowed = [
      'status', 'complexity_score', 'complexity_level', 'quality_score',
      'total_tokens', 'total_cost_usd', 'tes', 'sub_agents',
      'tools_called', 'tool_names', 'external_api_calls', 'user_turns',
      'intent_summary', 'outcome_summary',
    ]

    const setClauses = []
    const params = { task_id: taskId }

    for (const key of allowed) {
      if (key in updates) {
        const val = updates[key]
        setClauses.push(`${key} = @${key}`)
        params[key] = Array.isArray(val) ? JSON.stringify(val) : val
      }
    }

    // Handle array fields
    if ('models_used' in updates) {
      setClauses.push('models_used = @models_used')
      params.models_used = JSON.stringify(updates.models_used)
    }
    if ('sessions' in updates) {
      setClauses.push('sessions = @sessions')
      params.sessions = JSON.stringify(updates.sessions)
    }

    if (setClauses.length === 0) return

    setClauses.push("updated_at = datetime('now')")
    this.db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE task_id = @task_id`).run(params)
  }

  /**
   * Attribute cost to a task.
   * @param {string} taskId
   * @param {number} tokens
   * @param {number} costUsd
   * @param {string} modelId
   * @param {string} source - e.g. 'main', 'sub-agent', 'cron'
   */
  attributeCost(taskId, tokens, costUsd, modelId, source) {
    const task = this.getTask(taskId)
    if (!task) return

    const modelsUsed = JSON.parse(task.models_used || '[]')
    if (!modelsUsed.includes(modelId)) modelsUsed.push(modelId)

    this.db.prepare(`
      UPDATE tasks SET
        total_tokens = total_tokens + @tokens,
        total_cost_usd = total_cost_usd + @cost,
        models_used = @models_used,
        updated_at = datetime('now')
      WHERE task_id = @task_id
    `).run({
      task_id: taskId,
      tokens,
      cost: costUsd,
      models_used: JSON.stringify(modelsUsed),
    })
  }

  /**
   * Mark a task as completed.
   * @param {string} taskId
   * @param {number} qualityScore
   * @param {string} outcomeSummary
   */
  completeTask(taskId, qualityScore, outcomeSummary) {
    this.db.prepare(`
      UPDATE tasks SET
        status = 'completed',
        completed_at = datetime('now'),
        quality_score = @quality_score,
        outcome_summary = @outcome_summary,
        updated_at = datetime('now')
      WHERE task_id = @task_id
    `).run({
      task_id: taskId,
      quality_score: qualityScore,
      outcome_summary: outcomeSummary || '',
    })
  }

  /**
   * Get a single task.
   * @param {string} taskId
   * @returns {object|undefined}
   */
  getTask(taskId) {
    return this.db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId)
  }

  /**
   * List tasks with optional filters.
   * @param {object} filters
   * @param {string} [filters.status]
   * @param {string} [filters.level]
   * @param {string} [filters.from] - ISO date
   * @param {string} [filters.to] - ISO date
   * @param {number} [filters.limit=50]
   * @returns {object[]}
   */
  listTasks(filters = {}) {
    const conditions = []
    const params = {}

    if (filters.status) {
      conditions.push('status = @status')
      params.status = filters.status
    }
    if (filters.level) {
      conditions.push('complexity_level = @level')
      params.level = filters.level
    }
    if (filters.from) {
      conditions.push('started_at >= @from')
      params.from = filters.from
    }
    if (filters.to) {
      conditions.push('started_at <= @to')
      params.to = filters.to
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = filters.limit || 50

    return this.db.prepare(
      `SELECT * FROM tasks ${where} ORDER BY started_at DESC LIMIT ${limit}`
    ).all(params)
  }

  /** Close the database connection. */
  close() {
    if (this.db) this.db.close()
  }
}
