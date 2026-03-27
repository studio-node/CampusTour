"""Login and navigation helpers for Selenium E2E."""

from __future__ import annotations

import os

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


def require_credentials() -> tuple[str, str]:
    email = os.environ.get("E2E_ADMIN_EMAIL", "").strip()
    password = os.environ.get("E2E_ADMIN_PASSWORD", "").strip()
    if not email or not password:
        pytest.skip("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run E2E tests.")
    return email, password


def login_admin(driver: webdriver.Chrome, base_url: str, timeout: float = 30) -> None:
    """Sign in via /admin/signin and wait until admin shell is ready."""
    email, password = require_credentials()
    base = base_url.rstrip("/")
    driver.get(f"{base}/admin/signin")
    wait = WebDriverWait(driver, timeout)

    wait.until(EC.presence_of_element_located((By.ID, "email")))
    driver.find_element(By.ID, "email").clear()
    driver.find_element(By.ID, "email").send_keys(email)
    driver.find_element(By.ID, "password").clear()
    driver.find_element(By.ID, "password").send_keys(password)

    driver.find_element(By.CSS_SELECTOR, "form button[type='submit']").click()

    def admin_shell_ready(drv) -> bool:
        url = drv.current_url
        if "/admin/signin" in url:
            return False
        return "/admin" in url

    wait.until(admin_shell_ready)
    wait.until(
        EC.any_of(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Campus Tour Admin')]")),
            EC.presence_of_element_located((By.LINK_TEXT, "Dashboard")),
        )
    )
