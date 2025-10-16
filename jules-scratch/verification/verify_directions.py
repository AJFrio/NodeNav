from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/navigate")

        # Click the search button
        search_button = page.locator('button:has(svg)').first
        expect(search_button).to_be_visible()
        search_button.click(force=True)

        page.wait_for_timeout(2000) # Wait for the component to render

        # Fill in the destination
        destination_input = page.get_by_placeholder("Search for a destination")
        expect(destination_input).to_be_visible()
        destination_input.fill("Eiffel Tower")

        # Click the search button in the form
        submit_button = page.get_by_role("button").nth(1)
        expect(submit_button).to_be_visible()
        submit_button.click()

        # Click the first result
        first_result = page.locator('li').first
        expect(first_result).to_be_visible()
        first_result.click()

        page.wait_for_timeout(3000) # Wait for the route to be drawn

        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)