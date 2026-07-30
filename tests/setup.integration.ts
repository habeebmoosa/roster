// Load .env so integration tests see DATABASE_URL / DIRECT_URL, exactly as the
// app does. In CI the same variables are provided by the workflow environment.
import "dotenv/config";
