export const config = { api: { bodyParser: false } };

function mask(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    // Keep host + last 6 chars so you can recognize it without leaking secrets
    const tail = url.href.slice(-6);
    return `${url.protocol}//${url.host}/…${tail}`;
  } catch {
    return 'set-but-not-a-url';
  }
}

export default async function handler(_req, res) {
  res.status(200).json({
    env: {
      ETH_RPC_URL: mask(process.env.ETH_RPC_URL || null),
      BASE_RPC_URL: mask(process.env.BASE_RPC_URL || null),
      VERCEL_ENV: process.env.VERCEL_ENV || null   // "production" | "preview" | "development"
    },
    note: "If ETH/BASE show null here, add them in Vercel → Settings → Environment Variables for the environment you're deploying to (Production or Preview), then redeploy."
  });
}
