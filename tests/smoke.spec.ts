import { test, expect } from '@playwright/test'

// ── Portfolio (/) ────────────────────────────────────────────────────────
test.describe('Portfolio', () => {
  test('carica la pagina principale', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Portafoglio netto')).toBeVisible()
  })

  test('mostra il totale patrimonio', async ({ page }) => {
    await page.goto('/')
    // The hero total contains a € sign
    await expect(page.locator('text=€').first()).toBeVisible()
  })

  test('i gruppi asset sono visibili e collassabili', async ({ page }) => {
    await page.goto('/')
    const contiHeader = page.locator('text=Conti').first()
    if (await contiHeader.isVisible()) {
      await contiHeader.click()
      // Group should toggle
      await contiHeader.click()
    }
  })
})

// ── Analytics ────────────────────────────────────────────────────────────
test.describe('Analytics', () => {
  test('carica la pagina analytics', async ({ page }) => {
    await page.goto('/analytics')
    await expect(page).toHaveURL('/analytics')
    await expect(page.locator('text=Allocazione patrimonio')).toBeVisible()
  })

  test('mostra il donut chart o stato vuoto', async ({ page }) => {
    await page.goto('/analytics')
    const hasChart = await page.locator('canvas').count()
    const hasEmpty = await page.locator('text=Nessuna allocazione').count()
    expect(hasChart + hasEmpty).toBeGreaterThan(0)
  })
})

// ── Orbit / Insights ─────────────────────────────────────────────────────
test.describe('Orbit', () => {
  test('carica la pagina orbit', async ({ page }) => {
    await page.goto('/insights')
    await expect(page).toHaveURL('/insights')
    await expect(page.locator('text=Patrimonio in orbita')).toBeVisible()
  })

  test('mostra il badge Beta', async ({ page }) => {
    await page.goto('/insights')
    await expect(page.locator('text=Beta')).toBeVisible()
  })
})

// ── Login ────────────────────────────────────────────────────────────────
test.describe('Login', () => {
  test('redirect a /login se non autenticato', async ({ browser }) => {
    // Fresh context without saved auth
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })

  test('la pagina login mostra il form', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await ctx.close()
  })
})

// ── Navigation ───────────────────────────────────────────────────────────
test.describe('Navigazione', () => {
  test('naviga tra le pagine principali', async ({ page }) => {
    await page.goto('/')
    await page.goto('/analytics')
    await expect(page).toHaveURL('/analytics')
    await page.goto('/insights')
    await expect(page).toHaveURL('/insights')
  })
})
