/**
 * Runs before each test file (see jest.config.cjs setupFiles).
 * Jest does not load mobile/.env automatically; Expo does at dev/build time.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
