// OpenNext Cloudflare adapter config. Default configuration is enough for a
// lead gen site: static pages served from Cloudflare's asset store, the single
// dynamic /api/lead route runs as a Worker (Node runtime). No incremental
// cache / queue needed. See https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
