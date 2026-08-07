import { test, expect } from '@playwright/test'

test.describe('Course tracking (AT-001, AT-002)', () => {
  test('anonymous visitor sees the course list without interactive checkboxes', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Roadmap de Certificações/i })).toBeVisible()
    await expect(page.getByRole('checkbox').first()).toBeDisabled()
  })

  test('logged-in user can mark a course as completed and it persists after reload', async ({ page }) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'E2E_TEST_USER_EMAIL/PASSWORD not configured')

    await page.goto('/login')
    await page.getByPlaceholder('Email').fill(email!)
    await page.getByPlaceholder('Senha').fill(password!)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('/')

    const checkbox = page.getByRole('checkbox').first()
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    await page.reload()
    await expect(page.getByRole('checkbox').first()).toBeChecked()
  })
})
