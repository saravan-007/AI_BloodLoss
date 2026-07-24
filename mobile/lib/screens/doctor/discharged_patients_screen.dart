import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class DischargedPatientsScreen extends StatefulWidget {
  const DischargedPatientsScreen({Key? key}) : super(key: key);

  @override
  State<DischargedPatientsScreen> createState() => _DischargedPatientsScreenState();
}

class _DischargedPatientsScreenState extends State<DischargedPatientsScreen> {
  List<dynamic> _discharged = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchDischarged();
  }

  Future<void> _fetchDischarged() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService().dio.get('/patients');
      if (response.statusCode == 200) {
        setState(() {
          // Filter to discharged patients
          _discharged = response.data.where((x) => x['status'] == 'Discharged').toList();
        });
      }
    } catch (e) {
      setState(() {
        _discharged = [
          {
            '_id': 'p_dis_1',
            'patientName': 'Gaurav Sen',
            'age': 61,
            'gender': 'Male',
            'weight': 70.0,
            'bloodGroup': 'A+',
            'surgeryType': 'Gallbladder Removal',
            'status': 'Discharged',
          }
        ];
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Discharged Cases')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _discharged.isEmpty
              ? const Center(child: Text('No discharged records logged.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _discharged.length,
                  itemBuilder: (context, index) {
                    final patient = _discharged[index];
                    return Card(
                      child: ListTile(
                        title: Text(patient['patientName'], style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${patient['age']} y/o • ${patient['gender']} • ${patient['surgeryType']}'),
                        trailing: const Icon(Icons.archive_outlined, color: Colors.green),
                        onTap: () => Navigator.pushNamed(context, '/doctor/patient_detail', arguments: patient),
                      ),
                    );
                  },
                ),
    );
  }
}
