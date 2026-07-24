import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient decoration
          Positioned(
            top: -100,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF3B82F6).withOpacity(0.15),
                blurRadius: 100,
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(),
                  // Brand Logo & Heading
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.2), width: 1),
                      ),
                      child: const Icon(
                        Icons.healing_rounded,
                        size: 64,
                        color: Color(0xFF3B82F6),
                      ),
                    ).animate().scale(delay: 200.ms, duration: 500.ms, curve: Curves.outBack),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'AI Blood Loss Estimator\n& Fluid Monitor',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.black,
                      height: 1.2,
                      color: Colors.white,
                    ),
                  ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),
                  const SizedBox(height: 12),
                  Text(
                    'Intelligent intraoperative medical monitoring and analytics assistant for surgical departments.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.slate[400],
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ).animate().fadeIn(delay: 600.ms),
                  const Spacer(),
                  // Role selectors
                  Text(
                    'SELECT YOUR ROLE TO ENTER',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.slate[500],
                      fontSize: 11,
                      fontWeight: FontWeight.black,
                      letterSpacing: 1.5,
                    ),
                  ).animate().fadeIn(delay: 700.ms),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pushNamed(context, '/login', arguments: 'doctor');
                    },
                    icon: const Icon(Icons.person_rounded),
                    label: const Text('Enter as Doctor', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ).animate().fadeIn(delay: 800.ms).slideY(begin: 0.1),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () {
                      Navigator.pushNamed(context, '/login', arguments: 'nurse');
                    },
                    icon: const Icon(Icons.medical_services_rounded),
                    label: const Text('Enter as Nurse', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF10B981),
                      side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ).animate().fadeIn(delay: 900.ms).slideY(begin: 0.1),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
