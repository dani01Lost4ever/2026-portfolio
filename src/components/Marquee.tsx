const items = [
  'Design', 'Development', 'Strategy', 'Product', 'UX',
  'Engineering', 'Interfaces', 'Systems', 'Craft',
]

export default function Marquee() {
  const repeated = [...items, ...items, ...items]

  return (
    <div className="marquee-wrapper">
      <div className="marquee-track">
        {repeated.map((item, i) => (
          <span key={i} className="marquee-item">
            {item} <span className="marquee-dot">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
