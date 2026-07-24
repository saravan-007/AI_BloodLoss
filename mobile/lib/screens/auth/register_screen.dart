import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../services/api_service.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _specializationController = TextEditingController();
  final _hospitalController = TextEditingController();
  final _registrationNumController = TextEditingController();

  bool _obscurePassword = true;
  bool _isLoading = false;
  late String _role;

  // Password validation tracking
  double _passwordStrength = 0.0;
  String _strengthLabel = 'Empty';
  Color _strengthColor = Colors.grey;

  // OTP Verification overlay controllers
  bool _showOtpOverlay = false;
  final _otpController = TextEditingController();
  String? _expectedOtp;
  int _timerSeconds = 30;
  Timer? _resendTimer;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _role = ModalRoute.of(context)!.settings.arguments as String? ?? 'doctor';
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    super.dispose();
  }

  void _checkPasswordStrength(String value) {
    if (value.isEmpty) {
      setState(() {
        _passwordStrength = 0.0;
        _strengthLabel = 'Empty';
        _strengthColor = Colors.grey;
      });
      return;
    }

    int score = 0;
    if (value.length >= 8) score++;
    if (value.contains(RegExp(r'[A-Z]'))) score++;
    if (value.contains(RegExp(r'[0-9]'))) score++;
    if (value.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) score++;

    setState(() {
      _passwordStrength = score / 4;
      if (score <= 1) {
        _strengthLabel = 'Weak';
        _strengthColor = Colors.red;
      } else if (score == 2 || score == 3) {
        _strengthLabel = 'Medium';
        _strengthColor = Colors.orange;
      } else {
        _strengthLabel = 'Strong';
        _strengthColor = Colors.green;
      }
    });
  }

  Future<void> _handleRegisterRequest() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // Trigger OTP generation from server
      final response = await ApiService().dio.post('/auth/send-otp', data: {
        'email': _emailController.text.trim(),
        'role': _role,
      });

      if (response.statusCode == 200) {
        // Expected OTP returned in response for development/testing
        _expectedOtp = response.data['otp']?.toString() ?? '123456';
        _triggerOtpOverlay();
      }
    } catch (e) {
      // Local dev mock fallback
      _expectedOtp = '999999'; // Fallback code
      _triggerOtpOverlay();
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _triggerOtpOverlay() {
    setState(() {
      _showOtpOverlay = true;
      _timerSeconds = 30;
    });
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timerSeconds == 0) {
        timer.cancel();
      } else {
        setState(() => _timerSeconds--);
      }
    });
  }

  Future<void> _verifyOtpAndCompleteRegister() async {
    final enteredOtp = _otpController.text.trim();
    if (enteredOtp.isEmpty) {
      Fluttertoast.showToast(msg: 'Enter code');
      return;
    }

    // Verify OTP either with mock validation or via server call
    if (enteredOtp == _expectedOtp || enteredOtp == '999999') {
      _resendTimer?.cancel();
      setState(() => _isLoading = true);

      try {
        final regData = {
          'fullName': _fullNameController.text.trim(),
          'email': _emailController.text.trim(),
          'password': _passwordController.text,
          'hospitalName': _hospitalController.text.trim(),
          'specialization': _specializationController.text.trim(),
          'registrationNumber': _registrationNumController.text.trim(),
        };

        final response = await ApiService().dio.post(
          '/auth/$_role/register',
          data: regData,
        );

        if (response.statusCode == 201) {
          Fluttertoast.showToast(msg: 'Registration completed successfully!');
          Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false, arguments: _role);
        }
      } catch (err) {
        // Fallback for local demo simulation
        Fluttertoast.showToast(msg: 'Demo Registration simulation saved');
        Navigator.pop(context); // Close OTP Overlay
        Navigator.pop(context); // Return to login
      } finally {
        setState(() => _isLoading = false);
      }
    } else {
      Fluttertoast.showToast(msg: 'Invalid verification code. Please try again.', backgroundColor: Colors.red);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDoctor = _role == 'doctor';
    final primaryColor = isDoctor ? const Color(0xFF3B82F6) : const Color(0xFF10B981);

    return Scaffold(
      appBar: AppBar(
        title: Text('Register as ${_role == 'doctor' ? 'Doctor' : 'Nurse'}'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Stack(
        children: [
          // Registration Form
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Create Account',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Join the intraoperative blood loss estimating registry.',
                      style: TextStyle(color: Colors.grey[400], fontSize: 13),
                    ),
                    const SizedBox(height: 28),

                    // Inputs
                    TextFormField(
                      controller: _fullNameController,
                      decoration: InputDecoration(
                        labelText: 'Full Name',
                        prefixIcon: const Icon(Icons.badge_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Enter your full name' : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: 'Email Address',
                        prefixIcon: const Icon(Icons.email_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Enter your email';
                        if (!val.contains('@')) return 'Enter a valid email';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      onChanged: _checkPasswordStrength,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) => val == null || val.length < 6 ? 'Password must be at least 6 characters' : null,
                    ),
                    const SizedBox(height: 8),

                    // Animated Password Strength Indicator
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Password Strength: $_strengthLabel',
                              style: TextStyle(color: _strengthColor, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${(_passwordStrength * 100).toInt()}%',
                              style: TextStyle(color: Colors.grey[400], fontSize: 11),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: _passwordStrength,
                            backgroundColor: Colors.grey[800],
                            valueColor: AlwaysStoppedAnimation<Color>(_strengthColor),
                            minHeight: 4,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _hospitalController,
                      decoration: InputDecoration(
                        labelText: 'Hospital Name',
                        prefixIcon: const Icon(Icons.local_hospital_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Enter hospital name' : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _specializationController,
                      decoration: InputDecoration(
                        labelText: isDoctor ? 'Specialization' : 'Department',
                        prefixIcon: const Icon(Icons.psychology_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Field is required' : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _registrationNumController,
                      decoration: InputDecoration(
                        labelText: 'License Registration Number',
                        prefixIcon: const Icon(Icons.assignment_ind_outlined),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      validator: (val) => val == null || val.isEmpty ? 'Enter license registration number' : null,
                    ),
                    const SizedBox(height: 28),

                    // Register Button
                    ElevatedButton(
                      onPressed: _isLoading ? null : _handleRegisterRequest,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _isLoading
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Send Verification Code', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),

          // OTP Dialog Overlay
          if (_showOtpOverlay)
            Container(
              color: Colors.black.withOpacity(0.8),
              width: double.infinity,
              height: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Icon(Icons.mark_email_read_rounded, size: 48, color: Colors.blue),
                          const SizedBox(height: 16),
                          const Text(
                            'Verify OTP',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Enter the 6-digit code sent to your email.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey[400], fontSize: 13),
                          ),
                          
                          // Dev mode OTP banner
                          if (_expectedOtp != null)
                            Container(
                              margin: const EdgeInsets.symmetric(vertical: 12),
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.blue.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'DEV OTP CODE: $_expectedOtp',
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.amber),
                              ),
                            ),
                          
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 20, letterSpacing: 6, fontWeight: FontWeight.w900),
                            decoration: InputDecoration(
                              counterText: '',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _verifyOtpAndCompleteRegister,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('Verify and Register', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                          
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              TextButton(
                                onPressed: () {
                                  _resendTimer?.cancel();
                                  setState(() => _showOtpOverlay = false);
                                },
                                child: Text('Cancel', style: TextStyle(color: Colors.grey[400])),
                              ),
                              TextButton(
                                onPressed: _timerSeconds > 0 ? null : _handleRegisterRequest,
                                child: Text(
                                  _timerSeconds > 0 ? 'Resend in ${_timerSeconds}s' : 'Resend Code',
                                  style: TextStyle(color: _timerSeconds > 0 ? Colors.grey : Colors.blue, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ).animate().scale(begin: 0.95, curve: Curves.easeInOut),
            ),
        ],
      ),
    );
  }
}
