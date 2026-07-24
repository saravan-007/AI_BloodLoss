import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  String? _role;
  bool _isLoading = true;

  Map<String, dynamic>? get user => _user;
  String? get role => _role;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;

  final ApiService _apiService = ApiService();

  AuthProvider() {
    loadSession();
  }

  // Restore authenticated session from Shared Preferences on start
  Future<void> loadSession() async {
    _isLoading = true;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final savedRole = prefs.getString('role');
      final savedUser = prefs.getString('user_data');

      if (token != null && savedRole != null && savedUser != null) {
        _user = json.decode(savedUser);
        _role = savedRole;
      }
    } catch (e) {
      clearSession();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Save session details and notify listeners
  Future<void> login(String token, Map<String, dynamic> userData, String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('role', role);
    await prefs.setString('user_data', json.encode(userData));

    _user = userData;
    _role = role;
    notifyListeners();
  }

  // Log user out and clear persistent files
  Future<void> logout() async {
    await clearSession();
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('role');
    await prefs.remove('user_data');

    _user = null;
    _role = null;
    notifyListeners();
  }

  // Sync profile edits with state and storage
  Future<void> updateUser(Map<String, dynamic> updates) async {
    if (_user != null) {
      _user = {..._user!, ...updates};
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', json.encode(_user));
      notifyListeners();
    }
  }
}
