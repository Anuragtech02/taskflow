/**
 * Cloudflare Worker entry point.
 *
 * Re-exports vinext's route-wired App Router handler. This is the SSR entry
 * that carries the app's route table — deploying the raw dist/server/index.js
 * RSC module instead yields a worker that renders but 404s every route.
 *
 * No wrapper is needed because we don't use Cloudflare Images (image
 * optimization = none). Apps that do would wrap handler.fetch() to intercept
 * the image-optimization path first (see vinext/server/image-optimization).
 */
import handler from "vinext/server/app-router-entry";

export default handler;
