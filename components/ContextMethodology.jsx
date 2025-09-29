export default function ContextMethodology() {
  const Section = ({ title, children, defaultOpen = false }) => (
    <details open={defaultOpen} style={{
      background: "#0f172a", // deep slate
      color: "#e5e7eb",
      border: "1px solid #1f2937",
      borderRadius: "12px",
      padding: "16px 18px",
      marginBottom: "14px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)"
    }}>
      <summary style={{
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "1.05rem",
        listStyle: "none",
        outline: "none"
      }}>{title}</summary>
      <div style={{ marginTop: "12px", lineHeight: 1.6, fontSize: "0.975rem" }}>
        {children}
      </div>
    </details>
  );

  const P = (props) => <p style={{ margin: "10px 0" }} {...props} />;
  const Li = (props) => <li style={{ margin: "6px 0" }} {...props} />;
  const Code = (props) => (
    <code style={{ background: "#111827", padding: "0 6px", borderRadius: "6px" }} {...props} />
  );

  return (
    <section style={{ maxWidth: 960, margin: "28px auto 40px", padding: "0 16px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 12 }}>
        Crypto Fear & Greed — Background, Context & Methodology
      </h2>

      <P><b>Board URL:</b> <a href="https://crypto-mood-board.vercel.app"
        target="_blank" rel="noreferrer"
        style={{ color: "#93c5fd", textDecoration: "underline" }}>
        crypto-mood-board.vercel.app
      </a></P>

      <Section title="Background & Context" defaultOpen>
        <P>
          The dashboard summarizes market mood using only public data—no wallets or personal info.
          It blends price momentum, a volatility proxy, and on-chain “heat” (gas prices) into a single
          0–100 score with labels like Extreme Fear → Extreme Greed. It’s educational, not financial advice.
        </P>
        <ul style={{ paddingLeft: 18 }}>
          <Li><b>Privacy:</b> no personal data collected; we only request public market/RPC data.</Li>
          <Li><b>Reproducible:</b> simple, explainable transforms; results are easy to audit.</Li>
          <Li><b>Sources:</b> CoinGecko for BTC/ETH prices & 24h change; public (or keyed) Ethereum/Base RPCs for gas.</Li>
        </ul>
        <P>
          <b>What is Gwei?</b> Gwei stands for <i>“gigawei”</i>, which is <b>1,000,000,000 wei</b> = <b>10⁻⁹ ETH</b>.
          It’s the standard unit for expressing Ethereum gas fees.
        </P>
      </Section>

      <Section title="Methodology">
        <P><b>Inputs</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li>BTC 24h percent change (momentum proxy)</Li>
          <Li>ETH 24h percent change (momentum proxy)</Li>
          <Li>Ethereum gas in gwei (base fee or gas price)</Li>
          <Li>Base gas in gwei (base fee or gas price)</Li>
        </ul>

        <P><b>How we read gas (serverless API):</b> we try multiple RPC methods and take the first valid value:</P>
        <ul style={{ paddingLeft: 18 }}>
          <Li><Code>eth_feeHistory</Code> → last <Code>baseFeePerGas</Code></Li>
          <Li><Code>eth_gasPrice</Code> → gas price in wei</Li>
          <Li><Code>eth_getBlockByNumber</Code> → block <Code>baseFeePerGas</Code></Li>
        </ul>
        <P>Hex values are converted from wei → gwei using precise BigInt math.</P>

        <P><b>Normalization</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li><b>Momentum:</b> clip 24h change to [-10%, +10%] then map linearly to [0, 100] (0% → 50).</Li>
          <Li><b>Heat:</b> log-style buckets: ~1 gwei = low, 10–30 = medium, 30–100+ = high (configurable).</Li>
        </ul>

        <P><b>Aggregation</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li>Momentum score = average of BTC & ETH momentum sub-scores</Li>
          <Li>Heat score = average of Ethereum & Base heat sub-scores</Li>
          <Li>Optional volatility penalty for extreme swings</Li>
          <Li><b>Final score</b> = weighted blend (Momentum 0.5, Heat 0.35, Volatility 0.15)</Li>
        </ul>

        <P><b>Buckets</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li>0–20: Extreme Fear</Li>
          <Li>21–40: Fear</Li>
          <Li>41–60: Neutral</Li>
          <Li>61–80: Greed</Li>
          <Li>81–100: Extreme Greed</Li>
        </ul>

        <P><b>Limitations</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li>Public RPCs can throttle; a free API key improves stability.</Li>
          <Li>Gas is a point-in-time snapshot and varies block to block.</Li>
          <Li>24h change is a coarse momentum proxy and can flip quickly.</Li>
        </ul>

        <P style={{ fontSize: "0.9rem", opacity: 0.9 }}>
          <b>Disclaimer:</b> Informational/educational only. Not investment advice.
        </P>
      </Section>
    </section>
  );
}
