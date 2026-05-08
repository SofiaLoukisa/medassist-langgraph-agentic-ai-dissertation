import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";
import PdfManagementPage from "@/pages/PdfManagementPage";
import PatientsPage from "@/pages/PatientsPage";
import PatientDetailPage from "@/pages/PatientDetailPage";
import MedicineCardsPage from "@/pages/MedicineCardsPage";
import BookmarksPage from "@/pages/BookmarksPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth pages - no layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected pages with DashboardLayout */}
        <Route
          path="/"
          element={
            <DashboardLayout title="Dashboard">
              <DashboardPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/chat"
          element={
            <DashboardLayout title="Chat">
              <ChatPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/chat/:id"
          element={
            <DashboardLayout title="Chat">
              <ChatPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/pdfs"
          element={
            <DashboardLayout title="PDF Documents">
              <PdfManagementPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/patients"
          element={
            <DashboardLayout title="Patients">
              <PatientsPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <DashboardLayout title="Patient Details">
              <PatientDetailPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/cards"
          element={
            <DashboardLayout title="Medicine Cards">
              <MedicineCardsPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/bookmarks"
          element={
            <DashboardLayout title="Bookmarks">
              <BookmarksPage />
            </DashboardLayout>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
