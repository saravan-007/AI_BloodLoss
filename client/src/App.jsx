import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Landing      from './pages/Landing';
import Login        from './pages/auth/Login';
import Register     from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Layout
import DashboardLayout from './layouts/DashboardLayout';

// Doctor pages
import DoctorDashboard  from './pages/doctor/Dashboard';
import DoctorPatients   from './pages/doctor/Patients';
import DoctorAddPatient from './pages/doctor/AddPatient';
import DoctorPatientDetail from './pages/doctor/PatientDetail';
import DoctorSurgeries  from './pages/doctor/Surgeries';
import DoctorReports    from './pages/doctor/Reports';
import DoctorProfile    from './pages/doctor/Profile';
import DoctorNotifications from './pages/doctor/Notifications';
import DoctorDischargedPatients from './pages/doctor/DischargedPatients';
import StartSurgery from './pages/doctor/StartSurgery';

// Nurse pages
import NurseDashboard  from './pages/nurse/Dashboard';
import NursePatients   from './pages/nurse/Patients';
import NurseSurgeries  from './pages/nurse/Surgeries';
import NurseDischargedPatients from './pages/nurse/DischargedPatients';
import NurseProfile    from './pages/nurse/Profile';
import NurseNotifications from './pages/nurse/Notifications';

// Surgery workflow pages (shared)
import GauzeCalc      from './pages/surgery/GauzeCalc';
import SuctionBlood   from './pages/surgery/SuctionBlood';
import TotalBloodLoss from './pages/surgery/TotalBloodLoss';
import InsensibleLoss from './pages/surgery/InsensibleLoss';
import UrineCollection from './pages/surgery/UrineCollection';
import TotalFluidLoss from './pages/surgery/TotalFluidLoss';

function App() {
  const { user, role } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to={`/${role}/dashboard`} replace /> : <Landing />} />
        <Route path="/doctor/login"    element={<Login role="doctor" />} />
        <Route path="/doctor/register" element={<Register role="doctor" />} />
        <Route path="/nurse/login"     element={<Login role="nurse" />} />
        <Route path="/nurse/register"  element={<Register role="nurse" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Doctor protected routes */}
        <Route path="/doctor" element={<ProtectedRoute allowedRole="doctor"><DashboardLayout role="doctor" /></ProtectedRoute>}>
          <Route path="dashboard"        element={<DoctorDashboard />} />
          <Route path="patients"         element={<DoctorPatients />} />
          <Route path="discharged-patients" element={<DoctorDischargedPatients />} />
          <Route path="patients/add"     element={<DoctorAddPatient />} />
          <Route path="patients/:id"     element={<DoctorPatientDetail />} />
          <Route path="surgeries"        element={<DoctorSurgeries />} />
          <Route path="start-surgery"    element={<StartSurgery />} />
          <Route path="reports"          element={<DoctorReports />} />
          <Route path="notifications"    element={<DoctorNotifications />} />
          <Route path="profile"          element={<DoctorProfile />} />
          {/* Surgery workflow */}
          <Route path="surgery/:patientId/step1" element={<GauzeCalc />} />
          <Route path="surgery/:patientId/step2" element={<SuctionBlood />} />
          <Route path="surgery/:patientId/step3" element={<TotalBloodLoss />} />
          <Route path="surgery/:patientId/step4" element={<InsensibleLoss />} />
          <Route path="surgery/:patientId/step5" element={<UrineCollection />} />
          <Route path="surgery/:patientId/step6" element={<TotalFluidLoss />} />
        </Route>

        {/* Nurse protected routes */}
        <Route path="/nurse" element={<ProtectedRoute allowedRole="nurse"><DashboardLayout role="nurse" /></ProtectedRoute>}>
          <Route path="dashboard"        element={<NurseDashboard />} />
          <Route path="patients"         element={<NursePatients />} />
          <Route path="discharged-patients" element={<NurseDischargedPatients />} />
          <Route path="patients/add"     element={<DoctorAddPatient />} />
          <Route path="patients/:id"     element={<DoctorPatientDetail />} />
          <Route path="surgeries"        element={<NurseSurgeries />} />
          <Route path="start-surgery"    element={<StartSurgery />} />
          <Route path="notifications"    element={<NurseNotifications />} />
          <Route path="profile"          element={<NurseProfile />} />
          {/* Surgery workflow */}
          <Route path="surgery/:patientId/step1" element={<GauzeCalc />} />
          <Route path="surgery/:patientId/step2" element={<SuctionBlood />} />
          <Route path="surgery/:patientId/step3" element={<TotalBloodLoss />} />
          <Route path="surgery/:patientId/step4" element={<InsensibleLoss />} />
          <Route path="surgery/:patientId/step5" element={<UrineCollection />} />
          <Route path="surgery/:patientId/step6" element={<TotalFluidLoss />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
