import { chromium } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

export default async function globalSetup() {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    console.warn('[playwright] TEST_EMAIL / TEST_PASSWORD non impostati — i test autenticati saranno saltati')
    // Write empty state so tests don't crash
    const { writeFileSync } = await import('fs')
    writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('http://localhost:3000/', { timeout: 10000 })

  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()
}
