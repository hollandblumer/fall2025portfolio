import { Outlet, useLocation } from "react-router-dom";
import Nav from "./Nav";

export default function RootLayout() {
  const { pathname } = useLocation();
  const hideNav = pathname === "/loading"; // ← adjust if your route differs

  return (
    <>
      <Outlet />
    </>
  );
}
