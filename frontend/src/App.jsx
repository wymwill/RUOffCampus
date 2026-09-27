import ListingPage from "./pages/ListingPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ErrorPage from "./pages/ErrorPage";
import CardInfo from "./pages/CardInfo";
import RootLayout from "./components/RootLayout";
import FavoritesPage from "./pages/FavoritesPage";
import LoginPage from "./pages/LoginPage";
import AddListingPage from "./pages/AddListingPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import InboxPage from "./pages/InboxPage";
import MapPage from "./pages/MapPage";
import ConversationPage from "./pages/ConversationPage";
import MyListingsPage from "./pages/MyListingsPage";
import EditListingPage from "./pages/EditListingPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <ListingPage />,
      },
      {
        path: "map",
        element: <MapPage />,
      },
      {
        path: "favorites",
        element: <FavoritesPage />,
      },
      {
        path: "inbox",
        element: <InboxPage />,
      },
      {
        path: "inbox/:conversationId",
        element: <ConversationPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "auth/forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "auth/reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "listings/new",
        element: <AddListingPage />,
      },
      {
        path: "listings/:listingId",
        element: <CardInfo />,
      },
      {
        path: "listings/:listingId/edit",
        element: <EditListingPage />,
      },
      {
        path: "my-listings",
        element: <MyListingsPage />,
      },
    ],
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
