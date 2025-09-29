export default function ContextMethodology() {
  const Section = ({ title, children, defaultOpen = false }) => (
    <details open={defaultOpen} style={{
      background: "#0f172a",
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
    <section id="context" style={{ maxWidth: 960, margin: "28px auto 40px", padding: "0 16px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 12 }}>
        Background, Context & Methodology
      </h2>

      <Section title="Background & Context" defaultOpen>
        <P>
          The Crypto Fear & Greed Mood Tracker summarizes market mood using only public data—
          no wallets or personal info. It blends price momentum, a volatility proxy, and on-chain
          “heat” (gas prices) into a single 0–100 score with labels like Extreme Fear → Extreme Greed.
          It’s designed to be educational, not financial advice.
        </P>
        <ul style={{ paddingLeft: 18 }}>
          <Li><b>Privacy:</b> no personal data collected; only public APIs are used.</Li>
          <Li><b>Reproducibility:</b> inputs and transforms are simple and explainable.</Li>
          <Li><b>Sources:</b> CoinGecko for BTC/ETH prices & 24h change; Ethereum/Base RPCs for gas.</Li>
        </ul>
        <P>
          <b>What is Gwei?</b> Gwei stands for <i>“gigawei”</i>, equal to 1,000,000,000 wei
          = 10⁻⁹ ETH. It’s the standard unit for expressing Ethereum gas fees.
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

        <P><b>How gas is measured:</b> the API tries multiple RPC methods, using the first valid:</P>
        <ul style={{ paddingLeft: 18 }}>
          <Li><Code>eth_feeHistory</Code> → last <Code>baseFeePerGas</Code></Li>
          <Li><Code>eth_gasPrice</Code> → gas price in wei</Li>
          <Li><Code>eth_getBlockByNumber</Code> → <Code>baseFeePerGas</Code> from latest block</Li>
        </ul>

        <P><b>Normalization</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li><b>Momentum:</b> clip 24h change to [-10%, +10%], map linearly to [0,100]. 0% = 50.</Li>
          <Li><b>Heat:</b> log-scaled buckets: ~1 gwei = low, 10–30 = medium, 30–100+ = high.</Li>
        </ul>

        <P><b>Aggregation</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li>Momentum = average of BTC & ETH momentum</Li>
          <Li>Heat = average of Ethereum & Base gas heat</Li>
          <Li>Optional volatility penalty for extreme swings</Li>
          <Li>Final score = weighted blend (Momentum 0.5, Heat 0.35, Volatility 0.15)</Li>
        </ul>

        <P><b>Buckets</b></P>
        <ul style={{ paddingLeft: 18 }}>
          <Li>0–20: Extreme Fear</Li>
          <Li>21–40: Fear</Li>
          <Li>41–60: Neutral</Li>
          <Li>61–80: Greed</Li>
          <Li>81–100: Extreme Greed</Li>
        </ul>

        <P style={{ fontSize: "0.9rem", opacity: 0.9 }}>
          <b>Disclaimer:</b> Informational/educational only. Not investment advice.
        </P>
      </Section>
    </section>
  );
}
