import { createBrowserRouter } from "react-router"
import { AuthPage } from "@/features/auth/AuthPage"
import AppLayout from "./AppLayout"
import CalendarPage from "./pages/CalendarPage"
import ExercisesPage from "./pages/ExercisesPage"
import NotFoundPage from "./pages/NotFoundPage"
import NutritionPage from "./pages/NutritionPage"
import ProfilePage from "./pages/ProfilePage"
import ProgressPage from "./pages/ProgressPage"
import TodayPage from "./pages/TodayPage"

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      children: [
        { index: true, element: <TodayPage /> },
        { path: "calendar", element: <CalendarPage /> },
        { path: "exercises", element: <ExercisesPage /> },
        { path: "exercises/:slug", element: <ExercisesPage /> },
        { path: "progress", element: <ProgressPage /> },
        { path: "nutrition", element: <NutritionPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "auth", element: <AuthPage /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
)
