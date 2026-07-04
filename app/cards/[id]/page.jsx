import { notFound } from "next/navigation";
import { sampleCards } from "@/lib/sampleCards";
import CardActions from "./CardActions";

export function generateStaticParams() {
  return Object.keys(sampleCards).map((id) => ({ id }));
}

export default async function CardPage({ params }) {
  const { id } = await params;
  const card = sampleCards[id];
  if (!card) notFound();

  return (
    <main className="deck-page">
      <nav className="reader-nav">
        <a href="/">Knowledge Deck</a>
        <div>
          <span>{card.duration}</span>
          <CardActions card={card} />
        </div>
      </nav>

      <section className="deck-hero">
        <div>
          <p className="kicker">3 分钟速读</p>
          <h1>{card.title}</h1>
          <p className="thesis">{card.thesis}</p>
          <p className="reader-note">{card.who}</p>
        </div>
        <aside className="source-panel">
          <span>来源</span>
          <strong>{card.sourceTitle}</strong>
          <a href={card.sourceUrl}>打开原始链接</a>
        </aside>
      </section>

      <section className="memory-map">
        <div className="map-copy">
          <p className="kicker">知识链路</p>
          <h2>这期内容可以压成一条链</h2>
        </div>
        <div className="map-nodes">
          {card.map.map((node, index) => (
            <span key={node}>
              <em>{index + 1}</em>
              {node}
            </span>
          ))}
        </div>
      </section>

      <section className="judgment-grid">
        {card.judgments.map((item, index) => (
          <article className="judgment-card" key={item.title}>
            <div className="card-meta">
              <span>{item.label}</span>
              <a href={`#t=${item.time}`}>{item.time}</a>
            </div>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <div className="why-use">
              <div>
                <strong>为什么重要</strong>
                <span>{item.why}</span>
              </div>
              <div>
                <strong>怎么用</strong>
                <span>{item.use}</span>
              </div>
            </div>
            <small>{index + 1} / {card.judgments.length}</small>
          </article>
        ))}
      </section>

      <section className="turn-section">
        <p className="kicker">判断转折</p>
        <div className="turn-stack">
          {card.turns.map(([label, text]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{text}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="quote-section">
        <div>
          <p className="kicker">记忆锚点</p>
          <h2>几天后还能复述的句子</h2>
        </div>
        {card.quotes.map((quote) => (
          <blockquote key={quote.text}>
            <p>{quote.text}</p>
            <footer>{quote.anchor}</footer>
          </blockquote>
        ))}
      </section>

      <section className="reader-bottom">
        <div>
          <p className="kicker">已保存</p>
          <h2>这张卡片已经进入你的知识库。</h2>
          <p>回到首页后可以继续生成，也可以从知识库重新打开。</p>
        </div>
        <CardActions card={card} />
      </section>
    </main>
  );
}
