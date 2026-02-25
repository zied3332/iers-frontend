import React from "react";
import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>403 - Access denied</h1>
      <p style={{ marginBottom: 16 }}>
        You are logged in, but you don’t have permission to access this page.
      </p>
      <Link to="/" className="btn btn-primary">
        Go to home
      </Link>
    </div>
  );
}