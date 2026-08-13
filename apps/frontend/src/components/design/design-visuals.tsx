export function ProjectMock({ variant }: { variant: number }): React.ReactElement {
  return (
    <div className={`vd-mock vd-canvas-${variant}`} aria-hidden>
      <div className="vd-mock-bar">
        <i />
        <i />
        <i />
      </div>
      <div className="vd-mock-body">
        <div className="vd-mock-side">
          <b style={{ width: "78%" }} />
          <b style={{ width: "54%" }} />
          <b style={{ width: "66%" }} />
          <b style={{ width: "40%" }} />
          <b style={{ width: "70%" }} />
        </div>
        <div className="vd-mock-main">
          <span className="vd-mock-row" />
          <span className="vd-mock-row" style={{ width: "28%" }} />
          <div className="vd-mock-grid">
            <div className="vd-mock-card" />
            <div className="vd-mock-card" />
            {variant === 2 ? <div className="vd-mock-card" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
