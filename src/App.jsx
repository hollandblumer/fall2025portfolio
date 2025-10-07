import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Resume from "./pages/Resume.jsx";
import Work from "./pages/Work.jsx";
import Templates from "./pages/Templates.jsx";
import Contact from "./pages/Contact.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/work" element={<Work />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  );
}
