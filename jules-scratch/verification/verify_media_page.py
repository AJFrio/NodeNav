from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1200, 'height': 600})
    page = context.new_page()
    page.goto("http://localhost:5173")

    # Click the 'Media' navigation item
    media_button = page.get_by_role("button", name="Media")
    media_button.click()

    # Wait for the view to transition
    page.wait_for_timeout(500)

    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)