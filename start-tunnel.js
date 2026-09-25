import { startTunnel } from "untun";

async function main() {
  console.log("[TUNNEL] Requesting secure Cloudflare Quick Tunnel for port 3000...");
  const tunnel = await startTunnel({ port: 3000 });
  const url = await tunnel.getURL();
  console.log(`[PUBLIC_URL] ${url}`);
}

main().catch((err) => {
  console.error("[TUNNEL_ERROR]", err);
});
