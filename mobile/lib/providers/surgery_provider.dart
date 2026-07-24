import 'package:flutter/material.dart';

class SurgeryProvider extends ChangeNotifier {
  // Surgery Workflow Metadata
  String? _patientId;
  String? _patientName;
  double _patientWeight = 70.0;
  String? _surgeryType;
  DateTime? _startTime;

  // Step 1: Gauze
  int _smallGauzeCount = 0;
  double _smallGauzeValue = 10.0; // ml per gauze
  int _largeGauzeCount = 0;
  double _largeGauzeValue = 30.0; // ml per gauze
  double _totalGauzeBlood = 0.0;

  // Step 2: Suction
  double _suctionBottleValue = 0.0;
  double _salineUsed = 0.0;
  double _suctionBlood = 0.0;

  // Step 3: Combined Blood Loss
  double _totalBloodLoss = 0.0;
  double _bloodLossPct = 0.0;
  String _bloodLossSeverity = 'Low';

  // Step 4: Insensible Loss
  double _surgeryDuration = 1.0; // Hours
  double _insensibleLoss = 0.0;

  // Step 5: Urine
  double _urineCollected = 0.0;

  // Step 6: Summary
  double _totalFluidLoss = 0.0;
  Map<String, dynamic>? _aiAnalysis;

  // Getters
  String? get patientId => _patientId;
  String? get patientName => _patientName;
  double get patientWeight => _patientWeight;
  String? get surgeryType => _surgeryType;
  DateTime? get startTime => _startTime;

  int get smallGauzeCount => _smallGauzeCount;
  double get smallGauzeValue => _smallGauzeValue;
  int get largeGauzeCount => _largeGauzeCount;
  double get largeGauzeValue => _largeGauzeValue;
  double get totalGauzeBlood => _totalGauzeBlood;

  double get suctionBottleValue => _suctionBottleValue;
  double get salineUsed => _salineUsed;
  double get suctionBlood => _suctionBlood;

  double get totalBloodLoss => _totalBloodLoss;
  double get bloodLossPct => _bloodLossPct;
  String get bloodLossSeverity => _bloodLossSeverity;

  double get surgeryDuration => _surgeryDuration;
  double get insensibleLoss => _insensibleLoss;

  double get urineCollected => _urineCollected;

  double get totalFluidLoss => _totalFluidLoss;
  Map<String, dynamic>? get aiAnalysis => _aiAnalysis;

  bool get hasActiveWorkflow => _patientId != null;

  // Start new surgery session
  void startSurgeryWorkflow(String pId, String pName, double weight, String type) {
    _patientId = pId;
    _patientName = pName;
    _patientWeight = weight;
    _surgeryType = type;
    _startTime = DateTime.now();

    // Reset details
    _smallGauzeCount = 0;
    _largeGauzeCount = 0;
    _totalGauzeBlood = 0.0;
    _suctionBottleValue = 0.0;
    _salineUsed = 0.0;
    _suctionBlood = 0.0;
    _totalBloodLoss = 0.0;
    _bloodLossPct = 0.0;
    _bloodLossSeverity = 'Low';
    _surgeryDuration = 1.0;
    _insensibleLoss = 0.0;
    _urineCollected = 0.0;
    _totalFluidLoss = 0.0;
    _aiAnalysis = null;

    notifyListeners();
  }

  // Setters & Calculations
  void updateGauze({required int smallCount, required int largeCount, double? smallVal, double? largeVal}) {
    _smallGauzeCount = smallCount;
    _largeGauzeCount = largeCount;
    if (smallVal != null) _smallGauzeValue = smallVal;
    if (largeVal != null) _largeGauzeValue = largeVal;

    _totalGauzeBlood = (_smallGauzeCount * _smallGauzeValue) + (_largeGauzeCount * _largeGauzeValue);
    _calculateCombinedBloodLoss();
    notifyListeners();
  }

  void updateSuction({required double bottleValue, required double salineUsed}) {
    _suctionBottleValue = bottleValue;
    _salineUsed = salineUsed;
    _suctionBlood = (_suctionBottleValue - _salineUsed).clamp(0.0, double.infinity);
    _calculateCombinedBloodLoss();
    notifyListeners();
  }

  void _calculateCombinedBloodLoss() {
    _totalBloodLoss = _totalGauzeBlood + _suctionBlood;
    final double estimatedBloodVolume = _patientWeight * 70.0; // 70 ml/kg average
    _bloodLossPct = (_totalBloodLoss / estimatedBloodVolume) * 100;

    if (_totalBloodLoss >= 2000 || _bloodLossPct >= 40) {
      _bloodLossSeverity = 'Critical';
    } else if (_totalBloodLoss >= 1500 || _bloodLossPct >= 30) {
      _bloodLossSeverity = 'Severe';
    } else if (_totalBloodLoss >= 750 || _bloodLossPct >= 15) {
      _bloodLossSeverity = 'Moderate';
    } else {
      _bloodLossSeverity = 'Low';
    }
  }

  void updateInsensibleLoss({required double duration}) {
    _surgeryDuration = duration;
    // Insensible loss formula: 2ml * weight * duration (hrs)
    _insensibleLoss = 2.0 * _patientWeight * _surgeryDuration;
    _calculateTotalFluidLoss();
    notifyListeners();
  }

  void updateUrineCollected({required double urine}) {
    _urineCollected = urine;
    _calculateTotalFluidLoss();
    notifyListeners();
  }

  void _calculateTotalFluidLoss() {
    _totalFluidLoss = _totalBloodLoss + _urineCollected + _insensibleLoss;
  }

  void setAiAnalysis(Map<String, dynamic> analysis) {
    _aiAnalysis = analysis;
    notifyListeners();
  }

  // Clear workflow on discharge or completion
  void clearWorkflow() {
    _patientId = null;
    _patientName = null;
    _surgeryType = null;
    _startTime = null;
    _aiAnalysis = null;
    notifyListeners();
  }
}
