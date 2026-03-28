import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h2>שגיאה בלתי צפויה</h2>
          <p>{this.state.error.message}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            טען מחדש
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
