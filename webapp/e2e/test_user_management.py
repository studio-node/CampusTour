"""E2E: User Management page and Add User modal (cancel, no DB writes)."""

from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


def test_user_management_heading_and_table(logged_in_admin, base_url):
    driver = logged_in_admin
    driver.get(f"{base_url}/admin/users")
    wait = WebDriverWait(driver, 25)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="user-mgmt-heading"]')))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="user-mgmt-all-users"]')))


def test_add_user_modal_open_and_cancel(logged_in_admin, base_url):
    driver = logged_in_admin
    driver.get(f"{base_url}/admin/users")
    wait = WebDriverWait(driver, 25)
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="user-mgmt-add-btn"]'))).click()
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="user-mgmt-add-modal"]')))
    driver.find_element(By.CSS_SELECTOR, '[data-testid="user-mgmt-add-cancel"]').click()

    def modal_closed(drv) -> bool:
        return len(drv.find_elements(By.CSS_SELECTOR, '[data-testid="user-mgmt-add-modal"]')) == 0

    wait.until(modal_closed)
