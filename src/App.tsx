import { useEffect, useState } from "react";
import { api } from "./services/api";

export default function App() {
  const [msg, setMsg] = useState("loading...");

  useEffect(() => {
    api("/") // because your backend returns Hello World on "/"
      .then((data) => setMsg(JSON.stringify(data)))
      .catch((e) => setMsg("Error: " + e.message));
  }, []);

  return <div style={{ padding: 20 }}>{msg}</div>;
}