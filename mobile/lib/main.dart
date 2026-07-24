import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/surgery_provider.dart';
import 'screens/landing_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/doctor/doctor_dashboard_screen.dart';
import 'screens/doctor/patients_screen.dart';
import 'screens/doctor/add_patient_screen.dart';
import 'screens/doctor/patient_detail_screen.dart';
import 'screens/doctor/discharged_patients_screen.dart';
import 'screens/doctor/notifications_screen.dart';
import 'screens/doctor/profile_screen.dart';
import 'screens/surgery/surgery_workflow_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => SurgeryProvider()),
      ],
      child: const BloodLossMonitorApp(),
    ),
  );
}

class BloodLossMonitorApp extends StatelessWidget {
  const BloodLossMonitorApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI Blood Loss Monitor',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF070A13), // Deep Navy dark-bg
        primaryColor: const Color(0xFF3B82F6), // Premium Blue
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3B82F6),
          secondary: Color(0xFF10B981), // Emerald
          surface: Color(0xFF0F172A), // Slate 900
          background: Color(0xFF070A13),
          error: Color(0xFFEF4444), // Rose red
        ),
        cardTheme: const CardTheme(
          color: Color(0xFF0F172A),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
            side: BorderSide(color: Color(0xFF1E293B), width: 0.5),
          ),
        ),
        textTheme: const TextTheme(
          displayLarge: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.w900),
          titleLarge: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold),
          bodyMedium: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.normal),
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const LandingScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/forgot_password': (context) => const ForgotPasswordScreen(),
        '/doctor/dashboard': (context) => const DoctorDashboardScreen(),
        '/doctor/patients': (context) => const PatientsScreen(),
        '/doctor/add_patient': (context) => const AddPatientScreen(),
        '/doctor/patient_detail': (context) => const PatientDetailScreen(),
        '/doctor/discharged_patients': (context) => const DischargedPatientsScreen(),
        '/doctor/notifications': (context) => const NotificationsScreen(),
        '/doctor/profile': (context) => const ProfileScreen(),
        '/surgery/workflow': (context) => const SurgeryWorkflowScreen(),
      },
    );
  }
}
