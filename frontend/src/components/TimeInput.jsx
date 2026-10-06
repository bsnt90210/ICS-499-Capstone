function TimeInput({ minutes, onMinutesChange, onSubmit, loading, validationError }) {
  return (
    <section aria-labelledby="time-heading">
      <h2 id="time-heading">Find games for your time</h2>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="available-minutes">How many minutes do you have?</label>
        <div className="form-row">
          <input
            id="available-minutes"
            type="number"
            min="1"
            step="1"
            value={minutes}
            onChange={(event) => onMinutesChange(event.target.value)}
            aria-describedby={validationError ? 'time-error' : undefined}
            aria-invalid={Boolean(validationError)}
          />
          <button type="submit" disabled={loading}>Find Games</button>
        </div>
        {validationError && <p id="time-error" role="alert">{validationError}</p>}
      </form>
    </section>
  )
}

export default TimeInput
