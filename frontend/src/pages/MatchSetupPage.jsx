import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createMatch } from "../services/matchService";
import RoleNav from "../components/RoleNav";

function MatchSetupPage() {
  const navigate = useNavigate();
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
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  return (
    <main className="app-shell">
      <div className="app-frame">
        <RoleNav role="admin" />

        <section className="hero-panel">
          <span className="eyebrow">Step 2</span>
          <h1>Match Setup</h1>
          <p>
            This page prepares the basic match details before the live score
            screen is started.
          </p>
        </section>

        <form className="sidebar-card" onSubmit={handleSubmit}>
          <h3>Basic Match Form</h3>
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
              <select
                name="format"
                value={formData.format}
                onChange={handleChange}
              >
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

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <div className="action-row">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Match Setup"}
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
