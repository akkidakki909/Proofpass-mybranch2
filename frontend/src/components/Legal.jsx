export default function Legal({ doc }) {
  return (
    <main className="legal w">
      <h1>{doc.title}</h1>
      <p className="d m">{doc.date}</p>
      <p>{doc.intro}</p>
      {doc.sections.map(([h, p]) => (
        <section key={h}>
          <h2>{h}</h2>
          <p>{p}</p>
        </section>
      ))}
    </main>
  )
}
