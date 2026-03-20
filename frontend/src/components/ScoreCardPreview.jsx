const battingCard = [
  { name: "R. Sharma", runs: 42, balls: 28, strikeRate: 150.0 },
  { name: "S. Gill", runs: 36, balls: 24, strikeRate: 150.0 },
  { name: "V. Kohli", runs: 18, balls: 12, strikeRate: 150.0 },
];

function ScoreCardPreview() {
  return (
    <section className="scorecard">
      <div className="scorecard-header">
        <div>
          <h2>India vs Australia</h2>
          <p>T20 Match, Wankhede Stadium, Mumbai</p>
        </div>
        <span className="live-pill">Live</span>
      </div>

      <div className="score-strip">
        <div className="score-box">
          <span className="innings-label">Score</span>
          <strong>128/3</strong>
        </div>
        <div className="score-box">
          <span className="innings-label">Overs</span>
          <strong>14.2</strong>
        </div>
        <div className="score-box">
          <span className="innings-label">Run Rate</span>
          <strong>8.93</strong>
        </div>
      </div>

      <table className="batters-table">
        <thead>
          <tr>
            <th>Batter</th>
            <th>R</th>
            <th>B</th>
            <th>SR</th>
          </tr>
        </thead>
        <tbody>
          {battingCard.map((player) => (
            <tr key={player.name}>
              <td>{player.name}</td>
              <td>{player.runs}</td>
              <td>{player.balls}</td>
              <td>{player.strikeRate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default ScoreCardPreview;
