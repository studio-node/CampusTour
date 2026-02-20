// Load .env so EXPO_PUBLIC_* vars are available (e.g. EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY)
require('dotenv').config();

module.exports = require('./app.json');
