import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'

config({ path: '.env.local' })

export const TEST_EMAIL = 'e2e@vault-tracker.test'
export const TEST_PASSWORD = 'E2EVault2025!'
const AUTH_FILE = path.join(__dirname, '.auth/user.json')

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getTestUserId(): Promise<string | null> {
  const supabase = adminClient()
  const { data } = await supabase.auth.admin.listUsers()
  return data?.users.find(u => u.email === TEST_EMAIL)?.id ?? null
}

async function createTestUser() {
  const supabase = adminClient()
  const existing = await getTestUserId()
  if (existing) return existing

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw new Error(`Impossibile creare utente test: ${error.message}`)
  return data.user.id
}

async function cleanTestData(userId: string) {
  const supabase = adminClient()
  await Promise.all([
    supabase.from('recurring_incomes').delete().eq('user_id', userId),
    supabase.from('liabilities').delete().eq('user_id', userId),
    supabase.from('positions').delete().eq('user_id', userId),
    supabase.from('accounts').delete().eq('user_id', userId),
  ])
}

export default async function globalSetup() {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  const userId = await createTestUser()
  await cleanTestData(userId)

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('http://localhost:3000/', { timeout: 15000 })

  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()

  console.log(`[e2e] utente test pronto: ${TEST_EMAIL}`)
}
