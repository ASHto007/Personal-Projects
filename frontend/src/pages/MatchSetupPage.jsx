import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createMatch } from "../services/matchService";
import RoleNav from "../components/RoleNav";

function MatchSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill || null;
  const [formData, setFormData] = useState({
    teamOne: "",
    teamTwo: "",
    format: "T20",
    overs: 20,
    tossWinner: "",
    tossDecision: "bat",
    striker: "",
    nonStriker: "",
    bowler: "",
    teamSquads: {},
    tournamentContext: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!prefill) {
      return;
    }

    setFormData((currentValue) => ({
      ...currentValue,
      ...prefill,
    }));
  }, [prefill]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentValue) => {
      const nextValue = {
        ...currentValue,
        [name]: value,
      };

      if (
        (name === "teamOne" && currentValue.tossWinner === currentValue.teamOne) ||
        (name === "teamTwo" && currentValue.tossWinner === currentValue.teamTwo)
      ) {
        nextValue.tossWinner = value;
      }

      return nextValue;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      await createMatch(formData);
      navigate("/admin/live-score");
    } catch (error) {
      setErrorMessage(error.message || "Unable to save match setup.");
    } finally {
      setIsSaving(false);
    }
  }

  const setupChecklist = [
    {
      label: "Teams",
      value:
        formData.teamOne && formData.teamTwo
          ? `${formData.teamOne} vs ${formData.teamTwo}`
          : "Add both team names",
    },
    {
      label: "Toss",
      value:
        formData.tossWinner && formData.tossDecision
          ? `${formData.tossWinner} chose to ${formData.tossDecision}`
          : "Select toss winner and decision",
    },
    {
      label: "Openers",
      value:
        formData.striker && formData.nonStriker
          ? `${formData.striker} and ${formData.nonStriker}`
          : "Enter striker and non-striker",
    },
    {
      label: "Bowler",
      value: formData.bowler || "Enter opening bowler",
    },
  ];

  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role="admin" />

        <section className="hero-panel">
          <span className="eyebrow">Step 2</span>
          <h1>Prepare The Match Before Scoring</h1>
          <p>
            Fill out the match details here, then move to the scoring desk once the teams
            and opening players are confirmed.
          </p>
        </section>

        <section className="quick-guide-grid">
          {setupChecklist.map((item) => (
            <article key={item.label} className="sidebar-card quick-guide-card">
              <span className="section-label">{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        <form className="sidebar-card" onSubmit={handleSubmit}>
          <div className="section-toolbar">
            <div>
              <h3>Match Setup Form</h3>
              <p>Complete the fields in this order to make the scoring desk easier to use.</p>
            </div>
          </div>

          <section className="form-section">
            <div className="section-label">Match Basics</div>
            <div className="form-grid">
              <label className="field-group">
                <span>Team One</span>
                <input
                  type="text"
                  name="teamOne"
                  placeholder="Enter first team name"
                  value={formData.teamOne}
                  onChange={handleChange}
                />
              </label>

              <label className="field-group">
                <span>Team Two</span>
                <input
                  type="text"
                  name="teamTwo"
                  placeholder="Enter second team name"
                  value={formData.teamTwo}
                  onChange={handleChange}
                />
              </label>

              <label className="field-group">
                <span>Match Format</span>
                <select name="format" value={formData.format} onChange={handleChange}>
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                  <option value="Test">Test</option>
                </select>
              </label>

              <label className="field-group">
                <span>Overs</span>
                <input
                  type="number"
                  name="overs"
                  placeholder="20"
                  min="1"
                  value={formData.overs}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-label">Toss Details</div>
            <div className="form-grid">
              <label className="field-group">
                <span>Toss Winner</span>
                <select
                  name="tossWinner"
                  value={formData.tossWinner}
                  onChange={handleChange}
                >
                  <option value="">Select toss winner</option>
                  {formData.teamOne ? (
                    <option value={formData.teamOne}>{formData.teamOne}</option>
                  ) : null}
                  {formData.teamTwo ? (
                    <option value={formData.teamTwo}>{formData.teamTwo}</option>
                  ) : null}
                </select>
              </label>

              <label className="field-group">
                <span>Toss Decision</span>
                <select
                  name="tossDecision"
                  value={formData.tossDecision}
                  onChange={handleChange}
                >
                  <option value="bat">Bat First</option>
                  <option value="bowl">Bowl First</option>
                </select>
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-label">Opening Players</div>
            <div className="form-grid">
              <label className="field-group">
                <span>Striker</span>
                <input
                  type="text"
                  name="striker"
                  placeholder="Opening batter"
                  value={formData.striker}
                  onChange={handleChange}
                />
              </label>

              <label className="field-group">
                <span>Non-Striker</span>
                <input
                  type="text"
                  name="nonStriker"
                  placeholder="Second batter"
                  value={formData.nonStriker}
                  onChange={handleChange}
                />
              </label>

              <label className="field-group">
                <span>Current Bowler</span>
                <input
                  type="text"
                  name="bowler"
                  placeholder="Opening bowler"
                  value={formData.bowler}
                  onChange={handleChange}
                />
              </label>
            </div>
          </section>

          <section className="helper-card match-setup-helper">
            <h3>Before You Start Live Scoring</h3>
            <div className="helper-grid">
              <div className="helper-item">
                <span className="helper-step">1</span>
                <div>
                  <strong>Confirm the teams</strong>
                  <p>Make sure the match pairing is correct before saving.</p>
                </div>
              </div>
              <div className="helper-item">
                <span className="helper-step">2</span>
                <div>
                  <strong>Set the toss</strong>
                  <p>Choose the toss winner and whether they bat or bowl first.</p>
                </div>
              </div>
              <div className="helper-item">
                <span className="helper-step">3</span>
                <div>
                  <strong>Enter the opening players</strong>
                  <p>Add striker, non-striker, and bowler so live scoring can start smoothly.</p>
                </div>
              </div>
            </div>
          </section>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <div className="action-row">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Start Match"}
            </button>
            <Link to="/admin/live-score" className="secondary-link">
              Continue to Live Score
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default MatchSetupPage;
