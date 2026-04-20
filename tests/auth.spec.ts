import { test, expect } from '@playwright/test'

test.describe('Auth — redirect', () => {
  test('utente non autenticato viene rediretto a /login', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })

  test('/analytics redirige a /login se non autenticato', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/analytics')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })
})

test.describe('Auth — pagina login', () => {
  test('mostra logo, form email/password e bottone Google', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('text=Continua con Google')).toBeVisible()
    await ctx.close()
  })

  test('bottone submit disabilitato con campi vuoti', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    await expect(page.locator('button[type="submit"]')).toBeDisabled()
    await ctx.close()
  })

  test('mostra errore con credenziali errate', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Email o password errati')).toBeVisible({ timeout: 8000 })
    await ctx.close()
  })

  test('toggle password mostra/nasconde testo', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    const pwInput = page.locator('input[type="password"]')
    await expect(pwInput).toBeVisible()
    // Click eye icon
    await page.locator('button[type="button"]').last().click()
    await expect(page.locator('input[type="text"]').last()).toBeVisible()
    await ctx.close()
  })

  test('switch modalità registra/accedi', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    await page.click('text=Registrati')
    await expect(page.locator('button[type="submit"]')).toContainText('Registrati')
    await page.click('text=Accedi')
    await expect(page.locator('button[type="submit"]')).toContainText('Accedi')
    await ctx.close()
  })

  test('screenshot pagina login', async ({ browser }, testInfo) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page).toHaveScreenshot('login.png', { threshold: 0.2 })
    await ctx.close()
  })
})

test.describe('Auth — utente autenticato', () => {
  test('viene rediretto a / da /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })
})
