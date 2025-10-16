from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")

        # Click the navigation button
        nav_button = page.get_by_role("button", name="Navigation")
        expect(nav_button).to_be_visible()
        nav_button.click()

        # Click the search button to expand the input
        search_button = page.locator('button:has(svg)').first
        expect(search_button).to_be_visible()
        search_button.click()

        page.wait_for_timeout(500) # wait for animation

        page.screenshot(path="jules-scratch/verification/search_expanded.png")

        # Click the search button to retract the input
        search_button.click()

        page.wait_for_timeout(500) # wait for animation

        page.screenshot(path="jules-scratch/verification/search_retracted.png")

        # Click the search button to expand the input
        search_button.click()

        # Fill in the destination
        destination_input = page.get_by_placeholder("Search...")
        expect(destination_input).to_be_visible()
        destination_input.fill("Eiffel Tower")

        # Click the search button to submit
        submit_button = page.locator('button:has(svg)').first
        expect(submit_button).to_be_visible()
        submit_button.click()

        page.wait_for_selector('li')

        # Screenshot of search results
        page.screenshot(path="jules-scratch/verification/search_results.png")

        # Click the first result
        first_result = page.locator('li').first
        expect(first_result).to_be_visible()
        first_result.click()

        page.wait_for_timeout(2000) # Wait for the route to be drawn

        page.screenshot(path="jules-scratch/verification/route.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)