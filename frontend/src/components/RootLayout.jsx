import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./Navbar";

function RootLayout() {
  // The map fills the screen below the header, so it skips the footer.
  const { pathname } = useLocation();
  const showFooter = pathname !== "/map";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      {showFooter && <Footer />}
    </div>
  );
}

export default RootLayout;
