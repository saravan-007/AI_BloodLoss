import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/auth_provider.dart';
import '../../providers/surgery_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/ai_chatbot_sheet.dart';

class DoctorDashboardScreen extends StatefulWidget {
  const DoctorDashboardScreen({Key? key}) : super(key: key);

  @override
  State<DoctorDashboardScreen> createState() => _DoctorDashboardScreenState();
}

class _DoctorDashboardScreenState extends State<DoctorDashboardScreen> {
  bool _isLoading = true;
  int _totalPatients = 0;
  int _totalSurgeriesToday = 0;
  double _totalBloodLossToday = 0.0;

  // Simulation parameters
  bool _isSimulating = false;
  Timer? _simTimer;
  int _simSeconds = 0;
  int _simHr = 88;
  String _simBp = '120/80';
  int _simSpo2 = 98;
  double _simGauzeLoss = 120.0;
  double _simSuctionLoss = 200.0;
  double _simUrine = 100.0;
  double _simInsensible = 45.0;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  @override
  void dispose() {
    _simTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchStats() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService().dio.get('/surgeries/stats');
      if (response.statusCode == 200 && response.data != null) {
        setState(() {
          _totalPatients = response.data['totalPatients'] ?? 0;
          _totalSurgeriesToday = response.data['totalSurgeriesToday'] ?? 0;
          _totalBloodLossToday = (response.data['totalBloodLossToday'] ?? 0).toDouble();
        });
      }
    } catch (e) {
      // Local fallback metrics
      setState(() {
        _totalPatients = 24;
        _totalSurgeriesToday = 3;
        _totalBloodLossToday = 1450.0;
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _toggleSimulation() {
    if (_isSimulating) {
      _simTimer?.cancel();
      setState(() => _isSimulating = false);
      Fluttertoast.showToast(msg: 'Surgery simulation stopped');
    } else {
      setState(() {
        _isSimulating = true;
        _simSeconds = 0;
        _simHr = 88;
        _simBp = '120/80';
        _simSpo2 = 98;
        _simGauzeLoss = 100.0;
        _simSuctionLoss = 150.0;
      });
      Fluttertoast.showToast(msg: 'Live surgery simulation started');
      _simTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
        setState(() {
          _simSeconds += 2;
          
          // Randomly fluctuate measurements
          if (_simSeconds % 6 == 0) _simGauzeLoss += Random().nextInt(15) + 5;
          if (_simSeconds % 8 == 0) _simSuctionLoss += Random().nextInt(25) + 10;
          if (_simSeconds % 10 == 0) _simUrine += Random().nextInt(8) + 2;
          _simInsensible = 2.0 * 70.0 * (_simSeconds / 3600.0 + 0.1); // weight=70

          final double totalLoss = _simGauzeLoss + _simSuctionLoss;
          _simHr = totalLoss > 500 ? (105 + Random().nextInt(10)) : (80 + Random().nextInt(8));
          _simSpo2 = totalLoss > 750 ? (92 + Random().nextInt(4)) : (96 + Random().nextInt(4));
          
          final sys = totalLoss > 750 ? (95 + Random().nextInt(10)) : (115 + Random().nextInt(10));
          final dia = totalLoss > 750 ? (55 + Random().nextInt(8)) : (75 + Random().nextInt(8));
          _simBp = '$sys/$dia';
        });
      });
    }
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: Colors.slate[400], fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.black)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final role = Provider.of<AuthProvider>(context).role;
    final hasActiveWf = Provider.of<SurgeryProvider>(context).hasActiveWorkflow;
    final activeWf = Provider.of<SurgeryProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI BloodLoss Monitor', style: TextStyle(fontWeight: FontWeight.black)),
        centerTitle: false,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.pushNamed(context, '/doctor/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline_rounded),
            onPressed: () => Navigator.pushNamed(context, '/doctor/profile'),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF0F172A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFF070A13)),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.blue,
                child: Text(
                  user?['fullName']?.substring(0, 1)?.toUpperCase() ?? 'U',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.black, color: Colors.white),
                ),
              ),
              accountName: Text(user?['fullName'] ?? 'Active User', style: const TextStyle(fontWeight: FontWeight.bold)),
              accountEmail: Text(user?['email'] ?? 'user@hospital.com'),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard_rounded, color: Colors.blue),
              title: const Text('Dashboard'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.people_alt_rounded),
              title: const Text('Patients Registry'),
              onTap: () => Navigator.pushNamed(context, '/doctor/patients'),
            ),
            ListTile(
              leading: const Icon(Icons.archive_outlined),
              title: const Text('Discharged Cases'),
              onTap: () => Navigator.pushNamed(context, '/doctor/discharged_patients'),
            ),
            ListTile(
              leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
              title: const Text('Logout'),
              onTap: () async {
                await Provider.of<AuthProvider>(context, listen: false).logout();
                Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
              },
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Welcome Header
            Text(
              'Welcome, ${user?['fullName'] ?? 'Doctor'}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.black),
            ),
            Text(
              'Here is the surgical department summary for today.',
              style: TextStyle(color: Colors.slate[400], fontSize: 13),
            ),
            const SizedBox(height: 20),

            // Statistics Grid
            _isLoading
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    children: [
                      _buildStatCard('TOTAL PATIENTS', '$_totalPatients', Icons.people_outline, Colors.blue),
                      const SizedBox(height: 8),
                      _buildStatCard('SURGERIES TODAY', '$_totalSurgeriesToday', Icons.medical_services_outlined, Colors.emerald),
                      const SizedBox(height: 8),
                      _buildStatCard('AGGREGATE BLOOD LOSS', '${_totalBloodLossToday.toInt()} ml', Icons.bloodtype_outlined, Colors.rose),
                    ],
                  ),
            const SizedBox(height: 20),

            // Line Chart
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Blood Loss Trend (Avg)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 20),
                    SizedBox(
                      height: 180,
                      child: LineChart(
                        LineChartData(
                          gridData: const FlGridData(show: false),
                          titlesData: const FlTitlesData(show: false),
                          borderData: FlBorderData(show: false),
                          minX: 0,
                          maxX: 6,
                          minY: 0,
                          maxY: 1000,
                          lineBarsData: [
                            LineChartBarData(
                              spots: const [
                                FlSpot(0, 320),
                                FlSpot(1, 480),
                                FlSpot(2, 250),
                                FlSpot(3, 610),
                                FlSpot(4, 390),
                                FlSpot(5, 720),
                                FlSpot(6, 180),
                              ],
                              isCurved: true,
                              color: Colors.redAccent,
                              barWidth: 3,
                              dotData: const FlDotData(show: false),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Active Surgery Session Workflow
            if (hasActiveWf) ...[
              Card(
                color: Colors.blue.withOpacity(0.05),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Colors.blue, width: 1),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('ONGOING SURGERY SESSION', style: TextStyle(fontWeight: FontWeight.black, fontSize: 11, color: Colors.blue, letterSpacing: 1)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, py: 4),
                            decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(6)),
                            child: const Text('LIVE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(activeWf.patientName ?? 'Patient', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.black)),
                      Text(activeWf.surgeryType ?? 'Procedure', style: TextStyle(color: Colors.slate[400], fontSize: 13)),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('BLOOD LOSS', style: TextStyle(color: Colors.slate[500], fontSize: 9, fontWeight: FontWeight.bold)),
                              Text('${activeWf.totalBloodLoss.toInt()} ml', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.black, color: Colors.redAccent)),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('FLUID LOSS', style: TextStyle(color: Colors.slate[500], fontSize: 9, fontWeight: FontWeight.bold)),
                              Text('${activeWf.totalFluidLoss.toInt()} ml', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.black, color: Colors.amber)),
                            ],
                          ),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pushNamed(context, '/surgery/workflow');
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                            child: const Text('Resume', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Vitals Simulator Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Surgery Vitals Simulator', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        Switch(
                          value: _isSimulating,
                          activeColor: Colors.redAccent,
                          onChanged: (val) => _toggleSimulation(),
                        ),
                      ],
                    ),
                    if (_isSimulating) ...[
                      const Divider(color: Color(0xFF1E293B)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              const Text('HR (bpm)', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Text('$_simHr', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.redAccent)),
                            ],
                          ),
                          Column(
                            children: [
                              const Text('BP', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Text(_simBp, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.blueAccent)),
                            ],
                          ),
                          Column(
                            children: [
                              const Text('SpO2 (%)', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Text('$_simSpo2%', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.black, color: Colors.emerald)),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text('Simulated Blood Loss: ${(_simGauzeLoss + _simSuctionLoss).toInt()} ml', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Text('Simulated Fluid Loss: ${(_simGauzeLoss + _simSuctionLoss + _simUrine + _simInsensible).toInt()} ml', style: TextStyle(color: Colors.slate[400], fontSize: 12)),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (context) => AiChatbotSheet(
              patientData: {
                'patientName': activeWf.patientName ?? 'Simulated Patient',
                'age': '48',
                'gender': 'Male',
                'weight': activeWf.patientWeight.toString(),
                'surgeryType': activeWf.surgeryType ?? 'Surgery',
              },
              surgeryData: {
                'totalBloodLoss': _isSimulating ? (_simGauzeLoss + _simSuctionLoss).toString() : activeWf.totalBloodLoss.toString(),
                'totalFluidLoss': _isSimulating ? (_simGauzeLoss + _simSuctionLoss + _simUrine + _simInsensible).toString() : activeWf.totalFluidLoss.toString(),
                'surgeryDuration': activeWf.surgeryDuration.toString(),
              },
            ),
          );
        },
        icon: const Icon(Icons.chat_bubble_outline_rounded),
        label: const Text('Consult AI', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF3B82F6),
      ),
    );
  }
}
