import { createBrowserRouter } from "react-router"
import { AuthPage } from "@/features/auth/AuthPage"
import AppLayout from "./AppLayout"
import CalendarPage from "./pages/CalendarPage"
import ExercisePage from "@/features/exercises/ExercisePage"
import ExercisesPage from "@/features/exercises/ExercisesPage"
import NotFoundPage from "./pages/NotFoundPage"
import NutritionPage from "./pages/NutritionPage"
import OnboardingPage from "@/features/onboarding/OnboardingPage"
import ProfilePage from "./pages/ProfilePage"
import ProgressPage from "./pages/ProgressPage"
import TodayPage from "./pages/TodayPage"

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      hydrateFallbackElement: <div className="p-4 text-muted-foreground">Загрузка…</div>,
      children: [
        { index: true, element: <TodayPage /> },
        { path: "calendar", element: <CalendarPage /> },
        { path: "exercises", element: <ExercisesPage /> },
        { path: "exercises/:slug", element: <ExercisePage /> },
        { path: "progress", element: <ProgressPage /> },
        { path: "nutrition", element: <NutritionPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "auth", element: <AuthPage /> },
        { path: "onboarding", element: <OnboardingPage /> },
        { path: "dev/preview", lazy: () => import("./pages/DevPreviewPage").then((m) => ({ Component: m.default })) },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
)
