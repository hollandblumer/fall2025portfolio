import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Resume from "./pages/Resume.jsx";
import Work from "./pages/Work.jsx";
import Templates from "./pages/Templates.jsx";
import Contact from "./pages/Contact.jsx";
import LoadingPage from "./pages/LoadingPage.jsx";
import ProjectPage from "./pages/projects/ProjectPage.jsx";
import GAListener from "./components/GAListener.jsx";
export default function App() {
  return (
    <GAListener>
      <Routes>
        {/* keep this one outside if you want a bare loading page */}
        <Route path="/loading" element={<LoadingPage />} />

        {/* everything else inside Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
          <Route path="/work/:slug/:page" element={<ProjectPage />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
      </Routes>
    </GAListener>
  );
}
