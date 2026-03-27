"""Shared fixtures for webapp Selenium E2E tests."""

from __future__ import annotations

import os
from typing import Generator

import pytest
from helpers import login_admin


def pytest_collection_modifyitems(config, items):
    """Skip E2E tests without starting the browser when credentials are not set."""
    has_creds = (
        os.environ.get("E2E_ADMIN_EMAIL", "").strip()
        and os.environ.get("E2E_ADMIN_PASSWORD", "").strip()
    )
    if has_creds:
        return
    skip = pytest.mark.skip(
        reason="Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (see webapp/e2e/README.md)"
    )
    for item in items:
        item.add_marker(skip)
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service


def _base_url() -> str:
    return os.environ.get("E2E_BASE_URL", "http://127.0.0.1:4173").rstrip("/")


@pytest.fixture(scope="session")
def base_url() -> str:
    return _base_url()


@pytest.fixture
def driver() -> Generator[webdriver.Chrome, None, None]:
    options = Options()
    chrome_bin = os.environ.get("CHROME_BIN") or os.environ.get("GOOGLE_CHROME_BIN")
    if chrome_bin:
        options.binary_location = chrome_bin
    # options.binary_location = "/usr/bin/chromium-browser"
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--disable-gpu")
    service = Service()
    wd = webdriver.Chrome(service=service, options=options)
    wd.implicitly_wait(0)
    try:
        yield wd
    finally:
        wd.quit()


@pytest.fixture
def logged_in_admin(driver: webdriver.Chrome, base_url: str) -> webdriver.Chrome:
    login_admin(driver, base_url)
    return driver
