function TournamentCreateForm({
  formData,
  onChange,
  onSubmit,
  isSaving,
  errorMessage,
}) {
  return (
    <form className="sidebar-card" onSubmit={onSubmit}>
      <h3>Create Official Tournament</h3>
      <p>Only one active tournament is allowed. Fixtures are generated automatically by group.</p>
      <div className="form-grid">
        <label className="field-group">
          <span>Tournament Name</span>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder="ICC Cricket World Cup"
          />
        </label>

        <label className="field-group">
          <span>Format</span>
          <select name="format" value={formData.format} onChange={onChange}>
            <option value="ODI">ODI</option>
            <option value="T20">T20</option>
            <option value="Test">Test</option>
          </select>
        </label>

        <label className="field-group">
          <span>Venue</span>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={onChange}
            placeholder="India"
          />
        </label>

        <label className="field-group">
          <span>Start Date</span>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={onChange}
          />
        </label>

        <label className="field-group">
          <span>Groups</span>
          <select name="groupCount" value={formData.groupCount} onChange={onChange}>
            <option value={1}>1 Group</option>
            <option value={2}>2 Groups</option>
            <option value={4}>4 Groups</option>
          </select>
        </label>

        <label className="field-group">
          <span>Logo URL</span>
          <input
            type="url"
            name="logoUrl"
            value={formData.logoUrl}
            onChange={onChange}
            placeholder="https://example.com/logo.png"
          />
        </label>

        <label className="field-group tournament-field">
          <span>Teams</span>
          <input
            type="text"
            name="teams"
            value={formData.teams}
            onChange={onChange}
            placeholder="India, Australia, England, South Africa, Pakistan, New Zealand, Sri Lanka, Bangladesh"
          />
        </label>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="action-row">
        <button type="submit" className="primary-button" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create Tournament"}
        </button>
      </div>
    </form>
  );
}

export default TournamentCreateForm;
