import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/surgery_provider.dart';
import '../../services/api_service.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({Key? key}) : super(key: key);

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen> {
  List<dynamic> _patients = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _statusFilter = 'All';

  @override
  void initState() {
    super.initState();
    _fetchPatients();
  }

  Future<void> _fetchPatients() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService().dio.get('/patients');
      if (response.statusCode == 200) {
        setState(() {
          _patients = response.data;
        });
      }
    } catch (e) {
      // Demo mock data
      setState(() {
        _patients = [
          {
            '_id': 'p1',
            'patientName': 'Ananya Sharma',
            'age': 54,
            'gender': 'Female',
            'weight': 62.0,
            'bloodGroup': 'B+',
            'surgeryType': 'Coronary Bypass',
            'status': 'Critical',
            'otRoom': 'OT Room 3',
          },
          {
            '_id': 'p2',
            'patientName': 'Rajesh Kumar',
            'age': 45,
            'gender': 'Male',
            'weight': 78.0,
            'bloodGroup': 'O+',
            'surgeryType': 'Hip Replacement',
            'status': 'Stable',
            'otRoom': 'Unassigned',
          },
          {
            '_id': 'p3',
            'patientName': 'Sunita Deshmukh',
            'age': 38,
            'gender': 'Female',
            'weight': 55.0,
            'bloodGroup': 'A-',
            'surgeryType': 'Laparoscopic Cholecystectomy',
            'status': 'Medium',
            'otRoom': 'OT Room 1',
          }
        ];
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'critical':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.amber;
      case 'stable':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  void _showAllotOtDialog(dynamic patient) {
    String selectedRoom = 'OT Room 1';
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text('Assign OT Room for ${patient['patientName']}'),
              content: DropdownButtonFormField<String>(
                value: selectedRoom,
                decoration: const InputDecoration(labelText: 'Select Operating Theater'),
                items: const [
                  DropdownMenuItem(value: 'OT Room 1', child: Text('OT Room 1 (Cardio)')),
                  DropdownMenuItem(value: 'OT Room 2', child: Text('OT Room 2 (Ortho)')),
                  DropdownMenuItem(value: 'OT Room 3', child: Text('OT Room 3 (General)')),
                ],
                onChanged: (val) => setDialogState(() => selectedRoom = val ?? 'OT Room 1'),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    try {
                      await ApiService().dio.post('/patients/${patient['_id']}/allot-ot', data: {'otRoom': selectedRoom});
                      Fluttertoast.showToast(msg: 'Allotted to $selectedRoom');
                    } catch (e) {
                      // Mock success
                      setState(() {
                        patient['otRoom'] = selectedRoom;
                      });
                      Fluttertoast.showToast(msg: 'Allotted to $selectedRoom (Demo)');
                    }
                    Navigator.pop(context);
                  },
                  child: const Text('Allot'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _startSurgery(dynamic patient) {
    Provider.of<SurgeryProvider>(context, listen: false).startSurgeryWorkflow(
      patient['_id'],
      patient['patientName'],
      (patient['weight'] ?? 70.0).toDouble(),
      patient['surgeryType'] ?? 'General Surgery',
    );
    Fluttertoast.showToast(msg: 'Surgery workspace initialized');
    Navigator.pushNamed(context, '/surgery/workflow');
  }

  @override
  Widget build(BuildContext context) {
    final filteredPatients = _patients.where((p) {
      final nameMatches = p['patientName'].toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p['surgeryType'].toLowerCase().contains(_searchQuery.toLowerCase());
      final statusMatches = _statusFilter == 'All' || p['status'].toLowerCase() == _statusFilter.toLowerCase();
      return nameMatches && statusMatches;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Patients Registry', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_rounded),
            onPressed: () => Navigator.pushNamed(context, '/doctor/add_patient').then((_) => _fetchPatients()),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Search Bar
            TextField(
              onChanged: (val) => setState(() => _searchQuery = val),
              decoration: InputDecoration(
                hintText: 'Search patients or surgeries...',
                prefixIcon: const Icon(Icons.search_rounded),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            const SizedBox(height: 12),

            // Filter Chips
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: ['All', 'Critical', 'High', 'Medium', 'Stable'].map((status) {
                  final isSelected = _statusFilter == status;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: FilterChip(
                      label: Text(status),
                      selected: isSelected,
                      onSelected: (selected) {
                        setState(() => _statusFilter = status);
                      },
                      selectedColor: Colors.blue.withOpacity(0.2),
                      checkmarkColor: Colors.blue,
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Patient List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredPatients.isEmpty
                      ? const Center(child: Text('No matching patient records.'))
                      : ListView.builder(
                          itemCount: filteredPatients.length,
                          itemBuilder: (context, index) {
                            final patient = filteredPatients[index];
                            final statusColor = _getStatusColor(patient['status'] ?? 'Stable');
                            
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          patient['patientName'],
                                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: statusColor.withOpacity(0.1),
                                            border: Border.all(color: statusColor.withOpacity(0.3)),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            patient['status'] ?? 'Stable',
                                            style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      '${patient['age']} y/o • ${patient['gender']} • ${patient['weight']} kg • Group: ${patient['bloodGroup']}',
                                      style: TextStyle(color: Colors.grey[400], fontSize: 12),
                                    ),
                                    const SizedBox(height: 12),
                                    const Divider(color: Color(0xFF1E293B)),
                                    const SizedBox(height: 6),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('SURGERY', style: TextStyle(color: Colors.grey[500], fontSize: 8, fontWeight: FontWeight.bold)),
                                            Text(patient['surgeryType'] ?? 'General', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('LOCATION', style: TextStyle(color: Colors.grey[500], fontSize: 8, fontWeight: FontWeight.bold)),
                                            Text(patient['otRoom'] ?? 'Unassigned', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 16),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        OutlinedButton(
                                          onPressed: () => _showAllotOtDialog(patient),
                                          style: OutlinedButton.styleFrom(
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          ),
                                          child: const Text('Allot OT'),
                                        ),
                                        const SizedBox(width: 8),
                                        ElevatedButton(
                                          onPressed: () => _startSurgery(patient),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.blue,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          ),
                                          child: const Text('Start Surgery', style: TextStyle(fontWeight: FontWeight.bold)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
